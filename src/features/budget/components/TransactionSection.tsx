import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Budget, Transaction } from '../../../core/hooks/useDB';
import { useValidatedForm } from '../hooks/useValidatedForm';
import type { NewTransaction } from '../hooks/useBudgetData';
import { optionalText, parseMoney, validateTransaction, type TransactionFields } from '../utils/budgetValidation';
import { BudgetField, BudgetInput, PrimaryButton, RemovableRowList, SectionHeading, fieldStyle, stackStyle } from './BudgetControls';

const EMPTY_TRANSACTION: TransactionFields = { amount: '', categoryName: '', date: '', note: '' };

type Props = {
  activeBudget: Budget | null;
  monthTransactions: Transaction[];
  onAdd: (budget: Budget, entry: NewTransaction, isNeed: boolean) => Promise<boolean>;
  onRemove: (id: number) => void;
};

const TransactionSection: React.FC<Props> = ({ activeBudget, monthTransactions, onAdd, onRemove }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const validate = useCallback((values: TransactionFields) => validateTransaction(values, t), [t]);
  const form = useValidatedForm(EMPTY_TRANSACTION, validate);
  const categories = activeBudget?.categories ?? [];

  const handleAdd = () => {
    // The form is only shown once the open month has a category, so there is a budget to add to.
    if (!activeBudget || !form.submit()) return;
    const { amount, categoryName, date, note } = form.values;
    const category = categories.find((entry) => entry.name === categoryName);
    if (!category) return;
    const entry = { amount: parseMoney(amount), categoryName, date, note: optionalText(note) };
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
      {categories.length === 0 ? (
        // Every transaction needs a category, so the form cannot be completed before one exists.
        <p style={{ margin: 0, color: theme.colors.muted }}>{t('budget.transactionsNeedCategory')}</p>
      ) : (
        <div style={stackStyle(theme)}>
          <BudgetInput
            type="number"
            label={t('amountLabel', 'Amount')}
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
            value={form.values.date}
            onChange={(value) => form.setField('date', value)}
            error={form.errorFor('date')}
          />
          <BudgetInput
            label={t('notesLabel', 'Notes')}
            value={form.values.note}
            onChange={(value) => form.setField('note', value)}
          />
          <PrimaryButton fitContent onClick={handleAdd}>
            {t('budget.addTransaction', 'Add transaction')}
          </PrimaryButton>
        </div>
      )}
      {/* With no category, the line above already says why there is nothing here. */}
      {(categories.length > 0 || monthTransactions.length > 0) && (
        <RemovableRowList
          items={monthTransactions}
          emptyText={t('budget.emptyTransactions', 'No transactions yet.')}
          getKey={(entry) => entry.id}
          getName={(entry) => `${entry.note?.trim() || entry.categoryName} ${entry.amount.toFixed(2)}`}
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
      )}
    </section>
  );
};

export default TransactionSection;
