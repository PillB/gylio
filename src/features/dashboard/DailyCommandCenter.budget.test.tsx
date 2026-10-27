import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import DailyCommandCenter from './DailyCommandCenter';

type Budget = { id: number; month: string; categories: { name: string; type: string; plannedAmount: number }[] };
type Transaction = { id: number; budgetMonth: string; amount: number; categoryName: string };

const db: { budgets: Budget[]; transactions: Transaction[] } = { budgets: [], transactions: [] };

// One stable object, like the real hook's useCallback'd getters. A fresh object per
// call would give loadData new deps on every render (it lists the getters as deps on
// #82) and reload in a loop, so the panel would keep flipping back to "Loading…".
const dbApi = {
  ready: true,
  getTasks: async () => [],
  updateTask: async () => null,
  getEvents: async () => [],
  getBudgets: vi.fn(async () => db.budgets),
  getTransactions: async () => db.transactions,
  // Daily Mode completes tasks through useTasks, which reads rewards through useRewards.
  getRewardsProgress: async () => null,
  updateRewardsProgress: async () => null,
};

vi.mock('../../core/hooks/useDB', () => ({ default: () => dbApi }));
vi.mock('../../core/hooks/useGamification', () => ({ default: () => ({ gamificationEnabled: true }) }));
const speak = vi.hoisted(() => async () => undefined);
vi.mock('../../core/hooks/useAccessibility', () => ({ default: () => ({ speak }) }));
vi.mock('../../core/analytics', () => ({ track: vi.fn(), Events: {} }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key) }),
}));

// Only Date is faked, so Testing Library's polling timers keep working.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0)); // 15 Sep 2026, local noon
});
afterAll(() => vi.useRealTimers());
afterEach(() => {
  cleanup();
  dbApi.getBudgets.mockClear();
});

const category = (name: string, plannedAmount: number) => ({ name, type: 'NEED', plannedAmount });

describe('DailyCommandCenter budget snapshot', () => {
  it("nudges from this month's budget and spending, not another month's", async () => {
    db.budgets = [
      // Last month: Rent never had spending logged, so it has the most left overall.
      { id: 1, month: '2026-08', categories: [category('Rent', 1200)] },
      { id: 2, month: '2026-09', categories: [category('Groceries', 400), category('Fun', 100)] },
      { id: 3, month: '2026-10', categories: [category('Travel', 900)] },
    ];
    db.transactions = [
      { id: 1, budgetMonth: '2026-09', amount: 150, categoryName: 'Groceries' },
      { id: 2, budgetMonth: '2026-08', amount: 380, categoryName: 'Groceries' },
    ];

    render(<DailyCommandCenter onExitSimplified={() => undefined} />);

    const nudge = (await screen.findByText('Groceries')).closest('p');
    expect(nudge?.textContent).toMatch(/\b250\b/);
    expect(screen.queryByText('Rent')).toBeNull();
    expect(screen.queryByText('Travel')).toBeNull();
    expect(dbApi.getBudgets).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state when only other months have a budget', async () => {
    db.budgets = [
      { id: 1, month: '2026-08', categories: [category('Rent', 1200)] },
      { id: 3, month: '2026-10', categories: [category('Travel', 900)] },
    ];
    db.transactions = [];

    render(<DailyCommandCenter onExitSimplified={() => undefined} />);

    expect(await screen.findByText('No budget data available yet.')).toBeTruthy();
    expect(screen.queryByText('Rent')).toBeNull();
  });
});
