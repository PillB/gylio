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
