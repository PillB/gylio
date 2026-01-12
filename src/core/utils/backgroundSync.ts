import {
  addSyncConflict,
  listPendingSyncActions,
  removeSyncAction,
  updateSyncAction,
  type SyncAction,
  type SyncActionType,
  type SyncEntityType,
} from './offlineSync';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
export const SYNC_TAG = 'gylio-sync';

const resolveEndpoint = (entityType: SyncEntityType, id?: string | number) => {
  const base = API_BASE_URL || window.location.origin;
  const root = entityType === 'transaction' ? '/api/transactions' : `/api/${entityType}s`;
  const path = id ? `${root}/${id}` : root;
  return new URL(path, base).toString();
};

const methodForAction = (action: SyncActionType): 'POST' | 'PUT' | 'DELETE' => {
  switch (action) {
    case 'create':
      return 'POST';
    case 'update':
      return 'PUT';
    case 'delete':
      return 'DELETE';
    default:
      return 'POST';
  }
};

const calculateBackoffMs = (attempts: number) => {
  const baseDelay = 2000;
  const maxDelay = 5 * 60 * 1000;
  const jitter = Math.random() * 1000;
  const delay = Math.min(maxDelay, baseDelay * 2 ** attempts + jitter);
  return delay;
};

const parseJsonSafe = async (response: Response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const syncAction = async (action: SyncAction) => {
  const payloadId = action.payload?.id as string | number | undefined;
  const endpoint = resolveEndpoint(action.entityType, action.action === 'create' ? undefined : payloadId);
  const method = methodForAction(action.action);
  const body =
    action.action === 'delete'
      ? undefined
      : JSON.stringify({
          ...action.payload,
          clientUpdatedAt: action.clientUpdatedAt,
        });

  const response = await fetch(endpoint, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body,
  });

  if (response.ok) {
    return { status: 'ok' as const };
  }

  if (response.status === 409) {
    const remoteData = await parseJsonSafe(response);
    await addSyncConflict({
      entityType: action.entityType,
      action: action.action,
      localData: action.payload,
      remoteData,
      detectedAt: new Date().toISOString(),
      clientUpdatedAt: action.clientUpdatedAt,
    });
    await updateSyncAction(action.id, { status: 'conflict' });
    return { status: 'conflict' as const };
  }

  throw new Error(`Sync failed with status ${response.status}`);
};

let syncInFlight = false;

export const processSyncQueue = async () => {
  if (syncInFlight) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  syncInFlight = true;
  try {
    const pending = await listPendingSyncActions();
    for (const action of pending) {
      try {
        const result = await syncAction(action);
        if (result.status === 'ok') {
          await removeSyncAction(action.id);
        }
      } catch (error) {
        const attempts = action.attempts + 1;
        const nextAttemptAt = Date.now() + calculateBackoffMs(attempts);
        await updateSyncAction(action.id, {
          attempts,
          nextAttemptAt,
          status: 'retry',
        });
      }
    }
  } finally {
    syncInFlight = false;
  }
};

export const requestBackgroundSync = async () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await registration.sync.register(SYNC_TAG);
    }
  } catch (error) {
    // Ignore registration errors and rely on online events.
  }
};
