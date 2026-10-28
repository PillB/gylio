import { createExecutionContext, SELF, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { importJWK, SignJWT } from 'jose';
import { afterEach, describe, expect, it } from 'vitest';
import worker from '../src/index';
import { SyncEngine, type Auth } from '../../src/core/sync/engine';
import { MemoryStorage } from '../../src/core/sync/memoryStorage';
import { FakeApplier, FakeTime, last } from '../../src/core/sync/testHarness';
import { createFetchTransport } from '../../src/core/sync/transport';
import type { Transport } from '../../src/core/sync/types';

// The sync engine from the app, talking to the real Worker code (in the Workers runtime, with a real D1
// database), not to a stand-in. This is where "does the app recover from a 503" is checked for real:
// the 503s, headers and conflict answers below are produced by worker/src/index.ts.

const e = env as unknown as { TEST_PRIVATE_JWK: string; DB: D1Database };
const SECOND = 1000;
const MINUTE = 60 * SECOND;

const signToken = async (sub: string, exp = '5m') =>
  new SignJWT({ azp: 'https://app.test' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setSubject(sub)
    .setIssuer('https://clerk.test')
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(await importJWK(JSON.parse(e.TEST_PRIVATE_JWK), 'RS256'));

const envWithHolder = (value: string) => Object.create(env, { HOLDER_NAME: { value, enumerable: true } });

type Device = ReturnType<typeof device>;

/** One phone or laptop: its own storage and engine, the production transport, a hand-moved clock. */
const device = (
  sub: string,
  options: { time?: FakeTime; random?: () => number; tokenFor?: () => Promise<string>; viaFetch?: (req: Request) => Promise<Response>; wrap?: (t: Transport) => Transport } = {},
) => {
  const time = options.time ?? new FakeTime();
  const storage = new MemoryStorage();
  const applier = new FakeApplier();
  const sent: { method: string; path: string; status?: number }[] = [];
  const viaFetch = options.viaFetch ?? ((req: Request) => SELF.fetch(req));
  const fetchFn = (async (url: string, init: RequestInit) => {
    const res = await viaFetch(new Request(url, init));
    sent.push({ method: init.method ?? 'GET', path: new URL(url).pathname + new URL(url).search, status: res.status });
    return res;
  }) as unknown as typeof fetch;
  const base = createFetchTransport('https://api.test', fetchFn);
  const engine = new SyncEngine({
    storage,
    applier,
    transport: options.wrap ? options.wrap(base) : base,
    getAuth: async () => ({ token: await (options.tokenFor ?? (() => signToken(sub)))(), userId: sub }) as Auth,
    clock: { now: time.now, random: options.random ?? (() => 0.5) },
    timers: { set: time.set, clear: time.clear },
  });
  time.busy.push(() => engine.isRunning());
  return { time, storage, applier, engine, sent };
};

const change = (d: Device, entity: string, id: string, data: Record<string, unknown>, at?: number) =>
  d.engine.recordChange({ entity, id, op: 'put', data, localUpdatedAt: at ?? d.time.now() });

const seedUsage = (reads: number, writes = 0, requests = 0) =>
  e.DB.prepare(
    'INSERT INTO usage_day (day, reads, writes, requests) VALUES (?, ?, ?, ?) ON CONFLICT (day) DO UPDATE SET reads = excluded.reads, writes = excluded.writes, requests = excluded.requests',
  )
    .bind(new Date().toISOString().slice(0, 10), reads, writes, requests)
    .run();
const resetUsage = () => e.DB.exec('DELETE FROM usage_day');

// A failed test must not leave the Worker in shed mode for the tests after it.
afterEach(resetUsage);

const debt = { name: 'Visa', balance: 500, annualRate: 20, minPayment: 25, dueDay: 15 };

describe('the app syncing with the real Worker', () => {
  it('two devices of one person end up with the same data, for every kind of record', async () => {
    const time = new FakeTime();
    const phone = device('sync_person_1', { time });
    const laptop = device('sync_person_1', { time });
    await change(phone, 'tasks', 't1', { title: 'Call the bank', status: 'pending', subtasks: [{ label: 'find number', done: false }] });
    await change(phone, 'events', 'e1', { title: 'Dentist', startDate: '2026-11-02T10:00:00Z', endDate: '2026-11-02T11:00:00Z' });
    await change(phone, 'budgets', 'b1', { month: '2026-11', income: [{ name: 'Pay', amount: 1000 }], categories: [] });
    await change(phone, 'transactions', 'x1', { budgetMonth: '2026-11', amount: 12.5, categoryName: 'Food', isNeed: true, date: '2026-11-01T00:00:00Z' });
    await change(phone, 'debts', 'd1', debt);
    await time.advance(5 * SECOND);
    expect(phone.engine.snapshot()).toMatchObject({ pending: 0, refused: 0, state: { kind: 'idle' } });

    laptop.engine.kick('manual');
    await time.advance(5 * SECOND);
    const got = Object.fromEntries(laptop.applier.records.map((r) => [`${r.entity}:${r.id}`, r.data]));
    expect(Object.keys(got).sort()).toEqual(['budgets:b1', 'debts:d1', 'events:e1', 'tasks:t1', 'transactions:x1']);
    expect(got['debts:d1']).toMatchObject(debt);
    expect(got['tasks:t1']).toMatchObject({ title: 'Call the bank' });
  });

  it('twenty quick edits cost the Worker one request and a handful of rows', async () => {
    await resetUsage();
    const d = device('sync_person_2');
    for (let i = 0; i < 20; i += 1) {
      await change(d, 'tasks', 'edit', { title: `draft ${i}` });
      await d.time.advance(200);
    }
    await d.time.advance(5 * SECOND);
    expect(d.sent.filter((r) => r.method === 'PUT')).toHaveLength(1);
    const row = await e.DB.prepare('SELECT writes FROM usage_day').first<{ writes: number }>();
    expect(row!.writes).toBeLessThanOrEqual(5);
  });
});

describe('a 503 from the real Worker', () => {
  it('SYNC_PAUSED: waits on the server clock, keeps working locally, and catches up after recovery', async () => {
    await seedUsage(4_600_000);
    const d = device('shed_person_1');
    await change(d, 'tasks', 'a', { title: 'saved while paused' });
    await d.time.advance(5 * SECOND);

    const state = d.engine.snapshot().state;
    expect(state).toMatchObject({ kind: 'waiting', reason: 'paused' });
    const retryAt = (state as { retryAt: number }).retryAt;
    expect(retryAt - d.time.now()).toBeGreaterThanOrEqual(SECOND * 60);
    expect(retryAt - d.time.now()).toBeLessThanOrEqual(65 * MINUTE);
    expect(d.sent.map((r) => r.status)).toEqual([503]);

    for (let i = 0; i < 3; i += 1) {
      await change(d, 'tasks', `more${i}`, { title: `note ${i}` });
      await d.time.advance(5 * SECOND);
    }
    for (let i = 0; i < 10; i += 1) {
      await change(d, 'tasks', 'a', { title: `saved while paused, edit ${i}` });
      await d.time.advance(5 * SECOND);
    }
    expect(d.sent).toHaveLength(1);
    expect(d.engine.snapshot().pending).toBe(4);

    await resetUsage();
    await d.time.advance(retryAt - d.time.now() + 1);
    await d.time.advance(10 * SECOND);
    expect(d.engine.snapshot()).toMatchObject({ pending: 0, state: { kind: 'idle' } });
    const stored = await e.DB.prepare("SELECT COUNT(*) AS n FROM records r JOIN identities i ON i.userId = r.userId WHERE i.subject = 'shed_person_1'").first<{ n: number }>();
    expect(stored!.n).toBe(4);
  });

  it('a person pausing for a whole day costs about one request an hour, and a pull at the end shows nothing was lost', async () => {
    await seedUsage(4_600_000);
    const d = device('shed_person_2');
    await change(d, 'tasks', 'a', { title: 'x' });
    for (let hour = 0; hour < 24; hour += 1) {
      await d.time.advance(MINUTE * 60);
      await change(d, 'tasks', 'a', { title: `edit ${hour}` });
    }
    expect(d.sent.length).toBeLessThanOrEqual(30);
    expect(d.engine.snapshot().pending).toBe(1);
    await resetUsage();
    await d.time.advance(70 * MINUTE);
    expect(d.engine.snapshot().pending).toBe(0);
  });

  it('the warning level (70 percent) makes the app send less often but still send', async () => {
    await seedUsage(3_600_000);
    const d = device('warn_person');
    await change(d, 'tasks', 'a', { title: 'x' });
    await d.time.advance(5 * SECOND);
    expect(d.engine.snapshot()).toMatchObject({ economy: true, pending: 0 });
    const sentBefore = d.sent.length;
    await change(d, 'tasks', 'b', { title: 'y' });
    await d.time.advance(10 * SECOND);
    expect(d.sent.length).toBe(sentBefore);
    await d.time.advance(40 * SECOND);
    expect(d.engine.snapshot().pending).toBe(0);
  });

  it('SIGNUP_CLOSED: says so, keeps the data on the device, and tries again only hours later', async () => {
    const closed = async (req: Request) => {
      const ctx = createExecutionContext();
      const res = await worker.fetch(req, envWithHolder(''), ctx);
      await waitOnExecutionContext(ctx);
      return res;
    };
    const d = device('closed_person', { viaFetch: closed });
    await change(d, 'tasks', 'a', { title: 'x' });
    await d.time.advance(5 * SECOND);
    expect(d.engine.snapshot().state.kind).toBe('closed');
    expect(d.engine.snapshot().pending).toBe(1);
    await d.time.advance(5 * 60 * MINUTE);
    expect(d.sent).toHaveLength(1);
  });
});

describe('the network lying to the app', () => {
  it('a response lost after the Worker stored the change is retried and does not duplicate or conflict', async () => {
    let lose = true;
    const d = device('lost_person', {
      wrap: (base) => async (request) => {
        const response = await base(request);
        if (lose && request.method === 'PUT') {
          lose = false;
          throw new TypeError('Failed to fetch');
        }
        return response;
      },
    });
    await change(d, 'debts', 'd1', debt);
    await d.time.advance(5 * SECOND);
    expect(d.engine.snapshot().state).toMatchObject({ kind: 'waiting', reason: 'offline' });
    await d.time.advance(20 * MINUTE);
    expect(d.engine.snapshot()).toMatchObject({ pending: 0, refused: 0 });
    const row = await e.DB.prepare("SELECT r.version FROM records r JOIN identities i ON i.userId = r.userId WHERE i.subject = 'lost_person' AND r.id = 'd1'").first<{ version: number }>();
    expect(row!.version).toBe(1);
  });

  it('an expired sign-in token is replaced once and the change goes through', async () => {
    let calls = 0;
    const d = device('expired_person', { tokenFor: () => signToken('expired_person', calls++ === 0 ? '-1m' : '5m') });
    await change(d, 'tasks', 'a', { title: 'x' });
    await d.time.advance(5 * SECOND);
    expect(d.sent.map((r) => r.status).slice(0, 2)).toEqual([401, 201]);
    expect(d.engine.snapshot()).toMatchObject({ pending: 0, state: { kind: 'idle' } });
  });
});

describe('refusals and conflicts from the real Worker', () => {
  it('an invalid change is refused and kept; other changes still go; fixing it sends it', async () => {
    const d = device('refuse_person');
    await change(d, 'events', 'bad', { title: 'Backwards', startDate: '2026-11-02T11:00:00Z', endDate: '2026-11-02T10:00:00Z' });
    await change(d, 'tasks', 'good', { title: 'Fine' });
    await d.time.advance(5 * SECOND);
    expect(d.engine.snapshot()).toMatchObject({ pending: 0, refused: 1 });
    const refused = (await d.storage.listOutbox())[0];
    expect(refused.rejected?.code).toBe('VALIDATION_ERROR');
    await change(d, 'events', 'bad', { title: 'Fixed', startDate: '2026-11-02T10:00:00Z', endDate: '2026-11-02T11:00:00Z' });
    await d.time.advance(5 * SECOND);
    expect(d.engine.snapshot()).toMatchObject({ pending: 0, refused: 0 });
  });

  it('the per-person record limit refuses the extra record and keeps it on the device', async () => {
    const d = device('quota_person');
    for (let i = 0; i < 7; i += 1) await change(d, 'tasks', `q${i}`, { title: `t${i}` }, d.time.now() + i);
    await d.time.advance(5 * SECOND);
    expect(d.engine.snapshot()).toMatchObject({ pending: 0, refused: 2 });
    expect((await d.storage.listOutbox()).map((x) => x.rejected?.code)).toEqual(['QUOTA_EXCEEDED', 'QUOTA_EXCEEDED']);
  });

  it('the later of two edits wins, the earlier is kept for the person', async () => {
    const time = new FakeTime();
    const phone = device('conflict_person', { time });
    const laptop = device('conflict_person', { time });
    await change(phone, 'tasks', 'c1', { title: 'original' });
    await time.advance(5 * SECOND);
    laptop.engine.kick('manual');
    await time.advance(5 * SECOND);

    const early = time.now();
    await time.advance(MINUTE);
    await change(phone, 'tasks', 'c1', { title: 'phone, later' });
    await time.advance(5 * SECOND);
    await laptop.engine.recordChange({ entity: 'tasks', id: 'c1', op: 'put', data: { title: 'laptop, earlier' }, localUpdatedAt: early });
    await time.advance(5 * SECOND);

    expect(laptop.engine.snapshot()).toMatchObject({ pending: 0, kept: 1 });
    expect((await laptop.storage.listKept())[0].data).toEqual({ title: 'laptop, earlier' });
    expect(last(laptop.applier.records).data).toEqual({ title: 'phone, later' });
  });

  it('an edit made here survives a delete made on another device', async () => {
    const time = new FakeTime();
    const phone = device('resurrect_person', { time });
    const laptop = device('resurrect_person', { time });
    await change(phone, 'tasks', 'r1', { title: 'original' });
    await time.advance(5 * SECOND);
    laptop.engine.kick('manual');
    await time.advance(5 * SECOND);

    await phone.engine.recordChange({ entity: 'tasks', id: 'r1', op: 'delete', data: null, localUpdatedAt: time.now() });
    await time.advance(5 * SECOND);
    await change(laptop, 'tasks', 'r1', { title: 'edited after it was deleted elsewhere' });
    await time.advance(5 * SECOND);

    const row = await e.DB.prepare("SELECT r.deleted, r.data FROM records r JOIN identities i ON i.userId = r.userId WHERE i.subject = 'resurrect_person' AND r.id = 'r1'").first<{ deleted: number; data: string }>();
    expect(row!.deleted).toBe(0);
    expect(JSON.parse(row!.data)).toMatchObject({ title: 'edited after it was deleted elsewhere' });
    expect(laptop.engine.snapshot()).toMatchObject({ pending: 0, refused: 0 });
  });

  it('a record created and deleted before it ever left the device never reaches the Worker', async () => {
    const d = device('ghost_person');
    d.engine.setOnline(false);
    await change(d, 'tasks', 'oops', { title: 'typo' });
    await d.engine.recordChange({ entity: 'tasks', id: 'oops', op: 'delete', data: null, localUpdatedAt: d.time.now() });
    d.engine.setOnline(true);
    await d.time.advance(10 * SECOND);
    expect(d.sent.filter((r) => r.method !== 'GET')).toEqual([]);
  });
});

describe('separation from other people, seen from the client', () => {
  it('another person on another device never receives this one’s data', async () => {
    const time = new FakeTime();
    const a = device('person_a_sync', { time });
    const b = device('person_b_sync', { time });
    await change(a, 'debts', 'secret', debt);
    await time.advance(5 * SECOND);
    b.engine.kick('manual');
    await time.advance(5 * SECOND);
    expect(b.applier.records).toEqual([]);
  });
});
