/** Highest points a reward can ask for; anything above is almost certainly a typo. */
export const MAX_REWARD_POINTS = 1_000_000;

export type PointsCheck =
  | { points: number; error: null }
  | { points: null; error: 'invalid' | 'notWhole' | 'notPositive' | 'tooLarge' };

/**
 * Reads the "points required" field. It used parseInt, which turned "1.5" into 1 and "1e5" (a valid
 * number-input value) into 1 without a word; now the number is read whole or refused with a reason.
 */
export const checkRewardPoints = (raw: string): PointsCheck => {
  const text = raw.trim();
  const value = text ? Number(text) : Number.NaN;
  if (!Number.isFinite(value)) return { points: null, error: 'invalid' };
  if (!Number.isInteger(value)) return { points: null, error: 'notWhole' };
  if (value <= 0) return { points: null, error: 'notPositive' };
  if (value > MAX_REWARD_POINTS) return { points: null, error: 'tooLarge' };
  return { points: value, error: null };
};

export const POINTS_ERROR_KEYS = {
  invalid: 'validation.invalidNumber',
  notWhole: 'validation.pointsWhole',
  notPositive: 'validation.pointsPositive',
  tooLarge: 'validation.pointsTooLarge',
} as const;
