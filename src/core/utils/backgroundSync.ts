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
import { apiUrl } from './apiUrl';
import { syncEnabled } from '../sync/flag';

export const SYNC_TAG = 'gylio-sync';

/**
 * This queue was written for the old Express API, which lives on a separate origin
 * (`VITE_API_BASE_URL`). With no such origin there is nothing for it to talk to: on the single-origin
 * Cloudflare deploy every `/api/tasks` call it makes would be answered by the new Worker (which has no
 * such route), retried forever, and counted against the free daily request allowance. So it runs only
 * when a separate API origin is configured on purpose, and never in a build that has account sync, which
 * replaces it (src/core/sync).
 */
export const legacySyncEnabled = (apiBase: string | undefined = import.meta.env.VITE_API_BASE_URL, accountSync: boolean = syncEnabled()): boolean =>
  String(apiBase ?? '').trim() !== '' && !accountSync;

const ENTITY_ROUTE_MAP: Record<SyncEntityType, string> = {
  task: '/api/tasks',
  event: '/api/events',
  transaction: '/api/transactions',
};

export const resolveSyncEndpoint = (entityType: SyncEntityType, id?: string | number) => {
  const root = ENTITY_ROUTE_MAP[entityType];
  const path = id ? `${root}/${id}` : root;
  return apiUrl(path);
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

/**
 * Answers that will be the same however often the write is sent: an unknown route (the Worker has no
 * legacy routes), a removed resource or a body the server rejects. Retrying them forever cost requests,
 * battery and data and never succeeded, so the entry is dropped. The data itself stays on the device.
 */
const PERMANENT_FAILURES = new Set([400, 404, 405, 410, 413, 422]);

export const isPermanentSyncFailure = (statusCode: number): boolean => PERMANENT_FAILURES.has(statusCode);

/** How long a `Retry-After` header (seconds or an HTTP date) asks the client to wait, or 0 when absent or unreadable. */
export const retryAfterMs = (header: string | null, now = Date.now()): number => {
  if (!header) return 0;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? 0 : Math.max(0, date - now);
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
      retryAfterMs?: number;
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
      owner: action.owner,
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
    retryAfterMs: retryAfterMs(response.headers.get('Retry-After')),
  };
};

const errorDetails = (code: SyncErrorCode, statusCode: number, message: string) => ({
  lastErrorCode: code,
  lastStatusCode: statusCode,
  lastErrorMessage: message,
  lastErrorAt: new Date().toISOString(),
});

/** Schedules the next try, no sooner than the server asked. */
const scheduleRetry = (action: SyncAction, details: ReturnType<typeof errorDetails>, serverDelayMs = 0) => {
  const attempts = action.attempts + 1;
  const nextAttemptAt = Date.now() + Math.max(calculateBackoffMs(attempts), serverDelayMs);
  return updateSyncAction(action.id, { attempts, nextAttemptAt, status: 'retry', ...details });
};

const settleAction = async (action: SyncAction, result: SyncResult) => {
  if (result.status === 'ok') return removeSyncAction(action.id);
  const details = errorDetails(result.errorCode, result.statusCode, result.message);
  if (result.status === 'conflict') return updateSyncAction(action.id, { status: 'conflict', ...details });
  if (isPermanentSyncFailure(result.statusCode)) {
    console.warn(`Sync gave up on a ${action.entityType} change: the server answered ${result.statusCode}. It stays on this device.`);
    return removeSyncAction(action.id);
  }
  return scheduleRetry(action, details, result.retryAfterMs);
};

let syncInFlight = false;

const runSyncQueue = async () => {
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
        await settleAction(action, await syncAction(action));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown network error';
        await scheduleRetry(action, errorDetails('NETWORK_ERROR', 0, message));
      }
    }
  } finally {
    syncInFlight = false;
  }
};

export const processSyncQueue = async () => {
  if (legacySyncEnabled()) await runSyncQueue();
};

export const requestBackgroundSync = async () => {
  if (!legacySyncEnabled()) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    // Background Sync is Chromium-only and absent from the DOM lib typings.
    const { sync } = registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } };
    if (sync) {
      await sync.register(SYNC_TAG);
    }
  } catch (error) {
    // Ignore registration errors and rely on online events.
  }
};
