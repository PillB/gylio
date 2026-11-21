import { daysBetweenKeys, localDateKey, mondayKeyOf } from './dateKey';

export const POINTS_PER_LEVEL = 100;

export const calculateLevel = (points: number) => Math.max(1, Math.floor(points / POINTS_PER_LEVEL) + 1);

/** The local calendar day, the one a streak counts (see dateKey.ts for why not `toISOString()`). */
export const formatDateKey = (date: Date) => localDateKey(date);

const isDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export const formatWeekKey = (date: Date) => mondayKeyOf(date);

type StreakInput = {
  currentKey: string;
  lastKey: string | null;
  currentStreak: number;
  skipTokens: number;
  intervalDays: number;
};

type StreakOutput = {
  nextStreak: number;
  nextSkipTokens: number;
  nextLastKey: string;
  usedSkipToken: boolean;
};

export const getNextStreakState = ({
  currentKey,
  lastKey,
  currentStreak,
  skipTokens,
  intervalDays,
}: StreakInput): StreakOutput => {
  if (!lastKey) {
    return { nextStreak: 1, nextSkipTokens: skipTokens, nextLastKey: currentKey, usedSkipToken: false };
  }

  if (lastKey === currentKey) {
    return { nextStreak: currentStreak, nextSkipTokens: skipTokens, nextLastKey: lastKey, usedSkipToken: false };
  }

  if (!isDateKey(lastKey) || !isDateKey(currentKey)) {
    return { nextStreak: 1, nextSkipTokens: skipTokens, nextLastKey: currentKey, usedSkipToken: false };
  }

  const diffDays = daysBetweenKeys(lastKey, currentKey);
  if (diffDays === intervalDays) {
    return {
      nextStreak: currentStreak + 1,
      nextSkipTokens: skipTokens,
      nextLastKey: currentKey,
      usedSkipToken: false,
    };
  }

  if (diffDays > intervalDays && skipTokens > 0 && currentStreak > 0) {
    return {
      nextStreak: currentStreak,
      nextSkipTokens: skipTokens - 1,
      nextLastKey: currentKey,
      usedSkipToken: true,
    };
  }

  return { nextStreak: 1, nextSkipTokens: skipTokens, nextLastKey: currentKey, usedSkipToken: false };
};
