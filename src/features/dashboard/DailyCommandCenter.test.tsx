import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DailyCommandCenter from './DailyCommandCenter';

const localKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const tasks = [{ id: 1, title: 'Pay rent', status: 'pending', plannedDate: '', subtasks: [] }];
const updateTask = vi.fn(async () => null);
const dbApi = {
  ready: true,
  getTasks: async () => tasks,
  updateTask,
  getEvents: async () => [],
  getBudgets: async () => [],
  getTransactions: async () => [],
};

vi.mock('../../core/hooks/useDB', () => ({ default: () => dbApi }));
vi.mock('../../core/analytics', () => ({ track: vi.fn(), Events: {} }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key) }),
}));

beforeAll(() => {
  // West of UTC, where reading "YYYY-MM-DD" as UTC midnight lands on the previous day.
  process.env.TZ = 'America/Lima';
  tasks[0].plannedDate = localKey(new Date());
});

afterEach(cleanup);

describe('DailyCommandCenter', () => {
  it("shows a task planned for today in the person's own time zone", async () => {
    render(<DailyCommandCenter onExitSimplified={() => undefined} />);
    expect(await screen.findByText('Pay rent')).toBeTruthy();
  });

  it('marks a task completed with the status the rest of the app understands', async () => {
    render(<DailyCommandCenter onExitSimplified={() => undefined} />);
    fireEvent.click(await screen.findByRole('checkbox'));
    await waitFor(() => expect(updateTask).toHaveBeenCalledWith(1, { status: 'completed' }));
  });
});
