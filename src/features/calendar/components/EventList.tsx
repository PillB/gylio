import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import useAccessibility from '../../../core/hooks/useAccessibility';
import type { Event, Task } from '../../../core/hooks/useDB';
import type { CalendarFormat } from '../hooks/useCalendarFormat';
import { useEventForm } from '../hooks/useEventForm';
import { fieldsFromEvent, type EventPayload } from '../utils/eventFields';
import EventFormFields from './EventFormFields';
import { calendarButtonStyle, panelStyle } from './calendarStyles';
import { HelpHeading } from './CalendarHelp';

export type EventListActions = {
  startEdit: (event: Event) => void;
  cancelEdit: () => void;
  save: (id: number, payload: EventPayload) => Promise<boolean>;
  remove: (event: Event) => Promise<boolean>;
};

type EditorProps = { event: Event; tasks: Task[]; actions: EventListActions };

const EventEditor: React.FC<EditorProps> = ({ event, tasks, actions }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const form = useEventForm(t, fieldsFromEvent(event));
  const wide = { padding: `${theme.spacing.xs}px ${theme.spacing.md}px` };
  const save = async () => {
    const payload = form.submit();
    if (payload && (await actions.save(event.id, payload))) actions.cancelEdit();
  };
  return (
    <li style={panelStyle(theme, theme.spacing.md)}>
      <EventFormFields form={form} tasks={tasks} />
      <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, marginTop: `${theme.spacing.sm}px` }}>
        <button type="button" onClick={save} style={calendarButtonStyle(theme, 'primary', { ...wide, color: theme.colors.background })}>
          {t('saveLabel')}
        </button>
        <button type="button" onClick={actions.cancelEdit} style={calendarButtonStyle(theme, 'plain', wide)}>
          {t('cancelLabel')}
        </button>
      </div>
    </li>
  );
};

type DeleteProps = { event: Event; actions: EventListActions };

/** Delete needs a second, explicit "Yes" so a stray tap never loses an event. */
const DeleteControl: React.FC<DeleteProps> = ({ event, actions }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const tall = { minHeight: '44px' };
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} style={calendarButtonStyle(theme, 'outlineAccent', tall)}>
        {t('deleteLabel')}
      </button>
    );
  }
  return (
    <>
      <span style={{ alignSelf: 'center', color: theme.colors.text, fontSize: '0.9rem' }}>
        {t('calendarConfirmDelete', { title: event.title })}
      </span>
      <button
        type="button"
        onClick={() => actions.remove(event).finally(() => setConfirming(false))}
        style={calendarButtonStyle(theme, 'danger', tall)}
      >
        {t('yesLabel')}
      </button>
      <button type="button" onClick={() => setConfirming(false)} style={calendarButtonStyle(theme, 'plain', tall)}>
        {t('cancelLabel')}
      </button>
    </>
  );
};

type CardProps = { event: Event; color: string; linkedTask: Task | undefined; format: CalendarFormat; actions: EventListActions };

const EventCard: React.FC<CardProps> = ({ event, color, linkedTask, format, actions }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { speak } = useAccessibility();
  const location = event.location ? ` ${t('calendarAtLocation', { location: event.location })}` : '';
  const tall = { minHeight: '44px' };
  return (
    <li style={{ ...panelStyle(theme, theme.spacing.md), backgroundColor: color }}>
      <div style={{ display: 'grid', gap: `${theme.spacing.xs}px`, minWidth: 0 }}>
        <div style={{ fontWeight: theme.typography.heading.weight, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          {event.title}
        </div>
        <div style={{ color: theme.colors.muted }}>{format.timeRange(event.startDate, event.endDate, true)}</div>
        {event.location ? <div>{t('calendarAtLocation', { location: event.location })}</div> : null}
        {event.description ? <div>{event.description}</div> : null}
        {linkedTask ? <div style={{ color: theme.colors.muted }}>{t('calendarLinkedTask', { title: linkedTask.title })}</div> : null}
      </div>
      <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, marginTop: `${theme.spacing.sm}px`, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => speak(`${event.title}. ${format.timeRange(event.startDate, event.endDate)}.${location}`)}
          style={calendarButtonStyle(theme, 'plain', tall)}
        >
          {t('calendarReadEvent')}
        </button>
        <button type="button" onClick={() => actions.startEdit(event)} style={calendarButtonStyle(theme, 'plain', tall)}>
          {t('editLabel')}
        </button>
        <DeleteControl event={event} actions={actions} />
      </div>
    </li>
  );
};

type Props = {
  loading: boolean;
  events: Event[];
  tasks: Task[];
  palette: string[];
  editingId: number | null;
  format: CalendarFormat;
  actions: EventListActions;
};

/** Every event in start order, each readable aloud, editable in place, and deletable. */
const EventList: React.FC<Props> = ({ loading, events, tasks, palette, editingId, format, actions }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <div>
      <HelpHeading topic="events">{t('calendarEventsHeading')}</HelpHeading>
      {loading ? <p style={{ color: theme.colors.muted }}>{t('loading')}</p> : null}
      {!loading && events.length === 0 ? <p style={{ color: theme.colors.muted }}>{t('calendarNoEvents')}</p> : null}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: `${theme.spacing.md}px`, gridTemplateColumns: 'minmax(0, 1fr)' }}>
        {events.map((event, index) =>
          editingId === event.id ? (
            <EventEditor key={event.id} event={event} tasks={tasks} actions={actions} />
          ) : (
            <EventCard
              key={event.id}
              event={event}
              color={palette[index % palette.length]}
              linkedTask={tasks.find((task) => task.id === event.taskId)}
              format={format}
              actions={actions}
            />
          )
        )}
      </ul>
    </div>
  );
};

export default EventList;
