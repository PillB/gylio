import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { syncDatabaseName } from '../sync/idbStorage';
import { addSyncConflict, enqueueSyncAction, listSyncActions, listSyncConflicts } from '../utils/offlineSync';
import { ARCHIVE_PREFIX, OWNER_KEY, OWNER_SIGNED_IN_KEY } from './deviceOwner';
import {
  finishRequestedRemoval,
  REMOVE_DATABASES_KEY,
  REMOVE_ON_LOAD_KEY,
  removePersonalData,
  REMOVED_NOTICE_KEY,
  requestRemoval,
  takeRemovedNotice,
} from './removeDeviceData';

const A_DATA = {
  gylio_sqlite: '{"tasks":{"rows":[{"title":"A: pay rent"}]}}',
  'gylio:timeTracker:v1': '{"title":"A: report"}',
  onboardingFlowState: '{"quickSetup":{"monthlyBudget":"2000"}}',
};
const DEVICE_SETTINGS = { 'theme-mode': 'dark', gylio_lang: 'es-PE', 'accessibility:contrast': 'high', '__clerk_db_jwt': 'x' };

const deviceOfA = () => {
  localStorage.clear();
  sessionStorage.clear();
  Object.entries({ ...A_DATA, ...DEVICE_SETTINGS }).forEach(([key, value]) => localStorage.setItem(key, value));
  localStorage.setItem(OWNER_KEY, 'user_a');
  localStorage.setItem(OWNER_SIGNED_IN_KEY, 'true');
  localStorage.setItem(`${ARCHIVE_PREFIX}user_b`, '{"gylio_sqlite":"B"}');
};

const databaseNames = async () => (await indexedDB.databases()).map((db) => db.name);

/** A sync database left by the page before (its connection closed when that page went). */
const leaveDatabase = (name: string) =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('outbox').put({ title: 'A: pay rent' }, 'tasks:1');
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
const places = () => ({ storage: localStorage, session: sessionStorage, factory: indexedDB });

beforeEach(deviceOfA);

describe('removePersonalData', () => {
  it("removes this person's data and the owner marks, and keeps device settings and other people's data", () => {
    localStorage.setItem(`${ARCHIVE_PREFIX}user_a`, '{"old":"A"}');
    removePersonalData(localStorage, 'user_a');
    Object.keys(A_DATA).forEach((key) => expect(localStorage.getItem(key)).toBeNull());
    expect(localStorage.getItem(OWNER_KEY)).toBeNull();
    expect(localStorage.getItem(OWNER_SIGNED_IN_KEY)).toBeNull();
    expect(localStorage.getItem(`${ARCHIVE_PREFIX}user_a`)).toBeNull();
    Object.entries(DEVICE_SETTINGS).forEach(([key, value]) => expect(localStorage.getItem(key)).toBe(value));
    expect(localStorage.getItem(`${ARCHIVE_PREFIX}user_b`)).toBe('{"gylio_sqlite":"B"}');
  });
});

describe('finishRequestedRemoval', () => {
  it('does nothing when no removal was asked for', async () => {
    const before = { ...localStorage };
    await finishRequestedRemoval(places());
    expect({ ...localStorage }).toEqual(before);
    expect(takeRemovedNotice(sessionStorage)).toBe(false);
  });

  it("removes the keys before the app starts, then this account's sync data, and says so once", async () => {
    await leaveDatabase(syncDatabaseName('user_a'));
    await leaveDatabase(syncDatabaseName('user_b'));
    expect(await databaseNames()).toContain(syncDatabaseName('user_a'));
    const fromA = await enqueueSyncAction({ entityType: 'task', action: 'update', payload: { id: 1 }, clientUpdatedAt: '2026-10-28T10:00:00Z' });
    const fromB = await enqueueSyncAction({ owner: 'user_b', entityType: 'task', action: 'update', payload: { id: 2 }, clientUpdatedAt: '2026-10-28T10:01:00Z' });
    await addSyncConflict({ owner: 'user_a', entityType: 'task', action: 'update', localData: null, remoteData: null, detectedAt: '2026-10-28T10:02:00Z', clientUpdatedAt: '2026-10-28T10:00:00Z' });
    sessionStorage.setItem('gylio:draft', 'A: half-typed note');
    localStorage.setItem('analytics:queue', JSON.stringify([{ name: 'task_created', props: { title: 'A' } }]));
    sessionStorage.setItem('analytics:sessionId', 's1');
    requestRemoval('user_a');

    const done = finishRequestedRemoval(places());
    // The keys go before the first await, so nothing that starts after this line can read them.
    expect(localStorage.getItem('gylio_sqlite')).toBeNull();
    expect(localStorage.getItem(REMOVE_ON_LOAD_KEY)).toBeNull();
    expect(localStorage.getItem(REMOVE_DATABASES_KEY)).toBe('user_a');
    await done;

    expect(localStorage.getItem(REMOVE_DATABASES_KEY)).toBeNull();
    expect(await databaseNames()).not.toContain(syncDatabaseName('user_a'));
    expect(await databaseNames()).toContain(syncDatabaseName('user_b'));
    expect((await listSyncActions()).map((entry) => entry.id)).toEqual([fromB.id]);
    expect(await listSyncConflicts('user_a')).toEqual([]);
    expect(fromA.owner).toBe('user_a');
    expect(sessionStorage.getItem('gylio:draft')).toBeNull();
    expect(sessionStorage.getItem('analytics:sessionId')).toBe('s1');
    // The person's own queued analytics went with the rest; only the count of the removal itself is left.
    expect(JSON.parse(localStorage.getItem('analytics:queue') ?? '[]').map((event: { name: string }) => event.name)).toEqual(['device_data_removed']);
    expect(takeRemovedNotice(sessionStorage)).toBe(true);
    expect(takeRemovedNotice(sessionStorage)).toBe(false);
    expect(localStorage.getItem('theme-mode')).toBe('dark');
  });

  it('also removes the older, unnamed sync database when it was synced for this account, and only then', async () => {
    const leaveOlder = (owner: string) =>
      new Promise<void>((resolve) => {
        const request = indexedDB.open('gylio-sync-v2', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('meta').put({ cursor: 3, owner }, 'state');
        request.onsuccess = () => {
          request.result.close();
          resolve();
        };
      });
    await leaveOlder('user_b');
    requestRemoval('user_a');
    await finishRequestedRemoval(places());
    expect(await databaseNames()).toContain('gylio-sync-v2');

    await new Promise((resolve) => (indexedDB.deleteDatabase('gylio-sync-v2').onsuccess = resolve));
    await leaveOlder('user_a');
    requestRemoval('user_a');
    await finishRequestedRemoval(places());
    expect(await databaseNames()).not.toContain('gylio-sync-v2');
  });

  it("finishes only the databases after an interrupted removal, never the next person's data", async () => {
    localStorage.setItem(REMOVE_DATABASES_KEY, 'user_a');
    localStorage.setItem(OWNER_KEY, 'user_b');
    await finishRequestedRemoval(places());
    expect(localStorage.getItem('gylio_sqlite')).toBe(A_DATA.gylio_sqlite);
    expect(localStorage.getItem(OWNER_KEY)).toBe('user_b');
    expect(localStorage.getItem(REMOVE_DATABASES_KEY)).toBeNull();
    expect(sessionStorage.getItem(REMOVED_NOTICE_KEY)).toBeNull();
  });
});
