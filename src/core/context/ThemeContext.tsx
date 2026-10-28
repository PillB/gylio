import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, ThemeTokens, themes } from '../themes';

const STORAGE_KEY = 'theme-mode';

interface ThemeContextValue {
  theme: ThemeTokens;
  mode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  hydrated: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes.light,
  mode: 'light',
  setTheme: () => undefined,
  hydrated: false
});

const isThemeMode = (value: string): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'highContrast';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrateTheme = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedMode && isThemeMode(storedMode)) {
          setMode(storedMode);
          return;
        }
      } catch (err) {
        // Non-blocking: fall back to system preference on error.
      }

      const prefersDark =
        typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      setMode(prefersDark ? 'dark' : 'light');
    };

    hydrateTheme().finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {
      // Swallow persistence errors to avoid blocking UI rendering.
    });
  }, [mode, hydrated]);

  const theme = useMemo(() => themes[mode] ?? themes.light, [mode]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = theme.colors.background;
      document.body.style.color = theme.colors.text;
    }
  }, [theme.colors.background, theme.colors.text]);

  const handleSetTheme = (nextMode: ThemeMode) => {
    setMode(nextMode);
  };

  const value = useMemo(
    () => ({
      theme,
      mode,
      setTheme: handleSetTheme,
      hydrated
    }),
    [hydrated, mode, theme]
  );

  return <ThemeContext.Provider value={value}>{hydrated ? children : null}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
