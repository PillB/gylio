import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Accessibility preference step.
 * Collects baseline settings like font choice, high contrast, reduced motion and
 * TTS enablement. Validation only runs after the user edits a field to avoid
 * noisy startup errors.
 */
export default function AccessibilityPrefs({ data, onUpdate }) {
  const { t } = useTranslation();
  const [errors, setErrors] = useState({});

  const languages = useMemo(
    () => [
      { code: 'en', label: t('languages.english') },
      { code: 'es-PE', label: t('languages.spanish') }
    ],
    [t]
  );

  const handleChange = (field, value) => {
    const updates = { ...data, [field]: value };
    const nextErrors = validate(updates);
    setErrors(nextErrors);
    onUpdate(updates);
  };

  const validate = (values) => {
    const newErrors = {};
    if (!values.language) {
      newErrors.language = t('onboarding.validation.language');
    }
    return newErrors;
  };

  return (
    <div>
      <p>{t('onboarding.accessibility.helper')}</p>
      <div style={{ display: 'grid', gap: '0.5rem', maxWidth: '520px' }}>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={Boolean(data.highContrast)}
            onChange={(e) => handleChange('highContrast', e.target.checked)}
          />
          {t('onboarding.accessibility.highContrast')}
        </label>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={Boolean(data.reduceMotion)}
            onChange={(e) => handleChange('reduceMotion', e.target.checked)}
          />
          {t('onboarding.accessibility.reduceMotion')}
        </label>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={Boolean(data.dyslexiaFont)}
            onChange={(e) => handleChange('dyslexiaFont', e.target.checked)}
          />
          {t('onboarding.accessibility.dyslexiaFont')}
        </label>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={Boolean(data.ttsEnabled)}
            onChange={(e) => handleChange('ttsEnabled', e.target.checked)}
          />
          {t('onboarding.accessibility.ttsEnabled')}
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span>{t('onboarding.accessibility.language')}</span>
          <select
            value={data.language || 'en'}
            onChange={(e) => handleChange('language', e.target.value)}
            aria-label={t('onboarding.accessibility.language')}
            style={{ padding: '0.5rem' }}
          >
            {languages.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.language && (
            <span style={{ color: 'crimson' }}>{errors.language}</span>
          )}
        </label>
      </div>
    </div>
  );
}
