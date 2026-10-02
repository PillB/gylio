import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Budget, Transaction } from '../../../core/hooks/useDB';
import { useValidatedForm } from '../hooks/useValidatedForm';
import type { NewTransaction } from '../hooks/useBudgetData';
import { optionalText, parseNumber, validateTransaction, type TransactionFields } from '../utils/budgetValidation';
import { BudgetField, BudgetInput, PrimaryButton, RemovableRowList, SectionHeading, fieldStyle, stackStyle } from './BudgetControls';

const EMPTY_TRANSACTION: TransactionFields = { amount: '', categoryName: '', date: '', note: '' };

type Props = {
  activeBudget: Budget | null;
  monthTransactions: Transaction[];
  /** Called when someone logs spending before a budget month is open. */
  onMissingBudget: () => void;
  onAdd: (budget: Budget, entry: NewTransaction, isNeed: boolean) => Promise<boolean>;
  onRemove: (id: number) => void;
};

const TransactionSection: React.FC<Props> = ({ activeBudget, monthTransactions, onMissingBudget, onAdd, onRemove }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const validate = useCallback((values: TransactionFields) => validateTransaction(values, t), [t]);
  const form = useValidatedForm(EMPTY_TRANSACTION, validate);
  const categories = activeBudget?.categories ?? [];

  const handleAdd = () => {
    if (!form.submit()) return;
    if (!activeBudget) {
      onMissingBudget();
      return;
    }
    const { amount, categoryName, date, note } = form.values;
    const category = categories.find((entry) => entry.name === categoryName);
    if (!category) return;
    const entry = { amount: parseNumber(amount), categoryName, date, note: optionalText(note) };
    onAdd(activeBudget, entry, category.type === 'NEED').then((saved) => {
      if (saved) form.reset();
    });
  };

  return (
    <section data-tour="budget-transactions" style={stackStyle(theme)}>
      <SectionHeading
        tooltip={t(
          'tooltips.budget.transactions',
          'Log every expense or payment here. Each entry updates the category\'s actual total and keeps the spending chart in real time.'
        )}
      >
        {t('budget.transactionsHeading', 'Transactions')}
      </SectionHeading>
      <div style={stackStyle(theme)}>
        <BudgetInput
          type="number"
          label={t('amountLabel', 'Amount')}
          tooltip={t(
            'tooltips.budget.transactionAmount',
            'The actual amount you spent — not the planned budget. Enter what you really paid, to the cent. This is how the actual vs planned comparison stays honest.'
          )}
          value={form.values.amount}
          onChange={(value) => form.setField('amount', value)}
          error={form.errorFor('amount')}
        />
        <BudgetField
          label={t('categoryLabel', 'Category')}
          tooltip={t(
            'tooltips.budget.transactionCategory',
            'Assign this expense to a budget category so it counts against that category\'s planned limit. If the right category does not exist yet, add it in the Categories section above first.'
          )}
          error={form.errorFor('categoryName')}
        >
          <select
            value={form.values.categoryName}
            onChange={(event) => form.setField('categoryName', event.target.value)}
            style={fieldStyle(theme)}
          >
            <option value="">{t('budget.selectCategory', 'Select category')}</option>
            {categories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </BudgetField>
        <BudgetInput
          type="date"
          label={t('budget.transactionDateLabel', 'Date')}
          tooltip={t(
            'tooltips.budget.transactionDate',
            'When did this transaction happen? Use the actual purchase date, not when you noticed it on your bank statement. Accurate dates let you spot spending patterns day-by-day within the month.'
          )}
          value={form.values.date}
          onChange={(value) => form.setField('date', value)}
          error={form.errorFor('date')}
        />
        <BudgetInput
          label={t('notesLabel', 'Notes')}
          tooltip={t(
            'tooltips.budget.transactionNote',
            'Optional: a brief note about this purchase — e.g. "Dinner with family", "Amazon order #123", "Monthly gym fee". Helps you remember context when reviewing later. Leave blank if it is obvious.'
          )}
          value={form.values.note}
          onChange={(value) => form.setField('note', value)}
        />
        <PrimaryButton fitContent onClick={handleAdd}>
          {t('budget.addTransaction', 'Add transaction')}
        </PrimaryButton>
      </div>
      <RemovableRowList
        items={monthTransactions}
        emptyText={t('budget.emptyTransactions', 'No transactions yet.')}
        getKey={(entry) => entry.id}
        renderLabel={(entry) => (
          <>
            <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: theme.colors.text, whiteSpace: 'nowrap' }}>
                {entry.amount.toFixed(2)}
              </span>
              <span style={{ fontSize: '0.8125rem', color: theme.colors.muted, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {entry.categoryName}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: theme.colors.muted, marginTop: 2 }}>{entry.date}</div>
          </>
        )}
        onRemove={(entry) => onRemove(entry.id)}
      />
    </section>
  );
};

export default TransactionSection;
