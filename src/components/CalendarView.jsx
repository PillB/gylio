import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import useAccessibility from '../core/hooks/useAccessibility';
import { useTheme } from '../core/context/ThemeContext';
import {
  collectValidationMessages,
  hasValidationErrors,
  logValidationSummary
} from '../core/utils/validationSummary';
import SectionCard from './SectionCard.jsx';
import ValidationSummary from './ValidationSummary.jsx';

const getDateKey = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateTimeInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const parseDateTime = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateTimeInputValue = (value) => {
  const parsed = parseDateTime(value);
  return parsed ? formatDateTimeInputValue(parsed) : '';
};

const CalendarView = () => {
  const { t } = useTranslation();
  const { ready, getEvents, insertEvent, updateEvent, deleteEvent, getTasks, updateTask } = useDB();
  const { speak } = useAccessibility();
  const { theme } = useTheme();
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('week');
  const [selectedDate, setSelectedDate] = useState(() => formatDateInputValue(new Date()));
  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    taskId: '',
    reminderMinutesBefore: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    taskId: '',
    reminderMinutesBefore: ''
  });
  const [touched, setTouched] = useState({
    title: false,
    startDate: false,
    endDate: false,
    reminderMinutesBefore: false
  });
  const [editTouched, setEditTouched] = useState({
    title: false,
    startDate: false,
    endDate: false,
    reminderMinutesBefore: false
  });
  const [addSummary, setAddSummary] = useState([]);
  const [editSummary, setEditSummary] = useState([]);

  const softPalette = useMemo(
    () =>
      theme.mode === 'dark'
        ? ['#1f2a44', '#24324d', '#2b3c57', '#2e4360', '#304a69', '#314f72']
        : ['#e8f1ff', '#eaf7f1', '#fdf1e7', '#f3e8ff', '#eaf3fb', '#f2f7e9'],
    [theme.mode]
  );

  const validateFields = useCallback(
    (fields) => {
      const validation = {
        title: '',
        startDate: '',
        endDate: '',
        reminderMinutesBefore: ''
      };

      if (!fields.title.trim()) {
        validation.title = t('validation.titleRequired');
      }

      const start = parseDateTime(fields.startDate);
      if (!start) {
        validation.startDate = t('validation.invalidDateTime');
      }

      if (fields.endDate) {
        const end = parseDateTime(fields.endDate);
        if (!end) {
          validation.endDate = t('validation.invalidDateTime');
        } else if (start && end <= start) {
          validation.endDate = t('validation.endAfterStart');
        }
      }

      if (fields.reminderMinutesBefore !== '') {
        const reminder = Number(fields.reminderMinutesBefore);
        if (Number.isNaN(reminder) || reminder < 0) {
          validation.reminderMinutesBefore = t('validation.nonNegativeNumber');
        }
      }

      return validation;
    },
    [t]
  );

  const addValidation = useMemo(() => {
    if (!touched.title && !touched.startDate && !touched.endDate && !touched.reminderMinutesBefore) {
      return { title: '', startDate: '', endDate: '', reminderMinutesBefore: '' };
    }
    return validateFields(form);
  }, [form, touched, validateFields]);

  const editValidation = useMemo(() => {
    if (!editTouched.title && !editTouched.startDate && !editTouched.endDate && !editTouched.reminderMinutesBefore) {
      return { title: '', startDate: '', endDate: '', reminderMinutesBefore: '' };
    }
    return validateFields(editFields);
  }, [editFields, editTouched, validateFields]);

  useEffect(() => {
    if (!hasValidationErrors(addValidation)) {
      setAddSummary([]);
    }
  }, [addValidation]);

  useEffect(() => {
    if (!hasValidationErrors(editValidation)) {
      setEditSummary([]);
    }
  }, [editValidation]);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    Promise.all([getEvents(), getTasks()])
      .then(([eventsResult, tasksResult]) => {
        setEvents(eventsResult);
        setTasks(tasksResult);
      })
      .catch((error) => {
        console.error('Failed to load calendar data', error);
      })
      .finally(() => setLoading(false));
  }, [getEvents, getTasks, ready]);

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      location: '',
      taskId: '',
      reminderMinutesBefore: ''
    });
    setTouched({
      title: false,
      startDate: false,
      endDate: false,
      reminderMinutesBefore: false
    });
  };

  const syncTaskLink = async (taskId, eventId) => {
    if (!taskId) return;
    const updated = await updateTask(Number(taskId), { calendarEventId: eventId });
    if (updated) {
      setTasks((prev) =>
        prev.map((task) => (task.id === Number(taskId) ? { ...task, calendarEventId: eventId } : task))
      );
    }
  };

  const clearTaskLink = async (taskId) => {
    if (!taskId) return;
    const updated = await updateTask(Number(taskId), { calendarEventId: null });
    if (updated) {
      setTasks((prev) =>
        prev.map((task) => (task.id === Number(taskId) ? { ...task, calendarEventId: null } : task))
      );
    }
  };

  const handleAddEvent = () => {
    const validation = validateFields(form);
    setTouched({
      title: true,
      startDate: true,
      endDate: true,
      reminderMinutesBefore: true
    });

    const messages = collectValidationMessages(validation);
    if (messages.length) {
      setAddSummary(messages);
      logValidationSummary('calendar-add', messages);
      return;
    }

    const taskId = form.taskId ? Number(form.taskId) : null;
    const reminder =
      form.reminderMinutesBefore === '' ? null : Number.parseInt(form.reminderMinutesBefore, 10);

    insertEvent(
      form.title.trim(),
      form.description.trim() || null,
      form.startDate,
      form.endDate || null,
      form.location.trim() || null,
      taskId,
      reminder
    )
      .then(async (created) => {
        setEvents((prev) => (prev.length ? [created, ...prev] : [created]));
        if (taskId) {
          await syncTaskLink(taskId, created.id);
        }
        resetForm();
        setAddSummary([]);
      })
      .catch((error) => {
        console.error('Failed to add event', error);
      });
  };

  const startEdit = (event) => {
    setEditingId(event.id);
    setEditFields({
      title: event.title ?? '',
      description: event.description ?? '',
      startDate: toDateTimeInputValue(event.startDate),
      endDate: toDateTimeInputValue(event.endDate),
      location: event.location ?? '',
      taskId: event.taskId != null ? String(event.taskId) : '',
      reminderMinutesBefore:
        event.reminderMinutesBefore != null ? String(event.reminderMinutesBefore) : ''
    });
    setEditTouched({
      title: false,
      startDate: false,
      endDate: false,
      reminderMinutesBefore: false
    });
  };

  const saveEdit = () => {
    if (editingId == null) return;
    const validation = validateFields(editFields);
    setEditTouched({
      title: true,
      startDate: true,
      endDate: true,
      reminderMinutesBefore: true
    });

    const messages = collectValidationMessages(validation);
    if (messages.length) {
      setEditSummary(messages);
      logValidationSummary('calendar-edit', messages);
      return;
    }

    const nextTaskId = editFields.taskId ? Number(editFields.taskId) : null;
    const reminder =
      editFields.reminderMinutesBefore === '' ? null : Number.parseInt(editFields.reminderMinutesBefore, 10);

    const previousEvent = events.find((entry) => entry.id === editingId);
    const previousTaskId = previousEvent?.taskId ?? null;

    updateEvent(editingId, {
      title: editFields.title.trim(),
      description: editFields.description.trim() || null,
      startDate: editFields.startDate,
      endDate: editFields.endDate || null,
      location: editFields.location.trim() || null,
      taskId: nextTaskId,
      reminderMinutesBefore: reminder
    })
      .then(async (updated) => {
        if (!updated) return;
        setEvents((prev) => prev.map((entry) => (entry.id === editingId ? updated : entry)));
        if (previousTaskId && previousTaskId !== nextTaskId) {
          await clearTaskLink(previousTaskId);
        }
        if (nextTaskId) {
          await syncTaskLink(nextTaskId, updated.id);
        }
        setEditingId(null);
        setEditSummary([]);
      })
      .catch((error) => {
        console.error('Failed to update event', error);
      });
  };

  const removeEvent = (event) => {
    const confirmed = window.confirm(t('calendarConfirmDelete', { title: event.title }));
    if (!confirmed) return;

    deleteEvent(event.id)
      .then(async (deleted) => {
        if (deleted) {
          setEvents((prev) => prev.filter((entry) => entry.id !== event.id));
          if (event.taskId) {
            await clearTaskLink(event.taskId);
          }
          if (editingId === event.id) {
            setEditingId(null);
          }
        }
      })
      .catch((error) => {
        console.error('Failed to delete event', error);
      });
  };

  const handleConvertTask = (task) => {
    const start = new Date();
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const startValue = formatDateTimeInputValue(start);
    const endValue = formatDateTimeInputValue(end);

    insertEvent(task.title, null, startValue, endValue, null, task.id, null)
      .then(async (created) => {
        setEvents((prev) => (prev.length ? [created, ...prev] : [created]));
        await syncTaskLink(task.id, created.id);
      })
      .catch((error) => {
        console.error('Failed to convert task', error);
      });
  };

  const availableTasks = useMemo(() => tasks.filter((task) => !task.calendarEventId), [tasks]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const first = parseDateTime(a.startDate);
      const second = parseDateTime(b.startDate);
      if (!first && !second) return 0;
      if (!first) return 1;
      if (!second) return -1;
      return first.getTime() - second.getTime();
    });
  }, [events]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }),
    []
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      }),
    []
  );

  const displayedDates = useMemo(() => {
    const base = new Date(selectedDate);
    if (Number.isNaN(base.getTime())) return [];
    if (viewMode === 'day') {
      return [base];
    }
    const start = new Date(base);
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [selectedDate, viewMode]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    sortedEvents.forEach((event, index) => {
      const dateKey = getDateKey(event.startDate);
      if (!dateKey) return;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey).push({ event, color: softPalette[index % softPalette.length] });
    });
    return map;
  }, [softPalette, sortedEvents]);

  const describeEvent = (event) => {
    const start = parseDateTime(event.startDate);
    const end = parseDateTime(event.endDate);
    const timeRange = start
      ? `${timeFormatter.format(start)}${end ? `–${timeFormatter.format(end)}` : ''}`
      : t('calendarTimeUnknown');
    const location = event.location ? ` ${t('calendarAtLocation', { location: event.location })}` : '';
    return `${event.title}. ${timeRange}.${location}`;
  };

  const renderEventFormFields = (fields, setFields, validation, fieldTouched, setFieldTouched) => (
    <div
      style={{
        display: 'grid',
        gap: `${theme.spacing.sm}px`,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
      }}
    >
      <label style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
        {t('titleLabel')}
        <input
          type="text"
          value={fields.title}
          onChange={(event) => {
            setFields((prev) => ({ ...prev, title: event.target.value }));
            setFieldTouched((prev) => ({ ...prev, title: true }));
          }}
          style={{
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusSm,
            backgroundColor: theme.colors.background,
            color: theme.colors.text
          }}
        />
        {fieldTouched.title && validation.title ? (
          <span style={{ color: theme.colors.accent }}>{validation.title}</span>
        ) : null}
      </label>
      <label style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
        {t('calendarStartLabel')}
        <input
          type="datetime-local"
          value={fields.startDate}
          onChange={(event) => {
            setFields((prev) => ({ ...prev, startDate: event.target.value }));
            setFieldTouched((prev) => ({ ...prev, startDate: true }));
          }}
          style={{
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusSm,
            backgroundColor: theme.colors.background,
            color: theme.colors.text
          }}
        />
        {fieldTouched.startDate && validation.startDate ? (
          <span style={{ color: theme.colors.accent }}>{validation.startDate}</span>
        ) : null}
      </label>
      <label style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
        {t('calendarEndLabel')}
        <input
          type="datetime-local"
          value={fields.endDate}
          onChange={(event) => {
            setFields((prev) => ({ ...prev, endDate: event.target.value }));
            setFieldTouched((prev) => ({ ...prev, endDate: true }));
          }}
          style={{
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusSm,
            backgroundColor: theme.colors.background,
            color: theme.colors.text
          }}
        />
        {fieldTouched.endDate && validation.endDate ? (
          <span style={{ color: theme.colors.accent }}>{validation.endDate}</span>
        ) : null}
      </label>
      <label style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
        {t('calendarLocationLabel')}
        <input
          type="text"
          value={fields.location}
          onChange={(event) => {
            setFields((prev) => ({ ...prev, location: event.target.value }));
          }}
          style={{
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusSm,
            backgroundColor: theme.colors.background,
            color: theme.colors.text
          }}
        />
      </label>
      <label style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
        {t('calendarDescriptionLabel')}
        <input
          type="text"
          value={fields.description}
          onChange={(event) => {
            setFields((prev) => ({ ...prev, description: event.target.value }));
          }}
          style={{
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusSm,
            backgroundColor: theme.colors.background,
            color: theme.colors.text
          }}
        />
      </label>
      <label style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
        {t('calendarTaskLinkLabel')}
        <select
          value={fields.taskId}
          onChange={(event) => {
            setFields((prev) => ({ ...prev, taskId: event.target.value }));
          }}
          style={{
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusSm,
            backgroundColor: theme.colors.background,
            color: theme.colors.text
          }}
        >
          <option value="">{t('calendarTaskLinkNone')}</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
        {t('calendarReminderLabel')}
        <input
          type="number"
          min="0"
          value={fields.reminderMinutesBefore}
          onChange={(event) => {
            setFields((prev) => ({ ...prev, reminderMinutesBefore: event.target.value }));
            setFieldTouched((prev) => ({ ...prev, reminderMinutesBefore: true }));
          }}
          style={{
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusSm,
            backgroundColor: theme.colors.background,
            color: theme.colors.text
          }}
        />
        {fieldTouched.reminderMinutesBefore && validation.reminderMinutesBefore ? (
          <span style={{ color: theme.colors.accent }}>{validation.reminderMinutesBefore}</span>
        ) : null}
      </label>
    </div>
  );

  return (
    <SectionCard
      ariaLabel={`${t('calendar')} module`}
      title={t('calendar')}
      subtitle={t('calendarIntro')}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: `${theme.spacing.sm}px`,
          alignItems: 'center',
          marginBottom: `${theme.spacing.md}px`
        }}
      >
        <span style={{ fontWeight: theme.typography.heading.weight }}>{t('calendarViewLabel')}</span>
        <button
          type="button"
          onClick={() => setViewMode('day')}
          style={{
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
            borderRadius: theme.shape.radiusSm,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: viewMode === 'day' ? theme.colors.primary : theme.colors.surface,
            color: viewMode === 'day' ? theme.colors.background : theme.colors.text
          }}
        >
          {t('calendarDayView')}
        </button>
        <button
          type="button"
          onClick={() => setViewMode('week')}
          style={{
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
            borderRadius: theme.shape.radiusSm,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: viewMode === 'week' ? theme.colors.primary : theme.colors.surface,
            color: viewMode === 'week' ? theme.colors.background : theme.colors.text
          }}
        >
          {t('calendarWeekView')}
        </button>
        <label style={{ display: 'flex', gap: `${theme.spacing.xs}px`, alignItems: 'center' }}>
          {t('calendarSelectDate')}
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            style={{
              padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.shape.radiusSm,
              backgroundColor: theme.colors.background,
              color: theme.colors.text
            }}
          />
        </label>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${displayedDates.length || 1}, minmax(0, 1fr))`,
          gap: `${theme.spacing.sm}px`,
          marginBottom: `${theme.spacing.lg}px`
        }}
      >
        {displayedDates.map((date) => {
          const dateKey = formatDateInputValue(date);
          const dayEvents = eventsByDate.get(dateKey) ?? [];
          return (
            <div
              key={dateKey}
              style={{
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.shape.radiusSm,
                padding: `${theme.spacing.sm}px`,
                backgroundColor: theme.colors.surface,
                minHeight: '160px'
              }}
            >
              <div style={{ fontWeight: theme.typography.heading.weight, marginBottom: `${theme.spacing.xs}px` }}>
                {dateFormatter.format(date)}
              </div>
              {dayEvents.length ? (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: `${theme.spacing.xs}px` }}>
                  {dayEvents.map(({ event, color }) => {
                    const start = parseDateTime(event.startDate);
                    const end = parseDateTime(event.endDate);
                    const timeLabel = start
                      ? `${timeFormatter.format(start)}${end ? `–${timeFormatter.format(end)}` : ''}`
                      : t('calendarTimeUnknown');
                    return (
                      <li
                        key={event.id}
                        style={{
                          padding: `${theme.spacing.xs}px`,
                          borderRadius: theme.shape.radiusSm,
                          backgroundColor: color,
                          color: theme.colors.text
                        }}
                      >
                        <div style={{ fontWeight: theme.typography.heading.weight }}>{event.title}</div>
                        <div style={{ fontSize: '0.85rem', color: theme.colors.muted }}>{timeLabel}</div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p style={{ color: theme.colors.muted, margin: 0 }}>{t('calendarEmptyDay')}</p>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gap: `${theme.spacing.md}px` }}>
        <div>
          <h3 style={{ marginTop: 0 }}>{t('calendarAddEvent')}</h3>
          <ValidationSummary messages={addSummary} id="calendar-add-summary" />
          {renderEventFormFields(form, setForm, addValidation, touched, setTouched)}
          <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, marginTop: `${theme.spacing.sm}px` }}>
            <button
              type="button"
              onClick={handleAddEvent}
              style={{
                padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                borderRadius: theme.shape.radiusSm,
                border: `1px solid ${theme.colors.primary}`,
                backgroundColor: theme.colors.primary,
                color: theme.colors.background
              }}
            >
              {t('calendarSaveEvent')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              style={{
                padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                borderRadius: theme.shape.radiusSm,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.surface,
                color: theme.colors.text
              }}
            >
              {t('calendarResetForm')}
            </button>
          </div>
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>{t('calendarTasksToConvert')}</h3>
          {availableTasks.length ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: `${theme.spacing.sm}px` }}>
              {availableTasks.map((task) => (
                <li
                  key={task.id}
                  style={{
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    padding: `${theme.spacing.sm}px`,
                    backgroundColor: theme.colors.surface,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: `${theme.spacing.sm}px`
                  }}
                >
                  <span>{task.title}</span>
                  <button
                    type="button"
                    onClick={() => handleConvertTask(task)}
                    style={{
                      padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                      borderRadius: theme.shape.radiusSm,
                      border: `1px solid ${theme.colors.primary}`,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text
                    }}
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

        <div>
          <h3 style={{ marginTop: 0 }}>{t('calendarEventsHeading')}</h3>
          {loading ? (
            <p style={{ color: theme.colors.muted }}>{t('loading')}</p>
          ) : null}
          {!loading && sortedEvents.length === 0 ? (
            <p style={{ color: theme.colors.muted }}>{t('calendarNoEvents')}</p>
          ) : null}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: `${theme.spacing.md}px` }}>
            {sortedEvents.map((event, index) => {
              const start = parseDateTime(event.startDate);
              const end = parseDateTime(event.endDate);
              const timeLabel = start
                ? `${dateFormatter.format(start)} · ${timeFormatter.format(start)}${end ? `–${timeFormatter.format(end)}` : ''}`
                : t('calendarTimeUnknown');
              const linkedTask = tasks.find((task) => task.id === event.taskId);
              const cardColor = softPalette[index % softPalette.length];

              if (editingId === event.id) {
                return (
                  <li
                    key={event.id}
                    style={{
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.shape.radiusSm,
                      padding: `${theme.spacing.md}px`,
                      backgroundColor: theme.colors.surface
                    }}
                  >
                    <ValidationSummary messages={editSummary} id={`calendar-edit-summary-${event.id}`} />
                    {renderEventFormFields(editFields, setEditFields, editValidation, editTouched, setEditTouched)}
                    <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, marginTop: `${theme.spacing.sm}px` }}>
                      <button
                        type="button"
                        onClick={saveEdit}
                        style={{
                          padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                          borderRadius: theme.shape.radiusSm,
                          border: `1px solid ${theme.colors.primary}`,
                          backgroundColor: theme.colors.primary,
                          color: theme.colors.background
                        }}
                      >
                        {t('saveLabel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        style={{
                          padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                          borderRadius: theme.shape.radiusSm,
                          border: `1px solid ${theme.colors.border}`,
                          backgroundColor: theme.colors.surface,
                          color: theme.colors.text
                        }}
                      >
                        {t('cancelLabel')}
                      </button>
                    </div>
                  </li>
                );
              }

              return (
                <li
                  key={event.id}
                  style={{
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    padding: `${theme.spacing.md}px`,
                    backgroundColor: cardColor
                  }}
                >
                  <div style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
                    <div style={{ fontWeight: theme.typography.heading.weight }}>{event.title}</div>
                    <div style={{ color: theme.colors.muted }}>{timeLabel}</div>
                    {event.location ? <div>{t('calendarAtLocation', { location: event.location })}</div> : null}
                    {event.description ? <div>{event.description}</div> : null}
                    {linkedTask ? (
                      <div style={{ color: theme.colors.muted }}>
                        {t('calendarLinkedTask', { title: linkedTask.title })}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, marginTop: `${theme.spacing.sm}px` }}>
                    <button
                      type="button"
                      onClick={() => speak(describeEvent(event))}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text
                      }}
                    >
                      {t('calendarReadEvent')}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(event)}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text
                      }}
                    >
                      {t('editLabel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEvent(event)}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.accent}`,
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text
                      }}
                    >
                      {t('deleteLabel')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </SectionCard>
  );
};

export default CalendarView;
