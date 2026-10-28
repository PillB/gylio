import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeTrackerProvider, useTimeTracker, type TimeTrackerValue } from './TimeTrackerContext';

type Log = Array<{ type: string; startedAt: string; endedAt: string; plannedSeconds: number; actualSeconds: number; completed: boolean }>;
const store: { logs: Record<number, Log>; failAppend: boolean } = { logs: {}, failAppend: false };
const stopPomodoro = vi.fn();
const pomodoro = { running: false };

const db = {
  getTaskById: async (id: number) => ({ id, timeLog: store.logs[id] ?? [] }),
  appendTaskTimeLog: async (id: number, entry: Log[number]) => {
    if (store.failAppend) throw new Error('disk full');
    store.logs[id] = [...(store.logs[id] ?? []), entry];
  },
  setTaskTimeLog: async (id: number, log: Log) => {
    store.logs[id] = log;
  },
};
vi.mock('../../core/hooks/useDB', () => ({ default: () => db }));
vi.mock('../../core/context/TaskTimerContext', () => ({
  useTaskTimer: () => ({ activeTimer: pomodoro.running ? { taskId: 9 } : null, stopTimer: stopPomodoro }),
}));

let tracker: TimeTrackerValue;
const Probe: React.FC = () => {
  tracker = useTimeTracker();
  return null;
};
const mount = () => render(<TimeTrackerProvider><Probe /></TimeTrackerProvider>);

const T0 = Date.parse('2026-10-27T09:00:00Z');
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const task = (id: number, estimateMin: number | null = null) => ({ id, title: `Task ${id}`, estimateMin });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  store.logs = {};
  store.failAppend = false;
  pomodoro.running = false;
  stopPomodoro.mockClear();
  localStorage.clear();
  document.title = 'Gylio';
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TimeTrackerProvider', () => {
  it('counts from timestamps and saves the stretch to the task on stop', async () => {
    mount();
    await act(async () => tracker.start(task(1)));
    await advance(90_000);
    expect(tracker.elapsed).toBe(90);
    await act(async () => tracker.stop());
    expect(tracker.run).toBeNull();
    expect(store.logs[1]).toHaveLength(1);
    expect(store.logs[1][0]).toMatchObject({ type: 'tracked', actualSeconds: 90 });
    expect(tracker.stopped?.title).toBe('Task 1');
    expect(tracker.version).toBe(1);
  });

  it('survives a reload: the run is read back and keeps counting from the original start', async () => {
    const first = mount();
    await act(async () => tracker.start(task(1)));
    await advance(5 * 60_000);
    first.unmount();
    await advance(60_000);
    mount();
    expect(tracker.run?.taskId).toBe(1);
    expect(tracker.elapsed).toBe(6 * 60);
  });

  it('switches tasks in one step: the current one is saved, the new one starts', async () => {
    mount();
    await act(async () => tracker.start(task(1)));
    await advance(120_000);
    await act(async () => tracker.start(task(2)));
    expect(store.logs[1][0].actualSeconds).toBe(120);
    expect(tracker.run?.taskId).toBe(2);
  });

  it('starting the task that already runs changes nothing', async () => {
    mount();
    await act(async () => tracker.start(task(1)));
    const startedAt = tracker.run?.startedAt;
    await advance(30_000);
    await act(async () => tracker.start(task(1)));
    expect(tracker.run?.startedAt).toBe(startedAt);
    expect(store.logs[1]).toBeUndefined();
  });

  it('stops a running focus timer first, so two clocks never run at once', async () => {
    pomodoro.running = true;
    mount();
    await act(async () => tracker.start(task(1)));
    expect(stopPomodoro).toHaveBeenCalledTimes(1);
  });

  it('drops an accidental tap shorter than five seconds', async () => {
    mount();
    await act(async () => tracker.start(task(1)));
    await advance(3000);
    await act(async () => tracker.stop());
    expect(store.logs[1]).toBeUndefined();
    expect(tracker.stopped).toBeNull();
    expect(tracker.run).toBeNull();
  });

  it('keeps the timer running when the save fails, so no time is lost', async () => {
    mount();
    await act(async () => tracker.start(task(1)));
    await advance(60_000);
    store.failAppend = true;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await act(async () => tracker.stop());
    expect(tracker.run?.taskId).toBe(1);
    expect(tracker.elapsed).toBe(60);
  });

  it('puts the running clock in the tab title and restores it afterwards', async () => {
    mount();
    await act(async () => tracker.start(task(1)));
    await advance(61_000);
    expect(document.title).toBe('⏱ 01:01 · Task 1');
    await act(async () => tracker.stop());
    expect(document.title).toBe('Gylio');
  });
});

describe('forgotten timers', () => {
  it('asks about the gap when the app is reopened long after the person was last seen', async () => {
    localStorage.setItem(
      'gylio:timeTracker:v1',
      JSON.stringify({ taskId: 1, title: 'Task 1', estimateMin: null, startedAt: new Date(T0 - 3 * 3600_000).toISOString(), lastActiveAt: new Date(T0 - 2 * 3600_000).toISOString() }),
    );
    mount();
    expect(tracker.attention).toMatchObject({ kind: 'away', awaySeconds: 2 * 3600 });
  });

  it('"remove that time and stop" saves only up to the last moment the person was seen', async () => {
    const lastSeen = new Date(T0 - 2 * 3600_000).toISOString();
    localStorage.setItem('gylio:timeTracker:v1', JSON.stringify({ taskId: 1, title: 'Task 1', estimateMin: null, startedAt: new Date(T0 - 3 * 3600_000).toISOString(), lastActiveAt: lastSeen }));
    mount();
    await act(async () => tracker.stopRemovingAway());
    expect(store.logs[1][0]).toMatchObject({ endedAt: lastSeen, actualSeconds: 3600 });
    expect(tracker.run).toBeNull();
  });

  it('"remove that time, keep timing" saves up to last seen and starts a fresh run now', async () => {
    const lastSeen = new Date(T0 - 2 * 3600_000).toISOString();
    localStorage.setItem('gylio:timeTracker:v1', JSON.stringify({ taskId: 1, title: 'Task 1', estimateMin: 30, startedAt: new Date(T0 - 3 * 3600_000).toISOString(), lastActiveAt: lastSeen }));
    mount();
    await act(async () => tracker.continueRemovingAway());
    expect(store.logs[1][0].actualSeconds).toBe(3600);
    expect(tracker.run).toMatchObject({ taskId: 1, startedAt: new Date(T0).toISOString(), estimateMin: 30 });
    expect(tracker.attention.kind).toBe('ok');
  });

  it('"I was still working" keeps every minute', async () => {
    localStorage.setItem('gylio:timeTracker:v1', JSON.stringify({ taskId: 1, title: 'Task 1', estimateMin: null, startedAt: new Date(T0 - 3 * 3600_000).toISOString(), lastActiveAt: new Date(T0 - 2 * 3600_000).toISOString() }));
    mount();
    act(() => tracker.confirmStillWorking());
    expect(tracker.attention.kind).not.toBe('away');
    await act(async () => tracker.stop());
    expect(store.logs[1][0].actualSeconds).toBe(3 * 3600);
  });

  it('does not let new activity erase the evidence of the gap before it is answered', async () => {
    localStorage.setItem('gylio:timeTracker:v1', JSON.stringify({ taskId: 1, title: 'Task 1', estimateMin: null, startedAt: new Date(T0 - 3 * 3600_000).toISOString(), lastActiveAt: new Date(T0 - 2 * 3600_000).toISOString() }));
    mount();
    act(() => { window.dispatchEvent(new Event('pointerdown')); });
    await advance(1000);
    expect(tracker.attention.kind).toBe('away');
  });

  it('records presence while the person is active so a long focused session never looks like an absence', async () => {
    mount();
    await act(async () => tracker.start(task(1)));
    for (let minute = 0; minute < 50; minute++) {
      await advance(60_000);
      act(() => { window.dispatchEvent(new Event('pointerdown')); });
    }
    expect(tracker.attention.kind).not.toBe('away');
  });
});

describe('past the estimate', () => {
  it('check-ins once, then waits after "keep going"', async () => {
    mount();
    await act(async () => tracker.start(task(1, 20)));
    for (let m = 0; m < 29; m++) { await advance(60_000); act(() => { window.dispatchEvent(new Event('pointerdown')); }); }
    expect(tracker.attention.kind).toBe('ok');
    await advance(60_000);
    act(() => { window.dispatchEvent(new Event('pointerdown')); });
    expect(tracker.attention.kind).toBe('over');
    act(() => tracker.keepGoing());
    expect(tracker.attention.kind).toBe('ok');
  });
});

describe('fixing time afterwards', () => {
  it('undo removes exactly the saved stretch', async () => {
    store.logs[1] = [{ type: 'focus', startedAt: 'f', endedAt: 'f', plannedSeconds: 1, actualSeconds: 1500, completed: true }];
    mount();
    await act(async () => tracker.start(task(1)));
    await advance(120_000);
    await act(async () => tracker.stop());
    await act(async () => tracker.undoStop());
    expect(store.logs[1].map((e) => e.type)).toEqual(['focus']);
    expect(tracker.stopped).toBeNull();
  });

  it('fixing the last stop changes its length and keeps its start', async () => {
    mount();
    await act(async () => tracker.start(task(1)));
    await advance(120_000);
    await act(async () => tracker.stop());
    await act(async () => tracker.setStoppedMinutes(45));
    expect(store.logs[1][0].actualSeconds).toBe(45 * 60);
    expect(store.logs[1][0].startedAt).toBe(new Date(T0).toISOString());
    expect(tracker.stopped?.entry.actualSeconds).toBe(45 * 60);
  });

  it('edits, removes and adds time from the task log', async () => {
    mount();
    await act(async () => tracker.addManual(1, 20));
    expect(store.logs[1][0]).toMatchObject({ type: 'tracked', actualSeconds: 1200 });
    await act(async () => tracker.editEntry(1, 0, 30));
    expect(store.logs[1][0].actualSeconds).toBe(1800);
    await act(async () => tracker.removeEntry(1, 0));
    expect(store.logs[1]).toEqual([]);
    expect(tracker.version).toBe(3);
  });
});
