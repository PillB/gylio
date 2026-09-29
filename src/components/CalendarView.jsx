import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../core/context/ThemeContext';
import SectionCard from './SectionCard.jsx';
import { WeeklyGrid } from '../features/calendar/components/WeeklyGrid';
import CalendarToolbar from '../features/calendar/components/CalendarToolbar';
import DayView from '../features/calendar/components/DayView';
import MonthView from '../features/calendar/components/MonthView';
import AddEventPanel from '../features/calendar/components/AddEventPanel';
import SuggestionList from '../features/calendar/components/SuggestionList';
import ConvertTaskList from '../features/calendar/components/ConvertTaskList';
import EventList from '../features/calendar/components/EventList';
import CalendarHelp from '../features/calendar/components/CalendarHelp';
import { useCalendarData } from '../features/calendar/hooks/useCalendarData';
import { useCalendarFormat } from '../features/calendar/hooks/useCalendarFormat';
import { buildScheduleSuggestions } from '../features/calendar/utils/scheduleSuggestions';
import { buildQuickTaskEventInput, buildSuggestedEventInput } from '../features/calendar/utils/eventConversions';
import {
  groupByDay,
  parseDateKey,
  sortByStart,
  stepDate,
  toDateKey,
  weekStartOf,
} from '../features/calendar/utils/calendarDates';

/** Focus windows offered inside 08:00–20:00, 25 minutes each, at most three. */
const SUGGESTION_OPTIONS = { dayStartHour: 8, dayEndHour: 20, defaultDurationMinutes: 25, maxSuggestions: 3 };

const CalendarView = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const data = useCalendarData();
  const format = useCalendarFormat(i18n.language, t('calendarTimeUnknown'));
  const [viewMode, setViewMode] = useState('week');
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [editingId, setEditingId] = useState(null);

  const palette = theme.dataViz.eventTints;
  const sortedEvents = useMemo(() => sortByStart(data.events), [data.events]);
  const eventsByDay = useMemo(() => groupByDay(sortedEvents, palette), [palette, sortedEvents]);
  const availableTasks = useMemo(() => data.tasks.filter((task) => !task.calendarEventId), [data.tasks]);
  const suggestions = useMemo(
    () =>
      buildScheduleSuggestions({
        tasks: data.tasks,
        events: data.events,
        selectedDate,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        ...SUGGESTION_OPTIONS,
      }),
    [data.events, data.tasks, selectedDate]
  );
  const selectedDay = parseDateKey(selectedDate);

  const openDay = (dateKey) => {
    setSelectedDate(dateKey);
    setViewMode('day');
  };

  const scheduleSuggestion = (suggestion) => {
    const input = buildSuggestedEventInput(suggestion);
    if (input.startDate && input.endDate) data.scheduleTask(input, 'schedule suggestion');
  };

  const listActions = {
    startEdit: (event) => setEditingId(event.id),
    cancelEdit: () => setEditingId(null),
    save: data.saveEvent,
    remove: async (event) => {
      const deleted = await data.removeEvent(event);
      if (deleted && editingId === event.id) setEditingId(null);
      return deleted;
    },
  };

  return (
    <SectionCard
      ariaLabel={`${t('calendar')} module`}
      title={t('calendar')}
      subtitle={t('calendarIntro')}
      badge={<CalendarHelp topic="section" />}
    >
      <CalendarToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onStep={(direction) => setSelectedDate((current) => stepDate(current, viewMode, direction))}
        onToday={() => setSelectedDate(toDateKey(new Date()))}
      />
      {viewMode === 'week' && (
        <div data-tour="calendar-grid">
          <WeeklyGrid
            events={data.events}
            weekStartDate={weekStartOf(selectedDate)}
            theme={theme}
            onEventClick={listActions.startEdit}
            reduceMotion={false}
          />
        </div>
      )}
      {viewMode === 'day' && selectedDay && (
        <DayView date={selectedDay} events={eventsByDay.get(selectedDate) ?? []} format={format} onEventClick={listActions.startEdit} />
      )}
      {viewMode === 'month' && (
        <MonthView selectedDate={selectedDate} eventsByDay={eventsByDay} format={format} onOpenDay={openDay} />
      )}
      <div style={{ display: 'grid', gap: `${theme.spacing.md}px`, gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <AddEventPanel tasks={data.tasks} onCreate={data.createEvent} />
        <SuggestionList suggestions={suggestions} format={format} onSchedule={scheduleSuggestion} />
        <ConvertTaskList
          tasks={availableTasks}
          onConvert={(task) => data.scheduleTask(buildQuickTaskEventInput(task), 'convert task')}
        />
        <EventList
          loading={data.loading}
          events={sortedEvents}
          tasks={data.tasks}
          palette={palette}
          editingId={editingId}
          format={format}
          actions={listActions}
        />
      </div>
    </SectionCard>
  );
};

export default CalendarView;
