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
