import type { SyncEntityType } from './offlineSync';

/** The server's side of a conflict from the older offline queue. */
export type ServerCopy = { kind: 'record'; record: Record<string, unknown> } | { kind: 'deleted' } | { kind: 'unreadable' };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A field every real record of the type has; a copy without it is not one the app should save. */
const REQUIRED_FIELD: Record<SyncEntityType, string> = { task: 'title', event: 'title', transaction: 'amount' };

const hasValue = (value: unknown) => value !== undefined && value !== null && !(typeof value === 'string' && !value.trim());

/**
 * Reads the server's copy out of a 409 answer. The Worker answers `{ error, current: { deleted, data } }`, which
 * the review list used to read as the record itself: the task had no title, so "Use the server's version" saved
 * one with an empty title. A missing or unreadable body used to count as "deleted on the server" and removed the
 * local record. Now only an explicit tombstone means deleted, and anything this cannot read is 'unreadable', so
 * the person can keep this device's version but is never offered a copy that would wipe it.
 */
export const serverCopyOf = (entityType: SyncEntityType, remoteData: unknown): ServerCopy => {
  if (!isObject(remoteData)) return { kind: 'unreadable' };
  let record: unknown = remoteData;
  if ('current' in remoteData) {
    const current = remoteData.current;
    if (!isObject(current)) return { kind: 'unreadable' };
    if (current.deleted === true) return { kind: 'deleted' };
    record = current.data;
  } else if ('error' in remoteData) {
    return { kind: 'unreadable' };
  }
  if (!isObject(record) || !hasValue(record[REQUIRED_FIELD[entityType]])) return { kind: 'unreadable' };
  return { kind: 'record', record };
};
