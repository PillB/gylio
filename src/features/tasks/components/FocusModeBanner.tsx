import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';

type Props = { limit: number; total: number; expanded: boolean; onToggle: () => void };

/** Shown when Today has more tasks than the focus limit; lets the person reveal the rest. */
const FocusModeBanner: React.FC<Props> = ({ limit, total, expanded, onToggle }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <div
      style={{
        padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
        borderRadius: theme.shape.radiusMd,
        background: `${theme.colors.primary}10`,
        border: `1px solid ${theme.colors.primary}25`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
        fontSize: 13,
        fontFamily: theme.typography.body.family,
      }}
    >
      <span style={{ color: theme.colors.muted }}>
        🎯 <strong style={{ color: theme.colors.text }}>{t('tasks.focusModeLabel', 'Focus mode:')}</strong>{' '}
        {t('tasks.focusModeSummary', 'Showing your top {{count}} tasks to reduce visual load.', { count: limit })}
      </span>
      <button
        type="button"
        onClick={onToggle}
        style={{
          background: 'transparent',
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.shape.radiusFull,
          padding: '2px 10px',
          fontSize: 12,
          color: theme.colors.muted,
          cursor: 'pointer',
          fontFamily: theme.typography.body.family,
          flexShrink: 0,
        }}
      >
        {expanded
          ? t('tasks.focusModeShowLess', 'Show less')
          : t('tasks.focusModeShowAll', 'Show all {{count}}', { count: total })}
      </button>
    </div>
  );
};

export default FocusModeBanner;
