import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  computeEntitlement,
  planGiftWindow,
  isTrialEligible,
} = require('./entitlements');

// Calendar anchors: every expected value below is written out by hand from the
// calendar, not derived from the implementation's own arithmetic.
const NOW = '2026-10-01T12:00:00.000Z';

describe('computeEntitlement', () => {
  it('is free with no records, and a new account may start a trial', () => {
    const result = computeEntitlement({ now: NOW });
    expect(result.plan).toBe('free');
    expect(result.source).toBeNull();
    expect(result.trial.eligible).toBe(true);
  });

  it('grants Pro during a trial and stops at the exact end instant', () => {
    const account = { trialStartedAt: '2026-09-28T12:00:00.000Z', trialEndsAt: '2026-10-05T12:00:00.000Z' };
    expect(computeEntitlement({ account, now: NOW })).toMatchObject({
      plan: 'pro', source: 'trial', expiresAt: '2026-10-05T12:00:00.000Z',
    });
    expect(computeEntitlement({ account, now: '2026-10-05T12:00:00.000Z' }).plan).toBe('free');
    expect(computeEntitlement({ account, now: NOW }).trial.eligible).toBe(false);
  });

  it('keeps a cancelled subscription until the paid period ends, then drops it', () => {
    const sub = { provider: 'paddle', status: 'cancelled', currentPeriodEnd: '2026-10-10T00:00:00.000Z' };
    const during = computeEntitlement({ subscriptions: [sub], now: NOW });
    expect(during).toMatchObject({ plan: 'pro', source: 'subscription', renews: false });
    expect(during.subscription.cancelAtPeriodEnd).toBe(true);
    expect(computeEntitlement({ subscriptions: [sub], now: '2026-10-10T00:00:01.000Z' }).plan).toBe('free');
  });

  it('gives a past-due subscription three days of grace, not more', () => {
    const sub = { provider: 'mercadopago', status: 'past_due', currentPeriodEnd: '2026-09-29T00:00:00.000Z' };
    // 29 Sep + 3 days = 2 Oct 00:00; NOW (1 Oct noon) is inside it.
    expect(computeEntitlement({ subscriptions: [sub], now: NOW }).expiresAt).toBe('2026-10-02T00:00:00.000Z');
    expect(computeEntitlement({ subscriptions: [sub], now: '2026-10-02T00:00:00.000Z' }).plan).toBe('free');
  });

  it('never grants Pro for refunded, expired or paused subscriptions', () => {
    for (const status of ['refunded', 'expired', 'paused', 'pending']) {
      const sub = { provider: 'paddle', status, currentPeriodEnd: '2027-01-01T00:00:00.000Z' };
      expect(computeEntitlement({ subscriptions: [sub], now: NOW }).plan, status).toBe('free');
    }
  });

  it('treats an indefinite gift as Pro with no expiry, until it is revoked', () => {
    const gift = { startsAt: '2026-09-01T00:00:00.000Z', endsAt: null };
    expect(computeEntitlement({ gifts: [gift], now: NOW })).toMatchObject({
      plan: 'pro', source: 'gift', expiresAt: null,
    });
    const revoked = { ...gift, revokedAt: '2026-09-30T00:00:00.000Z' };
    expect(computeEntitlement({ gifts: [revoked], now: NOW }).plan).toBe('free');
  });

  it('does not start a future-dated gift early', () => {
    const gift = { startsAt: '2026-11-01T00:00:00.000Z', endsAt: '2026-12-01T00:00:00.000Z' };
    expect(computeEntitlement({ gifts: [gift], now: NOW }).plan).toBe('free');
  });

  it('shows the subscription first when a payer also holds a gift, but expires at the later end', () => {
    const sub = { provider: 'paddle', status: 'active', currentPeriodEnd: '2026-10-15T00:00:00.000Z' };
    const gift = { startsAt: '2026-09-01T00:00:00.000Z', endsAt: '2026-12-31T00:00:00.000Z' };
    const result = computeEntitlement({ subscriptions: [sub], gifts: [gift], now: NOW });
    expect(result.source).toBe('subscription');
    expect(result.renews).toBe(true);
    expect(result.expiresAt).toBe('2026-12-31T00:00:00.000Z');
    expect(Object.keys(result.sources).sort()).toEqual(['gift', 'subscription']);
  });

  it('rejects an invalid clock instead of guessing', () => {
    expect(() => computeEntitlement({ now: 'not a date' })).toThrow(TypeError);
  });
});

describe('isTrialEligible', () => {
  it('refuses a trial to anyone who has ever had a subscription, even an expired one', () => {
    expect(isTrialEligible(null, [{ status: 'expired' }])).toBe(false);
  });
});

describe('planGiftWindow', () => {
  it('stacks a second one-month gift after the first instead of overlapping it', () => {
    const first = planGiftWindow({ days: 30, now: NOW });
    expect(first).toEqual({ startsAt: NOW, endsAt: '2026-10-31T12:00:00.000Z' });

    const second = planGiftWindow({ existingGifts: [first], days: 30, now: NOW });
    expect(second).toEqual({ startsAt: '2026-10-31T12:00:00.000Z', endsAt: '2026-11-30T12:00:00.000Z' });
  });

  it('ignores revoked gifts when stacking', () => {
    const revoked = { startsAt: NOW, endsAt: '2027-01-01T00:00:00.000Z', revokedAt: NOW };
    expect(planGiftWindow({ existingGifts: [revoked], days: 7, now: NOW }).startsAt).toBe(NOW);
  });

  it('makes an indefinite gift start now with no end', () => {
    expect(planGiftWindow({ days: null, now: NOW })).toEqual({ startsAt: NOW, endsAt: null });
  });

  it('rejects zero, fractional and absurd lengths', () => {
    for (const days of [0, 1.5, -3, 10_000]) {
      expect(() => planGiftWindow({ days, now: NOW }), String(days)).toThrow(RangeError);
    }
  });
});
