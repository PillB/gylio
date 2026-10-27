import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DATA_CHANGED } from '../dataEvents';
import { MemoryStorage } from './memoryStorage';
import { FakeServer, FakeTime } from './testHarness';

const SECOND = 1000;

/** The storage listeners each fresh copy of the shim adds to `window`, removed after each test. */
const listeners: EventListener[] = [];

/** A fresh browser-storage database and fresh copies of the modules that hold state about it. */
const boot = async () => {
  localStorage.clear();
  vi.resetModules();
  const add = window.addEventListener.bind(window);
  const spy = vi.spyOn(window, 'addEventListener').mockImplementation((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    if (type === 'storage') listeners.push(listener as EventListener);
    add(type, listener, options);
  });
  const db = await import('../db');
  const appSync = await import('./appSync');
  spy.mockRestore();
  await db.initializeDatabase();
  return { db, appSync };
};

type Db = Awaited<ReturnType<typeof boot>>['db'];

const sql = (db: Db, statement: string, args: unknown[] = []) =>
  new Promise<Record<string, unknown>[]>((resolve, reject) => {
    const rows: Record<string, unknown>[] = [];
    db.getDatabase().transaction(
      (tx) => tx.executeSql(statement, args as never, (_t, result) => {
        for (let i = 0; i < result.rows.length; i += 1) rows.push(result.rows.item(i) as Record<string, unknown>);
      }),
      reject,
      () => resolve(rows),
    );
  });

const INSERT_TASK = "INSERT INTO tasks (title, status, subtasks, energyRequired) VALUES (?, 'pending', '[]', 'medium');";

describe('syncing the real app database', () => {
  let time: FakeTime;
  let server: FakeServer;

  beforeEach(() => {
    time = new FakeTime();
    server = new FakeServer(time);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    listeners.splice(0).forEach((listener) => window.removeEventListener('storage', listener));
  });

  const start = async (appSync: Awaited<ReturnType<typeof boot>>['appSync']) => {
    const sync = await appSync.startAppSync({
      baseUrl: '',
      getAuth: async () => ({ token: server.validToken, userId: 'user_a' }),
      transport: server.transport,
      storage: new MemoryStorage(),
      timers: { set: time.set, clear: time.clear },
      clock: { now: time.now, random: () => 0.5 },
    });
    time.busy.push(() => sync.engine.isRunning());
    return sync;
  };

  it('sends what was already on the device, then each later save a moment after it, with no screen involved', async () => {
    const { db, appSync } = await boot();
    await sql(db, INSERT_TASK, ['Existing']);
    const sync = await start(appSync);
    await time.advance(10 * SECOND);
    expect([...server.records.values()].map((r) => r.data?.title)).toEqual(['Existing']);

    await sql(db, INSERT_TASK, ['Added later']);
    await sql(db, 'UPDATE tasks SET title = ? WHERE id = ?;', ['Existing, renamed', 1]);
    await time.advance(10 * SECOND);
    expect([...server.records.values()].map((r) => r.data?.title).sort()).toEqual(['Added later', 'Existing, renamed']);
    expect(sync.engine.snapshot()).toMatchObject({ pending: 0, state: { kind: 'idle' } });
    sync.stop();
  });

  it('brings in another device\'s changes, stores them in the app database and tells the screens', async () => {
    const { db, appSync } = await boot();
    const sync = await start(appSync);
    await time.advance(10 * SECOND);
    const changed = vi.fn();
    window.addEventListener(DATA_CHANGED, changed);
    server.otherDeviceSets('tasks', 'from-phone', { title: 'From my phone', status: 'pending', subtasks: [{ label: 'Step', done: false }], energyRequired: 'low', calendarEventId: null });
    sync.engine.kick('poll');
    await time.advance(10 * SECOND);
    const rows = await sql(db, 'SELECT * FROM tasks;');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: 'From my phone', syncId: 'from-phone', energyRequired: 'low' });
    expect(JSON.parse(rows[0].subtasks as string)).toEqual([{ label: 'Step', done: false }]);
    expect(changed).toHaveBeenCalled();
    window.removeEventListener(DATA_CHANGED, changed);
    sync.stop();
  });

  it('keeps the person working through a 503 and sends everything after it', async () => {
    const { db, appSync } = await boot();
    const sync = await start(appSync);
    await time.advance(10 * SECOND);
    server.mode = { kind: 'shed', until: time.now() + 3600 * SECOND };
    await sql(db, INSERT_TASK, ['Written during the pause']);
    await time.advance(30 * SECOND);
    expect(await sql(db, 'SELECT * FROM tasks;')).toHaveLength(1);
    expect(sync.engine.snapshot().state).toMatchObject({ kind: 'waiting', reason: 'paused' });
    await time.advance(2 * 3600 * SECOND);
    expect([...server.records.values()].map((r) => r.data?.title)).toEqual(['Written during the pause']);
    sync.stop();
  });

  it('stops watching and syncing when stopped', async () => {
    const { db, appSync } = await boot();
    const sync = await start(appSync);
    await time.advance(10 * SECOND);
    sync.stop();
    const before = server.requests().length;
    await sql(db, INSERT_TASK, ['After stop']);
    await time.advance(60 * SECOND);
    expect(server.requests()).toHaveLength(before);
  });
});

describe('where the engine keeps its own notes', () => {
  it('uses IndexedDB when it works', async () => {
    const { appSync } = await boot();
    const storage = await appSync.openStorage(new IDBFactory());
    expect(storage.constructor.name).toBe('IdbStorage');
  });

  it('falls back to memory where the browser refuses IndexedDB, and says so', async () => {
    const { appSync } = await boot();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const refusing = { open: () => { throw new DOMException('denied', 'SecurityError'); } } as unknown as IDBFactory;
    const storage = await appSync.openStorage(refusing);
    expect(storage.constructor.name).toBe('MemoryStorage');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
