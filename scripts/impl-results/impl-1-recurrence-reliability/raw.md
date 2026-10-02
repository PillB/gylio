---FILE: src/core/analytics/index.ts---
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
} as const;
---END FILE---

---FILE: src/features/recurring/recurringMeta.ts---
/**
 * Persistent store for recurring-task reliability metadata.
 *
 * Kept in localStorage under 'gylio:recurringMeta' so it survives page
 * refreshes without requiring DB migrations.
 *
 * Shape:
 *   {
 *     [taskId: string]: {
 *       lastGeneratedDate: string | null;  // YYYY-MM-DD
 *       nextExpectedDate:  string | null;  // YYYY-MM-DD
 *       failureCount:      number;
 *       lastCheckedAt:     number | null;  // epoch ms
 *     }
 *   }
 */

const STORAGE_KEY = 'gylio:recurringMeta';

export interface RecurringTaskMeta {
  lastGeneratedDate: string | null;
  nextExpectedDate: string | null;
  failureCount: number;
  lastCheckedAt: number | null;
}

export type RecurringMetaStore = Record<string, RecurringTaskMeta>;

export const DEFAULT_META: RecurringTaskMeta = {
  lastGeneratedDate: null,
  nextExpectedDate: null,
  failureCount: 0,
  lastCheckedAt: null,
};

// ---------------------------------------------------------------------------
// Low-level read / write
// ---------------------------------------------------------------------------

export function readMeta(): RecurringMetaStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as RecurringMetaStore;
  } catch {
    return {};
  }
}

export function writeMeta(store: RecurringMetaStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded or private-browsing restriction — fail silently.
  }
}

// ---------------------------------------------------------------------------
// Per-task helpers
// ---------------------------------------------------------------------------

export function getTaskMeta(taskId: string): RecurringTaskMeta {
  const store = readMeta();
  return store[taskId] ?? { ...DEFAULT_META };
}

export function setTaskMeta(
  taskId: string,
  patch: Partial<RecurringTaskMeta>,
): void {
  const store = readMeta();
  const existing = store[taskId] ?? { ...DEFAULT_META };
  store[taskId] = { ...existing, ...patch };
  writeMeta(store);
}

export function clearTaskMeta(taskId: string): void {
  const store = readMeta();
  delete store[taskId];
  writeMeta(store);
}

export function clearAllMeta(): void {
  writeMeta({});
}

// ---------------------------------------------------------------------------
// Semantic helpers
// ---------------------------------------------------------------------------

/**
 * Record a successful generation for a task.
 * nextExpectedDate is computed by the caller (recurrence engine).
 */
export function recordGeneration(
  taskId: string,
  generatedDate: string,
  nextExpectedDate: string | null,
): void {
  setTaskMeta(taskId, {
    lastGeneratedDate: generatedDate,
    nextExpectedDate,
    lastCheckedAt: Date.now(),
  });
}

/**
 * Record a failure for a task (expected instance was missing).
 */
export function recordFailure(taskId: string): void {
  const meta = getTaskMeta(taskId);
  setTaskMeta(taskId, {
    failureCount: meta.failureCount + 1,
    lastCheckedAt: Date.now(),
  });
}

/**
 * Reset failure count for a task (call after a successful repair).
 */
export function resetFailures(taskId: string): void {
  setTaskMeta(taskId, { failureCount: 0, lastCheckedAt: Date.now() });
}

/**
 * Stamp the lastCheckedAt timestamp on every tracked task without
 * changing any other field.
 */
export function stampAllChecked(taskIds: string[]): void {
  const now = Date.now();
  const store = readMeta();
  for (const id of taskIds) {
    const existing = store[id] ?? { ...DEFAULT_META };
    store[id] = { ...existing, lastCheckedAt: now };
  }
  writeMeta(store);
}
---END FILE---

---FILE: src/features/recurring/useRecurringReliability.ts---
/**
 * useRecurringReliability
 *
 * Core hook that:
 *  1. Reads all tasks from the DB and filters to recurring ones.
 *  2. Compares each task's nextExpectedDate against today.
 *  3. Reports missing instances via toast + analytics.
 *  4. Exposes repair() to re-insert missing today instances.
 *  5. Re-runs automatically when todayKey changes (midnight crossover).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../../core/hooks/useDB';
import { useToast } from '../../core/context/ToastContext';
import { track, Events } from '../../core/analytics';
import { getLocalDateKey } from '../../core/hooks/useClock';
import {
  DEFAULT_META,
  readMeta,
  writeMeta,
  recordFailure,
  stampAllChecked,
  type RecurringMetaStore,
  type RecurringTaskMeta,
} from './recurringMeta';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RecurringTaskRow {
  id: string;
  title: string;
  recurrence: string;
  recurrenceRule?: string;
  meta: RecurringTaskMeta;
}

export interface ReliabilityState {
  rows: RecurringTaskRow[];
  lastGlobalCheckAt: number | null;
  isChecking: boolean;
  isRepairing: boolean;
}

// ---------------------------------------------------------------------------
// Internal date helpers
// ---------------------------------------------------------------------------

function addDays(dateKey: string, n: number): string {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function computeNextExpected(
  recurrence: string,
  lastGenerated: string | null,
  today: string,
): string {
  if (!lastGenerated) return today;
  const lower = (recurrence ?? '').toLowerCase();
  if (lower === 'daily') return addDays(lastGenerated, 1);
  if (lower === 'weekly') return addDays(lastGenerated, 7);
  if (lower === 'monthly') {
    const d = new Date(`${lastGenerated}T00:00:00`);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }
  // Fallback: treat as daily
  return addDays(lastGenerated, 1);
}

function deriveLastGlobalCheck(store: RecurringMetaStore): number | null {
  let latest: number | null = null;
  for (const meta of Object.values(store)) {
    if (meta.lastCheckedAt !== null) {
      if (latest === null || meta.lastCheckedAt > latest) {
        latest = meta.lastCheckedAt;
      }
    }
  }
  return latest;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRecurringReliability(todayKey?: string) {
  const { t } = useTranslation();

  // useDB may expose getTasks / insertTask at the top level or nested —
  // destructure defensively so the hook compiles against the real shape.
  const db = useDB() as unknown as {
    ready?: boolean;
    getTasks?: (filter?: Record<string, unknown>) => Promise<unknown[]>;
    insertTask?: (task: Record<string, unknown>) => Promise<unknown>;
    // Some implementations expose tasks array + addTask instead
    tasks?: unknown[];
    addTask?: (task: Record<string, unknown>) => Promise<unknown>;
  };

  const { showToast } = useToast() as {
    showToast: (msg: string, type?: string) => void;
  };

  const today = todayKey ?? getLocalDateKey(new Date());

  const [state, setState] = useState<ReliabilityState>({
    rows: [],
    lastGlobalCheckAt: null,
    isChecking: false,
    isRepairing: false,
  });

  // Prevent duplicate checks on the same calendar day
  const lastCheckDateRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // Resolve DB access methods — normalise the two common shapes
  // ---------------------------------------------------------------------------
  const fetchAllTasks = useCallback(async (): Promise<
    Record<string, unknown>[]
  > => {
    if (typeof db.getTasks === 'function') {
      const result = await db.getTasks({});
      return result as Record<string, unknown>[];
    }
    // Fallback: use the tasks array already loaded in context
    if (Array.isArray(db.tasks)) {
      return db.tasks as Record<string, unknown>[];
    }
    return [];
  }, [db]);

  const persistTask = useCallback(
    async (task: Record<string, unknown>): Promise<void> => {
      if (typeof db.insertTask === 'function') {
        await db.insertTask(task);
      } else if (typeof db.addTask === 'function') {
        await db.addTask(task);
      }
      // If neither is available, silently skip — repair degrades gracefully.
    },
    [db],
  );

  const dbReady: boolean =
    db.ready !== undefined
      ? Boolean(db.ready)
      : typeof db.getTasks === 'function' || Array.isArray(db.tasks);

  // ---------------------------------------------------------------------------
  // Build rows from raw task list + persisted meta
  // ---------------------------------------------------------------------------
  const buildRows = useCallback(
    (allTasks: Record<string, unknown>[]): RecurringTaskRow[] => {
      const store = readMeta();
      const rows: RecurringTaskRow[] = [];

      for (const task of allTasks) {
        const recurrence = String(task.recurrence ?? '');
        if (!recurrence || recurrence === 'none') continue;

        const id = String(task.id ?? (task as Record<string, unknown>)._id ?? '');
        if (!id) continue;

        const existingMeta: RecurringTaskMeta = store[id] ?? { ...DEFAULT_META };

        const nextExpectedDate =
          existingMeta.nextExpectedDate ??
          computeNextExpected(recurrence, existingMeta.lastGeneratedDate, today);

        rows.push({
          id,
          title: String(task.title ?? ''),
          recurrence,
          recurrenceRule: task.recurrenceRule
            ? String(task.recurrenceRule)
            : undefined,
          meta: { ...existingMeta, nextExpectedDate },
        });
      }

      return rows;
    },
    [today],
  );

  // ---------------------------------------------------------------------------
  // Determine whether a today-instance exists for a recurring task
  // ---------------------------------------------------------------------------
  function instanceExistsForToday(
    allTasks: Record<string, unknown>[],
    row: RecurringTaskRow,
    todayStr: string,
  ): boolean {
    return allTasks.some((t) => {
      const taskDate = String(
        t.dueDate ?? t.date ?? t.plannedDate ?? '',
      ).slice(0, 10);
      if (taskDate !== todayStr) return false;

      // Match by parentId (generated child) or same id (single-record pattern)
      const parentId = String(t.parentId ?? '');
      const taskId = String(t.id ?? (t as Record<string, unknown>)._id ?? '');
      return parentId === row.id || taskId === row.id;
    });
  }

  // ---------------------------------------------------------------------------
  // Core reliability check
  // ---------------------------------------------------------------------------
  const runCheck = useCallback(
    async (silent = false) => {
      if (!dbReady) return;

      setState((s) => ({ ...s, isChecking: true }));

      try {
        const allTasks = await fetchAllTasks();
        const rows = buildRows(allTasks);
        const store = readMeta();
        const missingIds: string[] = [];

        for (const row of rows) {
          const expected = row.meta.nextExpectedDate;
          // Skip if not yet due
          if (!expected || expected > today) continue;

          if (!instanceExistsForToday(allTasks, row, today)) {
            missingIds.push(row.id);
            recordFailure(row.id);
            track(Events.RECURRING_EXPECTED_MISSING, {
              taskId: row.id,
              title: row.title,
              expectedDate: expected,
            });
          } else {
            // Mark as successfully present — advance the window
            const meta = store[row.id] ?? { ...DEFAULT_META };
            store[row.id] = {
              ...meta,
              lastGeneratedDate: today,
              nextExpectedDate: computeNextExpected(row.recurrence, today, today),
              lastCheckedAt: Date.now(),
            };
          }
        }

        writeMeta(store);

        if (missingIds.length > 0 && !silent) {
          showToast(
            t(
              'recurring.missingWarning',
              '{{count}} recurring task(s) expected today are missing. Use "Rebuild" to fix.',
            ).replace('{{count}}', String(missingIds.length)),
            'warning',
          );
        }

        stampAllChecked(rows.map((r) => r.id));

        const freshStore = readMeta();
        const lastGlobalCheckAt = deriveLastGlobalCheck(freshStore);
        const freshRows = buildRows(allTasks);

        lastCheckDateRef.current = today;
        setState({
          rows: freshRows,
          lastGlobalCheckAt,
          isChecking: false,
          isRepairing: false,
        });
      } catch (err) {
        console.error('[useRecurringReliability] check failed', err);
        setState((s) => ({ ...s, isChecking: false }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dbReady, fetchAllTasks, buildRows, today, showToast, t],
  );

  // ---------------------------------------------------------------------------
  // Repair: re-insert missing today instances and reset failure counts
  // ---------------------------------------------------------------------------
  const repair = useCallback(async () => {
    if (!dbReady) return;
    setState((s) => ({ ...s, isRepairing: true }));

    try {
      const allTasks = await fetchAllTasks();
      const rows = buildRows(allTasks);
      const store = readMeta();
      let repairedCount = 0;

      for (const row of rows) {
        const expected = row.meta.nextExpectedDate;
        if (!expected || expected > today) continue;

        if (!instanceExistsForToday(allTasks, row, today)) {
          await persistTask({
            title: row.title,
            parentId: row.id,
            recurrence: row.recurrence,
            dueDate: today,
            completed: false,
            createdAt: new Date().toISOString(),
          });
          repairedCount++;
        }

        // Reset failure record regardless, to clear stale badge counts
        store[row.id] = {
          ...(store[row.id] ?? { ...DEFAULT_META }),
          failureCount: 0,
          lastGeneratedDate: today,
          nextExpectedDate: computeNextExpected(row.recurrence, today, today),
          lastCheckedAt: Date.now(),
        };
      }

      writeMeta(store);

      track(Events.RECURRING_REPAIRED, { repairedCount, date: today });

      // Refresh state silently after repair
      await runCheck(true);
    } catch (err) {
      console.error('[useRecurringReliability] repair failed', err);
      setState((s) => ({ ...s, isRepairing: false }));
    }
  }, [dbReady, fetchAllTasks, buildRows, persistTask, today, runCheck]);

  // ---------------------------------------------------------------------------
  // Mount: restore persisted meta + run initial check
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!dbReady) return;
    const store = readMeta();
    const lastGlobalCheckAt = deriveLastGlobalCheck(store);
    setState((s) => ({ ...s, lastGlobalCheckAt }));
    runCheck(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbReady]);

  // ---------------------------------------------------------------------------
  // Midnight crossover: re-check when the calendar day changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!dbReady) return;
    if (lastCheckDateRef.current === today) return;
    runCheck(false);
  }, [today, dbReady, runCheck]);

  return {
    ...state,
    today,
    runCheck: useCallback(() => runCheck(false), [runCheck]),
    repair,
  };
}
---END FILE---

---FILE: src/features/recurring/RecurringReliabilityPanel.tsx---
/**
 * RecurringReliabilityPanel
 *
 * Displays a reliability dashboard for recurring tasks:
 *  - Per-task rows: title | recurrence | last generated | next expected | failure badge
 *  - "Check now" and "Rebuild recurring instances" action buttons
 *  - Last-checked timestamp footer
 *  - Empty state when no recurring tasks exist
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import { track, Events } from '../../core/analytics';
import type { ReliabilityState, RecurringTaskRow } from './useRecurringReliability';

// ---------------------------------------------------------------------------
// Column-header labels row (aria-hidden, purely visual)
// ---------------------------------------------------------------------------

function ColumnHeaders({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  const { t } = useTranslation();
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr repeat(3, auto)',
        gap: `0 ${theme.spacing.md}px`,
        padding: `0 ${theme.spacing.sm}px`,
        fontSize: '0.72rem',
        fontWeight: 700,
        color: theme.colors.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '4px',
      }}
    >
      <span>{t('recurring.colTask', 'Task')}</span>
      <span style={{ textAlign: 'right' }}>{t('recurring.colLastGen', 'Last gen.')}</span>
      <span style={{ textAlign: 'right' }}>{t('recurring.colNextExp', 'Next exp.')}</span>
      <span style={{ textAlign: 'right' }}>{t('recurring.colFailures', 'Fails')}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single task row
// ---------------------------------------------------------------------------

interface RowProps {
  row: RecurringTaskRow;
  theme: ReturnType<typeof useTheme>['theme'];
}

function TaskRow({ row, theme }: RowProps) {
  const { t } = useTranslation();
  const hasFailures = row.meta.failureCount > 0;

  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr repeat(3, auto)',
        gap: `0 ${theme.spacing.md}px`,
        alignItems: 'center',
        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
        borderRadius: theme.shape.radiusSm,
        background: hasFailures
          ? 'rgba(239,68,68,0.06)'
          : 'rgba(0,0,0,0.025)',
        marginBottom: `${theme.spacing.xs}px`,
        listStyle: 'none',
        minHeight: '40px',
      }}
    >
      {/* ── Title + recurrence chip ── */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: `${theme.spacing.xs}px`,
          overflow: 'hidden',
          color: theme.colors.text,
          fontWeight: 500,
          fontSize: '0.875rem',
        }}
        title={row.title}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.title}
        </span>
        <span
          style={{
            flexShrink: 0,
            fontSize: '0.68rem',
            fontWeight: 600,
            background: `${theme.colors.primary}22`,
            color: theme.colors.primary,
            borderRadius: theme.shape.radiusSm,
            padding: '1px 6px',
            textTransform: 'capitalize',
            whiteSpace: 'nowrap',
          }}
        >
          {row.recurrence}
        </span>
      </span>

      {/* ── Last generated date ── */}
      <span
        style={{
          fontSize: '0.8rem',
          color: theme.colors.muted,
          whiteSpace: 'nowrap',
          textAlign: 'right',
        }}
        aria-label={`${t('recurring.lastGenerated', 'Last generated')}: ${row.meta.lastGeneratedDate ?? t('recurring.neverGenerated', 'Never')}`}
      >
        {row.meta.lastGeneratedDate ?? t('recurring.neverGenerated', 'Never')}
      </span>

      {/* ── Next expected date ── */}
      <span
        style={{
          fontSize: '0.8rem',
          color: theme.colors.muted,
          whiteSpace: 'nowrap',
          textAlign: 'right',
        }}
        aria-label={`${t('recurring.nextExpected', 'Next expected')}: ${row.meta.nextExpectedDate ?? '—'}`}
      >
        {row.meta.nextExpectedDate ?? '—'}
      </span>

      {/* ── Failure badge or OK checkmark ── */}
      {hasFailures ? (
        <span
          role="status"
          aria-label={t('recurring.failureBadgeLabel', '{{count}} missed instances', {
            count: row.meta.failureCount,
          })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#EF4444',
            color: '#fff',
            borderRadius: '999px',
            padding: '1px 8px',
            fontSize: '0.72rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            minWidth: '28px',
          }}
        >
          {row.meta.failureCount}×
        </span>
      ) : (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#22C55E',
            fontSize: '1rem',
            minWidth: '28px',
          }}
        >
          ✓
        </span>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Panel props — extends ReliabilityState with action callbacks
// ---------------------------------------------------------------------------

interface PanelProps extends ReliabilityState {
  onRepair: () => void;
  onManualCheck: () => void;
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export default function RecurringReliabilityPanel({
  rows,
  lastGlobalCheckAt,
  isChecking,
  isRepairing,
  onRepair,
  onManualCheck,
}: PanelProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const anyFailures = rows.some((r) => r.meta.failureCount > 0);

  const handleManualCheck = useCallback(() => {
    track(Events.RECURRING_MANUAL_CHECK_TRIGGERED, { trigger: 'panel_button' });
    onManualCheck();
  }, [onManualCheck]);

  const handleRepair = useCallback(() => {
    track(Events.RECURRING_REPAIRED, { trigger: 'panel_button' });
    onRepair();
  }, [onRepair]);

  const formattedCheckTime = lastGlobalCheckAt
    ? new Date(lastGlobalCheckAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  // ── Empty state ──────────────────────────────────────────────────────────
  if (rows.length === 0) {
    return (
      <section
        aria-label={t('recurring.panelTitle', 'Recurring task reliability')}
        style={{
          padding: `${theme.spacing.md}px`,
          color: theme.colors.muted,
          fontSize: '0.875rem',
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        {t('recurring.noRecurringTasks', 'No recurring tasks configured.')}
      </section>
    );
  }

  // ── Full dashboard ───────────────────────────────────────────────────────
  return (
    <section
      aria-label={t('recurring.panelTitle', 'Recurring task reliability')}
      style={{ padding: `${theme.spacing.sm}px 0` }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: `${theme.spacing.xs}px`,
          marginBottom: `${theme.spacing.sm}px`,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '0.9rem',
            fontWeight: 700,
            color: theme.colors.text,
          }}
        >
          {t('recurring.panelTitle', 'Recurring task reliability')}
          {anyFailures && (
            <span
              aria-hidden="true"
              style={{
                marginLeft: `${theme.spacing.xs}px`,
                display: 'inline-block',
                width: '8px',
                height: '8px