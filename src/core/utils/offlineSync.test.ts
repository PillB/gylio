import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { enqueueSyncAction, listSyncActions, removeSyncAction, updateSyncAction } from './offlineSync';

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
