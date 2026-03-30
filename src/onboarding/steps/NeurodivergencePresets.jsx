import React from 'react';
import PropTypes from 'prop-types';
import { PRESETS } from '../utils/neurodivergencePresets';
import { useTheme } from '../../core/context/ThemeContext';
import useAccessibility from '../../core/hooks/useAccessibility';

const PRESET_KEYS = /** @type {const} */ (['adhd', 'autism', 'anxiety', 'dyslexia']);

function NeurodivergencePresets({ data, onUpdate, t }) {
  const { theme, setTheme } = useTheme();
  const {
    setTextStylePreference,
    setMotionPreference,
    setAnimationsEnabled,
    setTtsEnabled
  } = useAccessibility();

  const handlePresetSelect = (key) => {
    const preset = PRESETS[key];

    // Update onboarding data
    onUpdate({ preset: key });

    // Apply accessibility preferences from preset
    setTextStylePreference(preset.textStyle);
    setMotionPreference(preset.motion);
    setAnimationsEnabled(preset.animations);
    setTtsEnabled(preset.tts);

    // Apply theme if the preset specifies one
    if (preset.theme) {
      setTheme(preset.theme);
    }
  };

  const handleSkip = () => {
    onUpdate({ preset: 'skip' });
  };

  const cardBase = {
    padding: '0.75rem',
    borderRadius: '10px',
    border: `1px solid ${theme.border ?? '#d6d8e2'}`,
    background: theme.surface ?? '#fff',
    textAlign: 'left',
    cursor: 'pointer',
    width: '100%',
    position: 'relative',
    transition: 'box-shadow 0.15s ease',
  };

  const cardActive = {
    border: `2px solid ${theme.primary ?? '#4b6bfb'}`,
    background: theme.primarySubtle ?? '#eef2ff',
    boxShadow: `0 0 0 3px ${theme.primarySubtle ?? '#eef2ff'}`,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ margin: 0, color: theme.textSecondary ?? '#4a4a4a' }}>
        {t('onboarding.neurodivergence.helper')}
      </p>

      <div>
        <h3 style={{ margin: '0 0 0.5rem', color: theme.text ?? '#111' }}>
          {t('onboarding.neurodivergence.presetHeading')}
        </h3>

        <div
          style={{
            display: 'grid',
            gap: '0.5rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
          }}
        >
          {PRESET_KEYS.map((key) => {
            const preset = PRESETS[key];
            const isSelected = data.preset === key;

            return (
              <button
                key={key}
                type="button"
                role="button"
                aria-pressed={isSelected}
                onClick={() => handlePresetSelect(key)}
                style={{
                  ...cardBase,
                  ...(isSelected ? cardActive : {})
                }}
              >
                {isSelected && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: theme.primary ?? '#4b6bfb',
                      background: theme.primarySubtle ?? '#eef2ff',
                      border: `1px solid ${theme.primary ?? '#4b6bfb'}`,
                      borderRadius: '4px',
                      padding: '0.1rem 0.35rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {t('onboarding.neurodivergence.appliedBadge', 'Settings applied \u2713')}
                  </span>
                )}

                <strong
                  style={{
                    display: 'block',
                    marginBottom: '0.3rem',
                    color: theme.text ?? '#111',
                    fontSize: '1rem',
                  }}
                >
                  {isSelected ? `\u2713 ${preset.label}` : preset.label}
                </strong>

                <p
                  style={{
                    margin: 0,
                    color: theme.textSecondary ?? '#555',
                    fontSize: '0.85rem',
                    lineHeight: 1.45,
                  }}
                >
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSkip}
        aria-pressed={data.preset === 'skip'}
        style={{
          alignSelf: 'flex-start',
          background: 'none',
          border: 'none',
          color: theme.textSecondary ?? '#666',
          cursor: 'pointer',
          fontSize: '0.9rem',
          padding: '0.25rem 0',
          textDecoration: data.preset === 'skip' ? 'underline' : 'none',
        }}
      >
        {t('onboarding.neurodivergence.skipManual', 'Skip / set manually')}
      </button>
    </div>
  );
}

NeurodivergencePresets.propTypes = {
  data: PropTypes.shape({
    preset: PropTypes.string,
  }).isRequired,
  onUpdate: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

export default NeurodivergencePresets;
