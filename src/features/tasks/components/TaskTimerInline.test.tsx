import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from 'i18next';
import { ready as languageReady } from '../../../i18n/i18n.js';

const timer = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));
vi.mock('../../../core/context/TaskTimerContext', () => ({
  useTaskTimer: () => ({ activeTimer: timer.current, pauseTimer: vi.fn(), resumeTimer: vi.fn(), skipPhase: vi.fn(), stopTimer: vi.fn(), startTask: vi.fn() }),
}));

import { ThemeProvider } from '../../../core/context/ThemeContext';
import TaskTimerInline from './TaskTimerInline';

beforeAll(async () => {
  await languageReady;
  await i18n.changeLanguage('en');
});

const breakAfter = (n: number) => ({
  taskId: 1, phase: 'short-break', status: 'running', remainingSeconds: 299, totalSeconds: 300,
  focusSessionsCompleted: n, phaseStartedAt: new Date().toISOString(), endsAt: Date.now() + 299_000,
});

describe('TaskTimerInline', () => {
  it.each([
    [0, 'No full session yet'],
    [1, 'After 1 session'],
    [3, 'After 3 sessions'],
  ])('a break after %i full sessions says "%s"', async (n, text) => {
    timer.current = breakAfter(n);
    render(<ThemeProvider><TaskTimerInline taskId={1} /></ThemeProvider>);
    expect(await screen.findByText(text)).toBeTruthy();
  });

  it('the clock is a timer (not read out every second) and the phase is the live part', async () => {
    timer.current = breakAfter(1);
    render(<ThemeProvider><TaskTimerInline taskId={1} /></ThemeProvider>);
    const clock = await screen.findByRole('timer');
    expect(clock.getAttribute('aria-live')).toBeNull();
    expect(clock.textContent).toBe('04:59');
    expect(screen.getByText('After 1 session').closest('[aria-live="polite"]')).not.toBeNull();
  });
});
