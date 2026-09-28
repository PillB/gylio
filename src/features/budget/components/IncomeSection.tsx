import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { BudgetIncome } from '../../../core/hooks/useDB';
import BudgetTooltip from '../../../components/atoms/BudgetTooltip';
import { useValidatedForm } from '../hooks/useValidatedForm';
import { parseNumber, validateIncome, type IncomeFields } from '../utils/budgetValidation';
import { BudgetInput, PrimaryButton, RemovableRowList, stackStyle } from './BudgetControls';

const EMPTY_INCOME: IncomeFields = { source: '', amount: '' };

type Props = {
  income: BudgetIncome[];
  remaining: number;
  onAdd: (entry: BudgetIncome) => Promise<boolean>;
  onRemove: (index: number) => void;
};

const RemainingPanel: React.FC<{ remaining: number }> = ({ remaining }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <div
      style={{
        padding: `${theme.spacing.sm}px`,
        borderRadius: theme.shape.radiusSm,
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
        {t('budget.remainingLabel', 'Remaining')}
        <BudgetTooltip content={t('budget.remainingExplain', 'The gap between what you earn and what you\'ve allocated. Your goal: reach zero before the month ends — not by spending more, but by planning more.')} />
      </div>
      <div style={{ color: remaining === 0 ? theme.colors.primary : theme.colors.accent }}>{remaining.toFixed(2)}</div>
      <small>{t('budget.remainingHint', 'Remaining should reach 0 for a zero-based budget.')}</small>
    </div>
  );
};

const IncomeSection: React.FC<Props> = ({ income, remaining, onAdd, onRemove }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const validate = useCallback((values: IncomeFields) => validateIncome(values, t), [t]);
  const form = useValidatedForm(EMPTY_INCOME, validate);

  const handleAdd = () => {
    if (!form.submit()) return;
    onAdd({ source: form.values.source.trim(), amount: parseNumber(form.values.amount) }).then((saved) => {
      if (saved) form.reset();
    });
  };

  return (
    <section style={stackStyle(theme)}>
      <h3 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
        {t('budget.incomeHeading', 'Income')}
        <BudgetTooltip content={t('budget.zeroBasedExplain', 'Zero-based budgeting: give every dollar a job. When Remaining hits zero, every cent is intentional — that\'s the whole point.')} />
      </h3>
      <RemainingPanel remaining={remaining} />
      <div style={stackStyle(theme)}>
        <BudgetInput
          label={t('budget.incomeSourceLabel', 'Income source')}
          value={form.values.source}
          onChange={(value) => form.setField('source', value)}
          error={form.errorFor('source')}
        />
        <BudgetInput
          type="number"
          label={t('budget.incomeAmountLabel', 'Amount')}
          value={form.values.amount}
          onChange={(value) => form.setField('amount', value)}
          error={form.errorFor('amount')}
        />
        <PrimaryButton fitContent onClick={handleAdd}>
          {t('budget.addIncome', 'Add income')}
        </PrimaryButton>
      </div>
      <RemovableRowList
        items={income}
        emptyText={t('budget.emptyIncome', 'No income added yet.')}
        getKey={(entry, index) => `${entry.source}-${index}`}
        renderLabel={(entry) => `${entry.source}: ${entry.amount.toFixed(2)}`}
        onRemove={(_, index) => onRemove(index)}
      />
    </section>
  );
};

export default IncomeSection;
