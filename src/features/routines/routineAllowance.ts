/**
 * How many routines the free plan keeps, and the one-time thank-you that adds two more.
 *
 * Research, strategy and the A/B plan: docs/research/routine-free-limit-2026-10-28.md. In short:
 * - Free keeps 3 routines (the owner's decision, 28 Oct 2026); Pro has no limit. The experiment
 *   `routine_free_limit` compares 3, 5, and 3 plus a surprise of 2 more.
 * - The surprise is never announced, so it stays an unexpected reward: in Deci, Koestner and Ryan's
 *   meta-analysis (1999) unexpected tangible rewards left intrinsic motivation unchanged (d = 0.01), while
 *   rewards promised for completing a task lowered it (d = -0.32 on free-choice behaviour).
 * - It comes once, on a fixed rule, and is never taken back: no random schedule (the slot-machine mechanic),
 *   nothing to lose, nothing to chase.
 * - The rule counts different days with any routine done, not a streak: missing a day did not derail habit
 *   formation (Lally et al., 2010), and flexible timing beat rigid routines (Beshears et al., 2021).
 *
 * Nothing here deletes or locks a routine someone already has. A limit only stops adding a new one.
 */
import type { VariantOf } from '../experiments/experiments';

export type LimitVariant = VariantOf<'routine_free_limit'>;

/** Free routines before any thank-you, per variant. */
export const BASE_FREE_ROUTINES: Record<LimitVariant, number> = { three: 3, three_plus_surprise: 3, five: 5 };
/** The thank-you: two more routines, kept for good. */
export const EXTRA_ROUTINES = 2;
/** Different days with at least one routine done before the thank-you. */
export const EXTRA_AFTER_DAYS = 7;

/** Where the thank-you is kept once given. Personal data: it goes with the person's other data. */
export const EXTRA_KEY = 'gylio:routines:extra';

export type ExtraRoutines = { spaces: number; givenAt: string; seen: boolean };

export const readExtra = (storage: Storage | null): ExtraRoutines | null => {
  try {
    const parsed = JSON.parse(storage?.getItem(EXTRA_KEY) ?? 'null') as Partial<ExtraRoutines> | null;
    if (!parsed || typeof parsed.spaces !== 'number' || parsed.spaces <= 0) return null;
    return { spaces: parsed.spaces, givenAt: String(parsed.givenAt ?? ''), seen: Boolean(parsed.seen) };
  } catch {
    return null;
  }
};

export const writeExtra = (storage: Storage | null, extra: ExtraRoutines): void => {
  try {
    storage?.setItem(EXTRA_KEY, JSON.stringify(extra));
  } catch {
    // Storage full or blocked: the thank-you still applies for this visit.
  }
};

/** Different calendar days (the device's own days) on which any routine was done. */
export const daysWithRoutinesDone = (routines: readonly { completionLog?: readonly string[] | null }[]): number =>
  new Set(routines.flatMap((routine) => routine.completionLog ?? [])).size;

/** Whether this person has just earned the thank-you: only in its variant, only once, only after enough days. */
export const earnsExtra = (variant: LimitVariant, days: number, extra: ExtraRoutines | null): boolean =>
  variant === 'three_plus_surprise' && extra === null && days >= EXTRA_AFTER_DAYS;

/**
 * How the test is read without knowing who anyone is: each device says once when it first reaches 1, 3, 7, 14, 28 and
 * 56 different days with a routine done, with its group. Per group that is a funnel (of those who reached 7 days, how
 * many reached 28), so the thank-you on day 7 can be judged on what happens after it.
 */
export const DAY_MILESTONES = [1, 3, 7, 14, 28, 56] as const;
/** The highest milestone this device has already counted. Personal data, like the thank-you. */
export const DAYS_COUNTED_KEY = 'gylio:routines:daysCounted';

/**
 * The milestones to send now, and the new high mark. The first time a device is seen, the milestones it already
 * passed are noted and not sent: they happened before the test, and sending them would count old habits as new.
 */
export const crossedMilestones = (days: number, counted: number | null): { send: number[]; counted: number } => {
  const passed = DAY_MILESTONES.filter((milestone) => days >= milestone);
  const top = passed[passed.length - 1] ?? 0;
  if (counted === null) return { send: [], counted: top };
  return { send: passed.filter((milestone) => milestone > counted), counted: Math.max(counted, top) };
};

export const readCounted = (storage: Storage | null): number | null => {
  try {
    const value = storage?.getItem(DAYS_COUNTED_KEY) ?? '';
    return /^\d+$/.test(value) ? Number(value) : null;
  } catch {
    return null;
  }
};

export const writeCounted = (storage: Storage | null, counted: number): void => {
  try {
    storage?.setItem(DAYS_COUNTED_KEY, String(counted));
  } catch {
    // Storage full or blocked: the milestone may be sent again on a later visit, which the summary tolerates.
  }
};

export type Allowance = {
  /** null: no limit (Pro). */
  limit: number | null;
  used: number;
  canAdd: boolean;
};

/**
 * The limit for someone on the free plan, or none for Pro. A thank-you already given counts in every variant,
 * so a later change of variant (or of the experiment) can never take it away.
 */
export const routineAllowance = ({ pro, variant, used, extra }: { pro: boolean; variant: LimitVariant; used: number; extra: ExtraRoutines | null }): Allowance => {
  if (pro) return { limit: null, used, canAdd: true };
  const limit = BASE_FREE_ROUTINES[variant] + (extra?.spaces ?? 0);
  return { limit, used, canAdd: used < limit };
};
