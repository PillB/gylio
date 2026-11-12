import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  getRewardsProgress: vi.fn(async () => ({
    id: 1, points: 0, level: 1, focusStreakDays: 0, lastFocusDate: null, taskStreakDays: 0,
    lastTaskCompletionDate: null, budgetStreakWeeks: 0, lastBudgetReviewWeek: null, skipTokens: 0,
  })),
  updateRewardsProgress: vi.fn(async () => undefined),
}));
vi.mock('./useDB', () => ({ default: () => db }));

import useRewards from './useRewards';

beforeEach(() => {
  localStorage.clear();
  db.updateRewardsProgress.mockClear();
});

describe('useRewards and the rewards switch', () => {
  it('follows a switch turned off after this hook mounted (the app-wide timer never remounts)', async () => {
    const { result } = renderHook(() => useRewards());
    localStorage.setItem('settings:gamification', 'false');
    await act(async () => { await result.current.applyRewardsProgress({ points: 10, focusCompleted: true }); });
    expect(db.updateRewardsProgress).not.toHaveBeenCalled();
  });

  it('pays again as soon as the switch is back on, and when nothing was ever saved', async () => {
    const { result } = renderHook(() => useRewards());
    await act(async () => { await result.current.applyRewardsProgress({ points: 10 }); });
    localStorage.setItem('settings:gamification', 'false');
    localStorage.setItem('settings:gamification', 'true');
    await act(async () => { await result.current.applyRewardsProgress({ points: 10 }); });
    expect(db.updateRewardsProgress).toHaveBeenCalledTimes(2);
  });
});
