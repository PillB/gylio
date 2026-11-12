import { Hono, type Context } from 'hono';
import { authenticate, AuthError, type AuthEnv } from './auth';
import { MeteredDb } from './db';
import { forgetIdentities, resolveUserId } from './identity';
import { ROWS_PER_INSERT, validateEvents, type StoredEvent } from './analytics';
import { KINDS, REPORTS_PER_DAY, STATUSES, toOwnReport, toReport, validateFeedback, validateTriage, type ReportRow } from './feedback';
import { summarize, type SummaryEvent } from './summarize';
import { readJson } from './readJson';
import { SCHEMAS, validateRecord } from './schemas';
import { API_CSP, SECURITY_HEADERS } from './securityHeaders';
import { analyticsAllowed, recordUsage, retryAfterSeconds, usageState, type UsageEnv } from './usage';

type Env = AuthEnv &
  UsageEnv & {
    DB: D1Database;
    CORS_ORIGINS?: string;
    MAX_RECORDS_PER_USER?: string;
    /** Who holds the personal data. Passed with `--var` at deploy from a private file; never committed. */
    HOLDER_NAME?: string;
    /** Sign-in subjects of the people who may open the admin console, comma-separated. Set at deploy; never committed. */
    ADMIN_SUBJECTS?: string;
  };
type Vars = { userId: string; subject: string; db: MeteredDb };

const MAX_PULL = 200;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const HEALTH_PATH = '/api/v1/health';
const signupOpen = (env: Env): boolean => Boolean(env.HOLDER_NAME?.trim());
const allowedOrigins = (env: Env): string[] => (env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

app.use('*', async (c, next) => {
  const db = new MeteredDb(c.env.DB);
  c.set('db', db);
  await next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) c.header(name, value);
  c.header('Content-Security-Policy', API_CSP);
  c.header('Cache-Control', 'no-store');
  const origin = c.req.header('Origin');
  if (origin && allowedOrigins(c.env).includes(origin)) {
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
  c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
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
    await db.first('SELECT 1 FROM analytics_events LIMIT 1');
    await db.first('SELECT 1 FROM feedback_reports LIMIT 1');
  } catch {
    databaseReady = false;
  }
  const usageOk = databaseReady && (await usageState(c.env, db)) !== 'shed';
  const authConfigured = Boolean(c.env.CLERK_ISSUER);
  const ok = databaseReady && authConfigured && usageOk;
  return c.json(
    { ok, worker: true, database: databaseReady, auth: authConfigured, usageOk, signupOpen: signupOpen(c.env), origin: (c.env.CORS_ORIGINS ?? '').split(',')[0]?.trim() ?? '' },
    ok ? 200 : 503,
  );
});

/**
 * Near a free-tier limit the Worker sheds sync with a clear 503 and Retry-After. The app keeps working
 * offline and retries later, so nothing is lost and nothing is hidden. Export and erasure stay open,
 * because a person's right to their data must not depend on our traffic.
 */
app.use('/api/*', async (c, next) => {
  if (c.req.path === HEALTH_PATH || c.req.path === '/api/me' || c.req.path.startsWith('/api/me/')) return next();
  const state = await usageState(c.env, c.get('db'));
  if (state === 'shed') {
    c.header('Retry-After', String(retryAfterSeconds()));
    c.header('Gylio-Usage', 'shed');
    return c.json({ error: { code: 'SYNC_PAUSED', message: 'Sync is paused for a while to stay inside the free daily limit. Your changes are saved on this device and will sync later.' } }, 503);
  }
  if (state === 'warn') c.header('Gylio-Usage', 'warn');
  return next();
});

const analyticsRow = (event: StoredEvent) => [event.eventId, event.name, event.sessionId, event.signedIn ? 1 : 0, JSON.stringify(event.props), event.receivedAt];

/**
 * Analytics from the app, from visitors and signed-in people alike: the events carry no identity, so no sign-in is
 * asked for. Only the app's own address may send them, and only while today's free allowance is mostly unused
 * (analyticsAllowed). When refused, the app keeps the events queued and sends them later.
 */
app.post('/api/analytics/events', async (c) => {
  if (!allowedOrigins(c.env).includes(c.req.header('Origin') ?? '')) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Analytics are accepted from the app only' } }, 403);
  }
  const db = c.get('db');
  if (!(await analyticsAllowed(c.env, db))) {
    c.header('Retry-After', String(retryAfterSeconds()));
    return c.json({ error: { code: 'ANALYTICS_PAUSED', message: 'Analytics are paused until the daily allowance resets' } }, 503);
  }
  const body = await readJson(c.req.raw);
  const checked = body ? validateEvents(body, Date.now()) : { error: 'Body must be a JSON object under 64 KB' };
  if ('error' in checked) return c.json({ error: { code: 'VALIDATION_ERROR', message: checked.error } }, 400);
  const statements: D1PreparedStatement[] = [];
  for (let start = 0; start < checked.events.length; start += ROWS_PER_INSERT) {
    const chunk = checked.events.slice(start, start + ROWS_PER_INSERT);
    statements.push(
      db.prepare(
        `INSERT OR IGNORE INTO analytics_events (eventId, name, sessionId, signedIn, props, receivedAt) VALUES ${chunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')}`,
        ...chunk.flatMap(analyticsRow),
      ),
    );
  }
  if (statements.length) await db.batch(statements);
  return c.json({ accepted: checked.events.length }, 202);
});

app.use('/api/*', async (c, next) => {
  if (c.req.path === HEALTH_PATH) return next();
  const identity = await authenticate(c.env, c.req.header('Authorization'));
  // Sign-up stays closed until the data holder is named in the deploy (and the privacy page names them).
  // People who already have an account keep working.
  const userId = await resolveUserId(c.get('db'), identity, { allowCreate: signupOpen(c.env) });
  if (!userId) throw new AuthError(503, 'SIGNUP_CLOSED', 'Sign-up is not open yet');
  c.set('userId', userId);
  c.set('subject', identity.subject);
  return next();
});

const DAY_MS = 24 * 60 * 60 * 1000;
const REPORT_COLUMNS = 'id, userId, kind, title, description, severity, stepsToReproduce, expected, actual, route, context, status, adminNote, createdAt, updatedAt';

/** A bug report, idea or question from the person signed in. */
app.post('/api/feedback', async (c) => {
  const body = await readJson(c.req.raw);
  const checked = body ? validateFeedback(body) : { errors: [{ field: 'body', message: 'Body must be a JSON object under 64 KB' }] };
  if ('errors' in checked) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid report', details: checked.errors } }, 400);
  const db = c.get('db');
  const userId = c.get('userId');
  const now = Date.now();
  const recent = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM feedback_reports WHERE userId = ? AND createdAt > ?', userId, now - DAY_MS);
  if ((recent?.n ?? 0) >= REPORTS_PER_DAY) {
    return c.json({ error: { code: 'RATE_LIMITED', message: `At most ${REPORTS_PER_DAY} reports a day` } }, 429);
  }
  const report = checked.value;
  const id = crypto.randomUUID();
  const row = await db.first<ReportRow>(
    `INSERT INTO feedback_reports (id, userId, kind, title, description, severity, stepsToReproduce, expected, actual, route, context, status, adminNote, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NULL, ?, ?) RETURNING ${REPORT_COLUMNS}`,
    id, userId, report.kind, report.title, report.description, report.severity, report.stepsToReproduce, report.expected, report.actual, report.route,
    JSON.stringify(report.context), now, now,
  );
  return c.json(toOwnReport(row!), 201);
});

/** The person's own reports with their triage status, so testers see progress. */
app.get('/api/feedback/mine', async (c) => {
  const rows = await c.get('db').all<ReportRow>(
    `SELECT ${REPORT_COLUMNS} FROM feedback_reports WHERE userId = ? ORDER BY createdAt DESC LIMIT 100`,
    c.get('userId'),
  );
  return c.json({ reports: rows.map(toOwnReport) });
});

/** Whether the person signed in is one of the sign-in subjects named in ADMIN_SUBJECTS. */
const isAdmin = (env: Env, subject: string) => (env.ADMIN_SUBJECTS ?? '').split(',').map((s) => s.trim()).filter(Boolean).includes(subject);

/** Whether to offer the admin console to the person signed in. Says nothing about anyone else. */
app.get('/api/me/admin', (c) => c.json({ admin: isAdmin(c.env, c.get('subject')) }));

/** The admin console: only for admins. Everyone else is told no, the same way. */
app.use('/api/admin/*', async (c, next) => {
  if (!isAdmin(c.env, c.get('subject'))) return c.json({ error: { code: 'FORBIDDEN', message: 'Admins only' } }, 403);
  return next();
});

const ANALYTICS_DAYS = [1, 7, 30, 90];
const MAX_SUMMARY_EVENTS = 50_000;

/** The analytics dashboard for the last 1, 7, 30 or 90 days. Reads at most 50,000 events (a 1% of the daily read allowance). */
app.get('/api/admin/analytics', async (c) => {
  const asked = Number(c.req.query('days'));
  const days = ANALYTICS_DAYS.includes(asked) ? asked : 30;
  const to = Date.now();
  const from = to - days * DAY_MS;
  const rows = await c.get('db').all<{ name: string; sessionId: string; signedIn: number; props: string; receivedAt: number }>(
    'SELECT name, sessionId, signedIn, props, receivedAt FROM analytics_events WHERE receivedAt >= ? AND receivedAt <= ? ORDER BY receivedAt LIMIT ?',
    from, to, MAX_SUMMARY_EVENTS,
  );
  const events: SummaryEvent[] = rows.map((row) => ({ ...row, signedIn: row.signedIn === 1, props: JSON.parse(row.props || '{}') }));
  return c.json({ days, truncated: events.length >= MAX_SUMMARY_EVENTS, ...summarize(events, { from, to }) });
});

/** Every report, newest first, optionally by status or kind. */
app.get('/api/admin/feedback', async (c) => {
  const status = c.req.query('status');
  const kind = c.req.query('kind');
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (status && (STATUSES as readonly string[]).includes(status)) {
    clauses.push('status = ?');
    params.push(status);
  }
  if (kind && (KINDS as readonly string[]).includes(kind)) {
    clauses.push('kind = ?');
    params.push(kind);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await c.get('db').all<ReportRow>(`SELECT ${REPORT_COLUMNS} FROM feedback_reports ${where} ORDER BY createdAt DESC LIMIT 500`, ...params);
  return c.json({ reports: rows.map((row) => toReport(row, { withOwner: true })) });
});

/** An admin sets a report's status, severity or note. */
app.patch('/api/admin/feedback/:id', async (c) => {
  const body = await readJson(c.req.raw);
  const checked = body ? validateTriage(body) : { errors: [{ field: 'body', message: 'Body must be a JSON object under 64 KB' }] };
  if ('errors' in checked) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid update', details: checked.errors } }, 400);
  const fields = Object.keys(checked.value) as (keyof typeof checked.value)[];
  const row = await c.get('db').first<ReportRow>(
    `UPDATE feedback_reports SET ${fields.map((field) => `${field} = ?`).join(', ')}, updatedAt = ? WHERE id = ? RETURNING ${REPORT_COLUMNS}`,
    ...fields.map((field) => checked.value[field] ?? null), Date.now(), c.req.param('id'),
  );
  return row ? c.json(toReport(row, { withOwner: true })) : c.json({ error: { code: 'NOT_FOUND', message: 'Report not found' } }, 404);
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
  // The reports they wrote, as they wrote them; an admin's note on a report is not theirs.
  const reports = await c.get('db').all<ReportRow>(`SELECT ${REPORT_COLUMNS} FROM feedback_reports WHERE userId = ? ORDER BY createdAt`, c.get('userId'));
  return c.json({ exportedAt: Date.now(), records: results.map(toRecord), reports: reports.map((row) => ({ ...toReport(row), adminNote: undefined })) });
});

/** Erases every row for the signed-in person, tombstones, counters, sign-in mapping and reports included (right to erasure). */
app.delete('/api/me', async (c) => {
  const userId = c.get('userId');
  await c.get('db').batch([
    c.get('db').prepare('DELETE FROM records WHERE userId = ?', userId),
    c.get('db').prepare('DELETE FROM user_seq WHERE userId = ?', userId),
    c.get('db').prepare('DELETE FROM identities WHERE userId = ?', userId),
    c.get('db').prepare('DELETE FROM feedback_reports WHERE userId = ?', userId),
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
