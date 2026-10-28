/** The records the Worker stores, keyed by a name and an id chosen on the device. */
export type EntityName = 'tasks' | 'events' | 'budgets' | 'transactions' | 'debts';

export type RecordData = Record<string, unknown>;

/** One change waiting to be sent. There is at most one per record: later edits replace earlier ones. */
export type OutboxEntry = {
  /** `entity:id`, the coalescing key. */
  key: string;
  entity: string;
  id: string;
  op: 'put' | 'delete';
  data: RecordData | null;
  /** Grows with every local change to the record, so a send can tell whether it is still the latest. */
  rev: number;
  /** When the person made the change (device clock). */
  localUpdatedAt: number;
  /** True once a send of this record has started, so a delete of a record the server never saw can be skipped safely. */
  sendAttempted?: boolean;
  /** Set when the server refuses this exact change for good (for example it is invalid). Kept, never sent again until edited. */
  rejected?: { code: string; message: string; at: number };
};

/** What the Worker answers for a stored record (see worker/src/index.ts, `toRecord`). */
export type RemoteRecord = {
  entity: string;
  id: string;
  updatedAt: number;
  version: number;
  seq: number;
  deleted: boolean;
  data?: RecordData;
};

/** A change that lost a conflict. Kept so nothing a person did is silently thrown away. */
export type KeptVersion = {
  key: string;
  entity: string;
  id: string;
  op: 'put' | 'delete';
  data: RecordData | null;
  localUpdatedAt: number;
  keptAt: number;
  reason: 'older-than-remote' | 'remote-deleted';
};

export type SyncMeta = {
  /** Last change number applied from the server. */
  cursor: number;
  /** The signed-in person these records were synced for. A different person must not inherit them. */
  owner: string | null;
};

export type NewChange = Pick<OutboxEntry, 'entity' | 'id' | 'op' | 'data' | 'localUpdatedAt'>;

/**
 * Small named maps kept beside the outbox for the app-data bridge (src/core/sync/bridge.ts):
 *  - `mirror`: record key -> fingerprint of the local row as the sync layer last saw it, so a row that changed
 *    since can be recognised without anything having to announce the change;
 *  - `links`: row key -> the other end of a task/event link that has not arrived on this device yet.
 */
export type BucketName = 'mirror' | 'links';

/** Where the engine keeps its own state. IndexedDB in the browser, memory in tests. */
export interface SyncStorage {
  listOutbox(): Promise<OutboxEntry[]>;
  /** Adds the change, replacing any waiting change for the same record (and clearing a refusal). */
  putChange(change: NewChange): Promise<OutboxEntry>;
  /** Removes the entry only if no newer local change replaced it while it was being sent. */
  settle(key: string, rev: number): Promise<boolean>;
  /** Notes that a send is about to start (a response can be lost, so the server may know the record). */
  markAttempted(key: string, rev: number): Promise<void>;
  reject(key: string, rev: number, info: { code: string; message: string; at: number }): Promise<void>;
  /** Makes refused entries sendable again (the person pressed "try again"). */
  clearRejections(): Promise<void>;
  getVersion(key: string): Promise<number>;
  setVersions(versions: Record<string, number>): Promise<void>;
  getMeta(): Promise<SyncMeta>;
  setMeta(meta: Partial<SyncMeta>): Promise<void>;
  keepVersion(kept: KeptVersion): Promise<void>;
  listKept(): Promise<KeptVersion[]>;
  removeKept(key: string, keptAt: number): Promise<void>;
  getBucket(name: BucketName): Promise<Record<string, string>>;
  /** Sets the given keys; a null value removes the key. One transaction. */
  patchBucket(name: BucketName, patch: Record<string, string | null>): Promise<void>;
  /**
   * Forgets what is known about the account (server versions, the change cursor, the bridge's maps) but keeps the
   * waiting changes, the kept versions and the owner: this device's data is about to be sent to a different account.
   */
  forgetAccountState(): Promise<void>;
  /** Forgets everything (signing out and starting clean). */
  clear(): Promise<void>;
}

/** Applies server changes to the app's own database. The engine never touches the app database itself. */
export interface SyncApplier {
  /** Throws `ApplyDeferred` when nothing was applied because the person changed a record in the meantime. */
  applyRemote(records: RemoteRecord[]): Promise<void>;
}

/**
 * The applier's way of saying "not now, and nothing is wrong": a record about to be overwritten was edited on
 * this device after the last look at it. The engine looks again (which records that edit) a moment later, with
 * no waiting period and no message to the person.
 */
export class ApplyDeferred extends Error {
  constructor(message = 'A record was edited while server changes were arriving') {
    super(message);
    this.name = 'ApplyDeferred';
  }
}

export type HttpResponse = {
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
};

export type HttpRequest = {
  method: 'GET' | 'PUT' | 'DELETE';
  path: string;
  token: string;
  body?: unknown;
};

/** `fetch` with the base address and sign-in header filled in. Rejects when the network fails. */
export type Transport = (request: HttpRequest) => Promise<HttpResponse>;
