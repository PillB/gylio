import React from 'react';
import { useTranslation } from 'react-i18next';
import EmptyStateAction from '../../../components/EmptyStateAction';
import { useTheme } from '../../../core/context/ThemeContext';
import type { ThemeTokens } from '../../../core/themes';
import { energyTone } from '../utils/energyTone';
import { parsePlannedDate } from '../utils/taskForm';
import { UPCOMING_GROUP_ORDER, type UpcomingGroup } from '../utils/taskViews';
import TaskTimerInline from './TaskTimerInline';
import type { ChecklistTask, TaskActions } from './taskActions';

type Groups = Record<UpcomingGroup, ChecklistTask[]>;

const SECTION_LABEL_KEYS: Record<UpcomingGroup, string> = {
  overdue: 'tasks.sectionOverdue',
  today: 'tasks.sectionToday',
  tomorrow: 'tasks.sectionTomorrow',
  thisWeek: 'tasks.sectionThisWeek',
  later: 'tasks.sectionLater',
  unscheduled: 'tasks.sectionUnscheduled',
};

const sectionAccent = (theme: ThemeTokens, group: UpcomingGroup): string => {
  if (group === 'overdue') return theme.colors.accent;
  if (group === 'today') return theme.colors.primary;
  if (group === 'tomorrow' || group === 'thisWeek') return theme.colors.text;
  return theme.colors.muted;
};

const smallButton = (theme: ThemeTokens, padding: string, fontSize: string): React.CSSProperties => ({
  padding,
  borderRadius: theme.shape.radiusSm,
  border: `1px solid ${theme.colors.border}`,
  backgroundColor: 'transparent',
  color: theme.colors.muted,
  fontSize,
  cursor: 'pointer',
  fontFamily: theme.typography.body.family,
});

const PlannedDate: React.FC<{ label: string; overdue: boolean }> = ({ label, overdue }) => {
  const { theme } = useTheme();
  return (
    <span
      style={{
        fontSize: '0.75rem',
        color: overdue ? theme.colors.accent : theme.colors.muted,
        whiteSpace: 'nowrap',
        fontWeight: overdue ? 600 : 400,
      }}
    >
      {label}
    </span>
  );
};

type RowProps = { task: ChecklistTask; overdue: boolean; actions: TaskActions };

const UpcomingRow: React.FC<RowProps> = ({ task, overdue, actions }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isCompleted = task.status === 'completed';
  const planned = parsePlannedDate(task.plannedDate ?? null);
  const timerRunning = actions.activeTimerTaskId === task.id;
  return (
    <>
      <div
        role="listitem"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
          padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
          borderRadius: theme.shape.radiusMd,
          border: `1px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.surface,
          opacity: isCompleted ? 0.6 : 1,
          flexWrap: 'wrap',
        }}
      >
        <input
          type="checkbox"
          id={`upcoming-${task.id}`}
          checked={isCompleted}
          onChange={() => actions.toggle(task.id)}
          aria-label={t(isCompleted ? 'tasks.uncomplete' : 'tasks.complete', { title: task.title })}
          style={{ width: 18, height: 18, flexShrink: 0, cursor: 'pointer', accentColor: theme.colors.primary }}
        />
        <span
          style={{
            flex: '1 1 180px',
            minWidth: 0,
            overflowWrap: 'anywhere',
            fontFamily: theme.typography.body.family,
            textDecoration: isCompleted ? 'line-through' : 'none',
            color: isCompleted ? theme.colors.muted : theme.colors.text,
            fontSize: '0.9375rem',
          }}
        >
          {task.title}
        </span>
        {planned && <PlannedDate label={actions.formatDate(planned)} overdue={overdue} />}
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: energyTone(theme, task.energyRequired).fill,
            flexShrink: 0,
          }}
        />
        <button type="button" onClick={() => actions.startEditing(task.id)} style={{
            ...smallButton(theme, '2px 8px', '0.75rem'),
            minHeight: 44,
            minWidth: 44,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {t('editLabel')}
        </button>
        {!timerRunning && (
          <button
            type="button"
            onClick={() => actions.startTimer(task.id)}
            aria-label={t('tasks.startTimerAria', { title: task.title, minutes: actions.focusMinutes })}
            style={smallButton(theme, '2px 6px', '0.72rem')}
          >
            🍅
          </button>
        )}
      </div>
      {timerRunning && <TaskTimerInline taskId={task.id} />}
    </>
  );
};

type SectionProps = { group: UpcomingGroup; tasks: ChecklistTask[]; actions: TaskActions };

const UpcomingSection: React.FC<SectionProps> = ({ group, tasks, actions }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const accent = sectionAccent(theme, group);
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.xs,
          marginBottom: `${theme.spacing.xs}px`,
          paddingBottom: `${theme.spacing.xs}px`,
          borderBottom: `2px solid ${accent}30`,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {t(SECTION_LABEL_KEYS[group])}
        </span>
        <span style={{ fontSize: '0.75rem', color: theme.colors.muted, marginLeft: 'auto' }}>{tasks.length}</span>
      </div>
      <div style={{ display: 'grid', gap: '0.375rem' }}>
        {tasks.map((task) => (
          <UpcomingRow key={task.id} task={task} overdue={group === 'overdue'} actions={actions} />
        ))}
      </div>
    </div>
  );
};

type Props = { groups: Groups; actions: TaskActions; onAddTask: () => void };

/** The Upcoming view: tasks bucketed from overdue to unscheduled, empty buckets hidden. */
const UpcomingTaskList: React.FC<Props> = ({ groups, actions, onAddTask }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const filled = UPCOMING_GROUP_ORDER.filter((group) => groups[group].length > 0);
  if (!filled.length) {
    return (
      <EmptyStateAction
        emoji="🌤"
        headline={t('tasks.upcomingEmpty', 'All clear!')}
        body={t('tasks.upcomingEmptyBody', 'No tasks scheduled. Add one to see your week at a glance.')}
        ctaLabel={t('tasks.emptyCta', '+ Add your first task')}
        onCta={onAddTask}
      />
    );
  }
  return (
    <div style={{ display: 'grid', gap: `${theme.spacing.md}px` }}>
      {filled.map((group) => (
        <UpcomingSection key={group} group={group} tasks={groups[group]} actions={actions} />
      ))}
    </div>
  );
};

export default UpcomingTaskList;
