import { useEffect, type RefObject } from 'react';
import type { PendingEntry, TimeLogEntry } from '../../../core/context/TaskTimerContext';

const isTypingTarget = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable;
};

const isPlainN = (event: KeyboardEvent) => event.key === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey;

/** Pressing "n" anywhere outside a field jumps to the new-task title. */
export const useNewTaskShortcut = (titleRef: RefObject<HTMLInputElement>) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || !isPlainN(event)) return;
      event.preventDefault();
      titleRef.current?.focus();
      titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [titleRef]);
};

type PendingLogOptions = {
  pendingLogEntry: PendingEntry | null;
  appendTaskTimeLog: (taskId: number, entry: TimeLogEntry) => Promise<unknown>;
  refreshTasks: () => Promise<void> | void;
  clearPendingEntry: () => void;
};

/** Saves a finished timer session to its task, then refreshes the list. */
export const usePersistPendingTimeLog = ({
  pendingLogEntry,
  appendTaskTimeLog,
  refreshTasks,
  clearPendingEntry,
}: PendingLogOptions) => {
  useEffect(() => {
    if (!pendingLogEntry) return;
    const { taskId, ...entry } = pendingLogEntry;
    appendTaskTimeLog(taskId, entry)
      .then(() => {
        refreshTasks();
        clearPendingEntry();
      })
      .catch((error) => {
        console.error('Failed to save time log', error);
        clearPendingEntry();
      });
  }, [appendTaskTimeLog, clearPendingEntry, pendingLogEntry, refreshTasks]);
};
