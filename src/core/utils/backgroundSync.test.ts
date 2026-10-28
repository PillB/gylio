import { describe, expect, it, vi } from 'vitest';

import { legacySyncEnabled, methodForSyncAction, processSyncQueue, resolveSyncEndpoint } from './backgroundSync';

describe('resolveSyncEndpoint', () => {
  it('resolves task routes against current origin', () => {
    expect(resolveSyncEndpoint('task')).toBe('http://localhost:3000/api/tasks');
    expect(resolveSyncEndpoint('task', 'abc')).toBe('http://localhost:3000/api/tasks/abc');
  });

  it('resolves event routes against current origin', () => {
    expect(resolveSyncEndpoint('event')).toBe('http://localhost:3000/api/events');
    expect(resolveSyncEndpoint('event', 'evt-1')).toBe('http://localhost:3000/api/events/evt-1');
  });

  it('resolves transaction routes against current origin', () => {
    expect(resolveSyncEndpoint('transaction')).toBe('http://localhost:3000/api/transactions');
    expect(resolveSyncEndpoint('transaction', 9)).toBe('http://localhost:3000/api/transactions/9');
  });
});

describe('methodForSyncAction', () => {
  it('maps create/update/delete actions to the expected methods', () => {
    expect(methodForSyncAction('create')).toBe('POST');
    expect(methodForSyncAction('update')).toBe('PUT');
    expect(methodForSyncAction('delete')).toBe('DELETE');
  });

  it('falls back to POST for unknown actions', () => {
    expect(methodForSyncAction('unknown' as never)).toBe('POST');
  });
});

describe('legacySyncEnabled', () => {
  it.each([[undefined], [''], ['   ']])('is off with no separate API origin (%j)', (value) => {
    expect(legacySyncEnabled(value)).toBe(false);
  });

  it('is on only when a separate API origin is configured on purpose', () => {
    expect(legacySyncEnabled('https://api.example.com', false)).toBe(true);
  });

  it('is off in a build with account sync, even with an API origin, so one change is never sent twice', () => {
    expect(legacySyncEnabled('https://api.example.com', true)).toBe(false);
  });

  it('does not touch the queue or the network when it is off, so the single-origin deploy never receives its calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await processSyncQueue();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
