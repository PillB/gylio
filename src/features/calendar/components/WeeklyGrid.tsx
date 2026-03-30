import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Event } from '../../../core/hooks/useDB';
import type { ThemeTokens } from '../../../core/themes';

type Props = {
  events: Event[];
  weekStartDate: Date;
  theme: ThemeTokens;
  onEventClick: (event: Event) => void;
  reduceMotion?: boolean;
};

const HOUR_START = 6;
const HOUR_END = 22;
const HOUR_HEIGHT = 56; // px per hour
const TIME_COL_W = 44; // px

const EVENT_COLORS = [
  '#5B5CF6',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#22C55E',
  '#3B82F6',
  '#EF4444',
];

export const WeeklyGrid: React.FC<Props> = ({
  events,
  weekStartDate,
  theme,
  onEventClick,
}) => {
  const { t, i18n } = useTranslation();

  const totalHours = HOUR_END - HOUR_START;
  const gridH = totalHours * HOUR_HEIGHT;

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStartDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStartDate]);

  const dayFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric' }),
    [i18n.language]
  );

  const hourFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { hour: 'numeric', hour12: true }),
    [i18n.language]
  );

  const nowMinutes = useMemo(() => {
    const now = new Date();
    return (now.getHours() + now.getMinutes() / 60 - HOUR_START) * HOUR_HEIGHT;
  }, []);

  // Build events per day
  const eventsByDay = useMemo(() => {
    const map: Event[][] = days.map(() => []);
    events.forEach((ev) => {
      const evDate = new Date(ev.startDate);
      days.forEach((day, i) => {
        if (
          evDate.getFullYear() === day.getFullYear() &&
          evDate.getMonth() === day.getMonth() &&
          evDate.getDate() === day.getDate()
        ) {
          map[i].push(ev);
        }
      });
    });
    return map;
  }, [events, days]);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }, []);

  const isToday = (day: Date) =>
    `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}` === today;

  const placeEvent = (ev: Event) => {
    const start = new Date(ev.startDate);
    const end = ev.endDate
      ? new Date(ev.endDate)
      : new Date(start.getTime() + 60 * 60 * 1000);
    const startH = start.getHours() + start.getMinutes() / 60;
    const endH = end.getHours() + end.getMinutes() / 60;
    const clampedStart = Math.max(startH, HOUR_START);
    const clampedEnd = Math.min(endH, HOUR_END);
    const top = (clampedStart - HOUR_START) * HOUR_HEIGHT;
    const height = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT, 20);
    return { top, height };
  };

  return (
    <div
      role="region"
      aria-label={t('calendarWeeklyGridAria', 'Weekly calendar')}
      style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh' }}
    >
      <div style={{ minWidth: 480, position: 'relative' }}>
        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `${TIME_COL_W}px repeat(7, 1fr)`,
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: theme.colors.surface,
            borderBottom: `1.5px solid ${theme.colors.border}`,
          }}
        >
          <div style={{ height: 36 }} />
          {days.map((day, i) => (
            <div
              key={i}
              style={{
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: isToday(day) ? 700 : 400,
                color: isToday(day) ? theme.colors.primary : theme.colors.text,
                borderLeft: `1px solid ${theme.colors.border}`,
              }}
            >
              {dayFormatter.format(day)}
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: `${TIME_COL_W}px repeat(7, 1fr)`,
            height: gridH,
          }}
        >
          {/* Time labels column */}
          <div style={{ position: 'relative' }}>
            {Array.from({ length: totalHours }, (_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: i * HOUR_HEIGHT - 7,
                  left: 0,
                  width: TIME_COL_W,
                  fontSize: '0.65rem',
                  color: theme.colors.muted,
                  textAlign: 'right',
                  paddingRight: 6,
                  lineHeight: '1',
                }}
              >
                {hourFormatter.format(new Date(2000, 0, 1, HOUR_START + i))}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => (
            <div
              key={dayIdx}
              style={{
                position: 'relative',
                borderLeft: `1px solid ${theme.colors.border}`,
                backgroundColor: isToday(day) ? `${theme.colors.primary}08` : 'transparent',
              }}
            >
              {/* Hour lines */}
              {Array.from({ length: totalHours }, (_, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: i * HOUR_HEIGHT,
                    left: 0,
                    right: 0,
                    height: 1,
                    backgroundColor: theme.colors.border,
                    opacity: 0.5,
                  }}
                />
              ))}

              {/* Current time indicator */}
              {isToday(day) && nowMinutes >= 0 && nowMinutes <= gridH && (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: nowMinutes,
                    left: 0,
                    right: 0,
                    height: 2,
                    backgroundColor: '#EF4444',
                    zIndex: 5,
                  }}
                />
              )}

              {/* Events */}
              {eventsByDay[dayIdx].map((ev, evIdx) => {
                const { top, height } = placeEvent(ev);
                const color = EVENT_COLORS[evIdx % EVENT_COLORS.length];
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onEventClick(ev)}
                    style={{
                      position: 'absolute',
                      top,
                      left: 2,
                      right: 2,
                      height,
                      backgroundColor: `${color}22`,
                      border: `1.5px solid ${color}`,
                      borderRadius: 4,
                      padding: '1px 4px',
                      fontSize: '0.7rem',
                      color: theme.colors.text,
                      textAlign: 'left',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      zIndex: 2,
                      fontFamily: theme.typography.body.family,
                    }}
                    aria-label={ev.title}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ev.title}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeeklyGrid;
