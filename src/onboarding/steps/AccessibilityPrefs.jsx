import React from 'react';
import PropTypes from 'prop-types';
import useAccessibility from '../../core/hooks/useAccessibility';
import { useTheme } from '../../core/context/ThemeContext';

const PRE_HIGH_CONTRAST_THEME_KEY = 'accessibility:themeBeforeHighContrast';

const readPreviousTheme = () => {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage?.getItem(PRE_HIGH_CONTRAST_THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
};

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
    minWidth: 0,
    padding: '0.5rem 0.6rem',
    borderRadius: theme.shape.radiusSm,
    border: `${selected ? 2 : 1}px solid ${selected ? theme.colors.primary : theme.colors.borderStrong}`,
    background: selected ? theme.colors.overlay : theme.colors.surface,
    color: theme.colors.text,
    cursor: 'pointer',
    textAlign: 'left',
    lineHeight: 1.25,
    overflowWrap: 'anywhere'
  });

  const selectTextStyle = (value) => setTextStylePreference(value);

  const selectContrast = (contrast) => {
    onUpdate({ contrast });

    if (contrast === 'high') {
      if (typeof window !== 'undefined' && (mode === 'light' || mode === 'dark')) {
        window.localStorage?.setItem(PRE_HIGH_CONTRAST_THEME_KEY, mode);
      }
      setTheme('highContrast');
      return;
    }

    if (mode === 'highContrast') {
      const previousTheme = readPreviousTheme();
      if (previousTheme) {
        setTheme(previousTheme);
        return;
      }

      const prefersDark =
        typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  };

  const selectMotion = (motion) => {
    setMotionPreference(motion);
    // "Follow my device" delegates the effective reduction to the operating
    // system; the explicit animation switch therefore returns to enabled.
    // Choosing reduced motion intentionally disables non-essential animation.
    setAnimationsEnabled(motion !== 'reduced');
  };

  const choiceGroup = (label, options, selectedValue, onSelect) => (
    <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: theme.spacing.xs }}>
      <legend style={{ fontWeight: 700, padding: 0 }}>{label}</legend>
      <div
        style={{
          display: 'grid',
          gap: theme.spacing.xs,
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
        }}
      >
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
    <div style={{ display: 'grid', gap: theme.spacing.md }}>
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

      {choiceGroup(
        t('onboarding.accessibility.contrastLabel'),
        [
          { value: 'balanced', label: t('onboarding.accessibility.balancedContrast') },
          { value: 'high', label: t('onboarding.accessibility.highContrast') }
        ],
        data.contrast,
        selectContrast
      )}

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

      <details
        style={{
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.shape.radiusSm,
          padding: theme.spacing.sm,
          background: theme.colors.background
        }}
      >
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('onboarding.accessibility.evidenceTitle')}</summary>
        <div style={{ display: 'grid', gap: theme.spacing.xs, marginTop: theme.spacing.sm, color: theme.colors.muted }}>
          <small>{t('onboarding.accessibility.textStyleHelper')}</small>
          <small>{t('onboarding.accessibility.contrastHelper')}</small>
          <small>{t('onboarding.accessibility.motionHelper')}</small>
          <small>{t('onboarding.accessibility.ttsHelper')}</small>
          <small>{t('onboarding.accessibility.evidenceBody')}</small>
        </div>
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
