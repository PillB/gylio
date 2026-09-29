/**
 * EntitlementContext — the server's answer to "does this person have Pro?".
 *
 * The last answer is cached (plan and expiry only, no personal data) so Pro
 * keeps working offline until the moment it would have expired, and so the UI
 * does not flash the free tier on every load.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAppAuth } from '../../core/context/AuthContext';
import { billingApi, type Entitlement } from './billingApi';

const CACHE_KEY = 'gylio:entitlement:v1';

type CachedEntitlement = { userId: string; plan: Entitlement['plan']; expiresAt: string | null; source: Entitlement['source'] };

type EntitlementState = {
  entitlement: Entitlement | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<Entitlement | null>;
  setEntitlement: (next: Entitlement) => void;
};

const EntitlementCtx = createContext<EntitlementState>({
  entitlement: null,
  loading: false,
  error: null,
  refresh: async () => null,
  setEntitlement: () => undefined,
});

function readCache(userId: string, nowMs: number): Entitlement | null {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as CachedEntitlement | null;
    if (!cached || cached.userId !== userId) return null;
    const stillValid = cached.plan === 'pro' && (cached.expiresAt === null || Date.parse(cached.expiresAt) > nowMs);
    return {
      plan: stillValid ? 'pro' : 'free',
      source: stillValid ? cached.source : null,
      expiresAt: cached.expiresAt,
      renews: false,
      trial: { eligible: false, endsAt: null },
      subscription: null,
    };
  } catch {
    return null;
  }
}

function writeCache(userId: string, entitlement: Entitlement) {
  try {
    const cached: CachedEntitlement = { userId, plan: entitlement.plan, expiresAt: entitlement.expiresAt, source: entitlement.source };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Storage blocked (private mode): the live answer still works.
  }
}

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const { userId } = useAppAuth();
  const [entitlement, setEntitlementState] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setEntitlement = useCallback((next: Entitlement) => {
    setEntitlementState(next);
    if (userId) writeCache(userId, next);
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return null;
    setLoading(true);
    try {
      const next = await billingApi.entitlement();
      setEntitlement(next);
      setError(null);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown');
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, setEntitlement]);

  useEffect(() => {
    if (!userId) {
      setEntitlementState(null);
      return;
    }
    setEntitlementState(readCache(userId, Date.now()));
    void refresh();
    // Pick up purchases and gifts made on another device when the tab regains focus.
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [userId, refresh]);

  const value = useMemo(
    () => ({ entitlement, loading, error, refresh, setEntitlement }),
    [entitlement, loading, error, refresh, setEntitlement]
  );
  return <EntitlementCtx.Provider value={value}>{children}</EntitlementCtx.Provider>;
}

export const useEntitlement = () => useContext(EntitlementCtx);
