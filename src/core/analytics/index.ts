/**
 * Lightweight analytics event layer.
 *
 * Queues events to localStorage so they survive page reloads and can be
 * flushed to a real provider (PostHog, Amplitude, Mixpanel) later by
 * swapping the `flush` implementation below.
 *
 * Usage:
 *   import { track } from '../core/analytics';
 *   track('task_completed', { taskId: 42, withSubtasks: true });
 */

export type AnalyticsEvent = {
  name: string;
  props?: Record<string, unknown>;
  ts: number; // epoch ms
  sessionId: string;
};

const SESSION_KEY = 'analytics:sessionId';
const QUEUE_KEY   = 'analytics:queue';
const MAX_QUEUE   = 200;

// ── Session ID (persists for the tab lifetime) ─────────────────────────────

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

// ── Queue helpers ──────────────────────────────────────────────────────────

function readQueue(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(events: AnalyticsEvent[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUE)));
  } catch {
    // Storage full — drop silently.
  }
}

// ── Core track function ────────────────────────────────────────────────────

export function track(name: string, props?: Record<string, unknown>): void {
  const event: AnalyticsEvent = { name, props, ts: Date.now(), sessionId: getSessionId() };

  // In development, log to console for observability.
  if (import.meta.env.DEV) {
    console.debug('[analytics]', name, props ?? '');
  }

  const queue = readQueue();
  queue.push(event);
  writeQueue(queue);

  // TODO: swap flush() below for your real provider, e.g.:
  //   posthog.capture(name, props);
  //   amplitude.track(name, props);
  //   mixpanel.track(name, props);
}

// ── Flush (call periodically or on page hide) ─────────────────────────────

export function flushQueue(): AnalyticsEvent[] {
  const queue = readQueue();
  writeQueue([]);
  return queue;
}

// ── Pre-defined event names (prevents typos) ──────────────────────────────

export const Events = {
  // Lifecycle
  APP_OPEN:                'app_open',
  ONBOARDING_STEP:         'onboarding_step',
  ONBOARDING_COMPLETE:     'onboarding_complete',

  // Tasks
  TASK_CREATED:            'task_created',
  TASK_COMPLETED:          'task_completed',
  TASK_UNCOMPLETED:        'task_uncompleted',
  ALL_TODAY_TASKS_DONE:    'all_today_tasks_done',
  TEMPLATE_SELECTED:       'template_selected',
  FOCUS_SESSION_STARTED:   'focus_session_started',
  FOCUS_SESSION_COMPLETED: 'focus_session_completed',

  // Routines
  ROUTINE_CREATED:         'routine_created',
  ROUTINE_COMPLETED:       'routine_completed',
  ROUTINE_TEMPLATE_USED:   'routine_template_used',

  // Budget
  BUDGET_ACTION:           'budget_action',
  DIAGNOSTIC_RUN:          'diagnostic_run',
  DIAGNOSTIC_APPLIED:      'diagnostic_applied',

  // Social
  SOCIAL_PLAN_CREATED:     'social_plan_created',

  // Gamification
  STREAK_MILESTONE:        'streak_milestone',
  WIN_CARD_SHOWN:          'win_card_shown',
  WIN_CARD_SHARED:         'win_card_shared',
  LEVEL_UP:                'level_up',

  // Retention
  WELCOME_BACK_SHOWN:      'welcome_back_shown',
  WELCOME_BACK_FRESH_START:'welcome_back_fresh_start',
  DAY2_PROMPT_SHOWN:       'day2_prompt_shown',
} as const;
