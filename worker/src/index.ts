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
  const authConfigured = Boolean(c.env.CLERK_ISSUER);
  try {
    // Touch the real table, not just the binding, so a missing migration reads as not ready.
    await c.env.DB.prepare('SELECT 1 FROM records LIMIT 1').first();
    return c.json({ status: 'ok', database: 'd1', databaseReady: true, authConfigured });
  } catch {
    return c.json({ status: 'degraded', database: 'd1', databaseReady: false, authConfigured }, 503);
  }
});

app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/health') return next();
  c.set('userId', await authenticate(c.env, c.req.header('Authorization')));
  return next();
});

type Row = { id: string; entity: string; data: string; updatedAt: number; deleted: number; version: number; seq: number };
const COLUMNS = 'entity, id, data, updatedAt, deleted, version, seq';
const toRecord = (row: Row) => ({
  entity: row.entity,
  id: row.id,
  updatedAt: row.updatedAt,
  version: row.version,
  seq: row.seq,
  deleted: row.deleted === 1,
  ...(row.deleted === 1 ? {} : { data: JSON.parse(row.data) }),
});

/** Changes since a cursor. Reads only changed rows, so an idle device costs almost nothing. */
app.get('/api/sync/pull', async (c) => {
  const since = Number(c.req.query('since') ?? 0);
  const limit = Math.min(MAX_PULL, Math.max(1, Number(c.req.query('limit') ?? MAX_PULL)));
  if (!Number.isFinite(since) || since < 0) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'since must be >= 0' } }, 400);
  const { results } = await c.env.DB.prepare(
    `SELECT ${COLUMNS} FROM records WHERE userId = ? AND seq > ? ORDER BY seq ASC LIMIT ?`,
  )
    .bind(c.get('userId'), since, limit + 1)
    .all<Row>();
  const hasMore = results.length > limit;
  const page = results.slice(0, limit);
  return c.json({ records: page.map(toRecord), cursor: page.at(-1)?.seq ?? since, hasMore });
});

/** Everything stored for the signed-in person, as JSON they can keep (data portability). */
app.get('/api/me/export', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT ${COLUMNS} FROM records WHERE userId = ? AND deleted = 0 ORDER BY entity, seq`,
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
    `SELECT ${COLUMNS} FROM records WHERE userId = ? AND entity = ? AND deleted = 0 ORDER BY seq DESC LIMIT 1000`,
  )
    .bind(c.get('userId'), entity)
    .all<Row>();
  return c.json(results.map(toRecord));
});

app.get('/api/:entity/:id', async (c) => {
  const entity = entityOr404(c.req.param('entity'));
  if (!entity) return c.json({ error: { code: 'NOT_FOUND', message: 'Unknown resource' } }, 404);
  const row = await c.env.DB.prepare(
    `SELECT ${COLUMNS} FROM records WHERE userId = ? AND entity = ? AND id = ? AND deleted = 0`,
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

const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const BUMP_SEQ = 'INSERT INTO user_seq (userId, seq) VALUES (?, 1) ON CONFLICT (userId) DO UPDATE SET seq = seq + 1';
const NEXT_SEQ = '(SELECT seq FROM user_seq WHERE userId = ?)';

const currentRow = (db: D1Database, userId: string, entity: string, id: string) =>
  db.prepare(`SELECT ${COLUMNS} FROM records WHERE userId = ? AND entity = ? AND id = ?`).bind(userId, entity, id).first<Row>();

/**
 * Versioned upsert keyed by a client-chosen id, so a retried offline write never duplicates.
 * The body names the `baseVersion` the device last saw (0 or absent for a new record). The version
 * check is part of the write itself, so two devices racing from the same base cannot both win:
 * the loser gets 409 with the current record (a tombstone included) and the app decides.
 */
app.put('/api/:entity/:id', async (c) => {
  const entity = entityOr404(c.req.param('entity'));
  const id = c.req.param('id');
  if (!entity) return c.json({ error: { code: 'NOT_FOUND', message: 'Unknown resource' } }, 404);
  if (!ID_PATTERN.test(id)) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'id must be 1-64 letters, digits, - or _' } }, 400);
  const body = await readJson(c.req.raw);
  if (!body) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Body must be a JSON object under 64 KB' } }, 400);
  const baseVersion = body.baseVersion === undefined ? 0 : body.baseVersion;
  if (!Number.isInteger(baseVersion) || (baseVersion as number) < 0) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'baseVersion must be a whole number >= 0' } }, 400);
  }
  const { data, errors } = validateRecord(SCHEMAS[entity], body);
  if (errors.length) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid record', details: errors } }, 400);

  const userId = c.get('userId');
  const db = c.env.DB;
  const now = Date.now();
  const json = JSON.stringify(data);

  if (baseVersion === 0) {
    // Old tombstones are dropped here so they cannot pile up; everything still stored counts toward the cap.
    await db.prepare('DELETE FROM records WHERE userId = ? AND deleted = 1 AND updatedAt < ?').bind(userId, now - TOMBSTONE_RETENTION_MS).run();
    const count = await db.prepare('SELECT COUNT(*) AS n FROM records WHERE userId = ?').bind(userId).first<{ n: number }>();
    if ((count?.n ?? 0) >= Number(c.env.MAX_RECORDS_PER_USER ?? 5000)) {
      const already = await currentRow(db, userId, entity, id);
      if (!already) return c.json({ error: { code: 'QUOTA_EXCEEDED', message: 'Record limit reached' } }, 413);
    }
  }

  const write =
    baseVersion === 0
      ? db
          .prepare(
            `INSERT INTO records (userId, entity, id, data, updatedAt, deleted, version, seq) VALUES (?, ?, ?, ?, ?, 0, 1, ${NEXT_SEQ})
             ON CONFLICT (userId, entity, id) DO NOTHING`,
          )
          .bind(userId, entity, id, json, now, userId)
      : db
          .prepare(
            `UPDATE records SET data = ?, updatedAt = ?, deleted = 0, version = version + 1, seq = ${NEXT_SEQ}
             WHERE userId = ? AND entity = ? AND id = ? AND version = ?`,
          )
          .bind(json, now, userId, userId, entity, id, baseVersion);
  // One batch is one transaction: the sequence bump and the guarded write succeed or fail together.
  const [, result] = await db.batch([db.prepare(BUMP_SEQ).bind(userId), write]);
  if (result.meta.changes === 0) {
    const current = await currentRow(db, userId, entity, id);
    // An exact retry of a write that already landed (response lost, device retried) is a success, not a conflict.
    if (current && current.deleted === 0 && current.data === json) return c.json(toRecord(current), 200);
    return c.json({ error: { code: 'CONFLICT', message: 'Server copy changed since your version' }, current: current ? toRecord(current) : null }, 409);
  }
  const saved = await currentRow(db, userId, entity, id);
  return c.json(saved ? toRecord(saved) : { entity, id }, baseVersion === 0 ? 201 : 200);
});

app.delete('/api/:entity/:id', async (c) => {
  const entity = entityOr404(c.req.param('entity'));
  if (!entity) return c.json({ error: { code: 'NOT_FOUND', message: 'Unknown resource' } }, 404);
  const userId = c.get('userId');
  const db = c.env.DB;
  await db.batch([
    db.prepare(BUMP_SEQ).bind(userId),
    db
      .prepare(
        `UPDATE records SET deleted = 1, data = '{}', updatedAt = ?, version = version + 1, seq = ${NEXT_SEQ}
         WHERE userId = ? AND entity = ? AND id = ? AND deleted = 0`,
      )
      .bind(Date.now(), userId, userId, entity, c.req.param('id')),
  ]);
  return c.body(null, 204);
});

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404));
app.onError((error, c) => {
  if (error instanceof AuthError) return c.json({ error: { code: error.code, message: error.message } }, error.status as 401 | 503);
  console.error('Unhandled error', error instanceof Error ? error.message : 'unknown');
  return c.json({ error: { code: 'INTERNAL', message: 'Internal server error' } }, 500);
});

export default app;
