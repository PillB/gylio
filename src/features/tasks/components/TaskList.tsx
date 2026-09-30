import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from '../../../components/SectionCard.jsx';
import WinCard from '../../../components/WinCard';
import EmptyStateAction from '../../../components/EmptyStateAction';
import { useTheme } from '../../../core/context/ThemeContext';
import { useTaskTimer } from '../../../core/context/TaskTimerContext';
import { useToast } from '../../../core/context/ToastContext';
import useDB from '../../../core/hooks/useDB';
import { useClock, getLocalDateKey } from '../../../core/hooks/useClock';
import { track, Events } from '../../../core/analytics';
import useTasks from '../hooks/useTasks';
import { useTaskDraft, type NewTaskInput } from '../hooks/useTaskDraft';
import { useDeferredDelete, UNDO_WINDOW_MS } from '../hooks/useDeferredDelete';
import { useNewTaskShortcut, usePersistPendingTimeLog } from '../hooks/useTaskListEffects';
import { chunkTasks } from '../utils/taskForm';
import {
  addDaysToKey,
  filterTasksByView,
  groupUpcomingTasks,
  todayWinCount,
  type EnergyFilter,
  type UpcomingGroup,
  type ViewFilter,
} from '../utils/taskViews';
import TaskComposer from './TaskComposer';
import TaskViewControls from './TaskViewControls';
import FocusModeBanner from './FocusModeBanner';
import FocusArea from './FocusArea';
import TaskCard from './TaskCard';
import TaskEditForm from './TaskEditForm';
import UpcomingTaskList from './UpcomingTaskList';
import RecurringStatusToggle from './RecurringStatusToggle';
import TaskHelp from './TaskHelp';
import type { ChecklistTask, TaskActions } from './taskActions';

/** Today shows at most this many tasks until the person asks for all, to reduce visual load. */
const FOCUS_MODE_LIMIT = 3;
/** Timer-based pomodoros use their own length; new tasks keep the historical default. */
const DEFAULT_TASK_MINUTES = 25;

type Translate = ReturnType<typeof useTranslation>['t'];

const addedMessage = (t: Translate, plannedDate: string | null, todayKey: string) => {
  if (plannedDate === todayKey) return t('tasks.taskAddedToday', 'Added to Today.');
  return plannedDate ? t('tasks.taskAddedScheduled', 'Task added.') : t('tasks.taskAddedBacklog', 'Added to Backlog.');
};

type ChunkProps = { tasks: ChecklistTask[]; index: number; editingTaskId: number | null; actions: TaskActions };

/** A small group of tasks, so long lists read as a few manageable pieces. */
const TaskChunk: React.FC<ChunkProps> = ({ tasks, index, editingTaskId, actions }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const label = t('tasks.chunkLabel', { index: index + 1 });
  return (
    <div
      role="group"
      aria-label={label}
      style={{
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.shape.radiusMd,
        padding: `${theme.spacing.md}px`,
        backgroundColor: theme.colors.surface,
      }}
    >
      <p style={{ margin: '0 0 0.5rem', color: theme.colors.muted, fontWeight: 600 }}>{label}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.75rem' }}>
        {tasks.map((task) => (
          <div key={task.id} role="listitem">
            {editingTaskId === task.id ? <TaskEditForm task={task} actions={actions} /> : <TaskCard task={task} actions={actions} />}
          </div>
        ))}
      </div>
    </div>
  );
};

type EmptyProps = { view: ViewFilter; onAddForToday: () => void; onAdd: () => void };

const EmptyTaskList: React.FC<EmptyProps> = ({ view, onAddForToday, onAdd }) => {
  const { t } = useTranslation();
  if (view === 'today') {
    return (
      <EmptyStateAction
        emoji="✅"
        headline={t('tasks.emptyTodayHeadline', 'Nothing scheduled for today.')}
        body={t('tasks.emptyTodayBody', "That's a clean slate. Add one task you want to get done today — even one small win moves the needle.")}
        ctaLabel={t('tasks.emptyTodayCta', '+ Add a task for today')}
        onCta={onAddForToday}
      />
    );
  }
  return (
    <EmptyStateAction
      emoji="📋"
      headline={t('tasks.empty', 'No tasks yet.')}
      body={t('tasks.emptyBody', 'Start with the one thing that would make today feel like a win. Break it into steps if it feels big.')}
      ctaLabel={t('tasks.emptyCta', '+ Add your first task')}
      onCta={onAdd}
    />
  );
};

type BodyProps = {
  loading: boolean;
  view: ViewFilter;
  visibleTasks: ChecklistTask[];
  upcomingGroups: Record<UpcomingGroup, ChecklistTask[]> | null;
  editingTaskId: number | null;
  actions: TaskActions;
  onAddForToday: () => void;
  onAdd: () => void;
};

const TaskListBody: React.FC<BodyProps> = ({ loading, view, visibleTasks, upcomingGroups, editingTaskId, actions, onAddForToday, onAdd }) => {
  const { t } = useTranslation();
  const chunks = useMemo(() => chunkTasks(visibleTasks), [visibleTasks]);
  if (loading) return <p>{t('loading')}</p>;
  if (!visibleTasks.length) return <EmptyTaskList view={view} onAddForToday={onAddForToday} onAdd={onAdd} />;
  if (upcomingGroups) return <UpcomingTaskList groups={upcomingGroups} actions={actions} onAddTask={onAdd} />;
  return (
    <>
      {chunks.map((group, index) => (
        <TaskChunk key={`chunk-${index.toString()}`} tasks={group} index={index} editingTaskId={editingTaskId} actions={actions} />
      ))}
    </>
  );
};

/** Undo-able delete wired to a toast. */
const useTaskDelete = (removeTask: (id: number) => Promise<boolean>, t: Translate) => {
  const { success: showSuccess } = useToast();
  const titles = useRef(new Map<number, string>());
  const offerUndo = useCallback(
    (id: number, undo: () => void) => {
      showSuccess(t('tasks.deleted', { title: titles.current.get(id) }), { label: t('tasks.undoDelete'), onClick: undo }, UNDO_WINDOW_MS);
    },
    [showSuccess, t]
  );
  const { hiddenIds, scheduleDelete } = useDeferredDelete({ remove: removeTask, offerUndo });
  const remove = useCallback(
    (id: number, title: string) => {
      titles.current.set(id, title);
      scheduleDelete(id);
    },
    [scheduleDelete]
  );
  return { hiddenIds, remove, showSuccess };
};

const TaskList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { tasks, loading, toggleTaskStatus, toggleSubtask, addTask, updateTaskDetails, removeTask, refreshTasks } = useTasks();
  const { activeTimer, pendingLogEntry, clearPendingEntry, startTask, settings } = useTaskTimer();
  const { appendTaskTimeLog } = useDB();
  const { dateKey: todayKey } = useClock(i18n.language);
  const titleRef = useRef<HTMLInputElement>(null);

  const [viewFilter, setViewFilter] = useState<ViewFilter>('today');
  const [energyFilter, setEnergyFilter] = useState<EnergyFilter>('all');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [focusModeExpanded, setFocusModeExpanded] = useState(false);
  const [showWinCard, setShowWinCard] = useState(false);

  const draft = useTaskDraft({ t, viewFilter, todayKey });
  const { hiddenIds, remove, showSuccess } = useTaskDelete(removeTask, t);
  useNewTaskShortcut(titleRef);
  usePersistPendingTimeLog({ pendingLogEntry, appendTaskTimeLog, refreshTasks, clearPendingEntry });

  const formatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric' }), [i18n.language]);
  const filteredTasks = useMemo(
    () => filterTasksByView(tasks.filter((task) => !hiddenIds.has(task.id)), viewFilter, energyFilter, todayKey),
    [tasks, hiddenIds, viewFilter, energyFilter, todayKey]
  );
  const upcomingGroups = useMemo(
    () => (viewFilter === 'upcoming' ? groupUpcomingTasks(filteredTasks, todayKey) : null),
    [filteredTasks, todayKey, viewFilter]
  );
  const isFocusMode = viewFilter === 'today' && filteredTasks.length > FOCUS_MODE_LIMIT;
  const visibleTasks = useMemo(
    () => (isFocusMode && !focusModeExpanded ? filteredTasks.slice(0, FOCUS_MODE_LIMIT) : filteredTasks),
    [filteredTasks, focusModeExpanded, isFocusMode]
  );

  const toggle = useCallback(
    async (taskId: number) => {
      await toggleTaskStatus(taskId);
      // Checked against the list as it was before this toggle landed.
      setTimeout(() => {
        const count = todayWinCount(tasks, taskId, getLocalDateKey());
        if (count > 0) {
          track(Events.ALL_TODAY_TASKS_DONE, { count });
          setShowWinCard(true);
        }
        track(Events.TASK_COMPLETED, { taskId });
      }, 100);
    },
    [tasks, toggleTaskStatus]
  );

  const saveEdit = useCallback(
    async (taskId: number, updates: Parameters<TaskActions['saveEdit']>[1]) => {
      const updated = await updateTaskDetails(taskId, updates);
      if (updated) setEditingTaskId(null);
      return Boolean(updated);
    },
    [updateTaskDetails]
  );

  const actions: TaskActions = {
    toggle,
    toggleSubtask,
    startEditing: setEditingTaskId,
    remove,
    startTimer: startTask,
    saveEdit,
    cancelEdit: () => setEditingTaskId(null),
    activeTimerTaskId: activeTimer?.taskId ?? null,
    focusMinutes: settings.focusMinutes,
    formatDate: (date) => formatter.format(date),
  };

  const createTask = async (input: NewTaskInput) => {
    const created = await addTask({ ...input, durationMinutes: DEFAULT_TASK_MINUTES });
    if (!created) return;
    track(Events.TASK_CREATED, {
      withSubtasks: input.subtasks.length > 0,
      energy: input.energyRequired,
      hasDate: Boolean(input.plannedDate),
      isFirstTask: tasks.length === 0,
    });
    showSuccess(addedMessage(t, input.plannedDate, todayKey));
    draft.reset();
  };

  const submitDraft = () => {
    const input = draft.submit();
    if (input) void createTask(input);
  };

  const focusTitle = () => titleRef.current?.focus();
  const addForToday = () => {
    focusTitle();
    draft.setPlannedDate(todayKey);
  };

  return (
    <SectionCard
      ariaLabel={`${t('tasks.title')} module`}
      title={t('tasks.title')}
      subtitle={t('tasks.description', '')}
      badge={<TaskHelp topic="section" />}
    >
      <TaskComposer draft={draft} todayKey={todayKey} tomorrowKey={addDaysToKey(todayKey, 1)} titleRef={titleRef} onSubmit={submitDraft}>
        <RecurringStatusToggle />
      </TaskComposer>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: `${theme.spacing.lg}px` }}>
        <TaskViewControls view={viewFilter} onViewChange={setViewFilter} energy={energyFilter} onEnergyChange={setEnergyFilter} />
        {isFocusMode && (
          <FocusModeBanner
            limit={FOCUS_MODE_LIMIT}
            total={filteredTasks.length}
            expanded={focusModeExpanded}
            onToggle={() => setFocusModeExpanded((prev) => !prev)}
          />
        )}
        <div role="list" aria-label={t('tasks.chunkedListAria')} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1rem' }}>
          <TaskListBody
            loading={loading}
            view={viewFilter}
            visibleTasks={visibleTasks}
            upcomingGroups={upcomingGroups}
            editingTaskId={editingTaskId}
            actions={actions}
            onAddForToday={addForToday}
            onAdd={focusTitle}
          />
        </div>
        <FocusArea timerRunning={Boolean(activeTimer)} focusMinutes={settings.focusMinutes} />
      </div>
      {showWinCard && (
        <WinCard
          type="all_tasks_done"
          label={t('tasks.allTodayDone', 'All {{count}} tasks done today', { count: filteredTasks.length })}
          onClose={() => setShowWinCard(false)}
        />
      )}
    </SectionCard>
  );
};

export default TaskList;
