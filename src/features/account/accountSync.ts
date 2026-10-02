/**
 * accountSync — what "saving to your account" means, as pure functions.
 *
 * Gylio stores everything in this browser's localStorage (the SQLite shim,
 * settings, onboarding, routines…). A snapshot is every key EXCEPT the ones
 * that belong to this device or to the sync itself. A denylist, not an
 * allowlist: a feature added later is saved automatically instead of being
 * silently left out.
 */
import { fnv1a } from '../experiments/experiments';

export const META_KEY = 'gylio:sync:meta';
export const BACKUP_KEY = 'gylio:preRestoreBackup';

/** Keys that describe this device, this session or the sync itself. */
const DEVICE_ONLY: readonly RegExp[] = [
  /^__clerk/i,
  /^clerk/i,
  /^gylio:sync:/,
  /^gylio:preRestoreBackup$/,
  /^gylio:entitlement:/,
  /^gylio:anonId$/,
  /^analytics:/,
];

export type Snapshot = Record<string, string>;
export type SyncMeta = { userId: string; version: number; hash: string; savedAt: string | null };

type StorageLike = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>;

export const isDeviceOnly = (key: string) => DEVICE_ONLY.some((pattern) => pattern.test(key));

export function collectSnapshot(storage: StorageLike): Snapshot {
  const snapshot: Snapshot = {};
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key === null || isDeviceOnly(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) snapshot[key] = value;
  }
  return snapshot;
}

/** Order-independent fingerprint, used only to notice "something changed". */
export function snapshotHash(snapshot: Snapshot): string {
  const canonical = JSON.stringify(Object.keys(snapshot).sort().map((key) => [key, snapshot[key]]));
  return fnv1a(canonical).toString(16);
}

/** True when this device holds real app data rather than a fresh install. */
export function hasAppData(snapshot: Snapshot): boolean {
  return Object.keys(snapshot).some((key) => key === 'gylio_sqlite' || key === 'onboardingFlowState');
}

/**
 * Replace this device's app data with `data`. The previous data is kept in
 * BACKUP_KEY first, so a restore can always be undone.
 */
export function applySnapshot(storage: StorageLike, data: Snapshot, now: string): void {
  const previous = collectSnapshot(storage);
  storage.setItem(BACKUP_KEY, JSON.stringify({ savedAt: now, data: previous }));
  for (const key of Object.keys(previous)) {
    if (!(key in data)) storage.removeItem(key);
  }
  for (const [key, value] of Object.entries(data)) {
    if (!isDeviceOnly(key)) storage.setItem(key, value);
  }
}

export type ServerState = { version: number; updatedAt: string; data: Snapshot } | null;

export type FirstSyncDecision = 'upload' | 'restore' | 'ask' | 'in_sync' | 'push' | 'fresh';

/**
 * What to do when a person signs in on this device.
 * - no server copy: upload this device's data (if any)
 * - server copy and this device already synced this account: push local edits or stay
 * - device last synced for a different person: its data is not this person's.
 *   Restore their copy, or start empty; never upload or offer it to them
 * - server copy, device never synced any account: restore if the device is
 *   empty, otherwise ask, because either choice would discard something
 */
export function decideFirstSync(args: {
  userId: string;
  server: ServerState;
  meta: SyncMeta | null;
  local: Snapshot;
}): FirstSyncDecision {
  const { userId, server, meta, local } = args;
  if (meta && meta.userId !== userId) return server ? 'restore' : 'fresh';
  if (!server) return hasAppData(local) ? 'upload' : 'in_sync';
  if (!meta) return hasAppData(local) ? 'ask' : 'restore';
  return decideKnownDevice(server, meta, local);
}

/** This device already synced this account before. */
function decideKnownDevice(server: NonNullable<ServerState>, meta: SyncMeta, local: Snapshot): FirstSyncDecision {
  const unchanged = meta.hash === snapshotHash(local);
  if (meta.version !== server.version) return unchanged ? 'restore' : 'ask';
  return unchanged ? 'in_sync' : 'push';
}

export function readMeta(storage: StorageLike): SyncMeta | null {
  try {
    return JSON.parse(storage.getItem(META_KEY) || 'null');
  } catch {
    return null;
  }
}

export function writeMeta(storage: StorageLike, meta: SyncMeta): void {
  storage.setItem(META_KEY, JSON.stringify(meta));
}
