# task-4-streak-recovery

---FILE: src/components/WelcomeBackBanner.tsx---
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../core/context/ThemeContext';
import { track, Events } from '../core/analytics';

const LAST_ACTIVE_KEY        = 'gylio:lastActiveDate';
const DISMISSED_KEY          = 'gylio:welcomeBackDismissed';
const LAST_STREAK_BEFORE_KEY = 'gylio:lastStreakBeforeBreak';
const GAP_DAYS               = 3;
const MESSAGE_COUNT          = 4;

type Props = {
  onFreshStart?: () => void;
  onTinyStep?: () => void;
};

function getDaysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor(Math.abs(utcB - utcA) / msPerDay);
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function WelcomeBackBanner({ onFreshStart, onTinyStep }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [visible, setVisible]         = useState(false);
  const [gapDays, setGapDays]         = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [lastStreak, setLastStreak]   = useState<number | null>(null);

  useEffect(() => {
    const todayKey    = getTodayKey();
    const dismissed   = localStorage.getItem(DISMISSED_KEY);
    const lastActive  = localStorage.getItem(LAST_ACTIVE_KEY);
    const storedStreak = localStorage.getItem(LAST_STREAK_BEFORE_KEY);

    if (dismissed === todayKey) return;
    if (!lastActive) {
      localStorage.setItem(LAST_ACTIVE_KEY, todayKey);
      return;
    }

    const days = getDaysBetween(new Date(lastActive), new Date());
    if (days >= GAP_DAYS) {
      setGapDays(days);
      setMessageIndex(Math.floor(Math.random() * MESSAGE_COUNT));
      if (storedStreak) setLastStreak(parseInt(storedStreak, 10));
      setVisible(true);
      track(Events.WELCOME_BACK_SHOWN, { gapDays: days, lastStreak: storedStreak ?? null });
    } else {
      localStorage.setItem(LAST_ACTIVE_KEY, todayKey);
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, getTodayKey());
    localStorage.setItem(LAST_ACTIVE_KEY, getTodayKey());
    setVisible(false);
  }, []);

  const handleContinue = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const handleFreshStart = useCallback(() => {
    // Preserve last streak before clearing
    localStorage.removeItem(LAST_STREAK_BEFORE_KEY);
    track(Events.WELCOME_BACK_FRESH_START, { gapDays });
    dismiss();
    onFreshStart?.();
  }, [dismiss, gapDays, onFreshStart]);

  const handleTinyStep = useCallback(() => {
    track(Events.STREAK_RECOVERY_STARTED, { gapDays, lastStreak });
    dismiss();
    onTinyStep?.();
  }, [dismiss, gapDays, lastStreak, onTinyStep]);

  if (!visible) return null;

  const messages = [
    t('welcomeBack.message0', 'Life happens — welcome back.'),
    t('welcomeBack.message1', 'You showed up. That's what counts.'),
    t('welcomeBack.message2', 'Every return is a win. Good to see you.'),
    t('welcomeBack.message3', 'No pressure — you're back and that matters.'),
  ];

  const colors  = theme.colors;
  const spacing = theme.spacing;
  const shape   = theme.shape;
  const shadow  = theme.shadow;

  return (
    <aside
      role="complementary"
      aria-label={t('welcomeBack.bannerAriaLabel', 'Welcome back notification')}
      style={{
        background: colors.surface,
        border: `1.5px solid ${colors.border ?? colors.primary + '33'}`,
        borderRadius: shape.borderRadius ?? 12,
        boxShadow: shadow.md ?? '0 4px 16px rgba(0,0,0,0.10)',
        padding: `${spacing.lg ?? 24}px`,
        marginBottom: `${spacing.lg ?? 24}px`,
        maxWidth: 560,
        width: '100%',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm ?? 8, marginBottom: spacing.md ?? 16 }}>
        <span aria-hidden="true" style={{ fontSize: 28 }}>🌱</span>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: colors.text,
          }}
        >
          {t('welcomeBack.heading', 'Welcome back!')}
        </h2>
      </div>

      {/* Compassionate message */}
      <p style={{ margin: `0 0 ${spacing.sm ?? 8}px`, color: colors.textSecondary ?? colors.text, fontSize: 15 }}>
        {messages[messageIndex]}
      </p>

      {/* Gap notification — neutral, no blame */}
      <p
        aria-label={t('welcomeBack.gapAriaLabel', 'Days since last visit: {{days}}', { days: gapDays })}
        style={{
          margin: `0 0 ${spacing.md ?? 16}px`,
          color: colors.textSecondary ?? colors.text,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span aria-hidden="true">📅</span>
        {t('welcomeBack.gapNote', 'You were away for {{days}} days — that\'s okay.', { days: gapDays })}
      </p>

      {/* Soft-reset preserved streak */}
      {lastStreak !== null && lastStreak > 0 && (
        <div
          style={{
            background: colors.surfaceHighlight ?? colors.primary + '15',
            borderRadius: shape.borderRadiusSm ?? 8,
            padding: `${spacing.sm ?? 8}px ${spacing.md ?? 16}px`,
            marginBottom: spacing.md ?? 16,
            fontSize: 14,
            color: colors.text,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span aria-hidden="true">✨</span>
          {t(
            'welcomeBack.lastStreakRecovery',
            'You had a {{count}}-day streak — pick up where you left off.',
            { count: lastStreak }
          )}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.sm ?? 8,
          marginTop: spacing.sm ?? 8,
        }}
      >
        {/* Tiny step — primary recovery CTA */}
        {onTinyStep && (
          <button
            onClick={handleTinyStep}
            style={{
              background: colors.primary,
              color: colors.onPrimary ?? '#fff',
              border: 'none',
              borderRadius: shape.borderRadiusSm ?? 8,
              padding: `${spacing.sm ?? 8}px ${spacing.md ?? 16}px`,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            aria-label={t('welcomeBack.tinyStepAriaLabel', 'Start with one tiny step')}
          >
            <span aria-hidden="true">🪴</span>
            {t('welcomeBack.tinyStep', 'Start with one tiny step')}
          </button>
        )}

        {/* Continue normally */}
        <button
          onClick={handleContinue}
          style={{
            background: 'transparent',
            color: colors.primary,
            border: `1.5px solid ${colors.primary}`,
            borderRadius: shape.borderRadiusSm ?? 8,
            padding: `${spacing.sm ?? 8}px ${spacing.md ?? 16}px`,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
          aria-label={t('welcomeBack.continueAriaLabel', 'Continue where you left off')}
        >
          {t('welcomeBack.continue', 'Continue')}
        </button>

        {/* Fresh start — soft, not punitive */}
        <button
          onClick={handleFreshStart}
          style={{
            background: 'transparent',
            color: colors.textSecondary ?? colors.text,
            border: 'none',
            borderRadius: shape.borderRadiusSm ?? 8,
            padding: `${spacing.sm ?? 8}px ${spacing.md ?? 16}px`,
            fontSize: 13,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
          aria-label={t('welcomeBack.freshStartAriaLabel', 'Start completely fresh')}
        >
          {t('welcomeBack.freshStart', 'Fresh Start')}
        </button>
      </div>
    </aside>
  );
}

/**
 * Call this from wherever you track current streak so the banner can
 * preserve the value before a break resets it to 0.
 */
export function persistStreakSnapshot(currentStreak: number): void {
  if (currentStreak > 0) {
    localStorage.setItem(LAST_STREAK_BEFORE_KEY, String(currentStreak));
  }
}
---END FILE---

---FILE: src/components/RewardsView.jsx---
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import useGamification from '../core/hooks/useGamification';
import { useTheme } from '../core/context/ThemeContext';
import SectionCard from './SectionCard.jsx';

const LAST_STREAK_BEFORE_KEY = 'gylio:lastStreakBeforeBreak';

/**
 * Derive gap-day info from a progress object.
 * Expects progress to expose: currentStreak, lastActivityDate (ISO string or null)
 */
function computeGapInfo(progress) {
  if (!progress?.lastActivityDate) return null;
  const last    = new Date(progress.lastActivityDate);
  const today   = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const utcLast  = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days     = Math.floor((utcToday - utcLast) / msPerDay);
  // Only show gap if more than 1 day since last activity and streak is 0
  if (days > 1 && (progress.currentStreak ?? 0) === 0) {
    return { days };
  }
  return null;
}

const RewardsView = () => {
  const { t }                                                        = useTranslation();
  const { getRewards, getRewardsProgress, insertReward, updateReward, deleteReward } = useDB();
  const { gamificationEnabled }                                      = useGamification();
  const { theme }                                                    = useTheme();

  const [rewards, setRewards]   = useState([]);
  const [progress, setProgress] = useState(null);

  const colors  = theme.colors;
  const spacing = theme.spacing;
  const shape   = theme.shape;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [r, p] = await Promise.all([getRewards(), getRewardsProgress()]);
      if (!cancelled) {
        setRewards(r ?? []);
        setProgress(p ?? null);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [getRewards, getRewardsProgress]);

  const gapInfo   = useMemo(() => computeGapInfo(progress), [progress]);
  const bestStreak = useMemo(() => {
    const fromProgress = progress?.bestStreak ?? 0;
    const fromStorage  = parseInt(localStorage.getItem(LAST_STREAK_BEFORE_KEY) ?? '0', 10);
    return Math.max(fromProgress, fromStorage);
  }, [progress]);

  if (!gamificationEnabled) return null;

  const currentStreak = progress?.currentStreak ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg ?? 24 }}>
      {/* ── Streak Section ── */}
      <SectionCard>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: spacing.sm ?? 8,
            padding: `${spacing.md ?? 16}px 0`,
          }}
        >
          {/* Streak counter heading */}
          <h2
            id="streak-heading"
            style={{ margin: 0, fontSize: 15, fontWeight: 600, color: colors.textSecondary ?? colors.text }}
          >
            {t('streakRecovery.streakLabel', 'Current streak')}
          </h2>

          {/* Primary streak number */}
          <div
            role="status"
            aria-labelledby="streak-heading"
            aria-live="polite"
            style={{
              fontSize: 52,
              fontWeight: 800,
              lineHeight: 1,
              color: currentStreak > 0 ? colors.primary : colors.textSecondary ?? colors.text,
            }}
          >
            {currentStreak}
          </div>

          <p style={{ margin: 0, fontSize: 13, color: colors.textSecondary ?? colors.text }}>
            {t('streakRecovery.daysUnit', 'days')}
          </p>

          {/* Gap indicator — neutral, compassionate */}
          {gapInfo && (
            <div
              role="note"
              aria-label={t(
                'streakRecovery.gapAriaLabel',
                '{{days}}-day gap since last activity',
                { days: gapInfo.days }
              )}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: colors.surfaceHighlight ?? colors.surface,
                border: `1px solid ${colors.border ?? colors.primary + '33'}`,
                borderRadius: shape.borderRadiusSm ?? 8,
                padding: `4px ${spacing.sm ?? 8}px`,
                fontSize: 13,
                color: colors.textSecondary ?? colors.text,
                marginTop: spacing.xs ?? 4,
              }}
            >
              {/* Neutral calendar icon, no flame-out */}
              <span aria-hidden="true">📅</span>
              {t('streakRecovery.gapBadge', '{{days}}-day gap', { days: gapInfo.days })}
            </div>
          )}

          {/* Best streak narrative — always visible after a break */}
          {bestStreak > 0 && (
            <p
              aria-label={t(
                'streakRecovery.bestStreakAriaLabel',
                'Your best streak was {{count}} days',
                { count: bestStreak }
              )}
              style={{
                margin: `${spacing.xs ?? 4}px 0 0`,
                fontSize: 13,
                color: colors.textSecondary ?? colors.text,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span aria-hidden="true">🏅</span>
              {t('streakRecovery.bestStreak', 'Best: {{count}} days', { count: bestStreak })}
            </p>
          )}
        </div>
      </SectionCard>

      {/* ── Rewards list ── */}
      {rewards.length > 0 && (
        <SectionCard>
          <h2
            style={{ margin: `0 0 ${spacing.md ?? 16}px`, fontSize: 16, fontWeight: 700, color: colors.text }}
          >
            {t('streakRecovery.rewardsHeading', 'Your rewards')}
          </h2>
          <ul
            style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: spacing.sm ?? 8 }}
          >
            {rewards.map((reward) => (
              <li
                key={reward.id}
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border ?? colors.primary + '22'}`,
                  borderRadius: shape.borderRadiusSm ?? 8,
                  padding: `${spacing.sm ?? 8}px ${spacing.md ?? 16}px`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 14,
                  color: colors.text,
                }}
              >
                <span>{reward.title}</span>
                {reward.completed && (
                  <span
                    aria-label={t('streakRecovery.rewardCompleted', 'Completed')}
                    style={{ color: colors.success ?? colors.primary, fontWeight: 700 }}
                  >
                    ✓
                  </span>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
};

export default RewardsView;
---END FILE---

---FILE: src/core/hooks/useStreakRecovery.ts---
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { track, Events } from '../analytics';
import useDB from './useDB';

const LAST_STREAK_BEFORE_KEY = 'gylio:lastStreakBeforeBreak';

export interface StreakRecoveryOptions {
  /** Called after the starter task has been inserted; receives the new task id */
  onTaskCreated?: (taskId: string) => void;
}

/**
 * Provides the two recovery actions wired up for WelcomeBackBanner:
 *  - createTinyStepTask()   → inserts a 2-min starter task, tracks STREAK_RECOVERY_STARTED
 *  - markRecoveryComplete() → should be called when the starter task is ticked off
 */
export function useStreakRecovery({ onTaskCreated }: StreakRecoveryOptions = {}) {
  const { t }         = useTranslation();
  const { insertTask } = useDB() as { insertTask: (task: object) => Promise<{ id: string }> };

  const createTinyStepTask = useCallback(async () => {
    const lastStreak = parseInt(localStorage.getItem(LAST_STREAK_BEFORE_KEY) ?? '0', 10);
    const title      = t('welcomeBack.tinyStepTaskTitle', 'One tiny step for today 🌱');
    const task = {
      title,
      durationMinutes: 2,
      tags: ['recovery'],
      createdAt: new Date().toISOString(),
    };

    try {
      const created = await insertTask(task);
      track(Events.STREAK_RECOVERY_STARTED, { lastStreak, taskId: created?.id });
      onTaskCreated?.(created?.id);
      return created;
    } catch (err) {
      console.error('[useStreakRecovery] Failed to create tiny-step task', err);
      return null;
    }
  }, [t, insertTask, onTaskCreated]);

  const markRecoveryComplete = useCallback((taskId?: string) => {
    track(Events.STREAK_RECOVERY_COMPLETED, { taskId });
  }, []);

  return { createTinyStepTask, markRecoveryComplete } as const;
}

export default useStreakRecovery;
---END FILE---

---FILE: src/core/analytics/events.ts---
// Extend the existing events enum/object — add only the new entries here.
// If your project exports a plain object, add these keys; if an enum, add as members.

// NOTE: Merge these into your existing Events export.
export const StreakRecoveryEvents = {
  STREAK_RECOVERY_STARTED:   'streak_recovery_started',
  STREAK_RECOVERY_COMPLETED: 'streak_recovery_completed',
} as const;
---END FILE---

---FILE: src/components/__tests__/WelcomeBackBanner.test.tsx---
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WelcomeBackBanner from '../WelcomeBackBanner';

// ── mocks ──────────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, fb: string) => fb }),
}));

vi.mock('../../core/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: { primary: '#6200ee', surface: '#fff', text: '#000', onPrimary: '#fff' },
      spacing: { sm: 8, md: 16, lg: 24, xs: 4 },
      shape: { borderRadius: 12, borderRadiusSm: 8 },
      shadow: { md: '0 4px 16px rgba(0,0,0,.1)' },
    },
  }),
}));

vi.mock('../../core/analytics', () => ({
  Events: {
    WELCOME_BACK_SHOWN:        'welcome_back_shown',
    WELCOME_BACK_FRESH_START:  'welcome_back_fresh_start',
    STREAK_RECOVERY_STARTED:   'streak_recovery_started',
    STREAK_RECOVERY_COMPLETED: 'streak_recovery_completed',
  },
  track: vi.fn(),
}));

// ── helpers ────────────────────────────────────────────────────────────────
const LAST_ACTIVE_KEY        = 'gylio:lastActiveDate';
const DISMISSED_KEY          = 'gylio:welcomeBackDismissed';
const LAST_STREAK_BEFORE_KEY = 'gylio:lastStreakBeforeBreak';

function setDaysAgo(key: string, days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  localStorage.setItem(key, d.toISOString().slice(0, 10));
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ── tests ──────────────────────────────────────────────────────────────────
describe('WelcomeBackBanner', () => {
  it('does not render when gap < GAP_DAYS', () => {
    setDaysAgo(LAST_ACTIVE_KEY, 1);
    const { container } = render(<WelcomeBackBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders after 3+ day gap', () => {
    setDaysAgo(LAST_ACTIVE_KEY, 5);
    render(<WelcomeBackBanner />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('shows preserved streak copy when lastStreakBeforeBreak is set', () => {
    setDaysAgo(LAST_ACTIVE_KEY, 5);
    localStorage.setItem(LAST_STREAK_BEFORE_KEY, '14');
    render(<WelcomeBackBanner onTinyStep={vi.fn()} />);
    expect(screen.getByText(/14-day streak/)).toBeInTheDocument();
  });

  it('calls onTinyStep and tracks STREAK_RECOVERY_STARTED', () => {
    const { track } = require('../../core/analytics');
    setDaysAgo(LAST_ACTIVE_KEY, 4);
    localStorage.setItem(LAST_STREAK_BEFORE_KEY, '7');
    const onTinyStep = vi.fn();
    render(<WelcomeBackBanner onTinyStep={onTinyStep} />);
    fireEvent.click(screen.getByRole('button', { name: /tiny step/i }));
    expect(onTinyStep).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(
      'streak_recovery_started',
      expect.objectContaining({ lastStreak: 7 })
    );
  });

  it('calls onFreshStart and tracks WELCOME_BACK_FRESH_START', () => {
    const { track } = require('../../core/analytics');
    setDaysAgo(LAST_ACTIVE_KEY, 4);
    const onFreshStart = vi.fn();
    render(<WelcomeBackBanner onFreshStart={onFreshStart} />);
    fireEvent.click(screen.getByRole('button', { name: /fresh start/i }));
    expect(onFreshStart).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('welcome_back_fresh_start', expect.any(Object));
  });

  it('hides after Continue is clicked', () => {
    setDaysAgo(LAST_ACTIVE_KEY, 5);
    render(<WelcomeBackBanner />);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('does not show tiny-step button when onTinyStep is absent', () => {
    setDaysAgo(LAST_ACTIVE_KEY, 5);
    render(<WelcomeBackBanner />);
    expect(screen.queryByRole('button', { name: /tiny step/i })).not.toBeInTheDocument();
  });
});
---END FILE---

---I18N EN---
{
  "welcomeBack": {
    "bannerAriaLabel": "Welcome back notification",
    "heading": "Welcome back!",
    "message0": "Life happens — welcome back.",
    "message1": "You showed up. That's what counts.",
    "message2": "Every return is a win. Good to see you.",
    "message3": "No pressure — you're back and that matters.",
    "gapNote": "You were away for {{days}} days — that's okay.",
    "gapAriaLabel": "Days since last visit: {{days}}",
    "lastStreakRecovery": "You had a {{count}}-day streak — pick up where you left off.",
    "tinyStep": "Start with one tiny step",
    "tinyStepAriaLabel": "Start with one tiny step",
    "tinyStepTaskTitle": "One tiny step for today 🌱",
    "continue": "Continue",
    "continueAriaLabel": "Continue where you left off",
    "freshStart": "Fresh Start",
    "freshStartAriaLabel": "Start completely fresh"
  },
  "streakRecovery": {
    "streakLabel": "Current streak",
    "daysUnit": "days",
    "gapBadge": "{{days}}-day gap",
    "gapAriaLabel": "{{days}}-day gap since last activity",
    "bestStreak": "Best: {{count}} days",
    "bestStreakAriaLabel": "Your best streak was {{count}} days",
    "rewardsHeading": "Your rewards",
    "rewardCompleted": "Completed"
  }
}
---END I18N EN---

---I18N ES-PE---
{
  "welcomeBack": {
    "bannerAriaLabel": "Notificación de bienvenida",
    "heading": "¡Bienvenido/a de vuelta!",
    "message0": "La vida pasa — aquí estás de nuevo.",
    "message1": "Apareciste. Eso es lo que importa.",
    "message2": "Cada regreso es un logro. Qué bueno verte.",
    "message3": "Sin presión — volviste y eso cuenta.",
    "gapNote": "Estuviste ausente {{days}} días — está bien.",
    "gapAriaLabel": "Días desde tu última visita: {{days}}",
    "lastStreakRecovery": "Tenías una racha de {{count}} días — retómala donde la dejaste.",
    "tinyStep": "Empieza con un paso pequeño",
    "tinyStepAriaLabel": "Empieza con un paso pequeño",
    "tinyStepTaskTitle": "Un pequeño paso para hoy 🌱",
    "continue": "Continuar",
    "continueAriaLabel": "Continuar donde lo dejaste",
    "freshStart": "Empezar de cero",
    "freshStartAriaLabel": "Comenzar completamente de nuevo"
  },
  "streakRecovery": {
    "streakLabel": "Racha actual",
    "daysUnit": "días",
    "gapBadge": "Pausa de {{days}} días",
    "gapAriaLabel": "Pausa de {{days}} días desde la última actividad",
    "bestStreak": "Mejor racha: {{count}} días",
    "bestStreakAriaLabel": "Tu mejor racha fue de {{count}} días",
    "rewardsHeading": "Tus recompensas",
    "rewardCompleted": "Completado"
  }
}
---END I18N ES-PE---

---NOTES---
- `persistStreakSnapshot(n)` is exported from WelcomeBackBanner so callers can snapshot the streak *before* a reset zeroes it; this decouples the banner from streak calculation internals and keeps the logic deterministic.
- `useStreakRecovery` centralises task creation + both analytics events, so any screen can wire up recovery without duplicating logic; `markRecoveryComplete` is intentionally a fire-and-forget call placed by the caller's task-completion handler.
- Gap detection in RewardsView is derived purely from `progress.lastActivityDate` + `currentStreak === 0` — no extra storage key needed; `bestStreak` merges DB value with localStorage snapshot so history survives even if the DB resets.
- The "tiny step" button is conditionally rendered only when `onTinyStep` is provided, preserving backwards-compatibility for existing callers that don't pass the prop.
- All gap / break language uses neutral framing ("gap", "away", "pausa") and avoids loss/failure vocabulary; flame emoji
