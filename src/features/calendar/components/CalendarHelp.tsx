import React from 'react';
import { useTranslation } from 'react-i18next';
import BudgetTooltip from '../../../components/atoms/BudgetTooltip';

const HELP = {
  section:
    "Schedule events and block time for tasks. A task with a time slot is easier to start than one waiting for 'later'.",
  title:
    "Give your event a clear name. Include who or what it's for: 'Team standup' or 'Dentist — Dr. Smith'. This appears in your calendar grid.",
  startDate:
    "When does this event begin? Setting an exact time blocks it in your calendar and prevents scheduling conflicts.",
  endDate:
    "When does this event end? Accurate end times help you see free windows for tasks and avoid back-to-back overload.",
  location:
    "Where is this happening? Optional, but useful for travel time reminders and context.",
  description:
    "Optional details — agenda items, prep notes, access codes. You will see this when you click the event.",
  taskLink:
    "Connect this event to an existing task. When you complete the event, it can mark the task done too — keeping both lists in sync.",
  reminder:
    "Get a notification before the event starts. Especially helpful for appointments that need travel time or preparation.",
  addEvent:
    "Create a new calendar event. Giving a task a time slot is the step between planning and doing.",
  suggestedFocus:
    "Based on your open tasks and free time today, these slots are your best windows for focused work. Schedule them now while your intentions are fresh.",
  tasksToConvert:
    "Tasks without a time slot yet. 'Convert to event' gives each task a specific time — turning an intention into a commitment.",
  events:
    "All your scheduled events. Click any event to edit, add a reminder, or link it to a task. Deleting an event never deletes the linked task.",
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
