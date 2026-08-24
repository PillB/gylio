import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../../core/context/ThemeContext';

function MiniTour({ t }) {
  const { theme } = useTheme();

  return (
    <div style={{ display: 'grid', gap: theme.spacing.md }}>
      <p style={{ margin: 0, color: theme.colors.text }}>{t('onboarding.tour.helper')}</p>
      <p style={{ margin: 0, color: theme.colors.muted }}>{t('onboarding.tour.summary')}</p>
      <ul style={{ margin: 0, paddingLeft: '1.25rem', color: theme.colors.text }}>
        <li>{t('onboarding.tour.items.tasks')}</li>
        <li>{t('onboarding.tour.items.calendar')}</li>
        <li>{t('onboarding.tour.items.budget')}</li>
        <li>{t('onboarding.tour.items.rewards')}</li>
      </ul>
      <p
        style={{
          margin: 0,
          padding: theme.spacing.md,
          borderRadius: theme.shape.radiusSm,
          background: theme.colors.background,
          color: theme.colors.muted,
          border: `1px solid ${theme.colors.border}`
        }}
      >
        {t('onboarding.tour.guideLater')}
      </p>
    </div>
  );
}

MiniTour.propTypes = {
  t: PropTypes.func.isRequired
};

export default MiniTour;
