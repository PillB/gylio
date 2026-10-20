import { useEffect, useState } from 'react';
import useDB, { type Event, type Task } from '../../../core/hooks/useDB';
import type { EventPayload } from '../utils/eventFields';

type ScheduleInput = { title: string; startDate: string; endDate: string; taskId: number };

const logFailure = (action: string) => (error: unknown) => {
  console.error(`Failed to ${action}`, error);
  return false;
};

/**
 * Events and tasks for the Calendar screen. An event's task link is mirrored on
 * the task (`calendarEventId`); deleting an event only clears that link and never
 * deletes the task.
 */
export const useCalendarData = () => {
  const { ready, getEvents, insertEvent, updateEvent, deleteEvent, getTasks, updateTask } = useDB();
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    Promise.all([getEvents(), getTasks()])
      .then(([loadedEvents, loadedTasks]) => {
        setEvents(loadedEvents);
        setTasks(loadedTasks);
      })
      .catch(logFailure('load calendar data'))
      .finally(() => setLoading(false));
  }, [getEvents, getTasks, ready]);

  const setTaskLink = async (taskId: number | null, eventId: number | null) => {
    if (!taskId) return;
    const updated = await updateTask(taskId, { calendarEventId: eventId });
    if (!updated) return;
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, calendarEventId: eventId } : task)));
  };

  const insert = async (payload: EventPayload) => {
    const created = await insertEvent(
      payload.title,
      payload.description,
      payload.startDate,
      payload.endDate,
      payload.location,
      payload.taskId,
      payload.reminderMinutesBefore
    );
    setEvents((prev) => [created, ...prev]);
    await setTaskLink(payload.taskId, created.id);
    return true;
  };

  /** Resolves true once saved, so the form can reset. */
  const createEvent = (payload: EventPayload) => insert(payload).catch(logFailure('add event'));

  /** Quick-schedules a task (from "convert" or a suggestion) as an event linked to it. */
  const scheduleTask = (input: ScheduleInput, action: string) =>
    insert({ ...input, description: null, location: null, reminderMinutesBefore: null }).catch(logFailure(action));

  const saveEvent = async (id: number, payload: EventPayload) => {
    const previousTaskId = events.find((entry) => entry.id === id)?.taskId ?? null;
    try {
      const updated = await updateEvent(id, payload);
      if (!updated) return false;
      setEvents((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
      if (previousTaskId !== payload.taskId) await setTaskLink(previousTaskId, null);
      await setTaskLink(payload.taskId, updated.id);
      return true;
    } catch (error) {
      return logFailure('update event')(error);
    }
  };

  const removeEvent = async (event: Event) => {
    try {
      const deleted = await deleteEvent(event.id);
      if (!deleted) return false;
      setEvents((prev) => prev.filter((entry) => entry.id !== event.id));
      await setTaskLink(event.taskId, null);
      return true;
    } catch (error) {
      return logFailure('delete event')(error);
    }
  };

  return { events, tasks, loading, createEvent, scheduleTask, saveEvent, removeEvent };
};

export type CalendarData = ReturnType<typeof useCalendarData>;
