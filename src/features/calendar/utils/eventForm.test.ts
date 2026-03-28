import { describe, expect, it } from 'vitest';

import {
  emptyEventFormValidation,
  parseDateTime,
  validateEventFormFields
} from './eventForm';

const t = (key: string): string => key;

describe('parseDateTime', () => {
  it('returns null for empty values', () => {
    expect(parseDateTime('')).toBeNull();
    expect(parseDateTime(null)).toBeNull();
    expect(parseDateTime(undefined)).toBeNull();
  });

  it('returns null for invalid values', () => {
    expect(parseDateTime('not-a-date')).toBeNull();
  });

  it('parses valid datetime values', () => {
    const parsed = parseDateTime('2026-03-28T09:00');
    expect(parsed).not.toBeNull();
    expect(parsed?.toISOString()).toContain('2026-03-28T09:00');
  });
});

describe('validateEventFormFields', () => {
  const validFields = {
    title: 'Therapy check-in',
    startDate: '2026-03-28T09:00',
    endDate: '2026-03-28T09:30',
    reminderMinutesBefore: '15'
  };

  it('returns no errors for valid values', () => {
    expect(validateEventFormFields(validFields, t)).toEqual(emptyEventFormValidation());
  });

  it('requires a title', () => {
    const validation = validateEventFormFields({ ...validFields, title: '   ' }, t);
    expect(validation.title).toBe('validation.titleRequired');
  });

  it('requires a valid start datetime', () => {
    const validation = validateEventFormFields({ ...validFields, startDate: 'invalid' }, t);
    expect(validation.startDate).toBe('validation.invalidDateTime');
  });

  it('requires end datetime to be after start datetime', () => {
    const validation = validateEventFormFields({ ...validFields, endDate: '2026-03-28T08:59' }, t);
    expect(validation.endDate).toBe('validation.endAfterStart');
  });

  it('allows blank end datetime', () => {
    const validation = validateEventFormFields({ ...validFields, endDate: '' }, t);
    expect(validation.endDate).toBe('');
  });

  it('requires reminder to be a non-negative integer', () => {
    const decimalValidation = validateEventFormFields(
      { ...validFields, reminderMinutesBefore: '2.5' },
      t
    );
    expect(decimalValidation.reminderMinutesBefore).toBe('validation.nonNegativeInteger');

    const negativeValidation = validateEventFormFields(
      { ...validFields, reminderMinutesBefore: '-1' },
      t
    );
    expect(negativeValidation.reminderMinutesBefore).toBe('validation.nonNegativeInteger');
  });
});
