import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { summarize, type SummaryEvent } from '../../src/summarize';

/** The admin page reads the old server's summary and the Worker's alike, so the two must agree to the number. */
const require = createRequire(import.meta.url);
const old = require(path.join(import.meta.dirname, '..', '..', '..', 'server', 'analytics', 'summarize.js')) as {
  summarize: (events: unknown[], window: { from: string; to: string }) => Record<string, unknown>;
};

const DAY = 86_400_000;
const start = Date.UTC(2026, 10, 1, 12);
const sessions = ['a', 'b', 'c', 'd', 'e', 'f'];
const NAMES = ['paywall_viewed', 'trial_started', 'checkout_opened', 'checkout_completed', 'experiment_exposure', 'routine_days', 'routine_limit', 'routine_created', 'routine_deleted', 'ad_impression', 'ad_click', 'task_completed'];

/** A deterministic mix of every kind of event the summary looks at, over three days. */
const sample: SummaryEvent[] = Array.from({ length: 400 }, (_, n) => {
  const name = NAMES[(n * 7) % NAMES.length];
  const props: Record<string, unknown> =
    name === 'experiment_exposure' ? { experiment: Math.floor(n / 12) % 2 ? 'routine_free_limit' : 'paywall_copy', variant: ['A', 'B', 'control'][Math.floor(n / 24) % 3] }
    : name === 'routine_days' ? { days: [1, 7, 28, 3][n % 4], variant: ['A', 'B'][n % 2] }
    : name === 'routine_limit' ? { step: ['reached', 'extra_given', 'see_pro'][n % 3], variant: ['A', 'B'][n % 2] }
    : name.startsWith('routine_') ? { variant: ['A', 'B'][n % 2] }
    : name.startsWith('ad_') ? { provider: 'house', placement: ['settings', 'tasks'][n % 2] }
    : {};
  return { name, sessionId: sessions[(n * 5) % sessions.length], signedIn: n % 4 === 0, props, receivedAt: start + (n % 3) * DAY + n * 1000 };
});

describe('the admin analytics summary', () => {
  it('is the same as the old server gave, for every section', () => {
    const window = { from: start - DAY, to: start + 4 * DAY };
    const worker = summarize(sample, window);
    const server = old.summarize(
      sample.map((event) => ({ ...event, receivedAt: new Date(event.receivedAt).toISOString() })),
      { from: new Date(window.from).toISOString(), to: new Date(window.to).toISOString() },
    );
    expect(worker).toEqual(server);
    expect(worker.funnel.some((step) => step.sessions > 0)).toBe(true);
    expect(worker.routineLimit.length).toBeGreaterThan(1);
    expect(worker.daily).toHaveLength(3);
  });

  it("counts only the routine test's own exposures in the routine groups", () => {
    const exposure = (experiment: string, sessionId: string): SummaryEvent => ({ name: 'experiment_exposure', sessionId, signedIn: false, props: { experiment, variant: 'A' }, receivedAt: start });
    const result = summarize([exposure('routine_free_limit', 'r1'), exposure('paywall_copy', 'p1'), exposure('paywall_copy', 'p2')], { from: start - DAY, to: start + DAY });
    expect(result.routineLimit.map((row) => [row.variant, row.exposed])).toEqual([['A', 1]]);
  });
});
