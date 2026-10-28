import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SyncEngine, SyncSnapshot } from './engine';

type SyncApi = {
  /** Null until sync is set up (no account, or not switched on yet): the app then shows nothing about it. */
  snapshot: SyncSnapshot | null;
  /** "Try now": one extra attempt, at most once every ten seconds. */
  tryNow: () => void;
  /** Send again the changes the server refused. */
  retryRefused: () => void;
  /** The person chose to add this device's data to the account that is signed in now. */
  claim: () => void;
};

const INERT: SyncApi = { snapshot: null, tryNow: () => undefined, retryRefused: () => undefined, claim: () => undefined };

const SyncContext = createContext<SyncApi>(INERT);

export function SyncProvider({ engine, children }: { engine: SyncEngine | null; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<SyncSnapshot | null>(() => engine?.snapshot() ?? null);

  useEffect(() => {
    if (!engine) {
      setSnapshot(null);
      return undefined;
    }
    setSnapshot(engine.snapshot());
    return engine.subscribe(setSnapshot);
  }, [engine]);

  const tryNow = useCallback(() => engine?.kick('manual'), [engine]);
  const retryRefused = useCallback(() => {
    engine?.retryRefused().catch(() => undefined);
  }, [engine]);

  const claim = useCallback(() => {
    engine?.claimForCurrentAccount().catch(() => undefined);
  }, [engine]);

  const value = useMemo(() => ({ snapshot, tryNow, retryRefused, claim }), [snapshot, tryNow, retryRefused, claim]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export const useSync = (): SyncApi => useContext(SyncContext);
