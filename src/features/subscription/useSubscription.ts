/**
 * useSubscription
 *
 * What the current person can use. Pro comes from the server's entitlement
 * (trial, gift, subscription or pass — see server/billing/entitlements.js).
 * When the API is unreachable and nothing is cached, the older Clerk
 * publicMetadata.plan flag is honoured so existing test accounts keep working.
 *
 * Free vs Pro follows the competitor/benchmark research in
 * docs/billing/PRO_VS_FREE.md: the daily loop (tasks, calendar, budget,
 * rewards, and saving to your account) stays free; depth, AI and an ad-free app are Pro.
 */
import { useAppAuth } from '../../core/context/AuthContext';
import { useEntitlement } from '../billing/EntitlementContext';

export type PlanKey = 'free_user' | 'user_subscription';

export type FeatureKey =
  | 'tasks'
  | 'calendar'
  | 'budget'
  | 'rewards'
  | 'social'
  | 'routines'
  | 'ai_suggestions'
  | 'ai_unlimited'
  | 'sync'
  | 'ad_free';

// Saving to your account and using it on other devices is free: losing data is never a paywall.
export const FREE_FEATURES: ReadonlySet<FeatureKey> = new Set(['tasks', 'calendar', 'budget', 'rewards', 'sync']);

export const PRO_FEATURES: ReadonlySet<FeatureKey> = new Set([
  ...FREE_FEATURES,
  'social',
  'routines',
  'ai_suggestions',
  'ai_unlimited',
  'sync',
  'ad_free',
]);

export type SubscriptionInfo = {
  plan: PlanKey;
  isFree: boolean;
  isPaid: boolean;
  hasFeature: (feature: FeatureKey) => boolean;
  trialDays: number;
};

export function resolvePlan(
  userId: string | null,
  entitlementPlan: 'pro' | 'free' | undefined,
  legacyMetadataPlan: unknown
): PlanKey {
  if (!userId) return 'free_user';
  if (entitlementPlan) return entitlementPlan === 'pro' ? 'user_subscription' : 'free_user';
  return legacyMetadataPlan === 'user_subscription' ? 'user_subscription' : 'free_user';
}

export function useSubscription(): SubscriptionInfo {
  const { userId, userMetadata } = useAppAuth();
  const { entitlement } = useEntitlement();
  const plan = resolvePlan(userId, entitlement?.plan, userMetadata?.plan);
  const features = plan === 'user_subscription' ? PRO_FEATURES : FREE_FEATURES;

  return {
    plan,
    isFree: plan === 'free_user',
    isPaid: plan === 'user_subscription',
    hasFeature: (f: FeatureKey) => features.has(f),
    trialDays: 7,
  };
}
