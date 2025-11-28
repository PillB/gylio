import React from 'react';
import { useTranslation } from 'react-i18next';

const presets = [
  {
    key: 'adhd',
    features: ['chunking', 'timeboxing', 'stimBreaks']
  },
  {
    key: 'autism',
    features: ['predictableLayouts', 'quietAlerts', 'sensoryControl']
  },
  {
    key: 'dyslexia',
    features: ['dyslexiaFont', 'highContrast', 'ttsEnabled']
  }
];

/**
 * Presents ready-to-use presets for neurodivergent users. Each preset toggles a
 * short list of experience features.  Users can refine these later in Settings.
 */
export default function NeurodivergencePresets({ data, onUpdate }) {
  const { t } = useTranslation();

  const handleSelect = (presetKey) => {
    onUpdate({ ...data, preset: presetKey });
  };

  return (
    <div>
      <p>{t('onboarding.neuro.helper')}</p>
      <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '640px' }}>
        {presets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => handleSelect(preset.key)}
            aria-pressed={data.preset === preset.key}
            style={{
              border: data.preset === preset.key ? '2px solid #4b6bfb' : '1px solid #ccc',
              borderRadius: '12px',
              padding: '0.75rem',
              textAlign: 'left',
              backgroundColor: data.preset === preset.key ? '#eef2ff' : 'white'
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
              {t(`onboarding.neuro.presets.${preset.key}.title`)}
            </div>
            <p style={{ margin: 0 }}>
              {t(`onboarding.neuro.presets.${preset.key}.desc`)}
            </p>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
              {preset.features.map((feature) => (
                <li key={feature}>{t(`onboarding.neuro.features.${feature}`)}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}
