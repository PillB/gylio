/**
 * experiments — deterministic A/B assignment.
 *
 * A person always lands in the same variant (hash of experiment + stable id),
 * so reloading never flips what they see, and assignment needs no server.
 * Exposure is tracked once per session per experiment, when the variant is
 * actually rendered — not when it is merely computed — so analysis compares
 * people who saw the variant.
 *
 * Analysis rules (docs/billing/AB_TESTING.md): fix the sample size before
 * starting, do not stop early on a peek, primary metric is revenue per paywall
 * viewer at day 35, guardrails are D7/D30 retention and refunds.
 */

export type ExperimentDefinition = { variants: readonly string[]; weights?: readonly number[] };

export const EXPERIMENTS = {
  // Which billing interval the paywall pre-selects.
  paywall_default_interval: { variants: ['yearly', 'monthly'] },
  // Wording of the trial button: benefit-first vs. risk-reduction framing.
  trial_cta_copy: { variants: ['start_trial', 'try_free_no_card'] },
  // Layout review 2026-10-06 (docs/wiki/layout-review-2026-10-06.md). The first variant is the control.
  // Length of the Quick overview tour: all nine steps vs the five-step free core.
  tour_length: { variants: ['overview9', 'overview5'] },
  // Whether Transactions is the first Budget section (quick add) or stays after Categories.
  budget_quick_add: { variants: ['none', 'top'] },
  // Calendar view phones open on: Day vs the cut-off seven-day Week.
  calendar_default_phone: { variants: ['day', 'week'] },
} as const satisfies Record<string, ExperimentDefinition>;

export type ExperimentKey = keyof typeof EXPERIMENTS;
export type VariantOf<K extends ExperimentKey> = (typeof EXPERIMENTS)[K]['variants'][number];

/** 32-bit FNV-1a. Stable across browsers and releases; not for security. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Bucket in [0, 1) from experiment key and unit id. */
export function bucketOf(experimentKey: string, unitId: string): number {
  return fnv1a(`${experimentKey}:${unitId}`) / 0x100000000;
}

export function assignVariant(definition: ExperimentDefinition, experimentKey: string, unitId: string): string {
  const weights = definition.weights ?? definition.variants.map(() => 1);
  const total = weights.reduce((sum, w) => sum + w, 0);
  const target = bucketOf(experimentKey, unitId) * total;
  let cumulative = 0;
  for (let i = 0; i < definition.variants.length; i += 1) {
    cumulative += weights[i];
    if (target < cumulative) return definition.variants[i];
  }
  return definition.variants[definition.variants.length - 1];
}

const ANON_KEY = 'gylio:anonId';

/** A random id kept on this device, used before sign-in; never derived from personal data. */
export function getAnonymousId(): string {
  try {
    const existing = localStorage.getItem(ANON_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, created);
    return created;
  } catch {
    return 'anonymous';
  }
}

/** QA override: ?exp_trial_cta_copy=try_free_no_card forces a variant on this load. */
export function readOverride(search: string, key: string, variants: readonly string[]): string | null {
  const value = new URLSearchParams(search).get(`exp_${key}`);
  return value && variants.includes(value) ? value : null;
}
