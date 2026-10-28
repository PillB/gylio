import { describe, expect, it } from 'vitest';
import { decide } from './conflict';
import type { OutboxEntry, RemoteRecord } from './types';

const local = (op: 'put' | 'delete', at: number): OutboxEntry => ({
  key: 'tasks:a',
  entity: 'tasks',
  id: 'a',
  op,
  data: op === 'put' ? { title: 'mine' } : null,
  rev: 1,
  localUpdatedAt: at,
});
const remote = (updatedAt: number, deleted = false): RemoteRecord => ({
  entity: 'tasks',
  id: 'a',
  version: 4,
  seq: 10,
  updatedAt,
  deleted,
  ...(deleted ? {} : { data: { title: 'theirs' } }),
});

describe('deciding between this device and the server', () => {
  it('the later edit wins when both edited', () => {
    expect(decide(local('put', 2000), remote(1000))).toEqual({ action: 'keep-local' });
    expect(decide(local('put', 1000), remote(2000))).toEqual({ action: 'take-remote', keepLoser: true });
  });

  it('a tie goes to the change made on this device', () => {
    expect(decide(local('put', 1000), remote(1000))).toEqual({ action: 'keep-local' });
  });

  it('an edit here survives a delete elsewhere, even a later one', () => {
    expect(decide(local('put', 1000), remote(9000, true))).toEqual({ action: 'keep-local' });
  });

  it('a delete here and a delete there agree', () => {
    expect(decide(local('delete', 1000), remote(9000, true))).toEqual({ action: 'both-gone' });
  });

  it('a delete here loses to a later edit there, and nothing is kept for a delete', () => {
    expect(decide(local('delete', 1000), remote(2000))).toEqual({ action: 'take-remote', keepLoser: false });
    expect(decide(local('delete', 3000), remote(2000))).toEqual({ action: 'keep-local' });
  });

  it('a record the server no longer has is sent again, unless we were deleting it anyway', () => {
    expect(decide(local('put', 1), null)).toEqual({ action: 'recreate' });
    expect(decide(local('delete', 1), null)).toEqual({ action: 'both-gone' });
  });
});
