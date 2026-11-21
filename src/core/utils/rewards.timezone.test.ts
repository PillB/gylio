import { describe, expect, it } from 'vitest';
import { useZoneAndClock } from '../../test/timeZone';
import { formatDateKey, formatWeekKey, getNextStreakState } from './rewards';

// Streak days are what a person calls "today". 20:30 Friday in Lima is Saturday in UTC; local midnight in
// Kiritimati (UTC+14) is the day before in UTC. Both used to move the key by one day.
describe('rewards keys in Lima, in the evening', () => {
  useZoneAndClock('America/Lima', '2026-11-21T01:30:00Z'); // Fri 20 Nov, 20:30 local

  it('keys the evening to the day it is lived in', () => {
    expect(formatDateKey(new Date())).toBe('2026-11-20');
  });

  it('keeps the week on its Monday through Sunday night', () => {
    expect(formatWeekKey(new Date())).toBe('2026-11-16');
  });

  it('continues the streak when tonight follows yesterday', () => {
    const next = getNextStreakState({
      currentKey: formatDateKey(new Date()),
      lastKey: '2026-11-19',
      currentStreak: 4,
      skipTokens: 0,
      intervalDays: 1,
    });
    expect(next.nextStreak).toBe(5);
  });
});

describe('rewards keys in Kiritimati, just after midnight', () => {
  useZoneAndClock('Pacific/Kiritimati', '2026-11-20T10:05:00Z'); // Sat 21 Nov, 00:05 local

  it('names the new local day, not the UTC one', () => {
    expect(formatDateKey(new Date())).toBe('2026-11-21');
  });

  it('puts a Monday-morning check-in in that week, not the one before', () => {
    // Mon 16 Nov, 00:30 local = Sun 15 Nov, 10:30 UTC.
    expect(formatWeekKey(new Date('2026-11-15T10:30:00Z'))).toBe('2026-11-16');
  });

  it('counts consecutive local days as consecutive', () => {
    const next = getNextStreakState({ currentKey: '2026-11-21', lastKey: '2026-11-20', currentStreak: 2, skipTokens: 0, intervalDays: 1 });
    expect(next.nextStreak).toBe(3);
  });
});
