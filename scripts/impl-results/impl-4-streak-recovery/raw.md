---FILE: src/components/WelcomeBackBanner.tsx---
/**
 * WelcomeBackBanner — Warm re-entry experience for lapsed users.
 *
 * Shows when user returns after 3+ days of absence. All strings go through i18n.
 * Detection order: localStorage FIRST so language choice persists across sessions.
 *
 * Props:
 *   onFreshStart? — called after the user chooses "Fresh Start"
 *   onTinyStep?   — called after the user chooses "Start with one tiny step"
 *                   button is only rendered when this prop is provided
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../core/context/ThemeContext';
import { track, Events } from '../core/analytics';

const LAST_ACTIVE_KEY        = 'gylio:lastActiveDate';
const DISMISSED_KEY          = 'gylio:welcomeBackDismissed';
const LAST_STREAK_BEFORE_KEY = 'gylio:lastStreakBeforeBreak';
const GAP_DAYS               = 3;
const MESSAGE_COUNT          = 4; // must match welcomeBack.message0..3 keys

function daysBetween(a: string, b: string): number {
  const utcA = Date.UTC(...(a.split('-').map(Number) as [number, number, number]));
  const utcB = Date.UTC(...(b.split('-').map(Number) as [number, number, number]));
  return Math.floor((utcB - utcA) / 86_400_000);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  onFreshStart?: () => void;
  onTinyStep?: () => void;
};

export default function WelcomeBackBanner({ onFreshStart, onTinyStep }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [show, setShow]           = useState(false);
  const [gapDays, setGapDays]     = useState(0);
  const [msgIndex, setMsgIndex]   = useState(0);
  const [lastStreak, setLastStreak] = useState<number | null>(null);

  useEffect(() => {
    const today      = todayISO();
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    const dismissed  = localStorage.getItem(DISMISSED_KEY);

    if (dismissed === today) return;

    if (!lastActive) {
      localStorage.setItem(LAST_ACTIVE_KEY, today);
      return;
    }

    const gap = daysBetween(lastActive, today);
    if (gap >= GAP_DAYS) {
      const storedStreak = localStorage.getItem(LAST_STREAK_BEFORE_KEY);
      const parsed       = storedStreak ? parseInt(storedStreak, 10) : null;

      setGapDays(gap);
      setMsgIndex(Math.floor(Math.random() * MESSAGE_COUNT));
      if (parsed !== null && parsed > 0) setLastStreak(parsed);
      setShow(true);
      track(Events.WELCOME_BACK_SHOWN, {
        gapDays: gap,
        lastStreak: parsed ?? null,
      });
    } else {
      // Within normal range — just refresh the last-active stamp.
      localStorage.setItem(LAST_ACTIVE_KEY, today);
    }
  }, []);

  const dismiss = useCallback(() => {
    const today = todayISO();
    localStorage.setItem(DISMISSED_KEY, today);
    localStorage.setItem(LAST_ACTIVE_KEY, today);
    setShow(false);
  }, []);

  const handleContinue = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const handleFreshStart = useCallback(() => {
    track(Events.WELCOME_BACK_FRESH_START, { gapDays });
    localStorage.removeItem(LAST_STREAK_BEFORE_KEY);
    dismiss();
    onFreshStart?.();
  }, [dismiss, gapDays, onFreshStart]);

  const handleTinyStep = useCallback(() => {
    track(Events.STREAK_RECOVERY_STARTED, { gapDays, lastStreak });
    dismiss();
    onTinyStep?.();
  }, [dismiss, gapDays, lastStreak, onTinyStep]);

  if (!show) return null;

  const colors  = theme.colors;
  const spacing = theme.spacing;
  const shape   = theme.shape;
  const shadow  = theme.shadow;

  // Rotate through warm, compassionate messages
  const messageKey = `welcomeBack.message${msgIndex}` as const;
  const message    = t(messageKey);

  return (
    <aside
      role="complementary"
      aria-label={t('welcomeBack.bannerAriaLabel')}
      style={{
        marginBottom: spacing.xl,
        padding: `${spacing.lg}px ${spacing.xl}px`,
        borderRadius: shape.radiusLg,
        background: `linear-gradient(135deg, ${colors.primary}12 0%, ${colors.surface} 100%)`,
        border: `1.5px solid ${colors.primary}30`,
        boxShadow: shadow.sm,
        fontFamily: theme.typography.body.family,
        maxWidth: 600,
        width: '100%',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.sm,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 28, lineHeight: 1 }}>🌱</span>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: colors.text,
            fontFamily: theme.typography.heading.family,
          }}
        >
          {t('welcomeBack.heading')}
        </h2>
      </div>

      {/* ── Compassionate message ── */}
      <p
        style={{
          margin: `0 0 ${spacing.sm}px`,
          color: colors.muted,
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        {message}
      </p>

      {/* ── Neutral gap note — no blame ── */}
      <p
        aria-label={t('welcomeBack.gapAriaLabel', { days: gapDays })}
        style={{
          margin: `0 0 ${spacing.md}px`,
          color: colors.muted,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span aria-hidden="true">📅</span>
        {t('welcomeBack.gapNote', { days: gapDays })}
      </p>

      {/* ── Preserved-streak soft-reset block ── */}
      {lastStreak !== null && lastStreak > 0 && (
        <div
          style={{
            background: `${colors.primary}15`,
            borderRadius: shape.radiusMd,
            padding: `${spacing.sm}px ${spacing.md}px`,
            marginBottom: spacing.md,
            fontSize: 14,
            color: colors.text,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span aria-hidden="true">✨</span>
          {t('welcomeBack.lastStreakRecovery', { count: lastStreak })}
        </div>
      )}

      {/* ── Action buttons ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginTop: spacing.sm,
        }}
      >
        {/* Tiny-step — primary recovery CTA, only when prop provided */}
        {onTinyStep && (
          <button
            type="button"
            onClick={handleTinyStep}
            aria-label={t('welcomeBack.tinyStepAriaLabel')}
            style={{
              padding: `${spacing.xs}px ${spacing.md}px`,
              borderRadius: shape.radiusMd,
              background: colors.primary,
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: theme.typography.body.family,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span aria-hidden="true">🪴</span>
            {t('welcomeBack.tinyStep')}
          </button>
        )}

        {/* Continue normally */}
        <button
          type="button"
          onClick={handleContinue}
          aria-label={t('welcomeBack.continueAriaLabel')}
          style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            borderRadius: shape.radiusMd,
            background: 'transparent',
            color: colors.primary,
            border: `1.5px solid ${colors.primary}`,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: theme.typography.body.family,
          }}
        >
          {t('welcomeBack.continue')}
        </button>

        {/* Fresh start — soft, not punitive */}
        <button
          type="button"
          onClick={handleFreshStart}
          aria-label={t('welcomeBack.freshStartAriaLabel')}
          style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            borderRadius: shape.radiusMd,
            background: 'transparent',
            color: colors.muted,
            border: `1px solid ${colors.border}`,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: theme.typography.body.family,
          }}
        >
          {t('welcomeBack.freshStart')}
        </button>
      </div>
    </aside>
  );
}

/**
 * Call this from wherever you track the current streak so the banner can
 * preserve the value before a break resets it to 0.
 *
 * Usage:
 *   import { persistStreakSnapshot } from '../components/WelcomeBackBanner';
 *   persistStreakSnapshot(progress.taskStreakDays);
 */
export function persistStreakSnapshot(currentStreak: number): void {
  if (currentStreak > 0) {
    localStorage.setItem(LAST_STREAK_BEFORE_KEY, String(currentStreak));
  }
}

export function touchLastActive(): void {
  localStorage.setItem(LAST_ACTIVE_KEY, new Date().toISOString().slice(0, 10));
}
---END FILE---

---FILE: src/components/RewardsView.jsx---
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import useGamification from '../core/hooks/useGamification';
import { useTheme } from '../core/context/ThemeContext';
import SectionCard from './SectionCard.jsx';

/**
 * RewardsView component
 *
 * Rewards provide gentle positive feedback for completing tasks, maintaining
 * streaks or reviewing budgets. Users can disable points and streaks in
 * Settings. This component displays accumulated points, streak indicators,
 * cosmetic unlocks, and compassionate recovery messaging for lapsed streaks.
 */

const LAST_STREAK_BEFORE_KEY = 'gylio:lastStreakBeforeBreak';

/**
 * Returns days elapsed since lastActivityDate (ISO string), or null if unknown.
 */
function daysSinceActivity(lastActivityDate) {
  if (!lastActivityDate) return null;
  const last    = new Date(lastActivityDate);
  const today   = new Date();
  const utcLast  = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((utcToday - utcLast) / 86_400_000);
}

const RewardsView = () => {
  const { t } = useTranslation();
  const { ready, getRewards, getRewardsProgress, insertReward, updateReward, deleteReward } = useDB();
  const { theme } = useTheme();
  const { gamificationEnabled, setGamificationEnabled } = useGamification();
  const [rewards, setRewards] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', pointsRequired: '', description: '' });
  const [touched, setTouched] = useState({ title: false, pointsRequired: false });
  const [rewardDeleteConfirmId, setRewardDeleteConfirmId] = useState(null);

  const validation = useMemo(() => {
    const errors = { title: '', pointsRequired: '' };
    const trimmedTitle = form.title.trim();
    const points = Number.parseInt(form.pointsRequired, 10);

    if (!trimmedTitle) {
      errors.title = t('validation.titleRequired');
    }

    if (Number.isNaN(points)) {
      errors.pointsRequired = t('validation.invalidNumber');
    } else if (points <= 0) {
      errors.pointsRequired = t('validation.pointsPositive');
    }

    return errors;
  }, [form.pointsRequired, form.title, t]);

  const progressSummary = useMemo(() => {
    const points = progress?.points ?? 0;
    const level = progress?.level ?? 1;
    const nextLevelTarget = level * 100;
    return {
      points,
      level,
      nextLevelTarget,
      nextLevelRemaining: Math.max(0, nextLevelTarget - points),
      focusStreakDays: progress?.focusStreakDays ?? 0,
      taskStreakDays: progress?.taskStreakDays ?? 0,
      budgetStreakWeeks: progress?.budgetStreakWeeks ?? 0,
      skipTokens: progress?.skipTokens ?? 0,
    };
  }, [progress]);

  /**
   * bestStreak — merges the DB-level bestStreak with the localStorage
   * snapshot so history survives even if the DB is cleared/reset.
   */
  const bestStreak = useMemo(() => {
    const fromProgress = progress?.bestStreak ?? 0;
    const fromStorage  = parseInt(localStorage.getItem(LAST_STREAK_BEFORE_KEY) ?? '0', 10);
    return Math.max(fromProgress, fromStorage);
  }, [progress]);

  /**
   * gapDays — calendar days since last recorded activity.
   * Only meaningful when taskStreakDays === 0 (streak broken).
   */
  const gapDays = useMemo(() => {
    if ((progress?.taskStreakDays ?? 0) > 0) return null;
    const days = daysSinceActivity(progress?.lastActivityDate ?? null);
    return days !== null && days > 1 ? days : null;
  }, [progress]);

  const unlockedRewards = useMemo(
    () =>
      rewards.map((reward) => ({
        ...reward,
        unlocked: progressSummary.points >= reward.pointsRequired,
      })),
    [progressSummary.points, rewards]
  );

  const nearestReward = useMemo(() => {
    const locked = (rewards || []).filter((r) => !r.redeemed && r.pointsRequired > (progressSummary?.points ?? 0));
    if (!locked.length) return null;
    return locked.reduce((closest, r) => {
      const distA = r.pointsRequired - (progressSummary?.points ?? 0);
      const distB = closest.pointsRequired - (progressSummary?.points ?? 0);
      return distA < distB ? r : closest;
    });
  }, [rewards, progressSummary]);

  useEffect(() => {
    if (!ready) return;

    setLoading(true);
    Promise.all([getRewards(), getRewardsProgress()])
      .then(([loadedRewards, loadedProgress]) => {
        setRewards(loadedRewards);
        setProgress(loadedProgress);
      })
      .catch((error) => {
        console.error('Failed to load rewards', error);
      })
      .finally(() => setLoading(false));
  }, [getRewards, getRewardsProgress, ready]);

  const resetForm = () => {
    setForm({ title: '', pointsRequired: '', description: '' });
    setTouched({ title: false, pointsRequired: false });
  };

  const handleAdd = () => {
    if (!gamificationEnabled) return;
    setTouched({ title: true, pointsRequired: true });
    const hasErrors = Object.values(validation).some(Boolean);
    if (hasErrors) return;

    const points = Number.parseInt(form.pointsRequired, 10);

    insertReward(form.title.trim(), points, form.description.trim() || null)
      .then((created) => {
        setRewards((prev) => (prev.length ? [created, ...prev] : [created]));
        resetForm();
      })
      .catch((error) => {
        console.error('Failed to add reward', error);
      });
  };

  const toggleRedeemed = (reward) => {
    updateReward(reward.id, { redeemed: !reward.redeemed })
      .then((updated) => {
        if (!updated) return;
        setRewards((prev) => prev.map((entry) => (entry.id === reward.id ? updated : entry)));
      })
      .catch((error) => {
        console.error('Failed to update reward', error);
      });
  };

  const removeReward = (id) => {
    deleteReward(id)
      .then((deleted) => {
        if (deleted) {
          setRewards((prev) => prev.filter((entry) => entry.id !== id));
        }
        setRewardDeleteConfirmId(null);
      })
      .catch((error) => {
        console.error('Failed to delete reward', error);
      });
  };

  return (
    <SectionCard
      ariaLabel={`${t('rewards.title')} module`}
      title={t('rewards.title')}
      subtitle={t('rewardsPlaceholder') || ''}
    >
      <div style={{ display: 'grid', gap: `${theme.spacing.md}px` }}>
        {/* ── Gamification toggle ── */}
        <section
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusMd,
            padding: theme.spacing.md,
            background: theme.colors.surface,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: theme.spacing.md,
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>{t('rewards.gamificationLabel') || 'Gamification'}</p>
            <small style={{ color: theme.colors.muted }}>
              {t('rewards.gamificationHelper') ||
                'Toggle XP, streaks, and unlocks on or off. Your data stays local.'}
            </small>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <input
              type="checkbox"
              checked={gamificationEnabled}
              onChange={(event) => setGamificationEnabled(event.target.checked)}
              aria-label={t('rewards.gamificationLabel') || 'Gamification'}
              style={{ width: 20, height: 20 }}
            />
            <span>
              {gamificationEnabled
                ? t('rewards.gamificationOn') || 'Enabled'
                : t('rewards.gamificationOff') || 'Disabled'}
            </span>
          </label>
        </section>

        {!gamificationEnabled ? (
          <p style={{ color: theme.colors.muted }}>{t('rewards.gamificationDisabled') || 'Gamification is off.'}</p>
        ) : loading ? (
          <p>{t('loading') || 'Loading rewards…'}</p>
        ) : (
          <>
            {/* ── Progress & streak section ── */}
            <section
              style={{
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.shape.radiusMd,
                padding: theme.spacing.md,
                background: theme.colors.surface,
                display: 'grid',
                gap: theme.spacing.sm,
              }}
            >
              {/* XP / level row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: theme.spacing.md }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{t('rewards.levelLabel') || 'Level'}</p>
                  <p style={{ margin: '0.25rem 0 0' }}>
                    {t('rewards.levelSummary', { level: progressSummary.level }) || `Level ${progressSummary.level}`}
                  </p>
                  <small style={{ color: theme.colors.muted }}>
                    {t('rewards.xpSummary', {
                      points: progressSummary.points,
                      target: progressSummary.nextLevelTarget,
                    }) || `${progressSummary.points} XP / ${progressSummary.nextLevelTarget} XP`}
                  </small>
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{t('rewards.skipTokensLabel') || 'Skip tokens'}</p>
                  <p style={{ margin: '0.25rem 0 0' }}>{progressSummary.skipTokens}</p>
                  <small style={{ color: theme.colors.muted }}>
                    {t('rewards.skipTokensHelper') || 'Use a token to preserve a streak after a missed day.'}
                  </small>
                </div>
              </div>

              {/* ── Streak status — taskStreakDays is the primary streak ── */}
              <div style={{ display: 'grid', gap: theme.spacing.xs }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{t('rewards.streakHeading') || 'Streak status'}</p>

                {/* Task streak — prominent counter */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                    borderRadius: theme.shape.radiusMd,
                    background: progressSummary.taskStreakDays > 0
                      ? `${theme.colors.primary}12`
                      : theme.colors.background,
                    border: `1px solid ${progressSummary.taskStreakDays > 0
                      ? theme.colors.primary + '40'
                      : theme.colors.border}`,
                  }}
                >
                  {/* Streak number */}
                  <span
                    role="status"
                    aria-label={t('streakRecovery.streakLabel')}
                    style={{
                      fontSize: 36,
                      fontWeight: 800,
                      lineHeight: 1,
                      color: progressSummary.taskStreakDays > 0
                        ? theme.colors.primary
                        : theme.colors.muted,
                      fontFamily: theme.typography.heading?.family,
                    }}
                  >
                    {progressSummary.taskStreakDays}
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: theme.colors.text }}>
                      {t('rewards.taskStreak', { days: progressSummary.taskStreakDays }) ||
                        `Task completion streak: ${progressSummary.taskStreakDays} days`}
                    </span>

                    {/* Gap badge — neutral calendar emoji, no blame language */}
                    {progressSummary.taskStreakDays === 0 && gapDays !== null && (
                      <span
                        role="note"
                        aria-label={t('streakRecovery.gapAriaLabel', { days: gapDays })}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          color: theme.colors.muted,
                        }}
                      >
                        <span aria-hidden="true">📅</span>
                        {t('streakRecovery.gapBadge', { days: gapDays })}
                      </span>
                    )}

                    {/* Best streak — only when current streak is broken */}
                    {progressSummary.taskStreakDays === 0 && bestStreak > 0 && (
                      <span
                        aria-label={t('streakRecovery.bestStreakAriaLabel', { count: bestStreak })}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          color: theme.colors.muted,
                        }}
                      >
                        <span aria-hidden="true">🏅</span>
                        {t('streakRecovery.bestStreak', { count: bestStreak })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Focus & budget streaks */}
                <small style={{ color: theme.colors.muted }}>
                  {t('rewards.focusStreak', { days: progressSummary.focusStreakDays }) ||
                    `Daily focus streak: ${progressSummary.focusStreakDays} days`}
                </small>
                <small style={{ color: theme.colors.muted }}>
                  {t('rewards.budgetStreak', { weeks: progressSummary.budgetStreakWeeks }) ||
                    `Weekly budget review streak: ${progressSummary.budgetStreakWeeks} weeks`}
                </small>
              </div>
            </section>

            {/* ── Add reward form ── */}
            <div style={{ display: 'grid', gap: `${theme.spacing.sm}px`, marginBottom: `${theme.spacing.md}px` }}>
              <label>
                {t('titleLabel') || 'Title'}
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, title: e.target.value }));
                    setTouched((prev) => ({ ...prev, title: true }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                />
                {touched.title && validation.title ? (
                  <span style={{ color: theme.colors.accent }}>{validation.title}</span>
                ) : null}
              </label>
              <label>
                {t('pointsRequiredLabel') || 'Points required'}
                <input
                  type="number"
                  value={form.pointsRequired}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, pointsRequired: e.target.value }));
                    setTouched((prev) => ({ ...prev, pointsRequired: true }));
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                />
                {touched.pointsRequired && validation.pointsRequired ? (
                  <span style={{ color: theme.colors.accent }}>{validation.pointsRequired}</span>
                ) : null}
              </label>
              <label>
                {t('descriptionLabel') || 'Description'}
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm}px`,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: theme.typography.body.family,
                  }}
                />
              </label>
              <button
                type="button"
                onClick={handleAdd}
                style={{
                  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                  width: 'fit-content',
                  borderRadius: theme.shape.radiusSm,
                  border: `1px solid ${theme.colors.primary}`,
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background,
                  cursor: 'pointer',
                  fontFamily: theme.typography.body.family,
                }}
              >
                {t('addReward') || 'Add reward'}
              </button>
            </div>

            {/* ── Nearest reward progress bar ── */}
            {nearestReward && (
              <div style={{
                border: `2px solid ${theme.colors.primary}`,
                borderRadius: theme.shape.radiusMd,
                padding: `${theme.spacing.md}px`,
                marginBottom: `${theme.spacing.md}px`,
                backgroundColor: theme.colors.surface,
              }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, color: theme.colors.text }}>
                  {t('rewards.nearestHeading', "You're almost there!")}
                </p>
                <p style={{ margin: '0 0 8px', color: theme.colors.text }}>{nearestReward.title}</p>
                <div style={{ background: theme.colors.border, borderRadius: theme.shape.radiusFull, height: 10, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, Math.round(((progressSummary?.points ?? 0) / nearestReward.pointsRequired) * 100))}%`,
                    background: theme.colors.primary,
                    borderRadius: theme.shape.radiusFull,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                <small style={{ color: theme.colors.muted }}>
                  {t('rewards.progressLabel', {
                    current: progressSummary