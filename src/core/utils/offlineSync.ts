import { readOwner } from '../account/deviceOwner';

const SYNC_DB_NAME = 'gylio-sync';
const SYNC_DB_VERSION = 1;
const QUEUE_STORE = 'sync_queue';
const CONFLICT_STORE = 'sync_conflicts';

type SyncStatus = 'pending' | 'retry' | 'conflict';

export type SyncErrorCode =
  | 'HTTP_400_BAD_REQUEST'
  | 'HTTP_401_UNAUTHORIZED'
  | 'HTTP_404_NOT_FOUND'
  | 'HTTP_409_CONFLICT'
  | 'HTTP_500_SERVER_ERROR'
  | 'HTTP_UNKNOWN'
  | 'NETWORK_ERROR';
export type SyncEntityType = 'task' | 'event' | 'transaction';
export type SyncActionType = 'create' | 'update' | 'delete';

export type SyncAction = {
  id: string;
  entityType: SyncEntityType;
  action: SyncActionType;
  payload: Record<string, unknown>;
  clientUpdatedAt: string;
  attempts: number;
  nextAttemptAt: number;
  status: SyncStatus;
  lastErrorCode?: SyncErrorCode;
  lastStatusCode?: number;
  lastErrorMessage?: string;
  lastErrorAt?: string;
  /** The account whose data this change came from (src/core/account/deviceOwner.ts); null before anyone signed in. */
  owner?: string | null;
};

export type SyncConflict = {
  id: string;
  entityType: SyncEntityType;
  action: SyncActionType;
  localData: Record<string, unknown> | null;
  remoteData: Record<string, unknown> | null;
  detectedAt: string;
  clientUpdatedAt: string;
  errorCode?: SyncErrorCode;
  statusCode?: number;
  message?: string;
  owner?: string | null;
};

/**
 * A change waits for the account it came from. Changes made before anyone signed in belong to whoever signs in first,
 * as the rest of that data does. On a shared device this keeps one person's queued edits from being sent with the
 * next person's sign-in, or shown to them as conflicts.
 */
const belongsTo = (entry: { owner?: string | null }, owner: string | null) => !entry.owner || entry.owner === owner;

const supportsIndexedDB = () => typeof window !== 'undefined' && 'indexedDB' in window;

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sync-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const openSyncDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_DB_NAME, SYNC_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('nextAttemptAt', 'nextAttemptAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(CONFLICT_STORE)) {
        db.createObjectStore(CONFLICT_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async <T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => void) => {
  if (!supportsIndexedDB()) {
    return Promise.resolve(undefined as T);
  }
  const db = await openSyncDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    action(store);
    transaction.oncomplete = () => resolve(undefined as T);
    transaction.onerror = () => reject(transaction.error);
  });
};

const getAllFromStore = async <T>(storeName: string): Promise<T[]> => {
  if (!supportsIndexedDB()) {
    return [];
  }
  const db = await openSyncDatabase();
  return new Promise<T[]>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
};

export const enqueueSyncAction = async (
  action: Omit<SyncAction, 'id' | 'attempts' | 'nextAttemptAt' | 'status'>
): Promise<SyncAction> => {
  if (!supportsIndexedDB()) {
    return {
      ...action,
      id: createId(),
      attempts: 0,
      nextAttemptAt: Date.now(),
      status: 'pending',
    };
  }
  const record: SyncAction = {
    owner: readOwner(),
    ...action,
    id: createId(),
    attempts: 0,
    nextAttemptAt: Date.now(),
    status: 'pending',
  };
  await withStore<void>(QUEUE_STORE, 'readwrite', (store) => {
    store.put(record);
  });
  return record;
};

export const listSyncActions = async (): Promise<SyncAction[]> => {
  const entries = await getAllFromStore<SyncAction>(QUEUE_STORE);
  return entries.sort((a, b) => Date.parse(a.clientUpdatedAt) - Date.parse(b.clientUpdatedAt));
};

export const listPendingSyncActions = async (owner: string | null = readOwner()): Promise<SyncAction[]> => {
  const entries = await listSyncActions();
  const now = Date.now();
  return entries.filter((entry) => entry.status !== 'conflict' && entry.nextAttemptAt <= now && belongsTo(entry, owner));
};

/** Reads and writes one entry by its key. Reading and sorting the whole queue per entry made a pass O(n²). */
export const updateSyncAction = async (id: string, updates: Partial<SyncAction>): Promise<void> => {
  await withStore<void>(QUEUE_STORE, 'readwrite', (store) => {
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) store.put({ ...(request.result as SyncAction), ...updates });
    };
  });
};

export const removeSyncAction = async (id: string): Promise<void> => {
  if (!supportsIndexedDB()) return;
  await withStore<void>(QUEUE_STORE, 'readwrite', (store) => {
    store.delete(id);
  });
};

export const addSyncConflict = async (conflict: Omit<SyncConflict, 'id'>): Promise<SyncConflict> => {
  if (!supportsIndexedDB()) {
    return { ...conflict, id: createId() };
  }
  const record: SyncConflict = { ...conflict, id: createId() };
  await withStore<void>(CONFLICT_STORE, 'readwrite', (store) => {
    store.put(record);
  });
  return record;
};

export const listSyncConflicts = async (owner: string | null = readOwner()): Promise<SyncConflict[]> => {
  const entries = await getAllFromStore<SyncConflict>(CONFLICT_STORE);
  return entries.filter((entry) => belongsTo(entry, owner)).sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt));
};

export const removeSyncConflict = async (id: string): Promise<void> => {
  if (!supportsIndexedDB()) return;
  await withStore<void>(CONFLICT_STORE, 'readwrite', (store) => {
    store.delete(id);
  });
};

/** Drops the queued changes and conflicts that belong to `owner` ("Remove my data from this device"). */
export const removeQueuedFor = async (owner: string): Promise<void> => {
  const [actions, conflicts] = await Promise.all([listSyncActions(), getAllFromStore<SyncConflict>(CONFLICT_STORE)]);
  const remove = (storeName: string, ids: string[]) =>
    ids.length ? withStore<void>(storeName, 'readwrite', (store) => ids.forEach((id) => store.delete(id))) : Promise.resolve();
  await remove(QUEUE_STORE, actions.filter((entry) => belongsTo(entry, owner)).map((entry) => entry.id));
  await remove(CONFLICT_STORE, conflicts.filter((entry) => belongsTo(entry, owner)).map((entry) => entry.id));
};
