/**
 * useScheduleQuota
 *
 * Tracks the user's free AI schedule-optimization uses.
 * Each signed-in user gets 1 free AI optimization per user ID.
 * Count is persisted in localStorage so it survives page refreshes.
 */

const STORAGE_PREFIX = 'gylio_ai_opt_count_';
const FREE_LIMIT = 1;

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function getCount(userId: string): number {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = parseInt(raw ?? '0', 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function incrementCount(userId: string): number {
  try {
    const next = getCount(userId) + 1;
    localStorage.setItem(storageKey(userId), String(next));
    return next;
  } catch {
    return FREE_LIMIT + 1;
  }
}

export type ScheduleQuota = {
  /** How many free uses remain (0 = limit reached). */
  remaining: number;
  /** Total free uses allowed. */
  limit: number;
  /** Whether the user has exhausted their free quota. */
  isExhausted: boolean;
  /** Call this to consume one quota unit. Returns whether the call was allowed. */
  consumeOne: () => boolean;
};

/**
 * Returns quota info for the given Clerk userId.
 * Pass `null` when the user is not signed in.
 */
export function getScheduleQuota(userId: string | null | undefined): ScheduleQuota {
  const id = userId ?? 'anon';
  const used = getCount(id);
  const remaining = Math.max(0, FREE_LIMIT - used);

  return {
    remaining,
    limit: FREE_LIMIT,
    isExhausted: remaining === 0,
    consumeOne: () => {
      if (remaining === 0) return false;
      incrementCount(id);
      return true;
    },
  };
}
