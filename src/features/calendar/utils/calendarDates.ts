import { parseDateTime } from './eventForm';

export type CalendarViewMode = 'day' | 'week' | 'month';

/** Local calendar day as `YYYY-MM-DD`. */
export const toDateKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Parses `YYYY-MM-DD` as local midnight (`new Date('YYYY-MM-DD')` would be UTC midnight). */
export const parseDateKey = (key: string): Date | null => {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** The local day an event starts on, or null when its start is missing or invalid. */
export const eventDateKey = (value: string | null | undefined): string | null => {
  const parsed = parseDateTime(value);
  return parsed ? toDateKey(parsed) : null;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

/** Days before `date` back to the Monday of its week (0 on Mondays). */
const daysSinceMonday = (date: Date) => (date.getDay() + 6) % 7;

/** Monday 00:00 of the week holding `selectedDate`. */
export const weekStartOf = (selectedDate: string): Date => {
  const base = parseDateKey(selectedDate) ?? new Date();
  const start = addDays(base, -daysSinceMonday(base));
  start.setHours(0, 0, 0, 0);
  return start;
};

/** Every cell of a Monday-first month grid, padded to whole weeks. */
export const monthGrid = (selectedDate: string): Date[] => {
  const [year, month] = selectedDate.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  if (Number.isNaN(firstDay.getTime())) return [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const leading = daysSinceMonday(firstDay);
  const start = addDays(firstDay, -leading);
  const cells = Math.ceil((leading + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => addDays(start, index));
};

/** Moves the selected date one day, week or month, depending on the view. */
export const stepDate = (selectedDate: string, viewMode: CalendarViewMode, direction: 1 | -1): string => {
  const base = parseDateKey(selectedDate);
  if (!base) return selectedDate;
  if (viewMode === 'day') return toDateKey(addDays(base, direction));
  if (viewMode === 'week') return toDateKey(addDays(base, direction * 7));
  // Anchor to the 1st so Jan 31 + 1 month is Feb 1, not Mar 3.
  return toDateKey(new Date(base.getFullYear(), base.getMonth() + direction, 1));
};

type Dated = { startDate: string };

/** Earliest first; events without a valid start go last. */
export const sortByStart = <T extends Dated>(events: T[]): T[] => {
  const time = (event: T) => parseDateTime(event.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
  return [...events].sort((a, b) => {
    const diff = time(a) - time(b);
    return Number.isNaN(diff) ? 0 : diff;
  });
};

export type TintedEvent<T> = { event: T; color: string };

/** Sorted events per local day, each keeping the tint of its position in the full list. */
export const groupByDay = <T extends Dated>(sortedEvents: T[], palette: string[]): Map<string, TintedEvent<T>[]> => {
  const byDay = new Map<string, TintedEvent<T>[]>();
  sortedEvents.forEach((event, index) => {
    const key = eventDateKey(event.startDate);
    if (!key) return;
    const entries = byDay.get(key) ?? [];
    entries.push({ event, color: palette[index % palette.length] });
    byDay.set(key, entries);
  });
  return byDay;
};

/** A seven-column week needs about 480px; phones open on the day view so no day is cut off. */
export const WEEK_VIEW_MIN_WIDTH = 640;

export function defaultCalendarView(viewportWidth: number, phoneDefault: 'day' | 'week' = 'day'): CalendarViewMode {
  return viewportWidth < WEEK_VIEW_MIN_WIDTH ? phoneDefault : 'week';
}
