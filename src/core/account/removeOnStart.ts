/**
 * Imported first by src/index.jsx, so a removal asked for at sign-out (removeDeviceData.ts) finishes before any
 * other module reads storage: the database stand-in (src/shims/expo-sqlite.ts) loads its copy as it is imported.
 */
import { finishRequestedRemoval } from './removeDeviceData';

const storageOrNull = (pick: () => Storage): Storage | null => {
  try {
    return pick();
  } catch {
    return null;
  }
};

const storage = typeof window === 'undefined' ? null : storageOrNull(() => window.localStorage);
if (storage) {
  finishRequestedRemoval({
    storage,
    session: storageOrNull(() => window.sessionStorage),
    factory: 'indexedDB' in window ? window.indexedDB : null,
  }).catch((error) => console.warn('Removing data from this device will finish on the next start', error instanceof Error ? error.message : error));
}
