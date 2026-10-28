import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { track } from '../../core/analytics';
import { useTaskTimer } from '../../core/context/TaskTimerContext';
import useDB, { type TimeLogEntry } from '../../core/hooks/useDB';
import {
  assessRun,
  closeRun,
  entryFromMinutes,
  formatClock,
  elapsedSeconds,
  snoozeUntil,
  withEntryMinutes,
  withoutEntry,
  type Attention,
  type Run,
  type TrackedEntry,
} from './trackedTime';

export type ActiveRun = Run & { title: string; estimateMin: number | null };
export type StoppedRun = { taskId: number; title: string; entry: TrackedEntry };

export type TimeTrackerValue = {
  run: ActiveRun | null;
  /** Seconds on the running timer, from timestamps. 0 when nothing runs. */
  elapsed: number;
  attention: Attention;
  /** The stretch saved by the last stop, offered for undo or a quick fix. */
  stopped: StoppedRun | null;
  /** Goes up whenever a task's log changes, so lists can reload. */
  version: number;
  start: (task: { id: number; title: string; estimateMin: number | null }) => Promise<void>;
  stop: () => Promise<void>;
  /** The person says they were still working: nothing is removed. */
  confirmStillWorking: () => void;
  /** Stops and drops the time since the app last saw the person. */
  stopRemovingAway: () => Promise<void>;
  /** Drops the away time but keeps the timer going from now. */
  continueRemovingAway: () => Promise<void>;
  /** Silences the "past your estimate" check-in for a while. */
  keepGoing: () => void;
  undoStop: () => Promise<void>;
  dismissStopped: () => void;
  setStoppedMinutes: (minutes: number) => Promise<void>;
  editEntry: (taskId: number, index: number, minutes: number) => Promise<void>;
  removeEntry: (taskId: number, index: number) => Promise<void>;
  addManual: (taskId: number, minutes: number) => Promise<void>;
};

const STORAGE_KEY = 'gylio:timeTracker:v1';
/** A tap shorter than this is an accident, not work. */
const MIN_KEEP_SECONDS = 5;
const ACTIVITY_SAVE_MS = 20_000;

const isRun = (value: unknown): value is ActiveRun => {
  const v = value as Partial<ActiveRun> | null;
  return Boolean(v && typeof v.taskId === 'number' && typeof v.title === 'string' && !Number.isNaN(Date.parse(String(v.startedAt))) && !Number.isNaN(Date.parse(String(v.lastActiveAt))));
};

const loadRun = (): ActiveRun | null => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return isRun(parsed) ? { ...parsed, estimateMin: typeof parsed.estimateMin === 'number' ? parsed.estimateMin : null } : null;
  } catch {
    return null;
  }
};

const saveRun = (run: ActiveRun | null): void => {
  try {
    if (run) localStorage.setItem(STORAGE_KEY, JSON.stringify(run));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Storage can be unavailable; the timer still works for this visit. */
  }
};

const noop = async () => undefined;
/** Used where no provider is mounted (isolated component tests): nothing runs and nothing is stored. */
const INERT: TimeTrackerValue = {
  run: null,
  elapsed: 0,
  attention: { kind: 'ok' },
  stopped: null,
  version: 0,
  start: noop,
  stop: noop,
  confirmStillWorking: () => undefined,
  stopRemovingAway: noop,
  continueRemovingAway: noop,
  keepGoing: () => undefined,
  undoStop: noop,
  dismissStopped: () => undefined,
  setStoppedMinutes: noop,
  editEntry: noop,
  removeEntry: noop,
  addManual: noop,
};

const TimeTrackerContext = createContext<TimeTrackerValue>(INERT);
export const useTimeTracker = (): TimeTrackerValue => useContext(TimeTrackerContext);

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll', 'focus'] as const;

/** Marks the person as present, unless an "away" question is waiting: that gap must survive until it is answered. */
const useActivityHeartbeat = (runRef: React.MutableRefObject<ActiveRun | null>, setRun: React.Dispatch<React.SetStateAction<ActiveRun | null>>) => {
  useEffect(() => {
    const markActive = () => {
      const current = runRef.current;
      if (!current) return;
      const now = Date.now();
      if (now - Date.parse(current.lastActiveAt) < ACTIVITY_SAVE_MS) return;
      if (assessRun(current, now, current.estimateMin).kind === 'away') return;
      setRun((prev) => (prev ? { ...prev, lastActiveAt: new Date(now).toISOString() } : prev));
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') markActive();
    };
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, markActive, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, markActive));
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [runRef, setRun]);
};

/** Shows the running clock in the browser tab, so a forgotten timer is visible from any other tab. */
const useTabTitle = (run: ActiveRun | null, elapsed: number) => {
  const original = useRef<string | null>(null);
  useEffect(() => {
    if (!run) {
      if (original.current !== null) document.title = original.current;
      original.current = null;
      return;
    }
    if (original.current === null) original.current = document.title;
    document.title = `⏱ ${formatClock(elapsed)} · ${run.title}`;
  }, [run, elapsed]);
};

export const TimeTrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const db = useDB();
  const { activeTimer, stopTimer } = useTaskTimer();
  const [run, setRun] = useState<ActiveRun | null>(loadRun);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [stopped, setStopped] = useState<StoppedRun | null>(null);
  const [version, setVersion] = useState(0);
  const runRef = useRef(run);
  runRef.current = run;
  const dbRef = useRef(db);
  dbRef.current = db;
  const pomodoroRef = useRef({ running: Boolean(activeTimer), stop: stopTimer });
  pomodoroRef.current = { running: Boolean(activeTimer), stop: stopTimer };

  useEffect(() => saveRun(run), [run]);
  useActivityHeartbeat(runRef, setRun);
  useEffect(() => {
    if (!run) return undefined;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [run?.taskId, run?.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const elapsed = run ? elapsedSeconds(run.startedAt, nowMs) : 0;
  const attention = useMemo<Attention>(() => (run ? assessRun(run, nowMs, run.estimateMin) : { kind: 'ok' }), [run, nowMs]);
  useTabTitle(run, elapsed);

  /** Applies a change to one task's log, then tells lists to reload. */
  const changeLog = useCallback(async (taskId: number, change: (log: TimeLogEntry[]) => TimeLogEntry[]) => {
    const task = await dbRef.current.getTaskById(taskId);
    if (!task) return;
    await dbRef.current.setTaskTimeLog(taskId, change(task.timeLog));
    setVersion((v) => v + 1);
  }, []);

  /** Saves the running stretch ending at `endIso`. If saving fails the timer keeps running, so nothing is lost. */
  const finish = useCallback(async (endIso: string): Promise<void> => {
    const current = runRef.current;
    if (!current) return;
    runRef.current = null;
    setRun(null);
    const entry = closeRun(current, endIso);
    if (entry.actualSeconds < MIN_KEEP_SECONDS) return;
    try {
      await dbRef.current.appendTaskTimeLog(current.taskId, entry);
      setStopped({ taskId: current.taskId, title: current.title, entry });
      setVersion((v) => v + 1);
      track('time_tracker_stopped', { minutes: Math.round(entry.actualSeconds / 60) });
    } catch (error) {
      console.error('Failed to save tracked time; the timer keeps running', error);
      runRef.current = current;
      setRun(current);
    }
  }, []);

  const begin = useCallback((task: { id: number; title: string; estimateMin: number | null }) => {
    const iso = new Date().toISOString();
    if (pomodoroRef.current.running) pomodoroRef.current.stop();
    setStopped(null);
    const next: ActiveRun = { taskId: task.id, title: task.title, estimateMin: task.estimateMin, startedAt: iso, lastActiveAt: iso };
    runRef.current = next;
    setRun(next);
    track('time_tracker_started', { hasEstimate: task.estimateMin !== null });
  }, []);

  const start = useCallback(
    async (task: { id: number; title: string; estimateMin: number | null }) => {
      if (runRef.current?.taskId === task.id) return;
      // Starting another task ends the current one right now: switching is one tap, never a forgotten overlap.
      await finish(new Date().toISOString());
      begin(task);
    },
    [begin, finish],
  );

  const stop = useCallback(() => finish(new Date().toISOString()), [finish]);

  const stopRemovingAway = useCallback(async () => {
    track('time_tracker_prompt', { kind: 'away', answer: 'remove-and-stop' });
    if (runRef.current) await finish(runRef.current.lastActiveAt);
  }, [finish]);

  const continueRemovingAway = useCallback(async () => {
    const current = runRef.current;
    if (!current) return;
    track('time_tracker_prompt', { kind: 'away', answer: 'remove-and-continue' });
    await finish(current.lastActiveAt);
    begin({ id: current.taskId, title: current.title, estimateMin: current.estimateMin });
  }, [begin, finish]);

  const confirmStillWorking = useCallback(() => {
    track('time_tracker_prompt', { kind: 'away', answer: 'still-working' });
    setRun((prev) => (prev ? { ...prev, lastActiveAt: new Date().toISOString() } : prev));
  }, []);

  const keepGoing = useCallback(() => {
    track('time_tracker_prompt', { kind: 'over', answer: 'keep-going' });
    setRun((prev) => (prev ? { ...prev, snoozeUntil: snoozeUntil(Date.now(), prev.estimateMin) } : prev));
  }, []);

  const undoStop = useCallback(async () => {
    const last = stopped;
    if (!last) return;
    setStopped(null);
    await changeLog(last.taskId, (log) => log.filter((e) => !(e.type === 'tracked' && e.startedAt === last.entry.startedAt && e.endedAt === last.entry.endedAt)));
  }, [changeLog, stopped]);

  const setStoppedMinutes = useCallback(
    async (minutes: number) => {
      const last = stopped;
      if (!last) return;
      const fixed = { ...last.entry, actualSeconds: minutes * 60, endedAt: new Date(Date.parse(last.entry.startedAt) + minutes * 60_000).toISOString() };
      await changeLog(last.taskId, (log) => log.map((e) => (e.type === 'tracked' && e.startedAt === last.entry.startedAt ? fixed : e)));
      setStopped({ ...last, entry: fixed });
    },
    [changeLog, stopped],
  );

  const editEntry = useCallback((taskId: number, index: number, minutes: number) => changeLog(taskId, (log) => withEntryMinutes(log, index, minutes)), [changeLog]);
  const removeEntry = useCallback((taskId: number, index: number) => changeLog(taskId, (log) => withoutEntry(log, index)), [changeLog]);
  const addManual = useCallback(
    (taskId: number, minutes: number) => changeLog(taskId, (log) => [...log, entryFromMinutes(minutes, new Date().toISOString())]),
    [changeLog],
  );

  const value = useMemo<TimeTrackerValue>(
    () => ({
      run,
      elapsed,
      attention,
      stopped,
      version,
      start,
      stop,
      confirmStillWorking,
      stopRemovingAway,
      continueRemovingAway,
      keepGoing,
      undoStop,
      dismissStopped: () => setStopped(null),
      setStoppedMinutes,
      editEntry,
      removeEntry,
      addManual,
    }),
    [run, elapsed, attention, stopped, version, start, stop, confirmStillWorking, stopRemovingAway, continueRemovingAway, keepGoing, undoStop, setStoppedMinutes, editEntry, removeEntry, addManual],
  );

  return <TimeTrackerContext.Provider value={value}>{children}</TimeTrackerContext.Provider>;
};

