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

  it('reads the routine limit test per group: exposed sessions, the 7 to 28 day funnel, the limit and its guardrails', () => {
    const t = (name, sessionId, props) => ev(name, sessionId, props);
    const events = [
      t('experiment_exposure', 'a', { experiment: 'routine_free_limit', variant: 'three_plus_surprise' }),
      t('experiment_exposure', 'a', { experiment: 'routine_free_limit', variant: 'three_plus_surprise' }),
      t('experiment_exposure', 'b', { experiment: 'routine_free_limit', variant: 'three_plus_surprise' }),
      t('experiment_exposure', 'c', { experiment: 'routine_free_limit', variant: 'five' }),
      t('experiment_exposure', 'x', { experiment: 'trial_cta_copy', variant: 'five' }), // another test: not counted
      t('experiment_exposure', 'y', { experiment: 'trial_cta_copy', variant: 'start_trial' }), // nor given a row
      t('routine_days', 'a', { days: 1, variant: 'three_plus_surprise' }),
      t('routine_days', 'a', { days: 3, variant: 'three_plus_surprise' }),
      t('routine_days', 'a', { days: 7, variant: 'three_plus_surprise' }),
      t('routine_days', 'b', { days: 7, variant: 'three_plus_surprise' }),
      t('routine_days', 'b', { days: 28, variant: 'three_plus_surprise' }),
      t('routine_limit', 'a', { step: 'reached', variant: 'three_plus_surprise', limit: 3, used: 3 }),
      t('routine_limit', 'a', { step: 'reached', variant: 'three_plus_surprise', limit: 3, used: 3 }),
      t('routine_limit', 'a', { step: 'extra_given', variant: 'three_plus_surprise', days: 7 }),
      t('routine_limit', 'a', { step: 'see_pro', variant: 'three_plus_surprise', limit: 3 }),
      t('routine_created', 'a', { variant: 'three_plus_surprise', limit: 3, count: 1 }),
      t('routine_deleted', 'a', { variant: 'three_plus_surprise', limit: 3, count: 0 }),
      t('routine_created', 'c', { variant: 'five', limit: 5, count: 1 }),
      t('routine_completed', 'c', { routineId: 1 }), // no group: not counted
    ];
    expect(summarize(events, {}).routineLimit).toEqual([
      { variant: 'five', exposed: 1, reached1Day: 0, reached7Days: 0, reached28Days: 0, from7To28: 0, limitReachedSessions: 0, extraGiven: 0, seePro: 0, created: 1, deleted: 0 },
      { variant: 'three_plus_surprise', exposed: 2, reached1Day: 1, reached7Days: 2, reached28Days: 1, from7To28: 0.5, limitReachedSessions: 1, extraGiven: 1, seePro: 1, created: 1, deleted: 1 },
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
