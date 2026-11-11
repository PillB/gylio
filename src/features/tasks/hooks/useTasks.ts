import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB, { type Subtask, type Task } from '../../../core/hooks/useDB';
import useAccessibility from '../../../core/hooks/useAccessibility';
import useRewards from '../../../core/hooks/useRewards';
import { useOnDataChanged } from '../../../core/hooks/useOnDataChanged';
import { claimReward, stepRewardKey, taskRewardKey } from '../../../core/utils/rewardLedger';

export type ChecklistTask = Task & {
  steps: string[];
  completedSteps: number;
  totalSteps: number;
};

export type TaskStatus = 'pending' | 'completed';

type UseTasksResult = {
  tasks: ChecklistTask[];
  loading: boolean;
  /**
   * Resolves true once the new status is stored; false when the save failed. With `to`, that status is written
   * whatever this list last loaded (a screen with its own fresher copy says what it wants instead of flipping a
   * possibly stale one); without it, the loaded status is flipped.
   */
  toggleTaskStatus: (taskId: number, to?: TaskStatus) => Promise<boolean>;
  toggleSubtask: (taskId: number, subtaskIndex: number) => Promise<void>;
  refreshTasks: () => Promise<void>;
  addTask: (options: {
    title: string;
    durationMinutes?: number;
    subtasks?: Subtask[];
    plannedDate?: string | null;
    calendarEventId?: number | null;
    energyRequired?: Task['energyRequired'];
    implementationIntention?: string | null;
    estimateMin?: number | null;
  }) => Promise<Task | null>;
  updateTaskDetails: (taskId: number, updates: Partial<Omit<Task, 'id'>>) => Promise<Task | null>;
  removeTask: (taskId: number) => Promise<boolean>;
};

const MIN_DURATION = 1;
const DEFAULT_DURATION = 25;
const TASK_COMPLETION_POINTS = 10;
const SUBTASK_COMPLETION_POINTS = 5;

const STATUS_LABEL: Record<TaskStatus, string> = { completed: 'tasks.completedLabel', pending: 'tasks.reopenedLabel' };

const flip = (status: string | undefined): TaskStatus => (status === 'completed' ? 'pending' : 'completed');

const parseSteps = (task: Task): string[] => task.subtasks.map((subtask) => subtask.label).filter(Boolean);

const useTasks = (): UseTasksResult => {
  const { t } = useTranslation();
  const { speak } = useAccessibility();
  const { ready, getTasks, insertTask, updateTask, deleteTask } = useDB();
  const { applyRewardsProgress, gamificationEnabled } = useRewards();
  // Rewards off: nothing is paid, so nothing is marked paid either; turning them back on pays the next completion.
  const claim = useCallback((key: string) => gamificationEnabled && claimReward(key), [gamificationEnabled]);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);

  const mappedTasks = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        steps: parseSteps(task),
        completedSteps: task.subtasks.filter((subtask) => subtask.done).length,
        totalSteps: task.subtasks.length,
      })),
    [tasks]
  );

  const refreshTasks = useCallback(async () => {
    if (!ready) return;

    setLoading(true);
    try {
      const fetched = await getTasks();
      setTasks(fetched);
    } catch (error) {
      console.error('Failed to load tasks', error);
    } finally {
      setLoading(false);
    }
  }, [getTasks, ready]);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  // Changes that arrive from the account or another tab: reload without the loading state.
  useOnDataChanged(() => {
    if (!ready) return;
    getTasks().then(setTasks).catch((error) => console.error('Failed to refresh tasks', error));
  });

  const toggleTaskStatus = useCallback(
    async (taskId: number, to?: TaskStatus): Promise<boolean> => {
      const target = tasks.find((task) => task.id === taskId);
      if (!target && !to) return false;

      const nextStatus: TaskStatus = to ?? flip(target?.status);
      // True once the new status is stored; a failure after that (rewards, announcement) keeps it true.
      let saved = false;

      try {
        const updated = await updateTask(taskId, { status: nextStatus });
        if (!updated) return false;
        saved = true;

        setTasks((prev) => prev.map((entry) => (entry.id === taskId ? { ...entry, status: nextStatus } : entry)));

        // Points once per task: reopening and completing again is an undo, not new work.
        if (nextStatus === 'completed' && claim(taskRewardKey(taskId))) {
          await applyRewardsProgress({ points: TASK_COMPLETION_POINTS, taskCompleted: true });
        }

        await speak(t('tasks.completionAnnouncement', { title: updated.title, status: t(STATUS_LABEL[nextStatus]) }));
        await refreshTasks();
      } catch (error) {
        console.error('Failed to toggle task status', error);
      }
      return saved;
    },
    [applyRewardsProgress, claim, refreshTasks, speak, t, tasks, updateTask]
  );

  const addTask = useCallback(
    async ({
      title,
      durationMinutes = DEFAULT_DURATION,
      subtasks = [],
      plannedDate = null,
      calendarEventId = null,
      energyRequired = 'medium',
      implementationIntention = null,
      ...extra
    }: {
      title: string;
      durationMinutes?: number;
      subtasks?: Subtask[];
      plannedDate?: string | null;
      calendarEventId?: number | null;
      energyRequired?: Task['energyRequired'];
      implementationIntention?: string | null;
      estimateMin?: number | null;
    }) => {
      const trimmed = title.trim();
      if (!trimmed) return null;

      const normalizedDuration = Number.isFinite(durationMinutes)
        ? Math.max(MIN_DURATION, Math.round(durationMinutes))
        : DEFAULT_DURATION;

      try {
        const created = await insertTask(trimmed, 'pending', subtasks, plannedDate, calendarEventId, normalizedDuration, energyRequired, implementationIntention, extra.estimateMin);
        setTasks((prev) => [created, ...prev]);
        await refreshTasks();
        return created;
      } catch (error) {
        console.error('Failed to create task', error);
        return null;
      }
    },
    [insertTask, refreshTasks]
  );

  const updateTaskDetails = useCallback(
    async (taskId: number, updates: Partial<Omit<Task, 'id'>>) => {
      try {
        const updated = await updateTask(taskId, updates);
        if (!updated) return null;
        setTasks((prev) => prev.map((entry) => (entry.id === taskId ? updated : entry)));
        await refreshTasks();
        return updated;
      } catch (error) {
        console.error('Failed to update task', error);
        return null;
      }
    },
    [refreshTasks, updateTask]
  );

  const removeTask = useCallback(
    async (taskId: number) => {
      try {
        const removed = await deleteTask(taskId);
        if (removed) {
          setTasks((prev) => prev.filter((task) => task.id !== taskId));
        }
        return removed;
      } catch (error) {
        console.error('Failed to delete task', error);
        return false;
      }
    },
    [deleteTask]
  );

  const toggleSubtask = useCallback(
    async (taskId: number, subtaskIndex: number) => {
      const target = tasks.find((task) => task.id === taskId);
      if (!target) return;
      const currentSubtask = target.subtasks[subtaskIndex];
      if (!currentSubtask) return;

      const updatedSubtasks = target.subtasks.map((subtask, index) =>
        index === subtaskIndex ? { ...subtask, done: !subtask.done } : subtask
      );

      try {
        const updated = await updateTask(taskId, { subtasks: updatedSubtasks });
        if (!updated) return;
        setTasks((prev) => prev.map((entry) => (entry.id === taskId ? updated : entry)));
        await refreshTasks();

        if (!currentSubtask.done && claim(stepRewardKey(taskId, currentSubtask.label))) {
          await applyRewardsProgress({ points: SUBTASK_COMPLETION_POINTS });
        }
      } catch (error) {
        console.error('Failed to update subtask', error);
      }
    },
    [applyRewardsProgress, claim, refreshTasks, tasks, updateTask]
  );


  return {
    tasks: mappedTasks,
    loading,
    toggleTaskStatus,
    toggleSubtask,
    refreshTasks,
    addTask,
    updateTaskDetails,
    removeTask,
  };
};

export default useTasks;
