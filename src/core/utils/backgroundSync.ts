import {
  addSyncConflict,
  listPendingSyncActions,
  removeSyncAction,
  updateSyncAction,
  type SyncAction,
  type SyncActionType,
  type SyncEntityType,
  type SyncErrorCode,
} from './offlineSync';
import { authHeaders, getAuthToken } from './authToken';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
export const SYNC_TAG = 'gylio-sync';

const ENTITY_ROUTE_MAP: Record<SyncEntityType, string> = {
  task: '/api/tasks',
  event: '/api/events',
  transaction: '/api/transactions',
};

export const resolveSyncEndpoint = (entityType: SyncEntityType, id?: string | number) => {
  const base =
    API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const root = ENTITY_ROUTE_MAP[entityType];
  const path = id ? `${root}/${id}` : root;
  return new URL(path, base).toString();
};

export const methodForSyncAction = (action: SyncActionType): 'POST' | 'PUT' | 'DELETE' => {
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

const statusToErrorCode = (status: number): SyncErrorCode => {
  switch (status) {
    case 400:
      return 'HTTP_400_BAD_REQUEST';
    case 401:
      return 'HTTP_401_UNAUTHORIZED';
    case 404:
      return 'HTTP_404_NOT_FOUND';
    case 409:
      return 'HTTP_409_CONFLICT';
    case 500:
      return 'HTTP_500_SERVER_ERROR';
    default:
      return 'HTTP_UNKNOWN';
  }
};

type SyncResult =
  | { status: 'ok' }
  | {
      status: 'conflict' | 'error';
      statusCode: number;
      errorCode: SyncErrorCode;
      message: string;
      remoteData: Record<string, unknown> | null;
    };

const syncAction = async (action: SyncAction): Promise<SyncResult> => {
  const payloadId = action.payload?.id as string | number | undefined;
  const endpoint = resolveSyncEndpoint(action.entityType, action.action === 'create' ? undefined : payloadId);
  const method = methodForSyncAction(action.action);
  const body =
    action.action === 'delete'
      ? undefined
      : JSON.stringify({
          ...action.payload,
          clientUpdatedAt: action.clientUpdatedAt,
        });

  const headers = await authHeaders(body ? { 'Content-Type': 'application/json' } : undefined);
  const response = await fetch(endpoint, {
    method,
    headers,
    body,
  });

  if (response.ok) {
    return { status: 'ok' };
  }

  const remoteData = await parseJsonSafe(response);
  const statusCode = response.status;
  const errorCode = statusToErrorCode(statusCode);
  const message = `Sync failed (${errorCode}) with status ${statusCode}`;

  if (statusCode === 409) {
    await addSyncConflict({
      entityType: action.entityType,
      action: action.action,
      localData: action.payload,
      remoteData,
      detectedAt: new Date().toISOString(),
      clientUpdatedAt: action.clientUpdatedAt,
      errorCode,
      statusCode,
      message,
    });

    return {
      status: 'conflict',
      statusCode,
      errorCode,
      message,
      remoteData,
    };
  }

  return {
    status: 'error',
    statusCode,
    errorCode,
    message,
    remoteData,
  };
};

let syncInFlight = false;

export const processSyncQueue = async () => {
  if (syncInFlight) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  // Skip sync if no auth token is available — avoids 401 noise before Clerk loads
  const token = await getAuthToken();
  if (!token) return;

  syncInFlight = true;
  try {
    const pending = await listPendingSyncActions();
    for (const action of pending) {
      try {
        const result = await syncAction(action);
        if (result.status === 'ok') {
          await removeSyncAction(action.id);
          continue;
        }

        if (result.status === 'conflict') {
          await updateSyncAction(action.id, {
            status: 'conflict',
            lastErrorCode: result.errorCode,
            lastStatusCode: result.statusCode,
            lastErrorMessage: result.message,
            lastErrorAt: new Date().toISOString(),
          });
          continue;
        }

        const attempts = action.attempts + 1;
        const nextAttemptAt = Date.now() + calculateBackoffMs(attempts);
        await updateSyncAction(action.id, {
          attempts,
          nextAttemptAt,
          status: 'retry',
          lastErrorCode: result.errorCode,
          lastStatusCode: result.statusCode,
          lastErrorMessage: result.message,
          lastErrorAt: new Date().toISOString(),
        });
      } catch (error) {
        const attempts = action.attempts + 1;
        const nextAttemptAt = Date.now() + calculateBackoffMs(attempts);
        await updateSyncAction(action.id, {
          attempts,
          nextAttemptAt,
          status: 'retry',
          lastErrorCode: 'NETWORK_ERROR',
          lastStatusCode: 0,
          lastErrorMessage: error instanceof Error ? error.message : 'Unknown network error',
          lastErrorAt: new Date().toISOString(),
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
