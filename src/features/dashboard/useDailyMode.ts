import { useCallback, useEffect, useState } from 'react';
import { track, Events } from '../../core/analytics';

const STORAGE_KEY = 'gylio:dailyMode';

export function useDailyMode() {
  const [dailyMode, setDailyModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Keep state in sync across tabs / windows
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setDailyModeState(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setDailyMode = useCallback((enabled: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // quota exceeded or private browsing — degrade gracefully
    }
    setDailyModeState(enabled);
    if (enabled) {
      track(Events.DAILY_MODE_ENABLED, { source: 'settings' });
    }
  }, []);

  return { dailyMode, setDailyMode };
}
