import { describe, expect, it } from 'vitest';
import { withEntryOnce } from '../hooks/useDB';
import { AWAY_GAP_MS, DEFAULT_TIMER_SETTINGS, IDLE, restoreMachine, sanitizeSettings, serializeMachine, timerReducer, type TimerAction, type TimerMachine, type TimerSettings } from './timerMachine';

const T0 = Date.UTC(2026, 10, 11, 9, 0, 0);
const SEC = 1000;
const MIN = 60 * SEC;
const s: TimerSettings = { ...DEFAULT_TIMER_SETTINGS }; // 25 / 5 / 15, long break after 4, breaks start by themselves

const run = (...actions: TimerAction[]): TimerMachine => actions.reduce(timerReducer, IDLE);
const start = (taskId = 1, now = T0, minutes?: number): TimerAction => ({ type: 'start', taskId, minutes, now, settings: s });
const tick = (now: number, settings = s): TimerAction => ({ type: 'tick', now, settings });
const skip = (now: number): TimerAction => ({ type: 'skip', now, settings: s });

describe('time comes from the wall clock, not from counting ticks', () => {
  it('a tab the browser stopped ticking for 25 minutes still ends the focus block on time', () => {
    // One tick after a long silence, as Chrome's intensive throttling of hidden tabs produces.
    const m = run(start(), tick(T0 + 25 * MIN + 2 * SEC));
    expect(m.timer).toMatchObject({ phase: 'short-break', status: 'running', focusSessionsCompleted: 1 });
    expect(m.log).toEqual([
      expect.objectContaining({ type: 'focus', completed: true, actualSeconds: 1500, endedAt: new Date(T0 + 25 * MIN).toISOString() }),
    ]);
  });

  it('a long silence runs the break too, from the moment the focus ended, and waits paused for the next focus', () => {
    const m = run(start(), tick(T0 + 31 * MIN));
    expect(m.log.map((e) => [e.type, e.completed])).toEqual([['focus', true], ['short-break', true]]);
    expect(m.log[1].startedAt).toBe(new Date(T0 + 25 * MIN).toISOString());
    expect(m.timer).toMatchObject({ phase: 'focus', status: 'paused', remainingSeconds: 1500 });
  });

  it('shows the seconds left from the deadline', () => {
    expect(run(start(), tick(T0 + 10 * MIN + 400)).timer?.remainingSeconds).toBe(15 * 60);
  });
});

describe('the session count matches the focus blocks finished in full', () => {
  it('skipping focus goes to a short break without counting a session, so four skips never earn a long break', () => {
    let m = run(start());
    for (let i = 1; i <= 4; i += 1) {
      m = timerReducer(m, skip(T0 + i * MIN)); // to a break
      expect(m.timer).toMatchObject({ phase: 'short-break', focusSessionsCompleted: 0 });
      m = timerReducer(m, skip(T0 + i * MIN + SEC)); // back to focus
    }
    expect(m.log.filter((e) => e.type === 'focus' && e.completed)).toHaveLength(0);
  });

  it('the fourth full focus block earns the long break', () => {
    let m = run(start());
    let at = T0;
    for (let i = 1; i <= 4; i += 1) {
      at += 25 * MIN;
      m = timerReducer(m, tick(at));
      if (i < 4) {
        expect(m.timer?.phase).toBe('short-break');
        at += 5 * MIN;
        m = timerReducer(m, tick(at));
        m = timerReducer(m, { type: 'resume', now: at });
      }
    }
    expect(m.timer).toMatchObject({ phase: 'long-break', focusSessionsCompleted: 4 });
    expect(m.log.filter((e) => e.type === 'focus' && e.completed)).toHaveLength(4);
  });
});

describe('every stretch of focus is kept, however it ends', () => {
  it('a pause and resume keeps when the block started and counts only the time worked', () => {
    const m = run(
      start(),
      { type: 'pause', now: T0 + 10 * MIN },
      { type: 'resume', now: T0 + 40 * MIN },
      { type: 'stop', now: T0 + 45 * MIN },
    );
    expect(m.timer).toBeNull();
    expect(m.log).toEqual([
      expect.objectContaining({ startedAt: new Date(T0).toISOString(), actualSeconds: 15 * 60, completed: false }),
    ]);
  });

  it('a paused block with work in it is kept when another task is started', () => {
    const m = run(start(1), { type: 'pause', now: T0 + 7 * MIN }, start(2, T0 + 20 * MIN));
    expect(m.log).toEqual([expect.objectContaining({ taskId: 1, actualSeconds: 7 * 60, completed: false })]);
    expect(m.timer).toMatchObject({ taskId: 2, phase: 'focus', status: 'running' });
  });

  it('starting the same task again keeps the time already worked', () => {
    const m = run(start(1), start(1, T0 + 3 * MIN));
    expect(m.log).toEqual([expect.objectContaining({ taskId: 1, actualSeconds: 180 })]);
  });

  it('stopping during a break keeps nothing more: a break is logged only when taken in full', () => {
    const m = run(start(), tick(T0 + 25 * MIN), { type: 'stop', now: T0 + 27 * MIN });
    expect(m.log.map((e) => e.type)).toEqual(['focus']);
  });

  it('entries wait in order until saved, and a save removes only the entry it saved', () => {
    const m = run(start(1), start(2, T0 + MIN), { type: 'stop', now: T0 + 3 * MIN });
    expect(m.log.map((e) => e.taskId)).toEqual([1, 2]);
    const afterSave = timerReducer(m, { type: 'logged', entry: m.log[0] });
    expect(afterSave.log).toEqual([m.log[1]]);
    expect(timerReducer(afterSave, { type: 'logged', entry: m.log[0] })).toBe(afterSave);
  });
});

describe('presses that do not apply change nothing', () => {
  it.each<[string, TimerAction]>([
    ['pause', { type: 'pause', now: T0 }],
    ['resume', { type: 'resume', now: T0 }],
    ['skip', skip(T0)],
    ['stop', { type: 'stop', now: T0 }],
    ['tick', tick(T0)],
  ])('%s with no timer', (_, action) => {
    expect(timerReducer(IDLE, action)).toBe(IDLE);
  });

  it('resume while running and pause while paused', () => {
    const running = run(start());
    expect(timerReducer(running, { type: 'resume', now: T0 + MIN })).toBe(running);
    const paused = timerReducer(running, { type: 'pause', now: T0 + MIN });
    expect(timerReducer(paused, { type: 'pause', now: T0 + 2 * MIN })).toBe(paused);
    expect(timerReducer(paused, tick(T0 + 99 * MIN))).toBe(paused);
  });
});

describe('settings', () => {
  it('a saved 0 or a typo cannot make a phase end at once or never', () => {
    expect(sanitizeSettings({ focusMinutes: 0, sessionsBeforeLongBreak: 0, shortBreakMinutes: Number.NaN, longBreakMinutes: 9999 })).toEqual({
      focusMinutes: 1,
      shortBreakMinutes: 5,
      longBreakMinutes: 120,
      sessionsBeforeLongBreak: 1,
      autoStartBreak: true,
    });
  });

  it('a shorter first block is honoured and later blocks use the saved length', () => {
    const m = run(start(1, T0, 2), tick(T0 + 2 * MIN), tick(T0 + 7 * MIN));
    expect(m.log[0]).toMatchObject({ plannedSeconds: 120, completed: true });
    expect(m.timer).toMatchObject({ phase: 'focus', totalSeconds: 25 * 60 });
  });

  it('with breaks set not to start by themselves, the break waits paused', () => {
    const m = run(start(), tick(T0 + 26 * MIN, { ...s, autoStartBreak: false }));
    expect(m.timer).toMatchObject({ phase: 'short-break', status: 'paused', remainingSeconds: 300 });
  });
});


describe('surviving a reload and other tabs', () => {
  it('a running block is stored by its deadline, so the stored text does not change on every tick', () => {
    const a = run(start(), tick(T0 + 5 * SEC));
    const b = timerReducer(a, tick(T0 + 9 * SEC));
    expect(b.timer?.remainingSeconds).not.toBe(a.timer?.remainingSeconds);
    expect(serializeMachine(b)).toBe(serializeMachine(a));
  });

  it('reads back a running block and a stretch not saved yet, and finishes the block on the first tick', () => {
    const before = run(start(3), { type: 'stop', now: T0 + 2 * MIN }, start(4, T0 + 2 * MIN));
    const restored = restoreMachine(serializeMachine(before));
    expect(restored.log).toEqual(before.log);
    const after = timerReducer(restored, tick(T0 + 40 * MIN));
    expect(after.log.map((e) => [e.taskId, e.type, e.completed])).toEqual([[3, 'focus', false], [4, 'focus', true], [4, 'short-break', true]]);
  });

  it.each([
    ['nothing stored', null],
    ['not JSON', '{oops'],
    ['a running timer with no deadline', JSON.stringify({ timer: { taskId: 1, phase: 'focus', status: 'running', remainingSeconds: 1, totalSeconds: 1, focusSessionsCompleted: 0, phaseStartedAt: new Date(T0).toISOString(), endsAt: null }, log: [] })],
    ['a phase that does not exist', JSON.stringify({ timer: { taskId: 1, phase: 'nap', status: 'paused', remainingSeconds: 1, totalSeconds: 1, focusSessionsCompleted: 0, phaseStartedAt: new Date(T0).toISOString(), endsAt: null }, log: [] })],
  ])('drops what does not hold together: %s', (_, raw) => {
    expect(restoreMachine(raw)).toBe(IDLE);
  });

  it('a pause in another tab replaces this tab’s running copy, and the same state again changes nothing', () => {
    const here = run(start());
    const there = timerReducer(here, { type: 'pause', now: T0 + 4 * MIN });
    const replaced = timerReducer(here, { type: 'replace', machine: restoreMachine(serializeMachine(there)) });
    expect(replaced.timer).toMatchObject({ status: 'paused', remainingSeconds: 21 * 60 });
    expect(timerReducer(replaced, { type: 'replace', machine: restoreMachine(serializeMachine(there)) })).toBe(replaced);
  });

  it('two tabs that both see the block end log identical entries, and saving adds it once', () => {
    const tabA = run(start(), tick(T0 + 25 * MIN + 300));
    const tabB = run(start(), tick(T0 + 25 * MIN + 900));
    expect(tabA.log).toEqual(tabB.log);
    const { taskId: _a, ...entryA } = tabA.log[0];
    const { taskId: _b, ...entryB } = tabB.log[0];
    expect(withEntryOnce(withEntryOnce([], entryA), entryB)).toHaveLength(1);
  });
});

describe('opening the app again with a timer kept from before', () => {
  const wake = (now: number, seenAt: number | null): TimerAction => ({ type: 'wake', now, seenAt, settings: s });

  it('a page was open until a moment ago: the block carries on (or finishes) as if nothing happened', () => {
    const m = timerReducer(run(start()), wake(T0 + 26 * MIN, T0 + 26 * MIN - AWAY_GAP_MS));
    expect(m.log.map((e) => [e.type, e.completed])).toEqual([['focus', true]]);
    expect(m.timer).toMatchObject({ phase: 'short-break', status: 'running' });
  });

  it('every page was closed at minute 5: nothing after that is credited, and the block waits paused with 20 minutes left', () => {
    const m = timerReducer(run(start()), wake(T0 + 3 * 60 * MIN, T0 + 5 * MIN));
    expect(m.log).toEqual([]);
    expect(m.timer).toMatchObject({ phase: 'focus', status: 'paused', remainingSeconds: 20 * 60, endsAt: null });
  });

  it('closed after the block ended but during the break: the block is credited, the break waits where it was left', () => {
    const m = timerReducer(run(start()), wake(T0 + 5 * 60 * MIN, T0 + 27 * MIN));
    expect(m.log.map((e) => [e.type, e.completed])).toEqual([['focus', true]]);
    expect(m.timer).toMatchObject({ phase: 'short-break', status: 'paused', remainingSeconds: 3 * 60 });
  });

  it('a device clock moved back does not show more time than the phase has', () => {
    expect(run(start(), tick(T0 - 10 * MIN)).timer?.remainingSeconds).toBe(25 * 60);
  });
});

describe('a press that lands after the deadline, before the next tick', () => {
  it('stop: the block ran in full, so it is logged as finished and paid as one', () => {
    const m = run(start(1, T0, 1), { type: 'stop', now: T0 + MIN + 400 });
    expect(m.log).toEqual([expect.objectContaining({ type: 'focus', completed: true, actualSeconds: 60 })]);
    expect(m.timer).toBeNull();
  });

  it('skip to break: the block already ended, so it counts and the break it reached is not skipped too', () => {
    const m = run(start(1, T0, 1), skip(T0 + MIN + 400));
    expect(m.timer).toMatchObject({ phase: 'short-break', focusSessionsCompleted: 1 });
    expect(m.log.map((e) => e.completed)).toEqual([true]);
  });

  it('pause: the break that began at the deadline is the one paused', () => {
    const m = run(start(1, T0, 1), { type: 'pause', now: T0 + MIN + 30 * SEC });
    expect(m.timer).toMatchObject({ phase: 'short-break', status: 'paused', remainingSeconds: 270 });
  });
});

describe('saving the same stretch twice', () => {
  it('two tabs that each stop the same tracker run at their own moment add it once', () => {
    const run1 = { type: 'tracked' as unknown as 'focus', startedAt: new Date(T0).toISOString(), endedAt: new Date(T0 + 10 * MIN).toISOString(), plannedSeconds: 0, actualSeconds: 600, completed: true };
    const run2 = { ...run1, endedAt: new Date(T0 + 10 * MIN + 3 * SEC).toISOString(), actualSeconds: 603 };
    expect(withEntryOnce(withEntryOnce([], run1), run2)).toEqual([run1]);
  });
});
