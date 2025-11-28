import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * CalendarView component
 *
 * This stub illustrates where the calendar UI will live.  When implemented,
 * events will appear as coloured blocks aligned to dates and times.  The
 * user will be able to tap on an event to see details, play a text‑to‑speech
 * reminder or link the event to a task.  Colour palettes should be soft
 * and customisable.  For now, we show a simple message.
 */
const CalendarView = () => {
  const { t } = useTranslation();

  return (
    <section aria-label={t('calendar') + ' module'}>
      <h2>{t('calendar')}</h2>
      <p>{t('calendarPlaceholder') || 'The calendar will display colour‑coded events with TTS reminders.'}</p>
    </section>
  );
};

export default CalendarView;