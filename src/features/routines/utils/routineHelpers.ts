import type { RoutineStep, RoutineFrequency } from './routineTypes';

export const createEmptyRoutineSteps = (count = 3): RoutineStep[] =>
  Array.from({ length: count }, () => ({ label: '', done: false }));

export const normalizeRoutineSteps = (steps: RoutineStep[]): RoutineStep[] =>
  steps
    .map((s) => ({ ...s, label: s.label.trim() }))
    .filter((s) => s.label.length > 0);

export const validateRoutineForm = (
  form: { title: string; steps: RoutineStep[] },
  t: (key: string) => string
): { title: string } => ({
  title: form.title.trim() ? '' : t('routines.errorTitleRequired'),
});

const padDatePart = (value: number) => String(value).padStart(2, '0');

/**
 * Returns a calendar-date key in the user's/device's local timezone.
 *
 * Routine completion is a human calendar concept, not a UTC timestamp. Using
 * `toISOString().slice(0, 10)` can move an evening completion into tomorrow for
 * users west of UTC (and into yesterday for some users east of UTC).
 */
export const formatLocalDateKey = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const recentLocalDateKeys = (count = 21, now: Date = new Date()): string[] => {
  const safeCount = Math.max(0, Math.floor(count));
  return Array.from({ length: safeCount }, (_, index) => {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (safeCount - 1 - index));
    return formatLocalDateKey(date);
  });
};

export const isRoutineDueToday = (routine: {
  frequency: RoutineFrequency;
  lastCompletedAt: string | null;
}): boolean => {
  if (!routine.lastCompletedAt) return true;

  const last = new Date(routine.lastCompletedAt);
  const now = new Date();

  if (routine.frequency === 'DAILY') {
    return (
      last.getFullYear() !== now.getFullYear() ||
      last.getMonth() !== now.getMonth() ||
      last.getDate() !== now.getDate()
    );
  }

  if (routine.frequency === 'WEEKLY') {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    return now.getTime() - last.getTime() >= msPerWeek;
  }

  return true;
};

export const formatTriggerTime = (triggerTime: string | null): string =>
  triggerTime ?? '';
