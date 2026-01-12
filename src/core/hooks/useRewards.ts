import { useCallback } from 'react';
import useDB from './useDB';
import useGamification from './useGamification';
import { calculateLevel, formatDateKey, formatWeekKey, getNextStreakState } from '../utils/rewards';

const DAILY_STREAK_MILESTONE = 7;
const WEEKLY_STREAK_MILESTONE = 4;

type ApplyRewardsOptions = {
  points?: number;
  focusCompleted?: boolean;
  taskCompleted?: boolean;
  budgetReviewed?: boolean;
};

const useRewards = () => {
  const { getRewardsProgress, updateRewardsProgress } = useDB();
  const { gamificationEnabled } = useGamification();

  const applyRewardsProgress = useCallback(
    async ({
      points = 0,
      focusCompleted = false,
      taskCompleted = false,
      budgetReviewed = false,
    }: ApplyRewardsOptions) => {
      if (!gamificationEnabled) return;

      try {
        const current = await getRewardsProgress();
        const todayKey = formatDateKey(new Date());
        const weekKey = formatWeekKey(new Date());
        const shouldProcessBudgetReview = budgetReviewed && current.lastBudgetReviewWeek !== weekKey;
        const nextPoints = current.points + (shouldProcessBudgetReview || !budgetReviewed ? points : 0);
        let nextSkipTokens = current.skipTokens;
        let focusStreakDays = current.focusStreakDays;
        let lastFocusDate = current.lastFocusDate;
        let taskStreakDays = current.taskStreakDays;
        let lastTaskCompletionDate = current.lastTaskCompletionDate;
        let budgetStreakWeeks = current.budgetStreakWeeks;
        let lastBudgetReviewWeek = current.lastBudgetReviewWeek;

        if (focusCompleted) {
          const focusState = getNextStreakState({
            currentKey: todayKey,
            lastKey: current.lastFocusDate,
            currentStreak: current.focusStreakDays,
            skipTokens: nextSkipTokens,
            intervalDays: 1,
          });
          focusStreakDays = focusState.nextStreak;
          lastFocusDate = focusState.nextLastKey;
          nextSkipTokens = focusState.nextSkipTokens;

          if (focusStreakDays > current.focusStreakDays && focusStreakDays % DAILY_STREAK_MILESTONE === 0) {
            nextSkipTokens += 1;
          }
        }

        if (taskCompleted) {
          const taskState = getNextStreakState({
            currentKey: todayKey,
            lastKey: current.lastTaskCompletionDate,
            currentStreak: current.taskStreakDays,
            skipTokens: 0,
            intervalDays: 1,
          });
          taskStreakDays = taskState.nextStreak;
          lastTaskCompletionDate = taskState.nextLastKey;
        }

        if (shouldProcessBudgetReview) {
          const budgetState = getNextStreakState({
            currentKey: weekKey,
            lastKey: current.lastBudgetReviewWeek,
            currentStreak: current.budgetStreakWeeks,
            skipTokens: nextSkipTokens,
            intervalDays: 7,
          });
          budgetStreakWeeks = budgetState.nextStreak;
          lastBudgetReviewWeek = budgetState.nextLastKey;
          nextSkipTokens = budgetState.nextSkipTokens;

          if (
            budgetStreakWeeks > current.budgetStreakWeeks &&
            budgetStreakWeeks % WEEKLY_STREAK_MILESTONE === 0
          ) {
            nextSkipTokens += 1;
          }
        }

        await updateRewardsProgress({
          points: nextPoints,
          level: calculateLevel(nextPoints),
          focusStreakDays,
          lastFocusDate,
          taskStreakDays,
          lastTaskCompletionDate,
          budgetStreakWeeks,
          lastBudgetReviewWeek,
          skipTokens: nextSkipTokens,
        });
      } catch (error) {
        console.warn('Failed to update rewards progress', error);
      }
    },
    [gamificationEnabled, getRewardsProgress, updateRewardsProgress]
  );

  return { applyRewardsProgress } as const;
};

export default useRewards;
