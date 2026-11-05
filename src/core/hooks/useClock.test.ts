import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { msToNextMinute, useClock } from './useClock';

afterEach(() => vi.useRealTimers());

describe('msToNextMinute', () => {
  it('counts to the next whole minute', () => {
    expect(msToNextMinute(new Date(2026, 9, 28, 9, 41, 50, 0))).toBe(10_000);
    expect(msToNextMinute(new Date(2026, 9, 28, 9, 41, 0, 0))).toBe(60_000);
    expect(msToNextMinute(new Date(2026, 9, 28, 9, 41, 59, 999))).toBe(1);
  });
});

describe('useClock', () => {
  it('changes minute on the minute, not a full minute after it started', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 28, 9, 41, 50));
    const { result } = renderHook(() => useClock('en'));
    expect(result.current.now.getMinutes()).toBe(41);
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.now.getMinutes()).toBe(42);
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.now.getMinutes()).toBe(43);
  });

  it('catches up when the tab becomes visible again', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 28, 9, 41, 0));
    const { result } = renderHook(() => useClock('en'));
    // A background tab whose timers were paused: the clock moves on without a tick.
    vi.setSystemTime(new Date(2026, 9, 28, 11, 5, 30));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.now.getHours()).toBe(11);
    expect(result.current.now.getMinutes()).toBe(5);
  });
});
