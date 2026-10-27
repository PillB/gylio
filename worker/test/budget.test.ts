import { SELF } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { importJWK, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

const e = env as unknown as { TEST_PRIVATE_JWK: string; DB: D1Database };
const token = async (sub: string) =>
  new SignJWT({ azp: 'https://app.test' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setSubject(sub)
    .setIssuer('https://clerk.test')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(await importJWK(JSON.parse(e.TEST_PRIVATE_JWK), 'RS256'));

type Totals = { reads: number; writes: number; requests: number };
const totals = async (): Promise<Totals> =>
  (await e.DB.prepare("SELECT COALESCE(SUM(reads),0) AS reads, COALESCE(SUM(writes),0) AS writes, COALESCE(SUM(requests),0) AS requests FROM usage_day").first<Totals>())!;

/** Runs one request and returns the rows it read and wrote, as the Worker itself metered them. */
const cost = async (path: string, as: string, init: RequestInit = {}): Promise<Totals & { status: number }> => {
  const before = await totals();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${await token(as)}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  const res = await SELF.fetch(`https://api.test${path}`, { ...init, headers });
  await res.arrayBuffer();
  let after = await totals();
  for (let i = 0; i < 50 && after.requests === before.requests; i++) {
    await new Promise((r) => setTimeout(r, 10));
    after = await totals();
  }
  return { status: res.status, reads: after.reads - before.reads, writes: after.writes - before.writes, requests: after.requests - before.requests };
};

const debt = { name: 'Visa', balance: 500, annualRate: 20, minPayment: 25, dueDay: 15 };
const put = (id: string, as: string, extra: object = {}) => cost(`/api/debts/${id}`, as, { method: 'PUT', body: JSON.stringify({ ...debt, ...extra }) });

// Budgets are rows read / rows written per request as metered inside Miniflare's local D1 (production D1 can count
// differently, so check the real usage chart after the first deploy). Each is the measured cost plus a little headroom,
// so a change that quietly makes an endpoint more expensive fails here. The usage-gate read is included (the test
// turns its cache off); in production that one read is cached, so real reads are lower.
const BUDGET = {
  create: { reads: 5, writes: 5 },
  update: { reads: 6, writes: 4 },
  remove: { reads: 4, writes: 5 },
  getOne: { reads: 3, writes: 0 },
  pullIdle: { reads: 3, writes: 0 },
  pullFivePerRecord: 2,
  export: { reads: 4, writes: 0 },
};
const within = (c: Totals, b: { reads: number; writes: number }) => {
  expect(c.reads).toBeLessThanOrEqual(b.reads);
  expect(c.writes).toBeLessThanOrEqual(b.writes);
};

describe('per-endpoint row budgets', () => {
  it('keeps every endpoint inside its stated read and write budget', async () => {
    const u = 'budget_user';
    await cost('/api/sync/pull?since=0', u); // first request creates the identity row; steady state is measured below
    within(await put('b1', u), BUDGET.create);
    await put('b2', u);
    within(await put('b1', u, { balance: 1, baseVersion: 1 }), BUDGET.update);
    within(await cost('/api/debts/b1', u), BUDGET.getOne);
    within(await cost('/api/sync/pull?since=9999', u), BUDGET.pullIdle);
    within(await cost('/api/me/export', u), BUDGET.export);
    within(await cost('/api/debts/b2', u, { method: 'DELETE' }), BUDGET.remove);
  });

  it('writes nothing for an unchanged edit, an exact retry or a stale write', async () => {
    const u = 'budget_noop';
    await cost('/api/sync/pull?since=0', u);
    await put('n1', u);
    await put('n1', u, { balance: 7, baseVersion: 1 });
    expect((await put('n1', u, { balance: 7, baseVersion: 2 })).writes).toBe(0); // same data as stored
    expect((await put('n1', u, { balance: 7, baseVersion: 1 })).writes).toBe(0); // retry of an update that already landed
    const stale = await put('n1', u, { balance: 99, baseVersion: 1 });
    expect([stale.status, stale.writes]).toEqual([409, 0]);
    expect((await put('n1', u)).writes).toBe(0); // retry of the original create
  });

  it('reads cost grows with the rows returned, not with how many the person stores', async () => {
    const u = 'budget_scale';
    for (const id of ['s1', 's2', 's3', 's4', 's5']) await put(id, u);
    const tail = await cost('/api/sync/pull?since=4', u); // one changed row left, four unchanged rows stored
    expect(tail.reads).toBeLessThanOrEqual(BUDGET.pullIdle.reads + BUDGET.pullFivePerRecord);
  });

  it('charges the first sign-in a single extra row for the identity mapping', async () => {
    const first = await cost('/api/sync/pull?since=0', 'budget_new_person');
    expect(first.writes).toBe(1);
    const second = await cost('/api/sync/pull?since=0', 'budget_new_person');
    expect(second.writes).toBe(0);
  });

  it('answers the pull and the tombstone purge from indexes, never a table scan', async () => {
    const plan = async (sql: string) =>
      ((await e.DB.prepare(`EXPLAIN QUERY PLAN ${sql}`).all<{ detail: string }>()).results.map((r) => r.detail).join(' | '));
    const pull = await plan("SELECT entity, id, data, updatedAt, deleted, version, seq FROM records WHERE userId = 'u' AND seq > 1 ORDER BY seq LIMIT 5");
    expect(pull).toContain('idx_records_user_seq');
    expect(pull).not.toMatch(/SCAN records(?! USING)/);
    const purge = await plan("DELETE FROM records WHERE userId = 'u' AND deleted = 1 AND updatedAt < 5");
    expect(purge).toContain('idx_records_tombstones');
  });
});

describe('usage meter and degraded mode', () => {
  const seed = (reads: number, writes = 0, requests = 0) =>
    e.DB.prepare(
      'INSERT INTO usage_day (day, reads, writes, requests) VALUES (?, ?, ?, ?) ON CONFLICT (day) DO UPDATE SET reads = excluded.reads, writes = excluded.writes, requests = excluded.requests',
    )
      .bind(new Date().toISOString().slice(0, 10), reads, writes, requests)
      .run();
  const reset = () => e.DB.exec('DELETE FROM usage_day');

  it('counts requests, rows read and rows written into one row per day', async () => {
    await reset();
    await put('m1', 'meter_user');
    const row = await e.DB.prepare('SELECT reads, writes, requests FROM usage_day').first<Totals>();
    expect(row!.requests).toBeGreaterThanOrEqual(1);
    expect(row!.writes).toBeGreaterThanOrEqual(4);
    const count = (await e.DB.prepare('SELECT COUNT(*) AS n FROM usage_day').first<{ n: number }>())!.n;
    expect(count).toBe(1);
  });

  it('warns at 70 percent with a header and keeps serving', async () => {
    await seed(3_600_000);
    const res = await cost('/api/sync/pull?since=0', 'warn_user');
    expect(res.status).toBe(200);
    const raw = await SELF.fetch('https://api.test/api/sync/pull?since=0', { headers: { Authorization: `Bearer ${await token('warn_user')}` } });
    expect(raw.headers.get('Gylio-Usage')).toBe('warn');
    await reset();
  });

  it('sheds sync at 90 percent with a clear 503 and Retry-After, while health, export and erase still answer', async () => {
    await seed(4_600_000);
    const auth = { Authorization: `Bearer ${await token('shed_user')}` };
    const shed = await SELF.fetch('https://api.test/api/sync/pull?since=0', { headers: auth });
    expect(shed.status).toBe(503);
    expect(Number(shed.headers.get('Retry-After'))).toBeGreaterThanOrEqual(60);
    expect(Number(shed.headers.get('Retry-After'))).toBeLessThanOrEqual(3600);
    expect(((await shed.json()) as { error: { code: string } }).error.code).toBe('SYNC_PAUSED');
    const write = await SELF.fetch('https://api.test/api/debts/x1', { method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(debt) });
    expect(write.status).toBe(503);
    expect((await SELF.fetch('https://api.test/api/me/export', { headers: auth })).status).toBe(200);
    expect((await SELF.fetch('https://api.test/api/me', { method: 'DELETE', headers: auth })).status).toBe(204);
    expect((await SELF.fetch('https://api.test/api/mex/y', { headers: auth })).status).toBe(503); // lookalike paths are not exempt
    const health = await SELF.fetch('https://api.test/api/v1/health');
    expect(health.status).toBe(503);
    expect(await health.json()).toMatchObject({ usageOk: false, database: true });
    await reset();
    expect((await SELF.fetch('https://api.test/api/sync/pull?since=0', { headers: auth })).status).toBe(200);
  });

  it('sheds on the write allowance and the request allowance too, not only reads', async () => {
    const auth = { Authorization: `Bearer ${await token('shed_user_2')}` };
    await seed(0, 95_000, 0);
    expect((await SELF.fetch('https://api.test/api/sync/pull?since=0', { headers: auth })).status).toBe(503);
    await seed(0, 0, 95_000);
    expect((await SELF.fetch('https://api.test/api/sync/pull?since=0', { headers: auth })).status).toBe(503);
    await reset();
  });
});
