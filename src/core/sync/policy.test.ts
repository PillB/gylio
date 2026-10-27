import { describe, expect, it } from 'vitest';
import { backoffMs, classify, classifyNetworkFailure, parseRetryAfterMs, serverWaitUntil, SYNC_LIMITS, type ClassifyInput, type Clock } from './policy';

const NOW = Date.UTC(2026, 9, 27, 12, 0, 0);
const at = (random: number): Clock => ({ nowMs: NOW, random: () => random });
const answer = (status: number, extra: Partial<ClassifyInput> = {}): ClassifyInput => ({ status, retryAfter: null, usage: null, body: null, ...extra });
const err = (code: string, message = '') => ({ error: { code, message } });

describe('Retry-After', () => {
  it('reads whole seconds', () => expect(parseRetryAfterMs('120', NOW)).toBe(120_000));
  it('reads an HTTP date as the time left until then', () => {
    expect(parseRetryAfterMs(new Date(NOW + 90_000).toUTCString(), NOW)).toBe(90_000);
  });
  it('treats a date in the past as zero, not a negative wait', () => {
    expect(parseRetryAfterMs(new Date(NOW - 5_000).toUTCString(), NOW)).toBe(0);
  });
  it.each([[null], [''], ['soon'], ['-5'], ['1.5']])('ignores %s', (value) => expect(parseRetryAfterMs(value, NOW)).toBeNull());
});

describe('waits the server asked for', () => {
  it('never retries sooner than the floor, so Retry-After: 0 cannot spin', () => {
    expect(serverWaitUntil(0, at(0)) - NOW).toBe(SYNC_LIMITS.minPauseMs);
  });
  it('does not trust a wait longer than the ceiling', () => {
    expect(serverWaitUntil(10 * 24 * 3600_000, at(0)) - NOW).toBe(SYNC_LIMITS.maxPauseMs);
  });
  it('spreads the return so devices do not all come back in the same second', () => {
    const early = serverWaitUntil(3_600_000, at(0));
    const late = serverWaitUntil(3_600_000, at(0.999));
    expect(late - early).toBeGreaterThan(4 * 60_000);
    expect(late - early).toBeLessThanOrEqual(SYNC_LIMITS.resumeSpreadCapMs);
  });
  it('spreads a short wait only a little', () => {
    expect(serverWaitUntil(60_000, at(0.999)) - NOW).toBeLessThanOrEqual(60_000 + 12_000);
  });
});

describe('backoff after failures we cannot explain', () => {
  it('grows with each failure, between half and the whole of the step', () => {
    const steps = [1, 2, 3, 4].map((n) => [backoffMs(n, () => 0), backoffMs(n, () => 0.9999)]);
    expect(steps[0][0]).toBe(7_500);
    expect(steps[0][1]).toBeLessThanOrEqual(15_000);
    for (let i = 1; i < steps.length; i += 1) expect(steps[i][0]).toBeGreaterThan(steps[i - 1][0]);
  });
  it('stops growing at the cap', () => {
    expect(backoffMs(40, () => 0.9999)).toBeLessThanOrEqual(SYNC_LIMITS.backoffCapMs);
    expect(backoffMs(40, () => 0)).toBe(SYNC_LIMITS.backoffCapMs / 2);
  });
  it('differs between devices for the same failure count', () => {
    expect(backoffMs(3, () => 0.1)).not.toBe(backoffMs(3, () => 0.8));
  });
});

describe('what each answer from the Worker means', () => {
  const verdict = (input: ClassifyInput, failures = 0, random = 0) => classify(input, at(random), failures);

  it.each([[200], [201], [204]])('%s is success', (status) => expect(verdict(answer(status)).kind).toBe('ok'));

  it('503 SYNC_PAUSED pauses for what the server named and is not counted as a failure', () => {
    const v = verdict(answer(503, { retryAfter: '1800', usage: 'shed', body: err('SYNC_PAUSED') }), 5);
    expect(v).toMatchObject({ kind: 'pause', reason: 'paused', failure: false });
    expect((v as { retryAt: number }).retryAt - NOW).toBe(1_800_000);
  });

  it('503 SYNC_PAUSED without a header still pauses, for the longest allowed wait', () => {
    const v = verdict(answer(503, { body: err('SYNC_PAUSED') }));
    expect((v as { retryAt: number }).retryAt - NOW).toBe(SYNC_LIMITS.maxPauseMs);
  });

  it('a shed header alone is enough, even if the body cannot be read', () => {
    expect(verdict(answer(503, { usage: 'shed', retryAfter: '600' }))).toMatchObject({ kind: 'pause', reason: 'paused', failure: false });
  });

  it('503 SIGNUP_CLOSED is its own state, not a pause', () => {
    expect(verdict(answer(503, { body: err('SIGNUP_CLOSED') }))).toEqual({ kind: 'closed' });
  });

  it('a bare 503 from the platform is a failure we cannot explain and backs off', () => {
    const first = verdict(answer(503), 0) as { retryAt: number; failure: boolean };
    const later = verdict(answer(503), 4) as { retryAt: number };
    expect(first.failure).toBe(true);
    expect(later.retryAt).toBeGreaterThan(first.retryAt);
  });

  it('an unexplained 503 with Retry-After waits at least that long', () => {
    const v = verdict(answer(503, { retryAfter: '900' }), 0) as { retryAt: number };
    expect(v.retryAt - NOW).toBeGreaterThanOrEqual(900_000);
  });

  it('429 waits for Retry-After, or a minute when none is given, and is not counted as a failure', () => {
    expect((verdict(answer(429, { retryAfter: '10' })) as { retryAt: number }).retryAt - NOW).toBe(SYNC_LIMITS.minPauseMs);
    expect(verdict(answer(429))).toMatchObject({ kind: 'pause', reason: 'rate-limited', failure: false });
  });

  it.each([[500], [502], [504], [403], [418]])('%s backs off and keeps the changes', (status) => {
    expect(verdict(answer(status))).toMatchObject({ kind: 'pause', reason: 'server-error', failure: true });
  });

  it.each([[404], [405], [410]])('%s means site and API are out of step: wait an hour, discard nothing', (status) => {
    const v = verdict(answer(status, { body: err('NOT_FOUND', 'Route not found') })) as { retryAt: number; kind: string };
    expect(v.kind).toBe('pause');
    expect(v.retryAt - NOW).toBeGreaterThanOrEqual(SYNC_LIMITS.mismatchWaitMs);
  });

  it.each([[400, 'VALIDATION_ERROR'], [413, 'QUOTA_EXCEEDED'], [422, '']])('%s refuses that one change for good', (status, code) => {
    expect(verdict(answer(status, { body: err(code, 'nope') }))).toMatchObject({ kind: 'reject', message: 'nope' });
  });

  it('401 asks for a fresh token, and knows when it was only expired', () => {
    expect(verdict(answer(401, { body: err('TOKEN_EXPIRED') }))).toEqual({ kind: 'unauthorized', expired: true });
    expect(verdict(answer(401, { body: err('UNAUTHORIZED') }))).toEqual({ kind: 'unauthorized', expired: false });
  });

  it('409 hands back the server copy, or null when the server has none', () => {
    const current = { entity: 'tasks', id: 'a', version: 3, updatedAt: 1, seq: 9, deleted: false, data: { title: 'x' } };
    expect(verdict(answer(409, { body: { ...err('CONFLICT'), current } }))).toEqual({ kind: 'conflict', current });
    expect(verdict(answer(409, { body: { ...err('CONFLICT'), current: null } }))).toEqual({ kind: 'conflict', current: null });
  });

  it('survives a body that is not JSON, an array, or a string', () => {
    for (const body of [null, undefined, 'oops', [], 42, { error: 'text' }]) {
      expect(() => verdict(answer(500, { body }))).not.toThrow();
      expect(verdict(answer(400, { body })).kind).toBe('reject');
    }
  });
});

describe('no answer at all', () => {
  it('is treated as offline and backs off', () => {
    const v = classifyNetworkFailure(at(0.5), 2);
    expect(v).toMatchObject({ kind: 'pause', reason: 'offline', failure: true });
    expect((v as { retryAt: number }).retryAt).toBeGreaterThan(NOW);
  });
});
