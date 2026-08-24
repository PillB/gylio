import React from 'react';
import PropTypes from 'prop-types';
import useAccessibility from '../../core/hooks/useAccessibility';
import { useTheme } from '../../core/context/ThemeContext';

const selectStyle = {
  width: '100%',
  minHeight: 44,
  padding: '0.65rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid currentColor',
  background: 'transparent',
  font: 'inherit'
};

function AccessibilityPrefs({ data, onUpdate, t }) {
  const { theme, mode, setTheme } = useTheme();
  const {
    setTextStylePreference,
    setMotionPreference,
    setTtsEnabled
  } = useAccessibility();

  const handleContrastChange = (event) => {
    const contrast = event.target.value;
    onUpdate({ contrast });

    if (contrast === 'high') {
      setTheme('highContrast');
    } else if (mode === 'highContrast') {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  };

  const fieldStyle = {
    display: 'grid',
    gap: theme.spacing.xs
  };

  return (
    <div style={{ display: 'grid', gap: theme.spacing.lg }}>
      <p style={{ margin: 0, color: theme.colors.text }}>{t('onboarding.accessibility.helper')}</p>

      <label style={fieldStyle}>
        <span style={{ fontWeight: 600 }}>{t('onboarding.accessibility.textSizeLabel')}</span>
        <select
          aria-label={t('onboarding.accessibility.textSizeLabel')}
          value={data.textStyle}
          onChange={(event) => setTextStylePreference(event.target.value)}
          style={{ ...selectStyle, color: theme.colors.text, borderColor: theme.colors.borderStrong }}
        >
          <option value="standard">{t('onboarding.accessibility.standardFont')}</option>
          <option value="large">{t('onboarding.accessibility.largeText')}</option>
        </select>
        <small style={{ color: theme.colors.muted }}>{t('onboarding.accessibility.textSizeHelper')}</small>
      </label>

      <label style={fieldStyle}>
        <span style={{ fontWeight: 600 }}>{t('onboarding.accessibility.contrastLabel')}</span>
        <select
          aria-label={t('onboarding.accessibility.contrastLabel')}
          value={data.contrast}
          onChange={handleContrastChange}
          style={{ ...selectStyle, color: theme.colors.text, borderColor: theme.colors.borderStrong }}
        >
          <option value="balanced">{t('onboarding.accessibility.balancedContrast')}</option>
          <option value="high">{t('onboarding.accessibility.highContrast')}</option>
        </select>
        <small style={{ color: theme.colors.muted }}>{t('onboarding.accessibility.contrastHelper')}</small>
      </label>

      <label style={fieldStyle}>
        <span style={{ fontWeight: 600 }}>{t('onboarding.accessibility.motionLabel')}</span>
        <select
          aria-label={t('onboarding.accessibility.motionLabel')}
          value={data.motion}
          onChange={(event) => setMotionPreference(event.target.value)}
          style={{ ...selectStyle, color: theme.colors.text, borderColor: theme.colors.borderStrong }}
        >
          <option value="system">{t('onboarding.accessibility.motionSystem')}</option>
          <option value="reduced">{t('onboarding.accessibility.reducedMotion')}</option>
          <option value="standard">{t('onboarding.accessibility.standardMotion')}</option>
        </select>
        <small style={{ color: theme.colors.muted }}>{t('onboarding.accessibility.motionHelper')}</small>
      </label>

      <div style={fieldStyle}>
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
      </div>

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
