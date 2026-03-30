import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import useAccessibility from '../core/hooks/useAccessibility';
import { useTheme } from '../core/context/ThemeContext';
import SectionCard from './SectionCard.jsx';
import {
  emptyEventFormValidation,
  parseDateTime,
  validateEventFormFields
} from '../features/calendar/utils/eventForm';
import { buildScheduleSuggestions } from '../features/calendar/utils/scheduleSuggestions';
import {
  buildQuickTaskEventInput,
  buildSuggestedEventInput,
  formatDateTimeInputValue,
} from '../features/calendar/utils/eventConversions';
import { WeeklyGrid } from '../features/calendar/components/WeeklyGrid';

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

const toDateTimeInputValue = (value) => {
  const parsed = parseDateTime(value);
  return parsed ? formatDateTimeInputValue(parsed) : '';
};

const CalendarView = () => {
  const { t, i18n } = useTranslation();
  const { ready, getEvents, insertEvent, updateEvent, deleteEvent, getTasks, updateTask } = useDB();
  const { speak } = useAccessibility();
  const { theme } = useTheme();
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('week');
  const [selectedDate, setSelectedDate] = useState(() => formatDateInputValue(new Date()));
  const [addFormOpen, setAddFormOpen] = useState(false);
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
  const [deletingEventId, setDeletingEventId] = useState(null);
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

  const softPalette = useMemo(
    () =>
      theme.mode === 'dark'
        ? ['#1f2a44', '#24324d', '#2b3c57', '#2e4360', '#304a69', '#314f72']
        : ['#e8f1ff', '#eaf7f1', '#fdf1e7', '#f3e8ff', '#eaf3fb', '#f2f7e9'],
    [theme.mode]
  );

  const validateFields = useCallback(
    (fields) => {
      return validateEventFormFields(fields, t);
    },
    [t]
  );

  const addValidation = useMemo(() => {
    if (!touched.title && !touched.startDate && !touched.endDate && !touched.reminderMinutesBefore) {
      return emptyEventFormValidation();
    }
    return validateFields(form);
  }, [form, touched, validateFields]);

  const editValidation = useMemo(() => {
    if (!editTouched.title && !editTouched.startDate && !editTouched.endDate && !editTouched.reminderMinutesBefore) {
      return emptyEventFormValidation();
    }
    return validateFields(editFields);
  }, [editFields, editTouched, validateFields]);

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

  const hasErrors = (validation) => Object.values(validation).some(Boolean);

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

    if (hasErrors(validation)) return;

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

    if (hasErrors(validation)) return;

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
      })
      .catch((error) => {
        console.error('Failed to update event', error);
      });
  };

  const removeEvent = (event) => {
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
      })
      .finally(() => {
        setDeletingEventId(null);
      });
  };

  const handleConvertTask = (task) => {
    const eventInput = buildQuickTaskEventInput(task);

    insertEvent(eventInput.title, null, eventInput.startDate, eventInput.endDate, null, eventInput.taskId, null)
      .then(async (created) => {
        setEvents((prev) => (prev.length ? [created, ...prev] : [created]));
        await syncTaskLink(eventInput.taskId, created.id);
      })
      .catch((error) => {
        console.error('Failed to convert task', error);
      });
  };

  const handleScheduleSuggestion = (suggestion) => {
    const eventInput = buildSuggestedEventInput(suggestion);
    if (!eventInput.startDate || !eventInput.endDate) return;

    insertEvent(eventInput.title, null, eventInput.startDate, eventInput.endDate, null, eventInput.taskId, null)
      .then(async (created) => {
        setEvents((prev) => (prev.length ? [created, ...prev] : [created]));
        await syncTaskLink(eventInput.taskId, created.id);
      })
      .catch((error) => {
        console.error('Failed to schedule suggestion', error);
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
      new Intl.DateTimeFormat(i18n.language, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }),
    [i18n.language]
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        hour: 'numeric',
        minute: '2-digit'
      }),
    [i18n.language]
  );

  const displayedDates = useMemo(() => {
    // Parse as local date to avoid UTC-offset shifting (new Date("YYYY-MM-DD") is UTC midnight)
    const [y, mo, d] = selectedDate.split('-').map(Number);
    const base = new Date(y, mo - 1, d);
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

  const scheduleSuggestions = useMemo(() => {
    return buildScheduleSuggestions({
      tasks,
      events,
      selectedDate,
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      dayStartHour: 8,
      dayEndHour: 20,
      defaultDurationMinutes: 25,
      maxSuggestions: 3
    });
  }, [events, selectedDate, tasks]);

  const weekStart = useMemo(() => {
    const d = new Date(selectedDate || new Date());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [selectedDate]);

  const navigatePeriod = useCallback((direction) => {
    const [y, mo, d] = selectedDate.split('-').map(Number);
    const base = new Date(y, mo - 1, d);
    if (viewMode === 'day') {
      base.setDate(base.getDate() + direction);
    } else if (viewMode === 'month') {
      base.setDate(1); // anchor to 1st to avoid day-overflow (e.g. Jan 31 + 1 month = Mar 3)
      base.setMonth(base.getMonth() + direction);
    } else {
      base.setDate(base.getDate() + direction * 7);
    }
    setSelectedDate(formatDateInputValue(base));
  }, [selectedDate, viewMode]);

  const goToToday = useCallback(() => {
    setSelectedDate(formatDateInputValue(new Date()));
  }, []);

  // Month-view: all days in the month of selectedDate
  const monthDays = useMemo(() => {
    if (viewMode !== 'month') return [];
    const [y, mo] = selectedDate.split('-').map(Number);
    const firstDay = new Date(y, mo - 1, 1);
    const lastDay = new Date(y, mo, 0);
    // Pad start to Monday
    const startPad = (firstDay.getDay() + 6) % 7;
    const start = new Date(firstDay);
    start.setDate(start.getDate() - startPad);
    // Pad end to Sunday (complete rows)
    const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;
    return Array.from({ length: totalCells }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  }, [selectedDate, viewMode]);

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
        {/* View mode toggles */}
        <div role="group" aria-label={t('calendarViewLabel')} style={{ display: 'flex', gap: `${theme.spacing.xs}px` }}>
          {[
            { mode: 'day', label: t('calendarDayView') },
            { mode: 'week', label: t('calendarWeekView') },
            { mode: 'month', label: t('calendarMonthView') },
          ].map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                borderRadius: theme.shape.radiusSm,
                border: `1px solid ${viewMode === mode ? theme.colors.primary : theme.colors.border}`,
                backgroundColor: viewMode === mode ? theme.colors.primary : theme.colors.surface,
                color: viewMode === mode ? theme.colors.primaryForeground : theme.colors.text,
                fontWeight: viewMode === mode ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Prev / Today / Next navigation */}
        <div style={{ display: 'flex', gap: `${theme.spacing.xs}px`, alignItems: 'center' }}>
          <button
            type="button"
            aria-label={t('calendarPrev')}
            onClick={() => navigatePeriod(-1)}
            style={{
              padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
              borderRadius: theme.shape.radiusSm,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '1rem',
            }}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goToToday}
            style={{
              padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
              borderRadius: theme.shape.radiusSm,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surface,
              color: theme.colors.primary,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8125rem',
            }}
          >
            {t('calendarToday')}
          </button>
          <button
            type="button"
            aria-label={t('calendarNext')}
            onClick={() => navigatePeriod(1)}
            style={{
              padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
              borderRadius: theme.shape.radiusSm,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '1rem',
            }}
          >
            ›
          </button>
        </div>

        {/* Date picker */}
        <label style={{ display: 'flex', gap: `${theme.spacing.xs}px`, alignItems: 'center', marginLeft: 'auto' }}>
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

      {viewMode === 'week' && (
        <WeeklyGrid
          events={events}
          weekStartDate={weekStart}
          theme={theme}
          onEventClick={(event) => {
            startEdit(event);
          }}
          reduceMotion={false}
        />
      )}

      {/* Day view: detailed single-day card */}
      {viewMode === 'day' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
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
                  padding: `${theme.spacing.md}px`,
                  backgroundColor: theme.colors.surface,
                  minHeight: '200px'
                }}
              >
                <div style={{ fontWeight: theme.typography.heading.weight, fontSize: '1.125rem', marginBottom: `${theme.spacing.sm}px` }}>
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
                            padding: `${theme.spacing.sm}px`,
                            borderRadius: theme.shape.radiusSm,
                            backgroundColor: color,
                            color: theme.colors.text,
                            cursor: 'pointer',
                          }}
                          onClick={() => startEdit(event)}
                        >
                          <div style={{ fontWeight: theme.typography.heading.weight }}>{event.title}</div>
                          <div style={{ fontSize: '0.85rem', color: theme.colors.muted }}>{timeLabel}</div>
                          {event.location && <div style={{ fontSize: '0.8rem', color: theme.colors.muted }}>{event.location}</div>}
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
      )}

      {/* Month view: density calendar */}
      {viewMode === 'month' && (
        <div style={{ marginBottom: `${theme.spacing.lg}px` }}>
          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
            {(() => {
              // Monday-anchored localized weekday headers
              const fmt = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });
              // Jan 6 2025 = Monday; iterate Mon–Sun
              return [6, 7, 8, 9, 10, 11, 12].map((dayOfMonth) => {
                const d = new Date(2025, 0, dayOfMonth);
                return (
                  <div key={dayOfMonth} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: theme.colors.muted, padding: '4px 0' }}>
                    {fmt.format(d)}
                  </div>
                );
              });
            })()}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {monthDays.map((date) => {
              const dateKey = formatDateInputValue(date);
              const dayEvents = eventsByDate.get(dateKey) ?? [];
              const isCurrentMonth = date.getMonth() === Number(selectedDate.split('-')[1]) - 1;
              const isToday = dateKey === formatDateInputValue(new Date());
              const isSelected = dateKey === selectedDate;
              return (
                <div
                  key={dateKey}
                  role="button"
                  tabIndex={0}
                  aria-label={`${dateFormatter.format(date)}, ${dayEvents.length} events`}
                  aria-pressed={isSelected}
                  onClick={() => { setSelectedDate(dateKey); setViewMode('day'); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedDate(dateKey); setViewMode('day'); }}}
                  style={{
                    border: `1px solid ${isToday ? theme.colors.primary : theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    padding: '6px 4px',
                    backgroundColor: isSelected ? `${theme.colors.primary}15` : isCurrentMonth ? theme.colors.surface : theme.colors.background,
                    minHeight: '64px',
                    cursor: 'pointer',
                    opacity: isCurrentMonth ? 1 : 0.4,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span style={{
                    fontSize: '0.8125rem',
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? theme.colors.primary : theme.colors.text,
                    lineHeight: 1,
                  }}>
                    {date.getDate()}
                  </span>
                  {/* Density dots */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {dayEvents.slice(0, 4).map(({ event, color }) => (
                      <span
                        key={event.id}
                        title={event.title}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: color,
                          display: 'inline-block',
                        }}
                      />
                    ))}
                    {dayEvents.length > 4 && (
                      <span style={{ fontSize: '0.6rem', color: theme.colors.muted, lineHeight: 1 }}>
                        +{dayEvents.length - 4}
                      </span>
                    )}
                  </div>
                  {/* First event title preview */}
                  {dayEvents.length > 0 && (
                    <span style={{ fontSize: '0.65rem', color: theme.colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dayEvents[0].event.title}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: `${theme.spacing.md}px` }}>
        <div>
          <button
            type="button"
            onClick={() => setAddFormOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
              borderRadius: theme.shape.radiusFull,
              border: `1.5px solid ${addFormOpen ? theme.colors.primary : theme.colors.border}`,
              background: addFormOpen ? `${theme.colors.primary}12` : 'transparent',
              color: addFormOpen ? theme.colors.primary : theme.colors.muted,
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: addFormOpen ? `${theme.spacing.sm}px` : 0,
            }}
          >
            {addFormOpen ? '✕ ' : '+ '}{t('calendarAddEvent')}
          </button>
          {addFormOpen && renderEventFormFields(form, setForm, addValidation, touched, setTouched)}
          {addFormOpen && (
            <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, marginTop: `${theme.spacing.sm}px` }}>
              <button
                type="button"
                onClick={handleAddEvent}
                style={{
                  padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                  borderRadius: theme.shape.radiusSm,
                  border: `1px solid ${theme.colors.primary}`,
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.primaryForeground
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
          )}
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>{t('calendarSuggestedFocusHeading')}</h3>
          <p style={{ color: theme.colors.muted }}>{t('calendarSuggestedFocusHelper')}</p>
          {scheduleSuggestions.length ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: `${theme.spacing.sm}px` }}>
              {scheduleSuggestions.map((suggestion) => {
                const start = parseDateTime(suggestion.startDate);
                const end = parseDateTime(suggestion.endDate);
                const label = start
                  ? `${timeFormatter.format(start)}${end ? `–${timeFormatter.format(end)}` : ''}`
                  : t('calendarTimeUnknown');

                return (
                  <li
                    key={`suggestion-${suggestion.taskId}`}
                    style={{
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.shape.radiusSm,
                      padding: `${theme.spacing.sm}px`,
                      backgroundColor: theme.colors.surface
                    }}
                  >
                    <div style={{ fontWeight: theme.typography.heading.weight }}>{suggestion.title}</div>
                    <div style={{ color: theme.colors.muted }}>
                      {t('calendarSuggestedFocusWindow', {
                        window: label,
                        minutes: suggestion.durationMinutes
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleScheduleSuggestion(suggestion)}
                      style={{
                        marginTop: `${theme.spacing.xs}px`,
                        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.primary}`,
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text
                      }}
                    >
                      {t('calendarScheduleSuggestion')}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p style={{ color: theme.colors.muted }}>{t('calendarSuggestedFocusEmpty')}</p>
          )}
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
                  <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, marginTop: `${theme.spacing.sm}px`, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => speak(describeEvent(event))}
                      style={{
                        minHeight: '44px',
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
                        minHeight: '44px',
                        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text
                      }}
                    >
                      {t('editLabel')}
                    </button>
                    {deletingEventId === event.id ? (
                      <>
                        <span style={{ alignSelf: 'center', color: theme.colors.text, fontSize: '0.9rem' }}>
                          {t('calendarConfirmDelete', { title: event.title })}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeEvent(event)}
                          style={{
                            minHeight: '44px',
                            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                            borderRadius: theme.shape.radiusSm,
                            border: `1px solid ${theme.colors.accent}`,
                            backgroundColor: theme.colors.accent,
                            color: theme.colors.background,
                            fontWeight: 600
                          }}
                        >
                          {t('yesLabel')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingEventId(null)}
                          style={{
                            minHeight: '44px',
                            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                            borderRadius: theme.shape.radiusSm,
                            border: `1px solid ${theme.colors.border}`,
                            backgroundColor: theme.colors.surface,
                            color: theme.colors.text
                          }}
                        >
                          {t('cancelLabel')}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingEventId(event.id)}
                        style={{
                          minHeight: '44px',
                          padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                          borderRadius: theme.shape.radiusSm,
                          border: `1px solid ${theme.colors.accent}`,
                          backgroundColor: theme.colors.surface,
                          color: theme.colors.text
                        }}
                      >
                        {t('deleteLabel')}
                      </button>
                    )}
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
