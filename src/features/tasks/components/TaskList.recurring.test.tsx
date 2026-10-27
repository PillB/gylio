import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { themes } from '../../../core/themes';
import { DEFAULT_TIMER_SETTINGS } from '../../../core/context/TaskTimerContext';
import TaskList from './TaskList';

// A task exactly as useDB().getTasks() hands it back today: mapTask builds this
// shape, and neither the tasks table nor mapTask carries `recurrence`.
const storedTask = {
  id: 1,
  title: 'Water the plants',
  status: 'pending',
  subtasks: [],
  plannedDate: null,
  calendarEventId: null,
  focusPresetMinutes: null,
  energyRequired: 'low' as const,
  implementationIntention: null,
  timeLog: [],
  createdAt: '2026-09-29T10:00:00.000Z',
  updatedAt: '2026-09-29T10:00:00.000Z',
};

let dbTasks: Record<string, unknown>[] = [];
const getTasks = vi.fn(async () => dbTasks);

// Hook results are module constants so their identity is stable across renders.
// The real useDB returns a new object per render; with that here, the reliability
// hook's midnight effect re-runs on every render and act() never settles.
const dbApi = {
  ready: true,
  getTasks,
  insertTask: vi.fn(async () => null),
  appendTaskTimeLog: vi.fn(async () => null),
};
const tasksApi = {
  tasks: [],
  loading: false,
  toggleTaskStatus: vi.fn(),
  toggleSubtask: vi.fn(),
  addTask: vi.fn(),
  updateTaskDetails: vi.fn(),
  removeTask: vi.fn(),
  refreshTasks: vi.fn(async () => undefined),
};
const i18nApi = {
  t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  i18n: { language: 'en' },
};
const toastApi = { showToast: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() };
const timerApi = {
  activeTimer: null,
  pendingLogEntry: null,
  clearPendingEntry: vi.fn(),
  startTask: vi.fn(),
  settings: DEFAULT_TIMER_SETTINGS,
};
const a11yApi = { speak: vi.fn(), reduceMotionEnabled: true, animationsEnabled: false };
const themeApi = { theme: themes.light };

vi.mock('../../../core/hooks/useDB', () => ({ default: () => dbApi }));
vi.mock('../hooks/useTasks', () => ({ default: () => tasksApi }));
vi.mock('react-i18next', () => ({ useTranslation: () => i18nApi }));
vi.mock('../../../core/context/ThemeContext', () => ({ useTheme: () => themeApi }));
vi.mock('../../../core/context/ToastContext', () => ({ useToast: () => toastApi }));
vi.mock('../../../core/context/TaskTimerContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../core/context/TaskTimerContext')>()),
  useTaskTimer: () => timerApi,
}));
vi.mock('../../../core/hooks/useAccessibility', () => ({ default: () => a11yApi }));
vi.mock('../../../core/analytics', () => ({
  track: vi.fn(),
  Events: new Proxy({}, { get: (_t, k) => String(k) }),
}));

const reliabilityButton = () => screen.queryByRole('button', { name: /reliability status/i });

beforeEach(() => {
  localStorage.clear();
  getTasks.mockClear();
});
afterEach(cleanup);

describe('TaskList recurring reliability entry point', () => {
  it('does not offer "Reliability status" when no stored task repeats', async () => {
    dbTasks = [storedTask];
    render(<TaskList />);
    // Let the reliability check read the stored tasks and settle before asserting.
    await waitFor(() => expect(getTasks).toHaveBeenCalled());
    await act(async () => {
      await getTasks.mock.results[0]?.value;
    });
    expect(reliabilityButton()).toBeNull();
  });

  it('offers "Reliability status" once a stored task carries a recurrence', async () => {
    dbTasks = [{ ...storedTask, recurrence: 'daily' }];
    render(<TaskList />);
    // Not offered before the stored tasks are read, then offered once the recurring one is.
    expect(reliabilityButton()).toBeNull();
    expect(await screen.findByRole('button', { name: /reliability status/i })).toBeTruthy();
  });
});
