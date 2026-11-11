import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// The completion goes through another list (useTasks) whose copy of the task can be older than the one on screen.
// Daily Mode must say what it wants ("completed"), never flip that copy, which would reopen a task it meant to complete.
const toggleTaskStatus = vi.hoisted(() => vi.fn(async () => true));
vi.mock('../tasks/hooks/useTasks', () => ({ default: () => ({ toggleTaskStatus }) }));
const noon = vi.hoisted(() => {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // local noon today: "today" in any time zone
  return d;
});
// One object for every render, as the dashboard's effects depend on these functions.
const dbApi = vi.hoisted(() => ({
  ready: true,
  getTasks: async () => [{ id: 1, title: 'Pay rent', status: 'pending', plannedDate: noon.toISOString(), subtasks: [] }],
  getEvents: async () => [],
  getBudgets: async () => [],
  getTransactions: async () => [],
}));
vi.mock('../../core/hooks/useDB', () => ({ default: () => dbApi }));
vi.mock('../../core/analytics', () => ({ track: vi.fn(), Events: {} }));
vi.mock('../../core/hooks/useAccessibility', () => ({ default: () => ({ reduceMotionEnabled: true, animationsEnabled: false }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown, vars?: Record<string, string>) =>
      typeof fallback === 'string' ? fallback.replace(/{{(\w+)}}/g, (_, k: string) => vars?.[k] ?? '') : key,
  }),
}));

import DailyCommandCenter from './DailyCommandCenter';

afterEach(cleanup);

describe('Daily Mode completing a task', () => {
  it('asks for "completed" rather than a flip of whatever the other list last loaded', async () => {
    render(<DailyCommandCenter onExitSimplified={() => undefined} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /Pay rent/ }));
    await waitFor(() => expect(toggleTaskStatus).toHaveBeenCalledWith(1, 'completed'));
  });
});
