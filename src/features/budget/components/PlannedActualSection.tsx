import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { TypeTotals } from '../utils/budgetTotals';
import { SectionHeading, stackStyle } from './BudgetControls';

type Props = { planned: TypeTotals; actual: TypeTotals };

type RowProps = { label: string; planned: number; actual: number; max: number };

const Bar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => {
  const { theme } = useTheme();
  return (
    <div
      style={{
        height: '8px',
        width: `${(value / max) * 100}%`,
        backgroundColor: color,
        borderRadius: theme.shape.radiusSm,
      }}
    />
  );
};

const PlannedActualRow: React.FC<RowProps> = ({ label, planned, actual, max }) => {
  const { theme } = useTheme();
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.sm }}>
        <span>{label}</span>
        <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
          {planned.toFixed(2)} / {actual.toFixed(2)}
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gap: `${theme.spacing.xs}px`,
          backgroundColor: theme.colors.surface,
          padding: `${theme.spacing.xs}px`,
          borderRadius: theme.shape.radiusSm,
        }}
      >
        <Bar value={planned} max={max} color={theme.colors.primary} />
        <Bar value={actual} max={max} color={theme.colors.accent} />
      </div>
    </div>
  );
};

/** Needs vs wants: planned (top bar) against actual (bottom bar), on one shared scale. */
const PlannedActualSection: React.FC<Props> = ({ planned, actual }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const max = Math.max(planned.NEED, planned.WANT, actual.NEED, actual.WANT, 1);
  return (
    <section style={stackStyle(theme)}>
      <SectionHeading
        tooltip={t(
          'tooltips.budget.plannedActual',
          'How close did reality match your plan? Use this to calibrate next month — consistently over on Wants? Move budget there deliberately next time.'
        )}
      >
        {t('budget.plannedActualHeading', 'Planned vs actual')}
      </SectionHeading>
      <div style={stackStyle(theme)}>
        <PlannedActualRow label={t('budget.needsLabel', 'Needs')} planned={planned.NEED} actual={actual.NEED} max={max} />
        <PlannedActualRow label={t('budget.wantsLabel', 'Wants')} planned={planned.WANT} actual={actual.WANT} max={max} />
      </div>
      <small>{t('budget.planActualHint', 'Top bar shows planned, bottom bar shows actual.')}</small>
    </section>
  );
};

export default PlannedActualSection;
