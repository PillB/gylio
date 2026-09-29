import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Event } from '../../../core/hooks/useDB';
import type { CalendarFormat } from '../hooks/useCalendarFormat';
import type { TintedEvent } from '../utils/calendarDates';

type Props = {
  date: Date;
  events: TintedEvent<Event>[];
  format: CalendarFormat;
  onEventClick: (event: Event) => void;
};

/** One day's events as tinted cards; clicking one opens it for editing. */
const DayView: React.FC<Props> = ({ date, events, format, onEventClick }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: `${theme.spacing.sm}px`, marginBottom: `${theme.spacing.lg}px` }}>
      <div
        style={{
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.shape.radiusSm,
          padding: `${theme.spacing.md}px`,
          backgroundColor: theme.colors.surface,
          minHeight: '200px',
        }}
      >
        <div style={{ fontWeight: theme.typography.heading.weight, fontSize: '1.125rem', marginBottom: `${theme.spacing.sm}px` }}>
          {format.day(date)}
        </div>
        {events.length ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: `${theme.spacing.xs}px` }}>
            {events.map(({ event, color }) => (
              <li
                key={event.id}
                style={{
                  padding: `${theme.spacing.sm}px`,
                  borderRadius: theme.shape.radiusSm,
                  backgroundColor: color,
                  color: theme.colors.text,
                  cursor: 'pointer',
                  minWidth: 0,
                  overflow: 'hidden',
                }}
                onClick={() => onEventClick(event)}
              >
                <div style={{ fontWeight: theme.typography.heading.weight, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{event.title}</div>
                <div style={{ fontSize: '0.85rem', color: theme.colors.muted }}>{format.timeRange(event.startDate, event.endDate)}</div>
                {event.description && (
                  <div style={{ fontSize: '0.8rem', color: theme.colors.muted, wordBreak: 'break-word' }}>{event.description}</div>
                )}
                {event.location && <div style={{ fontSize: '0.8rem', color: theme.colors.muted }}>{event.location}</div>}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: theme.colors.muted, margin: 0 }}>{t('calendarEmptyDay')}</p>
        )}
      </div>
    </div>
  );
};

export default DayView;
