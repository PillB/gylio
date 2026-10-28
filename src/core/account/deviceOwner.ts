/**
 * Whose data is on this device, and setting it aside when someone else signs in.
 *
 * Everything the app keeps (tasks, budget, debts, the timer, onboarding answers) lives in this browser's
 * localStorage, not per account. On a shared laptop, after A signed out and B signed in, B saw A's tasks,
 * budget and debts, and B's edits mixed into them. The device now remembers the account its data belongs to.
 * When a different account signs in, that data is moved into an archive under the previous account's id and
 * that account's own archive (if any) is brought back, before any screen shows. Nothing is deleted: when A
 * signs in again, A's data returns as it was.
 *
 * Settings that describe the device rather than the person (theme, language, motion and contrast settings,
 * the clock) stay where they are, and so does Clerk's own sign-in state. Every other key counts as personal,
 * so a feature that adds a new key is covered without anyone remembering to list it here.
 */

export const OWNER_KEY = 'gylio:owner';
/** 'true' while the device's owner is signed in; lets the app open offline, when sign-in cannot be checked. */
export const OWNER_SIGNED_IN_KEY = 'gylio:ownerSignedIn';
export const ARCHIVE_PREFIX = 'gylio:archive:';
export const OWNER_CHANGED_EVENT = 'gylio:owner-changed';

const DEVICE_KEYS = [
  /^theme-mode$/,
  /^gylio_lang$/,
  /^i18nextLng$/,
  /^accessibility:/,
  /^gylio_clock_granularity$/,
  /^gylio:installId$/,
  // Analytics counts devices and visits, not people, so an experiment never puts one device in two groups.
  /^gylio:anonId$/,
  /^analytics:sessionId$/,
  /^gylio:owner$/,
  /^gylio:ownerSignedIn$/,
  /^gylio:archive:/,
  // "Remove my data from this device", still to finish (removeDeviceData.ts).
  /^gylio:remove/,
  /^__clerk/i,
  /^clerk/i,
];

export const isPersonalKey = (key: string): boolean => !DEVICE_KEYS.some((pattern) => pattern.test(key));

export type OwnerDecision = 'claim' | 'same' | 'switch';

/** What to do when `userId` is signed in and the device holds `owner`'s data (null: nobody's yet). */
export const decideOwner = (owner: string | null, userId: string): OwnerDecision => {
  if (owner === null) return 'claim';
  return owner === userId ? 'same' : 'switch';
};

const safeStorage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const readOwner = (storage: Storage | null = safeStorage()): string | null => {
  try {
    return storage?.getItem(OWNER_KEY) ?? null;
  } catch {
    return null;
  }
};

const announce = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OWNER_CHANGED_EVENT));
};

export const writeOwner = (userId: string, storage: Storage | null = safeStorage()): void => {
  storage?.setItem(OWNER_KEY, userId);
  announce();
};

export const ownerSignedIn = (storage: Storage | null = safeStorage()): boolean => {
  try {
    return storage?.getItem(OWNER_SIGNED_IN_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setOwnerSignedIn = (signedIn: boolean, storage: Storage | null = safeStorage()): void => {
  try {
    storage?.setItem(OWNER_SIGNED_IN_KEY, String(signedIn));
  } catch {
    // Only the offline shortcut depends on it; without it the app waits for sign-in as before.
  }
};

export const personalKeys = (storage: Storage): string[] => {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key !== null && isPersonalKey(key)) keys.push(key);
  }
  return keys;
};

/** There was no room to set the previous account's data aside; nothing was changed. */
export class NoRoomToSetAside extends Error {
  constructor() {
    super('No room on this device to set the previous account’s data aside');
    this.name = 'NoRoomToSetAside';
  }
}

/**
 * Moves the personal data into `owner`'s archive. The archive is written first and the live keys removed only
 * after it saved, so running out of space leaves everything as it was.
 */
export const setAside = (storage: Storage, owner: string): void => {
  const keys = personalKeys(storage);
  const snapshot = Object.fromEntries(keys.map((key) => [key, storage.getItem(key) as string]));
  try {
    storage.setItem(`${ARCHIVE_PREFIX}${owner}`, JSON.stringify(snapshot));
  } catch {
    throw new NoRoomToSetAside();
  }
  keys.forEach((key) => storage.removeItem(key));
};

export const hasArchive = (owner: string, storage: Storage | null = safeStorage()): boolean => {
  try {
    return storage?.getItem(`${ARCHIVE_PREFIX}${owner}`) != null;
  } catch {
    return false;
  }
};

/** Puts `owner`'s archived data back, if there is any, and removes the archive. */
export const bringBack = (storage: Storage, owner: string): void => {
  const archiveKey = `${ARCHIVE_PREFIX}${owner}`;
  const raw = storage.getItem(archiveKey);
  if (raw === null) return;
  let snapshot: Record<string, unknown>;
  try {
    snapshot = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return; // A damaged archive stays where it is rather than being half-applied.
  }
  for (const [key, value] of Object.entries(snapshot)) {
    if (typeof value === 'string' && isPersonalKey(key)) storage.setItem(key, value);
  }
  storage.removeItem(archiveKey);
};

/**
 * Sets the current data aside for `from`, brings back `to`'s, and records `to` as the owner. If `to`'s data
 * cannot be put back in full, `from`'s is restored and the owner stays `from`, so a later attempt never files
 * half of one account's data under the other's name.
 *
 * It does nothing unless the device still holds `from`'s data: a second run (React runs effects twice in
 * development, and another tab may have switched first) would otherwise file `to`'s data under `from`'s name,
 * over `from`'s real archive.
 */
export const switchOwner = (storage: Storage, from: string, to: string): void => {
  if (readOwner(storage) !== from) return;
  setAside(storage, from);
  try {
    bringBack(storage, to);
  } catch {
    personalKeys(storage).forEach((key) => storage.removeItem(key));
    bringBack(storage, from);
    throw new NoRoomToSetAside();
  }
  storage.setItem(OWNER_KEY, to);
  storage.setItem(OWNER_SIGNED_IN_KEY, 'true');
  announce();
};
