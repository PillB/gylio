import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Budget, Transaction } from '../../../core/hooks/useDB';
import { useValidatedForm } from '../hooks/useValidatedForm';
import type { NewTransaction } from '../hooks/useBudgetData';
import { optionalText, parseNumber, validateTransaction, type TransactionFields } from '../utils/budgetValidation';
import { BudgetField, BudgetInput, PrimaryButton, RemovableRowList, fieldStyle, stackStyle } from './BudgetControls';

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
    <section style={stackStyle(theme)}>
      <h3 style={{ margin: 0 }}>{t('budget.transactionsHeading', 'Transactions')}</h3>
      <div style={stackStyle(theme)}>
        <BudgetInput
          type="number"
          label={t('amountLabel', 'Amount')}
          value={form.values.amount}
          onChange={(value) => form.setField('amount', value)}
          error={form.errorFor('amount')}
        />
        <BudgetField label={t('categoryLabel', 'Category')} error={form.errorFor('categoryName')}>
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
        <BudgetInput label={t('notesLabel', 'Notes')} value={form.values.note} onChange={(value) => form.setField('note', value)} />
        <PrimaryButton fitContent onClick={handleAdd}>
          {t('budget.addTransaction', 'Add transaction')}
        </PrimaryButton>
      </div>
      <RemovableRowList
        items={monthTransactions}
        emptyText={t('budget.emptyTransactions', 'No transactions yet.')}
        getKey={(entry) => entry.id}
        renderLabel={(entry) => `${entry.amount.toFixed(2)} · ${entry.categoryName} · ${entry.date}`}
        onRemove={(entry) => onRemove(entry.id)}
      />
    </section>
  );
};

export default TransactionSection;
