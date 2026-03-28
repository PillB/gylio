import { describe, expect, it } from 'vitest';
import type { SocialStep } from '../../../core/hooks/useDB';
import {
  buildSocialPlanValidation,
  createEmptySocialSteps,
  formatSocialPlanDateTime,
  hasSocialPlanErrors,
  normalizeSocialPlanSteps,
  parseSocialPlanDateTime,
  type SocialPlanFormState
} from './socialPlanForm';

const baseForm = (overrides: Partial<SocialPlanFormState> = {}): SocialPlanFormState => ({
  title: 'Check in with friend',
  type: 'CALL',
  energyLevel: 'LOW',
  dateTime: '',
  reminderMinutesBefore: '',
  notes: '',
  steps: [],
  templateId: '',
  ...overrides
});

const t = (key: string) => key;

describe('socialPlanForm utils', () => {
  it('creates a deterministic number of empty steps', () => {
    expect(createEmptySocialSteps()).toEqual([
      { label: '', done: false },
      { label: '', done: false },
      { label: '', done: false }
    ]);
    expect(createEmptySocialSteps(2)).toEqual([
      { label: '', done: false },
      { label: '', done: false }
    ]);
  });

  it('parses valid datetime strings and rejects invalid values', () => {
    expect(parseSocialPlanDateTime('2026-03-28T08:00')).toBeInstanceOf(Date);
    expect(parseSocialPlanDateTime('')).toBeNull();
    expect(parseSocialPlanDateTime('not-a-date')).toBeNull();
  });

  it('formats datetime labels when date is valid', () => {
    const formatted = formatSocialPlanDateTime('2026-03-28T08:00', 'en-US');
    expect(formatted).toContain('Mar');
    expect(formatSocialPlanDateTime('bad', 'en-US')).toBeNull();
  });

  it('normalizes steps by trimming labels and removing empties', () => {
    const steps: SocialStep[] = [
      { label: '  Draft message  ', done: false },
      { label: ' ', done: false },
      { label: 'Send message', done: true }
    ];

    expect(normalizeSocialPlanSteps(steps)).toEqual([
      { label: 'Draft message', done: false },
      { label: 'Send message', done: true }
    ]);
  });

  it('validates required title, datetime, and reminder minutes', () => {
    const validation = buildSocialPlanValidation(
      baseForm({ title: ' ', dateTime: 'invalid', reminderMinutesBefore: '-2' }),
      t
    );

    expect(validation).toEqual({
      title: 'validation.titleRequired',
      dateTime: 'validation.invalidDateTime',
      reminderMinutesBefore: 'validation.nonNegativeNumber'
    });
    expect(hasSocialPlanErrors(validation)).toBe(true);
  });

  it('accepts valid forms without validation errors', () => {
    const validation = buildSocialPlanValidation(
      baseForm({ dateTime: '2026-03-29T09:00', reminderMinutesBefore: '15' }),
      t
    );

    expect(validation).toEqual({ title: '', dateTime: '', reminderMinutesBefore: '' });
    expect(hasSocialPlanErrors(validation)).toBe(false);
  });
});
