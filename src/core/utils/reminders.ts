/**
 * Longest reminder lead time: four weeks. A 99,999,999-minute reminder (190 years) was accepted;
 * anything past a month is almost certainly a typo, and a far-off reminder would never be seen.
 */
export const MAX_REMINDER_MINUTES = 28 * 24 * 60;

/** True when a whole, non-negative reminder is further ahead than the app allows. */
export const isReminderTooFar = (minutes: number): boolean => minutes > MAX_REMINDER_MINUTES;
