/**
 * "Sign out and remove my data from this device", for a shared or borrowed device.
 *
 * Signing out keeps the data on the device (deviceOwner.ts), so the person finds it again offline. Someone leaving
 * a library computer or a friend's laptop needs the opposite. The removal itself runs at the start of the next page
 * load (removeOnStart.ts), before any part of the app reads storage: the running app holds the data in memory and
 * writes some of it back as the page hides, and the sync databases cannot be deleted while it has them open.
 *
 * What goes: every personal key (the same rule that sets data aside when someone else signs in), this account's
 * own archive, the owner marks, this account's sync database and its entries in the old sync queue. What stays:
 * device settings (theme, language, motion, contrast, the clock) and other accounts' archives, which are not this
 * person's to remove.
 */
import { Events, track } from '../analytics';
import { syncDatabaseName } from '../sync/idbStorage';
import { removeQueuedFor } from '../utils/offlineSync';
import { ARCHIVE_PREFIX, OWNER_KEY, OWNER_SIGNED_IN_KEY, personalKeys } from './deviceOwner';

/** Set at sign-out: whose data the next page load removes. */
export const REMOVE_ON_LOAD_KEY = 'gylio:removeOnLoad';
/** Set once the keys are gone: whose sync databases are still to delete, retried on every load until done. */
export const REMOVE_DATABASES_KEY = 'gylio:removeDatabases';
/** In sessionStorage, so the sign-in page can say once that the data was removed. */
export const REMOVED_NOTICE_KEY = 'gylio:removedNotice';

export const requestRemoval = (userId: string, storage: Storage = window.localStorage): void => {
  storage.setItem(REMOVE_ON_LOAD_KEY, userId);
};

/** Removes the personal keys, `userId`'s archive and the owner marks; keeps device settings and others' archives. */
export const removePersonalData = (storage: Storage, userId: string): void => {
  personalKeys(storage).forEach((key) => storage.removeItem(key));
  [`${ARCHIVE_PREFIX}${userId}`, OWNER_KEY, OWNER_SIGNED_IN_KEY].forEach((key) => storage.removeItem(key));
};

const deleteDatabase = (factory: IDBFactory, name: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = factory.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

type Places = { storage: Storage; session: Storage | null; factory: IDBFactory | null };

const removeDatabases = async ({ storage, factory }: Places, userId: string): Promise<void> => {
  // Another tab of this person's may still have it open; the delete then waits until that tab goes, which it does
  // at once, because the owner mark it watches was just removed (AccountDataGate reloads it).
  if (factory) await deleteDatabase(factory, syncDatabaseName(userId));
  await removeQueuedFor(userId);
  storage.removeItem(REMOVE_DATABASES_KEY);
};

/**
 * Finishes a removal asked for at sign-out. The keys go at once, before the app starts; the databases after, and a
 * second marker keeps that part going on the next load if the page closes first. Returns when both are done.
 */
export const finishRequestedRemoval = async (places: Places): Promise<void> => {
  const { storage, session } = places;
  const userId = storage.getItem(REMOVE_ON_LOAD_KEY);
  if (userId) {
    storage.setItem(REMOVE_DATABASES_KEY, userId);
    removePersonalData(storage, userId);
    if (session) personalKeys(session).forEach((key) => session.removeItem(key));
    session?.setItem(REMOVED_NOTICE_KEY, 'true');
    storage.removeItem(REMOVE_ON_LOAD_KEY);
    track(Events.DEVICE_DATA_REMOVED);
  }
  const databasesOf = storage.getItem(REMOVE_DATABASES_KEY);
  if (databasesOf) await removeDatabases(places, databasesOf);
};

/** True once: whether a removal just finished. */
export const takeRemovedNotice = (session: Storage | null): boolean => {
  if (session?.getItem(REMOVED_NOTICE_KEY) !== 'true') return false;
  session.removeItem(REMOVED_NOTICE_KEY);
  return true;
};

let removedThisPage: boolean | null = null;

/** For the whole page load after a removal, so a screen drawn twice (React's strict mode) still says it. */
export const removedOnThisPage = (): boolean => {
  if (removedThisPage === null) {
    let session: Storage | null = null;
    try {
      session = window.sessionStorage;
    } catch {
      // Storage switched off: there is nothing to say.
    }
    removedThisPage = takeRemovedNotice(session);
  }
  return removedThisPage;
};
