import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ appendTaskTimeLog: vi.fn(), identity: 0 }));
// Like the real hook, the save function is a new one once the database has opened (`identity` stands for that).
const saves = new Map<number, (...args: unknown[]) => unknown>();
const saveFor = (identity: number) => {
  if (!saves.has(identity)) saves.set(identity, (...args: unknown[]) => db.appendTaskTimeLog(...args));
  return saves.get(identity);
};
vi.mock('../hooks/useDB', () => ({ default: () => ({ appendTaskTimeLog: saveFor(db.identity) }) }));
const reward = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('../hooks/useRewards', () => ({ default: () => ({ applyRewardsProgress: reward }) }));

import { MACHINE_KEY, SAVE_RETRY_MS, TaskTimerProvider, useTaskTimer } from './TaskTimerContext';

const wrapper = ({ children }: { children: React.ReactNode }) => <TaskTimerProvider>{children}</TaskTimerProvider>;
const strictWrapper = ({ children }: { children: React.ReactNode }) => (
  <React.StrictMode>
    <TaskTimerProvider>{children}</TaskTimerProvider>
  </React.StrictMode>
);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'Date'] });
  vi.setSystemTime(Date.UTC(2026, 10, 11, 9, 0, 0));
  db.appendTaskTimeLog.mockReset().mockResolvedValue(true);
  reward.mockClear();
  localStorage.clear();
});
afterEach(() => vi.useRealTimers());

/** Lets the save promise settle inside act. */
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

describe('startTask length', () => {
  it('uses the saved focus length by default', () => {
    const { result } = renderHook(() => useTaskTimer(), { wrapper });
    act(() => result.current.startTask(7));
    expect(result.current.activeTimer?.totalSeconds).toBe(result.current.settings.focusMinutes * 60);
  });

  it('starts a shorter first block when minutes are given, without changing the saved setting', () => {
    const { result } = renderHook(() => useTaskTimer(), { wrapper });
    const saved = result.current.settings.focusMinutes;
    act(() => result.current.startTask(7, 2));
    expect(result.current.activeTimer?.totalSeconds).toBe(120);
    expect(result.current.activeTimer?.remainingSeconds).toBe(120);
    expect(result.current.activeTimer?.status).toBe('running');
    expect(result.current.settings.focusMinutes).toBe(saved);
  });
});

describe('saving what the timer logs', () => {
  it('saves a finished focus block to its task once, even under StrictMode, and tells lists to reload', async () => {
    const { result } = renderHook(() => useTaskTimer(), { wrapper: strictWrapper });
    act(() => result.current.startTask(7, 1));
    act(() => { vi.advanceTimersByTime(61_000); });
    await flush();
    expect(db.appendTaskTimeLog).toHaveBeenCalledTimes(1);
    expect(db.appendTaskTimeLog).toHaveBeenCalledWith(7, expect.objectContaining({ type: 'focus', completed: true, actualSeconds: 60 }));
    expect(result.current.version).toBe(1);
    expect(reward).toHaveBeenCalledTimes(1);
    expect(reward).toHaveBeenCalledWith({ points: 10, focusCompleted: true });
  });

  it('a block another tab already saved is not paid again, and a stopped block earns nothing', async () => {
    db.appendTaskTimeLog.mockResolvedValue(false);
    const { result } = renderHook(() => useTaskTimer(), { wrapper });
    act(() => result.current.startTask(7, 1));
    act(() => { vi.advanceTimersByTime(61_000); });
    await flush();
    expect(reward).not.toHaveBeenCalled();
    db.appendTaskTimeLog.mockResolvedValue(true);
    act(() => result.current.startTask(8));
    act(() => { vi.advanceTimersByTime(60_000); });
    act(() => result.current.stopTimer());
    await flush();
    expect(db.appendTaskTimeLog).toHaveBeenLastCalledWith(8, expect.objectContaining({ completed: false }));
    expect(reward).not.toHaveBeenCalled();
  });

  it('a save still on its way is not started again when the database opens meanwhile', async () => {
    let finish = () => undefined as void;
    db.appendTaskTimeLog.mockReturnValueOnce(new Promise<boolean>((resolve) => { finish = () => resolve(true); }));
    const { result, rerender } = renderHook(() => useTaskTimer(), { wrapper });
    act(() => result.current.startTask(7));
    act(() => { vi.advanceTimersByTime(60_000); });
    act(() => result.current.stopTimer());
    db.identity += 1;
    rerender();
    finish();
    await flush();
    expect(db.appendTaskTimeLog).toHaveBeenCalledTimes(1);
    expect(result.current.version).toBe(1);
  });

  it('keeps an entry whose save failed and saves it again a little later', async () => {
    db.appendTaskTimeLog.mockRejectedValueOnce(new Error('database still opening'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useTaskTimer(), { wrapper });
    act(() => result.current.startTask(7));
    act(() => { vi.advanceTimersByTime(5 * 60_000); });
    act(() => result.current.stopTimer());
    await flush();
    expect(result.current.version).toBe(0);
    await act(async () => { vi.advanceTimersByTime(SAVE_RETRY_MS); });
    await flush();
    expect(db.appendTaskTimeLog).toHaveBeenCalledTimes(2);
    expect(db.appendTaskTimeLog.mock.calls[1]).toEqual([7, expect.objectContaining({ actualSeconds: 300, completed: false })]);
    expect(result.current.version).toBe(1);
  });

  it('a stored setting of 0 minutes is read back as 1', () => {
    localStorage.setItem('gylio_timer_settings', JSON.stringify({ focusMinutes: 0 }));
    const { result } = renderHook(() => useTaskTimer(), { wrapper });
    expect(result.current.settings.focusMinutes).toBe(1);
  });
});

describe('reloads and other tabs', () => {
  it('a reload in the middle of a block keeps it running from the same deadline', () => {
    const first = renderHook(() => useTaskTimer(), { wrapper });
    act(() => first.result.current.startTask(7));
    act(() => { vi.advanceTimersByTime(10 * 60_000); });
    first.unmount();
    vi.setSystemTime(Date.now() + 60_000);
    const { result } = renderHook(() => useTaskTimer(), { wrapper });
    expect(result.current.activeTimer).toMatchObject({ taskId: 7, status: 'running', remainingSeconds: 14 * 60 });
  });

  it('a pause made in another tab pauses this one', () => {
    const { result } = renderHook(() => useTaskTimer(), { wrapper });
    act(() => result.current.startTask(7));
    const other = JSON.parse(localStorage.getItem(MACHINE_KEY) as string);
    other.timer = { ...other.timer, status: 'paused', endsAt: null, remainingSeconds: 600 };
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: MACHINE_KEY, newValue: JSON.stringify(other) })); });
    expect(result.current.activeTimer).toMatchObject({ status: 'paused', remainingSeconds: 600 });
  });
});
