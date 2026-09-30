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
  /** Unique per event, so a re-sent upload is stored once on the server. */
  id?: string;
  /** Whether someone was signed in when it happened (the upload may run before sign-in loads). */
  signedIn?: boolean;
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

function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function isSignedIn(): boolean {
  try {
    return Boolean((window as unknown as { Clerk?: { user?: unknown } }).Clerk?.user);
  } catch {
    return false;
  }
}

export function track(name: string, props?: Record<string, unknown>): void {
  const event: AnalyticsEvent = {
    id: newEventId(),
    signedIn: isSignedIn(),
    name,
    props,
    ts: Date.now(),
    sessionId: getSessionId(),
  };

  // In development, log to console for observability.
  if (import.meta.env.DEV) {
    console.debug('[analytics]', name, props ?? '');
  }

  const queue = readQueue();
  queue.push(event);
  writeQueue(queue);

  // Delivery: upload.ts drains this queue to the Gylio API (POST
  // /api/analytics/events) every 20s and on page hide when the build has a
  // backend (VITE_BILLING_ENABLED=true). Static previews keep events local.
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
  APP_OPEN:                        'app_open',
  ONBOARDING_STEP:                 'onboarding_step',
  ONBOARDING_COMPLETE:             'onboarding_complete',

  // Tasks
  TASK_CREATED:                    'task_created',
  TASK_COMPLETED:                  'task_completed',
  TASK_UNCOMPLETED:                'task_uncompleted',
  ALL_TODAY_TASKS_DONE:            'all_today_tasks_done',
  TEMPLATE_SELECTED:               'template_selected',
  FOCUS_SESSION_STARTED:           'focus_session_started',
  FOCUS_SESSION_COMPLETED:         'focus_session_completed',

  // Routines
  ROUTINE_CREATED:                 'routine_created',
  ROUTINE_COMPLETED:               'routine_completed',
  ROUTINE_TEMPLATE_USED:           'routine_template_used',

  // Budget
  BUDGET_ACTION:                   'budget_action',
  DIAGNOSTIC_RUN:                  'diagnostic_run',
  DIAGNOSTIC_APPLIED:              'diagnostic_applied',

  // Social
  SOCIAL_PLAN_CREATED:             'social_plan_created',

  // Gamification
  STREAK_MILESTONE:                'streak_milestone',
  WIN_CARD_SHOWN:                  'win_card_shown',
  WIN_CARD_SHARED:                 'win_card_shared',
  LEVEL_UP:                        'level_up',

  // Retention
  WELCOME_BACK_SHOWN:              'welcome_back_shown',
  WELCOME_BACK_FRESH_START:        'welcome_back_fresh_start',
  DAY2_PROMPT_SHOWN:               'day2_prompt_shown',

  // Recurring reliability
  RECURRING_EXPECTED_MISSING:      'recurring_expected_missing',
  RECURRING_REPAIRED:              'recurring_repaired',
  RECURRING_RELIABILITY_VIEWED:    'recurring_reliability_viewed',
  RECURRING_MANUAL_CHECK_TRIGGERED:'recurring_manual_check_triggered',

  // Upgrade / subscription
  UPGRADE_PROMPT_VIEWED:           'upgrade_prompt_viewed',
  UPGRADE_CLICKED:                 'upgrade_clicked',
  TRY_ONCE_USED:                   'try_once_used',

  // Streak recovery
  STREAK_RECOVERY_STARTED:         'streak_recovery_started',
  STREAK_RECOVERY_COMPLETED:       'streak_recovery_completed',

  // Budget data freshness
  BUDGET_DATA_STALE_WARNING_SHOWN: 'budget_data_stale_warning_shown',
  BUDGET_RECONCILIATION_CONFIRMED: 'budget_reconciliation_confirmed',

  // Daily command center
  DAILY_MODE_ENABLED:              'daily_mode_enabled',
  DAILY_MODE_TASK_COMPLETED:       'daily_mode_task_completed',
  DAILY_MODE_EXITED:               'daily_mode_exited',
} as const;
