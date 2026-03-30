export type SubtaskLike = { label: string; done: boolean };

export const MIN_SUBTASKS = 1;
export const MAX_SUBTASKS = 7;
// Number of blank step fields shown by default in the form.
export const DEFAULT_SUBTASK_COUNT = 3;

export const createEmptySubtasks = (count = DEFAULT_SUBTASK_COUNT): SubtaskLike[] =>
  Array.from({ length: count }, () => ({ label: '', done: false }));

export const normalizeSubtasks = (subtasks: SubtaskLike[]): SubtaskLike[] =>
  subtasks
    .map((subtask) => ({ ...subtask, label: subtask.label.trim() }))
    .filter((subtask) => subtask.label.length > 0);

export const getSubtaskError = (
  subtasks: SubtaskLike[],
  shouldValidate: boolean,
  t: (key: string, options?: Record<string, unknown>) => string
): string | null => {
  if (!shouldValidate) return null;

  const normalized = normalizeSubtasks(subtasks);
  if (normalized.length === 0) return null;

  if (normalized.length < MIN_SUBTASKS || normalized.length > MAX_SUBTASKS) {
    return t('validation.subtasksRange', { min: MIN_SUBTASKS, max: MAX_SUBTASKS });
  }

  return null;
};

export const parsePlannedDate = (value: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const chunkTasks = <T extends { id: number | string }>(items: T[]): T[][] => {
  const chunks: T[][] = [];
  let index = 0;

  while (index < items.length) {
    const remaining = items.length - index;

    if (remaining < MIN_SUBTASKS && chunks.length) {
      chunks[chunks.length - 1].push(...items.slice(index));
      break;
    }

    let size = Math.min(MAX_SUBTASKS, remaining);
    if (remaining - size < MIN_SUBTASKS && remaining > size) {
      size = Math.max(MIN_SUBTASKS, Math.ceil(remaining / 2));
    }

    chunks.push(items.slice(index, index + size));
    index += size;
  }

  return chunks.length ? chunks : [items];
};
