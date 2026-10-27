import type { EstimateSample } from '../planning/calibrateEstimate';

/** A finished stretch of work on a task, kept in the task's `timeLog` next to the focus-timer sessions. */
export type TrackedEntry = {
  type: 'tracked';
  startedAt: string;
  endedAt: string;
  plannedSeconds: number;
  actualSeconds: number;
  completed: boolean;
};

type LogEntryLike = { type: string; startedAt: string; endedAt: string; plannedSeconds: number; actualSeconds: number; completed: boolean };

/** The one running timer. Elapsed time is always computed from timestamps, so a reload or a sleeping tab loses nothing. */
export type Run = {
  taskId: number;
  startedAt: string;
  /** Last moment the person touched the app; used to tell "still working" from "walked away". */
  lastActiveAt: string;
  /** No reminder before this time (set when the person says "keep going"). */
  snoozeUntil?: string;
};

export type Attention =
  | { kind: 'ok' }
  | { kind: 'away'; awaySeconds: number; stopAt: string }
  | { kind: 'over'; elapsedSeconds: number; estimateMin: number | null };

/** The app has not seen the person for this long: ask before counting the gap (Clockify's default is 15 minutes of no input; ours only sees this app, so it is longer). */
export const AWAY_PROMPT_SECONDS = 30 * 60;
/** A gentle "still on it?" once a task passes its estimate by half, and never earlier than 5 minutes over. */
export const OVER_ESTIMATE_FACTOR = 1.5;
export const OVER_ESTIMATE_MIN_EXTRA_SECONDS = 5 * 60;
/** With no estimate, a first check-in (and a nudge to rest) after two hours. */
export const NO_ESTIMATE_CHECK_SECONDS = 2 * 60 * 60;
/** After "keep going", the next reminder waits this long, or half the estimate if that is longer. */
export const SNOOZE_SECONDS = 30 * 60;
export const MAX_MANUAL_MINUTES = 24 * 60;

const ms = (iso: string): number => Date.parse(iso);

export const elapsedSeconds = (startedAt: string, nowMs: number): number => Math.max(0, Math.floor((nowMs - ms(startedAt)) / 1000));

const overThresholdSeconds = (estimateMin: number | null): number =>
  estimateMin && estimateMin > 0
    ? Math.max(estimateMin * 60 * OVER_ESTIMATE_FACTOR, estimateMin * 60 + OVER_ESTIMATE_MIN_EXTRA_SECONDS)
    : NO_ESTIMATE_CHECK_SECONDS;

/**
 * What, if anything, to gently ask about a running timer. "Away" outranks "over": if the person left,
 * the useful question is what to do with the gap, not that the task is long.
 */
export const assessRun = (run: Run, nowMs: number, estimateMin: number | null): Attention => {
  const awaySeconds = Math.floor((nowMs - ms(run.lastActiveAt)) / 1000);
  if (awaySeconds >= AWAY_PROMPT_SECONDS) return { kind: 'away', awaySeconds, stopAt: run.lastActiveAt };
  if (run.snoozeUntil && nowMs < ms(run.snoozeUntil)) return { kind: 'ok' };
  const elapsed = elapsedSeconds(run.startedAt, nowMs);
  if (elapsed >= overThresholdSeconds(estimateMin)) return { kind: 'over', elapsedSeconds: elapsed, estimateMin };
  return { kind: 'ok' };
};

/** Next reminder time after "keep going". */
export const snoozeUntil = (nowMs: number, estimateMin: number | null): string =>
  new Date(nowMs + Math.max(SNOOZE_SECONDS, ((estimateMin ?? 0) * 60) / 2) * 1000).toISOString();

/** Turns a run into a log entry ending at `endIso` (never before it started). */
export const closeRun = (run: Run, endIso: string): TrackedEntry => {
  const end = Math.max(ms(endIso), ms(run.startedAt));
  return {
    type: 'tracked',
    startedAt: run.startedAt,
    endedAt: new Date(end).toISOString(),
    plannedSeconds: 0,
    actualSeconds: Math.round((end - ms(run.startedAt)) / 1000),
    completed: true,
  };
};

const isTracked = (entry: { type: string }): boolean => entry.type === 'tracked';

/** Focus-timer sessions and tracked stretches never overlap because only one timer runs at a time, so they add up. */
export const workedSeconds = (timeLog: ReadonlyArray<{ type: string; actualSeconds: number }> | null | undefined): number =>
  (timeLog ?? []).filter((entry) => entry.type === 'focus' || isTracked(entry)).reduce((sum, entry) => sum + (entry.actualSeconds || 0), 0);

export const secondsToMinutes = (seconds: number): number => (seconds < 30 ? 0 : Math.max(1, Math.round(seconds / 60)));

/** Estimate/actual pairs from finished tasks, for the personal-ratio calibration. */
export const calibrationSamples = (
  tasks: ReadonlyArray<{ status: string; estimateMin?: number | null; timeLog?: ReadonlyArray<{ type: string; actualSeconds: number }> | null }>,
): EstimateSample[] =>
  tasks.flatMap((task) => {
    const actualMin = secondsToMinutes(workedSeconds(task.timeLog));
    return task.status === 'completed' && task.estimateMin && task.estimateMin > 0 && actualMin > 0
      ? [{ estimateMin: task.estimateMin, actualMin }]
      : [];
  });

/** Tracked entries as they sit in the log, with their position so an edit can find them again. */
export const trackedEntries = <T extends { type: string }>(timeLog: ReadonlyArray<T>): Array<{ index: number; entry: T }> =>
  timeLog.flatMap((entry, index) => (isTracked(entry) ? [{ index, entry }] : []));

export const entryFromMinutes = (minutes: number, endIso: string): TrackedEntry => {
  const end = ms(endIso);
  return {
    type: 'tracked',
    startedAt: new Date(end - minutes * 60_000).toISOString(),
    endedAt: new Date(end).toISOString(),
    plannedSeconds: 0,
    actualSeconds: minutes * 60,
    completed: true,
  };
};

/** Changes a tracked entry's length, keeping its start. */
export const withEntryMinutes = <T extends LogEntryLike>(timeLog: ReadonlyArray<T>, index: number, minutes: number): T[] =>
  timeLog.map((entry, i) =>
    i === index && isTracked(entry)
      ? { ...entry, actualSeconds: minutes * 60, endedAt: new Date(ms(entry.startedAt) + minutes * 60_000).toISOString() }
      : entry,
  );

export const withoutEntry = <T,>(timeLog: ReadonlyArray<T>, index: number): T[] => timeLog.filter((_, i) => i !== index);

/**
 * Reads "25", "90m", "1h", "1h30", "1:30" or "1.5h" as minutes. Returns null for anything else,
 * zero, or more than a day, so a typo is never silently saved.
 */
export const parseMinutes = (input: string): number | null => {
  const text = input.trim().toLowerCase().replace(',', '.');
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => number]> = [
    [/^(\d+)$/, (m) => Number(m[1])],
    [/^(\d+)\s*m(in)?$/, (m) => Number(m[1])],
    [/^(\d+(?:\.\d+)?)\s*h(?:ours?)?$/, (m) => Math.round(Number(m[1]) * 60)],
    [/^(\d+)\s*h\s*(\d{1,2})\s*m?(in)?$/, (m) => Number(m[1]) * 60 + Number(m[2])],
    [/^(\d+):(\d{2})$/, (m) => Number(m[1]) * 60 + Number(m[2])],
  ];
  for (const [pattern, toMinutes] of patterns) {
    const match = text.match(pattern);
    if (match) {
      const minutes = toMinutes(match);
      return minutes >= 1 && minutes <= MAX_MANUAL_MINUTES ? minutes : null;
    }
  }
  return null;
};

const pad = (n: number): string => String(n).padStart(2, '0');

/** `mm:ss`, or `h:mm:ss` from an hour up. */
export const formatClock = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/** `45m`, `1h`, `1h 05m`. */
export const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${pad(m)}m`;
};

const roundTo5 = (n: number): number => Math.max(5, Math.round(n / 5) * 5);

/** One-tap answers to "how long did it take?", centred on the person's own estimate. */
export const actualChoices = (estimateMin: number): number[] => {
  const raw = [roundTo5(estimateMin * 0.5), estimateMin, roundTo5(estimateMin * 1.5), roundTo5(estimateMin * 2)];
  return [...new Set(raw)].filter((n) => n >= 1 && n <= MAX_MANUAL_MINUTES);
};

export const ESTIMATE_PRESETS = [5, 15, 30, 60, 90] as const;
