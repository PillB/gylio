import React, { useMemo } from 'react';
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
import { useBudgetData } from '../features/budget/hooks/useBudgetData';
import {
  actualByCategory,
  actualByType,
  buildSpendingBars,
  plannedByType,
  sumIncome,
  sumPlanned,
  transactionsForMonth,
} from '../features/budget/utils/budgetTotals';

const NO_ENTRIES = [];

/** Month-level totals derived from the open budget and its transactions. */
const useBudgetSummary = (activeBudget, transactions) =>
  useMemo(() => {
    const categories = activeBudget?.categories ?? NO_ENTRIES;
    const monthTransactions = activeBudget ? transactionsForMonth(transactions, activeBudget.month) : NO_ENTRIES;
    const remaining = sumIncome(activeBudget?.income ?? NO_ENTRIES) - sumPlanned(categories);
    return {
      monthTransactions,
      remaining,
      spentByCategory: actualByCategory(monthTransactions),
      plannedTotals: plannedByType(categories),
      actualTotals: actualByType(categories, monthTransactions),
      spendingBars: buildSpendingBars(categories, monthTransactions),
    };
  }, [activeBudget, transactions]);

const BudgetView = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const data = useBudgetData();
  const { activeBudget } = data;
  const summary = useBudgetSummary(activeBudget, data.transactions);

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

  return (
    <SectionCard ariaLabel={`${t('budget.title')} module`} title={t('budget.title')} subtitle={t('budget.placeholder')}>
      {data.loading ? (
        <p>{t('loading', 'Loading…')}</p>
      ) : (
        <div style={{ display: 'grid', gap: `${theme.spacing.lg}px` }}>
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
          <IncomeSection
            income={activeBudget?.income ?? NO_ENTRIES}
            remaining={summary.remaining}
            onAdd={data.addIncome}
            onRemove={data.removeIncome}
          />
          {activeBudget && (
            <div style={{ margin: `${theme.spacing.md}px 0` }}>
              <SpendingChart bars={chartBars} theme={theme} />
            </div>
          )}
          <CategorySection
            categories={activeBudget?.categories ?? NO_ENTRIES}
            spentByCategory={summary.spentByCategory}
            onAdd={data.addCategory}
            onRemove={data.removeCategory}
          />
          <TransactionSection
            activeBudget={activeBudget}
            monthTransactions={summary.monthTransactions}
            onMissingBudget={() => data.setMonthTouched(true)}
            onAdd={data.addTransaction}
            onRemove={data.removeTransaction}
          />
          <PlannedActualSection planned={summary.plannedTotals} actual={summary.actualTotals} />
          <DebtSection
            debts={data.debts}
            extraPayment={Math.max(0, summary.remaining)}
            onAdd={data.addDebt}
            onRemove={data.removeDebt}
          />
        </div>
      )}
    </SectionCard>
  );
};

export default BudgetView;
