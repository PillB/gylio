import { SKIPPED, type SyncEngine } from './engine';

export const SYNC_TAG = 'gylio-sync';
const LOCK_NAME = 'gylio-sync';

type LockManagerLike = {
  request<T>(name: string, options: { ifAvailable: boolean }, callback: (lock: unknown) => Promise<T>): Promise<T>;
};

/** Only one tab syncs at a time (Web Locks, available in all current browsers since 2022). Without them, every tab may. */
export const webLockExclusive =
  (locks: LockManagerLike | undefined = (typeof navigator === 'undefined' ? undefined : (navigator as { locks?: LockManagerLike }).locks)) =>
  async <T>(work: () => Promise<T>): Promise<T | typeof SKIPPED> => {
    if (!locks) return work();
    return locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => (lock ? work() : SKIPPED));
  };

/**
 * Background Sync (Chrome and Edge only) lets the browser wake the service worker to send what is
 * waiting after the tab closed. Everywhere else the engine relies on the page being open, plus the
 * flush when it is hidden. Failure to register is not an error.
 */
export const requestBackgroundSync = async () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const { sync } = registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } };
    await sync?.register(SYNC_TAG);
  } catch {
    // Not supported or not allowed: the open page keeps syncing.
  }
};

/**
 * Connects the engine to what the browser tells us: network up or down (a hint, never proof), the tab
 * hidden or shown, and the service worker's Background Sync wake-up. Returns a function that undoes it.
 */
export const attachBrowserSignals = (engine: SyncEngine, target: { win: Window; doc: Document } = { win: window, doc: document }) => {
  const { win, doc } = target;
  const onOnline = () => engine.setOnline(true);
  const onOffline = () => engine.setOnline(false);
  const onVisibility = () => engine.setVisible(doc.visibilityState !== 'hidden');
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === SYNC_TAG) engine.kick('background');
  };
  engine.setOnline(win.navigator.onLine !== false);
  engine.setVisible(doc.visibilityState !== 'hidden');
  win.addEventListener('online', onOnline);
  win.addEventListener('offline', onOffline);
  doc.addEventListener('visibilitychange', onVisibility);
  win.navigator.serviceWorker?.addEventListener('message', onMessage);
  return () => {
    win.removeEventListener('online', onOnline);
    win.removeEventListener('offline', onOffline);
    doc.removeEventListener('visibilitychange', onVisibility);
    win.navigator.serviceWorker?.removeEventListener('message', onMessage);
  };
};
