import { describe, expect, it } from 'vitest';
import type { SyncSnapshot, SyncState } from './engine';
import { detailFor, noticeFor } from './status';

const snap = (state: SyncState, extra: Partial<SyncSnapshot> = {}): SyncSnapshot => ({
  state,
  pending: 0,
  refused: 0,
  kept: 0,
  lastSyncedAt: null,
  economy: false,
  ...extra,
});

describe('what the person is told while syncing', () => {
  it.each<[string, SyncState]>([
    ['everything is saved', { kind: 'idle' }],
    ['a pass is running', { kind: 'syncing' }],
    ['nobody is signed in', { kind: 'signed-out' }],
  ])('says nothing when %s', (_label, state) => {
    expect(noticeFor(snap(state, { pending: 3 }))).toBeNull();
  });

  it('puts "saved on this device" first for every kind of wait, with the count', () => {
    expect(noticeFor(snap({ kind: 'waiting', reason: 'offline', retryAt: null }, { pending: 2 }))).toEqual({ messageKey: 'sync.status.offline', tone: 'quiet', pending: 2 });
    expect(noticeFor(snap({ kind: 'waiting', reason: 'paused', retryAt: 5 }))).toMatchObject({ messageKey: 'sync.status.paused', tone: 'quiet' });
    expect(noticeFor(snap({ kind: 'waiting', reason: 'server-error', retryAt: 5 }))).toMatchObject({ messageKey: 'sync.status.retrying' });
    expect(noticeFor(snap({ kind: 'waiting', reason: 'rate-limited', retryAt: 5 }))).toMatchObject({ messageKey: 'sync.status.retrying' });
  });

  it('is calm about a sign-up that is not open yet, and only a needed choice gets a stronger tone', () => {
    expect(noticeFor(snap({ kind: 'closed' }))).toMatchObject({ messageKey: 'sync.status.closed', tone: 'quiet' });
    expect(noticeFor(snap({ kind: 'other-account' }))).toMatchObject({ messageKey: 'sync.status.otherAccount', tone: 'attention' });
  });

  it('never exposes a retry time, which would only invite watching a clock', () => {
    const notice = noticeFor(snap({ kind: 'waiting', reason: 'paused', retryAt: 123456 }));
    expect(JSON.stringify(notice)).not.toContain('123456');
  });
});

describe('the account in Settings', () => {
  it('reports up to date, saving soon, syncing and signed out', () => {
    expect(detailFor(snap({ kind: 'idle' })).headlineKey).toBe('sync.detail.upToDate');
    expect(detailFor(snap({ kind: 'idle' }, { pending: 1 })).headlineKey).toBe('sync.detail.soon');
    expect(detailFor(snap({ kind: 'syncing' })).headlineKey).toBe('sync.detail.syncing');
    expect(detailFor(snap({ kind: 'signed-out' })).headlineKey).toBe('sync.detail.signedOut');
  });

  it('carries refused and kept counts and the last time it worked', () => {
    const detail = detailFor(snap({ kind: 'idle' }, { refused: 2, kept: 1, lastSyncedAt: 99 }));
    expect(detail).toMatchObject({ refused: 2, kept: 1, lastSyncedAt: 99 });
  });

  it('explains the choice when this device holds another account\'s data, and offers nothing else then', () => {
    const detail = detailFor(snap({ kind: 'other-account' }, { pending: 2 }));
    expect(detail).toMatchObject({ headlineKey: 'sync.detail.otherAccount', needsAccountChoice: true, canRetryNow: false });
    expect(detailFor(snap({ kind: 'idle' })).needsAccountChoice).toBe(false);
  });

  it('offers "try now" only when something is waiting', () => {
    expect(detailFor(snap({ kind: 'waiting', reason: 'paused', retryAt: 1 })).canRetryNow).toBe(true);
    expect(detailFor(snap({ kind: 'closed' })).canRetryNow).toBe(true);
    expect(detailFor(snap({ kind: 'idle' })).canRetryNow).toBe(false);
    expect(detailFor(snap({ kind: 'signed-out' })).canRetryNow).toBe(false);
  });
});
