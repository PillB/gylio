import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import BudgetView from './BudgetView.jsx';

// Characterization tests for the Budget screen. They pin the user-visible
// behaviour so the view can be split into smaller pieces without regressions.

type Budget = {
  id: number;
  month: string;
  income: { source: string; amount: number }[];
  categories: { name: string; type: string; plannedAmount: number }[];
};

const db = {
  budgets: [] as Budget[],
  transactions: [] as Record<string, unknown>[],
  debts: [] as Record<string, unknown>[],
};

const updateBudget = vi.fn(async (id: number, patch: Partial<Budget>) => {
  const current = db.budgets.find((budget) => budget.id === id);
  if (!current) return null;
  const next = { ...current, ...patch };
  db.budgets = db.budgets.map((budget) => (budget.id === id ? next : budget));
  return next;
});
const insertBudget = vi.fn(async (month: string, income: Budget['income'], categories: Budget['categories']) => {
  const created = { id: 100 + db.budgets.length, month, income, categories };
  db.budgets = [created, ...db.budgets];
  return created;
});
const deleteBudget = vi.fn(async () => true);
const insertTransaction = vi.fn(
  async (budgetMonth: string, amount: number, categoryName: string, isNeed: boolean, date: string, note: string | null) => ({
    id: 500 + db.transactions.length,
    budgetMonth,
    amount,
    categoryName,
    isNeed,
    date,
    note,
  })
);
const deleteTransaction = vi.fn(async () => true);
const insertDebt = vi.fn(
  async (name: string, balance: number, annualRate: number, minPayment: number, categoryName: string | null) => ({
    id: 900,
    name,
    balance,
    annualRate,
    minPayment,
    categoryName,
  })
);
const deleteDebt = vi.fn(async () => true);
const applyRewardsProgress = vi.fn(async () => undefined);

// Stable references, like the real hook's useCallback results.
const dbApi = {
    ready: true,
    getBudgets: async () => db.budgets,
    getTransactions: async () => db.transactions,
    getDebts: async () => db.debts,
    insertBudget,
    updateBudget,
    deleteBudget,
    insertTransaction,
    deleteTransaction,
    insertDebt,
    deleteDebt,
};

vi.mock('../core/hooks/useDB', () => ({ default: () => dbApi }));
vi.mock('../core/hooks/useRewards', () => ({ default: () => ({ applyRewardsProgress }) }));
vi.mock('../core/hooks/useGamification', () => ({ default: () => ({ gamificationEnabled: true }) }));
vi.mock('../core/hooks/useAccessibility', () => ({ default: () => ({ speak: () => undefined }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown> | string) =>
      options && typeof options === 'object' && Object.keys(options).length
        ? `${key} ${JSON.stringify(options)}`
        : key,
  }),
}));

const seedBudget = (): Budget => ({
  id: 1,
  month: '2026-09',
  income: [{ source: 'Salary', amount: 3000 }],
  categories: [
    { name: 'Rent', type: 'NEED', plannedAmount: 1200 },
    { name: 'Fun', type: 'WANT', plannedAmount: 300 },
  ],
});

const inputAfterLabel = (labelText: string) => {
  const label = screen.getByText(labelText, { selector: 'label, label > span' }).closest('label');
  if (!label) throw new Error(`No label for ${labelText}`);
  const control = label.querySelector('input, select');
  if (!control) throw new Error(`No control for ${labelText}`);
  return control as HTMLInputElement;
};

const transactionSection = () => screen.getByText('budget.transactionsHeading').closest('section') as HTMLElement;

const renderLoaded = async () => {
  render(<BudgetView />);
  await screen.findByText('budget.incomeHeading');
};

beforeEach(() => {
  db.budgets = [seedBudget()];
  db.transactions = [
    { id: 1, budgetMonth: '2026-09', amount: 1300, categoryName: 'Rent', isNeed: true, date: '2026-09-02', note: null },
    { id: 2, budgetMonth: '2026-08', amount: 999, categoryName: 'Rent', isNeed: true, date: '2026-08-02', note: null },
  ];
  db.debts = [];
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('BudgetView', () => {
  it('shows the zero-based remaining amount as income minus planned', async () => {
    await renderLoaded();
    // 3000 income - (1200 + 300) planned
    expect(screen.getByText('1500.00')).toBeTruthy();
  });

  it('blocks invalid income and shows inline errors without saving', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByText('budget.addIncome'));
    expect(screen.getByText('validation.sourceRequired')).toBeTruthy();
    expect(screen.getByText('validation.invalidNumber')).toBeTruthy();
    expect(updateBudget).not.toHaveBeenCalled();
  });

  it('appends valid income, clears the form and updates remaining', async () => {
    await renderLoaded();
    fireEvent.change(inputAfterLabel('budget.incomeSourceLabel'), { target: { value: '  Freelance ' } });
    fireEvent.change(inputAfterLabel('budget.incomeAmountLabel'), { target: { value: '250.5' } });
    fireEvent.click(screen.getByText('budget.addIncome'));
    await waitFor(() => expect(updateBudget).toHaveBeenCalledTimes(1));
    expect(updateBudget).toHaveBeenCalledWith(1, {
      income: [
        { source: 'Salary', amount: 3000 },
        { source: 'Freelance', amount: 250.5 },
      ],
    });
    await screen.findByText('1750.50');
    expect(inputAfterLabel('budget.incomeSourceLabel').value).toBe('');
  });

  it('lists only transactions from the active budget month', async () => {
    await renderLoaded();
    const section = within(transactionSection());
    expect(section.getByText('2026-09-02')).toBeTruthy();
    expect(section.getByText('1300.00')).toBeTruthy();
    expect(section.queryByText('2026-08-02')).toBeNull();
    expect(section.queryByText('999.00')).toBeNull();
  });

  it('marks a category over budget from this month spending only', async () => {
    await renderLoaded();
    // Rent: 1300 spent this month against 1200 planned; August spending ignored.
    expect(screen.getByText('1300.00 / 1200.00')).toBeTruthy();
  });

  it('rejects a transaction whose category is not chosen', async () => {
    await renderLoaded();
    fireEvent.change(inputAfterLabel('amountLabel'), { target: { value: '20' } });
    fireEvent.change(inputAfterLabel('budget.transactionDateLabel'), { target: { value: '2026-09-10' } });
    fireEvent.click(screen.getByText('budget.addTransaction'));
    expect(screen.getByText('validation.categoryRequired')).toBeTruthy();
    expect(insertTransaction).not.toHaveBeenCalled();
  });

  it('saves a transaction with the need flag taken from its category', async () => {
    await renderLoaded();
    fireEvent.change(inputAfterLabel('amountLabel'), { target: { value: '45' } });
    fireEvent.change(inputAfterLabel('budget.transactionDateLabel'), { target: { value: '2026-09-10' } });
    fireEvent.change(within(transactionSection()).getByRole('combobox'), { target: { value: 'Fun' } });
    fireEvent.click(screen.getByText('budget.addTransaction'));
    await waitFor(() => expect(insertTransaction).toHaveBeenCalledWith('2026-09', 45, 'Fun', false, '2026-09-10', null));
    const row = (await within(transactionSection()).findByText('2026-09-10')).closest('li') as HTMLElement;
    expect(within(row).getByText('45.00')).toBeTruthy();
    expect(within(row).getByText('Fun')).toBeTruthy();
  });

  it('only deletes the budget after an explicit confirmation', async () => {
    await renderLoaded();
    const monthSection = screen.getByText('budget.monthHeading').closest('section') as HTMLElement;
    fireEvent.click(within(monthSection).getByText('deleteLabel'));
    expect(deleteBudget).not.toHaveBeenCalled();
    fireEvent.click(within(monthSection).getByText('cancelLabel'));
    expect(within(monthSection).queryByText('confirmLabel')).toBeNull();
    fireEvent.click(within(monthSection).getByText('deleteLabel'));
    fireEvent.click(within(monthSection).getByText('confirmLabel'));
    await waitFor(() => expect(deleteBudget).toHaveBeenCalledWith(1));
  });

  it('validates debts and projects payoff with the remaining amount as extra payment', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByText('budget.addDebt'));
    expect(screen.getByText('validation.titleRequired')).toBeTruthy();
    expect(insertDebt).not.toHaveBeenCalled();

    fireEvent.change(inputAfterLabel('titleLabel'), { target: { value: 'Card' } });
    fireEvent.change(inputAfterLabel('budget.balanceLabel'), { target: { value: '1000' } });
    fireEvent.change(inputAfterLabel('budget.annualRateLabel'), { target: { value: '0' } });
    fireEvent.change(inputAfterLabel('budget.minPaymentLabel'), { target: { value: '100' } });
    fireEvent.click(screen.getByText('budget.addDebt'));
    await waitFor(() => expect(insertDebt).toHaveBeenCalledWith('Card', 1000, 0, 100, null));
    // 100 minimum + 1500 remaining pays 1000 at 0% in one month.
    await screen.findByText('budget.payoffTimeline {"months":1}');
    expect(screen.getByText('budget.payoffExtraHint {"extra":"1500.00"}')).toBeTruthy();
  });

  it('awards the weekly review once and confirms it', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByText('budget.logReview'));
    await screen.findByText('budget.reviewLogged');
    expect(applyRewardsProgress).toHaveBeenCalledWith({ points: 15, budgetReviewed: true });
  });

  it('offers the quick-start categories only while a budget has none, and adds all eight', async () => {
    await renderLoaded();
    expect(screen.queryByText(/budget\.quickStart\.btn/)).toBeNull();
    cleanup();

    db.budgets = [{ ...seedBudget(), categories: [] }];
    await renderLoaded();
    fireEvent.click(screen.getByText(/budget\.quickStart\.btn/));
    await waitFor(() => expect(updateBudget).toHaveBeenCalledTimes(1));
    const [, patch] = updateBudget.mock.calls[0];
    expect(patch.categories?.map((entry) => entry.type)).toEqual(['NEED', 'NEED', 'NEED', 'NEED', 'WANT', 'WANT', 'GOAL', 'GOAL']);
    await waitFor(() => expect(screen.queryByText(/budget\.quickStart\.btn/)).toBeNull());
  });

  it('says when the open month has no transactions yet', async () => {
    db.transactions = [];
    await renderLoaded();
    expect(screen.getByRole('status').textContent).toContain('budget.noTransactionsYet');
  });
});
