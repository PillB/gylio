import React from 'react';
import PropTypes from 'prop-types';

function QuickSetup({ data, onUpdate, t }) {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div>
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 600 }}>{t('onboarding.quickSetup.goalLabel')}</span>
          <textarea
            value={data.starterGoal}
            onChange={(e) => onUpdate({ starterGoal: e.target.value })}
            rows={3}
            placeholder={t('onboarding.quickSetup.goalPlaceholder')}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #d6d8e2',
              resize: 'vertical'
            }}
          />
          <small style={{ color: '#666' }}>{t('onboarding.quickSetup.goalHint')}</small>
        </label>
      </div>

      <div>
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 600 }}>{t('onboarding.quickSetup.budgetLabel')}</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={data.monthlyBudget}
            onChange={(e) => onUpdate({ monthlyBudget: e.target.value })}
            placeholder={t('onboarding.quickSetup.budgetPlaceholder')}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #d6d8e2'
            }}
          />
          <small style={{ color: '#666' }}>{t('onboarding.quickSetup.budgetHint')}</small>
        </label>
      </div>

      <div style={{ background: '#f7f8ff', border: '1px dashed #cdd6ff', borderRadius: '10px', padding: '0.75rem' }}>
        <p style={{ margin: 0 }}>{t('onboarding.quickSetup.preview')}</p>
        <ul style={{ margin: '0.5rem 0 0 1rem', color: '#333' }}>
          <li>{t('onboarding.quickSetup.previewTasks', { goal: data.starterGoal || '…' })}</li>
          <li>{t('onboarding.quickSetup.previewBudget', { budget: data.monthlyBudget || '0' })}</li>
        </ul>
      </div>
    </div>
  );
}

QuickSetup.propTypes = {
  data: PropTypes.shape({
    starterGoal: PropTypes.string,
    monthlyBudget: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }).isRequired,
  onUpdate: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
};

export default QuickSetup;
