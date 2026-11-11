import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import useDB from '../hooks/useDB';
import useRewards from '../hooks/useRewards';
import {
  DEFAULT_TIMER_SETTINGS,
  MACHINE_KEY,
  restoreMachine,
  sanitizeSettings,
  serializeMachine,
  timerReducer,
  type ActiveTimerState,
  type PendingEntry,
  type TimeLogEntry,
  type TimerSettings,
} from './timerMachine';

// The rules of the timer live in timerMachine.ts; this file feeds it the clock and saves what it logs.
export { DEFAULT_TIMER_SETTINGS };
export type { ActiveTimerState, PendingEntry, TimeLogEntry, TimerSettings };
export type { TimerPhase } from './timerMachine';

export interface TaskTimerContextValue {
  activeTimer: ActiveTimerState | null;
  settings: TimerSettings;
  /** Goes up each time a finished stretch was saved to its task, so task lists know to reload. */
  version: number;
  /** `minutes` overrides the length of this first focus block only; later blocks use the saved setting. */
  startTask: (taskId: number, minutes?: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  skipPhase: () => void;
  stopTimer: () => void;
  updateSettings: (patch: Partial<TimerSettings>) => void;
}

// ---- Persistence ----

const SETTINGS_KEY = 'gylio_timer_settings';
export { MACHINE_KEY };
/** As before the timer was rebuilt (useTasks' old focus block): points and the daily focus streak per full block. */
export const FOCUS_COMPLETION_POINTS = 10;
/** A save that failed (the database was still opening, or busy) is tried again after this long. */
export const SAVE_RETRY_MS = 5_000;

function loadSettings(): TimerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return sanitizeSettings(JSON.parse(raw) as Partial<TimerSettings>);
  } catch { /* ignore */ }
  return { ...DEFAULT_TIMER_SETTINGS };
}

function loadMachine() {
  try {
    return restoreMachine(localStorage.getItem(MACHINE_KEY));
  } catch {
    return restoreMachine(null);
  }
}

function saveMachine(text: string): void {
  try { localStorage.setItem(MACHINE_KEY, text); } catch { /* ignore: the timer still works for this page */ }
}

function saveSettings(s: TimerSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

/** Resolves true when the entry was added, false when that task is gone or already had it. */
type SaveEntry = (taskId: number, entry: TimeLogEntry) => Promise<boolean>;

/**
 * Saves logged stretches one at a time, oldest first, whichever screen is open. An entry leaves the queue only once
 * it is saved; a failed save stays and is tried again, so a stretch is never dropped and never saved twice.
 */
export function usePersistTimerLog(log: PendingEntry[], save: SaveEntry, onSaved: (entry: PendingEntry, added: boolean) => void) {
  const inFlight = useRef<PendingEntry | null>(null);
  const [retry, setRetry] = useState(0);
  const head = log[0] ?? null;
  useEffect(() => {
    if (!head || inFlight.current === head) return undefined;
    inFlight.current = head;
    const { taskId, ...entry } = head;
    let timer: ReturnType<typeof setTimeout> | null = null;
    save(taskId, entry).then(
      (added) => {
        inFlight.current = null;
        onSaved(head, added);
      },
      (error) => {
        console.error('Failed to save time log; trying again shortly', error);
        inFlight.current = null;
        timer = setTimeout(() => setRetry((n) => n + 1), SAVE_RETRY_MS);
      },
    );
    return () => {
      if (timer) clearTimeout(timer);
    };
    // `save` changes when the database opens: that is a good moment to try a failed save again.
  }, [head, save, onSaved, retry]);
}

// ---- Context ----

const TaskTimerContext = createContext<TaskTimerContextValue | null>(null);

const TICK_MS = 1000;

export function TaskTimerProvider({ children }: { children: ReactNode }) {
  const [machine, dispatch] = useReducer(timerReducer, undefined, loadMachine);
  const [settings, setSettings] = useState<TimerSettings>(loadSettings);
  const [version, setVersion] = useState(0);
  const { appendTaskTimeLog } = useDB();
  const { applyRewardsProgress } = useRewards();
  const rewardRef = useRef(applyRewardsProgress);
  rewardRef.current = applyRewardsProgress;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const running = machine.timer?.status === 'running';
  const stored = serializeMachine(machine);
  useEffect(() => saveMachine(stored), [stored]);
  // Every open tab shows the same timer: a change saved by another tab replaces this tab's copy. A phase that ends
  // is logged by each tab with the same deadline-based times, and saving skips an entry already there (useDB).
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === MACHINE_KEY) dispatch({ type: 'replace', machine: restoreMachine(event.newValue) });
      // Same settings in every tab, or two tabs would start different phases at the same deadline.
      if (event.key === SETTINGS_KEY) setSettings(loadSettings());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // A timer kept from before: every phase whose deadline passed while no page was open is finished and logged, like
  // a kitchen timer that rang in an empty room. At most one focus block is credited, because the focus after a break
  // waits paused (docs/state-machines.md, trade-offs).
  useEffect(() => dispatch({ type: 'tick', now: Date.now(), settings: settingsRef.current }), []);
  // The display ticks once a second, but the time itself comes from the wall clock (timerMachine `endsAt`), so a
  // hidden tab whose timers the browser slows to once a minute still ends the phase on time.
  useEffect(() => {
    if (!running) return undefined;
    const tick = () => dispatch({ type: 'tick', now: Date.now(), settings: settingsRef.current });
    const id = setInterval(tick, TICK_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [running]);

  const onSaved = useCallback((entry: PendingEntry, added: boolean) => {
    dispatch({ type: 'logged', entry });
    if (!added) return;
    setVersion((v) => v + 1);
    // Only the tab whose save added the block pays for it, so two open tabs do not pay twice.
    if (entry.type === 'focus' && entry.completed) void rewardRef.current({ points: FOCUS_COMPLETION_POINTS, focusCompleted: true });
  }, []);
  usePersistTimerLog(machine.log, appendTaskTimeLog, onSaved);

  const startTask = useCallback((taskId: number, minutes?: number) => {
    dispatch({ type: 'start', taskId, minutes, now: Date.now(), settings: settingsRef.current });
  }, []);
  const pauseTimer = useCallback(() => dispatch({ type: 'pause', now: Date.now(), settings: settingsRef.current }), []);
  const resumeTimer = useCallback(() => dispatch({ type: 'resume', now: Date.now() }), []);
  const skipPhase = useCallback(() => dispatch({ type: 'skip', now: Date.now(), settings: settingsRef.current }), []);
  const stopTimer = useCallback(() => dispatch({ type: 'stop', now: Date.now(), settings: settingsRef.current }), []);

  const updateSettings = useCallback((patch: Partial<TimerSettings>) => {
    setSettings((prev) => sanitizeSettings({ ...prev, ...patch }));
  }, []);
  useEffect(() => saveSettings(settings), [settings]);

  const value = useMemo<TaskTimerContextValue>(
    () => ({ activeTimer: machine.timer, settings, version, startTask, pauseTimer, resumeTimer, skipPhase, stopTimer, updateSettings }),
    [machine.timer, settings, version, startTask, pauseTimer, resumeTimer, skipPhase, stopTimer, updateSettings]
  );

  return <TaskTimerContext.Provider value={value}>{children}</TaskTimerContext.Provider>;
}

export function useTaskTimer(): TaskTimerContextValue {
  const ctx = useContext(TaskTimerContext);
  if (!ctx) throw new Error('useTaskTimer must be inside TaskTimerProvider');
  return ctx;
}
