import { parsePlannedDate } from './taskForm';
import type { EnergyLevel } from './energyTone';

export type ViewFilter = 'today' | 'week' | 'backlog' | 'upcoming';
export type EnergyFilter = EnergyLevel | 'all';

type SchedulableTask = { plannedDate: string | null; energyRequired?: string | null };

const pad = (value: number) => String(value).padStart(2, '0');

/** `YYYY-MM-DD` for the local calendar day `days` after `dateKey` (the key itself if it is invalid). */
export const addDaysToKey = (dateKey: string, days: number): string => {
  const date = parsePlannedDate(dateKey);
  if (!date) return dateKey;
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

type WeekWindow = { start: Date; end: Date };

/** Today 00:00 through the end of the sixth day after it (a rolling 7-day week). */
const weekWindow = (todayKey: string): WeekWindow | null => {
  const start = parsePlannedDate(todayKey);
  if (!start) return null;
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const matchesView = (task: SchedulableTask, view: ViewFilter, todayKey: string, week: WeekWindow): boolean => {
  const planned = parsePlannedDate(task.plannedDate);
  switch (view) {
    case 'today':
      return Boolean(planned) && task.plannedDate === todayKey;
    case 'week':
      return Boolean(planned) && planned! >= week.start && planned! <= week.end;
    case 'upcoming':
      return true;
    default:
      // Backlog: anything without a date or outside this week.
      return !planned || planned < week.start || planned > week.end;
  }
};

export const filterTasksByView = <T extends SchedulableTask>(
  tasks: T[],
  view: ViewFilter,
  energy: EnergyFilter,
  todayKey: string
): T[] => {
  const week = weekWindow(todayKey);
  if (!week) return tasks;
  return tasks.filter(
    (task) => matchesView(task, view, todayKey, week) && (energy === 'all' || task.energyRequired === energy)
  );
};

export type UpcomingGroup = 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later' | 'unscheduled';

export const UPCOMING_GROUP_ORDER: UpcomingGroup[] = ['overdue', 'today', 'tomorrow', 'thisWeek', 'later', 'unscheduled'];

const upcomingGroupOf = (task: SchedulableTask, todayKey: string, tomorrowKey: string, week: WeekWindow): UpcomingGroup => {
  const planned = parsePlannedDate(task.plannedDate);
  if (!planned) return 'unscheduled';
  if (task.plannedDate === todayKey) return 'today';
  if (task.plannedDate === tomorrowKey) return 'tomorrow';
  if (planned < week.start) return 'overdue';
  return planned <= week.end ? 'thisWeek' : 'later';
};

/** Buckets tasks for the Upcoming view, keeping each bucket in the incoming order. */
export const groupUpcomingTasks = <T extends SchedulableTask>(
  tasks: T[],
  todayKey: string
): Record<UpcomingGroup, T[]> | null => {
  const week = weekWindow(todayKey);
  if (!week) return null;
  const tomorrowKey = addDaysToKey(todayKey, 1);
  const groups = Object.fromEntries(UPCOMING_GROUP_ORDER.map((key) => [key, [] as T[]])) as Record<UpcomingGroup, T[]>;
  tasks.forEach((task) => groups[upcomingGroupOf(task, todayKey, tomorrowKey, week)].push(task));
  return groups;
};

/** "25m", "1h", "1h 5m". */
export const formatFocusTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
};

type TimeLogLike = { type: string; actualSeconds: number; completed: boolean };

/** Total focused seconds and completed focus sessions for a task's time log. */
export const focusStats = (timeLog: TimeLogLike[] | null | undefined) => {
  const focus = (timeLog ?? []).filter((entry) => entry.type === 'focus');
  return {
    seconds: focus.reduce((sum, entry) => sum + entry.actualSeconds, 0),
    sessions: focus.filter((entry) => entry.completed).length,
  };
};

/** i18n key for an energy level label, e.g. `tasks.energyTiny`. */
export const energyLabelKey = (level: string): string => `tasks.energy${level.charAt(0).toUpperCase()}${level.slice(1)}`;

type CompletableTask = { id: number; status: string; plannedDate?: string | null };

/**
 * How many tasks today has, when checking off `taskId` finishes all of them; 0 otherwise.
 * Un-checking a finished task never counts as a win.
 */
export const todayWinCount = (tasks: CompletableTask[], taskId: number, todayKey: string): number => {
  const todayTasks = tasks.filter((task) => task.plannedDate === todayKey);
  const target = todayTasks.find((task) => task.id === taskId);
  if (!target || target.status === 'completed') return 0;
  const othersDone = todayTasks.every((task) => task.id === taskId || task.status === 'completed');
  return othersDone ? todayTasks.length : 0;
};
