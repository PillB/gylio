import type { ChecklistTask } from '../hooks/useTasks';
import type { Task } from '../../../core/hooks/useDB';
import type { EstimateSample } from '../../planning/calibrateEstimate';

/** What a rendered task can do, supplied by TaskList. */
export type TaskActions = {
  toggle: (taskId: number) => void;
  toggleSubtask: (taskId: number, index: number) => void;
  startEditing: (taskId: number) => void;
  remove: (taskId: number, title: string) => void;
  /** `minutes` starts a shorter first block than the saved focus length. */
  startTimer: (taskId: number, minutes?: number) => void;
  /** Resolves true once saved, so the edit form can close. */
  saveEdit: (taskId: number, updates: Partial<Omit<Task, 'id'>>) => Promise<boolean>;
  cancelEdit: () => void;
  activeTimerTaskId: number | null;
  focusMinutes: number;
  formatDate: (date: Date) => string;
  /** Past estimate/actual pairs, for the personal buffer suggestion in the edit form. */
  estimateSamples?: EstimateSample[];
};

export type { ChecklistTask };
