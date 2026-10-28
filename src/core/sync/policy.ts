import type { RemoteRecord } from './types';

/**
 * Every number the retry behaviour depends on, in one place. They are reasoned defaults, not measured
 * ones (see docs/sync-resilience.md); tests pin the behaviour, not the exact values.
 */
export const SYNC_LIMITS = {
  /** Never retry sooner than this after the server asked us to wait, so `Retry-After: 0` cannot spin. */
  minPauseMs: 30_000,
  /** The Worker never asks for more than an hour; a larger value from anywhere else is not trusted. */
  maxPauseMs: 60 * 60_000,
  /** First retry after a failure we cannot explain (network, server error). */
  backoffBaseMs: 15_000,
  backoffCapMs: 15 * 60_000,
  /** Added after a wait the server named, so thousands of devices do not return in the same second at 00:00 UTC. */
  resumeSpreadCapMs: 5 * 60_000,
  resumeSpreadShare: 0.2,
  /** A route that does not exist means the site and API are out of step; look again hourly, never discard. */
  mismatchWaitMs: 60 * 60_000,
  /** Sign-up closed: look again rarely. A closed sign-up changes when the owner deploys, not by the minute. */
  closedRecheckMs: 6 * 60 * 60_000,
} as const;

export type PauseReason = 'offline' | 'paused' | 'rate-limited' | 'server-error';

export type Verdict =
  | { kind: 'ok' }
  | { kind: 'conflict'; current: RemoteRecord | null }
  | { kind: 'reject'; code: string; message: string }
  | { kind: 'unauthorized'; expired: boolean }
  | { kind: 'closed' }
  /** `failure` is true when we do not know why it failed, so repeated failures should slow us down. */
  | { kind: 'pause'; reason: PauseReason; retryAt: number; failure: boolean };

export type ClassifyInput = {
  status: number;
  retryAfter: string | null;
  usage: string | null;
  body: unknown;
};

export type Clock = { nowMs: number; random: () => number };

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

const HTTP_DATE = /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/;

/**
 * `Retry-After` is either whole seconds or an HTTP date (RFC 9110, the fixed-length form servers send).
 * Anything else is ignored; `Date.parse` alone would happily read "-5" or "1.5" as a year.
 */
export const parseRetryAfterMs = (value: string | null, nowMs: number): number | null => {
  const text = value?.trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number(text) * 1000;
  const date = HTTP_DATE.test(text) ? Date.parse(text) : Number.NaN;
  return Number.isNaN(date) ? null : Math.max(0, date - nowMs);
};

/** Waits that grow with each failure, between half and the whole of the step, so devices do not move in lockstep. */
export const backoffMs = (failures: number, random: () => number): number => {
  const step = Math.min(SYNC_LIMITS.backoffCapMs, SYNC_LIMITS.backoffBaseMs * 2 ** Math.max(0, failures - 1));
  return Math.round(step / 2 + random() * (step / 2));
};

/** A wait the server asked for, kept within sane bounds, plus a spread so the return is not a stampede. */
export const serverWaitUntil = (waitMs: number, { nowMs, random }: Clock): number => {
  const wait = clamp(waitMs, SYNC_LIMITS.minPauseMs, SYNC_LIMITS.maxPauseMs);
  const spread = random() * Math.min(SYNC_LIMITS.resumeSpreadCapMs, wait * SYNC_LIMITS.resumeSpreadShare);
  return nowMs + wait + Math.round(spread);
};

export const backoffUntil = (failures: number, { nowMs, random }: Clock): number => nowMs + backoffMs(failures, random);

type ErrorBody = { error?: { code?: unknown; message?: unknown }; current?: unknown };

const errorOf = (body: unknown): { code: string; message: string; current: RemoteRecord | null } => {
  const parsed = (body && typeof body === 'object' ? body : {}) as ErrorBody;
  const code = typeof parsed.error?.code === 'string' ? parsed.error.code : '';
  const message = typeof parsed.error?.message === 'string' ? parsed.error.message : '';
  const current = parsed.current && typeof parsed.current === 'object' ? (parsed.current as RemoteRecord) : null;
  return { code, message, current };
};

const unexplained = (input: ClassifyInput, clock: Clock, failures: number, reason: PauseReason): Verdict => {
  const named = parseRetryAfterMs(input.retryAfter, clock.nowMs);
  const retryAt = Math.max(backoffUntil(failures + 1, clock), named === null ? 0 : serverWaitUntil(named, clock));
  return { kind: 'pause', reason, retryAt, failure: true };
};

const explainedPause = (input: ClassifyInput, clock: Clock, reason: PauseReason, fallbackMs: number): Verdict => {
  const named = parseRetryAfterMs(input.retryAfter, clock.nowMs);
  return { kind: 'pause', reason, retryAt: serverWaitUntil(named ?? fallbackMs, clock), failure: false };
};

const REFUSED_FOR_GOOD = new Set([400, 413, 422]);
const ROUTE_MISMATCH = new Set([404, 405, 410]);

type Context = { input: ClassifyInput; clock: Clock; code: string; message: string; current: RemoteRecord | null };
type Rule = (ctx: Context) => Verdict | null;

// Ordered: the first rule that recognises the answer decides. Anything none of them knows is treated as
// a failure we cannot explain, which backs off and keeps the changes.
const RULES: Rule[] = [
  ({ input, current }) => (input.status === 409 ? { kind: 'conflict', current } : null),
  ({ input, code }) => (input.status === 401 ? { kind: 'unauthorized', expired: code === 'TOKEN_EXPIRED' } : null),
  ({ input, code }) => (input.status === 503 && code === 'SIGNUP_CLOSED' ? { kind: 'closed' } : null),
  ({ input, clock, code }) =>
    input.status === 503 && (code === 'SYNC_PAUSED' || input.usage === 'shed')
      ? explainedPause(input, clock, 'paused', SYNC_LIMITS.maxPauseMs)
      : null,
  ({ input, clock }) => (input.status === 429 ? explainedPause(input, clock, 'rate-limited', SYNC_LIMITS.minPauseMs * 2) : null),
  ({ input, code, message }) =>
    REFUSED_FOR_GOOD.has(input.status)
      ? { kind: 'reject', code: code || `HTTP_${input.status}`, message: message || 'The server refused this change' }
      : null,
  ({ input, clock }) =>
    ROUTE_MISMATCH.has(input.status)
      ? { kind: 'pause', reason: 'server-error', retryAt: serverWaitUntil(SYNC_LIMITS.mismatchWaitMs, clock), failure: true }
      : null,
];

const isSuccess = (status: number) => status >= 200 && status < 300;

/** Turns one answer from the Worker into the single thing the engine should do next. */
export const classify = (input: ClassifyInput, clock: Clock, failures: number): Verdict => {
  if (isSuccess(input.status)) return { kind: 'ok' };
  const ctx: Context = { input, clock, ...errorOf(input.body) };
  for (const rule of RULES) {
    const verdict = rule(ctx);
    if (verdict) return verdict;
  }
  return unexplained(input, clock, failures, 'server-error');
};

/** The request never got an answer: no network, a dropped connection, a timeout. */
export const classifyNetworkFailure = (clock: Clock, failures: number): Verdict => ({
  kind: 'pause',
  reason: 'offline',
  retryAt: backoffUntil(failures + 1, clock),
  failure: true,
});
