import { describe, expect, it } from 'vitest';
import {
  addDaysToKey,
  energyLabelKey,
  filterTasksByView,
  focusStats,
  formatFocusTime,
  groupUpcomingTasks,
  todayWinCount,
} from './taskViews';

const TODAY = '2026-09-28'; // Monday
const task = (id: number, plannedDate: string | null, energyRequired = 'medium') => ({ id, plannedDate, energyRequired });

const tasks = [
  task(1, '2026-09-27'), // yesterday
  task(2, TODAY, 'tiny'),
  task(3, '2026-09-29'), // tomorrow
  task(4, '2026-10-04'), // 6 days out: last day of the rolling week
  task(5, '2026-10-05'), // 7 days out: next week
  task(6, null),
  task(7, 'not-a-date'),
];

const ids = (list: { id: number }[]) => list.map((entry) => entry.id);

describe('addDaysToKey', () => {
  it('crosses month and year boundaries in local time', () => {
    expect(addDaysToKey('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('returns an invalid key unchanged', () => {
    expect(addDaysToKey('', 1)).toBe('');
  });
});

describe('filterTasksByView', () => {
  it('Today shows only tasks dated today', () => {
    expect(ids(filterTasksByView(tasks, 'today', 'all', TODAY))).toEqual([2]);
  });

  it('Week is a rolling seven days starting today', () => {
    expect(ids(filterTasksByView(tasks, 'week', 'all', TODAY))).toEqual([2, 3, 4]);
  });

  it('Backlog holds undated, invalid, overdue and later tasks, never this week', () => {
    expect(ids(filterTasksByView(tasks, 'backlog', 'all', TODAY))).toEqual([1, 5, 6, 7]);
  });

  it('applies the energy filter on top of the view', () => {
    expect(ids(filterTasksByView(tasks, 'upcoming', 'tiny', TODAY))).toEqual([2]);
  });
});

describe('groupUpcomingTasks', () => {
  it('buckets by due day, with invalid dates treated as unscheduled', () => {
    const groups = groupUpcomingTasks(tasks, TODAY)!;
    expect(Object.fromEntries(Object.entries(groups).map(([key, list]) => [key, ids(list)]))).toEqual({
      overdue: [1],
      today: [2],
      tomorrow: [3],
      thisWeek: [4],
      later: [5],
      unscheduled: [6, 7],
    });
  });
});

describe('focus time', () => {
  it('formats minutes and hours without zero parts', () => {
    expect(formatFocusTime(59)).toBe('0m');
    expect(formatFocusTime(25 * 60)).toBe('25m');
    expect(formatFocusTime(3600)).toBe('1h');
    expect(formatFocusTime(3900)).toBe('1h 5m');
  });

  it('counts focus seconds from every segment but sessions only when completed', () => {
    const log = [
      { type: 'focus', actualSeconds: 1500, completed: true },
      { type: 'focus', actualSeconds: 300, completed: false },
      { type: 'short-break', actualSeconds: 300, completed: true },
    ];
    expect(focusStats(log)).toEqual({ seconds: 1800, sessions: 1 });
    expect(focusStats(undefined)).toEqual({ seconds: 0, sessions: 0 });
  });
});

it('builds energy label keys', () => {
  expect(energyLabelKey('tiny')).toBe('tasks.energyTiny');
});

describe('todayWinCount', () => {
  const day = (id: number, status: string, plannedDate: string | null = TODAY) => ({ id, status, plannedDate });

  it('counts today when the last open task is checked off', () => {
    expect(todayWinCount([day(1, 'completed'), day(2, 'pending')], 2, TODAY)).toBe(2);
  });

  it('is 0 while another task today is still open', () => {
    expect(todayWinCount([day(1, 'pending'), day(2, 'pending')], 2, TODAY)).toBe(0);
  });

  it('is 0 when un-checking a finished task', () => {
    expect(todayWinCount([day(1, 'completed'), day(2, 'completed')], 2, TODAY)).toBe(0);
  });

  it('is 0 when the checked task is not planned for today', () => {
    expect(todayWinCount([day(1, 'completed'), day(2, 'pending', null)], 2, TODAY)).toBe(0);
  });
});
