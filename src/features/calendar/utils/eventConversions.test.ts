import { describe, expect, it } from 'vitest';
import {
  buildQuickTaskEventInput,
  buildSuggestedEventInput,
  formatDateTimeInputValue,
} from './eventConversions';

describe('eventConversions', () => {
  it('formats date to datetime-local value', () => {
    const result = formatDateTimeInputValue(new Date('2026-03-28T09:07:00.000Z'));

    expect(result).toBe('2026-03-28T09:07');
  });

  it('builds quick conversion input using task focus minutes', () => {
    const task = { id: 12, title: 'Draft budget review', focusPresetMinutes: 45 };
    const result = buildQuickTaskEventInput(task, new Date('2026-03-28T13:00:00.000Z'));

    expect(result).toEqual({
      title: 'Draft budget review',
      startDate: '2026-03-28T13:00',
      endDate: '2026-03-28T13:45',
      taskId: 12,
    });
  });

  it('falls back to 30 minutes when focus duration is invalid', () => {
    const task = { id: 3, title: 'Inbox reset', focusPresetMinutes: Number.NaN };
    const result = buildQuickTaskEventInput(task, new Date('2026-03-28T18:10:00.000Z'));

    expect(result.endDate).toBe('2026-03-28T18:40');
  });

  it('maps schedule suggestion dates into datetime-local values', () => {
    const result = buildSuggestedEventInput({
      taskId: 44,
      title: 'Follow up with mentor',
      startDate: '2026-03-28T10:30:00.000Z',
      endDate: '2026-03-28T10:55:00.000Z',
      durationMinutes: 25,
    });

    expect(result).toEqual({
      title: 'Follow up with mentor',
      startDate: '2026-03-28T10:30',
      endDate: '2026-03-28T10:55',
      taskId: 44,
    });
  });

  it('returns empty values when suggestion dates are invalid', () => {
    const result = buildSuggestedEventInput({
      taskId: 2,
      title: 'Read chapter notes',
      startDate: 'invalid',
      endDate: 'also-invalid',
      durationMinutes: 15,
    });

    expect(result.startDate).toBe('');
    expect(result.endDate).toBe('');
  });
});
