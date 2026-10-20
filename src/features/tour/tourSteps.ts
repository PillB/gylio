export interface TourStep {
  id: string;
  /** CSS selector via data-tour attribute, or null for center-screen modal */
  target: string | null;
  /** Navigate to this tab before showing the step */
  tab: string | null;
  titleKey: string;
  contentKey: string;
  placement: 'bottom' | 'top' | 'left' | 'right' | 'center';
  /** When true, shows a "Try it" badge — the highlighted element is live and interactive */
  interactive?: boolean;
}

export interface TourFlow {
  id: string;
  nameKey: string;
  descKey: string;
  durationKey: string;
  emoji: string;
  steps: TourStep[];
}

// ─── Overview flow (quick 9-step tour of the whole app) ───────────────────────

export const OVERVIEW_FLOW: TourFlow = {
  id: 'overview',
  nameKey: 'tour.flows.overview.name',
  descKey: 'tour.flows.overview.desc',
  durationKey: 'tour.flows.overview.duration',
  emoji: '🗺️',
  steps: [
    {
      id: 'overview-welcome',
      target: null,
      tab: null,
      titleKey: 'tour.welcome.title',
      contentKey: 'tour.welcome.content',
      placement: 'center',
    },
    {
      id: 'overview-nav',
      target: '[data-tour="nav-bar"]',
      tab: 'tasks',
      titleKey: 'tour.navBar.title',
      contentKey: 'tour.navBar.content',
      placement: 'bottom',
    },
    {
      id: 'overview-tasks',
      target: '[data-tour="task-input"]',
      tab: 'tasks',
      titleKey: 'tour.taskInput.title',
      contentKey: 'tour.taskInput.content',
      placement: 'bottom',
    },
    {
      id: 'overview-calendar',
      target: '[data-tour="calendar-grid"]',
      tab: 'calendar',
      titleKey: 'tour.calendar.title',
      contentKey: 'tour.calendar.content',
      placement: 'bottom',
    },
    {
      id: 'overview-budget',
      target: '[data-tour="budget-summary"]',
      tab: 'budget',
      titleKey: 'tour.budget.title',
      contentKey: 'tour.budget.content',
      placement: 'bottom',
    },
    {
      id: 'overview-social',
      target: '[data-tour="social-relationship"], [data-tour="premium-gate"]',
      tab: 'social',
      titleKey: 'tour.social.title',
      contentKey: 'tour.social.content',
      placement: 'bottom',
    },
    {
      id: 'overview-routines',
      target: '[data-tour="routines-form"], [data-tour="premium-gate"]',
      tab: 'routines',
      titleKey: 'tour.routines.title',
      contentKey: 'tour.routines.content',
      placement: 'bottom',
    },
    {
      id: 'overview-rewards',
      target: '[data-tour="rewards-toggle"], [data-tour="premium-gate"]',
      tab: 'rewards',
      titleKey: 'tour.rewards.title',
      contentKey: 'tour.rewards.content',
      placement: 'bottom',
    },
    {
      id: 'overview-done',
      target: null,
      tab: null,
      titleKey: 'tour.done.title',
      contentKey: 'tour.done.content',
      placement: 'center',
    },
  ],
};

// ─── Tasks interactive flow ────────────────────────────────────────────────────

export const TASKS_FLOW: TourFlow = {
  id: 'tasks',
  nameKey: 'tour.flows.tasks.name',
  descKey: 'tour.flows.tasks.desc',
  durationKey: 'tour.flows.tasks.duration',
  emoji: '✅',
  steps: [
    {
      id: 'tasks-welcome',
      target: null,
      tab: 'tasks',
      titleKey: 'tour.tasksFlow.welcome.title',
      contentKey: 'tour.tasksFlow.welcome.content',
      placement: 'center',
    },
    {
      id: 'tasks-templates',
      target: '[data-tour="task-template-btn"]',
      tab: 'tasks',
      titleKey: 'tour.tasksFlow.templates.title',
      contentKey: 'tour.tasksFlow.templates.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'tasks-title',
      target: '[data-tour="task-input"]',
      tab: 'tasks',
      titleKey: 'tour.tasksFlow.title.title',
      contentKey: 'tour.tasksFlow.title.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'tasks-date',
      target: '[data-tour="task-date"]',
      tab: 'tasks',
      titleKey: 'tour.tasksFlow.date.title',
      contentKey: 'tour.tasksFlow.date.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'tasks-energy',
      target: '[data-tour="task-energy"]',
      tab: 'tasks',
      titleKey: 'tour.tasksFlow.energy.title',
      contentKey: 'tour.tasksFlow.energy.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'tasks-submit',
      target: '[data-tour="task-submit"]',
      tab: 'tasks',
      titleKey: 'tour.tasksFlow.submit.title',
      contentKey: 'tour.tasksFlow.submit.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'tasks-done',
      target: null,
      tab: null,
      titleKey: 'tour.tasksFlow.done.title',
      contentKey: 'tour.tasksFlow.done.content',
      placement: 'center',
    },
  ],
};

// ─── Calendar interactive flow ────────────────────────────────────────────────

export const CALENDAR_FLOW: TourFlow = {
  id: 'calendar',
  nameKey: 'tour.flows.calendar.name',
  descKey: 'tour.flows.calendar.desc',
  durationKey: 'tour.flows.calendar.duration',
  emoji: '📅',
  steps: [
    {
      id: 'cal-welcome',
      target: null,
      tab: 'calendar',
      titleKey: 'tour.calendarFlow.welcome.title',
      contentKey: 'tour.calendarFlow.welcome.content',
      placement: 'center',
    },
    {
      id: 'cal-grid',
      target: '[data-tour="calendar-grid"]',
      tab: 'calendar',
      titleKey: 'tour.calendarFlow.grid.title',
      contentKey: 'tour.calendarFlow.grid.content',
      placement: 'bottom',
    },
    {
      id: 'cal-add',
      target: '[data-tour="calendar-add-btn"]',
      tab: 'calendar',
      titleKey: 'tour.calendarFlow.add.title',
      contentKey: 'tour.calendarFlow.add.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'cal-form',
      target: '[data-tour="calendar-add-section"]',
      tab: 'calendar',
      titleKey: 'tour.calendarFlow.form.title',
      contentKey: 'tour.calendarFlow.form.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'cal-done',
      target: null,
      tab: null,
      titleKey: 'tour.calendarFlow.done.title',
      contentKey: 'tour.calendarFlow.done.content',
      placement: 'center',
    },
  ],
};

// ─── Budget interactive flow ──────────────────────────────────────────────────

export const BUDGET_FLOW: TourFlow = {
  id: 'budget',
  nameKey: 'tour.flows.budget.name',
  descKey: 'tour.flows.budget.desc',
  durationKey: 'tour.flows.budget.duration',
  emoji: '💰',
  steps: [
    {
      id: 'budget-welcome',
      target: null,
      tab: 'budget',
      titleKey: 'tour.budgetFlow.welcome.title',
      contentKey: 'tour.budgetFlow.welcome.content',
      placement: 'center',
    },
    {
      id: 'budget-month',
      target: '[data-tour="budget-month"]',
      tab: 'budget',
      titleKey: 'tour.budgetFlow.month.title',
      contentKey: 'tour.budgetFlow.month.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'budget-income',
      target: '[data-tour="budget-income"]',
      tab: 'budget',
      titleKey: 'tour.budgetFlow.income.title',
      contentKey: 'tour.budgetFlow.income.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'budget-categories',
      target: '[data-tour="budget-categories"]',
      tab: 'budget',
      titleKey: 'tour.budgetFlow.categories.title',
      contentKey: 'tour.budgetFlow.categories.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'budget-transactions',
      target: '[data-tour="budget-transactions"]',
      tab: 'budget',
      titleKey: 'tour.budgetFlow.transactions.title',
      contentKey: 'tour.budgetFlow.transactions.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'budget-done',
      target: null,
      tab: null,
      titleKey: 'tour.budgetFlow.done.title',
      contentKey: 'tour.budgetFlow.done.content',
      placement: 'center',
    },
  ],
};

// ─── Settings interactive flow ────────────────────────────────────────────────

export const SETTINGS_FLOW: TourFlow = {
  id: 'settings',
  nameKey: 'tour.flows.settings.name',
  descKey: 'tour.flows.settings.desc',
  durationKey: 'tour.flows.settings.duration',
  emoji: '⚙️',
  steps: [
    {
      id: 'settings-welcome',
      target: null,
      tab: 'settings',
      titleKey: 'tour.settingsFlow.welcome.title',
      contentKey: 'tour.settingsFlow.welcome.content',
      placement: 'center',
    },
    {
      id: 'settings-theme',
      target: '[data-tour="settings-theme"]',
      tab: 'settings',
      titleKey: 'tour.settingsFlow.theme.title',
      contentKey: 'tour.settingsFlow.theme.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'settings-gamification',
      target: '[data-tour="settings-gamification"]',
      tab: 'settings',
      titleKey: 'tour.settingsFlow.gamification.title',
      contentKey: 'tour.settingsFlow.gamification.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'settings-tour',
      target: '[data-tour="settings-tour"]',
      tab: 'settings',
      titleKey: 'tour.settingsFlow.tour.title',
      contentKey: 'tour.settingsFlow.tour.content',
      placement: 'bottom',
    },
    {
      id: 'settings-done',
      target: null,
      tab: null,
      titleKey: 'tour.settingsFlow.done.title',
      contentKey: 'tour.settingsFlow.done.content',
      placement: 'center',
    },
  ],
};

// ─── Social interactive flow ──────────────────────────────────────────────────

export const SOCIAL_FLOW: TourFlow = {
  id: 'social',
  nameKey: 'tour.flows.social.name',
  descKey: 'tour.flows.social.desc',
  durationKey: 'tour.flows.social.duration',
  emoji: '🤝',
  steps: [
    {
      id: 'social-welcome',
      target: null,
      tab: 'social',
      titleKey: 'tour.socialFlow.welcome.title',
      contentKey: 'tour.socialFlow.welcome.content',
      placement: 'center',
    },
    {
      id: 'social-relationship',
      target: '[data-tour="social-relationship"], [data-tour="premium-gate"]',
      tab: 'social',
      titleKey: 'tour.socialFlow.relationship.title',
      contentKey: 'tour.socialFlow.relationship.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'social-form',
      target: '[data-tour="social-form"], [data-tour="premium-gate"]',
      tab: 'social',
      titleKey: 'tour.socialFlow.form.title',
      contentKey: 'tour.socialFlow.form.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'social-plans-list',
      target: '[data-tour="social-plans-list"], [data-tour="premium-gate"]',
      tab: 'social',
      titleKey: 'tour.socialFlow.list.title',
      contentKey: 'tour.socialFlow.list.content',
      placement: 'top',
    },
    {
      id: 'social-done',
      target: null,
      tab: null,
      titleKey: 'tour.socialFlow.done.title',
      contentKey: 'tour.socialFlow.done.content',
      placement: 'center',
    },
  ],
};

// ─── Routines interactive flow ────────────────────────────────────────────────

export const ROUTINES_FLOW: TourFlow = {
  id: 'routines',
  nameKey: 'tour.flows.routines.name',
  descKey: 'tour.flows.routines.desc',
  durationKey: 'tour.flows.routines.duration',
  emoji: '🔁',
  steps: [
    {
      id: 'routines-welcome',
      target: null,
      tab: 'routines',
      titleKey: 'tour.routinesFlow.welcome.title',
      contentKey: 'tour.routinesFlow.welcome.content',
      placement: 'center',
    },
    {
      id: 'routines-gallery',
      target: '[data-tour="routines-gallery"], [data-tour="premium-gate"]',
      tab: 'routines',
      titleKey: 'tour.routinesFlow.gallery.title',
      contentKey: 'tour.routinesFlow.gallery.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'routines-form',
      target: '[data-tour="routines-form"], [data-tour="premium-gate"]',
      tab: 'routines',
      titleKey: 'tour.routinesFlow.form.title',
      contentKey: 'tour.routinesFlow.form.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'routines-list',
      target: '[data-tour="routines-list"], [data-tour="premium-gate"]',
      tab: 'routines',
      titleKey: 'tour.routinesFlow.list.title',
      contentKey: 'tour.routinesFlow.list.content',
      placement: 'top',
    },
    {
      id: 'routines-done',
      target: null,
      tab: null,
      titleKey: 'tour.routinesFlow.done.title',
      contentKey: 'tour.routinesFlow.done.content',
      placement: 'center',
    },
  ],
};

// ─── Rewards interactive flow ─────────────────────────────────────────────────

export const REWARDS_FLOW: TourFlow = {
  id: 'rewards',
  nameKey: 'tour.flows.rewards.name',
  descKey: 'tour.flows.rewards.desc',
  durationKey: 'tour.flows.rewards.duration',
  emoji: '🏆',
  steps: [
    {
      id: 'rewards-welcome',
      target: null,
      tab: 'rewards',
      titleKey: 'tour.rewardsFlow.welcome.title',
      contentKey: 'tour.rewardsFlow.welcome.content',
      placement: 'center',
    },
    {
      id: 'rewards-toggle',
      target: '[data-tour="rewards-toggle"], [data-tour="premium-gate"]',
      tab: 'rewards',
      titleKey: 'tour.rewardsFlow.toggle.title',
      contentKey: 'tour.rewardsFlow.toggle.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'rewards-progress',
      target: '[data-tour="rewards-progress"], [data-tour="premium-gate"]',
      tab: 'rewards',
      titleKey: 'tour.rewardsFlow.progress.title',
      contentKey: 'tour.rewardsFlow.progress.content',
      placement: 'bottom',
    },
    {
      id: 'rewards-form',
      target: '[data-tour="rewards-form"], [data-tour="premium-gate"]',
      tab: 'rewards',
      titleKey: 'tour.rewardsFlow.form.title',
      contentKey: 'tour.rewardsFlow.form.content',
      placement: 'bottom',
      interactive: true,
    },
    {
      id: 'rewards-done',
      target: null,
      tab: null,
      titleKey: 'tour.rewardsFlow.done.title',
      contentKey: 'tour.rewardsFlow.done.content',
      placement: 'center',
    },
  ],
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const ALL_FLOWS: TourFlow[] = [
  OVERVIEW_FLOW,
  TASKS_FLOW,
  CALENDAR_FLOW,
  BUDGET_FLOW,
  SOCIAL_FLOW,
  ROUTINES_FLOW,
  REWARDS_FLOW,
  SETTINGS_FLOW,
];

export const FLOW_MAP: Record<string, TourFlow> = Object.fromEntries(
  ALL_FLOWS.map((f) => [f.id, f])
);

/** Backward-compat: points at the overview steps */
export const TOUR_STEPS = OVERVIEW_FLOW.steps;

/** The five steps kept by the `overview5` experiment: the free core (tasks, calendar, budget). */
const OVERVIEW_SHORT_IDS = ['overview-welcome', 'overview-tasks', 'overview-calendar', 'overview-budget', 'overview-done'];

export type TourLength = 'overview9' | 'overview5';

/** Steps for a flow; only the overview flow has a short variant. */
export function stepsForFlow(flowId: string, length: TourLength = 'overview9'): TourStep[] {
  const flow = FLOW_MAP[flowId] ?? OVERVIEW_FLOW;
  if (flow.id !== 'overview' || length !== 'overview5') return flow.steps;
  return flow.steps.filter((step) => OVERVIEW_SHORT_IDS.includes(step.id));
}
