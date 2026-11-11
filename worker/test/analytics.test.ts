import { SELF } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { importJWK, SignJWT } from 'jose';
import { afterEach, describe, expect, it } from 'vitest';

const e = env as unknown as { TEST_PRIVATE_JWK: string; DB: D1Database };
const APP = 'https://app.test';

const send = (body: unknown, origin: string | null = APP, headers: Record<string, string> = {}) =>
  SELF.fetch('https://api.test/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const event = (n: number, extra: object = {}) => ({ id: `event-${String(n).padStart(4, '0')}`, name: 'task_completed', sessionId: 's-1', signedIn: false, props: { withSubtasks: true }, ...extra });
const stored = async () =>
  (await e.DB.prepare('SELECT eventId, name, sessionId, signedIn, props, receivedAt FROM analytics_events ORDER BY eventId').all<{ eventId: string; name: string; sessionId: string; signedIn: number; props: string; receivedAt: number }>()).results;
const seedUsage = (writes: number) =>
  e.DB.prepare('INSERT INTO usage_day (day, reads, writes, requests) VALUES (?, 0, ?, 0) ON CONFLICT (day) DO UPDATE SET writes = excluded.writes')
    .bind(new Date().toISOString().slice(0, 10), writes)
    .run();

afterEach(async () => {
  await e.DB.exec('DELETE FROM analytics_events');
  await e.DB.exec('DELETE FROM usage_day');
});

describe('analytics from the app', () => {
  it('are stored without anyone signing in, with no identity and with the Worker clock', async () => {
    const before = Date.now();
    const res = await send({ events: [event(1, { signedIn: true, props: { taskId: 42, ok: true, label: 'x'.repeat(300) } })] });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ accepted: 1 });
    const [row] = await stored();
    expect(row).toMatchObject({ eventId: 'event-0001', name: 'task_completed', sessionId: 's-1', signedIn: 1 });
    expect(JSON.parse(row.props)).toEqual({ taskId: 42, ok: true, label: 'x'.repeat(100) });
    expect(row.receivedAt).toBeGreaterThanOrEqual(before);
    const columns = (await e.DB.prepare('PRAGMA table_info(analytics_events)').all<{ name: string }>()).results.map((c) => c.name);
    expect(columns).not.toContain('userId');
  });

  it('store a full batch of 50, and a batch sent again only once', async () => {
    const batch = { events: Array.from({ length: 50 }, (_, n) => event(n)) };
    expect((await send(batch)).status).toBe(202);
    expect((await send(batch)).status).toBe(202);
    const rows = await stored();
    expect(rows).toHaveLength(50);
    // Sent by a visitor: stored as not signed in.
    expect(new Set(rows.map((row) => row.signedIn))).toEqual(new Set([0]));
  });

  it('skip events that are not usable and drop properties that are not plain values', async () => {
    const res = await send({
      events: [
        event(1, { props: { nested: { a: 1 }, 'bad key': 1, list: [1], fine: 'yes', nan: Number.NaN } }),
        event(2, { name: 'Has Spaces' }),
        event(3, { sessionId: '' }),
        'not an event',
        event(4, { id: 'short' }),
      ],
    });
    expect(await res.json()).toEqual({ accepted: 2 });
    const rows = await stored();
    expect(rows.map((row) => JSON.parse(row.props))).toEqual(expect.arrayContaining([{ fine: 'yes' }]));
    // An id the app did not shape properly is replaced, so the event still counts once.
    expect(rows.map((row) => row.eventId).filter((id) => id.startsWith('srv-'))).toHaveLength(1);
  });

  it('refuse a request that is not a list of at most 50 events, storing nothing', async () => {
    for (const body of [{ events: Array.from({ length: 51 }, (_, n) => event(n)) }, { events: 'x' }, {}, 'not json', '[]']) {
      expect((await send(body)).status).toBe(400);
    }
    expect(await stored()).toEqual([]);
  });

  it('are refused from any other address, or with none', async () => {
    expect((await send({ events: [event(1)] }, 'https://evil.test')).status).toBe(403);
    expect((await send({ events: [event(1)] }, null)).status).toBe(403);
    expect(await stored()).toEqual([]);
  });

  it('pause at half of the daily allowance, while sync carries on', async () => {
    await seedUsage(50_000);
    const res = await send({ events: [event(1)] });
    expect(res.status).toBe(503);
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThanOrEqual(60);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('ANALYTICS_PAUSED');
    expect(await stored()).toEqual([]);

    const token = await new SignJWT({ azp: APP })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setSubject('analytics_sync_user')
      .setIssuer('https://clerk.test')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(await importJWK(JSON.parse(e.TEST_PRIVATE_JWK), 'RS256'));
    const pull = await SELF.fetch('https://api.test/api/sync/pull?since=0', { headers: { Authorization: `Bearer ${token}` } });
    expect(pull.status).toBe(200);
  });

  it('are taken just under that line', async () => {
    await seedUsage(49_000);
    expect((await send({ events: [event(1)] })).status).toBe(202);
  });

  it('let a browser ask first, from the app', async () => {
    const res = await SELF.fetch('https://api.test/api/analytics/events', { method: 'OPTIONS', headers: { Origin: APP, 'Access-Control-Request-Method': 'POST' } });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(APP);
  });
});

describe('health', () => {
  it('reports the database not ready when the analytics table is missing', async () => {
    await e.DB.exec('ALTER TABLE analytics_events RENAME TO analytics_hidden');
    try {
      const res = await SELF.fetch('https://api.test/api/v1/health');
      expect(res.status).toBe(503);
      expect(await res.json()).toMatchObject({ database: false });
    } finally {
      await e.DB.exec('ALTER TABLE analytics_hidden RENAME TO analytics_events');
    }
  });
});
