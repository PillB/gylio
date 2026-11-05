import { describe, expect, it } from 'vitest';
import { checkRewardPoints, MAX_REWARD_POINTS } from './rewardPoints';

describe('checkRewardPoints', () => {
  it.each([
    ['50', 50],
    [' 120 ', 120],
    ['1e5', 100000],
    [String(MAX_REWARD_POINTS), MAX_REWARD_POINTS],
  ])('accepts %s as %d', (raw, points) => {
    expect(checkRewardPoints(raw)).toEqual({ points, error: null });
  });

  it.each([
    ['', 'invalid'],
    ['abc', 'invalid'],
    ['1e309', 'invalid'],
    ['1.5', 'notWhole'],
    ['0', 'notPositive'],
    ['-3', 'notPositive'],
    [String(MAX_REWARD_POINTS + 1), 'tooLarge'],
  ])('refuses %s (%s) instead of quietly changing it', (raw, error) => {
    expect(checkRewardPoints(raw)).toEqual({ points: null, error });
  });
});
