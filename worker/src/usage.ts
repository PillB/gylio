import type { MeteredDb } from './db';

export type UsageEnv = {
  USAGE_READ_LIMIT?: string;
  USAGE_WRITE_LIMIT?: string;
  USAGE_REQUEST_LIMIT?: string;
  USAGE_WARN_AT?: string;
  USAGE_SHED_AT?: string;
  USAGE_FLUSH_EVERY?: string;
  USAGE_CACHE_MS?: string;
};
export type UsageState = 'ok' | 'warn' | 'shed';
export type Totals = { reads: number; writes: number; requests: number };

/** Cloudflare Free allowances (docs read 27 Oct 2026): D1 5M rows read, 100k rows written; Workers 100k requests, per UTC day. */
const DEFAULT_LIMITS = { reads: 5_000_000, writes: 100_000, requests: 100_000 };
const MAX_FLUSH_AGE_MS = 60_000;

const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const today = (): string => new Date().toISOString().slice(0, 10);

// Module state lives per isolate. Counts that are not flushed yet are lost if the isolate is
// recycled, so the meter can under-count by at most (flush size - 1) requests per isolate.
let pending: Totals = { reads: 0, writes: 0, requests: 0 };
let lastFlush = Date.now();
let cache: { day: string; at: number; totals: Totals } | null = null;

export const resetUsageForTests = (): void => {
  pending = { reads: 0, writes: 0, requests: 0 };
  lastFlush = Date.now();
  cache = null;
};

const UPSERT = `INSERT INTO usage_day (day, reads, writes, requests) VALUES (?, ?, ?, ?)
  ON CONFLICT (day) DO UPDATE SET reads = reads + excluded.reads, writes = writes + excluded.writes, requests = requests + excluded.requests`;

/** Adds one request's cost; writes a batch to D1 every few requests (one row written per flush). */
export const recordUsage = (
  env: UsageEnv & { DB: D1Database },
  waitUntil: (p: Promise<unknown>) => void,
  cost: { reads: number; writes: number },
): void => {
  pending = { reads: pending.reads + cost.reads, writes: pending.writes + cost.writes, requests: pending.requests + 1 };
  const due = pending.requests >= num(env.USAGE_FLUSH_EVERY, 20) || Date.now() - lastFlush > MAX_FLUSH_AGE_MS;
  if (!due) return;
  const batch = pending;
  pending = { reads: 0, writes: 0, requests: 0 };
  lastFlush = Date.now();
  cache = null;
  waitUntil(
    env.DB.prepare(UPSERT)
      .bind(today(), batch.reads, batch.writes, batch.requests)
      .run()
      .catch(() => undefined),
  );
};

const readTotals = async (env: UsageEnv, db: MeteredDb): Promise<Totals> => {
  const ttl = num(env.USAGE_CACHE_MS, 30_000);
  const day = today();
  if (!cache || cache.day !== day || Date.now() - cache.at > ttl) {
    const row = await db.first<Totals>('SELECT reads, writes, requests FROM usage_day WHERE day = ?', day);
    cache = { day, at: Date.now(), totals: row ?? { reads: 0, writes: 0, requests: 0 } };
  }
  return cache.totals;
};

/** Highest fraction of any free allowance used today, counting what this isolate has not flushed yet. */
export const usageRatio = async (env: UsageEnv, db: MeteredDb): Promise<number> => {
  const stored = await readTotals(env, db);
  return Math.max(
    (stored.reads + pending.reads) / num(env.USAGE_READ_LIMIT, DEFAULT_LIMITS.reads),
    (stored.writes + pending.writes) / num(env.USAGE_WRITE_LIMIT, DEFAULT_LIMITS.writes),
    (stored.requests + pending.requests) / num(env.USAGE_REQUEST_LIMIT, DEFAULT_LIMITS.requests),
  );
};

export const usageState = async (env: UsageEnv, db: MeteredDb): Promise<UsageState> => {
  try {
    const ratio = await usageRatio(env, db);
    if (ratio >= num(env.USAGE_SHED_AT, 0.9)) return 'shed';
    return ratio >= num(env.USAGE_WARN_AT, 0.7) ? 'warn' : 'ok';
  } catch {
    // A broken meter must never take the app down; health reports it instead.
    return 'ok';
  }
};

/** Seconds until the allowance resets at 00:00 UTC, capped so a device re-checks within the hour. */
export const retryAfterSeconds = (now = new Date()): number => {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.min(3600, Math.max(60, Math.ceil((next - now.getTime()) / 1000)));
};
