/**
 * Starts syncing the app database with the account: storage for the engine's own state, the bridge, the engine,
 * the browser signals, and the watchers that notice a save (in this tab or another) a moment after it happens.
 */
import { getDatabase, initializeDatabase } from '../db';
import { announceDataChanged, onDataChanged, onLocalWrite } from '../dataEvents';
import { Bridge } from './bridge';
import { attachBrowserSignals, webLockExclusive } from './browser';
import { SyncEngine, type EngineOptions } from './engine';
import { IdbStorage, syncDatabaseName } from './idbStorage';
import { createSqlStore, type LocalStore } from './localStore';
import { MemoryStorage } from './memoryStorage';
import { createFetchTransport } from './transport';
import type { SyncStorage, Transport } from './types';

export type AppSyncOptions = {
  /** Where the API lives: empty for the same address as the site. */
  baseUrl: string;
  getAuth: EngineOptions['getAuth'];
  /** The signed-in account: its outbox and versions are kept apart from any other account's on this device. */
  accountId?: string | null;
  /** The rest exists so tests can stand in for the browser. */
  store?: LocalStore;
  storage?: SyncStorage;
  transport?: Transport;
  timers?: EngineOptions['timers'];
  clock?: EngineOptions['clock'];
  tuning?: EngineOptions['tuning'];
  /** How long after a save before the database is looked at (a burst of saves is one look). */
  scanDelayMs?: number;
};

export type AppSync = { engine: SyncEngine; bridge: Bridge; stop: () => void };

export const SCAN_DELAY_MS = 800;

/**
 * IndexedDB, or memory where the browser refuses it (some private windows). In memory the waiting list is lost on
 * reload, which is safe: the next look at the database finds the same changes again.
 */
export const openStorage = async (factory?: IDBFactory, name?: string): Promise<SyncStorage> => {
  try {
    const storage = new IdbStorage(factory, name);
    await storage.getMeta();
    return storage;
  } catch (error) {
    console.warn('Sync will keep its notes in memory only; IndexedDB is not available', error instanceof Error ? error.message : error);
    return new MemoryStorage();
  }
};

/** Looks at the database shortly after it changes, in this tab or another. Returns a function that stops watching. */
export const watchSaves = (bridge: Bridge, delayMs: number, timers: EngineOptions['timers']): (() => void) => {
  let handle: unknown = null;
  const set = timers?.set ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clear = timers?.clear ?? ((h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>));
  const look = () => {
    if (handle !== null) clear(handle);
    handle = set(() => {
      handle = null;
      bridge.scan().catch((error) => console.warn('Sync could not look at the saved data; it will try again', error instanceof Error ? error.message : error));
    }, delayMs);
  };
  const stopLocal = onLocalWrite(look);
  const stopOther = onDataChanged(look);
  return () => {
    stopLocal();
    stopOther();
    if (handle !== null) clear(handle);
    handle = null;
  };
};

export const startAppSync = async (options: AppSyncOptions): Promise<AppSync> => {
  let store = options.store;
  if (!store) {
    await initializeDatabase();
    store = createSqlStore(getDatabase());
  }
  const storage = options.storage ?? (await openStorage(undefined, syncDatabaseName(options.accountId)));
  const engineRef: { current: SyncEngine | null } = { current: null };
  const engine = () => engineRef.current as SyncEngine;
  const bridge = new Bridge({
    store,
    storage,
    record: (changes) => engine().recordChanges(changes),
    restartPull: () => engine().restartPull(),
    announce: announceDataChanged,
    now: options.clock?.now,
  });
  const running = new SyncEngine({
    storage,
    applier: bridge,
    transport: options.transport ?? createFetchTransport(options.baseUrl),
    getAuth: options.getAuth,
    exclusive: webLockExclusive(),
    beforePass: async () => {
      await bridge.scan();
    },
    timers: options.timers,
    clock: options.clock,
    tuning: options.tuning,
  });
  engineRef.current = running;
  const detach = typeof window === 'undefined' ? () => undefined : attachBrowserSignals(running);
  const stopWatching = watchSaves(bridge, options.scanDelayMs ?? SCAN_DELAY_MS, options.timers);
  await running.start();
  return {
    engine: running,
    bridge,
    stop: () => {
      stopWatching();
      detach();
      running.stop();
    },
  };
};
