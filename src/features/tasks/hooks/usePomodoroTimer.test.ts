import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import usePomodoroTimer from './usePomodoroTimer';

describe('usePomodoroTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle with no remaining time', () => {
    const { result } = renderHook(() => usePomodoroTimer());
    expect(result.current.status).toBe('idle');
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('transitions to running when started', () => {
    const { result } = renderHook(() => usePomodoroTimer());
    act(() => {
      result.current.start(25 * 60);
    });
    expect(result.current.status).toBe('running');
    expect(result.current.remainingSeconds).toBe(25 * 60);
  });

  it('counts down each second', () => {
    const { result } = renderHook(() => usePomodoroTimer());
    act(() => {
      result.current.start(60);
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.remainingSeconds).toBe(57);
  });

  it('pauses and resumes correctly', () => {
    const { result } = renderHook(() => usePomodoroTimer());
    act(() => { result.current.start(60); });
    act(() => { vi.advanceTimersByTime(5000); });
    act(() => { result.current.pause(); });

    expect(result.current.status).toBe('paused');
    const snapshotRemaining = result.current.remainingSeconds;

    act(() => { vi.advanceTimersByTime(5000); }); // time should NOT pass while paused
    expect(result.current.remainingSeconds).toBe(snapshotRemaining);

    act(() => { result.current.resume(); });
    expect(result.current.status).toBe('running');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.remainingSeconds).toBe(snapshotRemaining - 1);
  });

  it('transitions to done when countdown reaches zero', () => {
    const { result } = renderHook(() => usePomodoroTimer());
    act(() => { result.current.start(2); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current.status).toBe('done');
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('cancels and returns to idle', () => {
    const { result } = renderHook(() => usePomodoroTimer());
    act(() => { result.current.start(300); });
    act(() => { result.current.cancel(); });
    expect(result.current.status).toBe('idle');
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('rejects zero or negative durations', () => {
    const { result } = renderHook(() => usePomodoroTimer());
    act(() => { result.current.start(0); });
    expect(result.current.status).toBe('idle');
    act(() => { result.current.start(-10); });
    expect(result.current.status).toBe('idle');
  });
});
