import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Budget } from '../../../core/hooks/useDB';
import { validateMonth } from '../utils/budgetValidation';
import { BudgetInput, PrimaryButton, SecondaryButton, SectionHeading, ToggleButton, stackStyle } from './BudgetControls';

type Props = {
  budgets: Budget[];
  activeBudget: Budget | null;
  monthInput: string;
  monthTouched: boolean;
  onMonthChange: (value: string) => void;
  onSelect: (budget: Budget) => void;
  /** Called when the month is valid; opens or creates that month's budget. */
  onOpen: () => void;
  onRevealErrors: () => void;
  onDelete: () => Promise<boolean>;
};

type ConfirmProps = { month: string; onConfirm: () => void; onCancel: () => void };

const DeleteConfirm: React.FC<ConfirmProps> = ({ month, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const prompt = t('budget.confirmDelete', { category: month });
  return (
    <div
      role="group"
      aria-label={prompt}
      style={{
        display: 'grid',
        gap: `${theme.spacing.xs}px`,
        padding: `${theme.spacing.xs}px`,
        borderRadius: theme.shape.radiusSm,
        border: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.surface,
      }}
    >
      <span>{prompt}</span>
      <div style={{ display: 'flex', gap: `${theme.spacing.xs}px`, flexWrap: 'wrap' }}>
        <PrimaryButton compact onClick={onConfirm}>
          {t('confirmLabel', 'Confirm')}
        </PrimaryButton>
        <SecondaryButton compact onClick={onCancel}>
          {t('cancelLabel', 'Cancel')}
        </SecondaryButton>
      </div>
    </div>
  );
};

const BudgetMonthSection: React.FC<Props> = ({
  budgets,
  activeBudget,
  monthInput,
  monthTouched,
  onMonthChange,
  onSelect,
  onOpen,
  onRevealErrors,
  onDelete,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const monthError = monthTouched ? validateMonth(monthInput, t) : '';
  const activeId = activeBudget?.id ?? null;

  // A pending delete confirmation never carries over to another month.
  useEffect(() => setConfirming(false), [activeId]);

  const handleOpen = () => {
    onRevealErrors();
    if (!validateMonth(monthInput, t)) onOpen();
  };

  return (
    <section data-tour="budget-month" style={stackStyle(theme)}>
      <SectionHeading
        tooltip={t(
          'tooltips.budget.month',
          'Each budget covers one calendar month (YYYY-MM format). Create a new one at the start of each period — or switch to past months to review history.'
        )}
      >
        {t('budget.monthHeading', 'Budget month')}
      </SectionHeading>
      <BudgetInput
        label={t('periodLabel', 'Period')}
        tooltip={t(
          'tooltips.budget.period',
          'Enter the month you want to budget for in YYYY-MM format (e.g. 2026-04 for April 2026). Each month is a fresh zero-based plan — your income and categories carry meaning within that window.'
        )}
        value={monthInput}
        onChange={onMonthChange}
        error={monthError}
      />
      {budgets.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${theme.spacing.xs}px` }}>
          {budgets.map((budget) => (
            <ToggleButton key={budget.id} selected={budget.id === activeId} onClick={() => onSelect(budget)}>
              {budget.month}
            </ToggleButton>
          ))}
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: `${theme.spacing.sm}px` }}>
        <PrimaryButton onClick={handleOpen}>{t('budget.openBudget', 'Open budget')}</PrimaryButton>
        {activeBudget && confirming ? (
          <DeleteConfirm month={activeBudget.month} onConfirm={onDelete} onCancel={() => setConfirming(false)} />
        ) : null}
        {activeBudget && !confirming ? (
          <SecondaryButton onClick={() => setConfirming(true)}>{t('deleteLabel', 'Delete')}</SecondaryButton>
        ) : null}
      </div>
    </section>
  );
};

export default BudgetMonthSection;
