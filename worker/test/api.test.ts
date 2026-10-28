import { createExecutionContext, SELF, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../src/index';
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
  it('reports not ready when the migrated table is missing', async () => {
    await e.DB.exec('ALTER TABLE records RENAME TO records_hidden');
    try {
      const res = await call('/api/v1/health');
      expect(res.status).toBe(503);
      expect(await res.json()).toMatchObject({ ok: false, database: false });
    } finally {
      await e.DB.exec('ALTER TABLE records_hidden RENAME TO records');
    }
  });

  it('answers health without a token and reports d1', async () => {
    const res = await call('/api/v1/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, worker: true, database: true, auth: true, usageOk: true, signupOpen: true, origin: 'https://app.test' });
  });

  it('rejects missing, malformed, expired, wrong-issuer and wrong-azp tokens', async () => {
    expect((await call('/api/debts/x')).status).toBe(401);
    expect((await call('/api/debts/x', { headers: { Authorization: 'Bearer nope' } })).status).toBe(401);
    for (const bad of [await token('u', { exp: '-1m' }), await token('u', { iss: 'https://evil.test' }), await token('u', { azp: 'https://evil.test' })]) {
      expect((await call('/api/debts/x', { headers: { Authorization: `Bearer ${bad}` } })).status).toBe(401);
    }
  });

  it('labels an expired token so the app can refresh instead of signing out', async () => {
    const res = await call('/api/debts/x', { headers: { Authorization: `Bearer ${await token('u', { exp: '-1m' })}` } });
    expect((await res.json()) as { error: { code: string } }).toMatchObject({ error: { code: 'TOKEN_EXPIRED' } });
  });
});

describe('records', () => {
  it('stores a debt with a due day, reads it back, and keeps users apart', async () => {
    expect((await put('/api/debts/d1', debt)).status).toBe(201);
    const mine = (await (await call('/api/debts/d1', { as: 'user_a' })).json()) as { id: string; data: typeof debt };
    expect([mine.id, mine.data.dueDay]).toEqual(['d1', 15]);
    const theirs = (await (await call('/api/sync/pull?since=0', { as: 'user_b' })).json()) as { records: unknown[] };
    expect(theirs.records).toEqual([]);
    expect((await call('/api/debts/d1', { as: 'user_b' })).status).toBe(404);
  });

  it('treats an exact retry as success and versions real edits', async () => {
    const first = (await (await put('/api/debts/d2', debt)).json()) as { version: number };
    expect(first.version).toBe(1);
    const retry = await put('/api/debts/d2', debt);
    expect(retry.status).toBe(200);
    expect(((await retry.json()) as { version: number }).version).toBe(1);
    const edited = (await (await put('/api/debts/d2', { ...debt, balance: 400, baseVersion: 1 })).json()) as { version: number; data: { balance: number } };
    expect([edited.version, edited.data.balance]).toEqual([2, 400]);
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

  it('stores the person’s own time estimate on a task and rejects nonsense values', async () => {
    expect((await put('/api/tasks/est1', { title: 'Write report', estimateMin: 30 }, 'user_est')).status).toBe(201);
    const saved = (await (await call('/api/tasks/est1', { as: 'user_est' })).json()) as { data: { estimateMin: number } };
    expect(saved.data.estimateMin).toBe(30);
    for (const bad of [0, -5, 1441, 2.5, '30']) {
      expect((await put('/api/tasks/est2', { title: 'x', estimateMin: bad }, 'user_est')).status).toBe(400);
    }
  });

  it('rejects an event that ends before it starts', async () => {
    const res = await put('/api/events/e1', { title: 'x', startDate: '2026-01-02T10:00:00Z', endDate: '2026-01-02T09:00:00Z' });
    expect(res.status).toBe(400);
  });

  it('answers 409 with the current record when the write was based on an old version', async () => {
    await put('/api/debts/c1', debt, 'user_c');
    await put('/api/debts/c1', { ...debt, balance: 450, baseVersion: 1 }, 'user_c');
    const stale = await put('/api/debts/c1', { ...debt, balance: 1, baseVersion: 1 }, 'user_c');
    expect(stale.status).toBe(409);
    expect(((await stale.json()) as { current: { version: number; data: { balance: number } } }).current).toMatchObject({ version: 2, data: { balance: 450 } });
  });

  it('lets only one of two devices that race from the same version win', async () => {
    await put('/api/debts/r1', debt, 'user_race');
    const [a, b] = await Promise.all([
      put('/api/debts/r1', { ...debt, balance: 111, baseVersion: 1 }, 'user_race'),
      put('/api/debts/r1', { ...debt, balance: 222, baseVersion: 1 }, 'user_race'),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });

  it('does not let an old queued write resurrect a deleted record', async () => {
    await put('/api/debts/g1', debt, 'user_ghost');
    await call('/api/debts/g1', { method: 'DELETE', as: 'user_ghost' });
    const stale = await put('/api/debts/g1', { ...debt, balance: 9, baseVersion: 1 }, 'user_ghost');
    expect(stale.status).toBe(409);
    expect(((await stale.json()) as { current: { deleted: boolean; version: number } }).current).toMatchObject({ deleted: true, version: 2 });
    expect((await put('/api/debts/g1', { ...debt, baseVersion: 2 }, 'user_ghost')).status).toBe(200);
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

  it('never skips changes made at the same moment when paging one at a time', async () => {
    const ids = ['s1', 's2', 's3', 's4'];
    await Promise.all(ids.map((id) => put(`/api/debts/${id}`, debt, 'user_ties')));
    const seen: string[] = [];
    let cursor = 0;
    for (let page = 0; page < 10; page++) {
      const res = (await (await call(`/api/sync/pull?since=${cursor}&limit=1`, { as: 'user_ties' })).json()) as {
        records: { id: string }[]; cursor: number; hasMore: boolean;
      };
      seen.push(...res.records.map((r) => r.id));
      cursor = res.cursor;
      if (!res.hasMore) break;
    }
    expect(seen.sort()).toEqual(ids);
  });

  it('enforces the per-user record cap so one account cannot fill the free database', async () => {
    for (const id of ['q1', 'q2', 'q3', 'q4', 'q5']) expect((await put(`/api/debts/${id}`, debt, 'user_cap')).status).toBe(201);
    expect((await put('/api/debts/q6', debt, 'user_cap')).status).toBe(413);
    expect((await put('/api/debts/q1', { ...debt, balance: 1, baseVersion: 1 }, 'user_cap')).status).toBe(200);
  });

  it('counts deleted records against the cap so create-and-delete cannot grow storage', async () => {
    for (const id of ['w1', 'w2', 'w3', 'w4', 'w5']) await put(`/api/debts/${id}`, debt, 'user_churn');
    for (const id of ['w1', 'w2', 'w3', 'w4', 'w5']) await call(`/api/debts/${id}`, { method: 'DELETE', as: 'user_churn' });
    expect((await put('/api/debts/w6', debt, 'user_churn')).status).toBe(413);
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
    const ok = await call('/api/v1/health', { headers: { Origin: 'https://app.test' } });
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('https://app.test');
    const other = await call('/api/v1/health', { headers: { Origin: 'https://evil.test' } });
    expect(other.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect((await call('/api/debts/x', { method: 'OPTIONS' })).status).toBe(204);
  });
});

describe('sign-in identity', () => {
  const rows = async () => (await e.DB.prepare('SELECT provider, subject, userId FROM identities').all<{ provider: string; subject: string; userId: string }>()).results;

  it('keys records by an internal id, never by the provider subject', async () => {
    await put('/api/debts/i1', debt, 'user_ident_a');
    const mapping = (await rows()).find((r) => r.subject === 'user_ident_a')!;
    expect(mapping.provider).toBe('clerk');
    expect(mapping.userId).not.toBe('user_ident_a');
    const stored = await e.DB.prepare('SELECT userId FROM records WHERE id = ?').bind('i1').first<{ userId: string }>();
    expect(stored!.userId).toBe(mapping.userId);
    const bySubject = await e.DB.prepare('SELECT COUNT(*) AS n FROM records WHERE userId = ?').bind('user_ident_a').first<{ n: number }>();
    expect(bySubject!.n).toBe(0);
  });

  it('gives the same person the same id on every request and different people different ids', async () => {
    await put('/api/debts/i2', debt, 'user_ident_b');
    await put('/api/debts/i3', debt, 'user_ident_b');
    await put('/api/debts/i4', debt, 'user_ident_c');
    const all = await rows();
    expect(all.filter((r) => r.subject === 'user_ident_b')).toHaveLength(1);
    const b = all.find((r) => r.subject === 'user_ident_b')!.userId;
    const c = all.find((r) => r.subject === 'user_ident_c')!.userId;
    expect(b).not.toBe(c);
  });

  it('survives a provider change: a second mapping row can point at the same person without touching records', async () => {
    await put('/api/debts/i5', debt, 'user_ident_d');
    const before = (await rows()).find((r) => r.subject === 'user_ident_d')!;
    await e.DB.prepare("INSERT INTO identities (provider, subject, userId, createdAt) VALUES ('other-provider', 'abc', ?, 1)").bind(before.userId).run();
    const records = await e.DB.prepare('SELECT COUNT(*) AS n FROM records WHERE userId = ?').bind(before.userId).first<{ n: number }>();
    expect(records!.n).toBe(1);
  });

  it('erasure removes the mapping and the counters along with the records', async () => {
    await put('/api/debts/i6', debt, 'user_ident_e');
    const mapping = (await rows()).find((r) => r.subject === 'user_ident_e')!;
    await call('/api/me', { method: 'DELETE', as: 'user_ident_e' });
    expect((await rows()).some((r) => r.subject === 'user_ident_e')).toBe(false);
    const seq = await e.DB.prepare('SELECT COUNT(*) AS n FROM user_seq WHERE userId = ?').bind(mapping.userId).first<{ n: number }>();
    expect(seq!.n).toBe(0);
  });
});

describe('token checks', () => {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const withHeader = (jwt: string, header: object) => `${b64(header)}.${jwt.split('.')[1]}.${jwt.split('.')[2]}`;

  it('rejects an unsigned token and a token claiming a different algorithm', async () => {
    const good = await token('u');
    const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${good.split('.')[1]}.`;
    expect((await call('/api/debts/x', { headers: { Authorization: `Bearer ${unsigned}` } })).status).toBe(401);
    const confused = withHeader(good, { alg: 'HS256', typ: 'JWT', kid: 'test-key' });
    expect((await call('/api/debts/x', { headers: { Authorization: `Bearer ${confused}` } })).status).toBe(401);
  });

  it('rejects a token with a tampered subject', async () => {
    const [h, , s] = (await token('victim')).split('.');
    const forged = `${h}.${b64({ sub: 'someone_else', iss: 'https://clerk.test', azp: 'https://app.test', exp: Math.floor(Date.now() / 1000) + 300 })}.${s}`;
    expect((await call('/api/debts/x', { headers: { Authorization: `Bearer ${forged}` } })).status).toBe(401);
  });

  it('rejects a token with no subject', async () => {
    const key = await importJWK(JSON.parse(e.TEST_PRIVATE_JWK), 'RS256');
    const noSub = await new SignJWT({ azp: 'https://app.test' }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuer('https://clerk.test').setExpirationTime('5m').sign(key);
    expect((await call('/api/debts/x', { headers: { Authorization: `Bearer ${noSub}` } })).status).toBe(401);
  });
});

describe('response headers', () => {
  it('sends the security header set and no caching on every API response, errors included', async () => {
    for (const res of [await call('/api/v1/health'), await call('/api/debts/x'), await call('/api/nothing-here')]) {
      expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(res.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
      expect(res.headers.get('Permissions-Policy')).toContain('microphone=()');
      expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    }
  });

  it('health shows booleans and the allowed origin only', async () => {
    const body = (await (await call('/api/v1/health')).json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['auth', 'database', 'ok', 'origin', 'signupOpen', 'usageOk', 'worker']);
    expect(Object.values(body).filter((v) => typeof v !== 'boolean')).toEqual(['https://app.test']);
  });
});

/** The test environment with its own HOLDER_NAME. Defined directly so the shared bindings are never changed. */
const envWithHolder = (value: string) => Object.create(env, { HOLDER_NAME: { value, enumerable: true } });

describe('sign-up gate', () => {
  /** Calls the Worker as if it had been deployed without the holder's name. */
  const withoutHolder = async (path: string, as: string, init: RequestInit = {}) => {
    const closedEnv = envWithHolder('');
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${await token(as)}`);
    const ctx = createExecutionContext();
    const res = await worker.fetch(new Request(`https://api.test${path}`, { ...init, headers }), closedEnv, ctx);
    await waitOnExecutionContext(ctx);
    return res;
  };

  it('turns a brand-new person away with a clear 503 while no holder is named, and stores nothing for them', async () => {
    const res = await withoutHolder('/api/sync/pull?since=0', 'brand_new_closed');
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('SIGNUP_CLOSED');
    const stored = await e.DB.prepare("SELECT COUNT(*) AS n FROM identities WHERE subject = 'brand_new_closed'").first<{ n: number }>();
    expect(stored!.n).toBe(0);
  });

  it('keeps existing accounts working while sign-up is closed', async () => {
    await put('/api/debts/open1', debt, 'existing_person');
    const res = await withoutHolder('/api/debts/open1', 'existing_person');
    expect(res.status).toBe(200);
  });

  it('opens sign-up once a holder is named, and health says which state it is in', async () => {
    expect((await call('/api/sync/pull?since=0', { as: 'brand_new_open' })).status).toBe(200);
    const closed = (await (await worker.fetch(new Request('https://api.test/api/v1/health'), envWithHolder('  '), createExecutionContext())).json()) as { signupOpen: boolean };
    expect(closed.signupOpen).toBe(false);
  });
});
