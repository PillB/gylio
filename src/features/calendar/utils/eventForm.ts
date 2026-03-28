export type EventFormFields = {
  title: string;
  startDate: string;
  endDate: string;
  reminderMinutesBefore: string;
};

export type EventFormValidation = {
  title: string;
  startDate: string;
  endDate: string;
  reminderMinutesBefore: string;
};

export const emptyEventFormValidation = (): EventFormValidation => ({
  title: '',
  startDate: '',
  endDate: '',
  reminderMinutesBefore: ''
});

export const parseDateTime = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const isNonNegativeInteger = (value: string): boolean => /^\d+$/.test(value.trim());

export const validateEventFormFields = (
  fields: EventFormFields,
  t: (key: string) => string
): EventFormValidation => {
  const validation = emptyEventFormValidation();

  if (!fields.title.trim()) {
    validation.title = t('validation.titleRequired');
  }

  const start = parseDateTime(fields.startDate);
  if (!start) {
    validation.startDate = t('validation.invalidDateTime');
  }

  if (fields.endDate) {
    const end = parseDateTime(fields.endDate);

    if (!end) {
      validation.endDate = t('validation.invalidDateTime');
    } else if (start && end <= start) {
      validation.endDate = t('validation.endAfterStart');
    }
  }

  if (fields.reminderMinutesBefore !== '') {
    if (!isNonNegativeInteger(fields.reminderMinutesBefore)) {
      validation.reminderMinutesBefore = t('validation.nonNegativeInteger');
    }
  }

  return validation;
};
