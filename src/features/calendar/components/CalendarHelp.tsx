import React from 'react';
import { useTranslation } from 'react-i18next';
import BudgetTooltip from '../../../components/atoms/BudgetTooltip';

const HELP = {
  section:
    'Your visual timeline — schedule events, convert tasks to time blocks, and see suggestions for when to focus. Putting tasks on a calendar makes them 3× more likely to happen.',
  title: "Give your event a clear name. Include who or what it's for: 'Team standup' or 'Dentist — Dr. Smith'. This appears in your calendar grid.",
  startDate: 'When does this event begin? Setting an exact time blocks it in your calendar and prevents scheduling conflicts.',
  endDate: 'When does this event end? Accurate end times help you see free windows for tasks and avoid back-to-back overload.',
  location: 'Where is this happening? Optional, but useful for travel time reminders and context.',
  description: 'Optional details — agenda items, prep notes, access codes. You will see this when you click the event.',
  taskLink:
    'Connect this event to an existing task. When you complete the event, it can mark the task done too — keeping both lists in sync.',
  reminder: 'Get a notification before the event starts. Especially helpful for appointments that need travel time or preparation.',
  addEvent:
    'Create a new calendar event. Putting tasks on the calendar makes them 3× more likely to happen — this is the step between planning and doing.',
  suggestedFocus:
    'AI-generated windows based on your task list and available time. Accepting a suggestion creates a calendar event — your future self will thank you.',
  tasksToConvert:
    'Tasks without a scheduled time slot. Converting them to calendar events gives each task a dedicated time block — the key difference between a wish and a plan.',
  events:
    'All scheduled events in chronological order. Click an event to edit or delete it. Events linked to tasks keep your task list in sync.',
} as const;

export type CalendarHelpTopic = keyof typeof HELP;

/** Info button with the plain-language help for one part of the Calendar screen (`tooltips.calendar.*`). */
const CalendarHelp: React.FC<{ topic: CalendarHelpTopic }> = ({ topic }) => {
  const { t } = useTranslation();
  return <BudgetTooltip content={t(`tooltips.calendar.${topic}`, HELP[topic])} />;
};

/** An h3 with its help button. */
export const HelpHeading: React.FC<{ topic: CalendarHelpTopic; children: React.ReactNode }> = ({ topic, children }) => (
  <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center' }}>
    {children}
    <CalendarHelp topic={topic} />
  </h3>
);

export default CalendarHelp;
