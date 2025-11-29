import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from './SectionCard.jsx';
import useAccessibility from '../core/hooks/useAccessibility';
import { useTheme } from '../core/context/ThemeContext';

/**
 * SettingsView component
 *
 * The settings page exposes personalisation and accessibility options. Users
 * will be able to toggle between light and dark themes, choose dyslexia‑friendly
 * fonts, enable or disable animations, adjust audio cue volumes and control
 * whether gamification features are displayed. This stub lists upcoming
 * settings features.
 */
const SettingsView = () => {
  const { t } = useTranslation();
  const { theme, mode, setTheme } = useTheme();
  const {
    toggleTint,
    isTinted,
    speak,
    isSpeaking,
    motionPreference,
    setMotionPreference,
    textStylePreference,
    setTextStylePreference,
    ttsEnabled,
    setTtsEnabled
  } = useAccessibility();

  const themeLabels = useMemo(
    () => ({
      light: t('theme.light', 'Light'),
      dark: t('theme.dark', 'Dark'),
      highContrast: t('theme.highContrast', 'High contrast')
    }),
    [t]
  );

  const announceSettings = () => {
    speak(t('settingsDescription'));
  };

  return (
    <SectionCard
      ariaLabel={`${t('settings')} module`}
      title={t('settings')}
      subtitle={t('settingsDescription') || ''}
    >
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={toggleTint}
          style={{ padding: '0.5rem 0.75rem', borderRadius: theme.shape.radiusSm, border: `1px solid ${theme.colors.border}` }}
        >
          {isTinted ? t('disableTint') || 'Disable screen tint' : t('enableTint') || 'Enable screen tint'}
        </button>
        <button
          type="button"
          onClick={announceSettings}
          disabled={isSpeaking}
          style={{ padding: '0.5rem 0.75rem', borderRadius: theme.shape.radiusSm, border: `1px solid ${theme.colors.border}` }}
        >
          {isSpeaking ? t('speaking') || 'Speaking…' : t('announceSettings') || 'Announce settings'}
        </button>
      </div>
      <p style={{ color: theme.colors.muted, marginTop: theme.spacing.sm }}>
        {t('onboarding.accessibility.helper') ||
          'We apply these readability and sensory settings everywhere for predictability.'}
      </p>
      <div
        style={{
          display: 'grid',
          gap: theme.spacing.md,
          marginTop: theme.spacing.md
        }}
      >
        <div
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusMd,
            padding: theme.spacing.md,
            background: theme.colors.surface
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>{t('settingsThemeLabel') || 'Theme mode'}</p>
              <small style={{ color: theme.colors.muted }}>
                {t('settingsThemeHelper') || 'Choose light, dark, or high-contrast to reduce visual strain.'}
              </small>
              <p style={{ margin: '0.25rem 0', color: theme.colors.text }}>
                {t('settingsCurrentValue', { value: themeLabels[mode] }) || `Current: ${themeLabels[mode]}`}
              </p>
            </div>
            <select
              value={mode}
              onChange={(e) => setTheme(e.target.value)}
              aria-label={t('settingsThemeLabel') || 'Theme mode'}
              style={{
                padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                borderRadius: theme.shape.radiusSm,
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.background,
                color: theme.colors.text
              }}
            >
              <option value="light">{themeLabels.light}</option>
              <option value="dark">{themeLabels.dark}</option>
              <option value="highContrast">{themeLabels.highContrast}</option>
            </select>
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusMd,
            padding: theme.spacing.md,
            background: theme.colors.surface
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>{t('settingsFontLabel') || 'Reading style'}</p>
              <small style={{ color: theme.colors.muted }}>
                {t('settingsFontHelper') || 'Switch to dyslexia-friendly fonts or larger text for steadier reading.'}
              </small>
              <p style={{ margin: '0.25rem 0', color: theme.colors.text }}>
                {t('settingsCurrentValue', {
                  value:
                    textStylePreference === 'dyslexic'
                      ? t('onboarding.accessibility.dyslexicFont')
                      : textStylePreference === 'large'
                        ? t('onboarding.accessibility.largeText')
                        : t('onboarding.accessibility.standardFont')
                }) ||
                  `Current: ${
                    textStylePreference === 'dyslexic'
                      ? 'Dyslexia-friendly'
                      : textStylePreference === 'large'
                        ? 'Large text'
                        : 'Standard'
                  }`}
              </p>
            </div>
            <select
              value={textStylePreference || 'standard'}
              onChange={(e) => setTextStylePreference(e.target.value)}
              aria-label={t('settingsFontLabel') || 'Reading style'}
              style={{
                padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                borderRadius: theme.shape.radiusSm,
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.background,
                color: theme.colors.text
              }}
            >
              <option value="dyslexic">{t('onboarding.accessibility.dyslexicFont')}</option>
              <option value="standard">{t('onboarding.accessibility.standardFont')}</option>
              <option value="large">{t('onboarding.accessibility.largeText')}</option>
            </select>
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusMd,
            padding: theme.spacing.md,
            background: theme.colors.surface
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>{t('settingsMotionLabel') || 'Motion preference'}</p>
              <small style={{ color: theme.colors.muted }}>
                {t('settingsMotionHelper') || 'Reduce motion to lower sensory load; we only animate essentials.'}
              </small>
              <p style={{ margin: '0.25rem 0', color: theme.colors.text }}>
                {t('settingsCurrentValue', {
                  value:
                    motionPreference === 'reduced'
                      ? t('onboarding.accessibility.reduceMotion')
                      : t('onboarding.accessibility.allowMotion')
                }) ||
                  `Current: ${motionPreference === 'reduced' ? 'Reduced motion' : 'Standard motion'}`}
              </p>
            </div>
            <select
              value={motionPreference || 'standard'}
              onChange={(e) => setMotionPreference(e.target.value)}
              aria-label={t('settingsMotionLabel') || 'Motion preference'}
              style={{
                padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                borderRadius: theme.shape.radiusSm,
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.background,
                color: theme.colors.text
              }}
            >
              <option value="reduced">{t('onboarding.accessibility.reduceMotion')}</option>
              <option value="standard">{t('onboarding.accessibility.allowMotion')}</option>
            </select>
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusMd,
            padding: theme.spacing.md,
            background: theme.colors.surface
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>{t('settingsTtsLabel') || t('onboarding.accessibility.tts')}</p>
              <small style={{ color: theme.colors.muted }}>
                {t('settingsTtsHelper') || t('onboarding.accessibility.ttsHelper')}
              </small>
              <p style={{ margin: '0.25rem 0', color: theme.colors.text }}>
                {t('settingsCurrentValue', {
                  value: ttsEnabled ? t('onboarding.summary.enabled') : t('onboarding.summary.disabled')
                }) || `Current: ${ttsEnabled ? 'Enabled' : 'Disabled'}`}
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
              <input
                type="checkbox"
                checked={ttsEnabled}
                onChange={(e) => setTtsEnabled(e.target.checked)}
                aria-label={t('settingsTtsLabel') || t('onboarding.accessibility.tts')}
                style={{ width: 20, height: 20 }}
              />
              <span>{ttsEnabled ? t('onboarding.summary.enabled') : t('onboarding.summary.disabled')}</span>
            </label>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default SettingsView;
