import React from 'react';
import PropTypes from 'prop-types';

const presets = ['adhd', 'asd', 'dyslexia', 'auditory'];

function NeurodivergencePresets({ data, onUpdate, t }) {
  const toggleSupport = (value) => {
    const alreadySelected = data.supports.includes(value);
    onUpdate({
      supports: alreadySelected
        ? data.supports.filter((support) => support !== value)
        : [...data.supports, value]
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h3 style={{ margin: '0 0 0.5rem' }}>{t('onboarding.neurodivergence.presetHeading')}</h3>
        <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {presets.map((presetKey) => {
            const isActive = data.preset === presetKey;
            return (
              <button
                key={presetKey}
                type="button"
                onClick={() => onUpdate({ preset: presetKey })}
                aria-pressed={isActive}
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: '10px',
                  border: isActive ? '2px solid #4b6bfb' : '1px solid #d6d8e2',
                  background: isActive ? '#eef2ff' : '#fff',
                  textAlign: 'left'
                }}
              >
                <strong>{t(`onboarding.neurodivergence.${presetKey}.title`)}</strong>
                <p style={{ margin: '0.25rem 0 0', color: '#444' }}>
                  {t(`onboarding.neurodivergence.${presetKey}.desc`)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 0.5rem' }}>{t('onboarding.neurodivergence.supportsHeading')}</h3>
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          {['focus', 'sensory', 'time', 'money'].map((support) => (
            <label key={support} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={data.supports.includes(support)}
                onChange={() => toggleSupport(support)}
              />
              <span>{t(`onboarding.neurodivergence.supports.${support}`)}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

NeurodivergencePresets.propTypes = {
  data: PropTypes.shape({
    preset: PropTypes.string,
    supports: PropTypes.arrayOf(PropTypes.string)
  }).isRequired,
  onUpdate: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
};

export default NeurodivergencePresets;
