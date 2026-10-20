import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TaskTimerProvider, useTaskTimer } from './TaskTimerContext';

const wrapper = ({ children }: { children: React.ReactNode }) => <TaskTimerProvider>{children}</TaskTimerProvider>;

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
