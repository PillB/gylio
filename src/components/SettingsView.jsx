import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from './SectionCard.jsx';
import BudgetTooltip from './atoms/BudgetTooltip';
import useAccessibility from '../core/hooks/useAccessibility';
import useGamification from '../core/hooks/useGamification';
import { useTheme } from '../core/context/ThemeContext';
import useDB from '../core/hooks/useDB';
import { useDailyMode } from '../features/dashboard/useDailyMode';
import { requestBackgroundSync } from '../core/utils/backgroundSync';
import { enqueueSyncAction, listSyncConflicts, removeSyncConflict } from '../core/utils/offlineSync';
import { useGuidedTour } from '../core/context/GuidedTourContext';
import { useTaskTimer } from '../core/context/TaskTimerContext';
import { Link } from 'react-router-dom';
import AdSlot from '../features/ads/AdSlot';
import YourDataSection from '../features/account/YourDataSection';
import { useEntitlement } from '../features/billing/EntitlementContext';

/**
 * SettingsView component
 *
 * Exposes the same presentation preferences introduced during onboarding so
 * users can revisit them at any time. Labels describe the interface effect,
 * rather than implying that a diagnosis determines a correct setting.
 */
const SettingsView = () => {
  const { t } = useTranslation();
  const { entitlement } = useEntitlement();
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
      badge={<BudgetTooltip content={t('tooltips.settings.section', 'Customize how the app looks, sounds, and behaves. Changes apply everywhere instantly. All preferences are stored locally on your device.')} />}
    >
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <button
            type="button"
            onClick={toggleTint}
            style={{ padding: '0.5rem 0.75rem', minHeight: 44, borderRadius: theme.shape.radiusSm, border: `1px solid ${theme.colors.border}` }}
          >
            {isTinted ? t('disableTint') || 'Disable screen tint' : t('enableTint') || 'Enable screen tint'}
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
            {isSpeaking ? t('speaking') || 'Speaking…' : t('announceSettings') || 'Announce settings'}
          </button>
          <BudgetTooltip content={t('tooltips.settings.announceSettings', 'Reads your current settings aloud so you can confirm everything is configured as expected without reading through the list.')} />
        </span>
      </div>
      <p style={{ color: theme.colors.muted, marginTop: theme.spacing.sm }}>
        {t('onboarding.accessibility.helper')}
      </p>
      <div
        data-tour="settings-theme"
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
                {t('settingsThemeLabel') || 'Theme mode'}
                <BudgetTooltip content={t('tooltips.settings.theme', 'Choose a visual theme that feels comfortable. Dark mode reduces glare in low-light environments; light mode improves contrast for many users. Auto follows your device setting.')} />
              </p>
              <small style={{ color: theme.colors.muted }}>
                {t('onboarding.accessibility.contrastHelper')}
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
                {t('settingsFontLabel') || 'Reading style'}
                <BudgetTooltip content={t('tooltips.settings.font', 'Larger text reduces cognitive load when scanning long lists. The default size is designed for readability; increase it if you find yourself squinting or losing your place.')} />
              </p>
              <small style={{ color: theme.colors.muted }}>
                {t('onboarding.accessibility.textStyleHelper')}
              </small>
              <p style={{ margin: '0.25rem 0', color: theme.colors.text }}>
                {t('settingsCurrentValue', {
                  value:
                    textStylePreference === 'large'
                      ? t('onboarding.accessibility.largeText')
                      : textStylePreference === 'spaced'
                        ? t('onboarding.accessibility.spacedText')
                        : t('onboarding.accessibility.standardText')
                })}
              </p>
            </div>
            <select
              value={['standard', 'large', 'spaced'].includes(textStylePreference) ? textStylePreference : 'standard'}
              onChange={(e) => setTextStylePreference(e.target.value)}
              aria-label={t('settingsFontLabel') || 'Reading style'}
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
                {t('settingsMotionLabel') || 'Motion preference'}
                <BudgetTooltip content={t('tooltips.settings.motion', 'Disabling animations removes all sliding, fading, and bouncing effects. Essential if motion causes distraction, dizziness, or sensory overload.')} />
              </p>
              <small id="motion-helper" style={{ color: theme.colors.muted }}>
                {t('onboarding.accessibility.motionHelper')}
              </small>
            </div>
            <select
              value={motionPreference || 'system'}
              onChange={(e) => setMotionPreference(e.target.value)}
              aria-label={t('settingsMotionLabel') || 'Motion preference'}
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
            <small style={{ color: theme.colors.muted }}>
              {t('settingsCurrentValue', {
                value:
                  motionPreference === 'reduced'
                    ? t('onboarding.accessibility.reducedMotion')
                    : motionPreference === 'standard'
                      ? t('onboarding.accessibility.standardMotion')
                      : t('onboarding.accessibility.motionSystem')
              })}
            </small>
            <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, minWidth: 0 }}>
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
              {t('settingsAnimationHelper') || 'Disable non-essential animations to keep the interface calm.'}
            </small>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                {t('settingsTtsLabel') || t('onboarding.accessibility.tts')}
                <BudgetTooltip content={t('tooltips.settings.tts', 'When on, important status messages are read aloud. Useful for hands-free use, low-vision accessibility, or if reading long lists is tiring.')} />
              </p>
              <small style={{ color: theme.colors.muted }}>
                {t('onboarding.accessibility.ttsHelper')}
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
                aria-label={t('onboarding.accessibility.tts')}
                style={{ width: 20, height: 20 }}
              />
              <span>{ttsEnabled ? t('onboarding.summary.enabled') : t('onboarding.summary.disabled')}</span>
            </label>
          </div>
        </div>

        <div
          data-tour="settings-gamification"
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusMd,
            padding: theme.spacing.md,
            background: theme.colors.surface
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                {t('settingsGamificationLabel') || 'Gamification'}
                <BudgetTooltip content={t('tooltips.settings.gamification', 'Turns XP, levels, and streaks on or off globally. Your progress data is preserved either way — you can re-enable anytime.')} />
              </p>
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
    <SectionCard ariaLabel={t('timerHeading', 'Focus timer')} title={t('timerHeading', 'Focus timer')} badge={<BudgetTooltip content={t('tooltips.settings.timer', 'Customize your Pomodoro focus sprints. Shorter sessions (25 min) work for most tasks; longer ones (45–90 min) suit deep work but need proportionally longer breaks.')} />}>
      <div style={{ display: 'grid', gap: theme.spacing.md, fontFamily: theme.typography.body.family }}>
        <p style={{ margin: 0, color: theme.colors.muted, fontSize: '0.875rem', lineHeight: 1.55 }}>
          {t('timerInsight', 'Research shows the brain works in ~90-minute ultradian cycles. Shorter sprints (25 min) suit most tasks; longer sprints (45–90 min) require proportionally longer breaks to avoid cognitive fatigue. Find your window.')}
        </p>
        {[
          { labelKey: 'timerFocusLabel', key: 'focusMinutes', options: [10, 15, 25, 45, 60, 90], unit: 'min' },
          { labelKey: 'timerShortBreakLabel', key: 'shortBreakMinutes', options: [3, 5, 10, 15], unit: 'min' },
          { labelKey: 'timerLongBreakLabel', key: 'longBreakMinutes', options: [10, 15, 20, 30], unit: 'min' },
          { labelKey: 'timerSessionsLabel', key: 'sessionsBeforeLongBreak', options: [2, 3, 4, 5, 6], unit: '' },
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
            style={{ width: 18, height: 18, accentColor: theme.colors.primary, cursor: 'pointer' }}
          />
          <label htmlFor="auto-break" style={{ fontSize: '0.875rem', color: theme.colors.text, cursor: 'pointer' }}>
            {t('timerAutoBreak', 'Auto-start breaks when focus ends')}
          </label>
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem', color: theme.colors.muted, fontStyle: 'italic' }}>
          {t('timerBreakInsight', 'Longer focus sprints need longer breaks: 45 min → 15 min break; 90 min → 20 min break. Skipping breaks compounds mental fatigue.')}
        </p>
      </div>
    </SectionCard>

    {/* Keyboard shortcuts reference */}
    <SectionCard ariaLabel={t('shortcutsHeading', 'Keyboard shortcuts')} title={t('shortcutsHeading', 'Keyboard shortcuts')} badge={<BudgetTooltip content={t('tooltips.settings.shortcuts', 'Keyboard shortcuts let you navigate the app without a mouse. Press N anywhere to jump to the task input. More shortcuts are added as the app grows.')} />}>
      <div style={{ display: 'grid', gap: theme.spacing.sm, fontFamily: theme.typography.body.family }}>
        {[
          { keys: 'N', description: t('shortcutAddTask', 'Focus "Add task" input') },
          { keys: 'Esc', description: t('shortcutDismiss', 'Dismiss notification / close modal') },
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
    <SectionCard ariaLabel={t('tour.restartButton', 'Restart guide')} title={t('tour.restartButton', 'Restart guide')} badge={<BudgetTooltip content={t('tooltips.settings.restartGuide', 'Replay the interactive walkthrough that introduced the app. Useful if you want to rediscover a feature or show someone else how it works.')} />}>
      <div data-tour="settings-tour" style={{ fontFamily: theme.typography.body.family }}>
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

    {/* Daily View */}
    <SectionCard ariaLabel={t('dailyViewHeading', 'Daily view')} title={t('dailyViewHeading', 'Daily view')} badge={<BudgetTooltip content={t('tooltips.settings.dailyView', 'Daily view simplifies the Tasks tab to show only your top 3 priorities, next event, and a budget nudge — ideal for mornings when you need a quick plan without overwhelm.')} />}>
      <div style={{ display: 'grid', gap: theme.spacing.sm, fontFamily: theme.typography.body.family }}>
        <p style={{ margin: 0, color: theme.colors.muted, fontSize: '0.875rem', lineHeight: 1.55 }}>
          {t('dailyViewDescription', 'Show a simplified Daily Command Center on the Tasks tab — just your top 3 tasks, next event, and a budget nudge.')}
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={dailyMode}
            onChange={(e) => setDailyMode(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <span style={{ fontSize: '0.875rem', color: theme.colors.text }}>
            {t('dailyViewToggle', 'Enable daily view')}
          </span>
        </label>
      </div>
    </SectionCard>

    {/* About */}
    <SectionCard ariaLabel={t('aboutHeading', 'About')} title={t('aboutHeading', 'About')}>
      <div style={{ display: 'grid', gap: theme.spacing.sm, fontFamily: theme.typography.body.family, fontSize: '0.875rem', color: theme.colors.muted }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{t('appVersion', 'Version')}</span>
          <span style={{ color: theme.colors.text, fontWeight: 600 }}>0.1.0</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{t('buildDate', 'Build')}</span>
          <span style={{ color: theme.colors.text }}>2026-03-30</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{t('stack', 'Stack')}</span>
          <span style={{ color: theme.colors.text }}>React 18 · Vite · i18n · IndexedDB</span>
        </div>
        <p style={{ margin: 0, marginTop: theme.spacing.xs, lineHeight: 1.5 }}>
          {t('aboutDescription', 'GYLIO is a neurodivergent-friendly productivity app built with accessibility, low cognitive load, and gentle UX at its core.')}
        </p>
      </div>
    </SectionCard>

    {/* Saved to the account, download, restore */}
    <SectionCard ariaLabel={t('account.heading')} title={t('account.heading')}>
      <YourDataSection />
    </SectionCard>

    {/* Testers and account shortcuts */}
    <SectionCard ariaLabel={t('feedback.settings.heading')} title={t('feedback.settings.heading')}>
      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.md }}>
        <Link to="/qa" style={{ color: theme.colors.primary, fontWeight: 600, minHeight: 44, lineHeight: '44px' }}>{t('feedback.settings.qaLink')}</Link>
        <Link to="/pricing" style={{ color: theme.colors.primary, fontWeight: 600, minHeight: 44, lineHeight: '44px' }}>{t('feedback.settings.planLink')}</Link>
        {entitlement?.isAdmin && (
          <Link to="/admin" style={{ color: theme.colors.primary, fontWeight: 600, minHeight: 44, lineHeight: '44px' }}>{t('feedback.settings.adminLink')}</Link>
        )}
      </nav>
    </SectionCard>
    <AdSlot placement="settings" />
    </>
  );
};

export default SettingsView;