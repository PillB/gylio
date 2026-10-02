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
    expect(JSON.parse(after[BACKUP_KEY]).data).toEqual({ gylio_sqlite: 'local', 'theme-mode': 'dark' });
  });
});

describe('decideFirstSync', () => {
  const local = { gylio_sqlite: 'L', onboardingFlowState: '{}' };
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
