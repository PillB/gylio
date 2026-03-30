/**
 * useSubscription
 *
 * Reads the user's Clerk publicMetadata.plan to determine their subscription tier.
 *
 * Plans:
 *   free_user        – default / no subscription; access to core features only
 *   user_subscription – paid ($12/mo or $10/mo yearly); full access + 10-day trial
 *
 * Falls back to 'free_user' when Clerk is not configured or user is signed out.
 */
import { useAppAuth } from '../../core/context/AuthContext';

export type PlanKey = 'free_user' | 'user_subscription';

export type FeatureKey =
  | 'tasks'
  | 'calendar'
  | 'budget'
  | 'rewards'
  | 'social'
  | 'routines'
  | 'ai_suggestions'
  | 'ai_unlimited';

// Which features are available on each plan
const PLAN_FEATURES: Record<PlanKey, Set<FeatureKey>> = {
  free_user: new Set(['tasks', 'calendar', 'budget']),
  user_subscription: new Set([
    'tasks',
    'calendar',
    'budget',
    'rewards',
    'social',
    'routines',
    'ai_suggestions',
    'ai_unlimited',
  ]),
};

export type SubscriptionInfo = {
  plan: PlanKey;
  isFree: boolean;
  isPaid: boolean;
  hasFeature: (feature: FeatureKey) => boolean;
  /** Monthly price in USD */
  monthlyPrice: number;
  yearlyPrice: number;
  trialDays: number;
};

export function useSubscription(): SubscriptionInfo {
  const { userId, userMetadata } = useAppAuth();

  const plan: PlanKey =
    userId && userMetadata?.plan === 'user_subscription' ? 'user_subscription' : 'free_user';

  const features = PLAN_FEATURES[plan];

  return {
    plan,
    isFree: plan === 'free_user',
    isPaid: plan === 'user_subscription',
    hasFeature: (f: FeatureKey) => features.has(f),
    monthlyPrice: 12,
    yearlyPrice: 10,
    trialDays: 10,
  };
}
