import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * SettingsView component
 *
 * The settings page exposes personalisation and accessibility options.  Users
 * will be able to toggle between light and dark themes, choose dyslexia‑friendly
 * fonts, enable or disable animations, adjust audio cue volumes and control
 * whether gamification features are displayed.  This stub lists upcoming
 * settings features.
 */
const SettingsView = () => {
  const { t } = useTranslation();
  return (
    <section aria-label={t('settings') + ' module'}>
      <h2>{t('settings')}</h2>
      <ul>
        <li>{t('settingsFontOption') || 'Choose between standard and dyslexia‑friendly fonts.'}</li>
        <li>{t('settingsThemeOption') || 'Toggle light/dark mode.'}</li>
        <li>{t('settingsMotionOption') || 'Reduce or enable animations.'}</li>
        <li>{t('settingsTtsOption') || 'Enable or disable text‑to‑speech reminders.'}</li>
        <li>{t('settingsGamificationOption') || 'Show or hide points and streaks.'}</li>
      </ul>
    </section>
  );
};

export default SettingsView;