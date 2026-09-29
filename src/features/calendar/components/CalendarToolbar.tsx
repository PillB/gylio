import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { CalendarViewMode } from '../utils/calendarDates';
import { calendarButtonStyle, fieldControlStyle } from './calendarStyles';

const VIEW_MODES: { mode: CalendarViewMode; labelKey: string }[] = [
  { mode: 'day', labelKey: 'calendarDayView' },
  { mode: 'week', labelKey: 'calendarWeekView' },
  { mode: 'month', labelKey: 'calendarMonthView' },
];

type Props = {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  selectedDate: string;
  onDateChange: (dateKey: string) => void;
  onStep: (direction: 1 | -1) => void;
  onToday: () => void;
};

/** Day/week/month switch, previous/today/next, and a date picker. */
const CalendarToolbar: React.FC<Props> = ({ viewMode, onViewModeChange, selectedDate, onDateChange, onStep, onToday }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const arrow = calendarButtonStyle(theme, 'plain', { minHeight: 44, minWidth: 44, cursor: 'pointer', fontWeight: 700, fontSize: '1rem' });
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${theme.spacing.sm}px`, alignItems: 'center', marginBottom: `${theme.spacing.md}px` }}>
      <div role="group" aria-label={t('calendarViewLabel')} style={{ display: 'flex', gap: `${theme.spacing.xs}px` }}>
        {VIEW_MODES.map(({ mode, labelKey }) => {
          const active = viewMode === mode;
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={active}
              onClick={() => onViewModeChange(mode)}
              style={calendarButtonStyle(theme, active ? 'primary' : 'plain', { minHeight: 44, fontWeight: active ? 600 : 400, cursor: 'pointer' })}
            >
              {t(labelKey)}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: `${theme.spacing.xs}px`, alignItems: 'center' }}>
        <button type="button" aria-label={t('calendarPrev')} onClick={() => onStep(-1)} style={arrow}>
          ‹
        </button>
        <button
          type="button"
          onClick={onToday}
          style={calendarButtonStyle(theme, 'plain', { minHeight: 44, color: theme.colors.primary, cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem' })}
        >
          {t('calendarToday')}
        </button>
        <button type="button" aria-label={t('calendarNext')} onClick={() => onStep(1)} style={arrow}>
          ›
        </button>
      </div>
      <label style={{ display: 'flex', gap: `${theme.spacing.xs}px`, alignItems: 'center', marginLeft: 'auto' }}>
        {t('calendarSelectDate')}
        <input type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} style={fieldControlStyle(theme)} />
      </label>
    </div>
  );
};

export default CalendarToolbar;
