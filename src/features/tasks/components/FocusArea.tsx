import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import TaskHelp from './TaskHelp';

type Props = { timerRunning: boolean; focusMinutes: number };

/** Pomodoro hint below the list; points to the running timer's card when one is active. */
const FocusArea: React.FC<Props> = ({ timerRunning, focusMinutes }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  if (timerRunning) {
    return (
      <div
        role="region"
        aria-label={t('tasks.focusAreaAria')}
        style={{
          border: `1.5px solid ${theme.colors.primary}`,
          borderRadius: theme.shape.radiusMd,
          padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
          backgroundColor: theme.colors.surface,
        }}
      >
        <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.muted }}>
          {t('tasks.timerActiveTaskHint', 'Timer running — see task card above for controls.')}
        </p>
      </div>
    );
  }
  return (
    <div
      role="region"
      data-tour="task-pomodoro"
      aria-label={t('tasks.focusAreaAria')}
      style={{
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.shape.radiusMd,
        padding: `${theme.spacing.md}px`,
        backgroundColor: theme.colors.surface,
      }}
    >
      <p style={{ margin: '0 0 0.5rem', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
        {t('tasks.focusHeading')}
        <TaskHelp topic="timer" />
      </p>
      <p style={{ margin: '0 0 0.75rem', color: theme.colors.muted, fontSize: '0.875rem' }}>{t('tasks.focusHelper')}</p>
      <p style={{ margin: 0, color: theme.colors.muted, fontSize: '0.8125rem' }}>
        {t('tasks.timerStartHint', '▶ Tap "🍅 {{minutes}} min" on any task above to start a focused Pomodoro session.', { minutes: focusMinutes })}
      </p>
    </div>
  );
};

export default FocusArea;
