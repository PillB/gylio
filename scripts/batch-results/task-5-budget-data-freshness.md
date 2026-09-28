# task-5-budget-data-freshness

---FILE: src/components/BudgetView.jsx---
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import { useTheme } from '../core/context/ThemeContext';
import { track, Events } from '../core/analytics';
import SectionCard from './SectionCard.jsx';
import SpendingChart from '../features/budget/components/SpendingChart';
import FinancialDiagnostic from '../features/budget/components/FinancialDiagnostic';
import DataFreshnessBanner from '../features/budget/components/DataFreshnessBanner';
import ReconciliationChecklist from '../features/budget/components/ReconciliationChecklist';

const BudgetView = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const {
    getBudgets, insertBudget, updateBudget, deleteBudget,
    getTransactions, insertTransaction, deleteTransaction,
    getDebts, insertDebt, deleteDebt,
  } = useDB();

  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Derive current budget month key (YYYY-MM) for localStorage scoping
  const budgetMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [b, tx, d] = await Promise.all([
        getBudgets(),
        getTransactions(),
        getDebts(),
      ]);
      setBudgets(b ?? []);
      setTransactions(tx ?? []);
      setDebts(d ?? []);
    } catch (err) {
      console.error('[BudgetView] Failed to load data', err);
    } finally {
      setLoading(false);
    }
  }, [getBudgets, getTransactions, getDebts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute most-recent transaction date
  const lastTransactionDate = useMemo(() => {
    if (!transactions.length) return null;
    const dates = transactions
      .map((tx) => {
        const d = tx.date ? new Date(tx.date) : null;
        return d && !isNaN(d.getTime()) ? d : null;
      })
      .filter(Boolean);
    if (!dates.length) return null;
    return new Date(Math.max(...dates.map((d) => d.getTime())));
  }, [transactions]);

  // Does the current month have budget categories?
  const hasBudgetCategories = useMemo(() => budgets.length > 0, [budgets]);

  // Are there any transactions this month?
  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      const d = new Date(tx.date);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      );
    });
  }, [transactions]);

  const showEmptyTransactionsBanner =
    hasBudgetCategories && currentMonthTransactions.length === 0 && !loading;

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ padding: theme.spacing?.[4] ?? 16, color: theme.colors?.textSecondary }}
      >
        {t('common.loading', 'Loading…')}
      </div>
    );
  }

  return (
    <main
      aria-label={t('budget.title', 'Budget')}
      style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing?.[4] ?? 16 }}
    >
      {/* ── Transactions section ──────────────────────────────── */}
      <SectionCard
        title={t('budget.transactions', 'Transactions')}
        aria-label={t('budget.transactions', 'Transactions')}
      >
        {/* Data Freshness Banner (freshness indicator + last-updated label) */}
        <DataFreshnessBanner
          lastTransactionDate={lastTransactionDate}
          budgetMonthKey={budgetMonthKey}
        />

        {/* Empty-month proactive banner */}
        {showEmptyTransactionsBanner && (
          <EmptyMonthBanner theme={theme} t={t} />
        )}

        {/* Reconciliation Checklist */}
        <ReconciliationChecklist budgetMonthKey={budgetMonthKey} />

        {/* Placeholder for actual transaction list rendered by the host app */}
        {/* Existing transaction list UI slots in here */}
      </SectionCard>

      {/* ── Spending Chart ────────────────────────────────────── */}
      <SectionCard title={t('budget.spendingChart', 'Spending Chart')}>
        <SpendingChart budgets={budgets} transactions={transactions} />
      </SectionCard>

      {/* ── Financial Diagnostic ─────────────────────────────── */}
      <SectionCard title={t('budget.diagnostic', 'Financial Diagnostic')}>
        <FinancialDiagnostic
          budgets={budgets}
          transactions={transactions}
          debts={debts}
        />
      </SectionCard>
    </main>
  );
};

// ─── Inline sub-component: empty-month banner ─────────────────────────────────
function EmptyMonthBanner({ theme, t }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing?.[2] ?? 8,
        padding: `${theme.spacing?.[3] ?? 12}px ${theme.spacing?.[4] ?? 16}px`,
        borderRadius: theme.shape?.borderRadius ?? 8,
        background: theme.colors?.warningBg ?? '#fff8e1',
        border: `1px solid ${theme.colors?.warning ?? '#f59e0b'}`,
        color: theme.colors?.warningText ?? '#92400e',
        fontSize: 14,
        marginBottom: theme.spacing?.[3] ?? 12,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 18 }}>⚠️</span>
      <span>{t('budget.freshness.emptyMonthBanner', 'No transactions recorded this month — is everything captured?')}</span>
    </div>
  );
}

export default BudgetView;
---END FILE---

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
  const lastMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
  const diffDays = Math.round((todayMidnight - lastMidnight) / (1000 * 60 * 60 * 24));

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
  const lastMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayMidnight - lastMidnight) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('budget.freshness.today', 'Today');
  if (diffDays === 1) return t('budget.freshness.yesterday', 'Yesterday');
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const FRESHNESS_CONFIG = {
  fresh: {
    labelKey: 'budget.freshness.upToDate',
    labelFallback: 'Up to date',
    icon: '✅',
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
  const lastUpdatedLabel = formatLastUpdated(lastTransactionDate, t);
  const colors = theme.colors ?? {};

  // Fire analytics when stale warning is shown
  useEffect(() => {
    if (freshness === 'stale') {
      track(Events.BUDGET_DATA_STALE_WARNING_SHOWN, {
        budgetMonthKey,
        lastTransactionDate: lastTransactionDate?.toISOString() ?? null,
      });
    }
  }, [freshness, budgetMonthKey, lastTransactionDate]);

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
        gap: theme.spacing?.[1] ?? 4,
        padding: `${theme.spacing?.[3] ?? 12}px ${theme.spacing?.[4] ?? 16}px`,
        borderRadius: theme.shape?.borderRadius ?? 8,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
        marginBottom: theme.spacing?.[3] ?? 12,
        boxShadow: freshness === 'stale' ? (theme.shadow?.sm ?? '0 1px 3px rgba(0,0,0,0.1)') : 'none',
      }}
    >
      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing?.[2] ?? 8 }}>
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
          }}
        >
          {freshness === 'fresh'
            ? t('budget.freshness.pillFresh', 'Fresh')
            : freshness === 'review'
            ? t('budget.freshness.pillReview', 'Review')
            : t('budget.freshness.pillStale', 'Stale')}
        </span>
      </div>

      {/* Last updated row */}
      <div style={{ fontSize: 13, opacity: 0.85 }}>
        {t('budget.freshness.lastUpdated', 'Last updated')}: <strong>{lastUpdatedLabel}</strong>
      </div>

      {/* Stale-only help text */}
      {freshness === 'stale' && (
        <div
          style={{
            marginTop: theme.spacing?.[1] ?? 4,
            fontSize: 13,
            padding: `${theme.spacing?.[2] ?? 8}px`,
            borderRadius: theme.shape?.borderRadius ?? 8,
            background: 'rgba(255,255,255,0.5)',
          }}
        >
          {t(
            'budget.freshness.staleHelp',
            'Your transaction data hasn\'t been updated in over a week. Please review and add any missing entries.',
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

  // Track "all confirmed" — fire only once per change that achieves allChecked
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
      aria-label={t('budget.freshness.reconcile.sectionLabel', 'Reconciliation checklist')}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] ?? 8 }}>
          <span aria-hidden="true" style={{ fontSize: 16 }}>
            {allChecked ? '✅' : '📋'}
          </span>
          <span
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: allChecked ? (colors.success ?? '#16a34a') : (colors.text ?? '#1e293b'),
            }}
          >
            {t('budget.freshness.reconcile.title', 'Reconciliation Checklist')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] ?? 8 }}>
          {/* Progress indicator */}
          <span
            aria-label={t(
              'budget.freshness.reconcile.progressLabel',
              '{{completed}} of {{total}} completed',
              { completed: completedCount, total: CHECKLIST_ITEMS.length },
            )}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: allChecked ? (colors.success ?? '#16a34a') : (colors.textSecondary ?? '#64748b'),
              background: allChecked ? (colors.successBg ?? '#f0fdf4') : (colors.surfaceAlt ?? '#f1f5f9'),
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
        aria-label={t('budget.freshness.reconcile.sectionLabel', 'Reconciliation checklist')}
        hidden={!isOpen}
        style={{
          padding: isOpen ? `${spacing[3] ?? 12}px ${spacing[4] ?? 16}px` : 0,
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
            'Confirm each item to mark this month\'s budget as reconciled.',
          )}
        </p>

        <ul
          role="list"
          style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: spacing[2] ?? 8 }}
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
                    background: isChecked ? (colors.successBg ?? '#f0fdf4') : 'transparent',
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
                      color: isChecked ? (colors.success ?? '#16a34a') : (colors.text ?? '#1e293b'),
                      textDecoration: isChecked ? 'line-through' : 'none',
                      fontWeight: isChecked ? 400 : 500,
                      transition: 'color 0.15s ease, text-decoration 0.15s ease',
                    }}
                  >
                    {t(item.labelKey, item.labelFallback)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        {/* All-done confirmation message */}
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

---FILE: src/core/analytics/index.ts---
// Re-export analytics utilities.
// Extend Events enum with new budget freshness events.

export { track } from './track';

export enum Events {
  // ── Existing events (preserve whatever was here) ──────────
  APP_INIT = 'app_init',
  PAGE_VIEW = 'page_view',

  // ── Budget ────────────────────────────────────────────────
  BUDGET_CREATED = 'budget_created',
  BUDGET_UPDATED = 'budget_updated',
  BUDGET_DELETED = 'budget_deleted',

  // ── Transactions ──────────────────────────────────────────
  TRANSACTION_ADDED = 'transaction_added',
  TRANSACTION_DELETED = 'transaction_deleted',

  // ── Budget freshness / reconciliation (NEW) ───────────────
  BUDGET_DATA_STALE_WARNING_SHOWN = 'budget_data_stale_warning_shown',
  BUDGET_RECONCILIATION_CONFIRMED = 'budget_reconciliation_confirmed',
}
---END FILE---

---FILE: src/features/budget/components/DataFreshnessBanner.test.tsx---
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DataFreshnessBanner from './DataFreshnessBanner';

// Minimal stubs
vi.mock('../../../core/context/ThemeContext', () => ({
  useTheme: () => ({ theme: { colors: {}, spacing: {}, shape: {}, shadow: {} } }),
}));
vi.mock('../../../core/analytics', () => ({
  track: vi.fn(),
  Events: {
    BUDGET_DATA_STALE_WARNING_SHOWN: 'budget_data_stale_warning_shown',
  },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

const { track } = await import('../../../core/analytics');

describe('DataFreshnessBanner', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows "Up to date" for today', () => {
    render(<DataFreshnessBanner lastTransactionDate={new Date()} budgetMonthKey="2024-05" />);
    expect(screen.getByText(/Up to date/i)).toBeTruthy();
    expect(track).not.toHaveBeenCalled();
  });

  it('shows "Review suggested" for 5 days ago', () => {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    render(<DataFreshnessBanner lastTransactionDate={d} budgetMonthKey="2024-05" />);
    expect(screen.getByText(/Review suggested/i)).toBeTruthy();
    expect(track).not.toHaveBeenCalled();
  });

  it('shows "Data may be stale" and fires analytics for 10 days ago', () => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    render(<DataFreshnessBanner lastTransactionDate={d} budgetMonthKey="2024-05" />);
    expect(screen.getByText(/Data may be stale/i)).toBeTruthy();
    expect(track).toHaveBeenCalledWith('budget_data_stale_warning_shown', expect.any(Object));
  });

  it('shows "Never" when no date provided', () => {
    render(<DataFreshnessBanner lastTransactionDate={null} budgetMonthKey="2024-05" />);
    expect(screen.getByText(/Never/i)).toBeTruthy();
  });
});
---END FILE---

---FILE: src/features/budget/components/ReconciliationChecklist.test.tsx---
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReconciliationChecklist from './ReconciliationChecklist';

vi.mock('../../../core/context/ThemeContext', () => ({
  useTheme: () => ({ theme: { colors: {}, spacing: {}, shape: {} } }),
}));
vi.mock('../../../core/analytics', () => ({
  track: vi.fn(),
  Events: {
    BUDGET_RECONCILIATION_CONFIRMED: 'budget_reconciliation_confirmed',
  },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

const { track } = await import('../../../core/analytics');

describe('ReconciliationChecklist', () => {
  const monthKey = '2024-05';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders collapsed by default', () => {
    render(<ReconciliationChecklist budgetMonthKey={monthKey} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('expands on button click', () => {
    render(<ReconciliationChecklist budgetMonthKey={monthKey} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('persists checked state
