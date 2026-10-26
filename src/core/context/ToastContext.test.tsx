import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

const wrapper = ({ children }: { children: React.ReactNode }) => <ToastProvider>{children}</ToastProvider>;

describe('ToastProvider', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows one toast when the same message repeats (five quick task adds)', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      for (let i = 0; i < 5; i += 1) result.current.success('Added to Today.');
    });
    expect(result.current.toasts).toHaveLength(1);
  });

  it('keeps different messages, and keeps toasts that carry an undo action', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.success('Added to Today.');
      result.current.success('Task deleted.', { label: 'Undo', onClick: () => undefined });
      result.current.success('Task deleted.', { label: 'Undo', onClick: () => undefined });
    });
    expect(result.current.toasts.map((t) => t.message)).toEqual(['Added to Today.', 'Task deleted.', 'Task deleted.']);
  });

  it('restarts the timer when a message repeats instead of dismissing the new toast early', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.success('Saved.');
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => {
      result.current.success('Saved.');
    });
    act(() => {
      vi.advanceTimersByTime(3000); // 6s after the first, 3s after the second: still visible
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});
