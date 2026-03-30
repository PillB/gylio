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
