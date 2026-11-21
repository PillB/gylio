import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Runs the enclosing `describe` with the process in one IANA time zone and the clock at one instant, then puts both back.
 *
 * Why: a date written as `toISOString().slice(0, 10)` or read back with `new Date('YYYY-MM-DDT00:00:00')` is right in
 * the zone the author lives in and a day off in others. A test that only runs where its author works cannot see that.
 * Peru (UTC-5) and the far east (UTC+14) are the two ends the product has to hold.
 *
 * Node re-reads `process.env.TZ` on assignment; vitest's default `forks` pool gives each file its own process, so the
 * change cannot leak into another test file. If vitest is ever moved to `threads`, `assertZoneApplied` fails loudly
 * instead of letting a test pass in the wrong zone.
 */
export function useZoneAndClock(timeZone: string, nowIso: string): void {
  let previous: string | undefined;
  beforeEach(() => {
    previous = process.env.TZ;
    process.env.TZ = timeZone;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(nowIso));
    assertZoneApplied(timeZone, nowIso);
  });
  afterEach(() => {
    vi.useRealTimers();
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  });
}

/** Fails with the zone, the instant and what the runtime reports, so a misconfigured pool is named, not guessed at. */
export function assertZoneApplied(timeZone: string, nowIso: string): void {
  const seen = new Intl.DateTimeFormat('en-CA', { timeZone: undefined, dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' })
    .format(new Date(nowIso));
  const wanted = new Intl.DateTimeFormat('en-CA', { timeZone, dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' })
    .format(new Date(nowIso));
  if (seen !== wanted) {
    throw new Error(
      `Time zone did not apply: wanted ${timeZone} (${wanted}) but the runtime reads ${seen} for ${nowIso}. ` +
        'Tests that depend on a zone need vitest\'s "forks" pool (the default), where process.env.TZ can change.',
    );
  }
}
