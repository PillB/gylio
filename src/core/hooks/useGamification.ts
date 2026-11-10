import { useCallback, useEffect, useRef, useState } from 'react';
import { deviceStorage } from '../utils/deviceStorage';

const GAMIFICATION_STORAGE_KEY = 'settings:gamification';

const useGamification = () => {
  const [gamificationEnabled, setGamificationEnabledState] = useState(true);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const stored = await deviceStorage.getItem(GAMIFICATION_STORAGE_KEY);
        if (stored !== null) {
          setGamificationEnabledState(stored === 'true');
        }
      } catch (error) {
        // Ignore persistence failures to keep UI responsive.
      } finally {
        hydratedRef.current = true;
      }
    };

    hydrate();
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    deviceStorage.setItem(GAMIFICATION_STORAGE_KEY, gamificationEnabled ? 'true' : 'false').catch(() => {
      // Ignore persistence failures to keep UI responsive.
    });
  }, [gamificationEnabled]);

  const setGamificationEnabled = useCallback((enabled: boolean) => {
    setGamificationEnabledState(Boolean(enabled));
  }, []);

  return { gamificationEnabled, setGamificationEnabled } as const;
};

export default useGamification;
