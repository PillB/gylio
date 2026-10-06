import { describe, expect, it } from 'vitest';
import { trialReminder } from './TrialBanner';
import type { Entitlement } from './billingApi';

const now = Date.parse('2026-10-06T12:00:00Z');
const base: Entitlement = { plan: 'pro', source: 'trial', expiresAt: '2026-10-08T12:00:00Z', renews: false, trial: { eligible: false, endsAt: '2026-10-08T12:00:00Z' }, subscription: null };

describe('trialReminder', () => {
  it('warns two days before a trial ends, not earlier', () => {
    expect(trialReminder(base, now)).toEqual({ kind: 'ending', days: 2 });
    expect(trialReminder(base, now - 86_400_000)).toBeNull();
  });

  it('never nags a renewing subscriber or a gifted tester', () => {
    expect(trialReminder({ ...base, source: 'subscription', renews: true }, now)).toBeNull();
    expect(trialReminder({ ...base, source: 'gift' }, now)).toBeNull();
  });

  it('says once, for a week, that a trial ended', () => {
    const ended: Entitlement = { ...base, plan: 'free', source: null, expiresAt: null };
    expect(trialReminder(ended, Date.parse('2026-10-09T12:00:00Z'))).toEqual({ kind: 'ended', days: 0 });
    expect(trialReminder(ended, Date.parse('2026-10-20T12:00:00Z'))).toBeNull();
  });
});
