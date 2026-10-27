import { Hono, type Context } from 'hono';
import { authenticate, AuthError, type AuthEnv } from './auth';
import { MeteredDb } from './db';
import { forgetIdentities, resolveUserId } from './identity';
import { SCHEMAS, validateRecord } from './schemas';
import { API_CSP, SECURITY_HEADERS } from './securityHeaders';
import { recordUsage, retryAfterSeconds, usageState, type UsageEnv } from './usage';

type Env = AuthEnv &
  UsageEnv & {
    DB: D1Database;
    CORS_ORIGINS?: string;
    MAX_RECORDS_PER_USER?: string;
  };
type Vars = { userId: string; db: MeteredDb };

const MAX_BODY_BYTES = 64 * 1024;
const MAX_PULL = 200;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const HEALTH_PATH = '/api/v1/health';

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

app.use('*', async (c, next) => {
  const db = new MeteredDb(c.env.DB);
  c.set('db', db);
  await next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) c.header(name, value);
  c.header('Content-Security-Policy', API_CSP);
  c.header('Cache-Control', 'no-store');
  const origin = c.req.header('Origin');
  const allowed = (c.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  if (origin && allowed.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Vary', 'Origin');
  }
  try {
    recordUsage(c.env, (p) => c.executionCtx.waitUntil(p), db);
  } catch {
    // Metering must never fail a request.
  }
});

app.options('*', (c) => {
  c.header('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  c.header('Access-Control-Max-Age', '86400');
  return c.body(null, 204);
});

/** Booleans and the allowed origin only: no versions, keys or counts. */
app.get(HEALTH_PATH, async (c) => {
  const db = c.get('db');
  let databaseReady = true;
  try {
    // Touch the real tables, not just the binding, so a missing migration reads as not ready.
    await db.first('SELECT 1 FROM records LIMIT 1');
    await db.first('SELECT 1 FROM identities LIMIT 1');
  } catch {
    databaseReady = false;
  }
  const usageOk = databaseReady && (await usageState(c.env, db)) !== 'shed';
  const authConfigured = Boolean(c.env.CLERK_ISSUER);
  const ok = databaseReady && authConfigured && usageOk;
  return c.json(
    { ok, worker: true, database: databaseReady, auth: authConfigured, usageOk, origin: (c.env.CORS_ORIGINS ?? '').split(',')[0]?.trim() ?? '' },
    ok ? 200 : 503,
  );
});

/**
 * Near a free-tier limit the Worker sheds sync with a clear 503 and Retry-After. The app keeps working
 * offline and retries later, so nothing is lost and nothing is hidden. Export and erasure stay open,
 * because a person's right to their data must not depend on our traffic.
 */
app.use('/api/*', async (c, next) => {
  if (c.req.path === HEALTH_PATH || c.req.path.startsWith('/api/me')) return next();
  const state = await usageState(c.env, c.get('db'));
  if (state === 'shed') {
    c.header('Retry-After', String(retryAfterSeconds()));
    c.header('Gylio-Usage', 'shed');
    return c.json({ error: { code: 'SYNC_PAUSED', message: 'Sync is paused for a while to stay inside the free daily limit. Your changes are saved on this device and will sync later.' } }, 503);
  }
  if (state === 'warn') c.header('Gylio-Usage', 'warn');
  return next();
});

app.use('/api/*', async (c, next) => {
  if (c.req.path === HEALTH_PATH) return next();
  const identity = await authenticate(c.env, c.req.header('Authorization'));
  c.set('userId', await resolveUserId(c.get('db'), identity));
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

/** Changes since a cursor. Seeks the (userId, seq) index and reads only changed rows, so an idle device costs almost nothing. */
app.get('/api/sync/pull', async (c) => {
  const since = Number(c.req.query('since') ?? 0);
  const limit = Math.min(MAX_PULL, Math.max(1, Number(c.req.query('limit') ?? MAX_PULL)));
  if (!Number.isFinite(since) || since < 0) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'since must be >= 0' } }, 400);
  const results = await c.get('db').all<Row>(
    `SELECT ${COLUMNS} FROM records WHERE userId = ? AND seq > ? ORDER BY seq ASC LIMIT ?`,
    c.get('userId'),
    since,
    limit + 1,
  );
  const hasMore = results.length > limit;
  const page = results.slice(0, limit);
  return c.json({ records: page.map(toRecord), cursor: page.at(-1)?.seq ?? since, hasMore });
});

/** Everything stored for the signed-in person, as JSON they can keep (data portability). */
app.get('/api/me/export', async (c) => {
  const results = await c.get('db').all<Row>(
    `SELECT ${COLUMNS} FROM records WHERE userId = ? AND deleted = 0 ORDER BY entity, seq`,
    c.get('userId'),
  );
  return c.json({ exportedAt: Date.now(), records: results.map(toRecord) });
});

/** Erases every row for the signed-in person, tombstones, counters and sign-in mapping included (right to erasure). */
app.delete('/api/me', async (c) => {
  const userId = c.get('userId');
  await c.get('db').batch([
    c.get('db').prepare('DELETE FROM records WHERE userId = ?', userId),
    c.get('db').prepare('DELETE FROM user_seq WHERE userId = ?', userId),
    c.get('db').prepare('DELETE FROM identities WHERE userId = ?', userId),
  ]);
  forgetIdentities(userId);
  return c.body(null, 204);
});

const entityOr404 = (name: string) => (SCHEMAS[name] ? name : null);

app.get('/api/:entity/:id', async (c) => {
  const entity = entityOr404(c.req.param('entity'));
  if (!entity) return c.json({ error: { code: 'NOT_FOUND', message: 'Unknown resource' } }, 404);
  const row = await c.get('db').first<Row>(
    `SELECT ${COLUMNS} FROM records WHERE userId = ? AND entity = ? AND id = ? AND deleted = 0`,
    c.get('userId'),
    entity,
    c.req.param('id'),
  );
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
const BUMP_SEQ = 'INSERT INTO user_seq (userId, seq, rows) VALUES (?, 1, 0) ON CONFLICT (userId) DO UPDATE SET seq = seq + 1';
const NEXT_SEQ = '(SELECT seq FROM user_seq WHERE userId = ?)';
// changes() is the row count of the statement just before, so the stored-record counter follows the table in the same transaction.
const ADD_CHANGES = 'UPDATE user_seq SET rows = rows + changes() WHERE userId = ? AND changes() > 0';
const SUBTRACT_CHANGES = 'UPDATE user_seq SET rows = rows - changes() WHERE userId = ? AND changes() > 0';

const currentRow = (db: MeteredDb, userId: string, entity: string, id: string) =>
  db.first<Row>(`SELECT ${COLUMNS} FROM records WHERE userId = ? AND entity = ? AND id = ?`, userId, entity, id);

const storedCount = async (db: MeteredDb, userId: string): Promise<number> =>
  (await db.first<{ rows: number }>('SELECT rows FROM user_seq WHERE userId = ?', userId))?.rows ?? 0;

/** True when a new record may be stored. At the cap, expired tombstones are purged first to make room. */
const hasRoom = async (db: MeteredDb, userId: string, cap: number, now: number): Promise<boolean> => {
  if ((await storedCount(db, userId)) < cap) return true;
  await db.batch([
    db.prepare('DELETE FROM records WHERE userId = ? AND deleted = 1 AND updatedAt < ?', userId, now - TOMBSTONE_RETENTION_MS),
    db.prepare(SUBTRACT_CHANGES, userId),
  ]);
  return (await storedCount(db, userId)) < cap;
};

const conflict = (c: Context<{ Bindings: Env; Variables: Vars }>, current: Row | null) =>
  c.json({ error: { code: 'CONFLICT', message: 'Server copy changed since your version' }, current: current ? toRecord(current) : null }, 409);

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
  const db = c.get('db');
  const now = Date.now();
  const json = JSON.stringify(data);

  // Read first: a retry, a no-op edit or a stale write is answered with no write at all. Writes are the
  // scarcest free-tier allowance (100,000 rows a day against 5,000,000 reads), so one cheap read is worth it.
  const current = await currentRow(db, userId, entity, id);
  if (current) {
    // An exact retry of a write that already landed (response lost, device retried) is a success, not a conflict.
    if (current.deleted === 0 && current.data === json) return c.json(toRecord(current), 200);
    if (current.version !== baseVersion) return conflict(c, current);
  } else if (baseVersion !== 0) {
    return conflict(c, null);
  }
  if (!current && !(await hasRoom(db, userId, Number(c.env.MAX_RECORDS_PER_USER ?? 5000), now))) {
    return c.json({ error: { code: 'QUOTA_EXCEEDED', message: 'Record limit reached' } }, 413);
  }

  const write = current
    ? db.prepare(
        `UPDATE records SET data = ?, updatedAt = ?, deleted = 0, version = version + 1, seq = ${NEXT_SEQ}
         WHERE userId = ? AND entity = ? AND id = ? AND version = ? RETURNING ${COLUMNS}`,
        json, now, userId, userId, entity, id, baseVersion,
      )
    : db.prepare(
        `INSERT INTO records (userId, entity, id, data, updatedAt, deleted, version, seq) VALUES (?, ?, ?, ?, ?, 0, 1, ${NEXT_SEQ})
         ON CONFLICT (userId, entity, id) DO NOTHING RETURNING ${COLUMNS}`,
        userId, entity, id, json, now, userId,
      );
  // One batch is one transaction: the sequence bump, the guarded write and the counter succeed or fail together.
  // The guard in the write itself still decides a true race between two devices.
  const statements = [db.prepare(BUMP_SEQ, userId), write];
  if (!current) statements.push(db.prepare(ADD_CHANGES, userId));
  const [, result] = await db.batch(statements);
  const saved = (result.results as Row[])[0];
  if (!saved) return conflict(c, await currentRow(db, userId, entity, id));
  return c.json(toRecord(saved), current ? 200 : 201);
});

app.delete('/api/:entity/:id', async (c) => {
  const entity = entityOr404(c.req.param('entity'));
  if (!entity) return c.json({ error: { code: 'NOT_FOUND', message: 'Unknown resource' } }, 404);
  const userId = c.get('userId');
  const db = c.get('db');
  await db.batch([
    db.prepare(BUMP_SEQ, userId),
    db.prepare(
      `UPDATE records SET deleted = 1, data = '{}', updatedAt = ?, version = version + 1, seq = ${NEXT_SEQ}
       WHERE userId = ? AND entity = ? AND id = ? AND deleted = 0`,
      Date.now(), userId, userId, entity, c.req.param('id'),
    ),
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
