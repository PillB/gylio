import { describe, expect, it } from 'vitest';
import {
  buildScheduleSuggestions,
  type CalendarEventLike,
  type SchedulableTask,
} from './scheduleSuggestions';

const makeTask = (overrides: Partial<SchedulableTask> = {}): SchedulableTask => ({
  id: 1,
  title: 'Deep work block',
  plannedDate: null,
  focusPresetMinutes: null,
  calendarEventId: null,
  ...overrides,
});

const makeEvent = (overrides: Partial<CalendarEventLike> = {}): CalendarEventLike => ({
  id: 1,
  startDate: '2026-03-28T09:00:00.000Z',
  endDate: '2026-03-28T10:00:00.000Z',
  ...overrides,
});

describe('buildScheduleSuggestions', () => {
  it('places unscheduled tasks into free windows in order', () => {
    const tasks = [
      makeTask({ id: 11, title: 'Inbox cleanup', focusPresetMinutes: 25 }),
      makeTask({ id: 12, title: 'Budget review', focusPresetMinutes: 45 }),
    ];

    const events = [
      makeEvent({ startDate: '2026-03-28T09:00:00.000Z', endDate: '2026-03-28T10:00:00.000Z' }),
      makeEvent({ id: 2, startDate: '2026-03-28T12:00:00.000Z', endDate: '2026-03-28T13:00:00.000Z' }),
    ];

    const suggestions = buildScheduleSuggestions({
      tasks,
      events,
      selectedDate: '2026-03-28',
      timezoneOffsetMinutes: 0,
      dayStartHour: 8,
      dayEndHour: 18,
    });

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toMatchObject({ taskId: 11, durationMinutes: 25 });
    expect(suggestions[0].startDate).toBe('2026-03-28T08:00:00.000Z');
    expect(suggestions[1]).toMatchObject({ taskId: 12, durationMinutes: 45 });
    expect(suggestions[1].startDate).toBe('2026-03-28T10:00:00.000Z');
  });

  it('prioritizes tasks explicitly planned for selected day', () => {
    const suggestions = buildScheduleSuggestions({
      tasks: [
        makeTask({ id: 21, title: 'Anytime task', plannedDate: null, focusPresetMinutes: 25 }),
        makeTask({ id: 22, title: 'Today priority', plannedDate: '2026-03-28', focusPresetMinutes: 10 }),
      ],
      events: [],
      selectedDate: '2026-03-28',
      timezoneOffsetMinutes: 0,
      dayStartHour: 8,
      dayEndHour: 9,
    });

    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    expect(suggestions[0].taskId).toBe(22);
  });

  it('skips tasks already linked to calendar events and tasks that do not fit', () => {
    const suggestions = buildScheduleSuggestions({
      tasks: [
        makeTask({ id: 31, calendarEventId: 99, focusPresetMinutes: 25 }),
        makeTask({ id: 32, title: 'Long task', focusPresetMinutes: 120 }),
      ],
      events: [makeEvent({ startDate: '2026-03-28T08:00:00.000Z', endDate: '2026-03-28T09:30:00.000Z' })],
      selectedDate: '2026-03-28',
      timezoneOffsetMinutes: 0,
      dayStartHour: 8,
      dayEndHour: 10,
      maxSuggestions: 3,
    });

    expect(suggestions).toEqual([]);
  });
});
