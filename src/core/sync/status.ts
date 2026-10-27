import type { SyncSnapshot } from './engine';

/**
 * What the person sees about syncing, as keys for the translation files (src/i18n/*.json, `sync.*`).
 * Rules this follows, from the research in docs/sync-resilience.md:
 *  - quiet by default: nothing at all while everything is saved or about to be;
 *  - a waiting state says where the data is ("saved on this device") before anything else;
 *  - no countdowns, no error colours, no "failed": waiting is normal and sync retries on its own;
 *  - something that needs a choice is the only thing with a stronger tone.
 */
export type SyncNotice = {
  messageKey: string;
  tone: 'quiet' | 'attention';
  /** How many changes are saved on this device and not on the server yet (0 hides the count). */
  pending: number;
};

export const noticeFor = (snapshot: SyncSnapshot): SyncNotice | null => {
  const { state, pending } = snapshot;
  switch (state.kind) {
    case 'waiting':
      return { messageKey: waitingKey(state.reason), tone: 'quiet', pending };
    case 'closed':
      return { messageKey: 'sync.status.closed', tone: 'quiet', pending };
    case 'other-account':
      return { messageKey: 'sync.status.otherAccount', tone: 'attention', pending };
    default:
      return null;
  }
};

const waitingKey = (reason: 'offline' | 'paused' | 'rate-limited' | 'server-error') => {
  if (reason === 'offline') return 'sync.status.offline';
  if (reason === 'paused') return 'sync.status.paused';
  return 'sync.status.retrying';
};

/** The longer account for Settings: always available, and the only place that mentions refused changes. */
export type SyncDetail = {
  headlineKey: string;
  pending: number;
  refused: number;
  kept: number;
  lastSyncedAt: number | null;
  canRetryNow: boolean;
};

export const detailFor = (snapshot: SyncSnapshot): SyncDetail => {
  const { state } = snapshot;
  const headlineKey = (() => {
    switch (state.kind) {
      case 'signed-out':
        return 'sync.detail.signedOut';
      case 'syncing':
        return 'sync.detail.syncing';
      case 'idle':
        return snapshot.pending > 0 ? 'sync.detail.soon' : 'sync.detail.upToDate';
      default:
        return noticeFor(snapshot)?.messageKey ?? 'sync.detail.upToDate';
    }
  })();
  return {
    headlineKey,
    pending: snapshot.pending,
    refused: snapshot.refused,
    kept: snapshot.kept,
    lastSyncedAt: snapshot.lastSyncedAt,
    canRetryNow: state.kind === 'waiting' || state.kind === 'closed' || (state.kind === 'idle' && snapshot.pending > 0),
  };
};
