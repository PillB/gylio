import { describe, expect, it, vi } from 'vitest';
import { MASS_LOSS_MIN, assignIds, looksLikeLostStorage } from './bridge';
import { addRow, afterSaving, deleteRow, editRow, EVENT, makeDevice, rowsOf, TASK, type Device } from './bridgeHarness';
import { FakeServer, FakeTime, last } from './testHarness';
import { ApplyDeferred, type RemoteRecord } from './types';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const world = () => {
  const time = new FakeTime();
  const server = new FakeServer(time);
  return { time, server };
};

const sent = (server: FakeServer, method: 'PUT' | 'DELETE') => server.requests((r) => r.method === method);
const bodies = (server: FakeServer) => sent(server, 'PUT').map((r) => r.body as Record<string, unknown>);

/** A device that has already sent its first rows to the account. */
const syncedDevice = async (w: ReturnType<typeof world>, name: string, count = 3) => {
  const device = makeDevice(w.server, w.time, name);
  const ids: number[] = [];
  for (let i = 0; i < count; i += 1) ids.push(await addRow(device, 'tasks', TASK(`Task ${i + 1}`)));
  await device.engine.start();
  await w.time.advance(10 * SECOND);
  return { device, ids };
};

const record = (entity: string, id: string, data: Record<string, unknown>, version = 1, extra: Partial<RemoteRecord> = {}): RemoteRecord => ({
  entity,
  id,
  version,
  seq: version,
  updatedAt: Date.UTC(2026, 9, 27, 12, 0, 0),
  deleted: false,
  data,
  ...extra,
});

describe('the first time a device syncs', () => {
  it('gives every row an id, sends all of them with links as ids, and then stays quiet', async () => {
    const w = world();
    const a = makeDevice(w.server, w.time, 'a');
    const eventId = await addRow(a, 'events', EVENT('Dentist'));
    const taskId = await addRow(a, 'tasks', TASK('Floss', { calendarEventId: eventId }));
    await editRow(a, 'events', eventId, { taskId });
    await addRow(a, 'debts', { name: 'Visa', balance: 5, annualRate: 1, minPayment: 1, dueDay: null });
    await a.engine.start();
    await w.time.advance(10 * SECOND);

    expect([...w.server.records.keys()].sort()).toEqual(['debts:a-3', 'events:a-2', 'tasks:a-1']);
    expect(w.server.records.get('tasks:a-1')?.data).toMatchObject({ title: 'Floss', calendarEventId: 'a-2' });
    expect(w.server.records.get('events:a-2')?.data).toMatchObject({ title: 'Dentist', taskId: 'a-1' });
    expect((await rowsOf(a, 'tasks'))[0].syncId).toBe('a-1');
    expect(a.engine.snapshot()).toMatchObject({ pending: 0, state: { kind: 'idle' } });

    const before = sent(w.server, 'PUT').length;
    await w.time.advance(20 * MINUTE);
    expect(sent(w.server, 'PUT')).toHaveLength(before);
  });

  it('never sends the device-local number, the sync id column or fields the server does not know', async () => {
    const w = world();
    const { device } = await syncedDevice(w, 'a', 1);
    await editRow(device, 'tasks', 1, { timeLog: '[{"x":1}]', secret: 'nope' });
    await afterSaving(device, w.time);
    for (const body of bodies(w.server)) {
      expect(Object.keys(body)).not.toEqual(expect.arrayContaining(['id']));
      expect(body).not.toHaveProperty('syncId');
      expect(body).not.toHaveProperty('timeLog');
      expect(body).not.toHaveProperty('secret');
    }
  });
});

describe('changes made on this device', () => {
  it('sends an edit once, on top of the version it knows', async () => {
    const w = world();
    const { device, ids } = await syncedDevice(w, 'a', 1);
    await editRow(device, 'tasks', ids[0], { title: 'Renamed' });
    await afterSaving(device, w.time);
    expect(last(bodies(w.server))).toMatchObject({ title: 'Renamed', baseVersion: 1 });
    expect(sent(w.server, 'PUT')).toHaveLength(2);
    await w.time.advance(15 * MINUTE);
    expect(sent(w.server, 'PUT')).toHaveLength(2);
  });

  it('sends a delete, and forgets the row so nothing is sent for it again', async () => {
    const w = world();
    const { device, ids } = await syncedDevice(w, 'a', 2);
    await deleteRow(device, 'tasks', ids[0]);
    await afterSaving(device, w.time);
    expect(sent(w.server, 'DELETE').map((r) => r.path)).toEqual(['/api/tasks/a-1']);
    expect(w.server.records.get('tasks:a-1')?.deleted).toBe(true);
    await w.time.advance(15 * MINUTE);
    expect(sent(w.server, 'DELETE')).toHaveLength(1);
    expect((await device.storage.getBucket('mirror'))['tasks:a-1']).toBeUndefined();
  });

  it('turns twenty quick edits of one row into one request', async () => {
    const w = world();
    const { device, ids } = await syncedDevice(w, 'a', 1);
    const before = sent(w.server, 'PUT').length;
    for (let i = 0; i < 20; i += 1) {
      await editRow(device, 'tasks', ids[0], { title: `draft ${i}` });
      await device.bridge.scan();
      await w.time.advance(200);
    }
    await w.time.advance(6 * SECOND);
    expect(sent(w.server, 'PUT')).toHaveLength(before + 1);
    expect(last(bodies(w.server))).toMatchObject({ title: 'draft 19' });
  });

  it('looking twice at an unchanged database records nothing the second time', async () => {
    const w = world();
    const device = makeDevice(w.server, w.time, 'a');
    await addRow(device, 'tasks', TASK('One'));
    await addRow(device, 'transactions', { budgetMonth: '2026-11', amount: 3, categoryName: 'Food', isNeed: 1, date: '2026-11-01', note: null });
    expect(await device.bridge.scan()).toEqual({ recorded: 2, deleted: 0, restoring: 0 });
    expect(await device.bridge.scan()).toEqual({ recorded: 0, deleted: 0, restoring: 0 });
  });

  it('does not lose a change when the engine fails to take it: the next look records it again', async () => {
    const w = world();
    const device = makeDevice(w.server, w.time, 'a');
    await addRow(device, 'tasks', TASK('One'));
    vi.spyOn(device.engine, 'recordChanges').mockRejectedValueOnce(new Error('disk full'));
    await expect(device.bridge.scan()).rejects.toThrow('disk full');
    expect(await device.storage.getBucket('mirror')).toEqual({});
    expect(await device.bridge.scan()).toMatchObject({ recorded: 1 });
  });
});

describe('two devices on one account', () => {
  it('shows the other device\'s rows with links pointing at this device\'s own row numbers', async () => {
    const w = world();
    const a = makeDevice(w.server, w.time, 'a');
    const b = makeDevice(w.server, w.time, 'b');
    await addRow(b, 'tasks', TASK('Only on B')); // B's row 1, so B numbers A's rows differently
    await addRow(a, 'tasks', TASK('Padding'));
    const eventId = await addRow(a, 'events', EVENT('Dentist'));
    const taskId = await addRow(a, 'tasks', TASK('Floss', { calendarEventId: eventId }));
    await editRow(a, 'events', eventId, { taskId });
    await a.engine.start();
    await w.time.advance(10 * SECOND);
    await b.engine.start();
    await w.time.advance(10 * SECOND);

    const bTasks = await rowsOf(b, 'tasks');
    const bEvent = (await rowsOf(b, 'events'))[0];
    const bFloss = bTasks.find((t) => t.title === 'Floss');
    expect(bTasks.map((t) => t.title).sort()).toEqual(['Floss', 'Only on B', 'Padding']);
    expect(bFloss?.id).not.toBe(taskId);
    expect(bFloss?.calendarEventId).toBe(bEvent.id);
    expect(bEvent.taskId).toBe(bFloss?.id);
    expect(b.announced.count).toBeGreaterThan(0);

    // B's own row reaches A, and nobody re-sends what only arrived.
    await w.time.advance(6 * MINUTE);
    expect((await rowsOf(a, 'tasks')).map((t) => t.title).sort()).toEqual(['Floss', 'Only on B', 'Padding']);
    const puts = sent(w.server, 'PUT').length;
    await w.time.advance(20 * MINUTE);
    expect(sent(w.server, 'PUT')).toHaveLength(puts);
  });

  it('applies another device\'s edit to an unedited row without sending it back', async () => {
    const w = world();
    const { device, ids } = await syncedDevice(w, 'a', 1);
    w.server.otherDeviceSets('tasks', 'a-1', { title: 'Edited on my phone', status: 'completed', subtasks: [], energyRequired: 'low' });
    const puts = sent(w.server, 'PUT').length;
    device.engine.kick('poll');
    await w.time.advance(5 * SECOND);
    expect((await rowsOf(device, 'tasks'))[0]).toMatchObject({ id: ids[0], title: 'Edited on my phone', status: 'completed', energyRequired: 'low' });
    await w.time.advance(15 * MINUTE);
    expect(sent(w.server, 'PUT')).toHaveLength(puts);
  });

  it('removes a row another device deleted, without sending a delete back', async () => {
    const w = world();
    const { device } = await syncedDevice(w, 'a', 2);
    w.server.otherDeviceDeletes('tasks', 'a-1');
    device.engine.kick('poll');
    await w.time.advance(5 * SECOND);
    expect((await rowsOf(device, 'tasks')).map((t) => t.title)).toEqual(['Task 2']);
    await w.time.advance(15 * MINUTE);
    expect(sent(w.server, 'DELETE')).toHaveLength(0);
  });

  it('keeps a row edited here when another device deleted it: the row comes back on the account', async () => {
    const w = world();
    const { device, ids } = await syncedDevice(w, 'a', 1);
    await editRow(device, 'tasks', ids[0], { title: 'Still needed' });
    await device.bridge.scan();
    w.server.otherDeviceDeletes('tasks', 'a-1');
    await w.time.advance(10 * SECOND);
    expect((await rowsOf(device, 'tasks')).map((t) => t.title)).toEqual(['Still needed']);
    expect(w.server.records.get('tasks:a-1')).toMatchObject({ deleted: false, data: { title: 'Still needed' } });
  });

  it('when both changed the same row while this device was out of reach, the later edit wins and the other is kept, not thrown away', async () => {
    const w = world();
    const { device, ids } = await syncedDevice(w, 'a', 1);
    w.server.mode = { kind: 'down' };
    await editRow(device, 'tasks', ids[0], { title: 'Mine, earlier' });
    await device.bridge.scan();
    await w.time.advance(1 * MINUTE);
    w.server.otherDeviceSets('tasks', 'a-1', { title: 'Theirs, later', subtasks: [] });
    w.server.mode = { kind: 'ok' };
    await w.time.advance(30 * MINUTE);
    expect((await rowsOf(device, 'tasks'))[0].title).toBe('Theirs, later');
    expect(w.server.records.get('tasks:a-1')?.data?.title).toBe('Theirs, later');
    expect(device.engine.snapshot().kept).toBe(1);
    expect(device.engine.snapshot().pending).toBe(0);
  });

  it('when this device edited last, its edit goes on top of the account\'s copy', async () => {
    const w = world();
    const { device, ids } = await syncedDevice(w, 'a', 1);
    w.server.mode = { kind: 'down' };
    w.server.otherDeviceSets('tasks', 'a-1', { title: 'Theirs, earlier', subtasks: [] });
    await w.time.advance(1 * MINUTE);
    await editRow(device, 'tasks', ids[0], { title: 'Mine, later' });
    await device.bridge.scan();
    w.server.mode = { kind: 'ok' };
    await w.time.advance(30 * MINUTE);
    expect((await rowsOf(device, 'tasks'))[0].title).toBe('Mine, later');
    expect(w.server.records.get('tasks:a-1')?.data?.title).toBe('Mine, later');
  });
});

describe('an edit that gets in while the account\'s changes are arriving', () => {
  it('is never overwritten: the engine looks again after the edit has been recorded', async () => {
    const w = world();
    const { device, ids } = await syncedDevice(w, 'a', 1);
    w.server.otherDeviceSets('tasks', 'a-1', { title: 'Remote title', subtasks: [] });
    let release = () => undefined as void;
    w.server.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    // The engine is held inside a request on purpose, so the test must not wait for it to be idle.
    const waiting = w.time.busy.splice(0);
    device.engine.kick('poll');
    await w.time.advance(0);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await editRow(device, 'tasks', ids[0], { title: 'Typed while waiting' }); // no scan: the person just typed
    w.server.gate = null;
    release();
    w.time.busy.push(...waiting);
    await w.time.advance(30 * SECOND);
    expect((await rowsOf(device, 'tasks'))[0].title).toBe('Typed while waiting');
    expect(w.server.records.get('tasks:a-1')?.data?.title).toBe('Typed while waiting');
  });

  it('refuses (applies nothing) while a row has an edit nobody has recorded yet', async () => {
    const w = world();
    const { device, ids } = await syncedDevice(w, 'a', 2);
    await editRow(device, 'tasks', ids[0], { title: 'Unrecorded edit' });
    const incoming = [record('tasks', 'a-1', { title: 'Server copy', subtasks: [] }, 2), record('tasks', 'a-2', { title: 'Another', subtasks: [] }, 2)];
    await expect(device.bridge.applyRemote(incoming)).rejects.toBeInstanceOf(ApplyDeferred);
    expect((await rowsOf(device, 'tasks')).map((t) => t.title)).toEqual(['Unrecorded edit', 'Task 2']);
  });

  it('refuses for a row nobody has looked at yet, even one that shares an id with a server record', async () => {
    const w = world();
    const device = makeDevice(w.server, w.time, 'a');
    await addRow(device, 'tasks', TASK('Local', { syncId: 'same-id' }));
    await expect(device.bridge.applyRemote([record('tasks', 'same-id', { title: 'Server' })])).rejects.toBeInstanceOf(ApplyDeferred);
  });
});

describe('links between a task and an event', () => {
  it('keeps a link whose other end has not arrived, sends it along with other edits, and fills it in when it does', async () => {
    const w = world();
    const device = makeDevice(w.server, w.time, 'a');
    await device.bridge.applyRemote([record('tasks', 'task-1', { title: 'Prep', calendarEventId: 'event-1', subtasks: [] })]);
    const task = (await rowsOf(device, 'tasks'))[0];
    expect(task.calendarEventId).toBeNull();
    expect(await device.storage.getBucket('links')).toEqual({ 'tasks:task-1': 'event-1' });
    expect(await device.bridge.scan()).toMatchObject({ recorded: 0 });

    // Editing something else must not erase the link on the account.
    await editRow(device, 'tasks', Number(task.id), { title: 'Prep, renamed' });
    const spy = vi.spyOn(device.engine, 'recordChanges');
    await device.bridge.scan();
    expect(spy.mock.calls[0][0][0]).toMatchObject({ id: 'task-1', data: { title: 'Prep, renamed', calendarEventId: 'event-1' } });

    // The event arrives: the link is filled in, and nothing needs sending because of it.
    await device.bridge.applyRemote([record('events', 'event-1', { title: 'Dentist', startDate: '2026-11-02T10:00:00Z', endDate: null })]);
    const event = (await rowsOf(device, 'events'))[0];
    expect((await rowsOf(device, 'tasks'))[0].calendarEventId).toBe(event.id);
    expect(await device.storage.getBucket('links')).toEqual({});
    expect(await device.bridge.scan()).toMatchObject({ recorded: 0 });
  });

  it('lets a link the person chooses replace one that was waiting', async () => {
    const w = world();
    const device = makeDevice(w.server, w.time, 'a');
    await device.bridge.applyRemote([record('tasks', 'task-1', { title: 'Prep', calendarEventId: 'event-elsewhere', subtasks: [] })]);
    const eventId = await addRow(device, 'events', EVENT('Mine'));
    await editRow(device, 'tasks', Number((await rowsOf(device, 'tasks'))[0].id), { calendarEventId: eventId });
    const report = await device.bridge.scan();
    expect(report.recorded).toBeGreaterThan(0);
    expect(await device.storage.getBucket('links')).toEqual({});
    await device.bridge.applyRemote([record('events', 'event-elsewhere', { title: 'Theirs', startDate: '2026-11-02T10:00:00Z', endDate: null })]);
    expect((await rowsOf(device, 'tasks'))[0].calendarEventId).toBe(eventId);
  });

  it('drops the link on a task when the server says there is none any more', async () => {
    const w = world();
    const device = makeDevice(w.server, w.time, 'a');
    await device.bridge.applyRemote([record('tasks', 'task-1', { title: 'Prep', calendarEventId: 'event-1', subtasks: [] })]);
    await device.bridge.applyRemote([record('tasks', 'task-1', { title: 'Prep', calendarEventId: null, subtasks: [] }, 2)]);
    expect(await device.storage.getBucket('links')).toEqual({});
    await device.bridge.applyRemote([record('events', 'event-1', { title: 'Dentist', startDate: '2026-11-02T10:00:00Z', endDate: null })]);
    expect((await rowsOf(device, 'tasks'))[0].calendarEventId).toBeNull();
  });

  it('sends no link for an event that was deleted here (the task stays, as the calendar promises)', async () => {
    const w = world();
    const device = makeDevice(w.server, w.time, 'a');
    const eventId = await addRow(device, 'events', EVENT('Dentist'));
    await addRow(device, 'tasks', TASK('Floss', { calendarEventId: eventId }));
    await device.engine.start();
    await w.time.advance(10 * SECOND);
    await deleteRow(device, 'events', eventId);
    await afterSaving(device, w.time);
    expect(w.server.records.get('events:a-2')?.deleted).toBe(true);
    expect(w.server.records.get('tasks:a-1')?.data?.calendarEventId).toBeNull();
    expect((await rowsOf(device, 'tasks')).map((t) => t.title)).toEqual(['Floss']);
  });
});

describe('rows that vanish without anyone deleting them', () => {
  it('fetches them again instead of deleting them on the account (browser storage was cleared or damaged)', async () => {
    const w = world();
    const { device, ids } = await syncedDevice(w, 'a', 6);
    for (const id of ids) await deleteRow(device, 'tasks', id);
    const report = await device.bridge.scan();
    expect(report).toEqual({ recorded: 0, deleted: 0, restoring: 6 });
    await w.time.advance(10 * SECOND);
    expect(sent(w.server, 'DELETE')).toHaveLength(0);
    const back = await rowsOf(device, 'tasks');
    expect(back.map((t) => t.title).sort()).toEqual(['Task 1', 'Task 2', 'Task 3', 'Task 4', 'Task 5', 'Task 6']);
    expect(back.map((t) => t.syncId).sort()).toEqual(['a-1', 'a-2', 'a-3', 'a-4', 'a-5', 'a-6']);
    expect(await device.bridge.scan()).toMatchObject({ recorded: 0, deleted: 0 });
  });

  it('still sends a few deliberate deletes', async () => {
    const w = world();
    const { device, ids } = await syncedDevice(w, 'a', 6);
    await deleteRow(device, 'tasks', ids[0]);
    await deleteRow(device, 'tasks', ids[1]);
    expect(await device.bridge.scan()).toMatchObject({ deleted: 2, restoring: 0 });
    await w.time.advance(10 * SECOND);
    expect(sent(w.server, 'DELETE')).toHaveLength(2);
  });

  it('draws the line at five rows and more than half of those known', () => {
    expect(MASS_LOSS_MIN).toBe(5);
    expect(looksLikeLostStorage(4, 4)).toBe(false);
    expect(looksLikeLostStorage(5, 10)).toBe(false);
    expect(looksLikeLostStorage(6, 10)).toBe(true);
    expect(looksLikeLostStorage(5, 5)).toBe(true);
    expect(looksLikeLostStorage(0, 0)).toBe(false);
  });
});

describe('row ids', () => {
  it('gives an id to rows that have none and to a row that shares one, changing nothing else', async () => {
    const rows = {
      tasks: [
        { id: 1, syncId: 'keep', title: 'a' },
        { id: 2, syncId: 'keep', title: 'b' },
        { id: 3, title: 'c' },
        { id: 4, syncId: 'bad id!', title: 'd' },
      ],
      events: [],
      budgets: [],
      transactions: [],
      debts: [],
    };
    let n = 0;
    const ops = assignIds(rows, () => `new-${(n += 1)}`);
    expect(ops).toEqual([
      { kind: 'update', table: 'tasks', id: 2, values: { syncId: 'new-1' } },
      { kind: 'update', table: 'tasks', id: 3, values: { syncId: 'new-2' } },
      { kind: 'update', table: 'tasks', id: 4, values: { syncId: 'new-3' } },
    ]);
    expect(assignIds(rows, () => 'never')).toEqual([]);
  });
});

describe('what the account may send', () => {
  it('ignores kinds of record this app does not store, ids it cannot use, and records with no content', async () => {
    const w = world();
    const device = makeDevice(w.server, w.time, 'a');
    await device.bridge.applyRemote([
      record('rewards', 'r1', { title: 'x' }),
      record('tasks', '../evil', { title: 'x' }),
      { ...record('tasks', 'nodata', {}), data: undefined },
      record('tasks', 'ok', { title: 'Fine', subtasks: [] }),
    ]);
    expect((await rowsOf(device, 'tasks')).map((t) => t.syncId)).toEqual(['ok']);
    expect(await rowsOf(device, 'tasks')).toHaveLength(1);
  });

  it('tells the screens only when rows changed', async () => {
    const w = world();
    const device = makeDevice(w.server, w.time, 'a');
    await device.bridge.applyRemote([]);
    await device.bridge.applyRemote([record('tasks', 'never-here', {}, 2, { deleted: true, data: undefined })]);
    expect(device.announced.count).toBe(0);
    await device.bridge.applyRemote([record('tasks', 'new', { title: 'New', subtasks: [] })]);
    expect(device.announced.count).toBe(1);
  });

  it('gives a new task the time the account says it was last changed', async () => {
    const w = world();
    const device = makeDevice(w.server, w.time, 'a');
    await device.bridge.applyRemote([record('tasks', 'new', { title: 'New', subtasks: [] }, 1, { updatedAt: Date.UTC(2026, 0, 2, 3, 4, 5) })]);
    expect((await rowsOf(device, 'tasks'))[0].updatedAt).toBe('2026-01-02T03:04:05.000Z');
    await device.bridge.applyRemote([record('tasks', 'bad-time', { title: 'x', subtasks: [] }, 1, { updatedAt: Number.NaN })]);
    expect(await rowsOf(device, 'tasks')).toHaveLength(2);
  });
});

describe('moving a device\'s data to a different account', () => {
  it('sends everything on the device to the new account once the person chooses to', async () => {
    const w = world();
    const { device } = await syncedDevice(w, 'a', 3);
    const second = new FakeServer(w.time);
    device.who.userId = 'user_b';
    device.target.server = second;
    device.engine.authChanged();
    await w.time.advance(10 * SECOND);
    expect(device.engine.snapshot().state.kind).toBe('other-account');
    expect(second.records.size).toBe(0);

    await device.engine.claimForCurrentAccount();
    await w.time.advance(10 * SECOND);
    expect([...second.records.keys()].sort()).toEqual(['tasks:a-1', 'tasks:a-2', 'tasks:a-3']);
    expect(second.requests((r) => r.method === 'PUT').every((r) => (r.body as { baseVersion: number }).baseVersion === 0)).toBe(true);
    expect(device.engine.snapshot().state.kind).toBe('idle');
  });
});

describe('when the account is out of reach (the case this exists for)', () => {
  it('keeps every edit on the device through a 503 pause, then sends them all, once, when it ends', async () => {
    const w = world();
    const { device, ids } = await syncedDevice(w, 'a', 2);
    w.server.mode = { kind: 'shed', until: w.time.now() + 2 * HOUR };

    await editRow(device, 'tasks', ids[0], { title: 'Edited while paused' });
    await afterSaving(device, w.time);
    const added = await addRow(device, 'tasks', TASK('Added while paused'));
    await afterSaving(device, w.time);
    await editRow(device, 'tasks', added, { title: 'Added while paused (fixed typo)' });
    await deleteRow(device, 'tasks', ids[1]);
    await afterSaving(device, w.time);

    // The app keeps working on its own copy the whole time.
    expect((await rowsOf(device, 'tasks')).map((t) => t.title).sort()).toEqual(['Added while paused (fixed typo)', 'Edited while paused']);
    expect(device.engine.snapshot().state).toMatchObject({ kind: 'waiting', reason: 'paused' });
    expect(device.engine.snapshot().pending).toBe(3);
    const mutating = () => w.server.requests((r) => r.method !== 'GET' && w.server.mode.kind === 'shed').length;
    const triesDuringPause = mutating();

    // Tries are spaced by the server's Retry-After, not hammered.
    await w.time.advance(30 * MINUTE);
    expect(mutating() - triesDuringPause).toBeLessThanOrEqual(1);

    await w.time.advance(2 * HOUR);
    expect(w.server.records.get('tasks:a-1')?.data?.title).toBe('Edited while paused');
    expect(w.server.records.get('tasks:a-3')?.data?.title).toBe('Added while paused (fixed typo)');
    expect(w.server.records.get('tasks:a-2')?.deleted).toBe(true);
    expect(device.engine.snapshot()).toMatchObject({ pending: 0, state: { kind: 'idle' } });
    // A record added and corrected during the pause was sent once, in its final form.
    expect(bodies(w.server).filter((b) => String(b.title).startsWith('Added while paused'))).toHaveLength(1);
  });

  it('keeps working with no network at all, and catches up when it returns', async () => {
    const w = world();
    const { device, ids } = await syncedDevice(w, 'a', 1);
    w.server.mode = { kind: 'down' };
    await editRow(device, 'tasks', ids[0], { title: 'Offline edit' });
    await afterSaving(device, w.time);
    await addRow(device, 'tasks', TASK('Offline add'));
    await afterSaving(device, w.time);
    expect((await rowsOf(device, 'tasks'))).toHaveLength(2);
    w.server.mode = { kind: 'ok' };
    device.engine.setOnline(true);
    await w.time.advance(10 * MINUTE);
    expect(w.server.records.get('tasks:a-1')?.data?.title).toBe('Offline edit');
    expect(w.server.records.has('tasks:a-2')).toBe(true);
  });

  it('two devices both edit during a pause and both are kept when it ends', async () => {
    const w = world();
    const a = makeDevice(w.server, w.time, 'a');
    const b = makeDevice(w.server, w.time, 'b');
    await a.engine.start();
    await w.time.advance(10 * SECOND);
    await b.engine.start();
    await w.time.advance(10 * SECOND);
    w.server.mode = { kind: 'shed', until: w.time.now() + HOUR };
    await addRow(a, 'tasks', TASK('From A'));
    await afterSaving(a, w.time);
    await addRow(b, 'tasks', TASK('From B'));
    await afterSaving(b, w.time);
    await w.time.advance(2 * HOUR);
    await w.time.advance(10 * MINUTE);
    const titles = async (d: Device) => (await rowsOf(d, 'tasks')).map((t) => t.title).sort();
    expect(await titles(a)).toEqual(['From A', 'From B']);
    expect(await titles(b)).toEqual(['From A', 'From B']);
  });
});
