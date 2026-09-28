export type CategoryType = 'NEED' | 'WANT' | 'GOAL' | 'DEBT';

export const CATEGORY_TYPES: CategoryType[] = ['NEED', 'WANT', 'GOAL', 'DEBT'];

export type BudgetCategory = { name: string; type: CategoryType; plannedAmount: number };
export type BudgetIncome = { source: string; amount: number };
export type BudgetTransaction = { budgetMonth: string; categoryName: string; amount: number };

export type TypeTotals = Record<CategoryType, number>;

const emptyTotals = (): TypeTotals => ({ NEED: 0, WANT: 0, GOAL: 0, DEBT: 0 });

export const sumIncome = (income: BudgetIncome[]): number =>
  income.reduce((sum, entry) => sum + entry.amount, 0);

export const sumPlanned = (categories: BudgetCategory[]): number =>
  categories.reduce((sum, entry) => sum + entry.plannedAmount, 0);

export const transactionsForMonth = <T extends BudgetTransaction>(transactions: T[], month: string): T[] =>
  transactions.filter((transaction) => transaction.budgetMonth === month);

export const plannedByType = (categories: BudgetCategory[]): TypeTotals =>
  categories.reduce((totals, category) => {
    totals[category.type] += category.plannedAmount;
    return totals;
  }, emptyTotals());

export const actualByCategory = (transactions: BudgetTransaction[]): Map<string, number> =>
  transactions.reduce(
    (map, transaction) => map.set(transaction.categoryName, (map.get(transaction.categoryName) ?? 0) + transaction.amount),
    new Map<string, number>()
  );

/** Spending per type; transactions whose category is not in the budget are ignored. */
export const actualByType = (categories: BudgetCategory[], transactions: BudgetTransaction[]): TypeTotals => {
  const typeByName = new Map(categories.map((category) => [category.name, category.type]));
  return transactions.reduce((totals, transaction) => {
    const type = typeByName.get(transaction.categoryName);
    if (type) totals[type] += transaction.amount;
    return totals;
  }, emptyTotals());
};

export type SpendingStatus = 'ok' | 'warning' | 'over';

export type CategoryProgress = { spent: number; ratio: number; status: SpendingStatus };

/** Share of the plan already spent (capped at 1) and its traffic-light status (80% warns). */
export const categoryProgress = (plannedAmount: number, spent: number): CategoryProgress => {
  const ratio = plannedAmount > 0 ? Math.min(spent / plannedAmount, 1) : 0;
  if (spent > plannedAmount) return { spent, ratio, status: 'over' };
  return { spent, ratio, status: ratio >= 0.8 ? 'warning' : 'ok' };
};

export type SpendingBar = { type: CategoryType; planned: number; actual: number };

/** Planned vs actual per category type for one month's transactions. */
export const buildSpendingBars = (
  categories: BudgetCategory[],
  monthTransactions: BudgetTransaction[]
): SpendingBar[] => {
  const planned = plannedByType(categories);
  const actual = actualByType(categories, monthTransactions);
  return CATEGORY_TYPES.map((type) => ({ type, planned: planned[type], actual: actual[type] }));
};
