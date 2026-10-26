import { describe, expect, it } from 'vitest';
import { calibrateEstimate } from './calibrateEstimate';
import { planDay } from './planDay';
import { billTaskDrafts } from './billTasks';
import { assignVariant, hasSampleRatioMismatch } from './experiment';

const s = (e: number, a: number) => ({ estimateMin: e, actualMin: a });

describe('calibrateEstimate', () => {
  it('uses the fixed 25% buffer with too little history', () => {
    expect(calibrateEstimate(40, [s(10, 30)])).toEqual({ suggestedMin: 50, ratio: 1.25, basis: 'default-buffer' });
  });
  it('scales by the median ratio, so one outlier does not dominate', () => {
    const h = [s(10, 20), s(10, 20), s(10, 20), s(10, 20), s(10, 200)];
    const c = calibrateEstimate(30, h);
    expect(c.ratio).toBe(2);
    expect(c.suggestedMin).toBe(60);
  });
  it('never suggests less than the person typed and caps at 3x', () => {
    const fast = Array.from({ length: 6 }, () => s(20, 10));
    expect(calibrateEstimate(20, fast).suggestedMin).toBe(20);
    const slow = Array.from({ length: 6 }, () => s(10, 100));
    expect(calibrateEstimate(10, slow).ratio).toBe(3);
  });
  it('ignores zero, negative and NaN samples', () => {
    const junk = [s(0, 5), s(5, -1), s(NaN, 5), s(10, 20), s(10, 20), s(10, 20)];
    expect(calibrateEstimate(10, junk).basis).toBe('default-buffer');
  });
});

describe('planDay', () => {
  const tasks = [
    { id: 'a', estimateMin: 60, priority: 'low' as const },
    { id: 'b', estimateMin: 60, priority: 'high' as const },
    { id: 'c', estimateMin: 60, priority: 'medium' as const },
  ];
  it('keeps highest priority first within buffered capacity and defers the rest neutrally', () => {
    const p = planDay(tasks, 'low'); // 120 * 0.75 = 90 min
    expect(p.today.map((t) => t.id)).toEqual(['b']);
    expect(p.later.map((t) => t.id)).toEqual(['c', 'a']);
    expect(p.capacityMin).toBe(90);
    expect(p.overCapacity).toBe(false);
  });
  it('always keeps must-do tasks and flags over-capacity honestly', () => {
    const p = planDay([{ id: 'x', estimateMin: 200, mustDoToday: true }], 'tiny');
    expect(p.today).toHaveLength(1);
    expect(p.overCapacity).toBe(true);
  });
  it('nudge variant never returns an empty day, cap variant may', () => {
    const big = [{ id: 'big', estimateMin: 500, priority: 'high' as const }];
    expect(planDay(big, 'low', 'cap').today).toHaveLength(0);
    expect(planDay(big, 'low', 'cap-with-nudge').today).toHaveLength(1);
  });
});

describe('billTaskDrafts', () => {
  const bill = { id: 1, name: 'Rent', dueDay: 31, minPayment: 100 };
  it('clamps day 31 to the end of a short month', () => {
    const d = billTaskDrafts([bill], new Date(2027, 1, 26));
    expect(d.map((x) => x.dueDate)).toEqual(['2027-02-28']);
    expect(d[0].remindDate).toBe('2027-02-26');
  });
  it('finds next month dues across the month boundary and skips far or invalid bills', () => {
    const d = billTaskDrafts(
      [{ id: 2, name: 'Phone', dueDay: 2, minPayment: 10 }, { id: 3, name: 'Far', dueDay: 20, minPayment: 1 }, { id: 4, name: 'Bad', dueDay: 0, minPayment: 1 }],
      new Date(2026, 11, 29),
    );
    expect(d.map((x) => [x.billId, x.dueDate])).toEqual([[2, '2027-01-02']]);
  });
});

describe('experiment', () => {
  it('is deterministic and splits a population roughly evenly with no SRM', () => {
    expect(assignVariant('u1', 'e', ['a', 'b'])).toBe(assignVariant('u1', 'e', ['a', 'b']));
    let a = 0;
    for (let i = 0; i < 4000; i++) if (assignVariant(`install-${i}`, 'plan-day-v1', ['a', 'b']) === 'a') a++;
    expect(hasSampleRatioMismatch(a, 4000 - a)).toBe(false);
  });
  it('buckets different experiments independently (not all-same or all-flipped)', () => {
    const arm = (e: string, i: number) => assignVariant(`install-${i}`, e, ['a', 'b']);
    for (const other of ['paywall-v1', 'plan-day-v2']) {
      let same = 0;
      for (let i = 0; i < 4000; i++) if (arm('plan-day-v1', i) === arm(other, i)) same++;
      expect(same).toBeGreaterThan(1800);
      expect(same).toBeLessThan(2200);
    }
  });
  it('flags a 55/45 split at n=4000 but not 51/49', () => {
    expect(hasSampleRatioMismatch(2200, 1800)).toBe(true);
    expect(hasSampleRatioMismatch(2040, 1960)).toBe(false);
  });
});
