import { describe, expect, it } from 'vitest';
import {
  buildQuickTaskEventInput,
  buildSuggestedEventInput,
  formatDateTimeInputValue,
} from './eventConversions';

describe('eventConversions', () => {
  it('formats date to datetime-local value', () => {
    // Use local-time constructor so getHours/getMinutes match regardless of timezone
    const localDate = new Date(2026, 2, 28, 9, 7, 0); // 2026-03-28 09:07 local
    const result = formatDateTimeInputValue(localDate);

    expect(result).toBe('2026-03-28T09:07');
  });

  it('builds quick conversion input using task focus minutes', () => {
    const task = { id: 12, title: 'Draft budget review', focusPresetMinutes: 45 };
    const start = new Date(2026, 2, 28, 13, 0, 0); // 2026-03-28 13:00 local
    const result = buildQuickTaskEventInput(task, start);

    expect(result).toEqual({
      title: 'Draft budget review',
      startDate: '2026-03-28T13:00',
      endDate: '2026-03-28T13:45',
      taskId: 12,
    });
  });

  it('falls back to 30 minutes when focus duration is invalid', () => {
    const task = { id: 3, title: 'Inbox reset', focusPresetMinutes: Number.NaN };
    const start = new Date(2026, 2, 28, 18, 10, 0); // 2026-03-28 18:10 local
    const result = buildQuickTaskEventInput(task, start);

    expect(result.endDate).toBe('2026-03-28T18:40');
  });

  it('maps schedule suggestion dates into datetime-local values', () => {
    // Use local-time ISO strings (no Z suffix) so parsing is timezone-agnostic
    const localStart = new Date(2026, 2, 28, 10, 30, 0);
    const localEnd = new Date(2026, 2, 28, 10, 55, 0);
    const result = buildSuggestedEventInput({
      taskId: 44,
      title: 'Follow up with mentor',
      startDate: localStart.toISOString(),
      endDate: localEnd.toISOString(),
      durationMinutes: 25,
    });

    expect(result.title).toBe('Follow up with mentor');
    expect(result.taskId).toBe(44);
    expect(result.startDate).toBe('2026-03-28T10:30');
    expect(result.endDate).toBe('2026-03-28T10:55');
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
