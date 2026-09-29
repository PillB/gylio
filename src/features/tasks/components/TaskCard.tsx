import React from 'react';
import { useTranslation } from 'react-i18next';
import Checkbox from '../../../components/atoms/Checkbox';
import { useTheme } from '../../../core/context/ThemeContext';
import { energyTone } from '../utils/energyTone';
import { parsePlannedDate } from '../utils/taskForm';
import { energyLabelKey, focusStats, formatFocusTime } from '../utils/taskViews';
import TaskTimerInline from './TaskTimerInline';
import type { ChecklistTask, TaskActions } from './taskActions';
import { controlStyle } from './taskStyles';

type Props = { task: ChecklistTask; actions: TaskActions };

const EnergyBadge: React.FC<{ task: ChecklistTask }> = ({ task }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const level = task.energyRequired ?? 'medium';
  const tone = energyTone(theme, task.energyRequired);
  return (
    <span
      style={{
        display: 'inline-block',
        justifySelf: 'start',
        padding: '2px 8px',
        borderRadius: theme.shape.radiusFull,
        backgroundColor: tone.fill,
        color: tone.onFill,
        fontSize: '0.7rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
      }}
    >
      {t(energyLabelKey(level), level)}
    </span>
  );
};

/** Total focus time and sessions, hidden until at least 30 seconds were logged. */
const FocusSummary: React.FC<{ task: ChecklistTask }> = ({ task }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { seconds, sessions } = focusStats(task.timeLog);
  if (seconds < 30) return null;
  const sessionWord =
    sessions === 1 ? t('tasks.timerSessionSingular', 'session') : t('tasks.timerSessionPlural', 'sessions');
  return (
    <span style={{ fontSize: '0.72rem', color: theme.colors.muted }}>
      🕐 {formatFocusTime(seconds)}
      {sessions > 0 ? ` · ${sessions} ${sessionWord}` : ''}
    </span>
  );
};

const TimerRow: React.FC<Props> = ({ task, actions }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  if (actions.activeTimerTaskId === task.id) return <TaskTimerInline taskId={task.id} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xs, flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={() => actions.startTimer(task.id)}
        aria-label={t('tasks.startTimerAria', { title: task.title, minutes: actions.focusMinutes })}
        style={{
          padding: `3px ${theme.spacing.sm}px`,
          borderRadius: theme.shape.radiusMd,
          border: `1px solid ${theme.colors.border}`,
          background: 'transparent',
          color: theme.colors.muted,
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontFamily: theme.typography.body.family,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        🍅 {t('tasks.startTimerBtn', { minutes: actions.focusMinutes })}
      </button>
      <FocusSummary task={task} />
    </div>
  );
};

const StepProgress: React.FC<{ task: ChecklistTask }> = ({ task }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  if (task.totalSteps <= 0) return null;
  return (
    <div style={{ display: 'grid', gap: '0.25rem' }}>
      <progress
        value={task.completedSteps}
        max={task.totalSteps}
        aria-label={t('tasks.progressAria', { title: task.title })}
        style={{ width: '100%' }}
      />
      <span style={{ color: theme.colors.muted }}>
        {t('tasks.progressLabel', { completed: task.completedSteps, total: task.totalSteps })}
      </span>
    </div>
  );
};

/** The task's steps, with a "Start here" marker on the first unfinished one. */
const SubtaskChecklist: React.FC<Props> = ({ task, actions }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  if (!task.subtasks.length) return null;
  const nextIndex = task.subtasks.findIndex((subtask) => !subtask.done);
  return (
    <ul style={{ margin: '0 0 0 2.25rem', padding: 0, listStyle: 'none', display: 'grid', gap: '0.25rem' }}>
      {task.subtasks.map((subtask, index) => (
        <li key={`${task.id}-subtask-${index.toString()}`}>
          {index === nextIndex && (
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: theme.colors.primary, display: 'block', marginBottom: 2 }}>
              → {t('tasks.startHere', 'Start here')}
            </span>
          )}
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="checkbox" checked={subtask.done} onChange={() => actions.toggleSubtask(task.id, index)} />
            <span style={{ color: subtask.done ? theme.colors.muted : theme.colors.text }}>{subtask.label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
};

/** One task in the Today, Week and Backlog lists. */
const TaskCard: React.FC<Props> = ({ task, actions }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isCompleted = task.status === 'completed';
  const planned = parsePlannedDate(task.plannedDate ?? null);
  const completeLabel = t('tasks.complete', { title: task.title });
  const uncompleteLabel = t('tasks.uncomplete', { title: task.title });
  const cardButton = controlStyle(theme);
  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <Checkbox
        id={`task-${task.id}`}
        label={task.title}
        helperText={task.subtasks.length ? t('tasks.stepCount', { count: task.subtasks.length }) : undefined}
        ariaLabel={isCompleted ? uncompleteLabel : completeLabel}
        checked={isCompleted}
        checkedAnnouncement={completeLabel}
        uncheckedAnnouncement={uncompleteLabel}
        onChange={() => actions.toggle(task.id)}
      />
      <EnergyBadge task={task} />
      {planned ? (
        <p style={{ margin: 0, color: theme.colors.muted }}>
          {t('tasks.plannedDateLabel')}: {actions.formatDate(planned)}
        </p>
      ) : null}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => actions.startEditing(task.id)} style={cardButton}>
          {t('editLabel')}
        </button>
        <button type="button" onClick={() => actions.remove(task.id, task.title)} style={cardButton}>
          {t('deleteLabel')}
        </button>
      </div>
      <TimerRow task={task} actions={actions} />
      <StepProgress task={task} />
      <SubtaskChecklist task={task} actions={actions} />
    </div>
  );
};

export default TaskCard;
