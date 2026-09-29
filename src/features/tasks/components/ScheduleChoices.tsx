import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { TaskDraft } from '../hooks/useTaskDraft';
import TaskHelp from './TaskHelp';
import { controlStyle, textInputStyle } from './taskStyles';

type Props = { draft: TaskDraft; todayKey: string; tomorrowKey: string };

/** Today / Tomorrow / No date shortcuts plus a date field for the new task. */
const ScheduleChoices: React.FC<Props> = ({ draft, todayKey, tomorrowKey }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const noDateChosen = !draft.inheritViewDate && !draft.plannedDate;
  const shortcuts = [
    { key: 'today', label: t('tasks.viewToday', 'Today'), pressed: draft.effectiveDate === todayKey, value: todayKey },
    { key: 'tomorrow', label: t('tasks.sectionTomorrow', 'Tomorrow'), pressed: draft.effectiveDate === tomorrowKey, value: tomorrowKey },
    { key: 'none', label: t('tasks.noDate', 'No date'), pressed: noDateChosen, value: '' },
  ];
  return (
    <fieldset
      role="group"
      aria-label={t('tasks.scheduleTask', 'Schedule task')}
      style={{
        margin: 0,
        padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
        borderRadius: theme.shape.radiusMd,
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      <legend style={{ padding: `0 ${theme.spacing.xs}px`, fontWeight: 600 }}>{t('tasks.scheduleTask', 'Schedule task')}</legend>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.key}
            type="button"
            aria-pressed={shortcut.pressed}
            onClick={() => draft.setPlannedDate(shortcut.value)}
            style={controlStyle(theme, { backgroundColor: shortcut.pressed ? theme.colors.background : theme.colors.surface })}
          >
            {shortcut.label}
          </button>
        ))}
        <button type="button" onClick={() => document.getElementById('planned-date')?.focus()} style={controlStyle(theme)}>
          {t('tasks.pickDate', 'Pick date')}
        </button>
      </div>
      <label htmlFor="planned-date" style={{ display: 'flex', alignItems: 'center', marginTop: `${theme.spacing.sm}px`, fontWeight: 600 }}>
        {t('tasks.plannedDateLabel')}
        <TaskHelp topic="plannedDate" />
      </label>
      <input
        id="planned-date"
        data-tour="task-date"
        type="date"
        value={draft.plannedDate}
        onChange={(event) => draft.setPlannedDate(event.target.value)}
        style={textInputStyle(theme, { width: '100%', boxSizing: 'border-box', marginTop: `${theme.spacing.xs}px` })}
      />
      <p style={{ margin: `${theme.spacing.xs}px 0 0`, color: theme.colors.muted }}>{t('tasks.plannedDateHelper')}</p>
    </fieldset>
  );
};

export default ScheduleChoices;
