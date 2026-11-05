import { describe, expect, it } from 'vitest';
import { isPersonalKey } from '../../core/account/deviceOwner';
import { EXPERIMENTS } from '../experiments/experiments';
import {
  BASE_FREE_ROUTINES,
  crossedMilestones,
  DAY_MILESTONES,
  DAYS_COUNTED_KEY,
  daysWithRoutinesDone,
  earnsExtra,
  EXTRA_AFTER_DAYS,
  EXTRA_KEY,
  EXTRA_ROUTINES,
  readCounted,
  readExtra,
  routineAllowance,
  writeCounted,
  writeExtra,
  type ExtraRoutines,
} from './routineAllowance';

const given: ExtraRoutines = { spaces: EXTRA_ROUTINES, givenAt: '2026-10-28T10:00:00.000Z', seen: false };

const memoryStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, String(value)),
  };
};

describe('the routine limit', () => {
  it('keeps 3 free routines in the control and the surprise variant, 5 in the other, and the thank-you adds 2', () => {
    expect(EXPERIMENTS.routine_free_limit.variants).toEqual(['three', 'three_plus_surprise', 'five']);
    expect(BASE_FREE_ROUTINES).toEqual({ three: 3, three_plus_surprise: 3, five: 5 });
    expect(EXTRA_ROUTINES).toBe(2);
    expect(EXTRA_AFTER_DAYS).toBe(7);
  });

  it('lets a free person add until the limit and not after', () => {
    expect(routineAllowance({ pro: false, variant: 'three', used: 2, extra: null })).toEqual({ limit: 3, used: 2, canAdd: true });
    expect(routineAllowance({ pro: false, variant: 'three', used: 3, extra: null })).toEqual({ limit: 3, used: 3, canAdd: false });
    expect(routineAllowance({ pro: false, variant: 'five', used: 4, extra: null }).canAdd).toBe(true);
    expect(routineAllowance({ pro: false, variant: 'five', used: 5, extra: null }).canAdd).toBe(false);
  });

  it('never asks someone over the limit to remove anything: they simply cannot add', () => {
    expect(routineAllowance({ pro: false, variant: 'three', used: 8, extra: null })).toEqual({ limit: 3, used: 8, canAdd: false });
  });

  it('counts a thank-you already given in every variant, so a change of group cannot take it back', () => {
    for (const variant of ['three', 'three_plus_surprise', 'five'] as const) {
      expect(routineAllowance({ pro: false, variant, used: 0, extra: given }).limit).toBe(BASE_FREE_ROUTINES[variant] + 2);
    }
  });

  it('has no limit with Pro', () => {
    expect(routineAllowance({ pro: true, variant: 'three', used: 40, extra: null })).toEqual({ limit: null, used: 40, canAdd: true });
  });
});

describe('the thank-you', () => {
  it('is earned only in its variant, only once, and only after routines were done on 7 different days', () => {
    expect(earnsExtra('three_plus_surprise', 6, null)).toBe(false);
    expect(earnsExtra('three_plus_surprise', 7, null)).toBe(true);
    expect(earnsExtra('three_plus_surprise', 30, given)).toBe(false);
    expect(earnsExtra('three', 30, null)).toBe(false);
    expect(earnsExtra('five', 30, null)).toBe(false);
  });

  it('counts different days, not routines: two routines done on the same day are one day', () => {
    const routines = [
      { completionLog: ['2026-10-01', '2026-10-02'] },
      { completionLog: ['2026-10-02', '2026-10-05'] },
      { completionLog: null },
      {},
    ];
    expect(daysWithRoutinesDone(routines)).toBe(3);
  });

  it('does not need the days in a row', () => {
    const scattered = [{ completionLog: ['2026-09-01', '2026-09-04', '2026-09-09', '2026-09-15', '2026-09-20', '2026-09-28', '2026-10-06'] }];
    expect(earnsExtra('three_plus_surprise', daysWithRoutinesDone(scattered), null)).toBe(true);
  });

  it('is kept on the device and read back as it was written', () => {
    const storage = memoryStorage();
    expect(readExtra(storage)).toBeNull();
    writeExtra(storage, given);
    expect(readExtra(storage)).toEqual(given);
    expect(JSON.parse(storage.getItem(EXTRA_KEY) ?? '{}')).toEqual(given);
  });

  it('ignores anything in its place that is not a thank-you', () => {
    const storage = memoryStorage();
    for (const junk of ['not json', '{}', '{"spaces":0}', '{"spaces":-2}', '{"spaces":"2"}', 'null']) {
      storage.setItem(EXTRA_KEY, junk);
      expect({ junk, read: readExtra(storage) }).toEqual({ junk, read: null });
    }
    expect(readExtra(null)).toBeNull();
  });

  it('survives storage that refuses to be written', () => {
    const full = { ...memoryStorage(), setItem: () => { throw new Error('QuotaExceededError'); } } as Storage;
    expect(() => writeExtra(full, given)).not.toThrow();
  });

  it('is personal data, so it leaves the device with the rest of the person’s data', () => {
    expect(isPersonalKey(EXTRA_KEY)).toBe(true);
  });
});

describe('the day milestones that let the test be read', () => {
  it('are 1, 3, 7, 14, 28 and 56 different days', () => {
    expect(DAY_MILESTONES).toEqual([1, 3, 7, 14, 28, 56]);
  });

  it('notes, without sending, what a device had already passed the first time it is seen', () => {
    expect(crossedMilestones(0, null)).toEqual({ send: [], counted: 0 });
    expect(crossedMilestones(30, null)).toEqual({ send: [], counted: 28 });
  });

  it('sends each milestone once, the first time it is passed, including several passed at once', () => {
    expect(crossedMilestones(1, 0)).toEqual({ send: [1], counted: 1 });
    expect(crossedMilestones(2, 1)).toEqual({ send: [], counted: 1 });
    expect(crossedMilestones(7, 1)).toEqual({ send: [3, 7], counted: 7 });
    expect(crossedMilestones(7, 7)).toEqual({ send: [], counted: 7 });
    expect(crossedMilestones(56, 28)).toEqual({ send: [56], counted: 56 });
  });

  it('does not send a milestone again after routines are removed and the days are reached again', () => {
    const afterRemoving = crossedMilestones(2, 14);
    expect(afterRemoving).toEqual({ send: [], counted: 14 });
    expect(crossedMilestones(14, afterRemoving.counted).send).toEqual([]);
  });

  it('keeps the mark on the device, and reads anything else as not seen yet', () => {
    const storage = memoryStorage();
    expect(readCounted(storage)).toBeNull();
    writeCounted(storage, 7);
    expect(readCounted(storage)).toBe(7);
    for (const junk of ['', 'seven', '-1', '2.5']) {
      storage.setItem(DAYS_COUNTED_KEY, junk);
      expect({ junk, read: readCounted(storage) }).toEqual({ junk, read: null });
    }
    expect(readCounted(null)).toBeNull();
    expect(isPersonalKey(DAYS_COUNTED_KEY)).toBe(true);
  });
});
