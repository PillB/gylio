import { describe, expect, it } from 'vitest';
import { EMPTY_EVENT_FIELDS, eventPayload, fieldsFromEvent } from './eventFields';

describe('eventPayload', () => {
  it('trims text, types numbers, and turns blanks into null', () => {
    expect(
      eventPayload({
        ...EMPTY_EVENT_FIELDS,
        title: '  Walk  ',
        description: '   ',
        startDate: '2026-03-10T09:00',
        taskId: '7',
        reminderMinutesBefore: '0',
      })
    ).toEqual({
      title: 'Walk',
      description: null,
      startDate: '2026-03-10T09:00',
      endDate: null,
      location: null,
      taskId: 7,
      reminderMinutesBefore: 0,
    });
  });
});

describe('fieldsFromEvent', () => {
  it('fills the form from a saved event and blanks what is missing', () => {
    const fields = fieldsFromEvent({
      id: 1,
      title: 'Walk',
      description: null,
      startDate: '2026-03-10T09:00:00',
      endDate: null,
      location: 'Park',
      taskId: null,
      reminderMinutesBefore: 10,
      createdAt: null,
    });
    expect(fields).toEqual({
      title: 'Walk',
      description: '',
      startDate: '2026-03-10T09:00',
      endDate: '',
      location: 'Park',
      taskId: '',
      reminderMinutesBefore: '10',
    });
  });
});
