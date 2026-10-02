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
  BACKUP_KEY, applySnapshot, collectSnapshot, decideFirstSync, readMeta, snapshotHash, writeMeta,
  type ServerState, type Snapshot,
} from './accountSync';

const SAVE_INTERVAL_MS = 15_000;
const RELINK_INTERVAL_MS = 60_000;
/** Browsers refuse keepalive requests with bodies over 64 KiB. */
const KEEPALIVE_LIMIT = 60_000;

export type SyncStatus = 'off' | 'checking' | 'saved' | 'saving' | 'offline' | 'conflict' | 'tooLarge';

class TooLargeError extends Error {}

type PutResult = { saved: boolean; state: ServerState };

async function getServerState(): Promise<ServerState> {
  const res = await fetch(apiUrl('/api/state'), { headers: await authHeaders() });
  if (!res.ok) throw new Error(`state ${res.status}`);
  return (await res.json()).state;
}

async function putServerState(baseVersion: number, data: Snapshot, keepalive = false): Promise<PutResult> {
  const body = JSON.stringify({ baseVersion, data });
  const res = await fetch(apiUrl('/api/state'), {
    method: 'PUT',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body,
    // keepalive lets a save finish while the tab closes, but only for small bodies.
    keepalive: keepalive && body.length < KEEPALIVE_LIMIT,
  });
  if (res.status === 413) throw new TooLargeError('state too large');
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

/** Tells other open tabs that this device's data was replaced, so they reload instead of overwriting it. */
const REPLACED_KEY = 'gylio:sync:replacedAt';

function markReplaced() {
  try {
    localStorage.setItem(REPLACED_KEY, new Date().toISOString());
  } catch {
    // storage full: the reload below still shows the right data in this tab
  }
}

function restoreAndReload(userId: string, server: NonNullable<ServerState>) {
  const previousOwner = readMeta(localStorage)?.userId ?? null;
  applySnapshot(localStorage, server.data, new Date().toISOString(), previousOwner);
  markReplaced();
  writeMeta(localStorage, { userId, version: server.version, hash: snapshotHash(server.data), savedAt: server.updatedAt });
  // Every screen reads storage when it starts, so a reload is the reliable way to show the restored data.
  window.location.reload();
}

/** The data on this device belonged to someone else: set it aside (undoable from Settings) and start empty. */
function startEmptyAndReload(userId: string) {
  // Tagged with the previous person, so only they can bring it back.
  applySnapshot(localStorage, {}, new Date().toISOString(), readMeta(localStorage)?.userId ?? null);
  markReplaced();
  writeMeta(localStorage, { userId, version: 0, hash: snapshotHash({}), savedAt: null });
  window.location.reload();
}

function keepAccountCopy(server: NonNullable<ServerState>, userId: string | null) {
  try {
    const existing = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
    const list = Array.isArray(existing) ? existing : [];
    localStorage.setItem(BACKUP_KEY, JSON.stringify([{ savedAt: new Date().toISOString(), ownerId: userId, data: server.data }, ...list].slice(0, 3)));
  } catch {
    // storage full: the choice still goes ahead, as before
  }
}

export function AccountSyncProvider({ children }: { children: ReactNode }) {
  const { userId } = useAppAuth();
  const [status, setStatus] = useState<SyncStatus>('off');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ServerState>(null);
  const busy = useRef(false);
  // Hash of data the server refused as too large: don't re-send it every 15 seconds.
  const tooLargeHash = useRef<string | null>(null);

  const fail = useCallback((error: unknown) => {
    if (error instanceof TooLargeError) {
      tooLargeHash.current = snapshotHash(collectSnapshot(localStorage));
      setStatus('tooLarge');
    } else {
      setStatus('offline');
    }
  }, []);

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
    const hash = snapshotHash(collectSnapshot(localStorage));
    if (meta.hash === hash || hash === tooLargeHash.current) return;
    busy.current = true;
    try {
      await push(meta.version, keepalive);
    } catch (error) {
      fail(error);
    } finally {
      busy.current = false;
    }
  }, [userId, conflict, push, fail]);

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
    } else if (decision === 'fresh') {
      startEmptyAndReload(uid);
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
      return undefined;
    }
    let done = false;
    const attempt = () => {
      if (done) return;
      firstSyncRef.current(userId).then(() => { done = true; }, fail);
    };
    attempt();
    // If the first sync failed (offline), keep trying: saving only starts once it succeeds.
    const timer = window.setInterval(attempt, RELINK_INTERVAL_MS);
    window.addEventListener('online', attempt);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', attempt);
    };
  }, [userId, fail]);

  // Another tab replaced this device's data (restore, account switch): this tab's
  // in-memory copy is now stale and would overwrite it, so reload.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === REPLACED_KEY) window.location.reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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
    // The account copy is about to be replaced: keep it on this device so it can be restored.
    keepAccountCopy(conflict, userId);
    setConflict(null);
    await push(conflict.version).catch(fail);
  }, [conflict, push, fail, userId]);

  const saveNow = useCallback(async () => {
    const meta = readMeta(localStorage);
    tooLargeHash.current = null;
    await push(meta?.userId === userId ? meta.version : 0).catch(fail);
  }, [push, userId, fail]);

  const value = useMemo(
    () => ({ status, lastSavedAt, conflict, saveNow, chooseAccountCopy, chooseDeviceCopy }),
    [status, lastSavedAt, conflict, saveNow, chooseAccountCopy, chooseDeviceCopy]
  );
  return <SyncCtx.Provider value={value}>{children}</SyncCtx.Provider>;
}

export const useAccountSync = () => useContext(SyncCtx);
