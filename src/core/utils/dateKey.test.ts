import { describe, expect, it } from 'vitest';
import { useZoneAndClock } from '../../test/timeZone';
import { addDaysToKey, addMonthsToKey, daysBetweenKeys, localDateKey, mondayKeyOf } from './dateKey';

// 20:30 on Fri 20 Nov 2026 in Lima is already Sat 21 Nov in UTC. In Kiritimati (UTC+14) the same instant is Sat 21 Nov
// 10:30, and local midnight is the previous day in UTC. Those two shapes are what a UTC-based key gets wrong.
const INSTANT = '2026-11-21T01:30:00Z';

describe.each([
  ['America/Lima', '2026-11-20'],
  ['Pacific/Kiritimati', '2026-11-21'],
  ['UTC', '2026-11-21'],
])('date keys in %s', (zone, today) => {
  useZoneAndClock(zone, INSTANT);

  it('names the day the person is living in', () => {
    expect(localDateKey(new Date())).toBe(today);
  });

  it('adds days to a key without moving it across a day boundary', () => {
    expect(addDaysToKey('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDaysToKey('2026-03-28', 7)).toBe('2026-04-04');
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToKey('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('adds a month the way setMonth does, so 31 January lands in March', () => {
    expect(addMonthsToKey('2026-03-15', 1)).toBe('2026-04-15');
    expect(addMonthsToKey('2026-01-31', 1)).toBe('2026-03-03');
  });

  it('counts whole days between keys across a daylight-saving change', () => {
    expect(daysBetweenKeys('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetweenKeys('2026-11-01', '2026-11-02')).toBe(1);
    expect(daysBetweenKeys('2026-11-05', '2026-11-01')).toBe(-4);
  });

  it('finds the Monday of the week, on a Sunday as well', () => {
    expect(mondayKeyOf(new Date(2026, 10, 18, 9))).toBe('2026-11-16'); // Wednesday
    expect(mondayKeyOf(new Date(2026, 10, 22, 23, 59))).toBe('2026-11-16'); // Sunday night
    expect(mondayKeyOf(new Date(2026, 10, 16, 0, 0))).toBe('2026-11-16'); // Monday, midnight
  });
});
