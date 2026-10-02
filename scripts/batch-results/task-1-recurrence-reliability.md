# task-1-recurrence-reliability

I'll implement this systematically, covering all 6 requirements.

---FILE: src/core/analytics.ts---
// src/core/analytics.ts
export const Events = {
  // --- existing events (preserved) ---
  TASK_CREATED: 'task_created',
  TASK_COMPLETED: 'task_completed',
  TASK_DELETED: 'task_deleted',
  TASK_UPDATED: 'task_updated',
  EVENT_CREATED: 'event_created',
  EVENT_UPDATED: 'event_updated',
  EVENT_DELETED: 'event_deleted',
  THEME_CHANGED: 'theme_changed',
  GAMIFICATION_TOGGLED: 'gamification_toggled',
  // --- new recurring reliability events ---
  RECURRING_EXPECTED_MISSING: 'recurring_expected_missing',
  RECURRING_REPAIRED: 'recurring_repaired',
  RECURRING_RELIABILITY_VIEWED: 'recurring_reliability_viewed',
  RECURRING_MANUAL_CHECK_TRIGGERED: 'recurring_manual_check_triggered',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

export interface TrackPayload {
  [key: string]: unknown;
}

export function track(event: EventName, payload?: TrackPayload): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', event, payload ?? {});
  }
  // Forward to your analytics provider here (e.g. Segment, PostHog, etc.)
}
---END FILE---

---FILE: src/features/recurring/recurringMeta.ts---
/**
 * Persistent store for recurring-task reliability metadata.
 * Kept in localStorage under 'gylio:recurringMeta' so it survives
 * page refreshes but doesn't require DB migrations.
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
    // Quota exceeded or private-browsing restriction – fail silently.
  }
}

// ---------------------------------------------------------------------------
// Helpers
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
 * Reset failure count for a task (after repair).
 */
export function resetFailures(taskId: string): void {
  setTaskMeta(taskId, { failureCount: 0, lastCheckedAt: Date.now() });
}

/** Stamp the global last-check timestamp on every tracked task. */
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
 *  1. Reads recurring tasks from the DB.
 *  2. Compares expected dates against actual DB instances.
 *  3. Reports missing instances via toast + analytics.
 *  4. Exposes a `repair()` function to rebuild today's instances.
 *
 * Designed to be consumed by both TaskList and SettingsView so the
 * logic lives in exactly one place.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../../core/hooks/useDB';
import { useToast } from '../../core/context/ToastContext';
import { track, Events } from '../../core/analytics';
import { getLocalDateKey } from '../../core/hooks/useClock';
import {
  readMeta,
  writeMeta,
  recordFailure,
  resetFailures,
  stampAllChecked,
  RecurringMetaStore,
  RecurringTaskMeta,
  DEFAULT_META,
} from './recurringMeta';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecurringTaskRow {
  id: string;
  title: string;
  recurrence: string; // 'daily' | 'weekly' | 'monthly' | etc.
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
// Date helpers
// ---------------------------------------------------------------------------

/** Advance a YYYY-MM-DD date by N days. */
function addDays(dateKey: string, n: number): string {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Given a task's recurrence pattern and last-generated date,
 * compute the next expected YYYY-MM-DD.
 * Extend this as your recurrence engine grows.
 */
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
  // Default: treat as daily
  return addDays(lastGenerated, 1);
}

/**
 * Derive the "most recent" check timestamp across all stored metas.
 */
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
  const { ready, getTasks, insertTask } = useDB() as {
    ready: boolean;
    getTasks: (filter?: Record<string, unknown>) => Promise<unknown[]>;
    insertTask: (task: Record<string, unknown>) => Promise<unknown>;
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

  // Prevent duplicate checks within the same minute
  const lastCheckDateRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // Build rows from DB + meta store
  // ---------------------------------------------------------------------------
  const buildRows = useCallback(
    async (tasks: unknown[]): Promise<RecurringTaskRow[]> => {
      const store = readMeta();
      const rows: RecurringTaskRow[] = [];

      for (const raw of tasks) {
        const task = raw as Record<string, unknown>;
        if (!task.recurrence || task.recurrence === 'none') continue;

        const id = String(task.id ?? task._id ?? '');
        if (!id) continue;

        const existingMeta = store[id] ?? { ...DEFAULT_META };

        // Compute nextExpectedDate if not stored
        const nextExpectedDate =
          existingMeta.nextExpectedDate ??
          computeNextExpected(
            String(task.recurrence),
            existingMeta.lastGeneratedDate,
            today,
          );

        rows.push({
          id,
          title: String(task.title ?? ''),
          recurrence: String(task.recurrence),
          recurrenceRule: task.recurrenceRule
            ? String(task.recurrenceRule)
            : undefined,
          meta: {
            ...existingMeta,
            nextExpectedDate,
          },
        });
      }
      return rows;
    },
    [today],
  );

  // ---------------------------------------------------------------------------
  // Core check: find missing expected instances
  // ---------------------------------------------------------------------------
  const runCheck = useCallback(
    async (silent = false) => {
      if (!ready) return;

      setState((s) => ({ ...s, isChecking: true }));
      try {
        const allTasks = await getTasks({});
        const rows = await buildRows(allTasks);

        const store = readMeta();
        const missingIds: string[] = [];

        for (const row of rows) {
          const expected = row.meta.nextExpectedDate;
          if (!expected || expected > today) continue; // Not due yet

          // Check if an instance exists in the DB for today
          const instances = (allTasks as Record<string, unknown>[]).filter(
            (t) =>
              (String(t.parentId ?? '') === row.id ||
                String(t.id ?? t._id ?? '') === row.id) &&
              String(t.dueDate ?? t.date ?? '').slice(0, 10) === today,
          );

          if (instances.length === 0) {
            missingIds.push(row.id);
            recordFailure(row.id);
            track(Events.RECURRING_EXPECTED_MISSING, {
              taskId: row.id,
              title: row.title,
              expectedDate: expected,
            });
          } else {
            // Mark as successfully present
            const meta = store[row.id] ?? { ...DEFAULT_META };
            store[row.id] = {
              ...meta,
              lastGeneratedDate: today,
              nextExpectedDate: computeNextExpected(
                row.recurrence,
                today,
                today,
              ),
              lastCheckedAt: Date.now(),
            };
          }
        }

        writeMeta(store);

        if (missingIds.length > 0 && !silent) {
          showToast(
            t(
              'recurring.missingWarning',
              `${missingIds.length} recurring task(s) expected today are missing. Tap "Rebuild" to fix.`,
            ).replace('{{count}}', String(missingIds.length)),
            'warning',
          );
        }

        stampAllChecked(rows.map((r) => r.id));

        // Re-read store for fresh lastGlobalCheckAt
        const freshStore = readMeta();
        const lastGlobalCheckAt = deriveLastGlobalCheck(freshStore);

        // Rebuild rows with updated metas
        const freshRows = await buildRows(allTasks);

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
    [ready, getTasks, buildRows, today, showToast, t],
  );

  // ---------------------------------------------------------------------------
  // Repair: clear failure records + re-insert missing instances for today
  // ---------------------------------------------------------------------------
  const repair = useCallback(async () => {
    if (!ready) return;
    setState((s) => ({ ...s, isRepairing: true }));

    try {
      const allTasks = await getTasks({});
      const rows = await buildRows(allTasks);
      const store = readMeta();
      let repairedCount = 0;

      for (const row of rows) {
        const expected = row.meta.nextExpectedDate;
        if (!expected || expected > today) continue;

        const instances = (allTasks as Record<string, unknown>[]).filter(
          (t) =>
            (String(t.parentId ?? '') === row.id ||
              String(t.id ?? t._id ?? '') === row.id) &&
            String(t.dueDate ?? t.date ?? '').slice(0, 10) === today,
        );

        if (instances.length === 0) {
          // Re-insert a fresh instance for today
          await insertTask({
            title: row.title,
            parentId: row.id,
            recurrence: row.recurrence,
            dueDate: today,
            completed: false,
            createdAt: new Date().toISOString(),
          });
          repairedCount++;
        }

        // Reset failure record
        store[row.id] = {
          ...(store[row.id] ?? { ...DEFAULT_META }),
          failureCount: 0,
          lastGeneratedDate: today,
          nextExpectedDate: computeNextExpected(row.recurrence, today, today),
          lastCheckedAt: Date.now(),
        };
      }

      writeMeta(store);

      track(Events.RECURRING_REPAIRED, {
        repairedCount,
        date: today,
      });

      // Refresh state after repair
      await runCheck(true);
    } catch (err) {
      console.error('[useRecurringReliability] repair failed', err);
      setState((s) => ({ ...s, isRepairing: false }));
    }
  }, [ready, getTasks, buildRows, insertTask, today, runCheck]);

  // ---------------------------------------------------------------------------
  // Initial mount check
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!ready) return;
    // Restore persisted meta on mount
    const store = readMeta();
    const lastGlobalCheckAt = deriveLastGlobalCheck(store);
    setState((s) => ({ ...s, lastGlobalCheckAt }));

    // Run the check (silent=false so toasts fire on mount if needed)
    runCheck(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ---------------------------------------------------------------------------
  // Midnight re-check: whenever todayKey changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!ready) return;
    if (lastCheckDateRef.current === today) return; // Already checked today
    runCheck(false);
  }, [today, ready, runCheck]);

  return {
    ...state,
    today,
    runCheck: () => runCheck(false),
    repair,
  };
}
---END FILE---

---FILE: src/features/recurring/RecurringReliabilityPanel.tsx---
/**
 * RecurringReliabilityPanel
 *
 * Self-contained panel rendered inside TaskList that shows:
 *  - Per-task reliability rows (lastGenerated, nextExpected, failureCount)
 *  - A global "Rebuild recurring instances" button
 *  - Inline warning badges for tasks with failures
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import { track, Events } from '../../../core/analytics';
import type { ReliabilityState, RecurringTaskRow } from '../useRecurringReliability';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TaskRowProps {
  row: RecurringTaskRow;
  theme: ReturnType<typeof useTheme>['theme'];
}

function RelRow({ row, theme }: TaskRowProps) {
  const { t } = useTranslation();
  const hasFailures = row.meta.failureCount > 0;

  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        gap: theme.spacing.sm,
        alignItems: 'center',
        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
        borderRadius: theme.shape.radiusSm,
        background: hasFailures
          ? 'rgba(255,160,0,0.08)'
          : 'rgba(0,0,0,0.03)',
        marginBottom: theme.spacing.xs,
        fontSize: '0.85rem',
        listStyle: 'none',
      }}
    >
      {/* Title + recurrence badge */}
      <span
        style={{
          fontWeight: 500,
          color: theme.colors.text,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={row.title}
      >
        {row.title}
        <span
          style={{
            marginLeft: theme.spacing.xs,
            fontSize: '0.72rem',
            background: theme.colors.primary + '22',
            color: theme.colors.primary,
            borderRadius: theme.shape.radiusSm,
            padding: '1px 5px',
            verticalAlign: 'middle',
          }}
        >
          {row.recurrence}
        </span>
      </span>

      {/* Last generated */}
      <span
        style={{ color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}
        aria-label={t('recurring.lastGenerated', 'Last generated')}
        title={t('recurring.lastGenerated', 'Last generated')}
      >
        {row.meta.lastGeneratedDate ??
          t('recurring.neverGenerated', 'Never')}
      </span>

      {/* Next expected */}
      <span
        style={{ color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}
        aria-label={t('recurring.nextExpected', 'Next expected')}
        title={t('recurring.nextExpected', 'Next expected')}
      >
        {row.meta.nextExpectedDate ?? '—'}
      </span>

      {/* Failure badge */}
      {hasFailures ? (
        <span
          role="status"
          aria-label={t('recurring.failureCount', 'Failures: {{count}}').replace(
            '{{count}}',
            String(row.meta.failureCount),
          )}
          style={{
            background: '#ff6b35',
            color: '#fff',
            borderRadius: '999px',
            padding: '1px 8px',
            fontSize: '0.72rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {row.meta.failureCount}×
        </span>
      ) : (
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 24,
            textAlign: 'center',
            color: '#4caf50',
            fontSize: '0.9rem',
          }}
        >
          ✓
        </span>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

interface Props extends ReliabilityState {
  onRepair: () => void;
  onManualCheck: () => void;
}

export default function RecurringReliabilityPanel({
  rows,
  lastGlobalCheckAt,
  isChecking,
  isRepairing,
  onRepair,
  onManualCheck,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const handleRepair = useCallback(() => {
    track(Events.RECURRING_REPAIRED, { trigger: 'panel_button' });
    onRepair();
  }, [onRepair]);

  const handleManualCheck = useCallback(() => {
    track(Events.RECURRING_MANUAL_CHECK_TRIGGERED, { trigger: 'panel_button' });
    onManualCheck();
  }, [onManualCheck]);

  const anyFailures = rows.some((r) => r.meta.failureCount > 0);
  const formattedCheck = lastGlobalCheckAt
    ? new Date(lastGlobalCheckAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  if (rows.length === 0) {
    return (
      <section
        aria-label={t('recurring.panelTitle', 'Recurring task reliability')}
        style={{
          padding: theme.spacing.md,
          color: theme.colors.textSecondary,
          fontSize: '0.85rem',
          textAlign: 'center',
        }}
      >
        {t('recurring.noRecurringTasks', 'No recurring tasks configured.')}
      </section>
    );
  }

  return (
    <section
      aria-label={t('recurring.panelTitle', 'Recurring task reliability')}
      style={{ padding: `${theme.spacing.sm} 0` }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.sm,
          flexWrap: 'wrap',
          gap: theme.spacing.xs,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '0.92rem',
            fontWeight: 600,
            color: theme.colors.text,
          }}
        >
          {t('recurring.panelTitle', 'Recurring task reliability')}
        </h3>

        <div style={{ display: 'flex', gap: theme.spacing.xs }}>
          {/* Manual check button */}
          <button
            onClick={handleManualCheck}
            disabled={isChecking || isRepairing}
            aria-label={t('recurring.checkNow', 'Check now')}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.shape.radiusSm,
              border: `1px solid ${theme.colors.border ?? '#ccc'}`,
              background: 'transparent',
              color: theme.colors.primary,
              cursor: isChecking ? 'wait' : 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500,
            }}
          >
            {isChecking
              ? t('recurring.checking', 'Checking…')
              : t('recurring.checkNow', 'Check now')}
          </button>

          {/* Rebuild button — highlighted when there are failures */}
          <button
            onClick={handleRepair}
            disabled={isChecking || isRepairing}
            aria-label={t(
              'recurring.rebuildButton',
              'Rebuild recurring instances',
            )}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.shape.radiusSm,
              border: 'none',
              background: anyFailures ? '#ff6b35' : theme.colors.primary,
              color: '#fff',
              cursor: isRepairing ? 'wait' : 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'background 0.2s',
            }}
          >
            {isRepairing
              ? t('recurring.rebuilding', 'Rebuilding…')
              : t('recurring.rebuildButton', 'Rebuild recurring instances')}
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div
        aria-hidden
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto',
          gap: theme.spacing.sm,
          padding: `0 ${theme.spacing.sm}`,
          fontSize: '0.72rem',
          fontWeight: 600,
          color: theme.colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '4px',
        }}
      >
        <span>{t('recurring.colTask', 'Task')}</span>
        <span>{t('recurring.colLastGen', 'Last gen.')}</span>
        <span>{t('recurring.colNextExp', 'Next exp.')}</span>
        <span>{t('recurring.colFailures', 'Fails')}</span>
      </div>

      {/* Task rows */}
      <ul
        style={{ margin: 0, padding: 0 }}
        role="list"
        aria-label={t('recurring.taskListLabel', 'Recurring tasks status')}
      >
        {rows.map((row) => (
          <RelRow key={row.id} row={row} theme={theme} />
        ))}
      </ul>

      {/* Last check timestamp */}
      {formattedCheck && (
        <p
          style={{
            margin: `${theme.spacing.sm} 0 0`,
            fontSize: '0.75rem',
            color: theme.colors.textSecondary,
            textAlign: 'right',
          }}
        >
          {t('recurring.lastChecked', 'Last checked: {{time}}').replace(
            '{{time}}',
            formattedCheck,
          )}
        </p>
      )}
    </section>
  );
}
---END FILE---

---FILE: src/features/tasks/components/TaskList.tsx---
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from '../../../components/SectionCard.jsx';
import Checkbox from '../../../components/atoms/Checkbox';
import { useTheme } from '../../../core/context/ThemeContext';
import useTasks from '../hooks/useTasks';
import useDB from '../../../core/hooks/useDB';
import { track, Events } from '../../../core/analytics';
import { useClock, getLocalDateKey } from '../../../core/hooks/useClock';
import { useToast } from '../../../core/context/ToastContext';
import { useRecurringReliability } from '../../recurring/useRecurringReliability';
import RecurringReliabilityPanel from '../../recurring/RecurringReliabilityPanel';

type ViewFilter = 'today' | 'week' | 'backlog' | 'upcoming';
type EnergyLevel = 'tiny' | 'low' | 'medium' | 'high';

// ---------------------------------------------------------------------------
// TaskList component
// ---------------------------------------------------------------------------

const TaskList: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { now } = useClock();
  const todayKey = getLocalDateKey(now);

  // Existing task hooks
  const { tasks, toggleTask, deleteTask } = useTasks();
  const db = useDB();

  // View state
  const [view, setView] = useState<ViewFilter>('today');
  const [energyFilter, setEnergyFilter] = useState<EnergyLevel | 'all'>('all');
  const [showReliability, setShowReliability] = useState(false);

  // Recurring reliability
  const reliability = useRecurringReliability(todayKey);

  // Track when the panel is opened
  const handleToggleReliability = useCallback(() => {
    setShowReliability((prev) => {
      if (!prev) {
        track(Events.RECURRING_RELIABILITY_VIEWED, { trigger: 'task_list' });
      }
      return !prev;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Filter tasks by view
  // ---------------------------------------------------------------------------
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    const today = new Date(todayKey);
    const weekEnd = new Date(todayKey);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return tasks.filter((task: Record<string, unknown>) => {
      if (energyFilter !== 'all' && task.energyLevel !== energyFilter)
        return false;

      const due = task.dueDate
        ? new Date(String(task.dueDate))
        : null;

      switch (view) {
        case 'today':
          return (
            due?.toDateString() === today.toDateString() || (!due && !task.completed)
          );
        case 'week':
          return due ? due >= today && due <= weekEnd : false;
        case 'backlog':
          return !due && !task.completed;
        case 'upcoming':
          return due ? due > weekEnd : false;
        default:
          return true;
      }
    });
  }, [tasks, view, energyFilter, todayKey]);

  // ---------------------------------------------------------------------------
  // Reliability status summary (for the toggle button label)
  // ---------------------------------------------------------------------------
  const failureTotal = reliability.rows.reduce(
    (sum, r) => sum + r.meta.failureCount,
    0,
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.md,
      }}
    >
      
