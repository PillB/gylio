import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { OWNER_KEY } from '../account/deviceOwner';
import { addSyncConflict, enqueueSyncAction, listPendingSyncActions, listSyncActions, listSyncConflicts, removeSyncAction, removeSyncConflict, updateSyncAction } from './offlineSync';

describe('updateSyncAction', () => {
  it('changes only the entry it names and keeps the rest of it', async () => {
    const first = await enqueueSyncAction({ entityType: 'task', action: 'update', payload: { id: 1 }, clientUpdatedAt: '2026-10-28T10:00:00Z' });
    const second = await enqueueSyncAction({ entityType: 'event', action: 'create', payload: { id: 2 }, clientUpdatedAt: '2026-10-28T10:01:00Z' });

    await updateSyncAction(first.id, { status: 'retry', attempts: 3 });

    const entries = await listSyncActions();
    expect(entries.find((entry) => entry.id === first.id)).toMatchObject({ status: 'retry', attempts: 3, entityType: 'task', payload: { id: 1 } });
    expect(entries.find((entry) => entry.id === second.id)).toMatchObject({ status: 'pending', attempts: 0 });
    await removeSyncAction(first.id);
    await removeSyncAction(second.id);
  });

  it('does nothing for an entry that is gone', async () => {
    await updateSyncAction('missing', { status: 'retry' });
    expect(await listSyncActions()).toEqual([]);
  });
});

describe('a shared device', () => {
  it("sends and shows only the signed-in account's queued changes; the rest wait for their own account", async () => {
    localStorage.setItem(OWNER_KEY, 'user_a');
    const fromA = await enqueueSyncAction({ entityType: 'task', action: 'update', payload: { id: 1 }, clientUpdatedAt: '2026-10-28T10:00:00Z' });
    localStorage.removeItem(OWNER_KEY);
    const beforeSignIn = await enqueueSyncAction({ entityType: 'task', action: 'update', payload: { id: 2 }, clientUpdatedAt: '2026-10-28T10:01:00Z' });
    const conflictA = await addSyncConflict({ owner: 'user_a', entityType: 'task', action: 'update', localData: null, remoteData: null, detectedAt: '2026-10-28T10:02:00Z', clientUpdatedAt: '2026-10-28T10:00:00Z' });
    expect(fromA.owner).toBe('user_a');

    expect((await listPendingSyncActions('user_b')).map((entry) => entry.id)).toEqual([beforeSignIn.id]);
    expect(await listSyncConflicts('user_b')).toEqual([]);
    expect((await listPendingSyncActions('user_a')).map((entry) => entry.id)).toEqual([fromA.id, beforeSignIn.id]);
    expect((await listSyncConflicts('user_a')).map((entry) => entry.id)).toEqual([conflictA.id]);

    await removeSyncAction(fromA.id);
    await removeSyncAction(beforeSignIn.id);
    await removeSyncConflict(conflictA.id);
    localStorage.clear();
  });
});
