import { describe, expect, it } from 'vitest';
import {
  BACKUP_KEY, applySnapshot, collectSnapshot, decideFirstSync, snapshotHash,
} from './accountSync';

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() { return map.size; },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    dump: () => Object.fromEntries(map),
  };
}

describe('collectSnapshot', () => {
  it('keeps app data, including keys it has never heard of, and drops device-only keys', () => {
    const storage = memoryStorage({
      gylio_sqlite: '{"tasks":[]}', 'theme-mode': 'dark', 'some-future-feature': 'x',
      '__clerk_db_jwt': 'secret', 'gylio:anonId': 'abc', 'analytics:queue': '[]', 'gylio:sync:meta': '{}',
      'gylio:entitlement:v1': '{}',
    });
    expect(Object.keys(collectSnapshot(storage)).sort()).toEqual(['gylio_sqlite', 'some-future-feature', 'theme-mode']);
  });
});

describe('snapshotHash', () => {
  it('ignores key order but notices any value change', () => {
    expect(snapshotHash({ a: '1', b: '2' })).toBe(snapshotHash({ b: '2', a: '1' }));
    expect(snapshotHash({ a: '1', b: '2' })).not.toBe(snapshotHash({ a: '1', b: '3' }));
  });
});

describe('applySnapshot', () => {
  it('replaces app data, keeps device-only keys, and backs up what it replaced', () => {
    const storage = memoryStorage({ gylio_sqlite: 'local', 'theme-mode': 'dark', '__clerk_x': 'keep' });
    applySnapshot(storage, { gylio_sqlite: 'server', onboardingFlowState: '{}' }, '2026-10-01T00:00:00Z');
    const after = storage.dump();
    expect(after.gylio_sqlite).toBe('server');
    expect(after.onboardingFlowState).toBe('{}');
    expect(after['theme-mode']).toBeUndefined();
    expect(after['__clerk_x']).toBe('keep');
    expect(JSON.parse(after[BACKUP_KEY])[0].data).toEqual({ gylio_sqlite: 'local', 'theme-mode': 'dark' });
  });
});

describe('decideFirstSync', () => {
  // Real shim format with one row, i.e. something the person made.
  const local = { gylio_sqlite: '{"tasks":{"rows":[{"id":1}],"nextId":2}}', onboardingFlowState: '{}' };
  const server = { version: 3, updatedAt: 't', data: { gylio_sqlite: 'S' } };

  it('uploads when the account has no copy yet', () => {
    expect(decideFirstSync({ userId: 'u', server: null, meta: null, local })).toBe('upload');
  });
  it('restores onto an empty device', () => {
    expect(decideFirstSync({ userId: 'u', server, meta: null, local: {} })).toBe('restore');
  });
  it('asks instead of overwriting when both this device and the account have data', () => {
    expect(decideFirstSync({ userId: 'u', server, meta: null, local })).toBe('ask');
  });
  it('never offers one person\'s synced data to the next person who signs in on the same browser', () => {
    const theirs = { userId: 'other', version: 3, hash: snapshotHash(local), savedAt: null };
    // The new person has no saved copy: their account must not receive the previous person's data.
    expect(decideFirstSync({ userId: 'u', server: null, meta: theirs, local })).toBe('fresh');
    // The new person has a saved copy: use it, not the previous person's data.
    expect(decideFirstSync({ userId: 'u', server, meta: theirs, local })).toBe('restore');
  });
  it('pulls a newer copy when this device has no unsaved edits, and asks when it does', () => {
    const synced = { userId: 'u', version: 2, hash: snapshotHash(local), savedAt: null };
    expect(decideFirstSync({ userId: 'u', server, meta: synced, local })).toBe('restore');
    expect(decideFirstSync({ userId: 'u', server, meta: synced, local: { ...local, gylio_sqlite: 'edited' } })).toBe('ask');
  });
  it('pushes local edits when the account copy has not moved', () => {
    const synced = { userId: 'u', version: 3, hash: snapshotHash(local), savedAt: null };
    expect(decideFirstSync({ userId: 'u', server, meta: synced, local })).toBe('in_sync');
    expect(decideFirstSync({ userId: 'u', server, meta: synced, local: { ...local, gylio_sqlite: 'edited' } })).toBe('push');
  });
});

describe('review fixes: new devices, false conflicts, backups', () => {
  const sqlite = (rows: number) => JSON.stringify({ tasks: { rows: Array.from({ length: rows }, (_, i) => ({ id: i + 1 })), nextId: rows + 1 } });

  it('treats a fresh install (empty tables, onboarding not finished) as having no data', async () => {
    const { hasAppData } = await import('./accountSync');
    expect(hasAppData({ gylio_sqlite: sqlite(0), onboardingFlowState: '{"isOnboardingComplete":false}', 'theme-mode': 'dark' })).toBe(false);
    expect(hasAppData({ gylio_sqlite: sqlite(2) })).toBe(true);
    expect(hasAppData({ onboardingFlowState: '{"isOnboardingComplete":true}' })).toBe(true);
  });

  it('restores the account onto a new device that only has start-up defaults', () => {
    const server = { version: 4, updatedAt: 't', data: { gylio_sqlite: sqlite(5) } };
    const freshInstall = { gylio_sqlite: sqlite(0), onboardingFlowState: '{"isOnboardingComplete":false}' };
    expect(decideFirstSync({ userId: 'u', server, meta: null, local: freshInstall })).toBe('restore');
  });

  it('sees identical data as in sync even when the last save was never confirmed', () => {
    const data = { gylio_sqlite: sqlite(3) };
    const server = { version: 7, updatedAt: 't', data };
    const staleMeta = { userId: 'u', version: 6, hash: 'old', savedAt: null };
    expect(decideFirstSync({ userId: 'u', server, meta: staleMeta, local: { ...data } })).toBe('in_sync');
  });

  it('does not count the per-device "last active" and welcome-back keys as edits', () => {
    const storage = memoryStorage({ gylio_sqlite: sqlite(1), 'gylio:lastActiveDate': '2026-10-01', 'gylio:welcomeBackDismissed': '2026-10-01' });
    expect(Object.keys(collectSnapshot(storage))).toEqual(['gylio_sqlite']);
  });

  it('keeps the last three backups, newest first, each tagged with whose data it was', async () => {
    const { backupsFor } = await import('./accountSync');
    const storage = memoryStorage({ gylio_sqlite: 'v1' });
    applySnapshot(storage, { gylio_sqlite: 'v2' }, '2026-10-01T00:00:00Z', 'user_a');
    applySnapshot(storage, { gylio_sqlite: 'v3' }, '2026-10-02T00:00:00Z', 'user_a');
    applySnapshot(storage, { gylio_sqlite: 'v4' }, '2026-10-03T00:00:00Z', 'user_a');
    applySnapshot(storage, { gylio_sqlite: 'v5' }, '2026-10-04T00:00:00Z', 'user_a');
    expect(backupsFor(storage, 'user_a').map((b) => b.data.gylio_sqlite)).toEqual(['v4', 'v3', 'v2']);
  });

  it("never offers one person's set-aside data to the next person on the same browser", async () => {
    const { backupsFor } = await import('./accountSync');
    const storage = memoryStorage({ gylio_sqlite: 'alice-tasks' });
    applySnapshot(storage, {}, '2026-10-01T00:00:00Z', 'user_alice');
    expect(backupsFor(storage, 'user_bob')).toEqual([]);
    expect(backupsFor(storage, 'user_alice')[0].data.gylio_sqlite).toBe('alice-tasks');
    // Data made before anyone signed in belongs to whoever signs in first.
    const anonymous = memoryStorage({ gylio_sqlite: 'local-only' });
    applySnapshot(anonymous, {}, '2026-10-01T00:00:00Z', null);
    expect(backupsFor(anonymous, 'user_bob')).toHaveLength(1);
  });

  it('still reads a backup saved in the old single-object format', async () => {
    const { backupsFor } = await import('./accountSync');
    const storage = memoryStorage({ [BACKUP_KEY]: JSON.stringify({ savedAt: 't', data: { gylio_sqlite: 'old' } }) });
    expect(backupsFor(storage, 'anyone')[0].data.gylio_sqlite).toBe('old');
  });
});
