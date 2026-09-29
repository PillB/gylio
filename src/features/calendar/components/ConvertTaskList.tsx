import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Task } from '../../../core/hooks/useDB';
import { calendarButtonStyle, panelStyle } from './calendarStyles';
import { HelpHeading } from './CalendarHelp';

type Props = { tasks: Task[]; onConvert: (task: Task) => void };

/** Tasks not yet on the calendar, each with a one-tap "schedule now". */
const ConvertTaskList: React.FC<Props> = ({ tasks, onConvert }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <div>
      <HelpHeading topic="tasksToConvert">{t('calendarTasksToConvert')}</HelpHeading>
      {tasks.length ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: `${theme.spacing.sm}px`, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          {tasks.map((task) => (
            <li
              key={task.id}
              style={{
                ...panelStyle(theme),
                display: 'flex',
                flexDirection: 'column',
                gap: `${theme.spacing.xs}px`,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: '0.8125rem',
                  color: theme.colors.muted,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  lineHeight: 1.45,
                }}
              >
                {task.title}
              </span>
              <button
                type="button"
                onClick={() => onConvert(task)}
                style={calendarButtonStyle(theme, 'outlinePrimary', {
                  alignSelf: 'flex-start',
                  minHeight: 44,
                  color: theme.colors.primary,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                })}
              >
                {t('calendarConvertTask')}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: theme.colors.muted }}>{t('calendarNoTasksToConvert')}</p>
      )}
    </div>
  );
};

export default ConvertTaskList;
