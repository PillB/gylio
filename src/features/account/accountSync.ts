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
  // Written automatically on every app start; per device, and never a user edit.
  /^gylio:lastActiveDate$/,
  /^gylio:welcomeBackDismissed$/,
  /^gylio:lastStreakBeforeBreak$/,
];

const MAX_BACKUPS = 3;

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

function parseJson(value: string | undefined): unknown {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

/**
 * True when this device holds something the person made, not just the
 * defaults every fresh install writes on start-up (empty tables, an
 * unfinished onboarding, a theme choice).
 */
export function hasAppData(snapshot: Snapshot): boolean {
  const tables = parseJson(snapshot.gylio_sqlite) as Record<string, { rows?: unknown[] }> | null;
  const hasRows = Boolean(tables) && Object.values(tables as object).some((t) => Array.isArray(t?.rows) && t.rows.length > 0);
  const onboarding = parseJson(snapshot.onboardingFlowState) as { isOnboardingComplete?: boolean } | null;
  return hasRows || Boolean(onboarding?.isOnboardingComplete);
}

export type Backup = { savedAt: string; ownerId: string | null; data: Snapshot };

function readBackups(storage: StorageLike): Backup[] {
  const raw = parseJson(storage.getItem(BACKUP_KEY) ?? undefined);
  if (Array.isArray(raw)) return raw as Backup[];
  // Older single-backup format, before backups were tagged with their owner.
  if (raw && typeof raw === 'object' && 'data' in raw) return [{ ownerId: null, ...(raw as Omit<Backup, 'ownerId'>) }];
  return [];
}

/** Backups this person may restore: their own, or data made before anyone signed in. */
export function backupsFor(storage: StorageLike, userId: string | null): Backup[] {
  return readBackups(storage).filter((b) => b.ownerId === null || b.ownerId === userId);
}

function writeBackups(storage: StorageLike, backups: Backup[]): void {
  // Each backup is a full copy; if the browser's storage is full, keep fewer rather than fail the restore.
  for (let keep = backups.length; keep > 0; keep -= 1) {
    try {
      storage.setItem(BACKUP_KEY, JSON.stringify(backups.slice(0, keep)));
      return;
    } catch {
      // try again with one fewer
    }
  }
}

/** Remove one backup after it has been restored. */
export function dropBackup(storage: StorageLike, savedAt: string): void {
  writeBackups(storage, readBackups(storage).filter((b) => b.savedAt !== savedAt));
}

/**
 * Replace this device's app data with `data`. The previous data is kept as a
 * backup tagged with whose it was (the last three are kept), so a restore can
 * be undone, and never by a different person.
 */
export function applySnapshot(storage: StorageLike, data: Snapshot, now: string, ownerId: string | null = null): void {
  const previous = collectSnapshot(storage);
  if (Object.keys(previous).length) {
    writeBackups(storage, [{ savedAt: now, ownerId, data: previous }, ...readBackups(storage)].slice(0, MAX_BACKUPS));
  }
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
  // Same content on both sides: nothing to choose, whatever the version numbers say.
  if (snapshotHash(local) === snapshotHash(server.data)) return 'in_sync';
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
