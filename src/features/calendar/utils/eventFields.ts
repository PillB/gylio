import type { Event } from '../../../core/hooks/useDB';
import { formatDateTimeInputValue } from './eventConversions';
import { parseDateTime, type EventFormValidation } from './eventForm';

/** Raw form values for creating or editing an event; everything is text until saved. */
export type EventFields = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  taskId: string;
  reminderMinutesBefore: string;
};

/** Fields whose errors appear once the person has touched them. */
export type ValidatedField = keyof EventFormValidation;
export type TouchedFields = Record<ValidatedField, boolean>;

export const EMPTY_EVENT_FIELDS: EventFields = {
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  location: '',
  taskId: '',
  reminderMinutesBefore: '',
};

export const touchedState = (value: boolean): TouchedFields => ({
  title: value,
  startDate: value,
  endDate: value,
  reminderMinutesBefore: value,
});

const toInputValue = (value: string | null) => {
  const parsed = parseDateTime(value);
  return parsed ? formatDateTimeInputValue(parsed) : '';
};

const optionalText = (value: number | string | null | undefined) => (value == null ? '' : String(value));

export const fieldsFromEvent = (event: Event): EventFields => ({
  title: event.title ?? '',
  description: event.description ?? '',
  startDate: toInputValue(event.startDate),
  endDate: toInputValue(event.endDate),
  location: event.location ?? '',
  taskId: optionalText(event.taskId),
  reminderMinutesBefore: optionalText(event.reminderMinutesBefore),
});

export type EventPayload = Omit<Event, 'id' | 'createdAt'>;

/** Trimmed, typed values ready to save; blank optional fields become null. */
export const eventPayload = (fields: EventFields): EventPayload => ({
  title: fields.title.trim(),
  description: fields.description.trim() || null,
  startDate: fields.startDate,
  endDate: fields.endDate || null,
  location: fields.location.trim() || null,
  taskId: fields.taskId ? Number(fields.taskId) : null,
  reminderMinutesBefore: fields.reminderMinutesBefore === '' ? null : Number.parseInt(fields.reminderMinutesBefore, 10),
});
