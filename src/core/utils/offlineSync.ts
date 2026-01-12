const SYNC_DB_NAME = 'gylio-sync';
const SYNC_DB_VERSION = 1;
const QUEUE_STORE = 'sync_queue';
const CONFLICT_STORE = 'sync_conflicts';

type SyncStatus = 'pending' | 'retry' | 'conflict';
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
};

export type SyncConflict = {
  id: string;
  entityType: SyncEntityType;
  action: SyncActionType;
  localData: Record<string, unknown> | null;
  remoteData: Record<string, unknown> | null;
  detectedAt: string;
  clientUpdatedAt: string;
};

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

export const listPendingSyncActions = async (): Promise<SyncAction[]> => {
  const entries = await listSyncActions();
  const now = Date.now();
  return entries.filter((entry) => entry.status !== 'conflict' && entry.nextAttemptAt <= now);
};

export const updateSyncAction = async (id: string, updates: Partial<SyncAction>): Promise<void> => {
  const entries = await listSyncActions();
  const existing = entries.find((entry) => entry.id === id);
  if (!existing) return;
  const next = { ...existing, ...updates };
  await withStore<void>(QUEUE_STORE, 'readwrite', (store) => {
    store.put(next);
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

export const listSyncConflicts = async (): Promise<SyncConflict[]> => {
  const entries = await getAllFromStore<SyncConflict>(CONFLICT_STORE);
  return entries.sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt));
};

export const removeSyncConflict = async (id: string): Promise<void> => {
  if (!supportsIndexedDB()) return;
  await withStore<void>(CONFLICT_STORE, 'readwrite', (store) => {
    store.delete(id);
  });
};
