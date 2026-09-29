import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CalendarView from './CalendarView.jsx';

// Characterization tests for the Calendar screen. They pin user-visible
// behaviour so the view can be split into smaller pieces without regressions.

type TestEvent = {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  taskId: number | null;
  reminderMinutesBefore: number | null;
};

type TestTask = { id: number; title: string; calendarEventId: number | null; status: string };

const db = { events: [] as TestEvent[], tasks: [] as TestTask[] };

const insertEvent = vi.fn(
  async (
    title: string,
    description: string | null,
    startDate: string,
    endDate: string | null,
    location: string | null,
    taskId: number | null,
    reminderMinutesBefore: number | null
  ) => ({ id: 700, title, description, startDate, endDate, location, taskId, reminderMinutesBefore })
);
const updateEvent = vi.fn(async (id: number, updates: Partial<TestEvent>) => {
  const current = db.events.find((event) => event.id === id);
  return current ? { ...current, ...updates } : null;
});
const deleteEvent = vi.fn(async () => true);
const updateTask = vi.fn(async (id: number, updates: Partial<TestTask>) => ({ id, ...updates }));
const deleteTask = vi.fn(async () => true);
const speak = vi.fn();

// Stable references, like the real hook's useCallback results.
const dbApi = {
  ready: true,
  getEvents: async () => db.events,
  getTasks: async () => db.tasks,
  insertEvent,
  updateEvent,
  deleteEvent,
  updateTask,
  deleteTask,
};

vi.mock('../core/hooks/useDB', () => ({ default: () => dbApi }));
vi.mock('../core/hooks/useAccessibility', () => ({ default: () => ({ speak }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options && typeof options === 'object' && Object.keys(options).length ? `${key} ${JSON.stringify(options)}` : key,
    i18n: { language: 'en' },
  }),
}));

const makeEvent = (id: number, title: string, startDate: string, overrides: Partial<TestEvent> = {}): TestEvent => ({
  id,
  title,
  description: null,
  startDate,
  endDate: null,
  location: null,
  taskId: null,
  reminderMinutesBefore: null,
  ...overrides,
});

const eventsSection = () => screen.getByText('calendarEventsHeading').parentElement as HTMLElement;
const convertSection = () => screen.getByText('calendarTasksToConvert').parentElement as HTMLElement;
const dateInput = () => screen.getByLabelText('calendarSelectDate') as HTMLInputElement;
const fieldIn = (scope: HTMLElement, label: string) =>
  within(scope)
    .getByText(label, { selector: 'label, label > span' })
    .closest('label')
    ?.querySelector('input, select') as HTMLInputElement;

const renderLoaded = async () => {
  render(<CalendarView />);
  await waitFor(() => expect(within(eventsSection()).queryByText('loading')).toBeNull());
};

const openAddForm = () => {
  fireEvent.click(screen.getByRole('button', { name: /calendarAddEvent/ }));
  return screen.getByRole('button', { name: 'calendarSaveEvent' }).parentElement?.parentElement as HTMLElement;
};

beforeEach(() => {
  db.events = [];
  db.tasks = [];
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('CalendarView', () => {
  it('lists events by start time, with undated events last', async () => {
    db.events = [
      makeEvent(1, 'Late', '2026-03-10T15:00'),
      makeEvent(2, 'No time', ''),
      makeEvent(3, 'Early', '2026-03-10T09:00'),
    ];
    await renderLoaded();
    const titles = within(eventsSection())
      .getAllByRole('listitem')
      .map((item) => item.firstElementChild?.firstElementChild?.textContent);
    expect(titles).toEqual(['Early', 'Late', 'No time']);
  });

  it('adds an event, links its task, and clears the form', async () => {
    db.tasks = [{ id: 5, title: 'Write report', calendarEventId: null, status: 'pending' }];
    await renderLoaded();
    const form = openAddForm();
    fireEvent.change(fieldIn(form, 'titleLabel'), { target: { value: '  Deep work  ' } });
    fireEvent.change(fieldIn(form, 'calendarStartLabel'), { target: { value: '2026-03-10T09:00' } });
    fireEvent.change(fieldIn(form, 'calendarEndLabel'), { target: { value: '2026-03-10T10:00' } });
    fireEvent.change(fieldIn(form, 'calendarTaskLinkLabel'), { target: { value: '5' } });
    fireEvent.change(fieldIn(form, 'calendarReminderLabel'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'calendarSaveEvent' }));

    await waitFor(() => expect(updateTask).toHaveBeenCalledWith(5, { calendarEventId: 700 }));
    expect(insertEvent).toHaveBeenCalledWith('Deep work', null, '2026-03-10T09:00', '2026-03-10T10:00', null, 5, 15);
    expect(fieldIn(form, 'titleLabel').value).toBe('');
    expect(within(convertSection()).queryByText('Write report')).toBeNull();
  });

  it('blocks an event that ends before it starts', async () => {
    await renderLoaded();
    const form = openAddForm();
    fireEvent.change(fieldIn(form, 'titleLabel'), { target: { value: 'Oops' } });
    fireEvent.change(fieldIn(form, 'calendarStartLabel'), { target: { value: '2026-03-10T10:00' } });
    fireEvent.change(fieldIn(form, 'calendarEndLabel'), { target: { value: '2026-03-10T09:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'calendarSaveEvent' }));
    expect(await screen.findByText('validation.endAfterStart')).toBeTruthy();
    expect(insertEvent).not.toHaveBeenCalled();
  });

  it('moves the task link when an edit changes the linked task', async () => {
    db.tasks = [
      { id: 5, title: 'Old task', calendarEventId: 1, status: 'pending' },
      { id: 6, title: 'New task', calendarEventId: null, status: 'pending' },
    ];
    db.events = [makeEvent(1, 'Standup', '2026-03-10T09:00', { taskId: 5 })];
    await renderLoaded();
    fireEvent.click(within(eventsSection()).getByRole('button', { name: 'editLabel' }));
    const editor = within(eventsSection()).getByRole('listitem');
    expect(fieldIn(editor, 'titleLabel').value).toBe('Standup');
    fireEvent.change(fieldIn(editor, 'titleLabel'), { target: { value: 'Team standup' } });
    fireEvent.change(fieldIn(editor, 'calendarTaskLinkLabel'), { target: { value: '6' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'saveLabel' }));

    await waitFor(() => expect(updateTask).toHaveBeenCalledWith(6, { calendarEventId: 1 }));
    expect(updateEvent).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'Team standup', taskId: 6 }));
    expect(updateTask).toHaveBeenCalledWith(5, { calendarEventId: null });
    expect(await within(eventsSection()).findByText('Team standup')).toBeTruthy();
  });

  it('asks before deleting, and keeps the linked task', async () => {
    db.tasks = [{ id: 5, title: 'Linked', calendarEventId: 1, status: 'pending' }];
    db.events = [makeEvent(1, 'Standup', '2026-03-10T09:00', { taskId: 5 })];
    await renderLoaded();
    fireEvent.click(within(eventsSection()).getByRole('button', { name: 'deleteLabel' }));
    expect(deleteEvent).not.toHaveBeenCalled();
    fireEvent.click(within(eventsSection()).getByRole('button', { name: 'yesLabel' }));

    await waitFor(() => expect(within(eventsSection()).queryByText('Standup')).toBeNull());
    expect(deleteEvent).toHaveBeenCalledWith(1);
    expect(updateTask).toHaveBeenCalledWith(5, { calendarEventId: null });
    expect(deleteTask).not.toHaveBeenCalled();
  });

  it('turns an unscheduled task into an event linked to it', async () => {
    db.tasks = [{ id: 8, title: 'Call mom', calendarEventId: null, status: 'pending' }];
    await renderLoaded();
    fireEvent.click(within(convertSection()).getByRole('button', { name: 'calendarConvertTask' }));
    await waitFor(() => expect(updateTask).toHaveBeenCalledWith(8, { calendarEventId: 700 }));
    expect(insertEvent.mock.calls[0][0]).toBe('Call mom');
    expect(insertEvent.mock.calls[0][5]).toBe(8);
  });

  it('reads an event aloud with its time and place', async () => {
    db.events = [makeEvent(1, 'Dentist', '2026-03-10T09:00', { location: 'Clinic' })];
    await renderLoaded();
    fireEvent.click(within(eventsSection()).getByRole('button', { name: 'calendarReadEvent' }));
    expect(speak).toHaveBeenCalledWith(expect.stringMatching(/^Dentist\. 9:00.*\. calendarAtLocation {"location":"Clinic"}$/));
  });

  it('steps a day, a week, or a month depending on the view', async () => {
    await renderLoaded();
    fireEvent.change(dateInput(), { target: { value: '2026-01-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'calendarNext' }));
    expect(dateInput().value).toBe('2026-02-07');

    fireEvent.click(screen.getByRole('button', { name: 'calendarDayView' }));
    fireEvent.click(screen.getByRole('button', { name: 'calendarPrev' }));
    expect(dateInput().value).toBe('2026-02-06');

    fireEvent.click(screen.getByRole('button', { name: 'calendarMonthView' }));
    fireEvent.click(screen.getByRole('button', { name: 'calendarNext' }));
    expect(dateInput().value).toBe('2026-03-01');
  });

  it('shows the selected day in day view', async () => {
    db.events = [makeEvent(1, 'Yoga', '2026-03-10T07:30'), makeEvent(2, 'Other day', '2026-03-11T07:30')];
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'calendarDayView' }));
    fireEvent.change(dateInput(), { target: { value: '2026-03-10' } });
    const dayCard = screen.getAllByText('Yoga')[0].closest('ul')?.parentElement as HTMLElement;
    expect(within(dayCard).queryByText('Other day')).toBeNull();

    fireEvent.change(dateInput(), { target: { value: '2026-03-12' } });
    expect(screen.getByText('calendarEmptyDay')).toBeTruthy();
  });

  it('opens a day from the month grid with the keyboard', async () => {
    db.events = [makeEvent(1, 'Yoga', '2026-03-10T07:30')];
    await renderLoaded();
    fireEvent.change(dateInput(), { target: { value: '2026-03-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'calendarMonthView' }));
    const cells = screen.getAllByRole('button', { name: /, \d+ events$/ });
    // March 2026 starts on a Sunday, so the Monday-first grid has 6 leading days.
    expect(cells).toHaveLength(42);
    const tenth = cells[6 + 9];
    expect(tenth.getAttribute('aria-label')).toMatch(/, 1 events$/);
    fireEvent.keyDown(tenth, { key: 'Enter' });
    expect(dateInput().value).toBe('2026-03-10');
    expect(screen.getByRole('button', { name: 'calendarDayView' }).getAttribute('aria-pressed')).toBe('true');
  });
});
