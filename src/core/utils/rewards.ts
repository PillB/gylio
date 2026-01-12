export const POINTS_PER_LEVEL = 100;

export const calculateLevel = (points: number) => Math.max(1, Math.floor(points / POINTS_PER_LEVEL) + 1);

export const formatDateKey = (date: Date) => date.toISOString().slice(0, 10);

const parseDateKey = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getWeekStart = (date: Date) => {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

export const formatWeekKey = (date: Date) => formatDateKey(getWeekStart(date));

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

  const lastDate = parseDateKey(lastKey);
  const currentDate = parseDateKey(currentKey);
  if (!lastDate || !currentDate) {
    return { nextStreak: 1, nextSkipTokens: skipTokens, nextLastKey: currentKey, usedSkipToken: false };
  }

  const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / 86400000);
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
