import { describe, expect, it } from 'vitest';
import { FREE_FEATURES, PRO_FEATURES, resolvePlan } from './useSubscription';

describe('resolvePlan', () => {
  it('trusts the server entitlement over stale Clerk metadata', () => {
    expect(resolvePlan('u', 'free', 'user_subscription')).toBe('free_user');
    expect(resolvePlan('u', 'pro', undefined)).toBe('user_subscription');
  });
  it('falls back to metadata only when the server has not answered', () => {
    expect(resolvePlan('u', undefined, 'user_subscription')).toBe('user_subscription');
  });
  it('is always free when signed out', () => {
    expect(resolvePlan(null, 'pro', 'user_subscription')).toBe('free_user');
  });
});

describe('Free vs Pro split', () => {
  it('keeps the daily loop free and puts ads-free, AI and sync in Pro', () => {
    for (const f of ['tasks', 'calendar', 'budget', 'rewards'] as const) expect(FREE_FEATURES.has(f)).toBe(true);
    for (const f of ['ad_free', 'ai_suggestions', 'sync', 'routines', 'social'] as const) {
      expect(FREE_FEATURES.has(f)).toBe(false);
      expect(PRO_FEATURES.has(f)).toBe(true);
    }
  });
});
