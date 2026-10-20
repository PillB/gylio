import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TaskList from './TaskList';
import { getLocalDateKey } from '../../../core/hooks/useClock';
import { addDaysToKey } from '../utils/taskViews';

// Characterization tests for the Tasks screen. They pin user-visible
// behaviour so the view can be split into smaller pieces without regressions.

type TestTask = {
  id: number;
  title: string;
  status: 'pending' | 'completed';
  plannedDate: string | null;
  subtasks: { label: string; done: boolean }[];
  energyRequired: 'tiny' | 'low' | 'medium' | 'high';
  implementationIntention: string | null;
  timeLog: { type: string; actualSeconds: number; completed: boolean }[];
  completedSteps: number;
  totalSteps: number;
  steps: string[];
};

const state = { tasks: [] as TestTask[] };

const addTask = vi.fn(async (input: Record<string, unknown>) => ({ id: 99, ...input }));
const updateTaskDetails = vi.fn(async (id: number, updates: Record<string, unknown>) => ({ id, ...updates }));
const removeTask = vi.fn(async () => true);
const toggleTaskStatus = vi.fn(async () => undefined);
const toggleSubtask = vi.fn(async () => undefined);
const refreshTasks = vi.fn(async () => undefined);
const showSuccess = vi.fn();
const startTask = vi.fn();
const track = vi.fn();

vi.mock('../hooks/useTasks', () => ({
  default: () => ({
    tasks: state.tasks,
    loading: false,
    toggleTaskStatus,
    toggleSubtask,
    addTask,
    updateTaskDetails,
    removeTask,
    refreshTasks,
  }),
}));
vi.mock('../../../core/context/TaskTimerContext', () => ({
  useTaskTimer: () => ({
    activeTimer: null,
    pendingLogEntry: null,
    clearPendingEntry: () => undefined,
    startTask,
    settings: { focusMinutes: 25 },
  }),
}));
const dbApi = { appendTaskTimeLog: async () => undefined };
vi.mock('../../../core/hooks/useDB', () => ({ default: () => dbApi }));
vi.mock('../../../core/context/ToastContext', () => ({ useToast: () => ({ success: showSuccess }) }));
vi.mock('../../../core/hooks/useAccessibility', () => ({ default: () => ({ speak: () => undefined }) }));
vi.mock('../../../core/analytics', () => ({
  track: (...args: unknown[]) => track(...args),
  Events: { TASK_CREATED: 'task_created', TASK_COMPLETED: 'task_completed', ALL_TODAY_TASKS_DONE: 'all_done' },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOptions?: Record<string, unknown> | string, maybeOptions?: Record<string, unknown>) => {
      const options = typeof fallbackOrOptions === 'object' ? fallbackOrOptions : maybeOptions;
      return options && Object.keys(options).length ? `${key} ${JSON.stringify(options)}` : key;
    },
    i18n: { language: 'en' },
  }),
}));

const todayKey = getLocalDateKey();

const makeTask = (id: number, title: string, overrides: Partial<TestTask> = {}): TestTask => ({
  id,
  title,
  status: 'pending',
  plannedDate: todayKey,
  subtasks: [],
  energyRequired: 'medium',
  implementationIntention: null,
  timeLog: [],
  completedSteps: 0,
  totalSteps: 0,
  steps: [],
  ...overrides,
});

const titleInput = () => screen.getByPlaceholderText('taskPlaceholder') as HTMLInputElement;
const openTab = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));

beforeEach(() => {
  state.tasks = [];
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('TaskList', () => {
  it('filters tasks by the selected view', () => {
    state.tasks = [
      makeTask(1, 'Today task'),
      makeTask(2, 'In three days', { plannedDate: addDaysToKey(todayKey, 3) }),
      makeTask(3, 'Someday task', { plannedDate: null }),
    ];
    render(<TaskList />);
    expect(screen.getByText('Today task')).toBeTruthy();
    expect(screen.queryByText('In three days')).toBeNull();

    openTab('tasks.viewWeek');
    expect(screen.getByText('In three days')).toBeTruthy();
    expect(screen.queryByText('Someday task')).toBeNull();

    openTab('tasks.viewBacklog');
    expect(screen.getByText('Someday task')).toBeTruthy();
    expect(screen.queryByText('Today task')).toBeNull();
  });

  it('filters by energy level', () => {
    state.tasks = [makeTask(1, 'Easy one', { energyRequired: 'tiny' }), makeTask(2, 'Hard one', { energyRequired: 'high' })];
    render(<TaskList />);
    const energyRow = screen.getByText('tasks.filterByEnergy').parentElement as HTMLElement;
    fireEvent.click(within(energyRow).getByRole('button', { name: 'tasks.energyHigh' }));
    expect(screen.getByText('Hard one')).toBeTruthy();
    expect(screen.queryByText('Easy one')).toBeNull();
  });

  it('refuses an empty title without saving', async () => {
    render(<TaskList />);
    fireEvent.submit(titleInput().closest('form') as HTMLFormElement);
    expect(await screen.findAllByText('validation.titleRequired')).not.toHaveLength(0);
    expect(addTask).not.toHaveBeenCalled();
  });

  it('adds a task to today from the Today view and resets the form', async () => {
    render(<TaskList />);
    fireEvent.change(titleInput(), { target: { value: '  Call the bank  ' } });
    fireEvent.submit(titleInput().closest('form') as HTMLFormElement);
    await waitFor(() => expect(addTask).toHaveBeenCalledTimes(1));
    expect(addTask.mock.calls[0][0]).toMatchObject({
      title: 'Call the bank',
      plannedDate: todayKey,
      energyRequired: 'medium',
      implementationIntention: null,
      durationMinutes: 25,
    });
    expect(showSuccess).toHaveBeenCalledWith('tasks.taskAddedToday');
    expect(track).toHaveBeenCalledWith('task_created', expect.objectContaining({ hasDate: true, isFirstTask: true }));
    await waitFor(() => expect(titleInput().value).toBe(''));
  });

  it('sends a task added from the Backlog view to the backlog', async () => {
    state.tasks = [makeTask(1, 'Existing')];
    render(<TaskList />);
    openTab('tasks.viewBacklog');
    fireEvent.change(titleInput(), { target: { value: 'Later thing' } });
    fireEvent.submit(titleInput().closest('form') as HTMLFormElement);
    await waitFor(() => expect(addTask).toHaveBeenCalledTimes(1));
    expect(addTask.mock.calls[0][0]).toMatchObject({ plannedDate: null });
    expect(showSuccess).toHaveBeenCalledWith('tasks.taskAddedBacklog');
  });

  it('hides a deleted task at once, restores it on undo, and never removes it', () => {
    vi.useFakeTimers();
    state.tasks = [makeTask(1, 'Water plants')];
    render(<TaskList />);
    fireEvent.click(screen.getByRole('button', { name: 'deleteLabel' }));
    expect(screen.queryByText('Water plants')).toBeNull();

    const undo = showSuccess.mock.calls[0][1] as { onClick: () => void };
    act(() => undo.onClick());
    expect(screen.getByText('Water plants')).toBeTruthy();
    act(() => vi.advanceTimersByTime(5000));
    expect(removeTask).not.toHaveBeenCalled();
  });

  it('removes a deleted task after the undo window', async () => {
    vi.useFakeTimers();
    state.tasks = [makeTask(1, 'Water plants')];
    render(<TaskList />);
    fireEvent.click(screen.getByRole('button', { name: 'deleteLabel' }));
    await act(async () => {
      vi.advanceTimersByTime(4500);
    });
    expect(removeTask).toHaveBeenCalledWith(1);
  });

  it('limits Today to three tasks until the person asks for all', () => {
    state.tasks = [1, 2, 3, 4, 5].map((id) => makeTask(id, `Task ${id}`));
    render(<TaskList />);
    expect(screen.queryByText('Task 4')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /tasks\.focusModeShowAll/ }));
    expect(screen.getByText('Task 5')).toBeTruthy();
  });

  it('groups the Upcoming view into dated sections', () => {
    state.tasks = [
      makeTask(1, 'Late one', { plannedDate: addDaysToKey(todayKey, -2) }),
      makeTask(2, 'Tomorrow one', { plannedDate: addDaysToKey(todayKey, 1) }),
      makeTask(3, 'Far one', { plannedDate: addDaysToKey(todayKey, 30) }),
    ];
    render(<TaskList />);
    openTab('tasks.viewUpcoming');
    const labels = screen.getAllByText(/^tasks\.section/).map((node) => node.textContent);
    expect(labels).toEqual(['tasks.sectionOverdue', 'tasks.sectionTomorrow', 'tasks.sectionLater']);
    fireEvent.click(screen.getByLabelText(/tasks\.complete .*Late one/));
    expect(toggleTaskStatus).toHaveBeenCalledWith(1);
  });

  it('saves an edit with the changed title', async () => {
    state.tasks = [makeTask(1, 'Old title')];
    render(<TaskList />);
    fireEvent.click(screen.getByRole('button', { name: 'editLabel' }));
    const input = screen.getByDisplayValue('Old title');
    fireEvent.change(input, { target: { value: 'New title' } });
    fireEvent.click(screen.getByRole('button', { name: 'saveLabel' }));
    await waitFor(() => expect(updateTaskDetails).toHaveBeenCalledTimes(1));
    expect(updateTaskDetails.mock.calls[0]).toEqual([1, expect.objectContaining({ title: 'New title', plannedDate: todayKey })]);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'saveLabel' })).toBeNull());
  });

  it('shows focus time only once at least 30 seconds were logged', () => {
    state.tasks = [
      makeTask(1, 'Short', { timeLog: [{ type: 'focus', actualSeconds: 20, completed: false }] }),
      makeTask(2, 'Long', {
        timeLog: [
          { type: 'focus', actualSeconds: 1500, completed: true },
          { type: 'short-break', actualSeconds: 300, completed: true },
        ],
      }),
    ];
    render(<TaskList />);
    const focusLines = screen.getAllByText(/🕐/).map((node) => node.textContent);
    expect(focusLines).toEqual(['🕐 25m · 1 tasks.timerSessionSingular']);
  });

  it('marks the first unfinished step as the place to start', () => {
    state.tasks = [
      makeTask(1, 'Steps', {
        subtasks: [
          { label: 'One', done: true },
          { label: 'Two', done: false },
        ],
        completedSteps: 1,
        totalSteps: 2,
      }),
    ];
    render(<TaskList />);
    const marker = screen.getByText(/tasks\.startHere/);
    expect(marker.closest('li')?.textContent).toContain('Two');
    fireEvent.click(within(marker.closest('li') as HTMLElement).getByRole('checkbox'));
    expect(toggleSubtask).toHaveBeenCalledWith(1, 1);
  });

  it('focuses the title field when "n" is pressed outside a field', () => {
    render(<TaskList />);
    const input = titleInput();
    input.scrollIntoView = vi.fn();
    fireEvent.keyDown(window, { key: 'n' });
    expect(document.activeElement).toBe(input);
  });
});
