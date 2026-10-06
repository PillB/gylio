import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../core/context/ThemeContext';
import SectionCard from './SectionCard.jsx';
import SpendingChart from '../features/budget/components/SpendingChart';
import DiagnosticToggle from '../features/budget/components/DiagnosticToggle';
import WeeklyReviewCard from '../features/budget/components/WeeklyReviewCard';
import BudgetMonthSection from '../features/budget/components/BudgetMonthSection';
import IncomeSection from '../features/budget/components/IncomeSection';
import CategorySection from '../features/budget/components/CategorySection';
import TransactionSection from '../features/budget/components/TransactionSection';
import PlannedActualSection from '../features/budget/components/PlannedActualSection';
import DebtSection from '../features/budget/components/DebtSection';
import DataFreshnessBanner from '../features/budget/components/DataFreshnessBanner';
import ReconciliationChecklist from '../features/budget/components/ReconciliationChecklist';
import { useLayoutVariant } from '../features/layoutVariants';
import { useBudgetData } from '../features/budget/hooks/useBudgetData';
import {
  actualByCategory,
  actualByType,
  buildSpendingBars,
  latestTransactionDate,
  plannedByType,
  sumIncome,
  sumPlanned,
  transactionsForMonth,
} from '../features/budget/utils/budgetTotals';

const NO_ENTRIES = [];

/** Two columns when there is room (≈ 2 × 380px), one column on phones; DOM order is the reading and tab order. */
const columnsStyle = {
  display: 'grid',
  gap: '24px',
  alignItems: 'start',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
};

/** Month-level totals derived from the open budget and its transactions. */
const useBudgetSummary = (activeBudget, transactions) =>
  useMemo(() => {
    const categories = activeBudget?.categories ?? NO_ENTRIES;
    const monthTransactions = activeBudget ? transactionsForMonth(transactions, activeBudget.month) : NO_ENTRIES;
    const remaining = sumIncome(activeBudget?.income ?? NO_ENTRIES) - sumPlanned(categories);
    return {
      monthTransactions,
      lastTransactionDate: latestTransactionDate(monthTransactions),
      remaining,
      spentByCategory: actualByCategory(monthTransactions),
      plannedTotals: plannedByType(categories),
      actualTotals: actualByType(categories, monthTransactions),
      spendingBars: buildSpendingBars(categories, monthTransactions),
    };
  }, [activeBudget, transactions]);

/** Freshness, an empty-month nudge, and the month-end reconciliation checklist. */
const MonthHealth = ({ budget, monthTransactions, lastTransactionDate }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <>
      <DataFreshnessBanner lastTransactionDate={lastTransactionDate} budgetMonthKey={budget.month} />
      {monthTransactions.length === 0 && (
        <p role="status" style={{ margin: 0, color: theme.colors.muted, fontSize: '0.875rem' }}>
          {t('budget.noTransactionsYet', 'No transactions recorded for {{month}} yet. Add your first expense below.', {
            month: budget.month,
          })}
        </p>
      )}
      <ReconciliationChecklist budgetMonthKey={budget.month} />
    </>
  );
};

/** A collapsed-by-default group for features most people reach later; the summary line says it is optional. */
const OptionalSection = ({ summary, startOpen, children }) => {
  const { theme } = useTheme();
  const [open, setOpen] = useState(startOpen);
  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} style={{ gridColumn: '1 / -1', minWidth: 0 }}>
      <summary
        style={{
          cursor: 'pointer',
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
          padding: `0 ${theme.spacing.md}px`,
          fontWeight: 600,
          color: theme.colors.text,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.shape.radiusMd,
          listStyle: 'none',
        }}
      >
        <span aria-hidden="true" style={{ color: theme.colors.primary }}>{open ? '▾' : '▸'}</span>
        {summary}
      </summary>
      <div style={{ paddingTop: theme.spacing.md }}>{children}</div>
    </details>
  );
};

const BudgetView = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const data = useBudgetData();
  const { activeBudget } = data;
  const summary = useBudgetSummary(activeBudget, data.transactions);
  const quickAddFirst = useLayoutVariant('budget_quick_add') === 'top';

  const applyDiagnostic = (items, monthlyIncome) =>
    data.applyDiagnostic(
      { source: t('budget.monthlyTakeHome', 'Monthly take-home'), amount: monthlyIncome },
      items.map((item) => ({ name: item.name, type: item.type, plannedAmount: item.amount }))
    );

  const chartBars = summary.spendingBars.map((bar) => ({
    label: t(`budget.categoryType.${bar.type.toLowerCase()}`, bar.type),
    colorKey: bar.type,
    planned: bar.planned,
    actual: bar.actual,
  }));

  const transactionSection = (
    <TransactionSection
      activeBudget={activeBudget}
      monthTransactions={summary.monthTransactions}
      onMissingBudget={() => data.setMonthTouched(true)}
      onAdd={data.addTransaction}
      onRemove={data.removeTransaction}
    />
  );

  return (
    <SectionCard ariaLabel={`${t('budget.title')} module`} title={t('budget.title')} subtitle={t('budget.placeholder')}>
      {data.loading ? (
        <p>{t('loading', 'Loading…')}</p>
      ) : (
        <div style={{ display: 'grid', gap: `${theme.spacing.lg}px`, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          {activeBudget && (
            <MonthHealth
              budget={activeBudget}
              monthTransactions={summary.monthTransactions}
              lastTransactionDate={summary.lastTransactionDate}
            />
          )}
          <DiagnosticToggle onApply={applyDiagnostic} />
          <WeeklyReviewCard />
          <BudgetMonthSection
            budgets={data.budgets}
            activeBudget={activeBudget}
            monthInput={data.monthInput}
            monthTouched={data.monthTouched}
            onMonthChange={data.changeMonth}
            onSelect={data.selectBudget}
            onOpen={() => data.ensureActiveBudget().catch(() => undefined)}
            onRevealErrors={() => data.setMonthTouched(true)}
            onDelete={data.deleteActiveBudget}
          />
          <div style={columnsStyle}>
            {quickAddFirst && transactionSection}
            <IncomeSection
              income={activeBudget?.income ?? NO_ENTRIES}
              remaining={summary.remaining}
              onAdd={data.addIncome}
              onRemove={data.removeIncome}
            />
            <div data-tour="budget-summary" style={{ display: 'grid', gap: `${theme.spacing.lg}px`, alignContent: 'start', minWidth: 0 }}>
              {activeBudget && <SpendingChart bars={chartBars} theme={theme} />}
              <PlannedActualSection planned={summary.plannedTotals} actual={summary.actualTotals} />
            </div>
            <CategorySection
              categories={activeBudget?.categories ?? NO_ENTRIES}
              spentByCategory={summary.spentByCategory}
              onAdd={data.addCategory}
              onAddMany={data.addCategories}
              onRemove={data.removeCategory}
            />
            {!quickAddFirst && transactionSection}
            <OptionalSection summary={t('budget.debtsOptional', 'Debt payoff (optional)')} startOpen={data.debts.length > 0}>
              <DebtSection
                debts={data.debts}
                extraPayment={Math.max(0, summary.remaining)}
                onAdd={data.addDebt}
                onRemove={data.removeDebt}
              />
            </OptionalSection>
          </div>
        </div>
      )}
    </SectionCard>
  );
};

export default BudgetView;
