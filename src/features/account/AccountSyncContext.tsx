/**
 * AccountSyncContext — keeps this device's Gylio data saved to the signed-in
 * account, and brings it back on any other device.
 *
 * Rules (see accountSync.ts for the decisions themselves):
 *  - It never overwrites data on either side without asking when both sides
 *    have something the other lacks; the person chooses, and a restore can be
 *    undone from Settings.
 *  - Saving runs in the background every 15 seconds when something changed,
 *    and when the tab is hidden. Offline is fine: it retries later.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAppAuth } from '../../core/context/AuthContext';
import { authHeaders } from '../../core/utils/authToken';
import { apiUrl } from '../../core/utils/apiUrl';
import {
  applySnapshot, collectSnapshot, decideFirstSync, readMeta, snapshotHash, writeMeta,
  type ServerState, type Snapshot,
} from './accountSync';

const SAVE_INTERVAL_MS = 15_000;

export type SyncStatus = 'off' | 'checking' | 'saved' | 'saving' | 'offline' | 'conflict';

type PutResult = { saved: boolean; state: ServerState };

async function getServerState(): Promise<ServerState> {
  const res = await fetch(apiUrl('/api/state'), { headers: await authHeaders() });
  if (!res.ok) throw new Error(`state ${res.status}`);
  return (await res.json()).state;
}

async function putServerState(baseVersion: number, data: Snapshot, keepalive = false): Promise<PutResult> {
  const res = await fetch(apiUrl('/api/state'), {
    method: 'PUT',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ baseVersion, data }),
    keepalive,
  });
  if (res.status !== 200 && res.status !== 409) throw new Error(`state ${res.status}`);
  return res.json();
}

type SyncState = {
  status: SyncStatus;
  lastSavedAt: string | null;
  conflict: ServerState;
  saveNow: () => Promise<void>;
  chooseAccountCopy: () => void;
  chooseDeviceCopy: () => Promise<void>;
};

const SyncCtx = createContext<SyncState>({
  status: 'off',
  lastSavedAt: null,
  conflict: null,
  saveNow: async () => undefined,
  chooseAccountCopy: () => undefined,
  chooseDeviceCopy: async () => undefined,
});

function restoreAndReload(userId: string, server: NonNullable<ServerState>) {
  applySnapshot(localStorage, server.data, new Date().toISOString());
  writeMeta(localStorage, { userId, version: server.version, hash: snapshotHash(server.data), savedAt: server.updatedAt });
  // Every screen reads storage when it starts, so a reload is the reliable way to show the restored data.
  window.location.reload();
}

export function AccountSyncProvider({ children }: { children: ReactNode }) {
  const { userId } = useAppAuth();
  const [status, setStatus] = useState<SyncStatus>('off');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ServerState>(null);
  const busy = useRef(false);

  const push = useCallback(async (baseVersion: number, keepalive = false) => {
    if (!userId) return;
    const data = collectSnapshot(localStorage);
    setStatus('saving');
    const result = await putServerState(baseVersion, data, keepalive);
    if (!result.saved || !result.state) {
      setConflict(result.state);
      setStatus('conflict');
      return;
    }
    writeMeta(localStorage, { userId, version: result.state.version, hash: snapshotHash(data), savedAt: result.state.updatedAt });
    setLastSavedAt(result.state.updatedAt);
    setStatus('saved');
  }, [userId]);

  const saveIfChanged = useCallback(async (keepalive = false) => {
    if (!userId || busy.current || conflict) return;
    const meta = readMeta(localStorage);
    if (meta?.userId !== userId) return;
    if (meta.hash === snapshotHash(collectSnapshot(localStorage))) return;
    busy.current = true;
    try {
      await push(meta.version, keepalive);
    } catch {
      setStatus('offline');
    } finally {
      busy.current = false;
    }
  }, [userId, conflict, push]);

  const settle = useCallback((uid: string, server: ServerState) => {
    if (server) writeMeta(localStorage, { userId: uid, version: server.version, hash: snapshotHash(server.data), savedAt: server.updatedAt });
    setLastSavedAt(server?.updatedAt ?? null);
    setStatus('saved');
  }, []);

  const firstSync = useCallback(async (uid: string) => {
    setStatus('checking');
    const server = await getServerState();
    const meta = readMeta(localStorage);
    const decision = decideFirstSync({ userId: uid, server, meta, local: collectSnapshot(localStorage) });
    if (decision === 'restore' && server) {
      restoreAndReload(uid, server);
    } else if (decision === 'ask') {
      setConflict(server);
      setStatus('conflict');
    } else if (decision === 'upload' || decision === 'push') {
      await push(meta?.userId === uid ? meta.version : 0);
    } else {
      settle(uid, server);
    }
  }, [push, settle]);

  // First sync runs once per signed-in person. It must not re-run when the
  // save loop's dependencies change, or a pending conflict would be re-fetched.
  const firstSyncRef = useRef(firstSync);
  firstSyncRef.current = firstSync;
  useEffect(() => {
    if (!userId) {
      setStatus('off');
      return;
    }
    firstSyncRef.current(userId).catch(() => setStatus('offline'));
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    const timer = window.setInterval(() => { void saveIfChanged(); }, SAVE_INTERVAL_MS);
    const onHide = () => { if (document.visibilityState === 'hidden') void saveIfChanged(true); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [userId, saveIfChanged]);

  const chooseAccountCopy = useCallback(() => {
    if (userId && conflict) restoreAndReload(userId, conflict);
  }, [userId, conflict]);

  const chooseDeviceCopy = useCallback(async () => {
    if (!conflict) return;
    setConflict(null);
    await push(conflict.version).catch(() => setStatus('offline'));
  }, [conflict, push]);

  const saveNow = useCallback(async () => {
    const meta = readMeta(localStorage);
    await push(meta?.userId === userId ? meta.version : 0).catch(() => setStatus('offline'));
  }, [push, userId]);

  const value = useMemo(
    () => ({ status, lastSavedAt, conflict, saveNow, chooseAccountCopy, chooseDeviceCopy }),
    [status, lastSavedAt, conflict, saveNow, chooseAccountCopy, chooseDeviceCopy]
  );
  return <SyncCtx.Provider value={value}>{children}</SyncCtx.Provider>;
}

export const useAccountSync = () => useContext(SyncCtx);
