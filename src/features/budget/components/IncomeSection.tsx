import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { BudgetIncome } from '../../../core/hooks/useDB';
import BudgetTooltip from '../../../components/atoms/BudgetTooltip';
import { useValidatedForm } from '../hooks/useValidatedForm';
import { parseNumber, validateIncome, type IncomeFields } from '../utils/budgetValidation';
import { BudgetInput, PrimaryButton, RemovableRowList, SectionHeading, stackStyle } from './BudgetControls';

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
    <section data-tour="budget-income" style={stackStyle(theme)}>
      <SectionHeading tooltip={t('budget.zeroBasedExplain', 'Zero-based budgeting: give every dollar a job. When Remaining hits zero, every cent is intentional — that\'s the whole point.')}>
        {t('budget.incomeHeading', 'Income')}
      </SectionHeading>
      <RemainingPanel remaining={remaining} />
      <div style={stackStyle(theme)}>
        <BudgetInput
          label={t('budget.incomeSourceLabel', 'Income source')}
          tooltip={t(
            'tooltips.budget.incomeSource',
            'Name this income stream: e.g. "Main job", "Freelance", "Side hustle", "Rental income". Separate sources help you see which income is reliable and which is variable.'
          )}
          value={form.values.source}
          onChange={(value) => form.setField('source', value)}
          error={form.errorFor('source')}
        />
        <BudgetInput
          type="number"
          label={t('budget.incomeAmountLabel', 'Amount')}
          tooltip={t(
            'tooltips.budget.incomeAmount',
            'Enter your monthly take-home amount — after taxes and deductions. Use the actual number that hits your bank account, not the gross salary on your contract.'
          )}
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
        renderLabel={(entry) => (
          <>
            <div style={{ fontSize: '0.875rem', wordBreak: 'break-word', overflowWrap: 'anywhere', color: theme.colors.text }}>
              {entry.source}
            </div>
            <div style={{ fontSize: '0.8rem', color: theme.colors.muted, marginTop: 2 }}>{entry.amount.toFixed(2)}</div>
          </>
        )}
        onRemove={(_, index) => onRemove(index)}
      />
    </section>
  );
};

export default IncomeSection;
