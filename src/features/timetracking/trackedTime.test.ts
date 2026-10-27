import { describe, expect, it } from 'vitest';
import {
  actualChoices,
  assessRun,
  AWAY_PROMPT_SECONDS,
  calibrationSamples,
  closeRun,
  elapsedSeconds,
  entryFromMinutes,
  formatClock,
  formatMinutes,
  parseMinutes,
  secondsToMinutes,
  snoozeUntil,
  trackedEntries,
  withEntryMinutes,
  withoutEntry,
  workedSeconds,
  type Run,
} from './trackedTime';

const T0 = Date.parse('2026-10-27T09:00:00Z');
const at = (minutes: number) => new Date(T0 + minutes * 60_000).toISOString();
const run = (over: Partial<Run> = {}): Run => ({ taskId: 1, startedAt: at(0), lastActiveAt: at(0), ...over });

describe('assessRun', () => {
  it('stays quiet while the person is active and inside the estimate', () => {
    expect(assessRun(run({ lastActiveAt: at(20) }), T0 + 20 * 60_000, 30)).toEqual({ kind: 'ok' });
  });

  it('asks about the gap when the app has not seen the person for half an hour, and offers the last-seen time as the stop point', () => {
    const result = assessRun(run({ lastActiveAt: at(10) }), T0 + (10 + AWAY_PROMPT_SECONDS / 60) * 60_000, 60);
    expect(result).toEqual({ kind: 'away', awaySeconds: AWAY_PROMPT_SECONDS, stopAt: at(10) });
  });

  it('does not ask just before the away threshold', () => {
    expect(assessRun(run(), T0 + (AWAY_PROMPT_SECONDS - 1) * 1000, null).kind).toBe('ok');
  });

  it('nudges once a task passes half again its estimate', () => {
    expect(assessRun(run({ lastActiveAt: at(45) }), T0 + 45 * 60_000, 30).kind).toBe('over');
    expect(assessRun(run({ lastActiveAt: at(44) }), T0 + 45 * 60_000 - 1000, 30).kind).toBe('ok');
  });

  it('never nudges for a short task sooner than five minutes over its estimate', () => {
    expect(assessRun(run({ lastActiveAt: at(6) }), T0 + 6 * 60_000, 5).kind).toBe('ok');
    expect(assessRun(run({ lastActiveAt: at(10) }), T0 + 10 * 60_000, 5).kind).toBe('over');
  });

  it('checks in after two hours when there is no estimate', () => {
    expect(assessRun(run({ lastActiveAt: at(119) }), T0 + 119 * 60_000, null).kind).toBe('ok');
    expect(assessRun(run({ lastActiveAt: at(120) }), T0 + 120 * 60_000, null).kind).toBe('over');
  });

  it('is silent while snoozed, then asks again', () => {
    const snoozed = run({ lastActiveAt: at(50), snoozeUntil: at(80) });
    expect(assessRun(snoozed, T0 + 50 * 60_000, 30).kind).toBe('ok');
    expect(assessRun({ ...snoozed, lastActiveAt: at(81) }, T0 + 81 * 60_000, 30).kind).toBe('over');
  });

  it('puts the away question first when both apply', () => {
    expect(assessRun(run({ lastActiveAt: at(5) }), T0 + 300 * 60_000, 30).kind).toBe('away');
  });

  it('snoozes for at least 30 minutes, or half the estimate when that is longer', () => {
    expect(Date.parse(snoozeUntil(T0, 20)) - T0).toBe(30 * 60_000);
    expect(Date.parse(snoozeUntil(T0, 120)) - T0).toBe(60 * 60_000);
  });
});

describe('closeRun', () => {
  it('measures from the start to the chosen end', () => {
    const entry = closeRun(run(), at(25));
    expect(entry).toMatchObject({ type: 'tracked', actualSeconds: 25 * 60, endedAt: at(25), completed: true });
  });

  it('never produces a negative stretch', () => {
    expect(closeRun(run({ startedAt: at(10) }), at(5)).actualSeconds).toBe(0);
  });
});

describe('totals', () => {
  const log = [
    { type: 'focus', actualSeconds: 1500 },
    { type: 'short-break', actualSeconds: 300 },
    { type: 'tracked', actualSeconds: 600 },
  ];

  it('adds focus sessions and tracked time but not breaks', () => {
    expect(workedSeconds(log)).toBe(2100);
    expect(workedSeconds(null)).toBe(0);
  });

  it('rounds to whole minutes and ignores under half a minute', () => {
    expect(secondsToMinutes(29)).toBe(0);
    expect(secondsToMinutes(30)).toBe(1);
    expect(secondsToMinutes(2100)).toBe(35);
  });

  it('finds tracked entries with their position in the log', () => {
    expect(trackedEntries(log).map((t) => t.index)).toEqual([2]);
  });

  it('builds calibration samples only from finished tasks that have an estimate and logged time', () => {
    const tasks = [
      { status: 'completed', estimateMin: 30, timeLog: [{ type: 'tracked', actualSeconds: 45 * 60 }] },
      { status: 'pending', estimateMin: 30, timeLog: [{ type: 'tracked', actualSeconds: 45 * 60 }] },
      { status: 'completed', estimateMin: null, timeLog: [{ type: 'tracked', actualSeconds: 45 * 60 }] },
      { status: 'completed', estimateMin: 30, timeLog: [] },
    ];
    expect(calibrationSamples(tasks)).toEqual([{ estimateMin: 30, actualMin: 45 }]);
  });
});

describe('fixing entries', () => {
  const base = [entryFromMinutes(20, at(60)), { type: 'focus', startedAt: at(0), endedAt: at(25), plannedSeconds: 1500, actualSeconds: 1500, completed: true }];

  it('builds a manual entry that ends at the given moment', () => {
    expect(base[0]).toMatchObject({ actualSeconds: 1200, startedAt: at(40), endedAt: at(60) });
  });

  it('changes the length of a tracked entry only', () => {
    const edited = withEntryMinutes(base, 0, 35);
    expect(edited[0]).toMatchObject({ actualSeconds: 2100, startedAt: at(40), endedAt: at(75) });
    expect(withEntryMinutes(base, 1, 99)[1]).toBe(base[1]);
  });

  it('removes one entry and leaves the rest', () => {
    expect(withoutEntry(base, 0)).toEqual([base[1]]);
  });
});

describe('parseMinutes', () => {
  it.each([
    ['25', 25], ['90m', 90], ['45 min', 45], ['1h', 60], ['1.5h', 90], ['1,5h', 90], ['1h30', 90], ['1h 30m', 90], ['1:30', 90], [' 2h ', 120],
  ])('reads %s as %i minutes', (text, minutes) => expect(parseMinutes(text)).toBe(minutes));

  it.each(['', 'abc', '0', '-5', '1441', '25 mins later', '1h75x'])('rejects %j', (text) => expect(parseMinutes(text)).toBeNull());
});

describe('formatting', () => {
  it('formats a running clock', () => {
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(-4)).toBe('00:00');
  });

  it('formats durations', () => {
    expect([formatMinutes(45), formatMinutes(60), formatMinutes(65)]).toEqual(['45m', '1h', '1h 05m']);
    expect(elapsedSeconds(at(0), T0 + 90_000)).toBe(90);
  });

  it('offers answers around the estimate without duplicates', () => {
    expect(actualChoices(30)).toEqual([15, 30, 45, 60]);
    expect(actualChoices(5)).toEqual([5, 10]);
  });
});
