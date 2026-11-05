import { useEffect, useState } from 'react';

export function getLocalDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Milliseconds until the next whole minute (at least 1 ms). */
export const msToNextMinute = (date: Date): number => Math.max(1, 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds()));

export function useClock(locale = 'en') {
  const [now, setNow] = useState(() => new Date());

  // Tick on the minute boundary, not every 60 s from mount (which showed the old minute for up to 59 s),
  // and catch up at once when the tab comes back, since background timers are slowed or paused.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = new Date();
      setNow(current);
      timer = setTimeout(tick, msToNextMinute(current));
    };
    timer = setTimeout(tick, msToNextMinute(new Date()));
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const timeStr = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(now);

  const tzStr =
    new Intl.DateTimeFormat(locale, { timeZoneName: 'short' })
      .formatToParts(now)
      .find((p) => p.type === 'timeZoneName')?.value ?? '';

  return { timeStr, tzStr, dateKey: getLocalDateKey(), now };
}
