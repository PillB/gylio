/**
 * Which completions have already earned points. Completing, reopening and completing a task again is a normal undo,
 * not new work: without this, each round trip paid the points again, so the total stopped meaning anything
 * (docs/state-machines.md, "Task status and rewards"). Kept with the rest of the app's data, so it follows the
 * person to another device with their tasks.
 */
export const REWARD_LEDGER_KEY = 'gylio:rewarded:v1';
/** Enough for years of tasks and steps; the oldest keys go first. */
export const REWARD_LEDGER_MAX = 5000;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const read = (storage: StorageLike): string[] => {
  const parsed = JSON.parse(storage.getItem(REWARD_LEDGER_KEY) || '[]');
  return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
};

/** True the first time `key` is claimed, false after. If storage cannot be read or written, the points are given. */
export const claimReward = (key: string, storage: StorageLike = localStorage): boolean => {
  try {
    const keys = read(storage);
    if (keys.includes(key)) return false;
    storage.setItem(REWARD_LEDGER_KEY, JSON.stringify([...keys, key].slice(-REWARD_LEDGER_MAX)));
    return true;
  } catch {
    return true;
  }
};

export const taskRewardKey = (taskId: number) => `task:${taskId}`;
/** By the step's text, so reordering or adding steps does not make a done step look new. */
export const stepRewardKey = (taskId: number, label: string) => `step:${taskId}:${label.trim().toLowerCase()}`;
