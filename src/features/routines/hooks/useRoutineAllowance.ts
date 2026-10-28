/**
 * The free routine limit for this person, with the experiment variant and the one-time thank-you
 * (routineAllowance.ts). Pro has no limit and is not part of the experiment.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Events, track } from '../../../core/analytics';
import { useExperiment } from '../../experiments/useExperiment';
import { useSubscription } from '../../subscription/useSubscription';
import {
  crossedMilestones,
  daysWithRoutinesDone,
  earnsExtra,
  EXTRA_ROUTINES,
  readCounted,
  readExtra,
  routineAllowance,
  writeCounted,
  writeExtra,
  type Allowance,
  type ExtraRoutines,
  type LimitVariant,
} from '../routineAllowance';

const storage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export type RoutineAllowanceState = Allowance & {
  variant: LimitVariant;
  /** The thank-you, while it has not been acknowledged yet. */
  newExtra: ExtraRoutines | null;
  acknowledgeExtra: () => void;
};

export function useRoutineAllowance(routines: readonly { completionLog?: readonly string[] | null }[], ready = true): RoutineAllowanceState {
  const { hasFeature } = useSubscription();
  const pro = hasFeature('routines_unlimited');
  const { variant, ready: variantReady } = useExperiment('routine_free_limit', { shown: !pro });
  const [extra, setExtra] = useState<ExtraRoutines | null>(() => readExtra(storage()));
  const days = useMemo(() => daysWithRoutinesDone(routines), [routines]);

  // Given the moment the rule is met, once, and kept: reading it back first means two tabs give it only once.
  useEffect(() => {
    if (pro || !ready || !variantReady) return;
    const kept = readExtra(storage());
    if (!earnsExtra(variant, days, kept)) return;
    const given: ExtraRoutines = { spaces: EXTRA_ROUTINES, givenAt: new Date().toISOString(), seen: false };
    writeExtra(storage(), given);
    setExtra(given);
    track(Events.ROUTINE_LIMIT, { step: 'extra_given', variant, days });
  }, [pro, ready, variantReady, variant, days]);

  // The day milestones that let the test be read (routineAllowance.ts). Only once the routines are loaded: an empty
  // list while loading would set a returning person's mark to zero.
  useEffect(() => {
    if (pro || !ready || !variantReady) return;
    const { send, counted } = crossedMilestones(days, readCounted(storage()));
    writeCounted(storage(), counted);
    for (const milestone of send) track(Events.ROUTINE_DAYS, { days: milestone, variant });
  }, [pro, ready, variantReady, variant, days]);

  const acknowledgeExtra = useCallback(() => {
    setExtra((current) => {
      if (!current || current.seen) return current;
      const seen = { ...current, seen: true };
      writeExtra(storage(), seen);
      track(Events.ROUTINE_LIMIT, { step: 'extra_seen', variant });
      return seen;
    });
  }, [variant]);

  const allowance = routineAllowance({ pro, variant, used: routines.length, extra });
  // Until sign-in and the routines are known the variant or the count can still change, so nothing is held back yet:
  // a note that flashes and goes would be its own surprise.
  const settled = ready && variantReady;
  return { ...allowance, canAdd: allowance.canAdd || !settled, variant, newExtra: extra && !extra.seen && !pro ? extra : null, acknowledgeExtra };
}
