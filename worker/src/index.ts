import { Hono } from 'hono';
import { authenticate, AuthError, type AuthEnv } from './auth';
import { SCHEMAS, validateRecord } from './schemas';

type Env = AuthEnv & {
  DB: D1Database;
  CORS_ORIGINS?: string;
  MAX_RECORDS_PER_USER?: string;
};
type Vars = { userId: string };

const MAX_BODY_BYTES = 64 * 1024;
const MAX_PULL = 200;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Cache-Control', 'no-store');
  const origin = c.req.header('Origin');
  const allowed = (c.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  if (origin && allowed.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Vary', 'Origin');
  }
});

app.options('*', (c) => {
  c.header('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  c.header('Access-Control-Max-Age', '86400');
  return c.body(null, 204);
});

app.get('/api/health', async (c) => {
  try {
    await c.env.DB.prepare('SELECT 1').first();
    return c.json({ status: 'ok', database: 'd1', databaseReady: true, authConfigured: Boolean(c.env.CLERK_ISSUER) });
  } catch {
    return c.json({ status: 'degraded', database: 'd1', databaseReady: false, authConfigured: Boolean(c.env.CLERK_ISSUER) }, 503);
  }
});

app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/health') return next();
  c.set('userId', await authenticate(c.env, c.req.header('Authorization')));
  return next();
});

type Row = { id: string; entity: string; data: string; updatedAt: number; deleted: number };
const toRecord = (row: Row) => ({
  entity: row.entity,
  id: row.id,
  updatedAt: row.updatedAt,
  deleted: row.deleted === 1,
  ...(row.deleted === 1 ? {} : { data: JSON.parse(row.data) }),
});

/** Changes since a cursor. Reads only changed rows, so an idle device costs almost nothing. */
app.get('/api/sync/pull', async (c) => {
  const since = Number(c.req.query('since') ?? 0);
  const limit = Math.min(MAX_PULL, Math.max(1, Number(c.req.query('limit') ?? MAX_PULL)));
  if (!Number.isFinite(since) || since < 0) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'since must be >= 0' } }, 400);
  const { results } = await c.env.DB.prepare(
    'SELECT entity, id, data, updatedAt, deleted FROM records WHERE userId = ? AND updatedAt > ? ORDER BY updatedAt ASC LIMIT ?',
  )
    .bind(c.get('userId'), since, limit + 1)
    .all<Row>();
  const hasMore = results.length > limit;
  const page = results.slice(0, limit);
  return c.json({ records: page.map(toRecord), cursor: page.at(-1)?.updatedAt ?? since, hasMore });
});

/** Everything stored for the signed-in person, as JSON they can keep (data portability). */
app.get('/api/me/export', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT entity, id, data, updatedAt, deleted FROM records WHERE userId = ? AND deleted = 0 ORDER BY entity, updatedAt',
  )
    .bind(c.get('userId'))
    .all<Row>();
  return c.json({ exportedAt: Date.now(), records: results.map(toRecord) });
});

/** Erases every row for the signed-in person, tombstones included (right to erasure). */
app.delete('/api/me', async (c) => {
  await c.env.DB.prepare('DELETE FROM records WHERE userId = ?').bind(c.get('userId')).run();
  return c.body(null, 204);
});

const entityOr404 = (name: string) => (SCHEMAS[name] ? name : null);

app.get('/api/:entity', async (c) => {
  const entity = entityOr404(c.req.param('entity'));
  if (!entity) return c.json({ error: { code: 'NOT_FOUND', message: 'Unknown resource' } }, 404);
  const { results } = await c.env.DB.prepare(
    'SELECT entity, id, data, updatedAt, deleted FROM records WHERE userId = ? AND entity = ? AND deleted = 0 ORDER BY updatedAt DESC LIMIT 1000',
  )
    .bind(c.get('userId'), entity)
    .all<Row>();
  return c.json(results.map(toRecord));
});

app.get('/api/:entity/:id', async (c) => {
  const entity = entityOr404(c.req.param('entity'));
  if (!entity) return c.json({ error: { code: 'NOT_FOUND', message: 'Unknown resource' } }, 404);
  const row = await c.env.DB.prepare(
    'SELECT entity, id, data, updatedAt, deleted FROM records WHERE userId = ? AND entity = ? AND id = ? AND deleted = 0',
  )
    .bind(c.get('userId'), entity, c.req.param('id'))
    .first<Row>();
  return row ? c.json(toRecord(row)) : c.json({ error: { code: 'NOT_FOUND', message: 'Record not found' } }, 404);
});

const readJson = async (req: Request): Promise<Record<string, unknown> | null> => {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Idempotent upsert keyed by a client-chosen id, so a retried offline write never creates a duplicate.
 * If the server copy is newer than the client's `clientUpdatedAt`, answer 409 with the server copy and
 * let the app decide (last-write-wins with review, per AGENTS.md).
 */
app.put('/api/:entity/:id', async (c) => {
  const entity = entityOr404(c.req.param('entity'));
  const id = c.req.param('id');
  if (!entity) return c.json({ error: { code: 'NOT_FOUND', message: 'Unknown resource' } }, 404);
  if (!ID_PATTERN.test(id)) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'id must be 1-64 letters, digits, - or _' } }, 400);
  const body = await readJson(c.req.raw);
  if (!body) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Body must be a JSON object under 64 KB' } }, 400);
  const { data, errors } = validateRecord(SCHEMAS[entity], body);
  if (errors.length) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid record', details: errors } }, 400);

  const userId = c.get('userId');
  const existing = await c.env.DB.prepare('SELECT entity, id, data, updatedAt, deleted FROM records WHERE userId = ? AND entity = ? AND id = ?')
    .bind(userId, entity, id)
    .first<Row>();
  const clientUpdatedAt = Number(body.clientUpdatedAt);
  if (existing && existing.deleted === 0 && Number.isFinite(clientUpdatedAt) && existing.updatedAt > clientUpdatedAt) {
    return c.json({ error: { code: 'CONFLICT', message: 'Server copy is newer' }, current: toRecord(existing) }, 409);
  }
  if (!existing) {
    const cap = Number(c.env.MAX_RECORDS_PER_USER ?? 5000);
    const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM records WHERE userId = ? AND deleted = 0').bind(userId).first<{ n: number }>();
    if ((count?.n ?? 0) >= cap) return c.json({ error: { code: 'QUOTA_EXCEEDED', message: 'Record limit reached' } }, 413);
  }

  // Strictly increasing per record, so a pull cursor never skips a change made in the same millisecond.
  const updatedAt = Math.max(Date.now(), (existing?.updatedAt ?? 0) + 1);
  await c.env.DB.prepare(
    `INSERT INTO records (userId, entity, id, data, updatedAt, deleted) VALUES (?, ?, ?, ?, ?, 0)
     ON CONFLICT (userId, entity, id) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt, deleted = 0`,
  )
    .bind(userId, entity, id, JSON.stringify(data), updatedAt)
    .run();
  return c.json({ entity, id, data, updatedAt, deleted: false }, existing && existing.deleted === 0 ? 200 : 201);
});

app.delete('/api/:entity/:id', async (c) => {
  const entity = entityOr404(c.req.param('entity'));
  if (!entity) return c.json({ error: { code: 'NOT_FOUND', message: 'Unknown resource' } }, 404);
  const userId = c.get('userId');
  const existing = await c.env.DB.prepare('SELECT updatedAt, deleted FROM records WHERE userId = ? AND entity = ? AND id = ?')
    .bind(userId, entity, c.req.param('id'))
    .first<{ updatedAt: number; deleted: number }>();
  if (!existing || existing.deleted === 1) return c.body(null, 204);
  await c.env.DB.prepare("UPDATE records SET deleted = 1, data = '{}', updatedAt = ? WHERE userId = ? AND entity = ? AND id = ?")
    .bind(Math.max(Date.now(), existing.updatedAt + 1), userId, entity, c.req.param('id'))
    .run();
  return c.body(null, 204);
});

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404));
app.onError((error, c) => {
  if (error instanceof AuthError) return c.json({ error: { code: error.code, message: error.message } }, error.status as 401 | 503);
  console.error('Unhandled error', error instanceof Error ? error.message : 'unknown');
  return c.json({ error: { code: 'INTERNAL', message: 'Internal server error' } }, 500);
});

export default app;
