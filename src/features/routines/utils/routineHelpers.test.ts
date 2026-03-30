import { describe, expect, it } from 'vitest';
import {
  createEmptyRoutineSteps,
  normalizeRoutineSteps,
  validateRoutineForm,
  isRoutineDueToday,
  formatTriggerTime,
} from './routineHelpers';

const t = (key: string) => key;

describe('createEmptyRoutineSteps', () => {
  it('creates the requested number of steps', () => {
    const steps = createEmptyRoutineSteps(3);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toEqual({ label: '', done: false });
  });

  it('defaults to 3 steps', () => {
    expect(createEmptyRoutineSteps()).toHaveLength(3);
  });
});

describe('normalizeRoutineSteps', () => {
  it('filters blank labels', () => {
    const steps = [
      { label: 'Wake up', done: false },
      { label: '  ', done: false },
      { label: 'Drink water', done: true },
    ];
    const result = normalizeRoutineSteps(steps);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe('Wake up');
  });

  it('trims labels', () => {
    const steps = [{ label: '  Brush teeth  ', done: false }];
    expect(normalizeRoutineSteps(steps)[0].label).toBe('Brush teeth');
  });
});

describe('validateRoutineForm', () => {
  it('requires a title', () => {
    const result = validateRoutineForm({ title: '', steps: [] }, t);
    expect(result.title).toBeTruthy();
  });

  it('passes valid form', () => {
    const result = validateRoutineForm({ title: 'Morning routine', steps: [] }, t);
    expect(result.title).toBe('');
  });
});

describe('isRoutineDueToday', () => {
  it('DAILY routine with no lastCompletedAt is due', () => {
    expect(isRoutineDueToday({ frequency: 'DAILY', lastCompletedAt: null })).toBe(true);
  });

  it('DAILY routine completed today is not due', () => {
    const today = new Date().toISOString();
    expect(isRoutineDueToday({ frequency: 'DAILY', lastCompletedAt: today })).toBe(false);
  });

  it('DAILY routine completed yesterday is due', () => {
    const yesterday = new Date(Date.now() - 86400 * 1000).toISOString();
    expect(isRoutineDueToday({ frequency: 'DAILY', lastCompletedAt: yesterday })).toBe(true);
  });

  it('WEEKLY routine with no lastCompletedAt is due', () => {
    expect(isRoutineDueToday({ frequency: 'WEEKLY', lastCompletedAt: null })).toBe(true);
  });
});

describe('formatTriggerTime', () => {
  it('returns empty string for null', () => {
    expect(formatTriggerTime(null)).toBe('');
  });

  it('returns the time string as-is for valid HH:mm', () => {
    expect(formatTriggerTime('07:30')).toBe('07:30');
  });
});
