export interface TourStep {
  id: string;
  /** CSS selector via data-tour attribute, or null for center-screen modal */
  target: string | null;
  /** Navigate to this tab before showing the step */
  tab: string | null;
  titleKey: string;
  contentKey: string;
  placement: 'bottom' | 'top' | 'left' | 'right' | 'center';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: null,
    tab: null,
    titleKey: 'tour.welcome.title',
    contentKey: 'tour.welcome.content',
    placement: 'center',
  },
  {
    id: 'nav-bar',
    target: '[data-tour="nav-bar"]',
    tab: 'tasks',
    titleKey: 'tour.navBar.title',
    contentKey: 'tour.navBar.content',
    placement: 'bottom',
  },
  {
    id: 'task-input',
    target: '[data-tour="task-input"]',
    tab: 'tasks',
    titleKey: 'tour.taskInput.title',
    contentKey: 'tour.taskInput.content',
    placement: 'bottom',
  },
  {
    id: 'task-energy',
    target: '[data-tour="task-energy"]',
    tab: 'tasks',
    titleKey: 'tour.taskEnergy.title',
    contentKey: 'tour.taskEnergy.content',
    placement: 'bottom',
  },
  {
    id: 'task-steps',
    target: '[data-tour="task-steps-btn"]',
    tab: 'tasks',
    titleKey: 'tour.taskSteps.title',
    contentKey: 'tour.taskSteps.content',
    placement: 'bottom',
  },
  {
    id: 'task-pomodoro',
    target: '[data-tour="task-pomodoro"]',
    tab: 'tasks',
    titleKey: 'tour.pomodoro.title',
    contentKey: 'tour.pomodoro.content',
    placement: 'top',
  },
  {
    id: 'calendar',
    target: '[data-tour="nav-calendar"]',
    tab: 'calendar',
    titleKey: 'tour.calendar.title',
    contentKey: 'tour.calendar.content',
    placement: 'bottom',
  },
  {
    id: 'budget',
    target: '[data-tour="nav-budget"]',
    tab: 'budget',
    titleKey: 'tour.budget.title',
    contentKey: 'tour.budget.content',
    placement: 'bottom',
  },
  {
    id: 'done',
    target: null,
    tab: null,
    titleKey: 'tour.done.title',
    contentKey: 'tour.done.content',
    placement: 'center',
  },
];
