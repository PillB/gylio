import type { ScheduleSuggestion, SchedulableTask } from './scheduleSuggestions';

type EventConversionInput = {
  title: string;
  startDate: string;
  endDate: string;
  taskId: number;
};

export const formatDateTimeInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const clampDuration = (minutes: number): number => {
  const parsed = Number(minutes);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30;
  }
  return Math.round(parsed);
};

export const buildQuickTaskEventInput = (
  task: Pick<SchedulableTask, 'id' | 'title' | 'focusPresetMinutes'>,
  now: Date = new Date()
): EventConversionInput => {
  const start = new Date(now);
  const durationMinutes = clampDuration(task.focusPresetMinutes ?? 30);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  return {
    title: task.title,
    startDate: formatDateTimeInputValue(start),
    endDate: formatDateTimeInputValue(end),
    taskId: task.id,
  };
};

export const buildSuggestedEventInput = (
  suggestion: ScheduleSuggestion
): EventConversionInput => {
  const start = new Date(suggestion.startDate);
  const end = new Date(suggestion.endDate);

  return {
    title: suggestion.title,
    startDate: Number.isNaN(start.getTime()) ? '' : formatDateTimeInputValue(start),
    endDate: Number.isNaN(end.getTime()) ? '' : formatDateTimeInputValue(end),
    taskId: suggestion.taskId,
  };
};
