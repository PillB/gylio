import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB, { type Task } from '../../../core/hooks/useDB';
import useAccessibility from '../../../core/hooks/useAccessibility';

export type ChecklistTask = Task & { steps: string[] };

type UseTasksResult = {
  tasks: ChecklistTask[];
  loading: boolean;
  toggleTaskStatus: (taskId: number) => void;
  refreshTasks: () => void;
  addTask: (title: string) => Promise<Task | null>;
};

const parseSteps = (description: string | null): string[] => {
  if (!description) return [];

  try {
    const parsed = JSON.parse(description);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map((entry) => String(entry));
    if (parsed && Array.isArray(parsed.steps)) return parsed.steps.filter(Boolean).map((entry) => String(entry));
  } catch (error) {
    // Fall back to newline-delimited content
  }

  return description
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const useTasks = (): UseTasksResult => {
  const { t } = useTranslation();
  const { speak } = useAccessibility();
  const { ready, getTasks, insertTask, updateTask } = useDB();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);

  const mappedTasks = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        steps: parseSteps(task.description),
      })),
    [tasks]
  );

  const notify = useCallback((message: string) => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return;

    if (Notification.permission === 'granted') {
      // eslint-disable-next-line no-new
      new Notification(message);
      return;
    }

    if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          // eslint-disable-next-line no-new
          new Notification(message);
        }
      });
    }
  }, []);

  const refreshTasks = useCallback(() => {
    if (!ready) return;

    setLoading(true);
    getTasks()
      .then((fetched) => {
        setTasks(fetched);
      })
      .catch((error) => {
        console.error('Failed to load tasks', error);
      })
      .finally(() => setLoading(false));
  }, [getTasks, ready]);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  const toggleTaskStatus = useCallback(
    (taskId: number) => {
      const target = tasks.find((task) => task.id === taskId);
      if (!target) return;

      const nextStatus = target.status === 'completed' ? 'pending' : 'completed';

      updateTask(taskId, { status: nextStatus })
        .then((updated) => {
          if (!updated) return;

          setTasks((prev) => prev.map((entry) => (entry.id === taskId ? { ...entry, status: nextStatus } : entry)));

          const statusLabel = nextStatus === 'completed' ? t('tasks.completedLabel') : t('tasks.reopenedLabel');
          const announcement = t('tasks.completionAnnouncement', {
            title: updated.title,
            status: statusLabel,
          });

          speak(announcement);
          notify(announcement);
        })
        .catch((error) => {
          console.error('Failed to toggle task status', error);
        });
    },
    [notify, speak, t, tasks, updateTask]
  );

  const addTask = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return null;

      try {
        const created = await insertTask(trimmed, 'pending', JSON.stringify([]));
        setTasks((prev) => [created, ...prev]);
        return created;
      } catch (error) {
        console.error('Failed to create task', error);
        return null;
      }
    },
    [insertTask]
  );

  return {
    tasks: mappedTasks,
    loading,
    toggleTaskStatus,
    refreshTasks,
    addTask,
  };
};

export default useTasks;
