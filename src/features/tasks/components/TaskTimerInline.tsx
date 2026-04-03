import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import { useTaskTimer } from '../../../core/context/TaskTimerContext';

const pad = (n: number) => String(n).padStart(2, '0');

interface TaskTimerInlineProps {
  taskId: number;
}

const PHASE_CONFIG = {
  focus: { emoji: '🍅', colorKey: 'primary' as const, i18nKey: 'tasks.timerPhaseFocus' },
  'short-break': { emoji: '☕', colorKey: 'success' as const, i18nKey: 'tasks.timerPhaseShortBreak' },
  'long-break': { emoji: '🌿', colorKey: 'success' as const, i18nKey: 'tasks.timerPhaseLongBreak' },
};

const TaskTimerInline: React.FC<TaskTimerInlineProps> = ({ taskId }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { activeTimer, pauseTimer, resumeTimer, skipPhase, stopTimer, startTask } = useTaskTimer();

  const isActive = activeTimer?.taskId === taskId;

  if (!isActive) return null;

  const timer = activeTimer!;
  const isPaused = timer.status === 'paused';
  const phaseCfg = PHASE_CONFIG[timer.phase];
  const mm = pad(Math.floor(timer.remainingSeconds / 60));
  const ss = pad(timer.remainingSeconds % 60);
  const progress = timer.totalSeconds > 0 ? (timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds : 0;

  const phaseLabel = t(phaseCfg.i18nKey, timer.phase);
  const phaseColor = timer.phase === 'focus' ? theme.colors.primary : theme.colors.success;
  const sessionLabel = timer.phase === 'focus'
    ? t('tasks.timerSession', { n: timer.focusSessionsCompleted + 1 })
    : t('tasks.timerAfterSessions', { n: timer.focusSessionsCompleted });

  return (
    <div
      role="region"
      aria-label={t('tasks.timerRegionAria', 'Task timer')}
      style={{
        marginTop: theme.spacing.sm,
        padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
        borderRadius: theme.shape.radiusMd,
        border: `1.5px solid ${phaseColor}`,
        backgroundColor: theme.colors.surface,
        display: 'grid',
        gap: `${theme.spacing.xs}px`,
      }}
    >
      {/* Phase + countdown row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: phaseColor }}>
          {phaseCfg.emoji} {phaseLabel}
          <span style={{ fontSize: '0.72rem', fontWeight: 400, color: theme.colors.muted, marginLeft: 6 }}>
            {sessionLabel}
          </span>
        </span>
        <span
          aria-live="polite"
          aria-atomic="true"
          style={{
            fontFamily: 'monospace',
            fontSize: '1.4rem',
            fontWeight: 700,
            color: isPaused ? theme.colors.muted : theme.colors.text,
            letterSpacing: '0.04em',
            minWidth: 60,
            textAlign: 'right',
          }}
        >
          {mm}:{ss}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{ height: 4, borderRadius: 2, backgroundColor: theme.colors.border, overflow: 'hidden' }}
        aria-hidden="true"
      >
        <div
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            backgroundColor: isPaused ? theme.colors.muted : phaseColor,
            transition: 'width 0.9s linear',
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap', alignItems: 'center' }}>
        {isPaused && timer.phase === 'focus' && timer.remainingSeconds === timer.totalSeconds ? (
          // Ready to start new focus session
          <button
            type="button"
            onClick={() => startTask(taskId)}
            aria-label={t('tasks.timerStartFocusAria')}
            style={btnStyle(theme, phaseColor, true)}
          >
            ▶ {t('tasks.timerStartFocusBtn', 'Start focus')}
          </button>
        ) : isPaused ? (
          <button
            type="button"
            onClick={resumeTimer}
            aria-label={t('tasks.timerResume')}
            style={btnStyle(theme, phaseColor, true)}
          >
            ▶ {t('tasks.timerResume', 'Resume')}
          </button>
        ) : (
          <button
            type="button"
            onClick={pauseTimer}
            aria-label={t('tasks.timerPause')}
            style={btnStyle(theme, theme.colors.border, false)}
          >
            ⏸ {t('tasks.timerPause', 'Pause')}
          </button>
        )}

        <button
          type="button"
          onClick={skipPhase}
          aria-label={t('tasks.timerSkipAria')}
          style={btnStyle(theme, theme.colors.border, false)}
        >
          {timer.phase === 'focus' ? `${t('tasks.timerSkipToBreak', 'Skip to break')}` : `${t('tasks.timerSkipToFocus', 'Skip break')}`}
        </button>

        <button
          type="button"
          onClick={stopTimer}
          aria-label={t('tasks.timerStopAria')}
          style={{ ...btnStyle(theme, theme.colors.border, false), marginLeft: 'auto', color: theme.colors.muted }}
        >
          ⏹ {t('tasks.timerStop', 'Stop')}
        </button>
      </div>
    </div>
  );
};

function btnStyle(theme: any, borderColor: string, filled: boolean): React.CSSProperties {
  return {
    minHeight: 32,
    padding: `4px ${theme.spacing.sm}px`,
    borderRadius: theme.shape.radiusMd,
    border: `1px solid ${borderColor}`,
    backgroundColor: filled ? borderColor : 'transparent',
    color: filled ? (theme.colors.primaryForeground ?? '#fff') : theme.colors.text,
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontFamily: theme.typography.body.family,
    fontWeight: filled ? 600 : 400,
    transition: 'all 150ms',
  };
}

export default TaskTimerInline;
