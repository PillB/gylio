import React from 'react';
import PropTypes from 'prop-types';

const buttonBase = {
  padding: '0.65rem 0.75rem',
  borderRadius: '10px',
  border: '1px solid #d6d8e2',
  background: '#fff',
  cursor: 'pointer',
  textAlign: 'left'
};

function AccessibilityPrefs({ data, onUpdate, t }) {
  const selectionButton = (value, label, field) => {
    const isActive = data[field] === value;
    return (
      <button
        type="button"
        onClick={() => onUpdate({ [field]: value })}
        style={{
          ...buttonBase,
          border: isActive ? '2px solid #4b6bfb' : buttonBase.border,
          background: isActive ? '#eef2ff' : '#fff'
        }}
        aria-pressed={isActive}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h3 style={{ margin: '0 0 0.5rem' }}>{t('onboarding.accessibility.readability')}</h3>
        <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {selectionButton('dyslexic', t('onboarding.accessibility.dyslexicFont'), 'textStyle')}
          {selectionButton('standard', t('onboarding.accessibility.standardFont'), 'textStyle')}
          {selectionButton('large', t('onboarding.accessibility.largeText'), 'textStyle')}
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 0.5rem' }}>{t('onboarding.accessibility.contrast')}</h3>
        <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {selectionButton('high', t('onboarding.accessibility.highContrast'), 'contrast')}
          {selectionButton('balanced', t('onboarding.accessibility.balancedContrast'), 'contrast')}
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 0.5rem' }}>{t('onboarding.accessibility.motion')}</h3>
        <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {selectionButton('reduced', t('onboarding.accessibility.reduceMotion'), 'motion')}
          {selectionButton('standard', t('onboarding.accessibility.allowMotion'), 'motion')}
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={data.tts}
          onChange={(e) => onUpdate({ tts: e.target.checked })}
        />
        <span>{t('onboarding.accessibility.tts')}</span>
      </label>
    </div>
  );
}

AccessibilityPrefs.propTypes = {
  data: PropTypes.shape({
    textStyle: PropTypes.string,
    contrast: PropTypes.string,
    motion: PropTypes.string,
    tts: PropTypes.bool
  }).isRequired,
  onUpdate: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
};

export default AccessibilityPrefs;
