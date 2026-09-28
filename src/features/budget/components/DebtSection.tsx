import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Debt } from '../../../core/hooks/useDB';
import { useValidatedForm } from '../hooks/useValidatedForm';
import type { NewDebt } from '../hooks/useBudgetData';
import { optionalText, parseNumber, validateDebt, type DebtFields } from '../utils/budgetValidation';
import { BudgetInput, PrimaryButton, RemovableRowList, SectionHeading, stackStyle } from './BudgetControls';
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

const DebtLabel: React.FC<{ entry: Debt }> = ({ entry }) => {
  const { theme } = useTheme();
  return (
    <>
      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: theme.colors.text, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        {entry.name}
      </div>
      <div style={{ fontSize: '0.8rem', color: theme.colors.muted, marginTop: 2, display: 'flex', gap: `${theme.spacing.sm}px`, flexWrap: 'wrap' }}>
        <span>{entry.balance.toFixed(2)}</span>
        <span>{entry.annualRate.toFixed(2)}%</span>
        <span>{entry.minPayment.toFixed(2)}</span>
      </div>
    </>
  );
};

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

  const numberField = (name: 'balance' | 'annualRate' | 'minPayment', label: string, tooltip: string, bottom = false) => (
    <BudgetInput
      type="number"
      label={label}
      tooltip={tooltip}
      tooltipPosition={bottom ? 'bottom' : undefined}
      value={form.values[name]}
      onChange={(value) => form.setField(name, value)}
      error={form.errorFor(name)}
    />
  );

  return (
    <section style={stackStyle(theme)}>
      <SectionHeading
        tooltip={t(
          'tooltips.budget.debts',
          'Track every loan and credit card. Knowing balance, interest rate, and minimum payment lets you build a real exit plan instead of just guessing.'
        )}
      >
        {t('budget.debtsHeading', 'Debts')}
      </SectionHeading>
      <div style={stackStyle(theme)}>
        <BudgetInput
          label={t('titleLabel', 'Title')}
          tooltip={t(
            'tooltips.budget.debtName',
            'Name this debt clearly so you can identify it at a glance — e.g. "Chase Visa", "Student Loan", "Car Finance". Use the lender name + account type for easy matching with your bank statements.'
          )}
          value={form.values.name}
          onChange={(value) => form.setField('name', value)}
          error={form.errorFor('name')}
        />
        {numberField(
          'balance',
          t('budget.balanceLabel', 'Balance'),
          t(
            'tooltips.budget.debtBalance',
            'Your current outstanding balance — not the original loan amount. Check your latest statement for the exact figure. This is the number the payoff calculator works from, so accuracy matters.'
          )
        )}
        {numberField(
          'annualRate',
          t('budget.annualRateLabel', 'Annual rate (%)'),
          t(
            'tooltips.budget.annualRate',
            'The yearly interest rate (APR) on this debt. Higher rates cost more over time — these are the debts to attack first if you use the Avalanche strategy.'
          ),
          true
        )}
        {numberField(
          'minPayment',
          t('budget.minPaymentLabel', 'Minimum payment'),
          t(
            'tooltips.budget.minPayment',
            'The minimum monthly payment to keep this account current. Always pay at least this. Your payoff strategy stacks extra on top.'
          ),
          true
        )}
        <BudgetInput
          label={t('budget.debtCategoryLabel', 'Linked category (optional)')}
          tooltipPosition="bottom"
          tooltip={t(
            'tooltips.budget.debtCategory',
            'Optionally link this debt to a DEBT-type budget category (e.g. "Chase Visa" debt linked to a "Credit Cards" category). This lets your transaction log flow into the payoff tracker automatically. Leave blank if you prefer to track debt separately.'
          )}
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
        renderLabel={(entry) => <DebtLabel entry={entry} />}
        onRemove={(entry) => onRemove(entry.id)}
      />
      <PayoffPanel debts={debts} extraPayment={extraPayment} />
    </section>
  );
};

export default DebtSection;
