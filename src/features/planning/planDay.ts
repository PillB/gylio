export type PlanTask = {
  id: string | number;
  estimateMin: number;
  priority?: 'high' | 'medium' | 'low';
  /** Hard deadline today: always kept, even over capacity. */
  mustDoToday?: boolean;
};
export type EnergyLevel = 'tiny' | 'low' | 'medium' | 'high';
export type PlanVariant = 'cap' | 'cap-with-nudge';
export type DayPlan = {
  today: PlanTask[];
  later: PlanTask[];
  bufferedLoadMin: number;
  capacityMin: number;
  /** True when must-do tasks alone exceed capacity; the UI should say so, not hide it. */
  overCapacity: boolean;
};

/** Focused minutes a person can plausibly commit at each energy level (product assumption, tune from data). */
export const CAPACITY_MIN: Record<EnergyLevel, number> = { tiny: 45, low: 120, medium: 240, high: 360 };
/** Share of the day left unplanned for transitions and surprises. */
export const BUFFER_SHARE = 0.25;

const RANK = { high: 0, medium: 1, low: 2 } as const;
const rank = (t: PlanTask): number => RANK[t.priority ?? 'low'];

/**
 * Pick what fits today. Deferred tasks go to `later`, which is a neutral bucket: nothing is
 * marked overdue or failed (skip without shame). Stable for equal priority.
 */
export const planDay = (tasks: PlanTask[], energy: EnergyLevel, variant: PlanVariant = 'cap'): DayPlan => {
  const capacityMin = Math.floor(CAPACITY_MIN[energy] * (1 - BUFFER_SHARE));
  const ordered = tasks
    .map((t, i) => ({ t, i }))
    .sort((a, b) => Number(!!b.t.mustDoToday) - Number(!!a.t.mustDoToday) || rank(a.t) - rank(b.t) || a.i - b.i)
    .map(({ t }) => t);
  const today: PlanTask[] = [];
  const later: PlanTask[] = [];
  let load = 0;
  for (const task of ordered) {
    const fits = load + task.estimateMin <= capacityMin;
    // 'cap-with-nudge' always offers one task on a full day so the plan is never empty.
    const first = variant === 'cap-with-nudge' && today.length === 0;
    if (task.mustDoToday || fits || first) {
      today.push(task);
      load += task.estimateMin;
    } else {
      later.push(task);
    }
  }
  return { today, later, bufferedLoadMin: load, capacityMin, overCapacity: load > capacityMin };
};
