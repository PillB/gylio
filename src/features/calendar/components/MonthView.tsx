import React from 'react';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Event } from '../../../core/hooks/useDB';
import type { CalendarFormat } from '../hooks/useCalendarFormat';
import { monthGrid, toDateKey, type TintedEvent } from '../utils/calendarDates';

const MAX_DOTS = 4;
/** Jan 6–12 2025 run Monday to Sunday; used only to print localized weekday names. */
const SAMPLE_WEEK = [6, 7, 8, 9, 10, 11, 12].map((day) => new Date(2025, 0, day));

type DayCellProps = {
  date: Date;
  events: TintedEvent<Event>[];
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  format: CalendarFormat;
  onOpen: () => void;
};

const cellBackground = (theme: ReturnType<typeof useTheme>['theme'], isSelected: boolean, inMonth: boolean) => {
  if (isSelected) return `${theme.colors.primary}15`;
  return inMonth ? theme.colors.surface : theme.colors.background;
};

const DensityDots: React.FC<{ events: TintedEvent<Event>[] }> = ({ events }) => {
  const { theme } = useTheme();
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      {events.slice(0, MAX_DOTS).map(({ event, color }) => (
        <span
          key={event.id}
          title={event.title}
          style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color, display: 'inline-block' }}
        />
      ))}
      {events.length > MAX_DOTS && (
        <span style={{ fontSize: '0.6rem', color: theme.colors.muted, lineHeight: 1 }}>+{events.length - MAX_DOTS}</span>
      )}
    </div>
  );
};

const DayCell: React.FC<DayCellProps> = ({ date, events, inMonth, isToday, isSelected, format, onOpen }) => {
  const { theme } = useTheme();
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${format.day(date)}, ${events.length} events`}
      aria-pressed={isSelected}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen();
      }}
      style={{
        border: `1px solid ${isToday ? theme.colors.primary : theme.colors.border}`,
        borderRadius: theme.shape.radiusSm,
        padding: '6px 4px',
        backgroundColor: cellBackground(theme, isSelected, inMonth),
        minHeight: '64px',
        cursor: 'pointer',
        opacity: inMonth ? 1 : 0.4,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <span
        style={{
          fontSize: '0.8125rem',
          fontWeight: isToday ? 700 : 400,
          color: isToday ? theme.colors.primary : theme.colors.text,
          lineHeight: 1,
        }}
      >
        {date.getDate()}
      </span>
      <DensityDots events={events} />
      {events.length > 0 && (
        <span
          title={events.map(({ event }) => event.title).join('\n')}
          style={{
            fontSize: '0.65rem',
            color: theme.colors.muted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            display: 'block',
          }}
        >
          {events[0].event.title}
        </span>
      )}
    </div>
  );
};

type Props = {
  selectedDate: string;
  eventsByDay: Map<string, TintedEvent<Event>[]>;
  format: CalendarFormat;
  onOpenDay: (dateKey: string) => void;
};

/** Month density grid; picking a day opens it in day view. */
const MonthView: React.FC<Props> = ({ selectedDate, eventsByDay, format, onOpenDay }) => {
  const { theme } = useTheme();
  const month = Number(selectedDate.split('-')[1]) - 1;
  const todayKey = toDateKey(new Date());
  return (
    <div style={{ marginBottom: `${theme.spacing.lg}px`, minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2, marginBottom: 2 }}>
        {SAMPLE_WEEK.map((date) => (
          <div
            key={date.getDate()}
            style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: theme.colors.muted, padding: '4px 0' }}
          >
            {format.weekday(date)}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2 }}>
        {monthGrid(selectedDate).map((date) => {
          const key = toDateKey(date);
          return (
            <DayCell
              key={key}
              date={date}
              events={eventsByDay.get(key) ?? []}
              inMonth={date.getMonth() === month}
              isToday={key === todayKey}
              isSelected={key === selectedDate}
              format={format}
              onOpen={() => onOpenDay(key)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
