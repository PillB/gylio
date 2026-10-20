import { useMemo } from 'react';
import { parseDateTime } from '../utils/eventForm';

/** Locale-aware labels for calendar days and event times. */
export const useCalendarFormat = (language: string, unknownTime: string) =>
  useMemo(() => {
    const dayFormat = new Intl.DateTimeFormat(language, { weekday: 'short', month: 'short', day: 'numeric' });
    const timeFormat = new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit' });
    const weekdayFormat = new Intl.DateTimeFormat(language, { weekday: 'short' });

    /** "9:00 AM–10:00 AM", or the start alone; with `withDay`, prefixed by "Tue, Mar 10 · ". */
    const timeRange = (startValue: string | null, endValue: string | null, withDay = false) => {
      const start = parseDateTime(startValue);
      if (!start) return unknownTime;
      const end = parseDateTime(endValue);
      const range = `${timeFormat.format(start)}${end ? `–${timeFormat.format(end)}` : ''}`;
      return withDay ? `${dayFormat.format(start)} · ${range}` : range;
    };

    return { day: (date: Date) => dayFormat.format(date), weekday: (date: Date) => weekdayFormat.format(date), timeRange };
  }, [language, unknownTime]);

export type CalendarFormat = ReturnType<typeof useCalendarFormat>;
