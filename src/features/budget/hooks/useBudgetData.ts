import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useDB, { type Budget, type Debt, type Transaction } from '../../../core/hooks/useDB';
import { useOnDataChanged } from '../../../core/hooks/useOnDataChanged';
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
  dueDay: number | null;
};

const logFailure = (action: string) => (error: unknown) => {
  console.error(`Failed to ${action}`, error);
};

const replaceById = <T extends { id: number }>(updated: T) => (prev: T[]) =>
  prev.map((entry) => (entry.id === updated.id ? updated : entry));

const withoutId = <T extends { id: number }>(id: number) => (prev: T[]) => prev.filter((entry) => entry.id !== id);

/** The list with `entry` put back at `index` (or at the end when the list has since got shorter). */
export const insertAt = <T,>(list: T[], index: number, entry: T): T[] => [...list.slice(0, index), entry, ...list.slice(index)];

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
  // Undo runs seconds after a delete; it must patch the budget as it is then, not as it was.
  const budgetsRef = useRef(budgets);
  budgetsRef.current = budgets;

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

  // Changes that arrive from the account or another tab: reload the lists, and stay on the month being viewed.
  useOnDataChanged(() => {
    if (!ready) return;
    Promise.all([getBudgets(), getTransactions(), getDebts()])
      .then(([loadedBudgets, loadedTransactions, loadedDebts]) => {
        setBudgets(loadedBudgets);
        setTransactions(loadedTransactions);
        setDebts(loadedDebts);
      })
      .catch(logFailure('refresh budget data'));
  });

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
    activeBudget
      ? patchBudget(
          'remove income',
          (budget) => ({ income: budget.income.filter((_, entryIndex) => entryIndex !== index) }),
          activeBudget
        )
      : Promise.resolve(false);

  /** Puts a removed income or category line back where it was, in the budget it came from. */
  const restoreLine = <K extends 'income' | 'categories'>(key: K, budgetId: number, index: number, entry: Budget[K][number]) => {
    const target = budgetsRef.current.find((budget) => budget.id === budgetId);
    if (!target) return Promise.resolve(false);
    return patchBudget(
      `restore ${key}`,
      (budget) => ({ [key]: insertAt(budget[key] as Budget[K][number][], index, entry) }) as Partial<Omit<Budget, 'id'>>,
      target
    );
  };

  const addCategory = (entry: CategoryEntry) =>
    patchBudget('add category', (budget) => ({ categories: [...budget.categories, entry] }));

  const addCategories = (entries: CategoryEntry[]) =>
    patchBudget('add starter categories', (budget) => ({ categories: [...budget.categories, ...entries] }));

  const removeCategory = (index: number) =>
    activeBudget
      ? patchBudget(
          'remove category',
          (budget) => ({ categories: budget.categories.filter((_, entryIndex) => entryIndex !== index) }),
          activeBudget
        )
      : Promise.resolve(false);

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
      .then((deleted) => {
        if (deleted) setTransactions(withoutId(id));
        return deleted;
      })
      .catch((error) => {
        logFailure('delete transaction')(error);
        return false;
      });

  /** Saves a deleted transaction again (it gets a new id). */
  const restoreTransaction = (entry: Transaction) =>
    db
      .insertTransaction(entry.budgetMonth, entry.amount, entry.categoryName, entry.isNeed, entry.date, entry.note)
      .then((created) => {
        setTransactions((prev) => [created, ...prev]);
        return true;
      })
      .catch((error) => {
        logFailure('restore transaction')(error);
        return false;
      });

  const addDebt = (entry: NewDebt) =>
    db
      .insertDebt(entry.name, entry.balance, entry.annualRate, entry.minPayment, entry.categoryName, entry.dueDay)
      .then((created) => {
        setDebts((prev) => [created, ...prev]);
        return true;
      })
      .catch((error) => {
        logFailure('add debt')(error);
        return false;
      });

  const addBillTask = (title: string, firstStep: string, plannedDate: string) =>
    db
      .insertTask(title, 'pending', [{ label: firstStep, done: false }], plannedDate, null, 10, 'low')
      .then(() => true)
      .catch((error) => {
        logFailure('add bill task')(error);
        return false;
      });

  const removeDebt = (id: number) =>
    db
      .deleteDebt(id)
      .then((deleted) => {
        if (deleted) setDebts(withoutId(id));
        return deleted;
      })
      .catch((error) => {
        logFailure('delete debt')(error);
        return false;
      });

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
    restoreIncome: (budgetId: number, index: number, entry: IncomeEntry) => restoreLine('income', budgetId, index, entry),
    addCategory,
    addCategories,
    removeCategory,
    restoreCategory: (budgetId: number, index: number, entry: CategoryEntry) => restoreLine('categories', budgetId, index, entry),
    applyDiagnostic,
    addTransaction,
    removeTransaction,
    restoreTransaction,
    addDebt,
    addBillTask,
    removeDebt,
    restoreDebt: (entry: Debt) => addDebt(entry),
    deleteActiveBudget,
  };
};

export type BudgetData = ReturnType<typeof useBudgetData>;
