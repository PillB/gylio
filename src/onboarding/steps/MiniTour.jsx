import React from 'react';
import PropTypes from 'prop-types';

function MiniTour({ data, onUpdate, t }) {
  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <p style={{ margin: 0, color: '#333' }}>{t('onboarding.tour.summary')}</p>
      <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#444' }}>
        <li>{t('onboarding.tour.items.tasks')}</li>
        <li>{t('onboarding.tour.items.calendar')}</li>
        <li>{t('onboarding.tour.items.budget')}</li>
        <li>{t('onboarding.tour.items.rewards')}</li>
      </ul>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={data.reminders}
          onChange={(e) => onUpdate({ reminders: e.target.checked })}
        />
        <span>{t('onboarding.tour.reminders')}</span>
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={data.acknowledged}
          onChange={(e) => onUpdate({ acknowledged: e.target.checked })}
        />
        <span>{t('onboarding.tour.acknowledge')}</span>
      </label>
    </div>
  );
}

MiniTour.propTypes = {
  data: PropTypes.shape({
    acknowledged: PropTypes.bool,
    reminders: PropTypes.bool
  }).isRequired,
  onUpdate: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
};

export default MiniTour;
