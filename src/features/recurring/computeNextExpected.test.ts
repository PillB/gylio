import { describe, expect, it } from 'vitest';
import { useZoneAndClock } from '../../test/timeZone';
import { computeNextExpected } from './useRecurringReliability';

// Local midnight in an eastern zone is the previous day in UTC, so a key built from it went backwards a day:
// a daily task last made on 28 March was "next expected" on the 28th again, and looked overdue.
describe.each(['Pacific/Kiritimati', 'Europe/Madrid', 'America/Lima', 'UTC'])('next expected date in %s', (zone) => {
  useZoneAndClock(zone, '2026-03-28T12:00:00Z');

  it.each([
    ['daily', '2026-03-28', '2026-03-29'],
    ['weekly', '2026-03-28', '2026-04-04'],
    ['monthly', '2026-03-15', '2026-04-15'],
    ['Daily', '2026-12-31', '2027-01-01'],
    ['unknown', '2026-03-28', '2026-03-29'],
  ])('%s after %s is %s', (recurrence, last, expected) => {
    expect(computeNextExpected(recurrence, last, '2026-03-28')).toBe(expected);
  });

  it('is today when nothing was ever generated', () => {
    expect(computeNextExpected('daily', null, '2026-03-28')).toBe('2026-03-28');
  });
});
