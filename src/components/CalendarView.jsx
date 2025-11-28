import React from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from './SectionCard.jsx';

/**
 * CalendarView component
 *
 * This stub illustrates where the calendar UI will live. When implemented,
 * events will appear as coloured blocks aligned to dates and times. The
 * user will be able to tap on an event to see details, play a text‑to‑speech
 * reminder or link the event to a task. Colour palettes should be soft
 * and customisable. For now, we show a simple message.
 */
const CalendarView = () => {
  const { t } = useTranslation();

  return (
    <SectionCard
      ariaLabel={`${t('calendar')} module`}
      title={t('calendar')}
      subtitle={t('calendarPlaceholder') || ''}
    />
  );
};

export default CalendarView;
