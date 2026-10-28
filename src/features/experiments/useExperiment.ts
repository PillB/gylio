import { useEffect, useMemo } from 'react';
import { useAppAuth } from '../../core/context/AuthContext';
import { track } from '../../core/analytics';
import { EXPERIMENTS, assignVariant, getAnonymousId, readOverride, type ExperimentKey, type VariantOf } from './experiments';

const exposed = new Set<string>();

export type ExperimentState<K extends ExperimentKey> = { variant: VariantOf<K>; ready: boolean };

/**
 * The variant for this person, and whether it is final. Until sign-in state is
 * known the unit would be the anonymous id and could flip to the account id a
 * moment later, so `ready` is false and no exposure is logged.
 *
 * Pass `shown: false` when the variant is not actually on screen (for example
 * the trial button for someone who can't start a trial): exposure is only
 * logged for people who saw it, or the A/B comparison is diluted.
 */
export function useExperiment<K extends ExperimentKey>(key: K, { shown = true }: { shown?: boolean } = {}): ExperimentState<K> {
  const { userId, authLoaded } = useAppAuth();
  const definition = EXPERIMENTS[key];
  const unitId = userId ?? getAnonymousId();

  const variant = useMemo(() => {
    const override = typeof window !== 'undefined' ? readOverride(window.location.search, key, definition.variants) : null;
    return (override ?? assignVariant(definition, key, unitId)) as VariantOf<K>;
  }, [definition, key, unitId]);

  useEffect(() => {
    if (!authLoaded || !shown) return;
    const id = `${key}:${variant}`;
    if (exposed.has(id)) return;
    exposed.add(id);
    track('experiment_exposure', { experiment: key, variant, signedIn: Boolean(userId) });
  }, [key, variant, userId, authLoaded, shown]);

  return { variant, ready: authLoaded };
}
