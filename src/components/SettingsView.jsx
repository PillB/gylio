import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from './SectionCard.jsx';
import useAccessibility from '../core/hooks/useAccessibility';
import useGamification from '../core/hooks/useGamification';
import { useTheme } from '../core/context/ThemeContext';
import useDB from '../core/hooks/useDB';
import { requestBackgroundSync } from '../core/utils/backgroundSync';
import { enqueueSyncAction, listSyncConflicts, removeSyncConflict } from '../core/utils/offlineSync';
import { useGuidedTour } from '../core/context/GuidedTourContext';
import { useTaskTimer } from '../core/context/TaskTimerContext';

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
  const { resetTour } = useGuidedTour();
  const {
    toggleTint,
    isTinted,
    speak,
    isSpeaking,
    motionPreference,
    reduceMotionEnabled,
    setReduceMotionEnabled,
    animationsEnabled,
    setAnimationsEnabled,
    textStylePreference,
    setTextStylePreference,
    ttsEnabled,
    setTtsEnabled
  } = useAccessibility();
  const { gamificationEnabled, setGamificationEnabled } = useGamification();
  const { settings: timerSettings, updateSettings } = useTaskTimer();
  const { updateTask, deleteTask, updateEvent, deleteEvent, updateTransaction, deleteTransaction } = useDB();
  const [syncConflicts, setSyncConflicts] = useState([]);
  const [isResolving, setIsResolving] = useState(null);

  const loadSyncConflicts = useCallback(() => {
    listSyncConflicts()
      .then((entries) => setSyncConflicts(entries))
      .catch((error) => {
        console.warn('Unable to load sync conflicts', error);
      });
  }, []);

  useEffect(() => {
    loadSyncConflicts();
    const intervalId = window.setInterval(loadSyncConflicts, 30000);
    return () => window.clearInterval(intervalId);
  }, [loadSyncConflicts]);

  const themeLabels = useMemo(
    () => ({
      light: t('theme.light', 'Light'),
      dark: t('theme.dark', 'Dark'),
      highContrast: t('theme.highContrast', 'High contrast')
    }),
    [t]
  );

  const syncEntityLabels = useMemo(
    () => ({
      task: t('sync.entity.task'),
      event: t('sync.entity.event'),
      transaction: t('sync.entity.transaction')
    }),
    [t]
  );

  const normalizeSubtasks = (value) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => {
        if (typeof entry === 'string') return { label: entry, done: false };
        if (entry && typeof entry === 'object') {
          const label = typeof entry.label === 'string' ? entry.label : '';
          if (!label) return null;
          return { label, done: Boolean(entry.done) };
        }
        return null;
      })
      .filter(Boolean);
  };

  const applyRemoteConflict = useCallback(
    async (conflict) => {
      const remote = conflict.remoteData ?? null;
      const fallbackId = conflict.localData?.id;
      const entityId = Number(remote?.id ?? fallbackId);

      if (!Number.isFinite(entityId)) return;

      if (!remote) {
        if (conflict.entityType === 'task') await deleteTask(entityId, { skipSync: true });
        if (conflict.entityType === 'event') await deleteEvent(entityId, { skipSync: true });
        if (conflict.entityType === 'transaction') await deleteTransaction(entityId, { skipSync: true });
        return;
      }

      if (conflict.entityType === 'task') {
        await updateTask(entityId, {
          title: String(remote.title ?? ''),
          status: String(remote.status ?? 'pending'),
          subtasks: normalizeSubtasks(remote.subtasks),
          plannedDate: remote.plannedDate ?? null,
          calendarEventId: remote.calendarEventId ?? null,
          focusPresetMinutes: remote.focusPresetMinutes ?? null,
        }, { skipSync: true });
      }

      if (conflict.entityType === 'event') {
        await updateEvent(entityId, {
          title: String(remote.title ?? ''),
          description: remote.description ?? null,
          startDate: String(remote.startDate ?? ''),
          endDate: remote.endDate ?? null,
          location: remote.location ?? null,
          taskId: remote.taskId ?? null,
          reminderMinutesBefore: remote.reminderMinutesBefore ?? null,
        }, { skipSync: true });
      }

      if (conflict.entityType === 'transaction') {
        await updateTransaction(entityId, {
          budgetMonth: String(remote.budgetMonth ?? ''),
          amount: Number(remote.amount ?? 0),
          categoryName: String(remote.categoryName ?? ''),
          isNeed: Boolean(remote.isNeed),
          date: String(remote.date ?? ''),
          note: remote.note ?? null,
        }, { skipSync: true });
      }
    },
    [deleteEvent, deleteTask, deleteTransaction, updateEvent, updateTask, updateTransaction]
  );

  const handleResolveConflict = useCallback(
    async (conflict, resolution) => {
      setIsResolving(conflict.id);
      try {
        if (resolution === 'local') {
          await enqueueSyncAction({
            entityType: conflict.entityType,
            action: conflict.action,
            payload: conflict.localData ?? {},
            clientUpdatedAt: new Date().toISOString(),
          });
          await requestBackgroundSync();
        } else {
          await applyRemoteConflict(conflict);
        }
        await removeSyncConflict(conflict.id);
        loadSyncConflicts();
      } catch (error) {
        console.warn('Failed to resolve conflict', error);
      } finally {
        setIsResolving(null);
      }
    },
    [applyRemoteConflict, loadSyncConflicts]
  );

  const announceSettings = () => {
    speak(t('settingsDescription'));
  };

  return (
    <>
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
          <div style={{ display: 'grid', gap: theme.spacing.sm }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>{t('settingsMotionLabel') || 'Motion preference'}</p>
              <small id="motion-helper" style={{ color: theme.colors.muted }}>
                {t('settingsMotionHelper') ||
                  'Reduce motion to lower sensory load; we only animate essentials.'}
              </small>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
              <input
                type="checkbox"
                checked={reduceMotionEnabled}
                onChange={(e) => setReduceMotionEnabled(e.target.checked)}
                aria-label={t('settingsMotionLabel') || 'Motion preference'}
                aria-describedby="motion-helper"
                style={{ width: 20, height: 20 }}
              />
              <span>
                {reduceMotionEnabled
                  ? t('onboarding.accessibility.reduceMotion')
                  : t('onboarding.accessibility.allowMotion')}
              </span>
            </label>
            <small style={{ color: theme.colors.muted }}>
              {t('settingsCurrentValue', {
                value:
                  motionPreference === 'reduced'
                    ? t('onboarding.accessibility.reduceMotion')
                    : t('onboarding.accessibility.allowMotion')
              }) ||
                `Current: ${motionPreference === 'reduced' ? 'Reduced motion' : 'Standard motion'}`}
            </small>
            <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
              <input
                type="checkbox"
                checked={animationsEnabled}
                onChange={(e) => setAnimationsEnabled(e.target.checked)}
                aria-label={t('settingsAnimationLabel') || 'Allow animations'}
                aria-describedby="animation-helper"
                style={{ width: 20, height: 20 }}
              />
              <span>
                {animationsEnabled
                  ? t('settingsAnimationOn') || 'Animations enabled'
                  : t('settingsAnimationOff') || 'Animations limited'}
              </span>
            </label>
            <small id="animation-helper" style={{ color: theme.colors.muted }}>
              {t('settingsAnimationHelper') ||
                'Disable non-essential animations to keep the interface calm.'}
            </small>
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
              <p style={{ margin: 0, fontWeight: 600 }}>{t('settingsGamificationLabel') || 'Gamification'}</p>
              <small style={{ color: theme.colors.muted }}>
                {t('settingsGamificationHelper') ||
                  'Opt in to XP, streaks, and cosmetic unlocks. You can disable this any time.'}
              </small>
              <p style={{ margin: '0.25rem 0', color: theme.colors.text }}>
                {t('settingsCurrentValue', {
                  value: gamificationEnabled ? t('onboarding.summary.enabled') : t('onboarding.summary.disabled')
                }) || `Current: ${gamificationEnabled ? 'Enabled' : 'Disabled'}`}
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
              <input
                type="checkbox"
                checked={gamificationEnabled}
                onChange={(e) => setGamificationEnabled(e.target.checked)}
                aria-label={t('settingsGamificationLabel') || 'Gamification'}
                style={{ width: 20, height: 20 }}
              />
              <span>{gamificationEnabled ? t('onboarding.summary.enabled') : t('onboarding.summary.disabled')}</span>
            </label>
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
              <p style={{ margin: 0, fontWeight: 600 }}>{t('sync.reviewTitle')}</p>
              <small style={{ color: theme.colors.muted }}>{t('sync.reviewHelper')}</small>
            </div>
          </div>
          <div style={{ display: 'grid', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            {syncConflicts.length === 0 ? (
              <p style={{ margin: 0, color: theme.colors.muted }}>{t('sync.reviewEmpty')}</p>
            ) : (
              syncConflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  style={{
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    padding: theme.spacing.sm,
                    background: theme.colors.background
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {t('sync.reviewConflictLabel', {
                      entity: syncEntityLabels[conflict.entityType] ?? conflict.entityType
                    })}
                  </p>
                  <small style={{ color: theme.colors.muted }}>
                    {t('sync.reviewDetected', {
                      timestamp: new Date(conflict.detectedAt).toLocaleString()
                    })}
                  </small>
                  <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.sm, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleResolveConflict(conflict, 'local')}
                      disabled={isResolving === conflict.id}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.border}`,
                        background: theme.colors.surface,
                        color: theme.colors.text
                      }}
                    >
                      {t('sync.reviewKeepLocal')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveConflict(conflict, 'remote')}
                      disabled={isResolving === conflict.id}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.border}`,
                        background: theme.colors.surface,
                        color: theme.colors.text
                      }}
                    >
                      {t('sync.reviewUseRemote')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </SectionCard>

    {/* Focus timer settings */}
    <SectionCard ariaLabel={t('settingsPanel.timerHeading', 'Focus timer')} title={t('settingsPanel.timerHeading', 'Focus timer')}>
      <div style={{ display: 'grid', gap: theme.spacing.md, fontFamily: theme.typography.body.family }}>
        <p style={{ margin: 0, color: theme.colors.muted, fontSize: '0.875rem', lineHeight: 1.55 }}>
          {t('settingsPanel.timerInsight', 'Research shows the brain works in ~90-minute ultradian cycles. Shorter sprints (25 min) suit most tasks; longer sprints (45–90 min) require proportionally longer breaks to avoid cognitive fatigue. Find your window.')}
        </p>
        {[
          { labelKey: 'settingsPanel.timerFocusLabel', key: 'focusMinutes', options: [10, 15, 25, 45, 60, 90], unit: 'min' },
          { labelKey: 'settingsPanel.timerShortBreakLabel', key: 'shortBreakMinutes', options: [3, 5, 10, 15], unit: 'min' },
          { labelKey: 'settingsPanel.timerLongBreakLabel', key: 'longBreakMinutes', options: [10, 15, 20, 30], unit: 'min' },
          { labelKey: 'settingsPanel.timerSessionsLabel', key: 'sessionsBeforeLongBreak', options: [2, 3, 4, 5, 6], unit: '' },
        ].map(({ labelKey, key, options, unit }) => (
          <div key={key}>
            <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: '0.875rem', color: theme.colors.text }}>
              {t(labelKey, key)}
            </p>
            <div style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
              {options.map((val) => {
                const active = timerSettings[key] === val;
                return (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateSettings({ [key]: val })}
                    style={{
                      padding: `4px ${theme.spacing.sm}px`,
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
            style={{ width: 18, height: 18, accentColor: theme.colors.primary, cursor: 'pointer' }}
          />
          <label htmlFor="auto-break" style={{ fontSize: '0.875rem', color: theme.colors.text, cursor: 'pointer' }}>
            {t('settingsPanel.timerAutoBreak', 'Auto-start breaks when focus ends')}
          </label>
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem', color: theme.colors.muted, fontStyle: 'italic' }}>
          {t('settingsPanel.timerBreakInsight', 'Longer focus sprints need longer breaks: 45 min → 15 min break; 90 min → 20 min break. Skipping breaks compounds mental fatigue.')}
        </p>
      </div>
    </SectionCard>

    {/* Keyboard shortcuts reference */}
    <SectionCard ariaLabel={t('settingsPanel.shortcutsHeading', 'Keyboard shortcuts')} title={t('settingsPanel.shortcutsHeading', 'Keyboard shortcuts')}>
      <div style={{ display: 'grid', gap: theme.spacing.sm, fontFamily: theme.typography.body.family }}>
        {[
          { keys: 'N', description: t('settingsPanel.shortcutAddTask', 'Focus "Add task" input') },
          { keys: 'Esc', description: t('settingsPanel.shortcutDismiss', 'Dismiss notification / close modal') },
        ].map(({ keys, description }) => (
          <div key={keys} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${theme.spacing.xs}px 0`, borderBottom: `1px solid ${theme.colors.border}` }}>
            <span style={{ color: theme.colors.text }}>{description}</span>
            <kbd style={{
              display: 'inline-block',
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
    </SectionCard>

    {/* Guided tour */}
    <SectionCard ariaLabel={t('tour.restartButton', 'Restart guide')} title={t('tour.restartButton', 'Restart guide')}>
      <div style={{ fontFamily: theme.typography.body.family }}>
        <p style={{ margin: `0 0 ${theme.spacing.sm}px`, color: theme.colors.muted, fontSize: '0.875rem' }}>
          {t('settingsPanel.tourDescription', 'Take the interactive tour again to rediscover features or share the app with someone new.')}
        </p>
        <button
          type="button"
          onClick={resetTour}
          style={{
            padding: `${theme.spacing.xs + 2}px ${theme.spacing.md}px`,
            borderRadius: theme.shape.radiusMd,
            border: `1px solid ${theme.colors.primary}`,
            background: theme.colors.overlay,
            color: theme.colors.primary,
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            fontFamily: theme.typography.body.family,
          }}
        >
          {t('tour.restartButton', 'Restart guide')} →
        </button>
      </div>
    </SectionCard>

    {/* About */}
    <SectionCard ariaLabel={t('settingsPanel.aboutHeading', 'About')} title={t('settingsPanel.aboutHeading', 'About')}>
      <div style={{ display: 'grid', gap: theme.spacing.sm, fontFamily: theme.typography.body.family, fontSize: '0.875rem', color: theme.colors.muted }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{t('settingsPanel.appVersion', 'Version')}</span>
          <span style={{ color: theme.colors.text, fontWeight: 600 }}>0.1.0</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{t('settingsPanel.buildDate', 'Build')}</span>
          <span style={{ color: theme.colors.text }}>2026-03-30</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{t('settingsPanel.stack', 'Stack')}</span>
          <span style={{ color: theme.colors.text }}>React 18 · Vite · i18n · IndexedDB</span>
        </div>
        <p style={{ margin: 0, marginTop: theme.spacing.xs, lineHeight: 1.5 }}>
          {t('settingsPanel.aboutDescription', 'GYLIO is a neurodivergent-friendly productivity app built with accessibility, low cognitive load, and gentle UX at its core.')}
        </p>
      </div>
    </SectionCard>
    </>
  );
};

export default SettingsView;
