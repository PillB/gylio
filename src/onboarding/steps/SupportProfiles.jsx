import React from 'react';
import PropTypes from 'prop-types';
import { SUPPORT_PROFILES } from '../utils/supportProfiles';
import { useTheme } from '../../core/context/ThemeContext';
import useAccessibility from '../../core/hooks/useAccessibility';

const PROFILE_KEYS = ['focus', 'quiet', 'reading', 'visibility'];

function SupportProfiles({ data, onUpdate, t }) {
  const { theme, mode, setTheme } = useTheme();
  const {
    setTextStylePreference,
    setMotionPreference,
    setAnimationsEnabled,
    setTtsEnabled
  } = useAccessibility();

  const applyProfile = (key) => {
    const profile = SUPPORT_PROFILES[key];
    onUpdate({ profile: key });
    setTextStylePreference(profile.textStyle);
    setMotionPreference(profile.motion);
    setAnimationsEnabled(profile.animations);
    setTtsEnabled(profile.tts);

    // Contrast is stored in onboarding state because it is part of the visible
    // preference set. Only the dedicated high-contrast profile changes theme.
    onUpdate({ profile: key, contrast: profile.contrast });
    if (profile.theme) {
      setTheme(profile.theme);
    } else if (mode === 'highContrast') {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  };

  const keepCurrent = () => onUpdate({ profile: 'keep' });

  const cardStyle = (selected) => ({
    minHeight: 44,
    padding: theme.spacing.md,
    borderRadius: theme.shape.radiusSm,
    border: `${selected ? 2 : 1}px solid ${selected ? theme.colors.primary : theme.colors.borderStrong}`,
    background: selected ? theme.colors.overlay : theme.colors.surface,
    color: theme.colors.text,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%'
  });

  return (
    <div style={{ display: 'grid', gap: theme.spacing.lg }}>
      <div style={{ display: 'grid', gap: theme.spacing.xs }}>
        <p style={{ margin: 0, color: theme.colors.text }}>{t('onboarding.supportProfile.helper')}</p>
        <p style={{ margin: 0, color: theme.colors.muted, fontSize: '0.9rem' }}>
          {t('onboarding.supportProfile.evidenceNote')}
        </p>
      </div>

      <div
        role="group"
        aria-label={t('onboarding.supportProfile.groupLabel')}
        style={{ display: 'grid', gap: theme.spacing.sm, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}
      >
        {PROFILE_KEYS.map((key) => {
          const selected = data.profile === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              onClick={() => applyProfile(key)}
              style={cardStyle(selected)}
            >
              <strong style={{ display: 'block', marginBottom: theme.spacing.xs }}>
                {t(`onboarding.supportProfile.profiles.${key}.label`)}
              </strong>
              <span style={{ display: 'block', color: theme.colors.muted, lineHeight: 1.45 }}>
                {t(`onboarding.supportProfile.profiles.${key}.description`)}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-pressed={data.profile === 'keep'}
        onClick={keepCurrent}
        style={cardStyle(data.profile === 'keep')}
      >
        <strong>{t('onboarding.supportProfile.keepCurrent')}</strong>
      </button>

      {data.profile && data.profile !== 'keep' && (
        <p role="status" style={{ margin: 0, color: theme.colors.muted }}>
          {t('onboarding.supportProfile.applied')}
        </p>
      )}
    </div>
  );
}

SupportProfiles.propTypes = {
  data: PropTypes.shape({
    profile: PropTypes.string,
    contrast: PropTypes.string
  }).isRequired,
  onUpdate: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
};

export default SupportProfiles;
