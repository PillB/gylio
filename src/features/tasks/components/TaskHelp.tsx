import React from 'react';
import { useTranslation } from 'react-i18next';
import BudgetTooltip from '../../../components/atoms/BudgetTooltip';

const HELP = {
  section:
    "Your central task hub — everything you need to do, broken into steps you can actually start. Add anything here, then check it off when done.",
  reliability:
    "Tracks how consistently your recurring tasks are being auto-generated. If instances are being missed, you can rebuild them here.",
  title:
    "Give your task a clear, specific name. The more concrete the title, the easier it is to start — 'Email Dr Santos' beats 'Emails' every time.",
  plannedDate:
    "Giving a task a day makes it easier to start, and it shows up in your calendar and daily view. Even 'today' works.",
  energy:
    "Filter tasks by the mental fuel they need right now. Tiny/Low for rough days. Medium/High when you're in the zone. Match effort to capacity.",
  intention:
    "Deciding when and where you'll do it (\"after lunch, at my desk\") helps many people follow through. A review of 94 studies found a medium-to-large effect.",
  subtasks:
    "Break a big task into small steps. Starting is often the hardest part, so make the first step small enough to begin right away.",
  timer:
    "Pomodoro sprints: focused work, then a short break. A timer with a clear end can make it easier to start.",
} as const;

export type TaskHelpTopic = keyof typeof HELP;

/** Info button with the plain-language help for one part of the Tasks screen (`tooltips.tasks.*`). */
const TaskHelp: React.FC<{ topic: TaskHelpTopic }> = ({ topic }) => {
  const { t } = useTranslation();
  return <BudgetTooltip content={t(`tooltips.tasks.${topic}`, HELP[topic])} />;
};

export default TaskHelp;
