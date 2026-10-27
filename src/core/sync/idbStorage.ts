import { changeKey, coalesce } from './memoryStorage';
import type { BucketName, KeptVersion, NewChange, OutboxEntry, SyncMeta, SyncStorage } from './types';

const DB_NAME = 'gylio-sync-v2';
const DB_VERSION = 1;
const OUTBOX = 'outbox';
const VERSIONS = 'versions';
const META = 'meta';
const KEPT = 'kept';
const BUCKETS: Record<BucketName, string> = { mirror: 'bucket-mirror', links: 'bucket-links' };
const ALL_BUCKETS = Object.values(BUCKETS);
const META_KEY = 'state';

const DEFAULT_META: SyncMeta = { cursor: 0, owner: null };

const wrap = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const done = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });

const open = (factory: IDBFactory): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(OUTBOX, { keyPath: 'key' });
      db.createObjectStore(VERSIONS);
      db.createObjectStore(META);
      db.createObjectStore(KEPT, { keyPath: ['key', 'keptAt'] });
      ALL_BUCKETS.forEach((name) => db.createObjectStore(name));
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/**
 * The outbox, the known server versions, the change cursor and the bridge's small maps, in a database of their own. Each method
 * is one transaction, so a crash or a closed tab never leaves half a change behind.
 */
export class IdbStorage implements SyncStorage {
  private db: Promise<IDBDatabase> | null = null;

  constructor(private readonly factory: IDBFactory = indexedDB) {}

  private connection() {
    this.db ??= open(this.factory);
    return this.db;
  }

  private async tx<T>(stores: string[], mode: IDBTransactionMode, work: (tx: IDBTransaction) => Promise<T>): Promise<T> {
    const tx = (await this.connection()).transaction(stores, mode);
    const finished = done(tx);
    const result = await work(tx);
    await finished;
    return result;
  }

  listOutbox() {
    return this.tx([OUTBOX], 'readonly', async (tx) => {
      const all = (await wrap(tx.objectStore(OUTBOX).getAll())) as OutboxEntry[];
      return all.sort((a, b) => a.localUpdatedAt - b.localUpdatedAt || a.key.localeCompare(b.key));
    });
  }

  putChange(change: NewChange) {
    return this.tx([OUTBOX], 'readwrite', async (tx) => {
      const store = tx.objectStore(OUTBOX);
      const existing = (await wrap(store.get(changeKey(change.entity, change.id)))) as OutboxEntry | undefined;
      const entry = coalesce(existing, change);
      await wrap(store.put(entry));
      return entry;
    });
  }

  settle(key: string, rev: number) {
    return this.tx([OUTBOX], 'readwrite', async (tx) => {
      const store = tx.objectStore(OUTBOX);
      const existing = (await wrap(store.get(key))) as OutboxEntry | undefined;
      if (existing?.rev !== rev) return false;
      await wrap(store.delete(key));
      return true;
    });
  }

  markAttempted(key: string, rev: number) {
    return this.tx([OUTBOX], 'readwrite', async (tx) => {
      const store = tx.objectStore(OUTBOX);
      const existing = (await wrap(store.get(key))) as OutboxEntry | undefined;
      if (existing && existing.rev === rev && !existing.sendAttempted) await wrap(store.put({ ...existing, sendAttempted: true }));
    });
  }

  reject(key: string, rev: number, info: { code: string; message: string; at: number }) {
    return this.tx([OUTBOX], 'readwrite', async (tx) => {
      const store = tx.objectStore(OUTBOX);
      const existing = (await wrap(store.get(key))) as OutboxEntry | undefined;
      if (existing && existing.rev === rev) await wrap(store.put({ ...existing, rejected: info }));
    });
  }

  clearRejections() {
    return this.tx([OUTBOX], 'readwrite', async (tx) => {
      const store = tx.objectStore(OUTBOX);
      const all = (await wrap(store.getAll())) as OutboxEntry[];
      await Promise.all(all.filter((e) => e.rejected).map((e) => wrap(store.put({ ...e, rejected: undefined }))));
    });
  }

  getVersion(key: string) {
    return this.tx([VERSIONS], 'readonly', async (tx) => ((await wrap(tx.objectStore(VERSIONS).get(key))) as number | undefined) ?? 0);
  }

  setVersions(versions: Record<string, number>) {
    return this.tx([VERSIONS], 'readwrite', async (tx) => {
      const store = tx.objectStore(VERSIONS);
      await Promise.all(Object.entries(versions).map(([key, version]) => wrap(store.put(version, key))));
    });
  }

  getMeta() {
    return this.tx([META], 'readonly', async (tx) => ({
      ...DEFAULT_META,
      ...(((await wrap(tx.objectStore(META).get(META_KEY))) as Partial<SyncMeta> | undefined) ?? {}),
    }));
  }

  setMeta(meta: Partial<SyncMeta>) {
    return this.tx([META], 'readwrite', async (tx) => {
      const store = tx.objectStore(META);
      const current = ((await wrap(store.get(META_KEY))) as Partial<SyncMeta> | undefined) ?? {};
      await wrap(store.put({ ...DEFAULT_META, ...current, ...meta }, META_KEY));
    });
  }

  keepVersion(kept: KeptVersion) {
    return this.tx([KEPT], 'readwrite', async (tx) => {
      await wrap(tx.objectStore(KEPT).put(kept));
    });
  }

  listKept() {
    return this.tx([KEPT], 'readonly', async (tx) => (await wrap(tx.objectStore(KEPT).getAll())) as KeptVersion[]);
  }

  removeKept(key: string, keptAt: number) {
    return this.tx([KEPT], 'readwrite', async (tx) => {
      await wrap(tx.objectStore(KEPT).delete([key, keptAt]));
    });
  }

  /** One object store per map, one record per entry, so a patch writes only what changed. */
  getBucket(name: BucketName) {
    return this.tx([BUCKETS[name]], 'readonly', async (tx) => {
      const store = tx.objectStore(BUCKETS[name]);
      const [keys, values] = await Promise.all([wrap(store.getAllKeys()), wrap(store.getAll())]);
      return Object.fromEntries(keys.map((key, i) => [String(key), values[i] as string]));
    });
  }

  patchBucket(name: BucketName, patch: Record<string, string | null>) {
    return this.tx([BUCKETS[name]], 'readwrite', async (tx) => {
      const store = tx.objectStore(BUCKETS[name]);
      await Promise.all(Object.entries(patch).map(([key, value]) => (value === null ? wrap(store.delete(key)) : wrap(store.put(value, key)))));
    });
  }

  forgetAccountState() {
    const stores = [VERSIONS, META, ...ALL_BUCKETS];
    return this.tx(stores, 'readwrite', async (tx) => {
      const meta = tx.objectStore(META);
      const current = ((await wrap(meta.get(META_KEY))) as Partial<SyncMeta> | undefined) ?? {};
      await Promise.all([VERSIONS, ...ALL_BUCKETS].map((name) => wrap(tx.objectStore(name).clear())));
      await wrap(meta.put({ ...DEFAULT_META, ...current, cursor: 0 }, META_KEY));
    });
  }

  clear() {
    const stores = [OUTBOX, VERSIONS, META, KEPT, ...ALL_BUCKETS];
    return this.tx(stores, 'readwrite', async (tx) => {
      await Promise.all(stores.map((name) => wrap(tx.objectStore(name).clear())));
    });
  }
}
