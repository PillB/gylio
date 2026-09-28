import { describe, expect, it } from 'vitest';
import {
  actualByCategory,
  actualByType,
  buildSpendingBars,
  categoryProgress,
  plannedByType,
  sumIncome,
  sumPlanned,
  transactionsForMonth,
  type BudgetCategory,
} from './budgetTotals';

const categories: BudgetCategory[] = [
  { name: 'Rent', type: 'NEED', plannedAmount: 1000 },
  { name: 'Food', type: 'NEED', plannedAmount: 400 },
  { name: 'Games', type: 'WANT', plannedAmount: 100 },
];

const transactions = [
  { budgetMonth: '2026-09', categoryName: 'Rent', amount: 1000 },
  { budgetMonth: '2026-09', categoryName: 'Food', amount: 120 },
  { budgetMonth: '2026-09', categoryName: 'Food', amount: 30 },
  { budgetMonth: '2026-09', categoryName: 'Deleted category', amount: 75 },
  { budgetMonth: '2026-08', categoryName: 'Games', amount: 60 },
];

describe('budget totals', () => {
  it('sums income and planned amounts for the zero-based remainder', () => {
    expect(sumIncome([{ source: 'a', amount: 1500 }, { source: 'b', amount: 250 }])).toBe(1750);
    expect(sumPlanned(categories)).toBe(1500);
  });

  it('groups planned amounts by category type', () => {
    expect(plannedByType(categories)).toEqual({ NEED: 1400, WANT: 100, GOAL: 0, DEBT: 0 });
  });

  it('adds up repeated spending per category', () => {
    expect(actualByCategory(transactions).get('Food')).toBe(150);
  });

  it('ignores spending on categories that are not in the budget', () => {
    expect(actualByType(categories, transactionsForMonth(transactions, '2026-09'))).toEqual({
      NEED: 1150,
      WANT: 0,
      GOAL: 0,
      DEBT: 0,
    });
  });

  it('builds chart bars from the given month only', () => {
    const bars = buildSpendingBars(categories, transactionsForMonth(transactions, '2026-09'));
    expect(bars.find((bar) => bar.type === 'WANT')).toEqual({ type: 'WANT', planned: 100, actual: 0 });
    expect(bars.map((bar) => bar.type)).toEqual(['NEED', 'WANT', 'GOAL', 'DEBT']);
  });
});

describe('categoryProgress', () => {
  it('warns from 80% of the plan and flags anything above it as over', () => {
    expect(categoryProgress(100, 79).status).toBe('ok');
    expect(categoryProgress(100, 80).status).toBe('warning');
    expect(categoryProgress(100, 100).status).toBe('warning');
    expect(categoryProgress(100, 101)).toEqual({ spent: 101, ratio: 1, status: 'over' });
  });

  it('treats any spending against a zero plan as over budget', () => {
    expect(categoryProgress(0, 0)).toEqual({ spent: 0, ratio: 0, status: 'ok' });
    expect(categoryProgress(0, 5).status).toBe('over');
  });
});
