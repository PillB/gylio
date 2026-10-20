import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import FinancialDiagnostic, { type BudgetPrefillItem } from './FinancialDiagnostic';

type Props = {
  /** Resolves true once the diagnostic's plan was saved into the budget. */
  onApply: (items: BudgetPrefillItem[], monthlyIncome: number) => Promise<boolean>;
};

const DiagnosticToggle: React.FC<Props> = ({ onApply }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  const handleApply = (items: BudgetPrefillItem[], monthlyIncome: number) => {
    onApply(items, monthlyIncome).then((saved) => {
      if (saved) setOpen(false);
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
          borderRadius: theme.shape.radiusFull,
          border: `1.5px solid ${open ? theme.colors.primary : theme.colors.border}`,
          background: open ? `${theme.colors.primary}12` : 'transparent',
          color: open ? theme.colors.primary : theme.colors.muted,
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 600,
          fontFamily: theme.typography.body.family,
        }}
      >
        <span>📊</span>
        {open
          ? t('budget.hideDiagnostic', 'Hide financial check-up')
          : t('budget.showDiagnostic', 'Run financial check-up')}
      </button>
      {open && (
        <div style={{ marginTop: theme.spacing.sm }}>
          <FinancialDiagnostic theme={theme} onApply={handleApply} />
        </div>
      )}
    </div>
  );
};

export default DiagnosticToggle;
