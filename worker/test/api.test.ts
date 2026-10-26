import { SELF } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { importJWK, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

const e = env as unknown as { TEST_PRIVATE_JWK: string; DB: D1Database };

const token = async (sub: string, opts: { azp?: string; exp?: string; iss?: string } = {}) =>
  new SignJWT({ azp: opts.azp ?? 'https://app.test' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setSubject(sub)
    .setIssuer(opts.iss ?? 'https://clerk.test')
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '5m')
    .sign(await importJWK(JSON.parse(e.TEST_PRIVATE_JWK), 'RS256'));

const call = async (path: string, init: RequestInit & { as?: string } = {}) => {
  const headers = new Headers(init.headers);
  if (init.as) headers.set('Authorization', `Bearer ${await token(init.as)}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  return SELF.fetch(`https://api.test${path}`, { ...init, headers });
};
const put = (path: string, body: unknown, as = 'user_a') => call(path, { method: 'PUT', body: JSON.stringify(body), as });

const debt = { name: 'Visa', balance: 500, annualRate: 20, minPayment: 25, dueDay: 15 };

describe('health and auth', () => {
  it('answers health without a token and reports d1', async () => {
    const res = await call('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok', database: 'd1', authConfigured: true });
  });

  it('rejects missing, malformed, expired, wrong-issuer and wrong-azp tokens', async () => {
    expect((await call('/api/debts')).status).toBe(401);
    expect((await call('/api/debts', { headers: { Authorization: 'Bearer nope' } })).status).toBe(401);
    for (const bad of [await token('u', { exp: '-1m' }), await token('u', { iss: 'https://evil.test' }), await token('u', { azp: 'https://evil.test' })]) {
      expect((await call('/api/debts', { headers: { Authorization: `Bearer ${bad}` } })).status).toBe(401);
    }
  });

  it('labels an expired token so the app can refresh instead of signing out', async () => {
    const res = await call('/api/debts', { headers: { Authorization: `Bearer ${await token('u', { exp: '-1m' })}` } });
    expect((await res.json()) as { error: { code: string } }).toMatchObject({ error: { code: 'TOKEN_EXPIRED' } });
  });
});

describe('records', () => {
  it('stores a debt with a due day, lists it, and keeps users apart', async () => {
    expect((await put('/api/debts/d1', debt)).status).toBe(201);
    const mine = (await (await call('/api/debts', { as: 'user_a' })).json()) as { id: string; data: typeof debt }[];
    expect(mine.map((r) => [r.id, r.data.dueDay])).toEqual([['d1', 15]]);
    expect(await (await call('/api/debts', { as: 'user_b' })).json()).toEqual([]);
    expect((await call('/api/debts/d1', { as: 'user_b' })).status).toBe(404);
  });

  it('is idempotent: retrying the same write updates in place and returns 200', async () => {
    await put('/api/debts/d2', debt);
    expect((await put('/api/debts/d2', { ...debt, balance: 400 })).status).toBe(200);
    const row = (await (await call('/api/debts/d2', { as: 'user_a' })).json()) as { data: { balance: number } };
    expect(row.data.balance).toBe(400);
  });

  it('validates fields and drops unknown ones without storing them', async () => {
    const bad = await put('/api/debts/x', { ...debt, dueDay: 32 });
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { error: { details: { field: string }[] } }).error.details.map((d) => d.field)).toEqual(['dueDay']);
    await put('/api/debts/d3', { ...debt, sneaky: '<script>' });
    const row = (await (await call('/api/debts/d3', { as: 'user_a' })).json()) as { data: Record<string, unknown> };
    expect(row.data).not.toHaveProperty('sneaky');
  });

  it("accepts the app's 'completed' task status that the legacy Express schema rejected", async () => {
    expect((await put('/api/tasks/t1', { title: 'Pay rent', status: 'completed', energyRequired: 'low' }, 'user_t')).status).toBe(201);
    expect((await put('/api/tasks/t2', { title: 'x', status: 'nonsense' }, 'user_t')).status).toBe(400);
  });

  it('rejects an event that ends before it starts', async () => {
    const res = await put('/api/events/e1', { title: 'x', startDate: '2026-01-02T10:00:00Z', endDate: '2026-01-02T09:00:00Z' });
    expect(res.status).toBe(400);
  });

  it('answers 409 with the server copy when the client write is older', async () => {
    const created = (await (await put('/api/debts/c1', debt, 'user_c')).json()) as { updatedAt: number };
    const stale = await put('/api/debts/c1', { ...debt, balance: 1, clientUpdatedAt: created.updatedAt - 1000 }, 'user_c');
    expect(stale.status).toBe(409);
    expect(((await stale.json()) as { current: { data: { balance: number } } }).current.data.balance).toBe(500);
  });

  it('deletes with a tombstone that a pull reports, and a repeated delete is a no-op', async () => {
    await put('/api/debts/z1', debt, 'user_del');
    const before = (await (await call('/api/sync/pull?since=0', { as: 'user_del' })).json()) as { cursor: number };
    expect((await call('/api/debts/z1', { method: 'DELETE', as: 'user_del' })).status).toBe(204);
    expect((await call('/api/debts/z1', { method: 'DELETE', as: 'user_del' })).status).toBe(204);
    expect((await call('/api/debts/z1', { as: 'user_del' })).status).toBe(404);
    const pull = (await (await call(`/api/sync/pull?since=${before.cursor}`, { as: 'user_del' })).json()) as {
      records: { id: string; deleted: boolean }[];
    };
    expect(pull.records).toEqual([expect.objectContaining({ id: 'z1', deleted: true })]);
  });

  it('pull returns only changes after the cursor, in pages with hasMore', async () => {
    for (const id of ['p1', 'p2', 'p3']) await put(`/api/debts/${id}`, debt, 'user_pull');
    const first = (await (await call('/api/sync/pull?since=0&limit=2', { as: 'user_pull' })).json()) as {
      records: { id: string }[]; cursor: number; hasMore: boolean;
    };
    expect(first.records.map((r) => r.id)).toEqual(['p1', 'p2']);
    expect(first.hasMore).toBe(true);
    const rest = (await (await call(`/api/sync/pull?since=${first.cursor}`, { as: 'user_pull' })).json()) as { records: { id: string }[]; hasMore: boolean };
    expect(rest.records.map((r) => r.id)).toEqual(['p3']);
    expect(rest.hasMore).toBe(false);
  });

  it('enforces the per-user record cap so one account cannot fill the free database', async () => {
    for (const id of ['q1', 'q2', 'q3', 'q4', 'q5']) expect((await put(`/api/debts/${id}`, debt, 'user_cap')).status).toBe(201);
    expect((await put('/api/debts/q6', debt, 'user_cap')).status).toBe(413);
    expect((await put('/api/debts/q1', { ...debt, balance: 1 }, 'user_cap')).status).toBe(200);
  });

  it('rejects ids that are not safe path segments and unknown resources', async () => {
    expect((await put('/api/debts/has%20space', debt)).status).toBe(400);
    expect((await call('/api/secrets', { as: 'user_a' })).status).toBe(404);
  });
});

describe('your data', () => {
  it('exports only your own records and erases them all on request', async () => {
    await put('/api/debts/m1', debt, 'user_me');
    await put('/api/tasks/m2', { title: 'Plan' }, 'user_me');
    await put('/api/debts/m3', debt, 'user_other');
    const exported = (await (await call('/api/me/export', { as: 'user_me' })).json()) as { records: { id: string }[] };
    expect(exported.records.map((r) => r.id).sort()).toEqual(['m1', 'm2']);
    expect((await call('/api/me', { method: 'DELETE', as: 'user_me' })).status).toBe(204);
    expect(((await (await call('/api/me/export', { as: 'user_me' })).json()) as { records: unknown[] }).records).toEqual([]);
    expect((await call('/api/debts/m3', { as: 'user_other' })).status).toBe(200);
  });
});

describe('browser access', () => {
  it('echoes only configured origins and answers preflight', async () => {
    const ok = await call('/api/health', { headers: { Origin: 'https://app.test' } });
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('https://app.test');
    const other = await call('/api/health', { headers: { Origin: 'https://evil.test' } });
    expect(other.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect((await call('/api/debts', { method: 'OPTIONS' })).status).toBe(204);
  });
});
