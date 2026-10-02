import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DailyCommandCenter from './DailyCommandCenter';
import { track } from '../../core/analytics';

// In-memory stand-in for the local database. Every hook (DailyCommandCenter,
// useTasks, useRewards) gets this same object, so useCallback deps stay stable
// and all writes land in one place the test can inspect.
const db = vi.hoisted(() => {
  const noon = new Date();
  noon.setHours(12, 0, 0, 0); // local noon today: "today" in any time zone
  const state = {
    tasks: [] as Array<Record<string, unknown>>,
    rewards: {} as Record<string, unknown>,
  };
  const reset = () => {
    state.tasks = [
      { id: 1, title: 'Pay rent', status: 'pending', plannedDate: noon.toISOString(), subtasks: [] },
    ];
    state.rewards = {
      id: 1, points: 0, level: 1, focusStreakDays: 0, lastFocusDate: null,
      taskStreakDays: 0, lastTaskCompletionDate: null, budgetStreakWeeks: 0,
      lastBudgetReviewWeek: null, skipTokens: 0,
    };
  };
  const api = {
    ready: true,
    getTasks: async () => state.tasks.map((t) => ({ ...t })),
    updateTask: async (id: number, patch: Record<string, unknown>) => {
      const i = state.tasks.findIndex((t) => t.id === id);
      if (i < 0) return null;
      state.tasks[i] = { ...state.tasks[i], ...patch };
      return { ...state.tasks[i] };
    },
    getEvents: async () => [],
    getBudgets: async () => [],
    getTransactions: async () => [],
    getRewardsProgress: async () => ({ ...state.rewards }),
    updateRewardsProgress: async (next: Record<string, unknown>) => {
      state.rewards = { ...state.rewards, ...next };
      return { ...state.rewards };
    },
  };
  return { state, reset, api };
});

vi.mock('../../core/hooks/useDB', () => ({ default: () => db.api }));
vi.mock('../../core/hooks/useGamification', () => ({ default: () => ({ gamificationEnabled: true }) }));
const speak = vi.hoisted(() => async () => undefined);
vi.mock('../../core/hooks/useAccessibility', () => ({ default: () => ({ speak }) }));
vi.mock('../../core/analytics', () => ({
  track: vi.fn(),
  Events: { DAILY_MODE_TASK_COMPLETED: 'daily_mode_task_completed', DAILY_MODE_EXITED: 'daily_mode_exited' },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown, vars?: Record<string, string>) =>
      typeof fallback === 'string' ? fallback.replace(/{{(\w+)}}/g, (_, k: string) => vars?.[k] ?? '') : key,
  }),
}));

beforeEach(() => {
  db.reset();
  vi.mocked(track).mockClear();
});
afterEach(cleanup);

describe('DailyCommandCenter today filter', () => {
  it("shows a task planned for today in the person's own time zone", async () => {
    // West of UTC, where reading "YYYY-MM-DD" as UTC midnight lands on the previous day.
    const previousTz = process.env.TZ;
    process.env.TZ = 'America/Lima';
    try {
      const d = new Date();
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      db.state.tasks[0].plannedDate = key;
      render(<DailyCommandCenter onExitSimplified={() => undefined} />);
      const title = await screen.findByText('Pay rent');
      // The row's date label names the same local day, not the previous one.
      const today = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      expect(title.closest('li')?.textContent).toContain(today);
    } finally {
      // Assigning undefined would store the string "undefined" (UTC), not the host's zone.
      if (previousTz === undefined) delete process.env.TZ;
      else process.env.TZ = previousTz;
    }
  });
});

describe('DailyCommandCenter completing a task', () => {
  it('awards the same points and task streak as completing it on the Tasks screen', async () => {
    render(<DailyCommandCenter onExitSimplified={() => undefined} />);

    fireEvent.click(await screen.findByRole('checkbox', { name: /Pay rent/ }));

    await waitFor(() => expect(db.state.rewards.points).toBe(10));
    expect(db.state.rewards.taskStreakDays).toBe(1);
    expect(db.state.tasks[0].status).toBe('completed');
    expect((screen.getByRole('checkbox', { name: /Pay rent/ }) as HTMLInputElement).checked).toBe(true);
    expect(track).toHaveBeenCalledWith('daily_mode_task_completed', { taskId: 1 });
  });

  it('does not re-award points or reopen the task when the ticked box is clicked again', async () => {
    render(<DailyCommandCenter onExitSimplified={() => undefined} />);
    const box = await screen.findByRole('checkbox', { name: /Pay rent/ });

    fireEvent.click(box);
    await waitFor(() => expect(db.state.rewards.points).toBe(10));
    fireEvent.click(box);
    // Let any second completion/reopen settle before asserting it did not happen.
    await new Promise((r) => setTimeout(r, 50));

    expect(db.state.rewards.points).toBe(10);
    expect(db.state.tasks[0].status).toBe('completed');
  });
});

describe('DailyCommandCenter when a completion is not saved', () => {
  afterEach(() => vi.restoreAllMocks());

  // toggleTaskStatus resolves normally when saving fails or the task is unknown, so the
  // optimistic tick has to be taken back. Otherwise a reload silently reopens a task that
  // was shown as done, and the completion event was already counted.
  it.each([
    ['saving fails', () => vi.spyOn(db.api, 'updateTask').mockRejectedValueOnce(new Error('disk full'))],
    ['the task is not in the database', () => vi.spyOn(db.api, 'updateTask').mockResolvedValueOnce(null)],
  ])('puts the row back and records nothing when %s', async (_label, breakSave) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    breakSave();
    render(<DailyCommandCenter onExitSimplified={() => undefined} />);

    fireEvent.click(await screen.findByRole('checkbox', { name: /Pay rent/ }));

    // The optimistic tick shows first; once the save is known to have failed the row is unticked again.
    await waitFor(() =>
      expect((screen.getByRole('checkbox', { name: /Pay rent/ }) as HTMLInputElement).checked).toBe(false),
    );
    expect(db.state.tasks[0].status).toBe('pending');
    expect(db.state.rewards.points).toBe(0);
    expect(track).not.toHaveBeenCalledWith('daily_mode_task_completed', expect.anything());
  });
});
