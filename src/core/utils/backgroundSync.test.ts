import { describe, expect, it } from 'vitest';

import { methodForSyncAction, resolveSyncEndpoint } from './backgroundSync';

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
