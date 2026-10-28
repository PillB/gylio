import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Task } from '../../../core/hooks/useDB';
import { useEventForm } from '../hooks/useEventForm';
import type { EventPayload } from '../utils/eventFields';
import EventFormFields from './EventFormFields';
import { calendarButtonStyle } from './calendarStyles';
import CalendarHelp from './CalendarHelp';

type Props = { tasks: Task[]; onCreate: (payload: EventPayload) => Promise<boolean> };

/** Collapsed "+ Add event" button that opens the new-event form. */
const AddEventPanel: React.FC<Props> = ({ tasks, onCreate }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const form = useEventForm(t);

  const save = async () => {
    const payload = form.submit();
    if (payload && (await onCreate(payload))) form.reset();
  };

  return (
    <div data-tour="calendar-add-section">
      <button
        data-tour="calendar-add-btn"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.xs,
          padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
          minHeight: 44,
          borderRadius: theme.shape.radiusFull,
          border: `1.5px solid ${open ? theme.colors.primary : theme.colors.border}`,
          background: open ? `${theme.colors.primary}12` : 'transparent',
          // Text colour, not primary: primary text on the tinted background fell just short of 4.5:1.
          color: open ? theme.colors.text : theme.colors.muted,
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 600,
          marginBottom: open ? `${theme.spacing.sm}px` : 0,
        }}
      >
        <span aria-hidden="true">{open ? '✕' : '+'}</span>
        {t('calendarAddEvent')}
      </button>
      <CalendarHelp topic="addEvent" />
      {open && (
        <>
          <EventFormFields form={form} tasks={tasks} />
          <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, marginTop: `${theme.spacing.sm}px` }}>
            <button type="button" onClick={save} style={calendarButtonStyle(theme, 'primary', { padding: `${theme.spacing.xs}px ${theme.spacing.md}px` })}>
              {t('calendarSaveEvent')}
            </button>
            <button type="button" onClick={form.reset} style={calendarButtonStyle(theme, 'plain', { padding: `${theme.spacing.xs}px ${theme.spacing.md}px` })}>
              {t('calendarResetForm')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AddEventPanel;
