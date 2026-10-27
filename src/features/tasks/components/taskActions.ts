import type { ChecklistTask } from '../hooks/useTasks';
import type { Task } from '../../../core/hooks/useDB';

/** What a rendered task can do, supplied by TaskList. */
export type TaskActions = {
  toggle: (taskId: number) => void;
  toggleSubtask: (taskId: number, index: number) => void;
  startEditing: (taskId: number) => void;
  remove: (taskId: number, title: string) => void;
  startTimer: (taskId: number) => void;
  /** Resolves true once saved, so the edit form can close. */
  saveEdit: (taskId: number, updates: Partial<Omit<Task, 'id'>>) => Promise<boolean>;
  cancelEdit: () => void;
  activeTimerTaskId: number | null;
  focusMinutes: number;
  formatDate: (date: Date) => string;
};

export type { ChecklistTask };
