import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Debt } from '../../../core/hooks/useDB';
import { useValidatedForm } from '../hooks/useValidatedForm';
import type { NewDebt } from '../hooks/useBudgetData';
import { optionalText, parseNumber, validateDebt, type DebtFields } from '../utils/budgetValidation';
import { BudgetInput, PrimaryButton, RemovableRowList, stackStyle } from './BudgetControls';
import PayoffPanel from './PayoffPanel';

const EMPTY_DEBT: DebtFields = { name: '', balance: '', annualRate: '', minPayment: '', categoryName: '' };

type Props = {
  debts: Debt[];
  extraPayment: number;
  onAdd: (entry: NewDebt) => Promise<boolean>;
  onRemove: (id: number) => void;
};

const toNewDebt = (values: DebtFields): NewDebt => ({
  name: values.name.trim(),
  balance: parseNumber(values.balance),
  annualRate: parseNumber(values.annualRate),
  minPayment: parseNumber(values.minPayment),
  categoryName: optionalText(values.categoryName),
});

const debtLabel = (entry: Debt) =>
  `${entry.name} · ${entry.balance.toFixed(2)} · ${entry.annualRate.toFixed(2)}% · ${entry.minPayment.toFixed(2)}`;

const DebtSection: React.FC<Props> = ({ debts, extraPayment, onAdd, onRemove }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const validate = useCallback((values: DebtFields) => validateDebt(values, t), [t]);
  const form = useValidatedForm(EMPTY_DEBT, validate);

  const handleAdd = () => {
    if (!form.submit()) return;
    onAdd(toNewDebt(form.values)).then((saved) => {
      if (saved) form.reset();
    });
  };

  const numberField = (name: 'balance' | 'annualRate' | 'minPayment', label: string) => (
    <BudgetInput
      type="number"
      label={label}
      value={form.values[name]}
      onChange={(value) => form.setField(name, value)}
      error={form.errorFor(name)}
    />
  );

  return (
    <section style={stackStyle(theme)}>
      <h3 style={{ margin: 0 }}>{t('budget.debtsHeading', 'Debts')}</h3>
      <div style={stackStyle(theme)}>
        <BudgetInput
          label={t('titleLabel', 'Title')}
          value={form.values.name}
          onChange={(value) => form.setField('name', value)}
          error={form.errorFor('name')}
        />
        {numberField('balance', t('budget.balanceLabel', 'Balance'))}
        {numberField('annualRate', t('budget.annualRateLabel', 'Annual rate (%)'))}
        {numberField('minPayment', t('budget.minPaymentLabel', 'Minimum payment'))}
        <BudgetInput
          label={t('budget.debtCategoryLabel', 'Linked category (optional)')}
          value={form.values.categoryName}
          onChange={(value) => form.setField('categoryName', value)}
        />
        <PrimaryButton fitContent onClick={handleAdd}>
          {t('budget.addDebt', 'Add debt')}
        </PrimaryButton>
      </div>
      <RemovableRowList
        items={debts}
        emptyText={t('budget.emptyDebts', 'No debts yet.')}
        getKey={(entry) => entry.id}
        renderLabel={debtLabel}
        onRemove={(entry) => onRemove(entry.id)}
      />
      <PayoffPanel debts={debts} extraPayment={extraPayment} />
    </section>
  );
};

export default DebtSection;
