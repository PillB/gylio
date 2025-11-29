import React from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from './SectionCard.jsx';
import useAccessibility from '../core/hooks/useAccessibility';

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
  const { toggleTint, isTinted, speak, isSpeaking } = useAccessibility();

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
        <button type="button" onClick={toggleTint} style={{ padding: '0.5rem 0.75rem' }}>
          {isTinted ? t('disableTint') || 'Disable screen tint' : t('enableTint') || 'Enable screen tint'}
        </button>
        <button
          type="button"
          onClick={announceSettings}
          disabled={isSpeaking}
          style={{ padding: '0.5rem 0.75rem' }}
        >
          {isSpeaking ? t('speaking') || 'Speaking…' : t('announceSettings') || 'Announce settings'}
        </button>
      </div>
      <ul>
        <li>{t('settingsFontOption') || 'Choose between standard and dyslexia‑friendly fonts.'}</li>
        <li>{t('settingsThemeOption') || 'Toggle light/dark mode.'}</li>
        <li>{t('settingsMotionOption') || 'Reduce or enable animations.'}</li>
        <li>{t('settingsTtsOption') || 'Enable or disable text‑to‑speech reminders.'}</li>
        <li>{t('settingsGamificationOption') || 'Show or hide points and streaks.'}</li>
      </ul>
    </SectionCard>
  );
};

export default SettingsView;
