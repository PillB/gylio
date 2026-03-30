/**
 * WelcomeBackBanner — Warm re-entry experience for lapsed users.
 *
 * Shows when user returns after 3+ days of absence. All strings go through i18n.
 * Detection order: localStorage FIRST so language choice persists across sessions.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../core/context/ThemeContext';
import { track, Events } from '../core/analytics';

const LAST_ACTIVE_KEY = 'gylio:lastActiveDate';
const DISMISSED_KEY   = 'gylio:welcomeBackDismissed';
const GAP_DAYS        = 3;
const MESSAGE_COUNT   = 4; // must match welcomeBack.message0..3 keys

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  onFreshStart?: () => void;
};

export default function WelcomeBackBanner({ onFreshStart }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [show, setShow]     = useState(false);
  const [gapDays, setGapDays] = useState(0);

  useEffect(() => {
    const today      = todayISO();
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    const dismissed  = localStorage.getItem(DISMISSED_KEY);

    if (lastActive && dismissed !== today) {
      const gap = daysBetween(lastActive, today);
      if (gap >= GAP_DAYS) {
        setGapDays(gap);
        setShow(true);
        track(Events.WELCOME_BACK_SHOWN, { gapDays: gap });
      }
    }
    localStorage.setItem(LAST_ACTIVE_KEY, today);
  }, []);

  const handleContinue = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, todayISO());
    setShow(false);
  }, []);

  const handleFreshStart = useCallback(() => {
    track(Events.WELCOME_BACK_FRESH_START, { gapDays });
    localStorage.setItem(DISMISSED_KEY, todayISO());
    setShow(false);
    onFreshStart?.();
  }, [gapDays, onFreshStart]);

  if (!show) return null;

  // Locale-aware day label
  const daysText = gapDays === 1
    ? t('welcomeBack.daysSingular')
    : t('welcomeBack.daysPlural', { count: gapDays });

  // Rotate through warm messages (cycle by gap length)
  const messageKey = `welcomeBack.message${gapDays % MESSAGE_COUNT}` as const;
  const message = t(messageKey);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        marginBottom: theme.spacing.xl,
        padding: `${theme.spacing.lg}px ${theme.spacing.xl}px`,
        borderRadius: theme.shape.radiusLg,
        background: `linear-gradient(135deg, ${theme.colors.primary}12 0%, ${theme.colors.surface} 100%)`,
        border: `1.5px solid ${theme.colors.primary}30`,
        boxShadow: theme.shadow.sm,
        fontFamily: theme.typography.body.family,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: theme.spacing.md, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>🌱</div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: theme.colors.text,
              fontFamily: theme.typography.heading.family,
              marginBottom: 4,
            }}
          >
            {t('welcomeBack.title', { days: daysText })}
          </div>
          <div
            style={{
              fontSize: 14,
              color: theme.colors.muted,
              lineHeight: 1.55,
              marginBottom: theme.spacing.md,
            }}
          >
            {message}
          </div>

          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <button
              onClick={handleContinue}
              style={{
                padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                borderRadius: theme.shape.radiusMd,
                background: theme.colors.primary,
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: theme.typography.body.family,
              }}
            >
              {t('welcomeBack.continueCta')}
            </button>
            <button
              onClick={handleFreshStart}
              style={{
                padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                borderRadius: theme.shape.radiusMd,
                background: 'transparent',
                color: theme.colors.muted,
                border: `1px solid ${theme.colors.border}`,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: theme.typography.body.family,
              }}
            >
              {t('welcomeBack.freshStartCta')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function touchLastActive(): void {
  localStorage.setItem(LAST_ACTIVE_KEY, new Date().toISOString().slice(0, 10));
}
