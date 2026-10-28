import type { OutboxEntry, RemoteRecord } from './types';

/**
 * What to do when this device and the server both changed the same record.
 * Nothing a person did is thrown away silently: a change that loses is kept (see `keepLoser`) and the
 * winner is simply whichever edit was made later. Device clocks can disagree by seconds, so the rule is
 * deliberately forgiving: a tie goes to the change made on this device.
 */
export type Decision =
  /** Send our change on top of the server's version. */
  | { action: 'keep-local' }
  /** The server's copy replaces ours. `keepLoser` is true when our change had content worth keeping. */
  | { action: 'take-remote'; keepLoser: boolean }
  /** Both sides deleted it. */
  | { action: 'both-gone' }
  /** The server has nothing under this id (purged); send ours as a new record. */
  | { action: 'recreate' };

export const decide = (local: OutboxEntry, remote: RemoteRecord | null): Decision => {
  if (!remote) return local.op === 'delete' ? { action: 'both-gone' } : { action: 'recreate' };
  if (remote.deleted) {
    // A delete elsewhere never silently erases an edit made here: the edit wins and the record comes back.
    return local.op === 'delete' ? { action: 'both-gone' } : { action: 'keep-local' };
  }
  if (local.localUpdatedAt >= remote.updatedAt) return { action: 'keep-local' };
  return { action: 'take-remote', keepLoser: local.op === 'put' };
};
