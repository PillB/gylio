/**
 * useStreakRecovery
 *
 * Provides helpers for the streak recovery flow:
 *  - createTinyStepTask: inserts a 2-minute "just start" task and fires
 *    STREAK_RECOVERY_STARTED analytics event.
 *  - markRecoveryComplete: fires STREAK_RECOVERY_COMPLETED analytics event.
 */
import { useCallback } from 'react';
import useDB from './useDB';
import { track, Events } from '../analytics';

export function useStreakRecovery() {
  const { insertTask } = useDB();

  const createTinyStepTask = useCallback(
    (title = 'Just start — one tiny step (2 min)'): Promise<void> => {
      const today = new Date();
      const plannedDate = today.toISOString().slice(0, 10);

      return insertTask(
        title,
        'pending',
        [],
        plannedDate,
        null,
        2,     // focusPresetMinutes: 2 minutes
        'tiny' // energyRequired: tiny
      ).then(() => {
        // No title: analytics events are kept in localStorage and a title is text the user wrote.
        track(Events.STREAK_RECOVERY_STARTED);
      });
    },
    [insertTask]
  );

  const markRecoveryComplete = useCallback(() => {
    track(Events.STREAK_RECOVERY_COMPLETED);
  }, []);

  return { createTinyStepTask, markRecoveryComplete };
}
