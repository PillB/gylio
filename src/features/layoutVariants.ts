import { useMemo } from 'react';

/**
 * Switch points for the layout experiments (see docs/wiki/layout-review-2026-10-06.md).
 *
 * Until accounts and analytics land (#89's `useExperiment`), every key resolves to
 * its control. QA can force a variant with `?exp_<key>=<variant>`; unknown keys or
 * values are ignored so a mistyped link can never break a screen. When #89 lands,
 * `useLayoutVariant` is the one place to swap in `useExperiment` (it adds
 * deterministic assignment and exposure logging); the call sites do not change.
 */
export const LAYOUT_EXPERIMENTS = {
  tour_length: { control: 'overview9', variants: ['overview9', 'overview5'] },
  budget_quick_add: { control: 'none', variants: ['none', 'top'] },
  calendar_default_phone: { control: 'day', variants: ['day', 'week'] },
} as const;

export type LayoutExperimentKey = keyof typeof LAYOUT_EXPERIMENTS;
export type LayoutVariant<K extends LayoutExperimentKey> = (typeof LAYOUT_EXPERIMENTS)[K]['variants'][number];

export function resolveLayoutVariant<K extends LayoutExperimentKey>(key: K, search: string): LayoutVariant<K> {
  const definition = LAYOUT_EXPERIMENTS[key];
  const forced = new URLSearchParams(search).get(`exp_${key}`);
  const allowed = definition.variants as readonly string[];
  return (forced && allowed.includes(forced) ? forced : definition.control) as LayoutVariant<K>;
}

/**
 * `shown: false` means the variant is not on screen for this person (a tour that is
 * not open, a phone-only default on a desktop). It is ignored here and becomes the
 * exposure filter once `useExperiment` backs this hook, so A/B groups are not
 * diluted by people who never saw the difference.
 */
export function useLayoutVariant<K extends LayoutExperimentKey>(key: K, _options: { shown?: boolean } = {}): LayoutVariant<K> {
  const search = typeof window === 'undefined' ? '' : window.location.search;
  return useMemo(() => resolveLayoutVariant(key, search), [key, search]);
}
