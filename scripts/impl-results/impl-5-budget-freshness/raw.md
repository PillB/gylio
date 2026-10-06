---FILE: src/features/budget/components/DataFreshnessBanner.jsx---
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import { track, Events } from '../../../core/analytics';

/**
 * Computes freshness level from a Date object.
 * Returns: 'fresh' | 'review' | 'stale'
 */
function computeFreshness(lastDate) {
  if (!lastDate) return 'stale';
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastMidnight = new Date(
    lastDate.getFullYear(),
    lastDate.getMonth(),
    lastDate.getDate(),
  );
  const diffDays = Math.round(
    (todayMidnight.getTime() - lastMidnight.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 1) return 'fresh';
  if (diffDays <= 7) return 'review';
  return 'stale';
}

/**
 * Formats a Date for human display, preferring relative labels.
 */
function formatLastUpdated(date, t) {
  if (!date) return t('budget.freshness.never', 'Never');
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastMidnight = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.round(
    (todayMidnight.getTime() - lastMidnight.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return t('budget.freshness.today', 'Today');
  if (diffDays === 1) return t('budget.freshness.yesterday', 'Yesterday');
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const FRESHNESS_CONFIG = {
  fresh: {
    labelKey: 'budget.freshness.upToDate',
    labelFallback: 'Up to date',
    icon: '✅',
    pillKey: 'budget.freshness.pillFresh',
    pillFallback: 'Fresh',
    colorKey: 'success',
    bgKey: 'successBg',
    textKey: 'successText',
    borderKey: 'success',
    defaultColor: '#16a34a',
    defaultBg: '#f0fdf4',
    defaultText: '#14532d',
  },
  review: {
    labelKey: 'budget.freshness.reviewSuggested',
    labelFallback: 'Review suggested',
    icon: '🟡',
    pillKey: 'budget.freshness.pillReview',
    pillFallback: 'Review',
    colorKey: 'warning',
    bgKey: 'warningBg',
    textKey: 'warningText',
    borderKey: 'warning',
    defaultColor: '#f59e0b',
    defaultBg: '#fff8e1',
    defaultText: '#92400e',
  },
  stale: {
    labelKey: 'budget.freshness.dataStale',
    labelFallback: 'Data may be stale',
    icon: '🔴',
    pillKey: 'budget.freshness.pillStale',
    pillFallback: 'Stale',
    colorKey: 'danger',
    bgKey: 'dangerBg',
    textKey: 'dangerText',
    borderKey: 'danger',
    defaultColor: '#dc2626',
    defaultBg: '#fef2f2',
    defaultText: '#7f1d1d',
  },
};

export default function DataFreshnessBanner({ lastTransactionDate, budgetMonthKey }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const freshness = useMemo(
    () => computeFreshness(lastTransactionDate),
    [lastTransactionDate],
  );

  const config = FRESHNESS_CONFIG[freshness];
  const label = t(config.labelKey, config.labelFallback);
  const pillLabel = t(config.pillKey, config.pillFallback);
  const lastUpdatedLabel = formatLastUpdated(lastTransactionDate, t);
  const colors = theme.colors ?? {};
  const spacing = theme.spacing ?? {};

  // Fire analytics when stale warning is shown
  useEffect(() => {
    if (freshness === 'stale') {
      track(Events.BUDGET_DATA_STALE_WARNING_SHOWN, {
        budgetMonthKey,
        lastTransactionDate: lastTransactionDate?.toISOString() ?? null,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshness, budgetMonthKey]);

  const borderColor = colors[config.borderKey] ?? config.defaultColor;
  const bgColor = colors[config.bgKey] ?? config.defaultBg;
  const textColor = colors[config.textKey] ?? config.defaultText;
  const accentColor = colors[config.colorKey] ?? config.defaultColor;

  return (
    <div
      role={freshness === 'stale' ? 'alert' : 'status'}
      aria-live={freshness === 'stale' ? 'assertive' : 'polite'}
      aria-label={`${t('budget.freshness.dataFreshnessLabel', 'Data freshness')}: ${label}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[1] ?? 4,
        padding: `${spacing[3] ?? 12}px ${spacing[4] ?? 16}px`,
        borderRadius: theme.shape?.borderRadius ?? 8,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
        marginBottom: spacing[3] ?? 12,
        boxShadow:
          freshness === 'stale'
            ? (theme.shadow?.sm ?? '0 1px 3px rgba(0,0,0,0.1)')
            : 'none',
      }}
    >
      {/* Status row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2] ?? 8,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>
          {config.icon}
        </span>

        <span
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: accentColor,
          }}
        >
          {label}
        </span>

        {/* Pill badge */}
        <span
          aria-hidden="true"
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 99,
            background: accentColor,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}
        >
          {pillLabel}
        </span>
      </div>

      {/* Last updated row */}
      <div style={{ fontSize: 13, opacity: 0.85 }}>
        {t('budget.freshness.lastUpdated', 'Last updated')}:{' '}
        <strong>{lastUpdatedLabel}</strong>
      </div>

      {/* Stale-only help text */}
      {freshness === 'stale' && (
        <div
          style={{
            marginTop: spacing[1] ?? 4,
            fontSize: 13,
            padding: `${spacing[2] ?? 8}px`,
            borderRadius: theme.shape?.borderRadius ?? 8,
            background: 'rgba(255,255,255,0.5)',
          }}
        >
          {t(
            'budget.freshness.staleHelp',
            "Your transaction data hasn't been updated in over a week. Please review and add any missing entries.",
          )}
        </div>
      )}
    </div>
  );
}
---END FILE---

---FILE: src/features/budget/components/ReconciliationChecklist.jsx---
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import { track, Events } from '../../../core/analytics';

const CHECKLIST_ITEMS = [
  {
    id: 'income',
    labelKey: 'budget.freshness.reconcile.income',
    labelFallback: 'Income recorded',
  },
  {
    id: 'expenses',
    labelKey: 'budget.freshness.reconcile.expenses',
    labelFallback: 'All expenses entered',
  },
  {
    id: 'balances',
    labelKey: 'budget.freshness.reconcile.balances',
    labelFallback: 'Balances match',
  },
];

function getStorageKey(budgetMonthKey) {
  return `gylio_reconcile_${budgetMonthKey}`;
}

function loadCheckedState(budgetMonthKey) {
  try {
    const raw = localStorage.getItem(getStorageKey(budgetMonthKey));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveCheckedState(budgetMonthKey, state) {
  try {
    localStorage.setItem(getStorageKey(budgetMonthKey), JSON.stringify(state));
  } catch {
    // localStorage unavailable — silently degrade
  }
}

export default function ReconciliationChecklist({ budgetMonthKey }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [checked, setChecked] = useState(() => loadCheckedState(budgetMonthKey));

  // Re-load when month key changes (e.g. navigating months)
  useEffect(() => {
    setChecked(loadCheckedState(budgetMonthKey));
  }, [budgetMonthKey]);

  // Persist whenever checked state changes
  useEffect(() => {
    saveCheckedState(budgetMonthKey, checked);
  }, [checked, budgetMonthKey]);

  const allChecked = useMemo(
    () => CHECKLIST_ITEMS.every((item) => checked[item.id] === true),
    [checked],
  );

  // Track "all confirmed" — fire exactly once per transition to allChecked=true
  const prevAllChecked = useRef(false);
  useEffect(() => {
    if (allChecked && !prevAllChecked.current) {
      track(Events.BUDGET_RECONCILIATION_CONFIRMED, { budgetMonthKey });
    }
    prevAllChecked.current = allChecked;
  }, [allChecked, budgetMonthKey]);

  const handleToggle = useCallback((id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleKeyToggle = useCallback(
    (e, id) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle(id);
      }
    },
    [handleToggle],
  );

  const completedCount = CHECKLIST_ITEMS.filter((item) => checked[item.id]).length;
  const colors = theme.colors ?? {};
  const spacing = theme.spacing ?? {};

  const borderColor = allChecked
    ? (colors.success ?? '#16a34a')
    : (colors.border ?? '#e2e8f0');

  const headerBg = allChecked
    ? (colors.successBg ?? '#f0fdf4')
    : (colors.surface ?? '#f8fafc');

  return (
    <section
      aria-label={t(
        'budget.freshness.reconcile.sectionLabel',
        'Reconciliation checklist',
      )}
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: theme.shape?.borderRadius ?? 8,
        marginBottom: spacing[3] ?? 12,
        overflow: 'hidden',
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* ── Collapsible header ────────────────────────────────── */}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="reconciliation-panel"
        onClick={() => setIsOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${spacing[3] ?? 12}px ${spacing[4] ?? 16}px`,
          background: headerBg,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: spacing[2] ?? 8,
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: spacing[2] ?? 8 }}
        >
          <span aria-hidden="true" style={{ fontSize: 16 }}>
            {allChecked ? '✅' : '📋'}
          </span>
          <span
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: allChecked
                ? (colors.success ?? '#16a34a')
                : (colors.text ?? '#1e293b'),
            }}
          >
            {t(
              'budget.freshness.reconcile.title',
              'Reconciliation Checklist',
            )}
          </span>
        </div>

        <div
          style={{ display: 'flex', alignItems: 'center', gap: spacing[2] ?? 8 }}
        >
          {/* Progress badge */}
          <span
            aria-label={t(
              'budget.freshness.reconcile.progressLabel',
              '{{completed}} of {{total}} completed',
              {
                completed: completedCount,
                total: CHECKLIST_ITEMS.length,
              },
            )}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: allChecked
                ? (colors.success ?? '#16a34a')
                : (colors.textSecondary ?? '#64748b'),
              background: allChecked
                ? (colors.successBg ?? '#f0fdf4')
                : (colors.surfaceAlt ?? '#f1f5f9'),
              padding: '2px 8px',
              borderRadius: 99,
              minWidth: 36,
              textAlign: 'center',
            }}
          >
            {completedCount}/{CHECKLIST_ITEMS.length}
          </span>

          {/* Chevron */}
          <span
            aria-hidden="true"
            style={{
              fontSize: 12,
              color: colors.textSecondary ?? '#64748b',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              display: 'inline-block',
            }}
          >
            ▼
          </span>
        </div>
      </button>

      {/* ── Panel body ───────────────────────────────────────── */}
      <div
        id="reconciliation-panel"
        role="region"
        aria-label={t(
          'budget.freshness.reconcile.sectionLabel',
          'Reconciliation checklist',
        )}
        hidden={!isOpen}
        style={{
          padding: isOpen
            ? `${spacing[3] ?? 12}px ${spacing[4] ?? 16}px`
            : 0,
          background: colors.background ?? '#ffffff',
          display: isOpen ? 'block' : 'none',
        }}
      >
        <p
          style={{
            margin: `0 0 ${spacing[3] ?? 12}px`,
            fontSize: 13,
            color: colors.textSecondary ?? '#64748b',
          }}
        >
          {t(
            'budget.freshness.reconcile.description',
            "Confirm each item to mark this month's budget as reconciled.",
          )}
        </p>

        <ul
          role="list"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing[2] ?? 8,
          }}
        >
          {CHECKLIST_ITEMS.map((item) => {
            const isChecked = !!checked[item.id];
            const checkboxId = `reconcile-${item.id}-${budgetMonthKey}`;

            return (
              <li key={item.id}>
                <label
                  htmlFor={checkboxId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[3] ?? 12,
                    cursor: 'pointer',
                    padding: `${spacing[2] ?? 8}px`,
                    borderRadius: theme.shape?.borderRadius ?? 8,
                    background: isChecked
                      ? (colors.successBg ?? '#f0fdf4')
                      : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    id={checkboxId}
                    checked={isChecked}
                    onChange={() => handleToggle(item.id)}
                    onKeyDown={(e) => handleKeyToggle(e, item.id)}
                    aria-checked={isChecked}
                    style={{
                      width: 18,
                      height: 18,
                      accentColor: colors.success ?? '#16a34a',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      color: isChecked
                        ? (colors.success ?? '#16a34a')
                        : (colors.text ?? '#1e293b'),
                      textDecoration: isChecked ? 'line-through' : 'none',
                      fontWeight: isChecked ? 400 : 500,
                      transition:
                        'color 0.15s ease, text-decoration 0.15s ease',
                    }}
                  >
                    {t(item.labelKey, item.labelFallback)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        {/* All-done celebration message */}
        {allChecked && (
          <div
            role="status"
            aria-live="polite"
            style={{
              marginTop: spacing[3] ?? 12,
              padding: `${spacing[2] ?? 8}px ${spacing[3] ?? 12}px`,
              borderRadius: theme.shape?.borderRadius ?? 8,
              background: colors.successBg ?? '#f0fdf4',
              color: colors.successText ?? '#14532d',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2] ?? 8,
            }}
          >
            <span aria-hidden="true">🎉</span>
            {t(
              'budget.freshness.reconcile.allDone',
              'All items confirmed — your budget is reconciled for this month.',
            )}
          </div>
        )}
      </div>
    </section>
  );
}
---END FILE---

---FILE: src/components/BudgetView.jsx---
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import useGamification from '../core/hooks/useGamification';
import useRewards from '../core/hooks/useRewards';
import { useTheme } from '../core/context/ThemeContext';
import { getDefaultBudgetMonth } from '../core/utils/date';
import SectionCard from './SectionCard.jsx';
import { buildPayoffComparison } from '../features/budget/utils/debtPayoff';
import SpendingChart from '../features/budget/components/SpendingChart';
import FinancialDiagnostic from '../features/budget/components/FinancialDiagnostic';
import BudgetTooltip from './atoms/BudgetTooltip';
import DataFreshnessBanner from '../features/budget/components/DataFreshnessBanner';
import ReconciliationChecklist from '../features/budget/components/ReconciliationChecklist';

const DEFAULT_CATEGORY_TYPE = 'NEED';
const CATEGORY_TYPES = ['NEED', 'WANT', 'GOAL', 'DEBT'];
const PAYOFF_STRATEGIES = {
  SNOWBALL: 'SNOWBALL',
  AVALANCHE: 'AVALANCHE',
};
const BUDGET_REVIEW_POINTS = 15;

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
  const { applyRewardsProgress } = useRewards();
  const { gamificationEnabled } = useGamification();
  const { theme } = useTheme();

  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBudgetId, setActiveBudgetId] = useState(null);

  const [budgetMonthInput, setBudgetMonthInput] = useState(getDefaultBudgetMonth());
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
  const [reviewLogged, setReviewLogged] = useState(false);
  const [budgetDeleteConfirm, setBudgetDeleteConfirm] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const handleApplyDiagnostic = useCallback((items, monthlyIncome) => {
    ensureActiveBudget()
      .then((budget) => {
        const nextIncome = [
          ...budget.income,
          { source: t('budget.monthlyTakeHome', 'Monthly take-home'), amount: monthlyIncome },
        ];
        const nextCategories = [
          ...budget.categories,
          ...items.map((item) => ({
            name: item.name,
            type: item.type,
            plannedAmount: item.amount,
          })),
        ];
        return updateBudget(budget.id, { income: nextIncome, categories: nextCategories });
      })
      .then((updated) => {
        if (!updated) return;
        setBudgets((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
        setShowDiagnostic(false);
      })
      .catch((error) => {
        console.error('Failed to apply diagnostic', error);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateBudget]);

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
    if (!reviewLogged) return undefined;
    const timerId = setTimeout(() => setReviewLogged(false), 2000);
    return () => clearTimeout(timerId);
  }, [reviewLogged]);

  useEffect(() => {
    setBudgetDeleteConfirm(false);
  }, [activeBudgetId]);

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

  // Actual spending per category name for progress bars
  const actualByCategory = useMemo(() => {
    const map = new Map();
    monthTransactions.forEach((tx) => {
      map.set(tx.categoryName, (map.get(tx.categoryName) ?? 0) + tx.amount);
    });
    return map;
  }, [monthTransactions]);

  const actualByType = useMemo(() => {
    const totals = { NEED: 0, WANT: 0, GOAL: 0, DEBT: 0 };
    monthTransactions.forEach((transaction) => {
      const type = categoryLookup.get(transaction.categoryName);
      if (!type) return;
      totals[type] += transaction.amount;
    });
    return totals;
  }, [categoryLookup, monthTransactions]);

  // ── Freshness: most-recent transaction date for the active month ───────────
  const lastTransactionDate = useMemo(() => {
    if (!monthTransactions.length) return null;
    const dates = monthTransactions
      .map((tx) => {
        const d = tx.date ? new Date(tx.date) : null;
        return d && !Number.isNaN(d.getTime()) ? d : null;
      })
      .filter(Boolean);
    if (!dates.length) return null;
    return new Date(Math.max(...dates.map((d) => d.getTime())));
  }, [monthTransactions]);

  // ── Proactive empty-month banner condition ─────────────────────────────────
  const currentMonthHasNoTransactions =
    activeBudget !== null && monthTransactions.length === 0 && !loading;

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
      const