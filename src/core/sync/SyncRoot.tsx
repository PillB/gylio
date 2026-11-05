/**
 * Switches syncing on for a signed-in person, in builds that have it (see flag.ts), and hands the engine to the
 * screens through SyncProvider. Signed out, or in a build without the flag, the app is exactly what it was.
 */
import { useAuth } from '@clerk/clerk-react';
import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { startAppSync } from './appSync';
import type { SyncEngine } from './engine';
import { syncEnabled } from './flag';
import { SyncProvider } from './SyncContext';

const baseUrl = () => String(import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

export function SyncRoot({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const [engine, setEngine] = useState<SyncEngine | null>(null);
  // The latest sign-in, read by the engine whenever it needs a token, without restarting it.
  const session = useRef({ userId, getToken });
  session.current = { userId, getToken };
  const on = syncEnabled() && isLoaded && Boolean(isSignedIn);

  useEffect(() => {
    if (!on) {
      setEngine(null);
      return undefined;
    }
    let cancelled = false;
    let stop: (() => void) | null = null;
    startAppSync({
      baseUrl: baseUrl(),
      accountId: userId,
      getAuth: async ({ forceRefresh }) => {
        const { userId: id, getToken: token } = session.current;
        const value = id ? await token({ skipCache: forceRefresh }) : null;
        return value && id ? { token: value, userId: id } : null;
      },
    })
      .then((started) => {
        if (cancelled) started.stop();
        else {
          stop = started.stop;
          setEngine(started.engine);
        }
      })
      .catch((error) => console.warn('Sync could not start; everything stays on this device', error instanceof Error ? error.message : error));
    return () => {
      cancelled = true;
      stop?.();
      setEngine(null);
    };
  }, [on, userId]);

  return <SyncProvider engine={engine}>{children}</SyncProvider>;
}
