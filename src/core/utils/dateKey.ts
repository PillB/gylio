/**
 * Calendar-day keys (`YYYY-MM-DD`) for streaks, recurrence and "last seen" days.
 *
 * A key names a day on the person's wall calendar, not an instant. So:
 * - the key for "now" is read from the local clock (`getFullYear/getMonth/getDate`), never from `toISOString()`,
 *   which names the UTC day: that is tomorrow for anyone in Peru after 19:00 and yesterday for local midnight east of UTC;
 * - arithmetic on keys runs in UTC, where every day has 24 hours, so a daylight-saving change cannot add or drop one.
 * A lint rule (eslint.config.js, `no-restricted-syntax`) keeps `toISOString().slice(0, 10)` out of `src`.
 */
const pad = (value: number) => String(value).padStart(2, '0');

const keyOfUtc = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const utcOfKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

/** The local calendar day of `date`. */
export const localDateKey = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const addDaysToKey = (key: string, days: number): string => {
  const date = utcOfKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return keyOfUtc(date);
};

/** Same overflow as `Date#setMonth`: 31 January plus one month is 3 March, which recurrence already relied on. */
export const addMonthsToKey = (key: string, months: number): string => {
  const date = utcOfKey(key);
  date.setUTCMonth(date.getUTCMonth() + months);
  return keyOfUtc(date);
};

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export const daysBetweenKeys = (from: string, to: string): number =>
  Math.round((utcOfKey(to).getTime() - utcOfKey(from).getTime()) / 86_400_000);

/** The Monday of the local week holding `date`, as a key. */
export const mondayKeyOf = (date: Date): string =>
  addDaysToKey(localDateKey(date), -((date.getDay() + 6) % 7));
