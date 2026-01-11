import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB, { type Task } from '../../../core/hooks/useDB';
import useAccessibility from '../../../core/hooks/useAccessibility';

export type ChecklistTask = Task & { steps: string[] };

type NotificationsModule = typeof import('expo-notifications');

type UseTasksResult = {
  tasks: ChecklistTask[];
  loading: boolean;
  toggleTaskStatus: (taskId: number) => Promise<void>;
  refreshTasks: () => Promise<void>;
  addTask: (title: string, durationMinutes?: number) => Promise<Task | null>;
  startPomodoro: (options: { durationMinutes: number; taskId?: number }) => Promise<void>;
};

const MIN_DURATION = 1;
const DEFAULT_DURATION = 25;

const parseSteps = (task: Task): string[] => task.subtasks.map((subtask) => subtask.label).filter(Boolean);

const useTasks = (): UseTasksResult => {
  const { t } = useTranslation();
  const { speak } = useAccessibility();
  const { ready, getTasks, insertTask, updateTask } = useDB();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const notificationModuleRef = useRef<NotificationsModule | null>(null);
  const notificationPermissionRef = useRef(false);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const mappedTasks = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        steps: parseSteps(task),
      })),
    [tasks]
  );

  const loadNotificationsModule = useCallback(async (): Promise<NotificationsModule | null> => {
    if (notificationModuleRef.current) return notificationModuleRef.current;

    try {
      const module = await import('expo-notifications');
      notificationModuleRef.current = module;
      return module;
    } catch (error) {
      console.warn('Notifications are not available in this environment', error);
      return null;
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    const notifications = await loadNotificationsModule();
    if (!notifications) return false;

    const current = await notifications.getPermissionsAsync();
    if (current.granted || current.status === 'granted') {
      notificationPermissionRef.current = true;
      return true;
    }

    const requested = await notifications.requestPermissionsAsync();
    const allowed = requested.granted || requested.status === 'granted';
    notificationPermissionRef.current = allowed;
    return allowed;
  }, [loadNotificationsModule]);

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

  useEffect(
    () => () => {
      timersRef.current.forEach((timerId) => clearTimeout(timerId));
      timersRef.current = [];
    },
    []
  );

  const toggleTaskStatus = useCallback(
    async (taskId: number) => {
      const target = tasks.find((task) => task.id === taskId);
      if (!target) return;

      const nextStatus = target.status === 'completed' ? 'pending' : 'completed';

      try {
        const updated = await updateTask(taskId, { status: nextStatus });
        if (!updated) return;

        setTasks((prev) => prev.map((entry) => (entry.id === taskId ? { ...entry, status: nextStatus } : entry)));

        const statusLabel = nextStatus === 'completed' ? t('tasks.completedLabel') : t('tasks.reopenedLabel');
        const announcement = t('tasks.completionAnnouncement', {
          title: updated.title,
          status: statusLabel,
        });

        await speak(announcement);
        await refreshTasks();
      } catch (error) {
        console.error('Failed to toggle task status', error);
      }
    },
    [refreshTasks, speak, t, tasks, updateTask]
  );

  const addTask = useCallback(
    async (title: string, durationMinutes: number = DEFAULT_DURATION) => {
      const trimmed = title.trim();
      if (!trimmed) return null;

      const normalizedDuration = Number.isFinite(durationMinutes)
        ? Math.max(MIN_DURATION, Math.round(durationMinutes))
        : DEFAULT_DURATION;

      try {
        const created = await insertTask(trimmed, 'pending', [], null, null, normalizedDuration);
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

  const scheduleCompletionNotification = useCallback(
    async (message: string, seconds: number) => {
      const notifications = await loadNotificationsModule();
      if (!notifications) return;

      const permissionGranted =
        notificationPermissionRef.current || (await requestNotificationPermission());
      if (!permissionGranted) return;

      try {
        await notifications.scheduleNotificationAsync({
          content: {
            title: t('tasks.title'),
            body: message,
            sound: true,
          },
          trigger: { seconds },
        });
      } catch (error) {
        console.warn('Unable to schedule focus timer notification', error);
      }
    },
    [loadNotificationsModule, requestNotificationPermission, t]
  );

  const startPomodoro = useCallback(
    async ({ durationMinutes, taskId }: { durationMinutes: number; taskId?: number }) => {
      const duration = Number.isFinite(durationMinutes)
        ? Math.max(MIN_DURATION, Math.round(durationMinutes))
        : DEFAULT_DURATION;
      const seconds = duration * 60;
      const target = taskId ? tasks.find((task) => task.id === taskId) : null;

      const startAnnouncement = t('tasks.startFocus', { minutes: duration });
      speak(startAnnouncement);

      if (taskId) {
        try {
          await updateTask(taskId, { focusPresetMinutes: duration });
          await refreshTasks();
        } catch (error) {
          console.error('Failed to record focus duration on task', error);
        }
      }

      const completionMessage = t('tasks.focusComplete', {
        minutes: duration,
        title: target?.title ?? t('tasks.focusBlockLabel'),
      });

      await scheduleCompletionNotification(completionMessage, seconds);

      const timeoutId = setTimeout(() => {
        speak(completionMessage);
      }, seconds * 1000);

      timersRef.current.push(timeoutId);
    },
    [refreshTasks, scheduleCompletionNotification, speak, t, tasks, updateTask]
  );

  return {
    tasks: mappedTasks,
    loading,
    toggleTaskStatus,
    refreshTasks,
    addTask,
    startPomodoro,
  };
};

export default useTasks;
