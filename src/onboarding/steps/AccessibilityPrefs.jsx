import React from 'react';
import PropTypes from 'prop-types';
import useAccessibility from '../../core/hooks/useAccessibility';
import { useTheme } from '../../core/context/ThemeContext';

function AccessibilityPrefs({ data, onUpdate, t }) {
  const { theme, mode, setTheme } = useTheme();
  const {
    setTextStylePreference,
    setMotionPreference,
    setAnimationsEnabled,
    setTtsEnabled
  } = useAccessibility();

  const buttonStyle = (selected) => ({
    minHeight: 44,
    padding: '0.65rem 0.75rem',
    borderRadius: theme.shape.radiusSm,
    border: `${selected ? 2 : 1}px solid ${selected ? theme.colors.primary : theme.colors.borderStrong}`,
    background: selected ? theme.colors.overlay : theme.colors.surface,
    color: theme.colors.text,
    cursor: 'pointer',
    textAlign: 'left'
  });

  const selectTextStyle = (value) => setTextStylePreference(value);

  const selectContrast = (contrast) => {
    onUpdate({ contrast });
    if (contrast === 'high') {
      setTheme('highContrast');
    } else if (mode === 'highContrast') {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  };

  const selectMotion = (motion) => {
    setMotionPreference(motion);
    if (motion === 'reduced') setAnimationsEnabled(false);
    if (motion === 'standard') setAnimationsEnabled(true);
  };

  const choiceGroup = (label, options, selectedValue, onSelect) => (
    <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: theme.spacing.sm }}>
      <legend style={{ fontWeight: 700, padding: 0 }}>{label}</legend>
      <div style={{ display: 'grid', gap: theme.spacing.sm, gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))' }}>
        {options.map(({ value, label: optionLabel }) => (
          <button
            key={value}
            type="button"
            aria-pressed={selectedValue === value}
            onClick={() => onSelect(value)}
            style={buttonStyle(selectedValue === value)}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div style={{ display: 'grid', gap: theme.spacing.lg }}>
      <p style={{ margin: 0, color: theme.colors.text }}>{t('onboarding.accessibility.helper')}</p>

      {choiceGroup(
        t('onboarding.accessibility.textStyleLabel'),
        [
          { value: 'standard', label: t('onboarding.accessibility.standardText') },
          { value: 'large', label: t('onboarding.accessibility.largeText') },
          { value: 'spaced', label: t('onboarding.accessibility.spacedText') }
        ],
        data.textStyle,
        selectTextStyle
      )}
      <small style={{ color: theme.colors.muted }}>{t('onboarding.accessibility.textStyleHelper')}</small>

      {choiceGroup(
        t('onboarding.accessibility.contrastLabel'),
        [
          { value: 'balanced', label: t('onboarding.accessibility.balancedContrast') },
          { value: 'high', label: t('onboarding.accessibility.highContrast') }
        ],
        data.contrast,
        selectContrast
      )}
      <small style={{ color: theme.colors.muted }}>{t('onboarding.accessibility.contrastHelper')}</small>

      {choiceGroup(
        t('onboarding.accessibility.motionLabel'),
        [
          { value: 'system', label: t('onboarding.accessibility.motionSystem') },
          { value: 'reduced', label: t('onboarding.accessibility.reducedMotion') },
          { value: 'standard', label: t('onboarding.accessibility.standardMotion') }
        ],
        data.motion,
        selectMotion
      )}
      <small style={{ color: theme.colors.muted }}>{t('onboarding.accessibility.motionHelper')}</small>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
          minHeight: 44,
          cursor: 'pointer'
        }}
      >
        <input
          type="checkbox"
          checked={Boolean(data.tts)}
          onChange={(event) => setTtsEnabled(event.target.checked)}
          aria-label={t('onboarding.accessibility.tts')}
        />
        <span style={{ fontWeight: 600 }}>{t('onboarding.accessibility.tts')}</span>
      </label>
      <small style={{ color: theme.colors.muted }}>{t('onboarding.accessibility.ttsHelper')}</small>

      <details
        style={{
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.shape.radiusSm,
          padding: theme.spacing.md,
          background: theme.colors.background
        }}
      >
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('onboarding.accessibility.evidenceTitle')}</summary>
        <p style={{ margin: `${theme.spacing.sm}px 0 0`, color: theme.colors.muted }}>
          {t('onboarding.accessibility.evidenceBody')}
        </p>
      </details>
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
