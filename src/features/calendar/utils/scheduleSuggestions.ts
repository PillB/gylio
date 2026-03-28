export type SchedulableTask = {
  id: number;
  title: string;
  plannedDate: string | null;
  focusPresetMinutes: number | null;
  calendarEventId: number | null;
};

export type CalendarEventLike = {
  id: number;
  startDate: string;
  endDate: string | null;
};

export type ScheduleSuggestion = {
  taskId: number;
  title: string;
  startDate: string;
  endDate: string;
  durationMinutes: number;
};

type BuildScheduleSuggestionsInput = {
  tasks: SchedulableTask[];
  events: CalendarEventLike[];
  selectedDate: string;
  timezoneOffsetMinutes?: number;
  dayStartHour?: number;
  dayEndHour?: number;
  defaultDurationMinutes?: number;
  maxSuggestions?: number;
};

type Interval = {
  startMs: number;
  endMs: number;
};

const MIN_DURATION = 5;

const parseDateAtHour = (dateKey: string, hour: number, timezoneOffsetMinutes: number): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const iso = `${dateKey}T00:00:00.000Z`;
  const base = new Date(iso);
  if (Number.isNaN(base.getTime())) return null;
  const utcMidnight = base.getTime();
  return utcMidnight + (hour * 60 + timezoneOffsetMinutes) * 60_000;
};

const normalizeDuration = (value: number | null | undefined, fallback: number): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(MIN_DURATION, Math.round(numeric));
};

const toInterval = (event: CalendarEventLike): Interval | null => {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate ?? event.startDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const startMs = start.getTime();
  const endMs = Math.max(startMs + MIN_DURATION * 60_000, end.getTime());
  return { startMs, endMs };
};

const getFreeWindows = (busyIntervals: Interval[], dayStartMs: number, dayEndMs: number): Interval[] => {
  const clipped = busyIntervals
    .map((interval) => ({
      startMs: Math.max(interval.startMs, dayStartMs),
      endMs: Math.min(interval.endMs, dayEndMs),
    }))
    .filter((interval) => interval.endMs > interval.startMs)
    .sort((a, b) => a.startMs - b.startMs);

  const merged: Interval[] = [];
  clipped.forEach((interval) => {
    const previous = merged[merged.length - 1];
    if (!previous || interval.startMs > previous.endMs) {
      merged.push({ ...interval });
      return;
    }
    previous.endMs = Math.max(previous.endMs, interval.endMs);
  });

  const free: Interval[] = [];
  let cursor = dayStartMs;

  merged.forEach((interval) => {
    if (interval.startMs > cursor) {
      free.push({ startMs: cursor, endMs: interval.startMs });
    }
    cursor = Math.max(cursor, interval.endMs);
  });

  if (cursor < dayEndMs) {
    free.push({ startMs: cursor, endMs: dayEndMs });
  }

  return free;
};

export const buildScheduleSuggestions = ({
  tasks,
  events,
  selectedDate,
  timezoneOffsetMinutes = 0,
  dayStartHour = 8,
  dayEndHour = 20,
  defaultDurationMinutes = 25,
  maxSuggestions = 3,
}: BuildScheduleSuggestionsInput): ScheduleSuggestion[] => {
  const dayStartMs = parseDateAtHour(selectedDate, dayStartHour, timezoneOffsetMinutes);
  const dayEndMs = parseDateAtHour(selectedDate, dayEndHour, timezoneOffsetMinutes);

  if (dayStartMs == null || dayEndMs == null || dayEndMs <= dayStartMs) {
    return [];
  }

  const busyIntervals = events
    .map(toInterval)
    .filter((interval): interval is Interval => interval !== null)
    .filter((interval) => interval.endMs > dayStartMs && interval.startMs < dayEndMs);

  const freeWindows = getFreeWindows(busyIntervals, dayStartMs, dayEndMs);
  if (freeWindows.length === 0) return [];

  const sortedTasks = [...tasks]
    .filter((task) => task.calendarEventId == null)
    .sort((first, second) => {
      const firstPriority = first.plannedDate === selectedDate ? 0 : first.plannedDate ? 2 : 1;
      const secondPriority = second.plannedDate === selectedDate ? 0 : second.plannedDate ? 2 : 1;
      if (firstPriority !== secondPriority) return firstPriority - secondPriority;
      return first.id - second.id;
    });

  const suggestions: ScheduleSuggestion[] = [];

  for (const task of sortedTasks) {
    if (suggestions.length >= maxSuggestions) break;

    const durationMinutes = normalizeDuration(task.focusPresetMinutes, defaultDurationMinutes);
    const durationMs = durationMinutes * 60_000;

    const targetWindow = freeWindows.find((window) => window.endMs - window.startMs >= durationMs);
    if (!targetWindow) continue;

    const startMs = targetWindow.startMs;
    const endMs = startMs + durationMs;

    suggestions.push({
      taskId: task.id,
      title: task.title,
      startDate: new Date(startMs).toISOString(),
      endDate: new Date(endMs).toISOString(),
      durationMinutes,
    });

    targetWindow.startMs = endMs;
  }

  return suggestions;
};
