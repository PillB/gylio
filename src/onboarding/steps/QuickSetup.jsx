import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../../core/context/ThemeContext';

function QuickSetup({ data, onUpdate, t }) {
  const { theme } = useTheme();
  const hasGoal = Boolean(data.starterGoal?.trim());

  const inputStyle = {
    minHeight: 44,
    padding: '0.75rem',
    borderRadius: theme.shape.radiusSm,
    border: `1px solid ${theme.colors.borderStrong}`,
    background: theme.colors.surface,
    color: theme.colors.text,
    font: 'inherit'
  };

  return (
    <div style={{ display: 'grid', gap: theme.spacing.lg }}>
      <p style={{ margin: 0, color: theme.colors.text }}>{t('onboarding.quickSetup.helper')}</p>

      <label style={{ display: 'grid', gap: theme.spacing.xs }}>
        <span style={{ fontWeight: 600 }}>{t('onboarding.quickSetup.goalLabel')}</span>
        <textarea
          value={data.starterGoal}
          onChange={(event) => onUpdate({ starterGoal: event.target.value })}
          rows={3}
          placeholder={t('onboarding.quickSetup.goalPlaceholder')}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <small style={{ color: theme.colors.muted }}>{t('onboarding.quickSetup.goalHint')}</small>
      </label>

      {hasGoal && (
        <div
          aria-live="polite"
          style={{
            background: theme.colors.background,
            border: `1px dashed ${theme.colors.borderStrong}`,
            borderRadius: theme.shape.radiusSm,
            padding: theme.spacing.md
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>{t('onboarding.quickSetup.preview')}</p>
          <ul style={{ margin: `${theme.spacing.sm}px 0 0`, paddingLeft: '1.25rem', color: theme.colors.text }}>
            <li>{t('onboarding.quickSetup.previewTask', { goal: data.starterGoal.trim() })}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

QuickSetup.propTypes = {
  data: PropTypes.shape({
    starterGoal: PropTypes.string
  }).isRequired,
  onUpdate: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
};

export default QuickSetup;
