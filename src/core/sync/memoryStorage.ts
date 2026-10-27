import type { KeptVersion, NewChange, OutboxEntry, SyncMeta, SyncStorage } from './types';

export const changeKey = (entity: string, id: string) => `${entity}:${id}`;

/** Pure rule shared by every storage: a new change replaces the waiting one for the same record. */
export const coalesce = (existing: OutboxEntry | undefined, change: NewChange): OutboxEntry => ({
  key: changeKey(change.entity, change.id),
  entity: change.entity,
  id: change.id,
  op: change.op,
  data: change.op === 'delete' ? null : change.data,
  localUpdatedAt: change.localUpdatedAt,
  rev: (existing?.rev ?? 0) + 1,
  ...(existing?.sendAttempted ? { sendAttempted: true } : {}),
});

/** In-memory storage: used in tests, and as the fallback when IndexedDB is unavailable (private windows). */
export class MemoryStorage implements SyncStorage {
  private outbox = new Map<string, OutboxEntry>();
  private versions = new Map<string, number>();
  private meta: SyncMeta = { cursor: 0, owner: null };
  private kept: KeptVersion[] = [];

  async listOutbox() {
    return [...this.outbox.values()].sort((a, b) => a.localUpdatedAt - b.localUpdatedAt || a.key.localeCompare(b.key));
  }

  async putChange(change: NewChange) {
    const entry = coalesce(this.outbox.get(changeKey(change.entity, change.id)), change);
    this.outbox.set(entry.key, entry);
    return entry;
  }

  async settle(key: string, rev: number) {
    if (this.outbox.get(key)?.rev !== rev) return false;
    this.outbox.delete(key);
    return true;
  }

  async markAttempted(key: string, rev: number) {
    const entry = this.outbox.get(key);
    if (entry && entry.rev === rev) this.outbox.set(key, { ...entry, sendAttempted: true });
  }

  async reject(key: string, rev: number, info: { code: string; message: string; at: number }) {
    const entry = this.outbox.get(key);
    if (entry && entry.rev === rev) this.outbox.set(key, { ...entry, rejected: info });
  }

  async clearRejections() {
    for (const [key, entry] of this.outbox) {
      if (entry.rejected) this.outbox.set(key, { ...entry, rejected: undefined });
    }
  }

  async getVersion(key: string) {
    return this.versions.get(key) ?? 0;
  }

  async setVersions(versions: Record<string, number>) {
    for (const [key, version] of Object.entries(versions)) this.versions.set(key, version);
  }

  async getMeta() {
    return { ...this.meta };
  }

  async setMeta(meta: Partial<SyncMeta>) {
    this.meta = { ...this.meta, ...meta };
  }

  async keepVersion(kept: KeptVersion) {
    this.kept.push(kept);
  }

  async listKept() {
    return [...this.kept];
  }

  async removeKept(key: string, keptAt: number) {
    this.kept = this.kept.filter((k) => !(k.key === key && k.keptAt === keptAt));
  }

  async clear() {
    this.outbox.clear();
    this.versions.clear();
    this.meta = { cursor: 0, owner: null };
    this.kept = [];
  }
}
