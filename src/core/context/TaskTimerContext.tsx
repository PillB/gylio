import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

// ---- Types ----

export type TimerPhase = 'focus' | 'short-break' | 'long-break';

export interface TimerSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStartBreak: boolean;
}

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreak: true,
};

export interface TimeLogEntry {
  type: TimerPhase;
  startedAt: string;
  endedAt: string;
  plannedSeconds: number;
  actualSeconds: number;
  completed: boolean;
}

export interface PendingEntry extends TimeLogEntry {
  taskId: number;
}

interface ActiveTimerState {
  taskId: number;
  phase: TimerPhase;
  /** 'running' | 'paused' | 'phase-done' (transition sentinel) */
  status: 'running' | 'paused' | 'phase-done';
  remainingSeconds: number;
  totalSeconds: number;
  focusSessionsCompleted: number;
  phaseStartedAt: string;
}

export interface TaskTimerContextValue {
  activeTimer: ActiveTimerState | null;
  settings: TimerSettings;
  pendingLogEntry: PendingEntry | null;
  clearPendingEntry: () => void;
  startTask: (taskId: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  skipPhase: () => void;
  stopTimer: () => void;
  updateSettings: (patch: Partial<TimerSettings>) => void;
}

// ---- Persistence ----

const SETTINGS_KEY = 'gylio_timer_settings';

function loadSettings(): TimerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_TIMER_SETTINGS, ...(JSON.parse(raw) as Partial<TimerSettings>) };
  } catch { /* ignore */ }
  return { ...DEFAULT_TIMER_SETTINGS };
}

function saveSettings(s: TimerSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ---- Context ----

const TaskTimerContext = createContext<TaskTimerContextValue | null>(null);

export function TaskTimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<ActiveTimerState | null>(null);
  const [pendingLogEntry, setPendingLogEntry] = useState<PendingEntry | null>(null);
  const [settings, setSettings] = useState<TimerSettings>(loadSettings);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Interval: countdown ----
  useEffect(() => {
    const clearIv = () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (!timer || timer.status !== 'running') {
      clearIv();
      return;
    }

    clearIv(); // safety: clear before starting new
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (!prev || prev.status !== 'running') return prev;
        if (prev.remainingSeconds <= 1) {
          return { ...prev, remainingSeconds: 0, status: 'phase-done' };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return clearIv;
  }, [timer?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Handle phase-done: create entry + advance ----
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    if (!timer || timer.status !== 'phase-done') return;

    const s = settingsRef.current;
    const elapsed = timer.totalSeconds - timer.remainingSeconds; // remainingSeconds is 0 here = totalSeconds

    const entry: PendingEntry = {
      taskId: timer.taskId,
      type: timer.phase,
      startedAt: timer.phaseStartedAt,
      endedAt: new Date().toISOString(),
      plannedSeconds: timer.totalSeconds,
      actualSeconds: timer.totalSeconds, // fully completed
      completed: true,
    };
    void elapsed; // used above
    setPendingLogEntry(entry);

    if (timer.phase === 'focus') {
      const newSessions = timer.focusSessionsCompleted + 1;
      const isLong = newSessions % s.sessionsBeforeLongBreak === 0;
      const breakSecs = (isLong ? s.longBreakMinutes : s.shortBreakMinutes) * 60;
      setTimer({
        taskId: timer.taskId,
        phase: isLong ? 'long-break' : 'short-break',
        status: s.autoStartBreak ? 'running' : 'paused',
        remainingSeconds: breakSecs,
        totalSeconds: breakSecs,
        focusSessionsCompleted: newSessions,
        phaseStartedAt: new Date().toISOString(),
      });
    } else {
      // break complete — ready for next focus
      const focusSecs = s.focusMinutes * 60;
      setTimer({
        taskId: timer.taskId,
        phase: 'focus',
        status: 'paused',
        remainingSeconds: focusSecs,
        totalSeconds: focusSecs,
        focusSessionsCompleted: timer.focusSessionsCompleted,
        phaseStartedAt: new Date().toISOString(),
      });
    }
  }, [timer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Actions ----

  const startTask = useCallback((taskId: number) => {
    const s = settingsRef.current;
    // Save partial entry for any currently running task
    setTimer((prev) => {
      if (prev && prev.taskId !== taskId && prev.status !== 'paused') {
        const actualSeconds = prev.totalSeconds - prev.remainingSeconds;
        if (actualSeconds > 0) {
          setPendingLogEntry({
            taskId: prev.taskId,
            type: prev.phase,
            startedAt: prev.phaseStartedAt,
            endedAt: new Date().toISOString(),
            plannedSeconds: prev.totalSeconds,
            actualSeconds,
            completed: false,
          });
        }
      }
      const focusSecs = s.focusMinutes * 60;
      return {
        taskId,
        phase: 'focus',
        status: 'running',
        remainingSeconds: focusSecs,
        totalSeconds: focusSecs,
        focusSessionsCompleted: 0,
        phaseStartedAt: new Date().toISOString(),
      };
    });
  }, []);

  const pauseTimer = useCallback(() => {
    setTimer((prev) => (prev && prev.status === 'running' ? { ...prev, status: 'paused' } : prev));
  }, []);

  const resumeTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev || prev.status !== 'paused') return prev;
      return { ...prev, status: 'running', phaseStartedAt: new Date().toISOString() };
    });
  }, []);

  const skipPhase = useCallback(() => {
    setTimer((prev) => {
      if (!prev) return prev;
      const s = settingsRef.current;
      // Save partial entry
      const actualSeconds = prev.totalSeconds - prev.remainingSeconds;
      if (actualSeconds > 0) {
        setPendingLogEntry({
          taskId: prev.taskId,
          type: prev.phase,
          startedAt: prev.phaseStartedAt,
          endedAt: new Date().toISOString(),
          plannedSeconds: prev.totalSeconds,
          actualSeconds,
          completed: false,
        });
      }
      if (prev.phase === 'focus') {
        const newSessions = prev.focusSessionsCompleted + 1;
        const isLong = newSessions % s.sessionsBeforeLongBreak === 0;
        const breakSecs = (isLong ? s.longBreakMinutes : s.shortBreakMinutes) * 60;
        return {
          taskId: prev.taskId,
          phase: isLong ? ('long-break' as TimerPhase) : ('short-break' as TimerPhase),
          status: s.autoStartBreak ? 'running' : 'paused',
          remainingSeconds: breakSecs,
          totalSeconds: breakSecs,
          focusSessionsCompleted: newSessions,
          phaseStartedAt: new Date().toISOString(),
        };
      } else {
        const focusSecs = s.focusMinutes * 60;
        return {
          taskId: prev.taskId,
          phase: 'focus' as TimerPhase,
          status: 'paused',
          remainingSeconds: focusSecs,
          totalSeconds: focusSecs,
          focusSessionsCompleted: prev.focusSessionsCompleted,
          phaseStartedAt: new Date().toISOString(),
        };
      }
    });
  }, []);

  const stopTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev) return null;
      const actualSeconds = prev.totalSeconds - prev.remainingSeconds;
      if (actualSeconds > 0 && prev.phase === 'focus') {
        setPendingLogEntry({
          taskId: prev.taskId,
          type: prev.phase,
          startedAt: prev.phaseStartedAt,
          endedAt: new Date().toISOString(),
          plannedSeconds: prev.totalSeconds,
          actualSeconds,
          completed: false,
        });
      }
      return null;
    });
  }, []);

  const clearPendingEntry = useCallback(() => setPendingLogEntry(null), []);

  const updateSettings = useCallback((patch: Partial<TimerSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo<TaskTimerContextValue>(
    () => ({
      activeTimer: timer,
      settings,
      pendingLogEntry,
      clearPendingEntry,
      startTask,
      pauseTimer,
      resumeTimer,
      skipPhase,
      stopTimer,
      updateSettings,
    }),
    [timer, settings, pendingLogEntry, clearPendingEntry, startTask, pauseTimer, resumeTimer, skipPhase, stopTimer, updateSettings]
  );

  return <TaskTimerContext.Provider value={value}>{children}</TaskTimerContext.Provider>;
}

export function useTaskTimer(): TaskTimerContextValue {
  const ctx = useContext(TaskTimerContext);
  if (!ctx) throw new Error('useTaskTimer must be inside TaskTimerProvider');
  return ctx;
}
