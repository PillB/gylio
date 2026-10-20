import { useCallback, useEffect, useMemo, useState } from 'react';
import useDB, { type Budget, type Debt, type Transaction } from '../../../core/hooks/useDB';
import { getDefaultBudgetMonth } from '../../../core/utils/date';

type IncomeEntry = Budget['income'][number];
type CategoryEntry = Budget['categories'][number];

export type NewTransaction = {
  amount: number;
  categoryName: string;
  date: string;
  note: string | null;
};

export type NewDebt = {
  name: string;
  balance: number;
  annualRate: number;
  minPayment: number;
  categoryName: string | null;
};

const logFailure = (action: string) => (error: unknown) => {
  console.error(`Failed to ${action}`, error);
};

const replaceById = <T extends { id: number }>(updated: T) => (prev: T[]) =>
  prev.map((entry) => (entry.id === updated.id ? updated : entry));

const withoutId = <T extends { id: number }>(id: number) => (prev: T[]) => prev.filter((entry) => entry.id !== id);

/**
 * Budget, transaction and debt persistence for the Budget screen.
 * Every mutation resolves to true when it was saved, so forms know when to reset.
 */
export const useBudgetData = () => {
  const db = useDB();
  const { ready, getBudgets, getTransactions, getDebts, insertBudget, updateBudget } = db;

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBudgetId, setActiveBudgetId] = useState<number | null>(null);
  const [monthInput, setMonthInput] = useState(getDefaultBudgetMonth());
  const [monthTouched, setMonthTouched] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    Promise.all([getBudgets(), getTransactions(), getDebts()])
      .then(([loadedBudgets, loadedTransactions, loadedDebts]) => {
        setBudgets(loadedBudgets);
        setTransactions(loadedTransactions);
        setDebts(loadedDebts);
        if (loadedBudgets.length > 0) {
          setActiveBudgetId(loadedBudgets[0].id);
          setMonthInput(loadedBudgets[0].month);
        }
      })
      .catch(logFailure('load budget data'))
      .finally(() => setLoading(false));
  }, [getBudgets, getDebts, getTransactions, ready]);

  // Typing an existing month switches to that budget.
  useEffect(() => {
    const matching = budgets.find((budget) => budget.month === monthInput);
    if (matching && matching.id !== activeBudgetId) setActiveBudgetId(matching.id);
  }, [activeBudgetId, monthInput, budgets]);

  const activeBudget = useMemo(
    () => budgets.find((budget) => budget.id === activeBudgetId) ?? null,
    [activeBudgetId, budgets]
  );

  const changeMonth = useCallback((value: string) => {
    setMonthInput(value);
    setMonthTouched(true);
  }, []);

  const selectBudget = useCallback((budget: Budget) => {
    setActiveBudgetId(budget.id);
    setMonthInput(budget.month);
  }, []);

  /** The open budget, or the one for the typed month (created on first use). */
  const ensureActiveBudget = useCallback((): Promise<Budget> => {
    if (activeBudget) return Promise.resolve(activeBudget);
    const month = monthInput.trim();
    if (!month) {
      setMonthTouched(true);
      return Promise.reject(new Error('Missing month'));
    }
    const existing = budgets.find((budget) => budget.month === month);
    if (existing) {
      setActiveBudgetId(existing.id);
      return Promise.resolve(existing);
    }
    return insertBudget(month, [], []).then((created) => {
      setBudgets((prev) => [created, ...prev]);
      setActiveBudgetId(created.id);
      return created;
    });
  }, [activeBudget, monthInput, budgets, insertBudget]);

  const patchBudget = useCallback(
    (action: string, patch: (budget: Budget) => Partial<Omit<Budget, 'id'>>, budget?: Budget | null) =>
      (budget ? Promise.resolve(budget) : ensureActiveBudget())
        .then((target) => updateBudget(target.id, patch(target)))
        .then((updated) => {
          if (!updated) return false;
          setBudgets(replaceById(updated));
          return true;
        })
        .catch((error) => {
          logFailure(action)(error);
          return false;
        }),
    [ensureActiveBudget, updateBudget]
  );

  const addIncome = (entry: IncomeEntry) =>
    patchBudget('add income', (budget) => ({ income: [...budget.income, entry] }));

  const removeIncome = (index: number) =>
    activeBudget &&
    patchBudget(
      'remove income',
      (budget) => ({ income: budget.income.filter((_, entryIndex) => entryIndex !== index) }),
      activeBudget
    );

  const addCategory = (entry: CategoryEntry) =>
    patchBudget('add category', (budget) => ({ categories: [...budget.categories, entry] }));

  const addCategories = (entries: CategoryEntry[]) =>
    patchBudget('add starter categories', (budget) => ({ categories: [...budget.categories, ...entries] }));

  const removeCategory = (index: number) =>
    activeBudget &&
    patchBudget(
      'remove category',
      (budget) => ({ categories: budget.categories.filter((_, entryIndex) => entryIndex !== index) }),
      activeBudget
    );

  /** Adds diagnostic results as take-home income plus one category per suggested line. */
  const applyDiagnostic = (income: IncomeEntry, categories: CategoryEntry[]) =>
    patchBudget('apply diagnostic', (budget) => ({
      income: [...budget.income, income],
      categories: [...budget.categories, ...categories],
    }));

  const addTransaction = (budget: Budget, entry: NewTransaction, isNeed: boolean) =>
    db
      .insertTransaction(budget.month, entry.amount, entry.categoryName, isNeed, entry.date, entry.note)
      .then((created) => {
        setTransactions((prev) => [created, ...prev]);
        return true;
      })
      .catch((error) => {
        logFailure('add transaction')(error);
        return false;
      });

  const removeTransaction = (id: number) =>
    db
      .deleteTransaction(id)
      .then((deleted) => deleted && setTransactions(withoutId(id)))
      .catch(logFailure('delete transaction'));

  const addDebt = (entry: NewDebt) =>
    db
      .insertDebt(entry.name, entry.balance, entry.annualRate, entry.minPayment, entry.categoryName)
      .then((created) => {
        setDebts((prev) => [created, ...prev]);
        return true;
      })
      .catch((error) => {
        logFailure('add debt')(error);
        return false;
      });

  const removeDebt = (id: number) =>
    db
      .deleteDebt(id)
      .then((deleted) => deleted && setDebts(withoutId(id)))
      .catch(logFailure('delete debt'));

  const deleteActiveBudget = () => {
    if (!activeBudget) return Promise.resolve(false);
    return db
      .deleteBudget(activeBudget.id)
      .then((deleted) => {
        if (!deleted) return false;
        setBudgets(withoutId(activeBudget.id));
        setActiveBudgetId(null);
        return true;
      })
      .catch((error) => {
        logFailure('delete budget')(error);
        return false;
      });
  };

  return {
    loading,
    budgets,
    transactions,
    debts,
    activeBudget,
    monthInput,
    monthTouched,
    setMonthTouched,
    changeMonth,
    selectBudget,
    ensureActiveBudget,
    addIncome,
    removeIncome,
    addCategory,
    addCategories,
    removeCategory,
    applyDiagnostic,
    addTransaction,
    removeTransaction,
    addDebt,
    removeDebt,
    deleteActiveBudget,
  };
};

export type BudgetData = ReturnType<typeof useBudgetData>;
