import { useEffect, useMemo } from 'react';
import { useAppAuth } from '../../core/context/AuthContext';
import { track } from '../../core/analytics';
import { EXPERIMENTS, assignVariant, getAnonymousId, readOverride, type ExperimentKey, type VariantOf } from './experiments';

const exposed = new Set<string>();

export function useExperiment<K extends ExperimentKey>(key: K): VariantOf<K> {
  const { userId } = useAppAuth();
  const definition = EXPERIMENTS[key];
  const unitId = userId ?? getAnonymousId();

  const variant = useMemo(() => {
    const override = typeof window !== 'undefined' ? readOverride(window.location.search, key, definition.variants) : null;
    return (override ?? assignVariant(definition, key, unitId)) as VariantOf<K>;
  }, [definition, key, unitId]);

  useEffect(() => {
    const id = `${key}:${variant}`;
    if (exposed.has(id)) return;
    exposed.add(id);
    track('experiment_exposure', { experiment: key, variant, signedIn: Boolean(userId) });
  }, [key, variant, userId]);

  return variant;
}
