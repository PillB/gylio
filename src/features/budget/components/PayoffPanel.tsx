import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Debt } from '../../../core/hooks/useDB';
import BudgetTooltip from '../../../components/atoms/BudgetTooltip';
import { buildPayoffComparison, type PayoffStrategy } from '../utils/debtPayoff';
import { ToggleButton } from './BudgetControls';

type Props = {
  debts: Debt[];
  /** Unallocated money that goes on top of the minimum payments. */
  extraPayment: number;
};

type Comparison = ReturnType<typeof buildPayoffComparison>;

const PayoffResult: React.FC<{ comparison: Comparison; strategy: PayoffStrategy; extraPayment: number }> = ({
  comparison,
  strategy,
  extraPayment,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const result = comparison[strategy];
  if (!result) {
    return <small>{t('budget.payoffEmpty', 'Add debts and minimum payments to simulate payoff.')}</small>;
  }
  const { SNOWBALL: snowball, AVALANCHE: avalanche } = comparison;
  const interest = result.totalInterest.toFixed(2);
  const extra = extraPayment.toFixed(2);
  return (
    <div style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
      {result.paidOff ? (
        <>
          <div>{t('budget.payoffTimeline', { months: result.months })}</div>
          <div>{t('budget.payoffInterest', { interest })}</div>
        </>
      ) : (
        <div>{t('budget.payoffInfeasible', 'Current payments are too low to pay this debt down.')}</div>
      )}
      <small>{t('budget.payoffExtraHint', { extra })}</small>
      {snowball && avalanche ? (
        <small>
          {t('budget.payoffCompare', { snowballMonths: snowball.months, avalancheMonths: avalanche.months })}
        </small>
      ) : null}
    </div>
  );
};

/** Snowball vs avalanche payoff projection for the saved debts. */
const PayoffPanel: React.FC<Props> = ({ debts, extraPayment }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [strategy, setStrategy] = useState<PayoffStrategy>('SNOWBALL');
  const comparison = useMemo(() => buildPayoffComparison(debts, extraPayment), [debts, extraPayment]);

  return (
    <div
      style={{
        display: 'grid',
        gap: `${theme.spacing.sm}px`,
        padding: `${theme.spacing.sm}px`,
        borderRadius: theme.shape.radiusSm,
        border: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.surface,
      }}
    >
      <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Each toggle stays next to its explanation when the row wraps. */}
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <ToggleButton selected={strategy === 'SNOWBALL'} onClick={() => setStrategy('SNOWBALL')}>
            {t('budget.snowballLabel', 'Snowball')}
          </ToggleButton>
          <BudgetTooltip
            content={t('budget.snowballExplain', 'Pay minimums on everything, throw every extra dollar at the smallest balance. Each debt cleared is a concrete win — and wins keep you going.')}
            position="top"
          />
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <ToggleButton selected={strategy === 'AVALANCHE'} onClick={() => setStrategy('AVALANCHE')}>
            {t('budget.avalancheLabel', 'Avalanche')}
          </ToggleButton>
          <BudgetTooltip
            content={t('budget.avalancheExplain', 'Pay minimums on everything, attack the highest interest rate first. Mathematically optimal — saves the most money over time.')}
            position="top"
          />
        </span>
      </div>
      <PayoffResult comparison={comparison} strategy={strategy} extraPayment={extraPayment} />
    </div>
  );
};

export default PayoffPanel;
