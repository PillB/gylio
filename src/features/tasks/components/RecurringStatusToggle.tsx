import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import { track, Events } from '../../../core/analytics';
import { useRecurringReliability } from '../../recurring/useRecurringReliability';
import RecurringReliabilityPanel from '../../recurring/RecurringReliabilityPanel';
import TaskHelp from './TaskHelp';

/** "Reliability status" button that reveals how recurring tasks are holding up. */
const RecurringStatusToggle: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const reliability = useRecurringReliability();

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) track(Events.RECURRING_RELIABILITY_VIEWED);
  };

  return (
    <div style={{ marginBottom: `${theme.spacing.md}px` }}>
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        <button
          type="button"
          onClick={toggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
            minHeight: 44,
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
          <span>🔁</span>
          {open ? t('recurring.hidePanel', 'Hide reliability status') : t('recurring.showPanel', 'Reliability status')}
        </button>
        <TaskHelp topic="reliability" />
      </span>
      {open && (
        <div
          style={{
            marginTop: `${theme.spacing.sm}px`,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusMd,
            padding: `${theme.spacing.sm}px`,
            background: theme.colors.surface,
          }}
        >
          <RecurringReliabilityPanel
            rows={reliability.rows}
            lastGlobalCheckAt={reliability.lastGlobalCheckAt}
            isChecking={reliability.isChecking}
            isRepairing={reliability.isRepairing}
            onManualCheck={reliability.runCheck}
            onRepair={reliability.repair}
          />
        </div>
      )}
    </div>
  );
};

export default RecurringStatusToggle;
