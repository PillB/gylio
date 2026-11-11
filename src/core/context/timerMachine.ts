/**
 * The focus timer (Pomodoro) as one pure state machine. TaskTimerContext only feeds it the clock and the person's
 * presses; every rule lives here so each one is a one-line test (timerMachine.test.ts) and React StrictMode, which
 * calls a reducer twice in development, cannot double anything.
 *
 *   idle ──start──▶ focus·running ──pause──▶ focus·paused ──resume──▶ focus·running
 *                     │  deadline / skip                                    │ stop (logs the focus so far)
 *                     ▼                                                     ▼
 *                 break·running|paused (autoStartBreak) ──deadline / skip──▶ focus·paused ──stop──▶ idle
 *
 * Rules (docs/state-machines.md, "Focus timer"):
 *  - Time comes from the wall clock: the phase ends at `endsAt`, however rarely the browser lets a hidden tab tick.
 *  - Every stretch of focus is logged when it ends, however it ends (deadline, skip, stop, switching task). A break is
 *    logged only when it ran its full length. Nothing is lost while the Tasks screen is not on view: entries queue.
 *  - Only a focus block that ran its full length counts toward the long break, as in the Pomodoro Technique (an
 *    interrupted pomodoro does not count), so the session number always matches the completed focus entries.
 */

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

export interface ActiveTimerState {
  taskId: number;
  phase: TimerPhase;
  status: 'running' | 'paused';
  /** Whole seconds left, as of the last tick (running) or exactly (paused). */
  remainingSeconds: number;
  totalSeconds: number;
  /** Focus blocks finished in full in this run of the timer. */
  focusSessionsCompleted: number;
  /** When this phase first started; a pause and resume does not move it. */
  phaseStartedAt: string;
  /** Epoch ms at which a running phase ends; null while paused. */
  endsAt: number | null;
}

export type TimerMachine = { timer: ActiveTimerState | null; log: PendingEntry[] };

export type TimerAction =
  | { type: 'start'; taskId: number; minutes?: number; now: number; settings: TimerSettings }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'tick'; now: number; settings: TimerSettings }
  /** The page opened with a timer kept from before. `seenAt` is the last time any page noted it was open. */
  | { type: 'wake'; now: number; seenAt: number | null; settings: TimerSettings }
  | { type: 'skip'; now: number; settings: TimerSettings }
  | { type: 'stop'; now: number }
  | { type: 'logged'; entry: PendingEntry }
  /** Another tab changed the timer: this tab takes its state, so a pause there is a pause here too. */
  | { type: 'replace'; machine: TimerMachine };

export const IDLE: TimerMachine = { timer: null, log: [] };

const LIMITS: Record<keyof Omit<TimerSettings, 'autoStartBreak'>, [number, number]> = {
  focusMinutes: [1, 180],
  shortBreakMinutes: [1, 60],
  longBreakMinutes: [1, 120],
  sessionsBeforeLongBreak: [1, 12],
};

const clampInt = (value: unknown, [min, max]: [number, number], fallback: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Saved or typed settings made safe: whole numbers inside sane bounds (a 0 would end a phase at once, or never). */
export const sanitizeSettings = (raw: Partial<TimerSettings> | null | undefined): TimerSettings => {
  const s = { ...DEFAULT_TIMER_SETTINGS, ...(raw ?? {}) };
  return {
    focusMinutes: clampInt(s.focusMinutes, LIMITS.focusMinutes, DEFAULT_TIMER_SETTINGS.focusMinutes),
    shortBreakMinutes: clampInt(s.shortBreakMinutes, LIMITS.shortBreakMinutes, DEFAULT_TIMER_SETTINGS.shortBreakMinutes),
    longBreakMinutes: clampInt(s.longBreakMinutes, LIMITS.longBreakMinutes, DEFAULT_TIMER_SETTINGS.longBreakMinutes),
    sessionsBeforeLongBreak: clampInt(s.sessionsBeforeLongBreak, LIMITS.sessionsBeforeLongBreak, DEFAULT_TIMER_SETTINGS.sessionsBeforeLongBreak),
    autoStartBreak: s.autoStartBreak !== false,
  };
};

const iso = (ms: number) => new Date(ms).toISOString();

/** Whole seconds left at `now`. */
/** Whole seconds left at `now`; never more than the phase's length, even if the device clock was moved back. */
export const remainingAt = (timer: ActiveTimerState, now: number): number =>
  timer.status === 'running' && timer.endsAt !== null
    ? Math.min(timer.totalSeconds, Math.max(0, Math.ceil((timer.endsAt - now) / 1000)))
    : timer.remainingSeconds;

/**
 * How long no page may have been watching a running timer before the time is no longer counted. An open page notes
 * the time at least once a minute, hidden or not (TaskTimerContext), so a longer silence means every tab was closed,
 * frozen or discarded: nobody can say the person was working.
 */
export const AWAY_GAP_MS = 3 * 60_000;

const phase = (
  taskId: number,
  kind: TimerPhase,
  seconds: number,
  running: boolean,
  startMs: number,
  focusSessionsCompleted: number,
): ActiveTimerState => ({
  taskId,
  phase: kind,
  status: running ? 'running' : 'paused',
  remainingSeconds: seconds,
  totalSeconds: seconds,
  focusSessionsCompleted,
  phaseStartedAt: iso(startMs),
  endsAt: running ? startMs + seconds * 1000 : null,
});

/** The phase after `timer`, starting at `startMs`. `finished` says whether the focus block ran in full. */
const following = (timer: ActiveTimerState, s: TimerSettings, startMs: number, finished: boolean): ActiveTimerState => {
  if (timer.phase !== 'focus') return phase(timer.taskId, 'focus', s.focusMinutes * 60, false, startMs, timer.focusSessionsCompleted);
  const sessions = timer.focusSessionsCompleted + (finished ? 1 : 0);
  const isLong = finished && sessions % s.sessionsBeforeLongBreak === 0;
  const minutes = isLong ? s.longBreakMinutes : s.shortBreakMinutes;
  return phase(timer.taskId, isLong ? 'long-break' : 'short-break', minutes * 60, s.autoStartBreak, startMs, sessions);
};

/** The entry for a phase left before its end; null when nothing worth keeping happened (a break, or no time). */
const partialEntry = (timer: ActiveTimerState, now: number): PendingEntry | null => {
  const actualSeconds = timer.totalSeconds - remainingAt(timer, now);
  if (timer.phase !== 'focus' || actualSeconds <= 0) return null;
  return {
    taskId: timer.taskId,
    type: timer.phase,
    startedAt: timer.phaseStartedAt,
    endedAt: iso(now),
    plannedSeconds: timer.totalSeconds,
    actualSeconds,
    completed: false,
  };
};

const fullEntry = (timer: ActiveTimerState, endMs: number): PendingEntry => ({
  taskId: timer.taskId,
  type: timer.phase,
  startedAt: timer.phaseStartedAt,
  endedAt: iso(endMs),
  plannedSeconds: timer.totalSeconds,
  actualSeconds: timer.totalSeconds,
  completed: true,
});

const withEntry = (log: PendingEntry[], entry: PendingEntry | null) => (entry ? [...log, entry] : log);

/** Runs every phase whose deadline has passed (a tab hidden for an hour catches up in one tick). */
const catchUp = (state: TimerMachine, now: number, s: TimerSettings): TimerMachine => {
  let { timer, log } = state;
  // At most one focus, one break and the paused focus after it can be due: the loop ends on a paused phase.
  while (timer && timer.status === 'running' && timer.endsAt !== null && now >= timer.endsAt) {
    const endedAt = timer.endsAt;
    log = [...log, fullEntry(timer, endedAt)];
    timer = following(timer, s, endedAt, true);
  }
  if (timer && timer.status === 'running') timer = { ...timer, remainingSeconds: remainingAt(timer, now) };
  return timer === state.timer && log === state.log ? state : { timer, log };
};

type Handlers = { [K in TimerAction['type']]: (state: TimerMachine, action: Extract<TimerAction, { type: K }>) => TimerMachine };

const HANDLERS: Handlers = {
  start: ({ timer, log }, a) => {
    // Starting (again, or another task) ends the current run first: its focus so far is kept.
    const ended = timer ? partialEntry(timer, a.now) : null;
    const seconds = sanitizeSettings({ ...a.settings, focusMinutes: a.minutes ?? a.settings.focusMinutes }).focusMinutes * 60;
    return { timer: phase(a.taskId, 'focus', seconds, true, a.now, 0), log: withEntry(log, ended) };
  },
  pause: (state, a) => {
    const { timer } = state;
    if (timer?.status !== 'running') return state;
    return { timer: { ...timer, status: 'paused', remainingSeconds: remainingAt(timer, a.now), endsAt: null }, log: state.log };
  },
  resume: (state, a) => {
    const { timer } = state;
    if (timer?.status !== 'paused') return state;
    return { timer: { ...timer, status: 'running', endsAt: a.now + timer.remainingSeconds * 1000 }, log: state.log };
  },
  tick: (state, a) => catchUp(state, a.now, a.settings),
  wake: (state, a) => {
    const seenAt = a.seenAt ?? a.now;
    if (a.now - seenAt <= AWAY_GAP_MS) return catchUp(state, a.now, a.settings);
    // Closed for a while: count only up to the last moment a page was open, and wait paused there. Nothing is lost,
    // nothing unseen is credited, and the person resumes with one press.
    const upToSeen = catchUp(state, seenAt, a.settings);
    return HANDLERS.pause(upToSeen, { type: 'pause', now: seenAt });
  },
  skip: (state, a) =>
    state.timer ? { timer: following(state.timer, a.settings, a.now, false), log: withEntry(state.log, partialEntry(state.timer, a.now)) } : state,
  stop: (state, a) => (state.timer ? { timer: null, log: withEntry(state.log, partialEntry(state.timer, a.now)) } : state),
  replace: (state, a) => (serializeMachine(a.machine) === serializeMachine(state) ? state : a.machine),
  logged: (state, a) => (state.log.includes(a.entry) ? { timer: state.timer, log: state.log.filter((e) => e !== a.entry) } : state),
};

export const timerReducer = (state: TimerMachine, action: TimerAction): TimerMachine => {
  const handler = HANDLERS[action.type] as ((s: TimerMachine, a: TimerAction) => TimerMachine) | undefined;
  return handler ? handler(state, action) : state;
};

// ---- Surviving a reload ----

const PHASES: readonly TimerPhase[] = ['focus', 'short-break', 'long-break'];
const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;
const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

const isRunState = (t: Partial<ActiveTimerState>) =>
  t.status === 'running' ? typeof t.endsAt === 'number' && Number.isFinite(t.endsAt) : t.status === 'paused' && t.endsAt === null;

const hasCounts = (t: Partial<ActiveTimerState>) =>
  isCount(t.taskId) && isCount(t.remainingSeconds) && isCount(t.totalSeconds) && isCount(t.focusSessionsCompleted) &&
  (t.remainingSeconds as number) <= (t.totalSeconds as number);

const isTimer = (t: Partial<ActiveTimerState> | null | undefined): t is ActiveTimerState =>
  !!t && PHASES.includes(t.phase as TimerPhase) && isRunState(t) && hasCounts(t) && isIso(t.phaseStartedAt);

const isEntry = (e: Partial<PendingEntry> | null | undefined): e is PendingEntry =>
  !!e && isCount(e.taskId) && PHASES.includes(e.type as TimerPhase) && isIso(e.startedAt) && isIso(e.endedAt) &&
  isCount(e.plannedSeconds) && isCount(e.actualSeconds) && typeof e.completed === 'boolean';

/**
 * What is kept on this device so a reload does not lose a running block or a stretch not saved yet. A running timer
 * is kept by its deadline, not its seconds left, so the stored text changes only when the state does (not every tick).
 */
export const serializeMachine = ({ timer, log }: TimerMachine): string =>
  JSON.stringify({ timer: timer && timer.status === 'running' ? { ...timer, remainingSeconds: timer.totalSeconds } : timer, log });

/** Reads back serializeMachine's text; anything that does not hold together is dropped rather than trusted. */
export const restoreMachine = (raw: string | null): TimerMachine => {
  try {
    const parsed = JSON.parse(raw ?? 'null') as { timer?: Partial<ActiveTimerState> | null; log?: unknown } | null;
    const timer = isTimer(parsed?.timer) ? parsed.timer : null;
    const log = Array.isArray(parsed?.log) ? (parsed.log as Partial<PendingEntry>[]).filter(isEntry) : [];
    return timer || log.length ? { timer, log } : IDLE;
  } catch {
    return IDLE;
  }
};
