import { describe, expect, it } from 'vitest';
import {
  MAX_SUBTASKS,
  MIN_SUBTASKS,
  chunkTasks,
  createEmptySubtasks,
  getSubtaskError,
  normalizeSubtasks,
  parsePlannedDate,
} from './taskForm';

const t = (key: string, options?: Record<string, unknown>) =>
  `${key}:${String(options?.min)}-${String(options?.max)}`;

describe('taskForm helpers', () => {
  it('creates default subtask placeholders', () => {
    const subtasks = createEmptySubtasks();
    expect(subtasks).toHaveLength(MIN_SUBTASKS);
    expect(subtasks.every((step) => step.label === '' && step.done === false)).toBe(true);
  });

  it('normalizes and removes empty subtasks', () => {
    const normalized = normalizeSubtasks([
      { label: '  first  ', done: false },
      { label: ' ', done: false },
    ]);

    expect(normalized).toEqual([{ label: 'first', done: false }]);
  });

  it('returns localized error when subtasks are outside 3-7 range', () => {
    const tooFew = getSubtaskError([{ label: 'one', done: false }], true, t);
    const tooMany = getSubtaskError(
      Array.from({ length: MAX_SUBTASKS + 1 }, (_, i) => ({ label: `s${i}`, done: false })),
      true,
      t
    );

    expect(tooFew).toBe('validation.subtasksRange:3-7');
    expect(tooMany).toBe('validation.subtasksRange:3-7');
  });

  it('allows empty subtasks and skips validation when untouched', () => {
    expect(getSubtaskError([], false, t)).toBeNull();
    expect(getSubtaskError([{ label: ' ', done: false }], true, t)).toBeNull();
  });

  it('parses planned date safely', () => {
    expect(parsePlannedDate(null)).toBeNull();
    expect(parsePlannedDate('not-a-date')).toBeNull();
    expect(parsePlannedDate('2026-03-28')?.toISOString().startsWith('2026-03-28')).toBe(true);
  });

  it('chunks checklist into predictable 3-7 sized groups', () => {
    const tasks = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    const chunks = chunkTasks(tasks);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(7);
    expect(chunks[1]).toHaveLength(3);
  });
});
