import React from 'react';
import PropTypes from 'prop-types';

function OnboardingSummary({ selections, t }) {
  const { accessibility, neurodivergence, quickSetup, tour } = selections;

  return (
    <aside
      aria-label={t('onboarding.summary.title')}
      style={{
        background: '#f7f8ff',
        border: '1px solid #e0e5ff',
        borderRadius: '12px',
        padding: '1rem',
        position: 'sticky',
        top: '1rem'
      }}
    >
      <h3 style={{ marginTop: 0 }}>{t('onboarding.summary.title')}</h3>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <div>
          <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>{t('onboarding.summary.accessibility')}</p>
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            <li>{t('onboarding.summary.textStyle', { value: accessibility.textStyle || '—' })}</li>
            <li>{t('onboarding.summary.contrast', { value: accessibility.contrast || '—' })}</li>
            <li>{t('onboarding.summary.motion', { value: accessibility.motion || '—' })}</li>
            <li>{t('onboarding.summary.tts', { value: accessibility.tts ? t('onboarding.summary.enabled') : t('onboarding.summary.disabled') })}</li>
          </ul>
        </div>

        <div>
          <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>{t('onboarding.summary.neurodivergence')}</p>
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            <li>{t('onboarding.summary.preset', { value: neurodivergence.preset || '—' })}</li>
            <li>
              {t('onboarding.summary.supports', {
                value:
                  neurodivergence.supports.length > 0
                    ? neurodivergence.supports.join(', ')
                    : t('onboarding.summary.none')
              })}
            </li>
          </ul>
        </div>

        <div>
          <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>{t('onboarding.summary.quickSetup')}</p>
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            <li>{t('onboarding.summary.goal', { value: quickSetup.starterGoal || '—' })}</li>
            <li>{t('onboarding.summary.budget', { value: quickSetup.monthlyBudget || '—' })}</li>
          </ul>
        </div>

        <div>
          <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>{t('onboarding.summary.tour')}</p>
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            <li>{t('onboarding.summary.reminders', { value: tour.reminders ? t('onboarding.summary.enabled') : t('onboarding.summary.disabled') })}</li>
            <li>{t('onboarding.summary.acknowledged', { value: tour.acknowledged ? t('onboarding.summary.yes') : t('onboarding.summary.no') })}</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}

OnboardingSummary.propTypes = {
  selections: PropTypes.shape({
    accessibility: PropTypes.object,
    neurodivergence: PropTypes.object,
    quickSetup: PropTypes.object,
    tour: PropTypes.object
  }).isRequired,
  t: PropTypes.func.isRequired
};

export default OnboardingSummary;
