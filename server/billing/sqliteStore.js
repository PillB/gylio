/**
 * sqliteStore.js — billing, gift and feedback persistence for local/dev SQLite.
 *
 * Same contract as mongoStore.js; `storeContract.test.js` runs one suite
 * against both so the two can never drift apart silently.
 */

'use strict';

const { run, get, all } = require('../lib/sqlite');

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS billing_accounts (
    userId TEXT PRIMARY KEY,
    email TEXT,
    trialStartedAt TEXT,
    trialEndsAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS billing_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    provider TEXT NOT NULL,
    providerRef TEXT NOT NULL,
    status TEXT NOT NULL,
    interval TEXT,
    currency TEXT,
    amountMinor INTEGER,
    currentPeriodEnd TEXT,
    cancelAtPeriodEnd INTEGER NOT NULL DEFAULT 0,
    customerRef TEXT,
    manageUrl TEXT,
    providerUpdatedAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    UNIQUE (provider, providerRef)
  );`,
  'CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user ON billing_subscriptions(userId);',
  `CREATE TABLE IF NOT EXISTS billing_gifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    email TEXT,
    startsAt TEXT NOT NULL,
    endsAt TEXT,
    reason TEXT NOT NULL,
    note TEXT,
    grantedBy TEXT NOT NULL,
    grantedAt TEXT NOT NULL,
    revokedAt TEXT,
    revokedBy TEXT,
    claimedAt TEXT
  );`,
  'CREATE INDEX IF NOT EXISTS idx_billing_gifts_user ON billing_gifts(userId);',
  'CREATE INDEX IF NOT EXISTS idx_billing_gifts_email ON billing_gifts(email);',
  `CREATE TABLE IF NOT EXISTS billing_webhook_events (
    provider TEXT NOT NULL,
    eventId TEXT NOT NULL,
    receivedAt TEXT NOT NULL,
    PRIMARY KEY (provider, eventId)
  );`,
  `CREATE TABLE IF NOT EXISTS feedback_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    stepsToReproduce TEXT,
    expected TEXT,
    actual TEXT,
    severity TEXT,
    route TEXT,
    context TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'new',
    adminNote TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,
  'CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_reports(status, createdAt);',
];

const SUBSCRIPTION_FIELDS = [
  'userId', 'status', 'interval', 'currency', 'amountMinor', 'currentPeriodEnd',
  'cancelAtPeriodEnd', 'customerRef', 'manageUrl', 'providerUpdatedAt',
];

const FEEDBACK_PATCH_FIELDS = ['status', 'adminNote', 'severity'];

const toId = (row) => (row ? { ...row, id: String(row.id) } : null);

const parseSubscription = (row) =>
  row ? { ...toId(row), cancelAtPeriodEnd: Boolean(row.cancelAtPeriodEnd) } : null;

const parseFeedback = (row) => {
  if (!row) return null;
  let context = {};
  try { context = JSON.parse(row.context || '{}'); } catch (_e) { context = {}; }
  return { ...toId(row), context };
};

const numericId = (id) => {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
};

function createSqliteStore(db) {
  const store = {
    kind: 'sqlite',

    async init() {
      for (const statement of SCHEMA) {
        await run(db, statement);
      }
    },

    getAccount: (userId) => get(db, 'SELECT * FROM billing_accounts WHERE userId = ?', [userId]),

    async ensureAccount(userId, { email = null, now }) {
      await run(
        db,
        `INSERT INTO billing_accounts (userId, email, createdAt, updatedAt) VALUES (?, ?, ?, ?)
         ON CONFLICT(userId) DO UPDATE SET email = COALESCE(excluded.email, billing_accounts.email)`,
        [userId, email, now, now]
      );
      return store.getAccount(userId);
    },

    /** Atomic: returns the account only if this call is the one that started the trial. */
    async startTrial(userId, { startedAt, endsAt }) {
      await store.ensureAccount(userId, { now: startedAt });
      const result = await run(
        db,
        `UPDATE billing_accounts SET trialStartedAt = ?, trialEndsAt = ?, updatedAt = ?
         WHERE userId = ? AND trialStartedAt IS NULL`,
        [startedAt, endsAt, startedAt, userId]
      );
      return result.changes === 1 ? store.getAccount(userId) : null;
    },

    listActiveTrialAccounts: (now) =>
      all(db, 'SELECT * FROM billing_accounts WHERE trialEndsAt > ? ORDER BY trialEndsAt', [now]),

    async listSubscriptions(userId) {
      const rows = await all(db, 'SELECT * FROM billing_subscriptions WHERE userId = ? ORDER BY createdAt', [userId]);
      return rows.map(parseSubscription);
    },

    async listAllSubscriptions() {
      const rows = await all(db, 'SELECT * FROM billing_subscriptions ORDER BY updatedAt DESC');
      return rows.map(parseSubscription);
    },

    async getSubscriptionByRef(provider, providerRef) {
      const row = await get(
        db,
        'SELECT * FROM billing_subscriptions WHERE provider = ? AND providerRef = ?',
        [provider, providerRef]
      );
      return parseSubscription(row);
    },

    /**
     * Insert or update by (provider, providerRef). An event older than the one
     * already applied is ignored, so out-of-order webhooks cannot resurrect a
     * cancelled subscription. Returns { applied, subscription }.
     */
    async upsertSubscription(record, { now }) {
      const existing = await store.getSubscriptionByRef(record.provider, record.providerRef);
      if (existing && isStale(record, existing)) return { applied: false, subscription: existing };

      const values = SUBSCRIPTION_FIELDS.map((field) => normalizeSubscriptionValue(field, record[field]));
      if (existing) {
        const assignments = SUBSCRIPTION_FIELDS.map((field) => `${field} = ?`).join(', ');
        await run(db, `UPDATE billing_subscriptions SET ${assignments}, updatedAt = ? WHERE id = ?`, [
          ...values, now, Number(existing.id),
        ]);
      } else {
        const columns = ['provider', 'providerRef', ...SUBSCRIPTION_FIELDS, 'createdAt', 'updatedAt'];
        await run(
          db,
          `INSERT INTO billing_subscriptions (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
          [record.provider, record.providerRef, ...values, now, now]
        );
      }
      return { applied: true, subscription: await store.getSubscriptionByRef(record.provider, record.providerRef) };
    },

    async listGifts({ userId } = {}) {
      const rows = userId
        ? await all(db, 'SELECT * FROM billing_gifts WHERE userId = ? ORDER BY startsAt', [userId])
        : await all(db, 'SELECT * FROM billing_gifts ORDER BY grantedAt DESC');
      return rows.map(toId);
    },

    async getGift(id) {
      const n = numericId(id);
      return n ? toId(await get(db, 'SELECT * FROM billing_gifts WHERE id = ?', [n])) : null;
    },

    async createGift(gift) {
      const result = await run(
        db,
        `INSERT INTO billing_gifts (userId, email, startsAt, endsAt, reason, note, grantedBy, grantedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [gift.userId || null, gift.email || null, gift.startsAt, gift.endsAt ?? null, gift.reason,
          gift.note || null, gift.grantedBy, gift.grantedAt]
      );
      return store.getGift(result.lastID);
    },

    /** Returns the revoked gift, or null if it does not exist or was already revoked. */
    async revokeGift(id, { revokedAt, revokedBy }) {
      const n = numericId(id);
      if (!n) return null;
      const result = await run(
        db,
        'UPDATE billing_gifts SET revokedAt = ?, revokedBy = ? WHERE id = ? AND revokedAt IS NULL',
        [revokedAt, revokedBy, n]
      );
      return result.changes === 1 ? store.getGift(n) : null;
    },

    async hasUnclaimedGifts() {
      const row = await get(db, 'SELECT 1 AS found FROM billing_gifts WHERE userId IS NULL AND revokedAt IS NULL LIMIT 1');
      return Boolean(row);
    },

    /** Attach email-addressed gifts to the account that has proven it owns that email. */
    async claimGiftsByEmail(emails, userId, { now }) {
      const normalized = [...new Set(emails.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
      if (!normalized.length) return 0;
      const placeholders = normalized.map(() => '?').join(', ');
      const result = await run(
        db,
        `UPDATE billing_gifts SET userId = ?, claimedAt = ? WHERE userId IS NULL AND email IN (${placeholders})`,
        [userId, now, ...normalized]
      );
      return result.changes;
    },

    /** True the first time an event is seen; false for a duplicate delivery. */
    async recordWebhookEvent(provider, eventId, { now }) {
      const result = await run(
        db,
        'INSERT OR IGNORE INTO billing_webhook_events (provider, eventId, receivedAt) VALUES (?, ?, ?)',
        [provider, String(eventId), now]
      );
      return result.changes === 1;
    },

    async hasWebhookEvent(provider, eventId) {
      const row = await get(
        db,
        'SELECT 1 AS found FROM billing_webhook_events WHERE provider = ? AND eventId = ?',
        [provider, String(eventId)]
      );
      return Boolean(row);
    },

    async createFeedback(report) {
      const result = await run(
        db,
        `INSERT INTO feedback_reports (userId, kind, title, description, stepsToReproduce, expected, actual,
          severity, route, context, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
        [report.userId || null, report.kind, report.title, report.description, report.stepsToReproduce || null,
          report.expected || null, report.actual || null, report.severity || null, report.route || null,
          JSON.stringify(report.context || {}), report.createdAt, report.createdAt]
      );
      return store.getFeedback(result.lastID);
    },

    async getFeedback(id) {
      const n = numericId(id);
      return n ? parseFeedback(await get(db, 'SELECT * FROM feedback_reports WHERE id = ?', [n])) : null;
    },

    async listFeedback({ status, kind, userId, limit = 200 } = {}) {
      const clauses = [];
      const params = [];
      if (status) { clauses.push('status = ?'); params.push(status); }
      if (kind) { clauses.push('kind = ?'); params.push(kind); }
      if (userId) { clauses.push('userId = ?'); params.push(userId); }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const rows = await all(
        db,
        `SELECT * FROM feedback_reports ${where} ORDER BY createdAt DESC, id DESC LIMIT ?`,
        [...params, Math.min(Math.max(1, limit), 500)]
      );
      return rows.map(parseFeedback);
    },

    async updateFeedback(id, patch, { now }) {
      const n = numericId(id);
      if (!n) return null;
      const fields = FEEDBACK_PATCH_FIELDS.filter((field) => patch[field] !== undefined);
      if (!fields.length) return store.getFeedback(n);
      const assignments = fields.map((field) => `${field} = ?`).join(', ');
      await run(db, `UPDATE feedback_reports SET ${assignments}, updatedAt = ? WHERE id = ?`, [
        ...fields.map((field) => patch[field]), now, n,
      ]);
      return store.getFeedback(n);
    },
  };
  return store;
}

function isStale(incoming, existing) {
  if (!incoming.providerUpdatedAt || !existing.providerUpdatedAt) return false;
  return Date.parse(incoming.providerUpdatedAt) < Date.parse(existing.providerUpdatedAt);
}

function normalizeSubscriptionValue(field, value) {
  if (field === 'cancelAtPeriodEnd') return value ? 1 : 0;
  return value === undefined ? null : value;
}

module.exports = { createSqliteStore, isStale };
