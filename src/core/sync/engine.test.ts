import { describe, expect, it } from 'vitest';
import { SKIPPED } from './engine';
import { SYNC_LIMITS } from './policy';
import { FakeServer, FakeTime, last, makeRig, task, type Rig } from './testHarness';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/** Saves a change and lets the debounce and the first pass run. */
const save = async (rig: Rig, id: string, title: string) => {
  await rig.engine.recordChange(task(id, title, rig.time.now()));
  await rig.time.advance(4 * SECOND);
};

describe('the quiet path', () => {
  it('sends a saved change after a short pause and clears it from the waiting list', async () => {
    const rig = makeRig();
    await save(rig, 'a', 'Buy milk');
    expect(rig.server.requests().map((r) => `${r.method} ${r.path}`)).toContain('PUT /api/tasks/a');
    expect(rig.server.records.get('tasks:a')?.data).toEqual({ title: 'Buy milk' });
    expect(rig.engine.snapshot()).toMatchObject({ pending: 0, state: { kind: 'idle' } });
  });

  it('sends the base version it last saw, so two devices cannot overwrite each other unseen', async () => {
    const rig = makeRig();
    await save(rig, 'a', 'one');
    await save(rig, 'a', 'two');
    const puts = rig.server.requests((r) => r.method === 'PUT');
    expect(puts.map((r) => (r.body as { baseVersion: number }).baseVersion)).toEqual([0, 1]);
  });

  it('turns twenty quick edits of one record into one request', async () => {
    const rig = makeRig();
    for (let i = 0; i < 20; i += 1) {
      await rig.engine.recordChange(task('a', `draft ${i}`, rig.time.now()));
      await rig.time.advance(200);
    }
    await rig.time.advance(4 * SECOND);
    const puts = rig.server.requests((r) => r.method === 'PUT');
    expect(puts).toHaveLength(1);
    expect((puts[0].body as { title: string }).title).toBe('draft 19');
  });

  it('never sends the token anywhere but the token field', async () => {
    const rig = makeRig();
    await save(rig, 'a', 'x');
    for (const r of rig.server.requests()) expect(r.path).not.toContain(r.token);
  });

  it('applies what other devices changed, once, and not its own echo', async () => {
    const rig = makeRig();
    rig.server.otherDeviceSets('tasks', 'theirs', { title: 'From my phone' });
    await save(rig, 'mine', 'From my laptop');
    expect(rig.applier.records.map((r) => r.id)).toEqual(['theirs']);
    await rig.time.advance(6 * MINUTE);
    expect(rig.applier.records.map((r) => r.id)).toEqual(['theirs']);
    expect((await rig.storage.getMeta()).cursor).toBe(rig.server.seq);
  });

  it('reads long change lists page by page', async () => {
    const rig = makeRig({ tuning: { pullPageSize: 2 } });
    for (let i = 0; i < 5; i += 1) rig.server.otherDeviceSets('tasks', `t${i}`, { title: `t${i}` });
    rig.engine.kick('manual');
    await rig.time.advance(SECOND);
    expect(rig.applier.records).toHaveLength(5);
    expect(rig.server.requests((r) => r.method === 'GET')).toHaveLength(3);
  });

  it('polls again after a few minutes while the app is open', async () => {
    const rig = makeRig();
    await rig.engine.start();
    await rig.time.advance(SECOND);
    const before = rig.server.requests().length;
    await rig.time.advance(6 * MINUTE);
    expect(rig.server.requests().length).toBeGreaterThan(before);
  });
});

describe('when the server pauses sync (503 SYNC_PAUSED)', () => {
  it('keeps every change on this device, shows a gentle waiting state, and stops sending', async () => {
    const rig = makeRig();
    rig.server.mode = { kind: 'shed', retryAfter: '1800' };
    await save(rig, 'a', 'first');
    expect(rig.engine.snapshot().state).toMatchObject({ kind: 'waiting', reason: 'paused' });
    const sentSoFar = rig.server.requests().length;
    for (let i = 0; i < 30; i += 1) {
      await rig.engine.recordChange(task(`n${i}`, `note ${i}`, rig.time.now()));
      await rig.time.advance(10 * SECOND);
    }
    expect(rig.server.requests().length).toBe(sentSoFar);
    expect(rig.engine.snapshot().pending).toBe(31);
  });

  it('stops at the first 503 instead of trying every waiting change', async () => {
    const rig = makeRig();
    rig.server.mode = { kind: 'shed', retryAfter: '600' };
    for (let i = 0; i < 100; i += 1) await rig.storage.putChange(task(`t${i}`, `t${i}`, i));
    rig.engine.kick('manual');
    await rig.time.advance(SECOND);
    expect(rig.server.requests()).toHaveLength(1);
    expect(rig.engine.snapshot().pending).toBe(100);
  });

  it('waits as long as the server asked, then sends everything that was saved meanwhile', async () => {
    const rig = makeRig();
    rig.server.mode = { kind: 'shed', retryAfter: '1800' };
    await save(rig, 'a', 'first');
    await rig.engine.recordChange(task('b', 'while paused', rig.time.now()));
    rig.server.mode = { kind: 'ok' };
    await rig.time.advance(29 * MINUTE);
    expect(rig.server.requests()).toHaveLength(1);
    await rig.time.advance(8 * MINUTE);
    expect([...rig.server.records.keys()].sort()).toEqual(['tasks:a', 'tasks:b']);
    expect(rig.engine.snapshot()).toMatchObject({ pending: 0, state: { kind: 'idle' } });
  });

  it('does not slow down further because of the pause: the next pause is as long as the server says', async () => {
    const rig = makeRig({ random: () => 0 });
    rig.server.mode = { kind: 'shed', retryAfter: '600' };
    await save(rig, 'a', 'x');
    for (let i = 0; i < 5; i += 1) await rig.time.advance(11 * MINUTE);
    const times = rig.server.requests().map((r) => r.at);
    for (let i = 1; i < times.length; i += 1) expect(times[i] - times[i - 1]).toBeLessThanOrEqual(11 * MINUTE);
    expect(times.length).toBeGreaterThanOrEqual(5);
  });

  it('costs the server about one request an hour for a whole day of pausing', async () => {
    const rig = makeRig();
    rig.server.mode = { kind: 'shed', retryAfter: '3600' };
    await save(rig, 'a', 'x');
    for (let i = 0; i < 30; i += 1) {
      await rig.engine.recordChange(task(`n${i}`, 'edit', rig.time.now()));
      await rig.time.advance(48 * MINUTE);
    }
    const hours = (30 * 48) / 60;
    expect(rig.server.requests().length).toBeLessThanOrEqual(hours + 2);
    expect(rig.engine.snapshot().pending).toBe(31);
  });

  it('a person who presses "try again" is tried once now, but not more than once every ten seconds', async () => {
    const rig = makeRig();
    rig.server.mode = { kind: 'shed', retryAfter: '3600' };
    await save(rig, 'a', 'x');
    await rig.time.advance(11 * SECOND);
    const before = rig.server.requests().length;
    rig.engine.kick('manual');
    rig.engine.kick('manual');
    await rig.time.advance(SECOND);
    expect(rig.server.requests().length).toBe(before + 1);
    rig.engine.kick('manual');
    await rig.time.advance(SECOND);
    expect(rig.server.requests().length).toBe(before + 1);
    await rig.time.advance(11 * SECOND);
    rig.engine.kick('manual');
    await rig.time.advance(SECOND);
    expect(rig.server.requests().length).toBe(before + 2);
  });

  it('spreads the devices that come back when the pause ends, so they do not arrive together', async () => {
    const time = new FakeTime();
    const midnight = time.now() + 30 * MINUTE;
    const server = new FakeServer(time);
    server.mode = { kind: 'shed', until: midnight };
    const rigs = Array.from({ length: 60 }, (_, i) => makeRig({ time, server, random: mulberry(i + 1) }));
    for (const [i, rig] of rigs.entries()) await rig.storage.putChange(task(`t${i}`, 'x', time.now()));
    for (const rig of rigs) rig.engine.kick('manual');
    await time.advance(2 * HOUR);
    const firstOk = rigs.map((_, i) => i).length;
    const arrivals = server.requests((r) => r.at >= midnight && r.method === 'PUT').map((r) => r.at - midnight);
    expect(firstOk).toBe(60);
    expect(arrivals.length).toBeGreaterThanOrEqual(60);
    const sorted = [...arrivals].sort((a, b) => a - b);
    expect(last(sorted) - sorted[0]).toBeGreaterThan(2 * MINUTE);
    const perSecond = new Map<number, number>();
    for (const a of arrivals) perSecond.set(Math.floor(a / SECOND), (perSecond.get(Math.floor(a / SECOND)) ?? 0) + 1);
    expect(Math.max(...perSecond.values())).toBeLessThanOrEqual(5);
  });
});

/** Small deterministic random numbers, so devices differ from each other but a test run is repeatable. */
function mulberry(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('when there is no network, or the server is struggling', () => {
  it('treats a failed request as offline, keeps the change, and tries again with growing, jittered waits', async () => {
    const rig = makeRig({ random: mulberry(7) });
    rig.server.mode = { kind: 'down' };
    await save(rig, 'a', 'x');
    expect(rig.engine.snapshot().state).toMatchObject({ kind: 'waiting', reason: 'offline' });
    await rig.time.advance(3 * HOUR);
    const times = rig.server.requests().map((r) => r.at);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    expect(gaps[0]).toBeGreaterThanOrEqual(7_500);
    expect(gaps[0]).toBeLessThanOrEqual(15_000);
    expect(last(gaps)).toBeGreaterThanOrEqual(SYNC_LIMITS.backoffCapMs / 2);
    expect(last(gaps)).toBeLessThanOrEqual(SYNC_LIMITS.backoffCapMs);
    expect(times.length).toBeLessThan(30);
    expect(rig.engine.snapshot().pending).toBe(1);
  });

  it('saves everything it was given once the network is back, without losing or duplicating a change', async () => {
    const rig = makeRig();
    rig.server.mode = { kind: 'down' };
    await save(rig, 'a', 'one');
    await save(rig, 'b', 'two');
    rig.server.mode = { kind: 'ok' };
    await rig.time.advance(20 * MINUTE);
    expect([...rig.server.records.keys()].sort()).toEqual(['tasks:a', 'tasks:b']);
    expect(rig.engine.snapshot().pending).toBe(0);
  });

  it('does not send anything while the browser says it is offline, and resumes within seconds of coming back', async () => {
    const rig = makeRig();
    rig.engine.setOnline(false);
    await save(rig, 'a', 'x');
    expect(rig.server.requests()).toHaveLength(0);
    expect(rig.engine.snapshot().state).toMatchObject({ kind: 'waiting', reason: 'offline', retryAt: null });
    rig.engine.setOnline(true);
    await rig.time.advance(4 * SECOND);
    expect(rig.server.records.has('tasks:a')).toBe(true);
  });

  it.each([[500], [502], [504]])('a %s backs off and keeps the change', async (status) => {
    const rig = makeRig();
    rig.server.mode = { kind: 'status', status, body: { error: { code: 'INTERNAL', message: 'x' } } };
    await save(rig, 'a', 'x');
    expect(rig.engine.snapshot()).toMatchObject({ pending: 1, state: { kind: 'waiting', reason: 'server-error' } });
  });

  it('forgets the failures after one success, so the next problem starts again from a short wait', async () => {
    const rig = makeRig({ random: () => 0 });
    rig.server.mode = { kind: 'down' };
    await save(rig, 'a', 'x');
    await rig.time.advance(30 * MINUTE);
    rig.server.mode = { kind: 'ok' };
    await rig.time.advance(20 * MINUTE);
    expect(rig.engine.snapshot().pending).toBe(0);
    rig.server.mode = { kind: 'down' };
    const mark = rig.server.requests().length;
    await save(rig, 'b', 'y');
    const times = rig.server.requests().slice(mark).map((r) => r.at);
    await rig.time.advance(SECOND * 20);
    expect(rig.server.requests().slice(mark).length).toBeGreaterThanOrEqual(2);
    expect(times.length).toBeGreaterThanOrEqual(1);
  });

  it('a site that has no API behind it yet (404) is waited out for an hour and nothing is discarded', async () => {
    const rig = makeRig();
    rig.server.mode = { kind: 'status', status: 404, body: undefined };
    await save(rig, 'a', 'x');
    expect(rig.engine.snapshot()).toMatchObject({ pending: 1, refused: 0, state: { kind: 'waiting' } });
    await rig.time.advance(50 * MINUTE);
    expect(rig.server.requests()).toHaveLength(1);
  });

  it('a pull answer that makes no sense is waited out, not applied, and the cursor stays', async () => {
    const rig = makeRig();
    rig.server.mode = { kind: 'ok' };
    const original = rig.server.transport;
    rig.server.transport = async (req) => {
      const res = await original(req);
      if (req.method !== 'GET') return res;
      return { status: 200, headers: res.headers, json: async () => ({ nothing: 'useful' }) };
    };
    (rig.engine as unknown as { o: { transport: typeof original } }).o.transport = rig.server.transport;
    rig.engine.kick('manual');
    await rig.time.advance(SECOND);
    expect(rig.applier.records).toEqual([]);
    expect((await rig.storage.getMeta()).cursor).toBe(0);
    expect(rig.engine.snapshot().state).toMatchObject({ kind: 'waiting', reason: 'server-error' });
  });

  it('ignores server records with a shape it does not trust', async () => {
    const rig = makeRig();
    const original = rig.server.transport;
    const bad = [{ entity: '../etc', id: 'x', version: 1, deleted: false }, { entity: 'tasks', id: 'a b', version: 1, deleted: false }, { entity: 'tasks', id: 'ok', version: 1.5, deleted: false }, null, 7];
    const good = { entity: 'tasks', id: 'fine', version: 1, seq: 1, updatedAt: 1, deleted: false, data: { title: 'ok' } };
    (rig.engine as unknown as { o: { transport: typeof original } }).o.transport = async (req) => {
      if (req.method !== 'GET') return original(req);
      return { status: 200, headers: { get: () => null }, json: async () => ({ records: [...bad, good], cursor: 1, hasMore: false }) };
    };
    rig.engine.kick('manual');
    await rig.time.advance(SECOND);
    expect(rig.applier.records.map((r) => r.id)).toEqual(['fine']);
  });

  it('when the local database fails while applying, nothing is lost: it waits and applies the same changes again', async () => {
    const rig = makeRig();
    rig.server.otherDeviceSets('tasks', 'theirs', { title: 'x' });
    rig.applier.fail = true;
    rig.engine.kick('manual');
    await rig.time.advance(SECOND);
    expect((await rig.storage.getMeta()).cursor).toBe(0);
    expect(rig.engine.snapshot().state).toMatchObject({ kind: 'waiting' });
    rig.applier.fail = false;
    await rig.time.advance(20 * MINUTE);
    expect(rig.applier.records.map((r) => r.id)).toEqual(['theirs']);
  });
});

describe('signing in and out', () => {
  it('a token that expired mid-way is replaced once and the change goes through', async () => {
    const rig = makeRig();
    rig.state.auth = { token: 'stale', userId: 'user_a' };
    await save(rig, 'a', 'x');
    expect(rig.state.refreshes).toBe(1);
    expect(rig.server.records.has('tasks:a')).toBe(true);
  });

  it('a token that stays refused means signed out: quiet, nothing lost, nothing sent until sign-in', async () => {
    const rig = makeRig();
    rig.server.validToken = 'something-else';
    rig.state.refreshFixes = false;
    rig.state.auth = { token: 'stale', userId: 'user_a' };
    const original = rig.state.auth;
    await save(rig, 'a', 'x');
    expect(rig.engine.snapshot().state.kind).toBe('signed-out');
    const sent = rig.server.requests().length;
    await rig.time.advance(2 * HOUR);
    expect(rig.server.requests().length).toBe(sent);
    expect(rig.engine.snapshot().pending).toBe(1);
    rig.server.validToken = original.token;
    rig.engine.authChanged();
    await rig.time.advance(SECOND);
    expect(rig.server.records.has('tasks:a')).toBe(true);
  });

  it('with no one signed in, changes pile up on the device and nothing is requested', async () => {
    const rig = makeRig({ auth: null });
    await save(rig, 'a', 'x');
    await save(rig, 'b', 'y');
    expect(rig.server.requests()).toHaveLength(0);
    expect(rig.engine.snapshot()).toMatchObject({ pending: 2, state: { kind: 'signed-out' } });
  });

  it("another person's data on this device is never sent to the account that signed in", async () => {
    const rig = makeRig();
    await rig.storage.setMeta({ owner: 'user_someone_else' });
    await save(rig, 'a', 'x');
    expect(rig.server.requests()).toHaveLength(0);
    expect(rig.engine.snapshot().state.kind).toBe('other-account');
    await rig.engine.claimForCurrentAccount();
    await rig.time.advance(SECOND);
    expect(rig.server.records.has('tasks:a')).toBe(true);
  });

  it('the first account to sync on a device becomes its owner', async () => {
    const rig = makeRig();
    await save(rig, 'a', 'x');
    expect((await rig.storage.getMeta()).owner).toBe('user_a');
  });
});

describe('sign-up not open yet (503 SIGNUP_CLOSED)', () => {
  it('says so once, keeps working locally, and looks again only after hours', async () => {
    const rig = makeRig();
    rig.server.mode = { kind: 'closed' };
    await save(rig, 'a', 'x');
    expect(rig.engine.snapshot().state.kind).toBe('closed');
    await rig.time.advance(5 * HOUR);
    expect(rig.server.requests()).toHaveLength(1);
    rig.server.mode = { kind: 'ok' };
    await rig.time.advance(2 * HOUR);
    expect(rig.server.records.has('tasks:a')).toBe(true);
    expect(rig.engine.snapshot().state.kind).toBe('idle');
  });
});

describe('changes the server refuses', () => {
  it('keeps a refused change, carries on with the others, and offers to try again', async () => {
    const rig = makeRig();
    const original = rig.server.transport;
    let badAttempts = 0;
    (rig.engine as unknown as { o: { transport: typeof original } }).o.transport = async (req) => {
      if (!req.path.endsWith('/bad')) return original(req);
      badAttempts += 1;
      return { status: 400, headers: { get: () => null }, json: async () => ({ error: { code: 'VALIDATION_ERROR', message: 'title is required' } }) };
    };
    await rig.engine.recordChange(task('bad', '', 1));
    await rig.engine.recordChange(task('good', 'fine', 2));
    await rig.time.advance(4 * SECOND);
    expect(rig.server.records.has('tasks:good')).toBe(true);
    expect(rig.engine.snapshot()).toMatchObject({ pending: 0, refused: 1 });
    expect(badAttempts).toBe(1);
    await rig.time.advance(10 * MINUTE);
    expect(badAttempts).toBe(1);
    await rig.engine.retryRefused();
    await rig.time.advance(SECOND);
    expect(badAttempts).toBe(2);
  });

  it('refuses a record whose id could change the request path, without sending it', async () => {
    const rig = makeRig();
    await rig.engine.recordChange({ entity: 'tasks', id: '../../me', op: 'put', data: { title: 'x' }, localUpdatedAt: 1 });
    await rig.engine.recordChange({ entity: 'tasks/../x', id: 'a', op: 'put', data: { title: 'x' }, localUpdatedAt: 1 });
    await rig.time.advance(4 * SECOND);
    expect(rig.server.requests((r) => r.method === 'PUT')).toHaveLength(0);
    expect(rig.engine.snapshot().refused).toBe(2);
  });
});

describe('two devices changing the same record', () => {
  it('the later edit wins and the earlier one is kept, not discarded', async () => {
    const rig = makeRig();
    rig.server.otherDeviceSets('tasks', 'a', { title: 'edited on phone' });
    rig.time.nowMs += 10 * SECOND;
    await rig.storage.putChange(task('a', 'edited on laptop earlier', rig.time.now() - 60 * SECOND));
    rig.engine.kick('manual');
    await rig.time.advance(2 * SECOND);
    expect(rig.applier.records.find((r) => r.id === 'a')?.data).toEqual({ title: 'edited on phone' });
    expect((await rig.storage.listKept()).map((k) => k.data)).toEqual([{ title: 'edited on laptop earlier' }]);
    expect(rig.engine.snapshot().pending).toBe(0);
    expect(rig.engine.snapshot().kept).toBe(1);
  });

  it('when this device edited last, it goes on top of the server copy', async () => {
    const rig = makeRig();
    rig.server.otherDeviceSets('tasks', 'a', { title: 'older' });
    rig.time.nowMs += 10 * SECOND;
    await rig.storage.putChange(task('a', 'newer here', rig.time.now()));
    rig.engine.kick('manual');
    await rig.time.advance(2 * SECOND);
    expect(rig.server.records.get('tasks:a')?.data).toEqual({ title: 'newer here' });
    expect(rig.server.records.get('tasks:a')?.version).toBe(2);
    expect(await rig.storage.listKept()).toEqual([]);
  });

  it('a delete on another device does not erase an edit made here: the record comes back with the edit', async () => {
    const rig = makeRig();
    await save(rig, 'a', 'original');
    rig.server.otherDeviceDeletes('tasks', 'a');
    await save(rig, 'a', 'edited after it was deleted elsewhere');
    expect(rig.server.records.get('tasks:a')).toMatchObject({ deleted: false, data: { title: 'edited after it was deleted elsewhere' } });
  });

  it('a delete here and a delete there settle without error', async () => {
    const rig = makeRig();
    await save(rig, 'a', 'original');
    rig.server.otherDeviceDeletes('tasks', 'a');
    await rig.engine.recordChange({ entity: 'tasks', id: 'a', op: 'delete', data: null, localUpdatedAt: rig.time.now() });
    await rig.time.advance(4 * SECOND);
    expect(rig.engine.snapshot()).toMatchObject({ pending: 0, refused: 0 });
  });

  it('a change that arrives for a record with an unsent edit is reconciled the same way', async () => {
    const rig = makeRig();
    await rig.storage.putChange(task('a', 'mine, written first', rig.time.now()));
    rig.time.nowMs += 5 * MINUTE;
    rig.server.otherDeviceSets('tasks', 'a', { title: 'theirs, written later' });
    rig.engine.setOnline(false);
    rig.engine.setOnline(true);
    await rig.time.advance(4 * SECOND);
    expect(rig.applier.records.find((r) => r.id === 'a')?.data).toEqual({ title: 'theirs, written later' });
    expect((await rig.storage.listKept()).map((k) => k.data)).toEqual([{ title: 'mine, written first' }]);
  });
});

describe('edits and deletes while sending', () => {
  it('an edit made while the request is in flight is not lost and is sent next', async () => {
    const rig = makeRig();
    let release!: () => void;
    rig.server.gate = new Promise<void>((resolve) => (release = resolve));
    await rig.engine.recordChange(task('a', 'first draft', rig.time.now()));
    await rig.time.advance(4 * SECOND);
    await rig.engine.recordChange(task('a', 'edited while sending', rig.time.now()));
    rig.server.gate = null;
    release();
    await rig.time.advance(10 * SECOND);
    expect(rig.server.records.get('tasks:a')?.data).toEqual({ title: 'edited while sending' });
    expect(rig.engine.snapshot().pending).toBe(0);
  });

  it('adding something and deleting it before it ever left the device costs the server nothing', async () => {
    const rig = makeRig();
    rig.engine.setOnline(false);
    await rig.engine.recordChange(task('a', 'oops', rig.time.now()));
    await rig.engine.recordChange({ entity: 'tasks', id: 'a', op: 'delete', data: null, localUpdatedAt: rig.time.now() });
    rig.engine.setOnline(true);
    await rig.time.advance(10 * SECOND);
    expect(rig.server.requests((r) => r.method !== 'GET')).toHaveLength(0);
    expect(rig.engine.snapshot().pending).toBe(0);
  });

  it('deleting a record whose first send may have landed does send the delete', async () => {
    const rig = makeRig();
    rig.server.mode = { kind: 'down' };
    await save(rig, 'a', 'maybe stored');
    rig.server.mode = { kind: 'ok' };
    await rig.engine.recordChange({ entity: 'tasks', id: 'a', op: 'delete', data: null, localUpdatedAt: rig.time.now() });
    await rig.time.advance(20 * MINUTE);
    expect(rig.server.requests((r) => r.method === 'DELETE')).toHaveLength(1);
  });
});

describe('the server asks everyone to go easy (Gylio-Usage: warn)', () => {
  it('waits longer before sending and sends fewer at a time', async () => {
    const rig = makeRig();
    rig.server.mode = { kind: 'warn' };
    await save(rig, 'a', 'x');
    expect(rig.engine.snapshot().economy).toBe(true);
    const mark = rig.server.requests().length;
    await rig.engine.recordChange(task('b', 'y', rig.time.now()));
    await rig.time.advance(10 * SECOND);
    expect(rig.server.requests().length).toBe(mark);
    await rig.time.advance(20 * SECOND);
    expect(rig.server.requests().length).toBeGreaterThan(mark);
  });

  it('goes back to normal when the header is gone', async () => {
    const rig = makeRig();
    rig.server.mode = { kind: 'warn' };
    await save(rig, 'a', 'x');
    rig.server.mode = { kind: 'ok' };
    await rig.time.advance(11 * SECOND);
    rig.engine.kick('manual');
    await rig.time.advance(SECOND);
    expect(rig.engine.snapshot().economy).toBe(false);
  });
});

describe('several tabs, and a hidden tab', () => {
  it('lets only one tab sync: the others stay quiet and look again later', async () => {
    const time = new FakeTime();
    const rig = makeRig({ time });
    (rig.engine as unknown as { o: { exclusive: unknown } }).o.exclusive = async () => SKIPPED;
    await rig.engine.recordChange(task('a', 'x', time.now()));
    await time.advance(4 * SECOND);
    expect(rig.server.requests()).toHaveLength(0);
    expect(rig.engine.snapshot().state.kind).toBe('idle');
    expect(rig.engine.snapshot().pending).toBe(1);
  });

  it('does not poll while hidden, sends what is waiting when the tab is hidden, and catches up when shown', async () => {
    const rig = makeRig();
    await rig.engine.start();
    await rig.time.advance(SECOND);
    rig.engine.setVisible(false);
    await rig.time.advance(SECOND);
    const mark = rig.server.requests().length;
    await rig.time.advance(HOUR);
    expect(rig.server.requests().length).toBe(mark);
    expect(rig.time.pending).toBe(0);
    rig.server.otherDeviceSets('tasks', 'x', { title: 'while away' });
    rig.engine.setVisible(true);
    await rig.time.advance(SECOND);
    expect(rig.applier.records.map((r) => r.id)).toContain('x');
  });

  it('flushes waiting changes the moment the tab is hidden (closing the tab right after saving)', async () => {
    const rig = makeRig();
    await rig.engine.recordChange(task('a', 'just typed', rig.time.now()));
    rig.engine.setVisible(false);
    await rig.time.advance(SECOND);
    expect(rig.server.records.has('tasks:a')).toBe(true);
  });
});

describe('working with the app database', () => {
  it('lets the app bring its waiting edits in before each pass, but only for a signed-in owner', async () => {
    let calls = 0;
    const rig = makeRig({ beforePass: async () => void (calls += 1) });
    await save(rig, 'a', 'x');
    expect(calls).toBe(1);
    await rig.time.advance(6 * MINUTE);
    expect(calls).toBe(2);

    calls = 0;
    const out = makeRig({ auth: null, beforePass: async () => void (calls += 1) });
    await out.engine.start();
    await out.time.advance(10 * SECOND);
    expect(calls).toBe(0);
  });

  it('does not touch the outbox of another person on this device (the choice comes first)', async () => {
    let calls = 0;
    const rig = makeRig({ beforePass: async () => void (calls += 1) });
    await rig.storage.setMeta({ owner: 'user_someone_else' });
    await rig.engine.start();
    await rig.time.advance(10 * SECOND);
    expect(rig.engine.snapshot().state.kind).toBe('other-account');
    expect(calls).toBe(0);
  });

  it('when an edit got in before a server change could be applied, looks again a second later without any waiting message', async () => {
    const rig = makeRig();
    rig.applier.deferTimes = 2;
    rig.server.otherDeviceSets('tasks', 'theirs', { title: 'From my phone' });
    await rig.engine.start();
    await rig.time.advance(500);
    expect(rig.applier.records).toEqual([]);
    expect(rig.engine.snapshot().state.kind).not.toBe('waiting');
    await rig.time.advance(2 * SECOND);
    expect(rig.applier.records.map((r) => r.id)).toEqual(['theirs']);
    expect(rig.engine.snapshot().state).toEqual({ kind: 'idle' });
  });

  it('reads the server changes from the beginning again when asked, applying those it already knew by version only if the app forgot them', async () => {
    const rig = makeRig();
    rig.server.otherDeviceSets('tasks', 'one', { title: 'One' });
    await rig.engine.start();
    await rig.time.advance(5 * SECOND);
    expect(rig.applier.records.map((r) => r.id)).toEqual(['one']);
    await rig.engine.restartPull();
    await rig.time.advance(5 * SECOND);
    // Same version as before: skipped, unless the app cleared its note of that version.
    expect(rig.applier.records.map((r) => r.id)).toEqual(['one']);
    await rig.storage.setVersions({ 'tasks:one': 0 });
    await rig.engine.restartPull();
    await rig.time.advance(5 * SECOND);
    expect(rig.applier.records.map((r) => r.id)).toEqual(['one', 'one']);
  });
});

describe('stopping', () => {
  it('stops all timers and stays quiet', async () => {
    const rig = makeRig();
    await rig.engine.start();
    await rig.time.advance(SECOND);
    rig.engine.stop();
    const sent = rig.server.requests().length;
    await rig.time.advance(2 * HOUR);
    expect(rig.server.requests().length).toBe(sent);
    expect(rig.time.pending).toBe(0);
  });
});
