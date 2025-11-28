import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Quick goal and budget capture. Validation runs after edits to avoid noisy
 * initial renders.
 */
export default function GoalBudgetSetup({ data, onUpdate }) {
  const { t } = useTranslation();
  const [touched, setTouched] = useState({});

  const errors = useMemo(() => validate(data, t), [data, t]);

  const handleChange = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const parsedValue = field === 'monthlyBudget' || field === 'savingsTarget'
      ? value.replace(/[^0-9.]/g, '')
      : value;
    onUpdate({ ...data, [field]: parsedValue });
  };

  const showError = (field) => touched[field] && errors[field];

  return (
    <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '520px' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span>{t('onboarding.goals.primaryGoal')}</span>
        <input
          type="text"
          value={data.primaryGoal || ''}
          onChange={(e) => handleChange('primaryGoal', e.target.value)}
          placeholder={t('onboarding.goals.primaryGoalPlaceholder')}
        />
        {showError('primaryGoal') && (
          <span style={{ color: 'crimson' }}>{errors.primaryGoal}</span>
        )}
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span>{t('onboarding.goals.monthlyBudget')}</span>
        <input
          type="text"
          inputMode="decimal"
          value={data.monthlyBudget || ''}
          onChange={(e) => handleChange('monthlyBudget', e.target.value)}
          placeholder="1250.00"
        />
        {showError('monthlyBudget') && (
          <span style={{ color: 'crimson' }}>{errors.monthlyBudget}</span>
        )}
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span>{t('onboarding.goals.savingsTarget')}</span>
        <input
          type="text"
          inputMode="decimal"
          value={data.savingsTarget || ''}
          onChange={(e) => handleChange('savingsTarget', e.target.value)}
          placeholder="200.00"
        />
        {showError('savingsTarget') && (
          <span style={{ color: 'crimson' }}>{errors.savingsTarget}</span>
        )}
      </label>
      <p style={{ margin: 0, color: '#444' }}>{t('onboarding.goals.helper')}</p>
    </div>
  );
}

function validate(values, t) {
  const errorMap = {};
  if (values.primaryGoal && values.primaryGoal.length > 120) {
    errorMap.primaryGoal = t('onboarding.validation.goalLength');
  }
  ['monthlyBudget', 'savingsTarget'].forEach((field) => {
    if (values[field]) {
      const numeric = Number(values[field]);
      if (Number.isNaN(numeric) || numeric < 0) {
        errorMap[field] = t('onboarding.validation.positiveNumber');
      }
    }
  });
  return errorMap;
}
