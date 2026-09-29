import React from 'react';
import { useTranslation } from 'react-i18next';
import BudgetTooltip from '../../../components/atoms/BudgetTooltip';

const HELP = {
  section:
    'Your task hub — add, prioritize, and complete tasks broken into manageable steps. Match tasks to your current energy level so progress feels possible every day.',
  reliability:
    'Tracks how consistently you complete recurring tasks. Use this to spot patterns, identify what is stalling, and build a more reliable routine over time.',
  title: "Name your task concisely but specifically. 'Reply to Maria's project email' beats 'emails'. Specific tasks are easier to start.",
  plannedDate:
    'Pick a date to schedule this task. Tasks with a date appear in your calendar and daily view — helps you plan ahead and reduce last-minute stress.',
  energy:
    'Rate how much mental/physical energy this task needs. Filter by energy to find tasks that match how you feel right now — great for low-energy days.',
  intention:
    'Write a specific when/where implementation intention (e.g. "After lunch I will…"). Research shows this doubles follow-through on intentions.',
  subtasks:
    'Break your task into small, concrete steps. Each step should take under 10 minutes — this makes starting easier and tracks your real progress.',
  timer:
    'The Pomodoro technique uses focused 25-minute sprints with short breaks to protect your concentration and build a sustainable work rhythm.',
} as const;

export type TaskHelpTopic = keyof typeof HELP;

/** Info button with the plain-language help for one part of the Tasks screen (`tooltips.tasks.*`). */
const TaskHelp: React.FC<{ topic: TaskHelpTopic }> = ({ topic }) => {
  const { t } = useTranslation();
  return <BudgetTooltip content={t(`tooltips.tasks.${topic}`, HELP[topic])} />;
};

export default TaskHelp;
