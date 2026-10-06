import { describe, expect, it } from 'vitest';
import { groupByDay, monthGrid, parseDateKey, sortByStart, stepDate, toDateKey, weekStartOf } from './calendarDates';

describe('parseDateKey', () => {
  it('reads the key as a local day', () => {
    const date = parseDateKey('2026-03-10');
    expect(date && [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 2, 10, 0]);
  });

  it('rejects text that is not a date', () => {
    expect(parseDateKey('soon')).toBeNull();
  });
});

describe('weekStartOf', () => {
  it('returns the Monday of the week, local time', () => {
    expect(toDateKey(weekStartOf('2026-03-12'))).toBe('2026-03-09'); // Thursday
    expect(toDateKey(weekStartOf('2026-03-09'))).toBe('2026-03-09'); // Monday itself
    expect(toDateKey(weekStartOf('2026-03-15'))).toBe('2026-03-09'); // Sunday belongs to the week before
  });
});

describe('monthGrid', () => {
  it('pads to whole Monday-first weeks', () => {
    const cells = monthGrid('2026-03-18'); // March 2026 starts on Sunday, ends on Tuesday
    expect(cells).toHaveLength(42);
    expect(toDateKey(cells[0])).toBe('2026-02-23');
    expect(toDateKey(cells[6])).toBe('2026-03-01');
    expect(toDateKey(cells[41])).toBe('2026-04-05');
  });

  it('needs only four rows for a February that starts on Monday', () => {
    expect(monthGrid('2027-02-10')).toHaveLength(28);
  });
});

describe('stepDate', () => {
  it('moves by a day, a week, or to the 1st of the next month', () => {
    expect(stepDate('2026-01-31', 'day', 1)).toBe('2026-02-01');
    expect(stepDate('2026-01-31', 'week', -1)).toBe('2026-01-24');
    expect(stepDate('2026-01-31', 'month', 1)).toBe('2026-02-01');
    expect(stepDate('2026-01-15', 'month', -1)).toBe('2025-12-01');
  });
});

describe('sortByStart and groupByDay', () => {
  const events = [
    { id: 1, startDate: '2026-03-10T15:00' },
    { id: 2, startDate: 'not a date' },
    { id: 3, startDate: '2026-03-10T09:00' },
    { id: 4, startDate: '2026-03-11T09:00' },
  ];

  it('sorts by start and keeps undated events last', () => {
    expect(sortByStart(events).map((event) => event.id)).toEqual([3, 1, 4, 2]);
  });

  it('groups by local day and tints by list position', () => {
    const groups = groupByDay(sortByStart(events), ['a', 'b']);
    expect(groups.get('2026-03-10')).toEqual([
      { event: events[2], color: 'a' },
      { event: events[0], color: 'b' },
    ]);
    expect(groups.get('2026-03-11')?.map((entry) => entry.color)).toEqual(['a']);
    expect(groups.size).toBe(2);
  });
});

import { defaultCalendarView } from './calendarDates';

describe('defaultCalendarView', () => {
  it('opens on the day view on phones, where a 7-day week is cut off', () => {
    expect(defaultCalendarView(320)).toBe('day');
    expect(defaultCalendarView(639)).toBe('day');
  });
  it('opens on the week view from tablet width up', () => {
    expect(defaultCalendarView(640)).toBe('week');
    expect(defaultCalendarView(1280)).toBe('week');
  });
});
