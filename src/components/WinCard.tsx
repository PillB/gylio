/**
 * WinCard — Full-screen milestone celebration overlay.
 *
 * Designed to look premium when screenshotted (Duolingo-proven viral mechanic).
 * Uses the Web Share API with clipboard fallback for one-tap sharing.
 * All user-facing strings go through i18n.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../core/context/ThemeContext';
import { track, Events } from '../core/analytics';

export type WinType =
  | 'streak'
  | 'all_tasks_done'
  | 'routine_complete'
  | 'budget_goal'
  | 'first_task'
  | 'first_routine'
  | 'level_up';

type Props = {
  type: WinType;
  milestone?: number;
  label: string;
  sublabel?: string;
  onClose: () => void;
};

const WIN_COLORS: Record<WinType, string> = {
  streak:          '#F97316',
  all_tasks_done:  '#22C55E',
  routine_complete:'#8B5CF6',
  budget_goal:     '#3B82F6',
  first_task:      '#EC4899',
  first_routine:   '#F59E0B',
  level_up:        '#10B981',
};

const WIN_EMOJIS: Record<WinType, string> = {
  streak:          '🔥',
  all_tasks_done:  '✅',
  routine_complete:'⚡',
  budget_goal:     '💰',
  first_task:      '🚀',
  first_routine:   '🌅',
  level_up:        '🎯',
};

// i18n key root per type
const WIN_KEY: Record<WinType, string> = {
  streak:          'win.streak',
  all_tasks_done:  'win.allTasksDone',
  routine_complete:'win.routineComplete',
  budget_goal:     'win.budgetGoal',
  first_task:      'win.firstTask',
  first_routine:   'win.firstRoutine',
  level_up:        'win.levelUp',
};

export default function WinCard({ type, milestone, label, sublabel, onClose }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const color  = WIN_COLORS[type];
  const emoji  = WIN_EMOJIS[type];
  const keyRoot = WIN_KEY[type];

  const [copied, setCopied]     = useState(false);
  const [shareError, setShareError] = useState(false);

  // Resolve headline with interpolation params
  const headline = t(`${keyRoot}.headline`, {
    days:  milestone,
    level: milestone,
  });
  const sub = sublabel ?? t(`${keyRoot}.sub`);

  useEffect(() => {
    track(Events.WIN_CARD_SHOWN, { type, milestone });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [type, milestone, onClose]);

  const shareText = `${emoji} ${label} — ${sub.split('.')[0]}. #Gylio`;

  const handleShare = useCallback(async () => {
    track(Events.WIN_CARD_SHARED, { type, milestone });
    try {
      if (navigator.share) {
        await navigator.share({ title: label, text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      setShareError(true);
      setTimeout(() => setShareError(false), 2500);
    }
  }, [label, shareText, type, milestone]);

  const shareLabel = copied
    ? t('win.copied')
    : shareError
    ? t('win.shareError')
    : t('win.shareCta');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.72)',
        padding: theme.spacing.lg,
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Card — designed to be screenshotted */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 380,
          borderRadius: theme.shape.radiusLg,
          overflow: 'hidden',
          background: `linear-gradient(155deg, ${color}18 0%, ${theme.colors.surface} 50%)`,
          border: `2px solid ${color}40`,
          boxShadow: `0 0 60px ${color}30, ${theme.shadow.md}`,
          textAlign: 'center',
          padding: `${theme.spacing.xxl}px ${theme.spacing.xl}px`,
          fontFamily: theme.typography.body.family,
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label={t('win.closeAria')}
          style={{
            position: 'absolute',
            top: theme.spacing.sm,
            right: theme.spacing.sm,
            background: 'transparent',
            border: 'none',
            color: theme.colors.muted,
            fontSize: 20,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 4,
          }}
        >
          ×
        </button>

        {/* Branding watermark */}
        <div
          style={{
            position: 'absolute',
            top: theme.spacing.sm,
            left: theme.spacing.md,
            fontSize: 11,
            fontWeight: 700,
            color,
            letterSpacing: '0.08em',
            opacity: 0.6,
          }}
        >
          GYLIO
        </div>

        {/* Emoji */}
        <div style={{ fontSize: 72, lineHeight: 1, marginBottom: theme.spacing.md }}>
          {emoji}
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            color,
            fontFamily: theme.typography.heading.family,
            lineHeight: 1.1,
            marginBottom: theme.spacing.xs,
            letterSpacing: '-0.03em',
          }}
        >
          {headline}
        </div>

        {/* User label */}
        <div style={{ fontSize: 16, fontWeight: 600, color: theme.colors.text, marginBottom: theme.spacing.sm }}>
          {label}
        </div>

        {/* Divider */}
        <div
          style={{
            width: 40, height: 3,
            background: color,
            borderRadius: 99,
            margin: `${theme.spacing.sm}px auto`,
          }}
        />

        {/* Motivational sub-copy */}
        <p
          style={{
            fontSize: 14,
            color: theme.colors.muted,
            lineHeight: 1.6,
            margin: `0 0 ${theme.spacing.lg}px`,
            fontStyle: 'italic',
          }}
        >
          {sub}
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          <button
            onClick={handleShare}
            style={{
              padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
              borderRadius: theme.shape.radiusMd,
              background: color,
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              fontFamily: theme.typography.body.family,
              transition: 'opacity 0.15s',
            }}
          >
            {shareLabel}
          </button>
          <button
            onClick={onClose}
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
            {t('win.keepGoing')}
          </button>
        </div>
      </div>
    </div>
  );
}
