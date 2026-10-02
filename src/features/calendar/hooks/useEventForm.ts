import { useMemo, useState } from 'react';
import { emptyEventFormValidation, validateEventFormFields } from '../utils/eventForm';
import {
  EMPTY_EVENT_FIELDS,
  eventPayload,
  touchedState,
  type EventFields,
  type EventPayload,
  type ValidatedField,
} from '../utils/eventFields';

type Translate = (key: string) => string;

const VALIDATED: ValidatedField[] = ['title', 'startDate', 'endDate', 'reminderMinutesBefore'];
const isValidated = (name: keyof EventFields): name is ValidatedField => (VALIDATED as string[]).includes(name);

/** Values, per-field touch state and validation for one event form. */
export const useEventForm = (t: Translate, initial: EventFields = EMPTY_EVENT_FIELDS) => {
  const [fields, setFields] = useState(initial);
  const [touched, setTouched] = useState(touchedState(false));

  const validation = useMemo(
    () => (Object.values(touched).some(Boolean) ? validateEventFormFields(fields, t) : emptyEventFormValidation()),
    [fields, touched, t]
  );

  const setField = (name: keyof EventFields, value: string) => {
    setFields((prev) => ({ ...prev, [name]: value }));
    if (isValidated(name)) setTouched((prev) => ({ ...prev, [name]: true }));
  };

  /** Shows every error; returns what to save, or null while anything is invalid. */
  const submit = (): EventPayload | null => {
    setTouched(touchedState(true));
    const errors = validateEventFormFields(fields, t);
    return Object.values(errors).some(Boolean) ? null : eventPayload(fields);
  };

  const reset = () => {
    setFields(EMPTY_EVENT_FIELDS);
    setTouched(touchedState(false));
  };

  /** The message to show under a field, once that field was touched. */
  const errorFor = (name: ValidatedField) => (touched[name] ? validation[name] : '');

  return { fields, setField, errorFor, submit, reset };
};

export type EventForm = ReturnType<typeof useEventForm>;
