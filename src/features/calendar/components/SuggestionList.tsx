import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { CalendarFormat } from '../hooks/useCalendarFormat';
import type { ScheduleSuggestion } from '../utils/scheduleSuggestions';
import { calendarButtonStyle, panelStyle } from './calendarStyles';
import { HelpHeading } from './CalendarHelp';

type Props = { suggestions: ScheduleSuggestion[]; format: CalendarFormat; onSchedule: (suggestion: ScheduleSuggestion) => void };

/** Free focus windows for unscheduled tasks on the selected day. */
const SuggestionList: React.FC<Props> = ({ suggestions, format, onSchedule }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  // Nothing to suggest (no unscheduled task, or no free window): the section is left out, not
  // shown as a heading over "nothing here".
  if (suggestions.length === 0) return null;
  return (
    <div>
      <HelpHeading topic="suggestedFocus">{t('calendarSuggestedFocusHeading')}</HelpHeading>
      <p style={{ color: theme.colors.muted }}>{t('calendarSuggestedFocusHelper')}</p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: `${theme.spacing.sm}px` }}>
        {suggestions.map((suggestion) => (
          <li key={`suggestion-${suggestion.taskId}`} style={panelStyle(theme)}>
            <div style={{ fontWeight: theme.typography.heading.weight }}>{suggestion.title}</div>
            <div style={{ color: theme.colors.muted }}>
              {t('calendarSuggestedFocusWindow', {
                window: format.timeRange(suggestion.startDate, suggestion.endDate),
                minutes: suggestion.durationMinutes,
              })}
            </div>
            <button
              type="button"
              onClick={() => onSchedule(suggestion)}
              aria-label={t('calendarScheduleSuggestionNamed', { title: suggestion.title })}
              style={calendarButtonStyle(theme, 'outlinePrimary', { marginTop: `${theme.spacing.xs}px`, minHeight: 44 })}
            >
              {t('calendarScheduleSuggestion')}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SuggestionList;
