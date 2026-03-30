import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { PomodoroStatus } from '../hooks/usePomodoroTimer';

type PomodoroTimerProps = {
  status: PomodoroStatus;
  remainingSeconds: number;
  totalSeconds: number;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onComplete?: () => void;
};

const pad = (n: number) => String(n).padStart(2, '0');

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  status,
  remainingSeconds,
  totalSeconds,
  onPause,
  onResume,
  onCancel,
  onComplete,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const mm = pad(Math.floor(remainingSeconds / 60));
  const ss = pad(remainingSeconds % 60);
  const progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;

  useEffect(() => {
    if (status === 'done') {
      onComplete?.();
    }
  }, [status, onComplete]);

  if (status === 'idle') return null;

  const isDone = status === 'done';
  const isPaused = status === 'paused';

  const statusLabel = isDone
    ? t('tasks.timerDone')
    : isPaused
    ? t('tasks.timerPaused', { mm, ss })
    : t('tasks.timerRunning', { mm, ss });

  return (
    <div
      role="region"
      aria-label={t('tasks.focusAreaAria')}
      style={{
        border: `2px solid ${theme.colors.primary}`,
        borderRadius: theme.shape.radiusMd,
        padding: `${theme.spacing.md}px`,
        backgroundColor: theme.colors.surface,
        display: 'grid',
        gap: `${theme.spacing.sm}px`,
      }}
    >
      {/* Live region for screen-reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      >
        {!isDone
          ? t('tasks.timerAriaLive', {
              mm: String(Math.floor(remainingSeconds / 60)),
              ss: String(remainingSeconds % 60),
            })
          : t('tasks.timerDone')}
      </div>

      {/* Countdown display */}
      <div
        aria-hidden="true"
        style={{
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: isDone ? '1.25rem' : '2.5rem',
          fontWeight: theme.typography.heading.weight,
          color: isDone ? theme.colors.primary : theme.colors.text,
          letterSpacing: '0.05em',
        }}
      >
        {isDone ? t('tasks.timerDone') : `${mm}:${ss}`}
      </div>

      {/* Progress bar */}
      {!isDone && (
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={statusLabel}
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.colors.border,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              backgroundColor: isPaused ? theme.colors.muted : theme.colors.primary,
              transition: 'width 0.9s linear',
            }}
          />
        </div>
      )}

      {/* Status label */}
      <p style={{ margin: 0, textAlign: 'center', color: theme.colors.muted }}>
        {statusLabel}
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, justifyContent: 'center', flexWrap: 'wrap' }}>
        {!isDone && (
          <>
            {isPaused ? (
              <button
                type="button"
                onClick={onResume}
                aria-label={t('tasks.timerResume')}
                style={{
                  minHeight: '44px',
                  padding: `${theme.spacing.xs}px ${theme.spacing.lg}px`,
                  borderRadius: theme.shape.radiusMd,
                  border: `1px solid ${theme.colors.primary}`,
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: theme.typography.body.family,
                }}
              >
                {t('tasks.timerResume')}
              </button>
            ) : (
              <button
                type="button"
                onClick={onPause}
                aria-label={t('tasks.timerPause')}
                style={{
                  minHeight: '44px',
                  padding: `${theme.spacing.xs}px ${theme.spacing.lg}px`,
                  borderRadius: theme.shape.radiusMd,
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  cursor: 'pointer',
                  fontFamily: theme.typography.body.family,
                }}
              >
                {t('tasks.timerPause')}
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={onCancel}
          aria-label={t('tasks.timerCancel')}
          style={{
            minHeight: '44px',
            padding: `${theme.spacing.xs}px ${theme.spacing.lg}px`,
            borderRadius: theme.shape.radiusMd,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.surface,
            color: theme.colors.muted,
            cursor: 'pointer',
            fontFamily: theme.typography.body.family,
          }}
        >
          {t('tasks.timerCancel')}
        </button>
      </div>
    </div>
  );
};

export default PomodoroTimer;
