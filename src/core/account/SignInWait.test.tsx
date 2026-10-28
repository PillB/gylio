import React from 'react';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUIET_MS, SLOW_SIGN_IN_MS } from './accountGate';
import { OWNER_SIGNED_IN_KEY } from './deviceOwner';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { SignInWaitNotice, useSignInWait } from './SignInWait';

const setOnline = (online: boolean) => Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  setOnline(true);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setOnline(true);
});

describe('useSignInWait', () => {
  it("moves from quiet, to saying so, to the owner's own data on a slow line", () => {
    localStorage.setItem(OWNER_SIGNED_IN_KEY, 'true');
    const start = Date.now();
    const { result } = renderHook(() => useSignInWait(false, start));
    expect(result.current).toBe('quiet');
    act(() => vi.advanceTimersByTime(QUIET_MS));
    expect(result.current).toBe('waiting');
    act(() => vi.advanceTimersByTime(SLOW_SIGN_IN_MS - QUIET_MS));
    expect(result.current).toBe('local');
  });

  it("opens the owner's data as soon as the device goes offline", () => {
    localStorage.setItem(OWNER_SIGNED_IN_KEY, 'true');
    const start = Date.now();
    const { result } = renderHook(() => useSignInWait(false, start));
    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe('local');
  });

  it('keeps waiting after the owner signed out, and says when it is because the device is offline', () => {
    localStorage.setItem(OWNER_SIGNED_IN_KEY, 'false');
    setOnline(false);
    const start = Date.now();
    const { result } = renderHook(() => useSignInWait(false, start));
    act(() => vi.advanceTimersByTime(SLOW_SIGN_IN_MS * 3));
    expect(result.current).toBe('offline');
    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe('waiting');
  });
});

describe('SignInWaitNotice', () => {
  it('keeps an empty live region while quiet, so the words are announced when they appear', () => {
    const { rerender } = render(<SignInWaitNotice wait="quiet" />);
    expect(screen.getByRole('status').textContent).toBe('');
    rerender(<SignInWaitNotice wait="waiting" />);
    expect(screen.getByRole('status').textContent).toBe('device.checkingSignIn');
    rerender(<SignInWaitNotice wait="offline" />);
    expect(screen.getByRole('status').textContent).toBe('device.offlineSignIn');
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });
});
