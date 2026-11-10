import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from './SectionCard.jsx';
import BudgetTooltip from './atoms/BudgetTooltip';
import useAccessibility from '../core/hooks/useAccessibility';
import useGamification from '../core/hooks/useGamification';
import { useTheme } from '../core/context/ThemeContext';
import { useDailyMode } from '../features/dashboard/useDailyMode';
import { legacySyncEnabled } from '../core/utils/backgroundSync';
import LegacySyncReview from './LegacySyncReview.jsx';
import { SyncSettingsSection } from './SyncStatus';
import { useGuidedTour } from '../core/context/GuidedTourContext';
import { useTaskTimer } from '../core/context/TaskTimerContext';
import { Link } from 'react-router-dom';
import AdSlot from '../features/ads/AdSlot';
import YourDataSection from '../features/account/YourDataSection';
import SignOutCard from '../features/account/SignOutSection';
import { useEntitlement } from '../features/billing/EntitlementContext';
import { serverFeaturesEnabled } from '../core/utils/serverFeatures';
import SettingToggle from './settings/SettingToggle';
import { version as packageVersion } from '../../package.json';

// The version the deploy script stamps on a release; the package version on any other build.
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? packageVersion;

/**
 * Links out of Settings, in the section they belong to: reporting a problem (where reports can be
 * sent: serverFeatures.ts) under Help; the plan and, for admins, the admin console under About.
 */
function SettingsLinks({ only }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { entitlement } = useEntitlement();
  const linkStyle = { color: theme.colors.primary, fontWeight: 600, minHeight: 44, lineHeight: '44px' };
  const links = only === 'help'
    ? [serverFeaturesEnabled() && { to: '/qa', label: t('feedback.settings.qaLink') }]
    : [{ to: '/pricing', label: t('feedback.settings.planLink') }, entitlement?.isAdmin && { to: '/admin', label: t('feedback.settings.adminLink') }];
  const shown = links.filter(Boolean);
  if (shown.length === 0) return null;
  return (
    <nav aria-label={t(only === 'help' ? 'settingsHelpHeading' : 'aboutHeading')} style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.md }}>
      {shown.map(({ to, label }) => <Link key={to} to={to} style={linkStyle}>{label}</Link>)}
    </nav>
  );
}

/** For a keyboard: index.html hides `.keyboard-only` on touch-only devices. */
function KeyboardShortcuts() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const shortcuts = [
    { keys: 'N', description: t('shortcutAddTask', 'Focus "Add task" input') },
    { keys: 'Esc', description: t('shortcutDismiss', 'Dismiss notification / close modal') },
  ];
  return (
    <div className="keyboard-only">
      <h3 style={{ margin: `0 0 ${theme.spacing.xs}px`, fontSize: '0.9375rem', color: theme.colors.text }}>{t('shortcutsHeading', 'Keyboard shortcuts')}</h3>
      <div style={{ display: 'grid', gap: theme.spacing.sm }}>
        {shortcuts.map(({ keys, description }) => (
          <div key={keys} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.sm, padding: `${theme.spacing.xs}px 0`, borderBottom: `1px solid ${theme.colors.border}` }}>
            <span style={{ color: theme.colors.text }}>{description}</span>
            <kbd style={{
              display: 'inline-block',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              padding: '2px 8px',
              borderRadius: theme.shape.radiusSm,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surfaceElevated,
              color: theme.colors.text,
              fontFamily: 'monospace',
              fontSize: '0.8125rem',
              fontWeight: 600,
              boxShadow: '0 1px 0 rgba(0,0,0,0.15)',
            }}>{keys}</kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SettingsView component
 *
 * Exposes the same presentation preferences introduced during onboarding so
 * users can revisit them at any time. Labels describe the interface effect,
 * rather than implying that a diagnosis determines a correct setting.
 */
const SettingsView = () => {
  const { t } = useTranslation();
  const { theme, mode, setTheme } = useTheme();
  const { resetTour } = useGuidedTour();
  const {
    toggleTint,
    isTinted,
    speak,
    isSpeaking,
    motionPreference,
    setMotionPreference,
    animationsEnabled,
    setAnimationsEnabled,
    textStylePreference,
    setTextStylePreference,
    ttsEnabled,
    setTtsEnabled
  } = useAccessibility();
  const { gamificationEnabled, setGamificationEnabled } = useGamification();
  const { dailyMode, setDailyMode } = useDailyMode();
  const { settings: timerSettings, updateSettings } = useTaskTimer();
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
    <>
    <SectionCard
      title={t('settings')}
      subtitle={t('settingsDescription')}
      badge={<BudgetTooltip content={t('tooltips.settings.section', 'Customize how the app looks, sounds, and behaves. Changes apply everywhere instantly. All preferences are stored locally on your device.')} />}
    >
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <button
            type="button"
            onClick={toggleTint}
            style={{ padding: '0.5rem 0.75rem', minHeight: 44, borderRadius: theme.shape.radiusSm, border: `1px solid ${theme.colors.border}` }}
          >
            {isTinted ? t('disableTint') : t('enableTint')}
          </button>
          <BudgetTooltip content={t('tooltips.settings.tint', 'Applies a warm color overlay to reduce blue light and harsh contrast. Many neurodivergent users find this reduces eye strain and sensory overwhelm during long sessions.')} />
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <button
            type="button"
            onClick={announceSettings}
            disabled={isSpeaking}
            style={{ padding: '0.5rem 0.75rem', minHeight: 44, borderRadius: theme.shape.radiusSm, border: `1px solid ${theme.colors.border}` }}
          >
            {isSpeaking ? t('speaking') : t('announceSettings')}
          </button>
          <BudgetTooltip content={t('tooltips.settings.announceSettings', 'Reads your current settings aloud so you can confirm everything is configured as expected without reading through the list.')} />
        </span>
      </div>
      <p style={{ color: theme.colors.muted, marginTop: theme.spacing.sm }}>
        {t('onboarding.accessibility.helper')}
      </p>
      <div
        style={{
          display: 'grid',
          gap: theme.spacing.md,
          marginTop: theme.spacing.md,
          gridTemplateColumns: 'minmax(0, 1fr)',
          minWidth: 0,
          maxWidth: '100%'
        }}
      >
        <div
          data-tour="settings-theme"
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusMd,
            padding: theme.spacing.md,
            background: theme.colors.surface,
            minWidth: 0,
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                {t('settingsThemeLabel')}
                <BudgetTooltip content={t('tooltips.settings.theme', 'Choose a visual theme that feels comfortable. Dark mode reduces glare in low-light environments; light mode improves contrast for many users. Auto follows your device setting.')} />
              </p>
              <small style={{ color: theme.colors.muted }}>
                {t('onboarding.accessibility.contrastHelper')}
              </small>
            </div>
            <select
              value={mode}
              onChange={(e) => setTheme(e.target.value)}
              aria-label={t('settingsThemeLabel')}
              style={{
                padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                borderRadius: theme.shape.radiusSm,
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.background,
                color: theme.colors.text,
                maxWidth: '100%'
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
            background: theme.colors.surface,
            minWidth: 0,
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap', minWidth: 0 }}>
            <div style={{ minWidth: 0, flex: '1 1 220px' }}>
              <p style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                {t('settingsFontLabel')}
                <BudgetTooltip content={t('tooltips.settings.font', 'Larger text reduces cognitive load when scanning long lists. The default size is designed for readability; increase it if you find yourself squinting or losing your place.')} />
              </p>
              <small style={{ color: theme.colors.muted }}>
                {t('onboarding.accessibility.textStyleHelper')}
              </small>
            </div>
            <select
              value={['standard', 'large', 'spaced'].includes(textStylePreference) ? textStylePreference : 'standard'}
              onChange={(e) => setTextStylePreference(e.target.value)}
              aria-label={t('settingsFontLabel')}
              style={{
                padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                borderRadius: theme.shape.radiusSm,
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.background,
                color: theme.colors.text,
                minWidth: 0,
                maxWidth: '100%',
                flex: '1 1 180px'
              }}
            >
              <option value="standard">{t('onboarding.accessibility.standardText')}</option>
              <option value="large">{t('onboarding.accessibility.largeText')}</option>
              <option value="spaced">{t('onboarding.accessibility.spacedText')}</option>
            </select>
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusMd,
            padding: theme.spacing.md,
            background: theme.colors.surface,
            minWidth: 0,
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'grid', gap: theme.spacing.sm, minWidth: 0 }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                {t('settingsMotionLabel')}
                <BudgetTooltip content={t('tooltips.settings.motion', 'Disabling animations removes all sliding, fading, and bouncing effects. Essential if motion causes distraction, dizziness, or sensory overload.')} />
              </p>
              <small id="motion-helper" style={{ color: theme.colors.muted }}>
                {t('onboarding.accessibility.motionHelper')}
              </small>
            </div>
            <select
              value={motionPreference || 'system'}
              onChange={(e) => setMotionPreference(e.target.value)}
              aria-label={t('settingsMotionLabel')}
              aria-describedby="motion-helper"
              style={{
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
                padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                borderRadius: theme.shape.radiusSm,
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.background,
                color: theme.colors.text
              }}
            >
              <option value="system">{t('onboarding.accessibility.motionSystem')}</option>
              <option value="reduced">{t('onboarding.accessibility.reducedMotion')}</option>
              <option value="standard">{t('onboarding.accessibility.standardMotion')}</option>
            </select>
            <SettingToggle
              bare
              label={t('settingsAnimationLabel')}
              helper={t('settingsAnimationHelper')}
              checked={animationsEnabled}
              onChange={setAnimationsEnabled}
            />
          </div>
        </div>

        <SettingToggle
          label={t('onboarding.accessibility.tts')}
          helper={t('onboarding.accessibility.ttsHelper')}
          tooltip={t('tooltips.settings.tts', 'When on, important status messages are read aloud. Useful for hands-free use, low-vision accessibility, or if reading long lists is tiring.')}
          checked={ttsEnabled}
          onChange={setTtsEnabled}
        />
        <SettingToggle
          dataTour="settings-gamification"
          label={t('settingsGamificationLabel')}
          helper={t('settingsGamificationHelper')}
          tooltip={t('tooltips.settings.gamification', 'Turns XP, levels, and streaks on or off globally. Your progress data is preserved either way — you can re-enable anytime.')}
          checked={gamificationEnabled}
          onChange={setGamificationEnabled}
        />
        <SettingToggle
          label={t('dailyViewHeading')}
          helper={t('dailyViewDescription')}
          tooltip={t('tooltips.settings.dailyView', 'Daily view simplifies the Tasks tab to show only your top 3 priorities, next event, and a budget nudge — ideal for mornings when you need a quick plan without overwhelm.')}
          checked={dailyMode}
          onChange={setDailyMode}
        />

        {/* Sync with the account (builds that have it), or the older review list (builds with a separate API). */}
        <SyncSettingsSection />
        {legacySyncEnabled() && <LegacySyncReview />}
      </div>
    </SectionCard>

    {/* Focus timer settings */}
    <SectionCard ariaLabel={t('timerHeading', 'Focus timer')} title={t('timerHeading', 'Focus timer')} badge={<BudgetTooltip content={t('tooltips.settings.timer', "Pomodoro: timed work sprints followed by short breaks. Some people find a timer makes it easier to start; adjust the lengths until they feel right.")} />}>
      <div style={{ display: 'grid', gap: theme.spacing.md, fontFamily: theme.typography.body.family }}>
        <p style={{ margin: 0, color: theme.colors.muted, fontSize: '0.875rem', lineHeight: 1.55 }}>
          {t('timerInsight', "Shorter sprints (25 min) suit most tasks; longer ones (45 to 90 min) work better with longer breaks. Try a few lengths and keep the one that feels right.")}
        </p>
        {[
          { labelKey: 'timerFocusLabel', key: 'focusMinutes', options: [10, 15, 25, 45, 60, 90], unit: 'min' },
          { labelKey: 'timerShortBreakLabel', key: 'shortBreakMinutes', options: [3, 5, 10, 15], unit: 'min' },
          { labelKey: 'timerLongBreakLabel', key: 'longBreakMinutes', options: [10, 15, 20, 30], unit: 'min' },
          { labelKey: 'timerSessionsLabel', key: 'sessionsBeforeLongBreak', options: [2, 3, 4, 5, 6], unit: '' },
        ].map(({ labelKey, key, options, unit }) => (
          <div key={key}>
            <p id={`timer-${key}-label`} style={{ margin: '0 0 6px', fontWeight: 600, fontSize: '0.875rem', color: theme.colors.text }}>
              {t(labelKey, key)}
            </p>
            {/* The group name tells a screen reader which length a "10min" button sets. */}
            <div role="group" aria-labelledby={`timer-${key}-label`} style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
              {options.map((val) => {
                const active = timerSettings[key] === val;
                return (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateSettings({ [key]: val })}
                    style={{
                      padding: `8px ${theme.spacing.sm}px`,
                      minHeight: 44,
                      minWidth: 44,
                      borderRadius: theme.shape.radiusMd,
                      border: `1.5px solid ${active ? theme.colors.primary : theme.colors.border}`,
                      background: active ? theme.colors.primary : 'transparent',
                      color: active ? theme.colors.primaryForeground : theme.colors.text,
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontFamily: theme.typography.body.family,
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {val}{unit}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <input
            type="checkbox"
            id="auto-break"
            checked={timerSettings.autoStartBreak}
            onChange={(e) => updateSettings({ autoStartBreak: e.target.checked })}
            style={{ width: 24, height: 24, accentColor: theme.colors.primary, cursor: 'pointer', flexShrink: 0 }}
          />
          <label htmlFor="auto-break" style={{ fontSize: '0.875rem', color: theme.colors.text, cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
            {t('timerAutoBreak', 'Auto-start breaks when focus ends')}
          </label>
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem', color: theme.colors.muted, fontStyle: 'italic' }}>
          {t('timerBreakInsight', 'Longer focus sprints need longer breaks: 45 min → 15 min break; 90 min → 20 min break. Skipping breaks compounds mental fatigue.')}
        </p>
      </div>
    </SectionCard>

    {/* Saved to the account, download, restore */}
    <SectionCard ariaLabel={t('account.heading')} title={t('account.heading')}>
      <YourDataSection />
    </SectionCard>

    {/* Sign out, keeping or removing the data on this device */}
    <SignOutCard />

    {/* Help: the guide, where to report a problem, keyboard shortcuts */}
    <SectionCard ariaLabel={t('settingsHelpHeading')} title={t('settingsHelpHeading')} badge={<BudgetTooltip content={t('tooltips.settings.restartGuide', 'Replay the interactive walkthrough that introduced the app. Useful if you want to rediscover a feature or show someone else how it works.')} />}>
      <div style={{ display: 'grid', gap: theme.spacing.md, fontFamily: theme.typography.body.family }}>
        <div data-tour="settings-tour">
          <p style={{ margin: `0 0 ${theme.spacing.sm}px`, color: theme.colors.muted, fontSize: '0.875rem' }}>
            {t('tourDescription', 'Take the interactive tour again to rediscover features or share the app with someone new.')}
          </p>
          <button
            type="button"
            onClick={resetTour}
            style={{
              padding: `${theme.spacing.xs + 2}px ${theme.spacing.md}px`,
              minHeight: 44,
              borderRadius: theme.shape.radiusMd,
              border: `1px solid ${theme.colors.primary}`,
              background: theme.colors.overlay,
              color: theme.colors.text,
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              fontFamily: theme.typography.body.family,
            }}
          >
            {t('tour.restartButton', 'Restart guide')} →
          </button>
        </div>
        <SettingsLinks only="help" />
        <KeyboardShortcuts />
      </div>
    </SectionCard>

    {/* About */}
    <SectionCard ariaLabel={t('aboutHeading', 'About')} title={t('aboutHeading', 'About')}>
      <div style={{ display: 'grid', gap: theme.spacing.sm, fontFamily: theme.typography.body.family, fontSize: '0.875rem', color: theme.colors.muted }}>
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          {t('aboutDescription', 'GYLIO is a neurodivergent-friendly productivity app built with accessibility, low cognitive load, and gentle UX at its core.')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{t('appVersion', 'Version')}</span>
          <span style={{ color: theme.colors.text, fontWeight: 600 }}>{APP_VERSION}</span>
        </div>
        <SettingsLinks only="account" />
      </div>
    </SectionCard>
    <AdSlot placement="settings" />
    </>
  );
};

export default SettingsView;