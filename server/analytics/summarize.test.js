import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { summarize } = require('./summarize');
const { validateEvents } = require('./validateEvents');

const ev = (name, sessionId, props = {}, receivedAt = '2026-10-01T10:00:00.000Z') => ({ name, sessionId, props, signedIn: true, receivedAt });

describe('summarize', () => {
  it('counts a funnel step only for sessions that did every earlier step', () => {
    const events = [
      ev('paywall_viewed', 'a'), ev('trial_started', 'a'), ev('checkout_opened', 'a'),
      ev('paywall_viewed', 'b'), ev('trial_started', 'b'),
      ev('trial_started', 'c'), // never saw the paywall: must not count
    ];
    expect(summarize(events, {}).funnel).toEqual([
      { step: 'paywall_viewed', sessions: 2 },
      { step: 'trial_started', sessions: 2 },
      { step: 'checkout_opened', sessions: 1 },
      { step: 'checkout_completed', sessions: 0 },
    ]);
  });

  it('reports A/B results by exposed session, not by raw event count', () => {
    const events = [
      ev('experiment_exposure', 'a', { experiment: 'trial_cta_copy', variant: 'start_trial' }),
      ev('experiment_exposure', 'a', { experiment: 'trial_cta_copy', variant: 'start_trial' }),
      ev('experiment_exposure', 'b', { experiment: 'trial_cta_copy', variant: 'start_trial' }),
      ev('experiment_exposure', 'c', { experiment: 'trial_cta_copy', variant: 'try_free_no_card' }),
      ev('trial_started', 'a'),
    ];
    expect(summarize(events, {}).experiments).toEqual([
      { experiment: 'trial_cta_copy', variant: 'start_trial', exposed: 2, trials: 1, checkouts: 0, trialRate: 0.5 },
      { experiment: 'trial_cta_copy', variant: 'try_free_no_card', exposed: 1, trials: 0, checkouts: 0, trialRate: 0 },
    ]);
  });

  it('computes ad click-through per provider and placement, and daily totals', () => {
    const events = [
      ev('ad_impression', 'a', { provider: 'house', placement: 'settings' }),
      ev('ad_impression', 'b', { provider: 'house', placement: 'settings' }),
      ev('ad_click', 'b', { provider: 'house', placement: 'settings' }, '2026-10-02T09:00:00.000Z'),
    ];
    const s = summarize(events, {});
    expect(s.ads).toEqual([{ provider: 'house', placement: 'settings', impressions: 2, clicks: 1, ctr: 0.5 }]);
    expect(s.daily).toEqual([{ day: '2026-10-01', events: 2, sessions: 2 }, { day: '2026-10-02', events: 1, sessions: 1 }]);
  });
});

describe('validateEvents', () => {
  const now = new Date('2026-10-01T10:00:00.000Z');
  it('keeps the client event id and the signed-in flag captured when the event happened', () => {
    const { events } = validateEvents({ events: [
      { id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', name: 'trial_started', sessionId: 's1', signedIn: true },
      { name: 'app_open', sessionId: 's1' },
    ] }, { now, signedIn: false });
    expect(events[0]).toMatchObject({ eventId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', signedIn: true });
    // No id from an older client: the server makes one, so it is still stored once.
    expect(events[1].eventId).toMatch(/^srv-/);
    expect(events[1].signedIn).toBe(false);
  });

  it('keeps only identifier names, drops nested or long values and unknown fields', () => {
    const { events } = validateEvents({ events: [
      { name: 'paywall_viewed', sessionId: 's1', props: { interval: 'yearly', nested: { a: 1 }, email: 'x'.repeat(500), 'bad key': 1, n: Infinity } },
      { name: 'DROP TABLE', sessionId: 's1' },
      { name: 'ok_event', sessionId: 'not a session!' },
    ] }, { now, signedIn: false });
    expect(events).toEqual([{
      eventId: expect.stringMatching(/^srv-/),
      name: 'paywall_viewed', sessionId: 's1', signedIn: false, receivedAt: now.toISOString(),
      props: { interval: 'yearly', email: 'x'.repeat(100) },
    }]);
  });
  it('refuses oversized batches', () => {
    expect(validateEvents({ events: Array(51).fill({ name: 'a_b', sessionId: 's' }) }, { now, signedIn: false }).error).toMatch(/at most 50/);
  });
});
