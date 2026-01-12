import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import { useTheme } from '../core/context/ThemeContext';
import SectionCard from './SectionCard.jsx';

const DEFAULT_CATEGORY_TYPE = 'NEED';
const CATEGORY_TYPES = ['NEED', 'WANT', 'GOAL', 'DEBT'];
const PAYOFF_STRATEGIES = {
  SNOWBALL: 'SNOWBALL',
  AVALANCHE: 'AVALANCHE',
};

const getDefaultMonth = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
};

const parseNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const BudgetView = () => {
  const { t } = useTranslation();
  const {
    ready,
    getBudgets,
    insertBudget,
    updateBudget,
    deleteBudget,
    getTransactions,
    insertTransaction,
    deleteTransaction,
    getDebts,
    insertDebt,
    deleteDebt,
  } = useDB();
  const { theme } = useTheme();

  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBudgetId, setActiveBudgetId] = useState(null);

  const [budgetMonthInput, setBudgetMonthInput] = useState(getDefaultMonth());
  const [monthTouched, setMonthTouched] = useState(false);

  const [incomeForm, setIncomeForm] = useState({ source: '', amount: '' });
  const [incomeTouched, setIncomeTouched] = useState({ source: false, amount: false });

  const [categoryForm, setCategoryForm] = useState({ name: '', type: DEFAULT_CATEGORY_TYPE, plannedAmount: '' });
  const [categoryTouched, setCategoryTouched] = useState({ name: false, type: false, plannedAmount: false });

  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    categoryName: '',
    date: '',
    note: '',
  });
  const [transactionTouched, setTransactionTouched] = useState({
    amount: false,
    categoryName: false,
    date: false,
  });

  const [debtForm, setDebtForm] = useState({
    name: '',
    balance: '',
    annualRate: '',
    minPayment: '',
    categoryName: '',
  });
  const [debtTouched, setDebtTouched] = useState({
    name: false,
    balance: false,
    annualRate: false,
    minPayment: false,
  });

  const [payoffStrategy, setPayoffStrategy] = useState(PAYOFF_STRATEGIES.SNOWBALL);

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
          setBudgetMonthInput(loadedBudgets[0].month);
        }
      })
      .catch((error) => {
        console.error('Failed to load budget data', error);
      })
      .finally(() => setLoading(false));
  }, [getBudgets, getDebts, getTransactions, ready]);

  useEffect(() => {
    if (!budgets.length) return;
    const matching = budgets.find((budget) => budget.month === budgetMonthInput);
    if (matching && matching.id !== activeBudgetId) {
      setActiveBudgetId(matching.id);
    }
  }, [activeBudgetId, budgetMonthInput, budgets]);

  const activeBudget = useMemo(
    () => budgets.find((budget) => budget.id === activeBudgetId) ?? null,
    [activeBudgetId, budgets]
  );

  const totalIncome = useMemo(
    () => activeBudget?.income.reduce((sum, entry) => sum + entry.amount, 0) ?? 0,
    [activeBudget]
  );

  const totalPlanned = useMemo(
    () => activeBudget?.categories.reduce((sum, entry) => sum + entry.plannedAmount, 0) ?? 0,
    [activeBudget]
  );

  const remaining = useMemo(() => totalIncome - totalPlanned, [totalIncome, totalPlanned]);

  const categoryLookup = useMemo(() => {
    const lookup = new Map();
    if (!activeBudget) return lookup;
    activeBudget.categories.forEach((category) => {
      lookup.set(category.name, category.type);
    });
    return lookup;
  }, [activeBudget]);

  const monthTransactions = useMemo(
    () =>
      activeBudget
        ? transactions.filter((transaction) => transaction.budgetMonth === activeBudget.month)
        : [],
    [activeBudget, transactions]
  );

  const plannedByType = useMemo(() => {
    const totals = { NEED: 0, WANT: 0, GOAL: 0, DEBT: 0 };
    if (!activeBudget) return totals;
    activeBudget.categories.forEach((category) => {
      totals[category.type] += category.plannedAmount;
    });
    return totals;
  }, [activeBudget]);

  const actualByType = useMemo(() => {
    const totals = { NEED: 0, WANT: 0, GOAL: 0, DEBT: 0 };
    monthTransactions.forEach((transaction) => {
      const type = categoryLookup.get(transaction.categoryName);
      if (!type) return;
      totals[type] += transaction.amount;
    });
    return totals;
  }, [categoryLookup, monthTransactions]);

  const validateMonth = useCallback(
    (value) => (!value.trim() ? t('validation.periodRequired') : ''),
    [t]
  );

  const validateIncome = useCallback(
    (fields) => {
      const validation = { source: '', amount: '' };
      if (!fields.source.trim()) {
        validation.source = t('validation.sourceRequired');
      }
      const amountValue = parseNumber(fields.amount);
      if (Number.isNaN(amountValue)) {
        validation.amount = t('validation.invalidNumber');
      } else if (amountValue <= 0) {
        validation.amount = t('validation.amountPositive');
      }
      return validation;
    },
    [t]
  );

  const validateCategory = useCallback(
    (fields) => {
      const validation = { name: '', type: '', plannedAmount: '' };
      if (!fields.name.trim()) {
        validation.name = t('validation.categoryRequired');
      }
      const amountValue = parseNumber(fields.plannedAmount);
      if (Number.isNaN(amountValue)) {
        validation.plannedAmount = t('validation.invalidNumber');
      } else if (amountValue <= 0) {
        validation.plannedAmount = t('validation.amountPositive');
      }
      if (!fields.type) {
        validation.type = t('validation.categoryRequired');
      }
      return validation;
    },
    [t]
  );

  const validateTransaction = useCallback(
    (fields) => {
      const validation = { amount: '', categoryName: '', date: '' };
      const amountValue = parseNumber(fields.amount);
      if (Number.isNaN(amountValue)) {
        validation.amount = t('validation.invalidNumber');
      } else if (amountValue <= 0) {
        validation.amount = t('validation.amountPositive');
      }
      if (!fields.categoryName.trim()) {
        validation.categoryName = t('validation.categoryRequired');
      }
      if (!fields.date) {
        validation.date = t('validation.invalidDateTime');
      }
      return validation;
    },
    [t]
  );

  const validateDebt = useCallback(
    (fields) => {
      const validation = { name: '', balance: '', annualRate: '', minPayment: '' };
      if (!fields.name.trim()) {
        validation.name = t('validation.titleRequired');
      }
      const balanceValue = parseNumber(fields.balance);
      const rateValue = parseNumber(fields.annualRate);
      const minPaymentValue = parseNumber(fields.minPayment);
      if (Number.isNaN(balanceValue)) {
        validation.balance = t('validation.invalidNumber');
      } else if (balanceValue < 0) {
        validation.balance = t('validation.nonNegativeNumber');
      }
      if (Number.isNaN(rateValue)) {
        validation.annualRate = t('validation.invalidNumber');
      } else if (rateValue < 0) {
        validation.annualRate = t('validation.nonNegativeNumber');
      }
      if (Number.isNaN(minPaymentValue)) {
        validation.minPayment = t('validation.invalidNumber');
      } else if (minPaymentValue <= 0) {
        validation.minPayment = t('validation.amountPositive');
      }
      return validation;
    },
    [t]
  );

  const monthValidation = useMemo(() => (monthTouched ? validateMonth(budgetMonthInput) : ''), [budgetMonthInput, monthTouched, validateMonth]);

  const incomeValidation = useMemo(
    () => (incomeTouched.source || incomeTouched.amount ? validateIncome(incomeForm) : { source: '', amount: '' }),
    [incomeForm, incomeTouched, validateIncome]
  );

  const categoryValidation = useMemo(
    () =>
      categoryTouched.name || categoryTouched.type || categoryTouched.plannedAmount
        ? validateCategory(categoryForm)
        : { name: '', type: '', plannedAmount: '' },
    [categoryForm, categoryTouched, validateCategory]
  );

  const transactionValidation = useMemo(
    () =>
      transactionTouched.amount || transactionTouched.categoryName || transactionTouched.date
        ? validateTransaction(transactionForm)
        : { amount: '', categoryName: '', date: '' },
    [transactionForm, transactionTouched, validateTransaction]
  );

  const debtValidation = useMemo(
    () =>
      debtTouched.name || debtTouched.balance || debtTouched.annualRate || debtTouched.minPayment
        ? validateDebt(debtForm)
        : { name: '', balance: '', annualRate: '', minPayment: '' },
    [debtForm, debtTouched, validateDebt]
  );

  const hasErrors = (validation) => Object.values(validation).some(Boolean);

  const ensureActiveBudget = useCallback(() => {
    if (activeBudget) return Promise.resolve(activeBudget);
    const trimmedMonth = budgetMonthInput.trim();
    if (!trimmedMonth) {
      setMonthTouched(true);
      return Promise.reject(new Error('Missing month'));
    }
    const existing = budgets.find((budget) => budget.month === trimmedMonth);
    if (existing) {
      setActiveBudgetId(existing.id);
      return Promise.resolve(existing);
    }
    return insertBudget(trimmedMonth, [], [])
      .then((created) => {
        setBudgets((prev) => [created, ...prev]);
        setActiveBudgetId(created.id);
        return created;
      })
      .catch((error) => {
        console.error('Failed to create budget', error);
        throw error;
      });
  }, [activeBudget, budgetMonthInput, budgets, insertBudget]);

  const handleAddIncome = () => {
    const validation = validateIncome(incomeForm);
    setIncomeTouched({ source: true, amount: true });

    if (hasErrors(validation)) return;

    ensureActiveBudget()
      .then((budget) => {
        const nextIncome = [...budget.income, { source: incomeForm.source.trim(), amount: parseNumber(incomeForm.amount) }];
        return updateBudget(budget.id, { income: nextIncome });
      })
      .then((updated) => {
        if (!updated) return;
        setBudgets((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
        setIncomeForm({ source: '', amount: '' });
        setIncomeTouched({ source: false, amount: false });
      })
      .catch((error) => {
        console.error('Failed to add income', error);
      });
  };

  const handleRemoveIncome = (index) => {
    if (!activeBudget) return;
    const nextIncome = activeBudget.income.filter((_, entryIndex) => entryIndex !== index);
    updateBudget(activeBudget.id, { income: nextIncome })
      .then((updated) => {
        if (!updated) return;
        setBudgets((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      })
      .catch((error) => {
        console.error('Failed to remove income', error);
      });
  };

  const handleAddCategory = () => {
    const validation = validateCategory(categoryForm);
    setCategoryTouched({ name: true, type: true, plannedAmount: true });

    if (hasErrors(validation)) return;

    ensureActiveBudget()
      .then((budget) => {
        const nextCategories = [
          ...budget.categories,
          {
            name: categoryForm.name.trim(),
            type: categoryForm.type,
            plannedAmount: parseNumber(categoryForm.plannedAmount),
          },
        ];
        return updateBudget(budget.id, { categories: nextCategories });
      })
      .then((updated) => {
        if (!updated) return;
        setBudgets((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
        setCategoryForm({ name: '', type: DEFAULT_CATEGORY_TYPE, plannedAmount: '' });
        setCategoryTouched({ name: false, type: false, plannedAmount: false });
      })
      .catch((error) => {
        console.error('Failed to add category', error);
      });
  };

  const handleRemoveCategory = (index) => {
    if (!activeBudget) return;
    const nextCategories = activeBudget.categories.filter((_, entryIndex) => entryIndex !== index);
    updateBudget(activeBudget.id, { categories: nextCategories })
      .then((updated) => {
        if (!updated) return;
        setBudgets((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      })
      .catch((error) => {
        console.error('Failed to remove category', error);
      });
  };

  const handleAddTransaction = () => {
    const validation = validateTransaction(transactionForm);
    setTransactionTouched({ amount: true, categoryName: true, date: true });

    if (hasErrors(validation)) return;

    if (!activeBudget) {
      setMonthTouched(true);
      return;
    }

    const selectedCategory = activeBudget.categories.find(
      (category) => category.name === transactionForm.categoryName
    );
    if (!selectedCategory) {
      setTransactionTouched((prev) => ({ ...prev, categoryName: true }));
      return;
    }

    insertTransaction(
      activeBudget.month,
      parseNumber(transactionForm.amount),
      transactionForm.categoryName,
      selectedCategory.type === 'NEED',
      transactionForm.date,
      transactionForm.note.trim() ? transactionForm.note.trim() : null
    )
      .then((created) => {
        setTransactions((prev) => [created, ...prev]);
        setTransactionForm({ amount: '', categoryName: '', date: '', note: '' });
        setTransactionTouched({ amount: false, categoryName: false, date: false });
      })
      .catch((error) => {
        console.error('Failed to add transaction', error);
      });
  };

  const handleRemoveTransaction = (id) => {
    deleteTransaction(id)
      .then((deleted) => {
        if (!deleted) return;
        setTransactions((prev) => prev.filter((entry) => entry.id !== id));
      })
      .catch((error) => {
        console.error('Failed to delete transaction', error);
      });
  };

  const handleAddDebt = () => {
    const validation = validateDebt(debtForm);
    setDebtTouched({ name: true, balance: true, annualRate: true, minPayment: true });

    if (hasErrors(validation)) return;

    insertDebt(
      debtForm.name.trim(),
      parseNumber(debtForm.balance),
      parseNumber(debtForm.annualRate),
      parseNumber(debtForm.minPayment),
      debtForm.categoryName.trim() ? debtForm.categoryName.trim() : null
    )
      .then((created) => {
        setDebts((prev) => [created, ...prev]);
        setDebtForm({ name: '', balance: '', annualRate: '', minPayment: '', categoryName: '' });
        setDebtTouched({ name: false, balance: false, annualRate: false, minPayment: false });
      })
      .catch((error) => {
        console.error('Failed to add debt', error);
      });
  };

  const handleRemoveDebt = (id) => {
    deleteDebt(id)
      .then((deleted) => {
        if (!deleted) return;
        setDebts((prev) => prev.filter((entry) => entry.id !== id));
      })
      .catch((error) => {
        console.error('Failed to delete debt', error);
      });
  };

  const handleDeleteBudget = () => {
    if (!activeBudget) return;
    const confirmed = window.confirm(t('budget.confirmDelete', { category: activeBudget.month }));
    if (!confirmed) return;
    deleteBudget(activeBudget.id)
      .then((deleted) => {
        if (!deleted) return;
        setBudgets((prev) => prev.filter((entry) => entry.id !== activeBudget.id));
        setActiveBudgetId(null);
      })
      .catch((error) => {
        console.error('Failed to delete budget', error);
      });
  };

  const simulatePayoff = useCallback(
    (items, strategy, extraPayment) => {
      const balances = items
        .filter((debt) => debt.balance > 0)
        .map((debt) => ({
          id: debt.id,
          balance: debt.balance,
          annualRate: debt.annualRate,
          minPayment: Math.max(0, debt.minPayment),
        }));

      const monthlyPayment = balances.reduce((sum, debt) => sum + debt.minPayment, 0) + extraPayment;
      if (balances.length === 0 || monthlyPayment <= 0) return null;

      const sortFn = strategy === PAYOFF_STRATEGIES.SNOWBALL
        ? (a, b) => a.balance - b.balance
        : (a, b) => b.annualRate - a.annualRate;

      let months = 0;
      let totalInterest = 0;
      const maxMonths = 600;

      while (months < maxMonths && balances.some((debt) => debt.balance > 0.01)) {
        balances.sort(sortFn);
        let available = monthlyPayment;

        balances.forEach((debt) => {
          if (debt.balance <= 0) return;
          const monthlyRate = debt.annualRate / 12 / 100;
          const interest = debt.balance * monthlyRate;
          debt.balance += interest;
          totalInterest += interest;
          const minPay = Math.min(debt.balance, debt.minPayment);
          debt.balance -= minPay;
          available -= minPay;
        });

        let index = 0;
        while (available > 0.01 && balances.some((debt) => debt.balance > 0.01)) {
          if (index >= balances.length) index = 0;
          const target = balances[index];
          if (target.balance > 0.01) {
            const payment = Math.min(target.balance, available);
            target.balance -= payment;
            available -= payment;
          }
          index += 1;
        }

        months += 1;
      }

      return { months, totalInterest };
    },
    []
  );

  const payoffResult = useMemo(() => {
    const extraPayment = Math.max(0, remaining);
    return simulatePayoff(debts, payoffStrategy, extraPayment);
  }, [debts, payoffStrategy, remaining, simulatePayoff]);

  const chartMax = Math.max(
    plannedByType.NEED,
    plannedByType.WANT,
    actualByType.NEED,
    actualByType.WANT,
    1
  );

  const renderBar = (value, color) => (
    <div
      style={{
        height: '8px',
        width: `${(value / chartMax) * 100}%`,
        backgroundColor: color,
        borderRadius: theme.shape.radiusSm,
      }}
    />
  );

  return (
    <SectionCard
      ariaLabel={`${t('budget.title')} module`}
      title={t('budget.title')}
      subtitle={t('budget.placeholder')}
    >
      {loading ? (
        <p>{t('loading') || 'Loading…'}</p>
      ) : (
        <div style={{ display: 'grid', gap: `${theme.spacing.lg}px` }}>
          <section style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
            <h3 style={{ margin: 0 }}>{t('budget.monthHeading') || 'Budget month'}</h3>
            <label>
              {t('periodLabel') || 'Period'}
              <input
                type="text"
                value={budgetMonthInput}
                onChange={(event) => {
                  setBudgetMonthInput(event.target.value);
                  setMonthTouched(true);
                }}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm}px`,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.shape.radiusSm,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  fontFamily: theme.typography.body.family,
                }}
              />
              {monthTouched && monthValidation ? (
                <span style={{ color: theme.colors.accent }}>{monthValidation}</span>
              ) : null}
            </label>
            {budgets.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${theme.spacing.xs}px` }}>
                {budgets.map((budget) => (
                  <button
                    key={budget.id}
                    type="button"
                    onClick={() => {
                      setActiveBudgetId(budget.id);
                      setBudgetMonthInput(budget.month);
                    }}
                    style={{
                      padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                      borderRadius: theme.shape.radiusSm,
                      border:
                        budget.id === activeBudgetId
                          ? `1px solid ${theme.colors.primary}`
                          : `1px solid ${theme.colors.border}`,
                      backgroundColor:
                        budget.id === activeBudgetId ? theme.colors.primary : theme.colors.background,
                      color:
                        budget.id === activeBudgetId ? theme.colors.background : theme.colors.text,
                      cursor: 'pointer',
                      fontFamily: theme.typography.body.family,
                    }}
                  >
                    {budget.month}
                  </button>
                ))}
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: `${theme.spacing.sm}px` }}>
              <button
                type="button"
                onClick={() => {
                  setMonthTouched(true);
                  if (monthValidation) return;
                  ensureActiveBudget().catch(() => undefined);
                }}
                style={{
                  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                  borderRadius: theme.shape.radiusSm,
                  border: `1px solid ${theme.colors.primary}`,
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background,
                  cursor: 'pointer',
                  fontFamily: theme.typography.body.family,
                }}
              >
                {t('budget.openBudget') || 'Open budget'}
              </button>
              {activeBudget ? (
                <button
                  type="button"
                  onClick={handleDeleteBudget}
                  style={{
                    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                    borderRadius: theme.shape.radiusSm,
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    cursor: 'pointer',
                    fontFamily: theme.typography.body.family,
                  }}
                >
                  {t('deleteLabel') || 'Delete'}
                </button>
              ) : null}
            </div>
          </section>

          <section style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
            <h3 style={{ margin: 0 }}>{t('budget.incomeHeading') || 'Income'}</h3>
            <div
              style={{
                padding: `${theme.spacing.sm}px`,
                borderRadius: theme.shape.radiusSm,
                backgroundColor: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
              }}
            >
              <div style={{ fontWeight: 600 }}>{t('budget.remainingLabel') || 'Remaining'}</div>
              <div style={{ color: remaining === 0 ? theme.colors.primary : theme.colors.accent }}>
                {remaining.toFixed(2)}
              </div>
              <small>{t('budget.remainingHint') || 'Remaining should reach 0 for a zero-based budget.'}</small>
            </div>
            <div style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
              <label>
                {t('budget.incomeSourceLabel') || 'Income source'}
                <input
                  type="text"
                  value={incomeForm.source}
                  onChange={(event) => {
                    setIncomeForm((prev) => ({ ...prev, source: event.target.value }));
                    setIncomeTouched((prev) => ({ ...prev, source: true }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                />
                {incomeTouched.source && incomeValidation.source ? (
                  <span style={{ color: theme.colors.accent }}>{incomeValidation.source}</span>
                ) : null}
              </label>
              <label>
                {t('budget.incomeAmountLabel') || 'Amount'}
                <input
                  type="number"
                  value={incomeForm.amount}
                  onChange={(event) => {
                    setIncomeForm((prev) => ({ ...prev, amount: event.target.value }));
                    setIncomeTouched((prev) => ({ ...prev, amount: true }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                />
                {incomeTouched.amount && incomeValidation.amount ? (
                  <span style={{ color: theme.colors.accent }}>{incomeValidation.amount}</span>
                ) : null}
              </label>
              <button
                type="button"
                onClick={handleAddIncome}
                style={{
                  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                  width: 'fit-content',
                  borderRadius: theme.shape.radiusSm,
                  border: `1px solid ${theme.colors.primary}`,
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background,
                  cursor: 'pointer',
                  fontFamily: theme.typography.body.family,
                }}
              >
                {t('budget.addIncome') || 'Add income'}
              </button>
            </div>
            {activeBudget?.income.length ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {activeBudget.income.map((entry, index) => (
                  <li
                    key={`${entry.source}-${index}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: `${theme.spacing.xs}px 0`,
                    }}
                  >
                    <span>
                      {entry.source}: {entry.amount.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveIncome(index)}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                        cursor: 'pointer',
                        fontFamily: theme.typography.body.family,
                      }}
                    >
                      {t('deleteLabel') || 'Delete'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t('budget.emptyIncome') || 'No income added yet.'}</p>
            )}
          </section>

          <section style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
            <h3 style={{ margin: 0 }}>{t('budget.categoryHeading') || 'Categories'}</h3>
            <div style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
              <label>
                {t('categoryLabel') || 'Category'}
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(event) => {
                    setCategoryForm((prev) => ({ ...prev, name: event.target.value }));
                    setCategoryTouched((prev) => ({ ...prev, name: true }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                />
                {categoryTouched.name && categoryValidation.name ? (
                  <span style={{ color: theme.colors.accent }}>{categoryValidation.name}</span>
                ) : null}
              </label>
              <label>
                {t('budget.categoryTypeLabel') || 'Type'}
                <select
                  value={categoryForm.type}
                  onChange={(event) => {
                    setCategoryForm((prev) => ({ ...prev, type: event.target.value }));
                    setCategoryTouched((prev) => ({ ...prev, type: true }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                >
                  {CATEGORY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`budget.categoryType.${type.toLowerCase()}`) || type}
                    </option>
                  ))}
                </select>
                {categoryTouched.type && categoryValidation.type ? (
                  <span style={{ color: theme.colors.accent }}>{categoryValidation.type}</span>
                ) : null}
              </label>
              <label>
                {t('budget.plannedAmountLabel') || 'Planned amount'}
                <input
                  type="number"
                  value={categoryForm.plannedAmount}
                  onChange={(event) => {
                    setCategoryForm((prev) => ({ ...prev, plannedAmount: event.target.value }));
                    setCategoryTouched((prev) => ({ ...prev, plannedAmount: true }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                />
                {categoryTouched.plannedAmount && categoryValidation.plannedAmount ? (
                  <span style={{ color: theme.colors.accent }}>{categoryValidation.plannedAmount}</span>
                ) : null}
              </label>
              <button
                type="button"
                onClick={handleAddCategory}
                style={{
                  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                  width: 'fit-content',
                  borderRadius: theme.shape.radiusSm,
                  border: `1px solid ${theme.colors.primary}`,
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background,
                  cursor: 'pointer',
                  fontFamily: theme.typography.body.family,
                }}
              >
                {t('budget.addCategory') || 'Add category'}
              </button>
            </div>
            {activeBudget?.categories.length ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {activeBudget.categories.map((entry, index) => (
                  <li
                    key={`${entry.name}-${index}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: `${theme.spacing.xs}px 0`,
                    }}
                  >
                    <span>
                      {entry.name} · {t(`budget.categoryType.${entry.type.toLowerCase()}`) || entry.type} ·{' '}
                      {entry.plannedAmount.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(index)}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                        cursor: 'pointer',
                        fontFamily: theme.typography.body.family,
                      }}
                    >
                      {t('deleteLabel') || 'Delete'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t('budget.emptyCategories') || 'No categories yet.'}</p>
            )}
          </section>

          <section style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
            <h3 style={{ margin: 0 }}>{t('budget.transactionsHeading') || 'Transactions'}</h3>
            <div style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
              <label>
                {t('amountLabel') || 'Amount'}
                <input
                  type="number"
                  value={transactionForm.amount}
                  onChange={(event) => {
                    setTransactionForm((prev) => ({ ...prev, amount: event.target.value }));
                    setTransactionTouched((prev) => ({ ...prev, amount: true }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                />
                {transactionTouched.amount && transactionValidation.amount ? (
                  <span style={{ color: theme.colors.accent }}>{transactionValidation.amount}</span>
                ) : null}
              </label>
              <label>
                {t('categoryLabel') || 'Category'}
                <select
                  value={transactionForm.categoryName}
                  onChange={(event) => {
                    setTransactionForm((prev) => ({ ...prev, categoryName: event.target.value }));
                    setTransactionTouched((prev) => ({ ...prev, categoryName: true }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                >
                  <option value="">{t('budget.selectCategory') || 'Select category'}</option>
                  {activeBudget?.categories.map((category) => (
                    <option key={category.name} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {transactionTouched.categoryName && transactionValidation.categoryName ? (
                  <span style={{ color: theme.colors.accent }}>{transactionValidation.categoryName}</span>
                ) : null}
              </label>
              <label>
                {t('budget.transactionDateLabel') || 'Date'}
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(event) => {
                    setTransactionForm((prev) => ({ ...prev, date: event.target.value }));
                    setTransactionTouched((prev) => ({ ...prev, date: true }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                />
                {transactionTouched.date && transactionValidation.date ? (
                  <span style={{ color: theme.colors.accent }}>{transactionValidation.date}</span>
                ) : null}
              </label>
              <label>
                {t('notesLabel') || 'Notes'}
                <input
                  type="text"
                  value={transactionForm.note}
                  onChange={(event) => {
                    setTransactionForm((prev) => ({ ...prev, note: event.target.value }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                />
              </label>
              <button
                type="button"
                onClick={handleAddTransaction}
                style={{
                  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                  width: 'fit-content',
                  borderRadius: theme.shape.radiusSm,
                  border: `1px solid ${theme.colors.primary}`,
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background,
                  cursor: 'pointer',
                  fontFamily: theme.typography.body.family,
                }}
              >
                {t('budget.addTransaction') || 'Add transaction'}
              </button>
            </div>
            {monthTransactions.length ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {monthTransactions.map((entry) => (
                  <li
                    key={entry.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: `${theme.spacing.xs}px 0`,
                    }}
                  >
                    <span>
                      {entry.amount.toFixed(2)} · {entry.categoryName} · {entry.date}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTransaction(entry.id)}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                        cursor: 'pointer',
                        fontFamily: theme.typography.body.family,
                      }}
                    >
                      {t('deleteLabel') || 'Delete'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t('budget.emptyTransactions') || 'No transactions yet.'}</p>
            )}
          </section>

          <section style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
            <h3 style={{ margin: 0 }}>{t('budget.plannedActualHeading') || 'Planned vs actual'}</h3>
            <div style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('budget.needsLabel') || 'Needs'}</span>
                  <span>
                    {plannedByType.NEED.toFixed(2)} / {actualByType.NEED.toFixed(2)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gap: `${theme.spacing.xs}px`,
                    backgroundColor: theme.colors.surface,
                    padding: `${theme.spacing.xs}px`,
                    borderRadius: theme.shape.radiusSm,
                  }}
                >
                  {renderBar(plannedByType.NEED, theme.colors.primary)}
                  {renderBar(actualByType.NEED, theme.colors.accent)}
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('budget.wantsLabel') || 'Wants'}</span>
                  <span>
                    {plannedByType.WANT.toFixed(2)} / {actualByType.WANT.toFixed(2)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gap: `${theme.spacing.xs}px`,
                    backgroundColor: theme.colors.surface,
                    padding: `${theme.spacing.xs}px`,
                    borderRadius: theme.shape.radiusSm,
                  }}
                >
                  {renderBar(plannedByType.WANT, theme.colors.primary)}
                  {renderBar(actualByType.WANT, theme.colors.accent)}
                </div>
              </div>
            </div>
            <small>{t('budget.planActualHint') || 'Top bar shows planned, bottom bar shows actual.'}</small>
          </section>

          <section style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
            <h3 style={{ margin: 0 }}>{t('budget.debtsHeading') || 'Debts'}</h3>
            <div style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
              <label>
                {t('titleLabel') || 'Title'}
                <input
                  type="text"
                  value={debtForm.name}
                  onChange={(event) => {
                    setDebtForm((prev) => ({ ...prev, name: event.target.value }));
                    setDebtTouched((prev) => ({ ...prev, name: true }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                />
                {debtTouched.name && debtValidation.name ? (
                  <span style={{ color: theme.colors.accent }}>{debtValidation.name}</span>
                ) : null}
              </label>
              <label>
                {t('budget.balanceLabel') || 'Balance'}
                <input
                  type="number"
                  value={debtForm.balance}
                  onChange={(event) => {
                    setDebtForm((prev) => ({ ...prev, balance: event.target.value }));
                    setDebtTouched((prev) => ({ ...prev, balance: true }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                />
                {debtTouched.balance && debtValidation.balance ? (
                  <span style={{ color: theme.colors.accent }}>{debtValidation.balance}</span>
                ) : null}
              </label>
              <label>
                {t('budget.annualRateLabel') || 'Annual rate (%)'}
                <input
                  type="number"
                  value={debtForm.annualRate}
                  onChange={(event) => {
                    setDebtForm((prev) => ({ ...prev, annualRate: event.target.value }));
                    setDebtTouched((prev) => ({ ...prev, annualRate: true }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                />
                {debtTouched.annualRate && debtValidation.annualRate ? (
                  <span style={{ color: theme.colors.accent }}>{debtValidation.annualRate}</span>
                ) : null}
              </label>
              <label>
                {t('budget.minPaymentLabel') || 'Minimum payment'}
                <input
                  type="number"
                  value={debtForm.minPayment}
                  onChange={(event) => {
                    setDebtForm((prev) => ({ ...prev, minPayment: event.target.value }));
                    setDebtTouched((prev) => ({ ...prev, minPayment: true }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                />
                {debtTouched.minPayment && debtValidation.minPayment ? (
                  <span style={{ color: theme.colors.accent }}>{debtValidation.minPayment}</span>
                ) : null}
              </label>
              <label>
                {t('budget.debtCategoryLabel') || 'Linked category (optional)'}
                <input
                  type="text"
                  value={debtForm.categoryName}
                  onChange={(event) => {
                    setDebtForm((prev) => ({ ...prev, categoryName: event.target.value }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                />
              </label>
              <button
                type="button"
                onClick={handleAddDebt}
                style={{
                  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                  width: 'fit-content',
                  borderRadius: theme.shape.radiusSm,
                  border: `1px solid ${theme.colors.primary}`,
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background,
                  cursor: 'pointer',
                  fontFamily: theme.typography.body.family,
                }}
              >
                {t('budget.addDebt') || 'Add debt'}
              </button>
            </div>
            {debts.length ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {debts.map((entry) => (
                  <li
                    key={entry.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: `${theme.spacing.xs}px 0`,
                    }}
                  >
                    <span>
                      {entry.name} · {entry.balance.toFixed(2)} · {entry.annualRate.toFixed(2)}% ·{' '}
                      {entry.minPayment.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDebt(entry.id)}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                        cursor: 'pointer',
                        fontFamily: theme.typography.body.family,
                      }}
                    >
                      {t('deleteLabel') || 'Delete'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t('budget.emptyDebts') || 'No debts yet.'}</p>
            )}
            <div
              style={{
                display: 'grid',
                gap: `${theme.spacing.sm}px`,
                padding: `${theme.spacing.sm}px`,
                borderRadius: theme.shape.radiusSm,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.surface,
              }}
            >
              <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setPayoffStrategy(PAYOFF_STRATEGIES.SNOWBALL)}
                  style={{
                    padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                    borderRadius: theme.shape.radiusSm,
                    border:
                      payoffStrategy === PAYOFF_STRATEGIES.SNOWBALL
                        ? `1px solid ${theme.colors.primary}`
                        : `1px solid ${theme.colors.border}`,
                    backgroundColor:
                      payoffStrategy === PAYOFF_STRATEGIES.SNOWBALL
                        ? theme.colors.primary
                        : theme.colors.background,
                    color:
                      payoffStrategy === PAYOFF_STRATEGIES.SNOWBALL
                        ? theme.colors.background
                        : theme.colors.text,
                    cursor: 'pointer',
                    fontFamily: theme.typography.body.family,
                  }}
                >
                  {t('budget.snowballLabel') || 'Snowball'}
                </button>
                <button
                  type="button"
                  onClick={() => setPayoffStrategy(PAYOFF_STRATEGIES.AVALANCHE)}
                  style={{
                    padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                    borderRadius: theme.shape.radiusSm,
                    border:
                      payoffStrategy === PAYOFF_STRATEGIES.AVALANCHE
                        ? `1px solid ${theme.colors.primary}`
                        : `1px solid ${theme.colors.border}`,
                    backgroundColor:
                      payoffStrategy === PAYOFF_STRATEGIES.AVALANCHE
                        ? theme.colors.primary
                        : theme.colors.background,
                    color:
                      payoffStrategy === PAYOFF_STRATEGIES.AVALANCHE
                        ? theme.colors.background
                        : theme.colors.text,
                    cursor: 'pointer',
                    fontFamily: theme.typography.body.family,
                  }}
                >
                  {t('budget.avalancheLabel') || 'Avalanche'}
                </button>
              </div>
              {payoffResult ? (
                <div>
                  <div>
                    {t('budget.payoffTimeline', { months: payoffResult.months }) ||
                      `Projected payoff: ${payoffResult.months} months`}
                  </div>
                  <div>
                    {t('budget.payoffInterest', { interest: payoffResult.totalInterest.toFixed(2) }) ||
                      `Estimated interest: ${payoffResult.totalInterest.toFixed(2)}`}
                  </div>
                  <small>
                    {t('budget.payoffExtraHint', { extra: Math.max(0, remaining).toFixed(2) }) ||
                      `Includes extra payment from remaining: ${Math.max(0, remaining).toFixed(2)}`}
                  </small>
                </div>
              ) : (
                <small>{t('budget.payoffEmpty') || 'Add debts and minimum payments to simulate payoff.'}</small>
              )}
            </div>
          </section>
        </div>
      )}
    </SectionCard>
  );
};

export default BudgetView;
