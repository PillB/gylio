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

  const { showToast } = useToast();

  const today = todayKey ?? getLocalDateKey();

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
          showToast({
            message: t(
              'recurring.missingWarning',
              '{{count}} recurring task(s) expected today are missing. Use "Rebuild" to fix.',
            ).replace('{{count}}', String(missingIds.length)),
            type: 'warning',
            duration: 6000,
          });
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
