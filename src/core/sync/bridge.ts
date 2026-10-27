/**
 * Connects the app database to the sync engine without any screen having to say "I saved something".
 *
 * The database is the truth. The engine's waiting list is derived from it:
 *  - `scan()` reads every synced row, gives rows that have none a sync id, and compares each with a fingerprint of
 *    the row as the sync layer last saw it (the "mirror"). A row that differs becomes a waiting change; a row that
 *    is gone becomes a waiting delete. Because nothing depends on a save having announced itself, no code path
 *    (a screen, an import, a crash between two writes) can leave a change unsent.
 *  - `applyRemote()` writes the server's changes into the database, never overwriting a row that was edited after
 *    the last scan (it throws `ApplyDeferred` and the engine looks again once the scan has recorded the edit).
 *
 * Two safeguards:
 *  - Links between records (a task's calendar event) cross devices as sync ids. A link whose other end has not
 *    arrived yet is remembered ("links" map), sent along with later edits, and filled in when the record arrives.
 *  - If many rows vanish at once (browser storage was cleared or damaged, not a person deleting things), the
 *    deletes are NOT sent; the rows are fetched again from the account instead.
 *
 * Operations run one at a time, so a scan never sees half of an apply.
 */
import { fingerprint, fromRemote, isSyncedTable, isValidSyncId, linkOf, newSyncId, SYNCED_TABLES, toRemote, type LinkLookup, type Row } from './appData';
import type { LocalStore, Op } from './localStore';
import { ApplyDeferred, type EntityName, type NewChange, type RemoteRecord, type SyncApplier, type SyncStorage } from './types';

export type BridgeOptions = {
  store: LocalStore;
  storage: SyncStorage;
  /** Hands changes to the engine's waiting list (SyncEngine.recordChanges). */
  record: (changes: NewChange[]) => Promise<unknown>;
  /** Asks the engine to read the account's changes from the start (SyncEngine.restartPull). */
  restartPull: () => Promise<void>;
  /** Tells the screens rows changed behind their backs. */
  announce: () => void;
  now?: () => number;
  newId?: () => string;
};

export type ScanReport = { recorded: number; deleted: number; restoring: number };

/** At least this many rows vanishing in one look, and more than half of those known, is not a person deleting things. */
export const MASS_LOSS_MIN = 5;

const keyOf = (table: string, syncId: unknown) => `${table}:${String(syncId)}`;

type Rows = Record<EntityName, Row[]>;
type Located = { table: EntityName; row: Row };
type Loaded = { rows: Rows; links: LinkLookup; located: Map<string, Located> };

// ---- pure helpers -------------------------------------------------------------------------------

const numberOrNull = (value: unknown): number | null => {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

export const lookupFor = (rows: Rows): LinkLookup => {
  const toSync = new Map<string, string>();
  const toLocal = new Map<string, number>();
  for (const table of SYNCED_TABLES) {
    for (const row of rows[table]) {
      const id = numberOrNull(row.id);
      if (id === null || typeof row.syncId !== 'string') continue;
      toSync.set(`${table}#${id}`, row.syncId);
      toLocal.set(`${table}#${row.syncId}`, id);
    }
  }
  return {
    syncIdOf: (table, localId) => {
      const id = numberOrNull(localId);
      return id === null ? null : (toSync.get(`${table}#${id}`) ?? null);
    },
    localIdOf: (table, syncId) => toLocal.get(`${table}#${syncId}`) ?? null,
  };
};

const indexRows = (rows: Rows): Map<string, Located> => {
  const located = new Map<string, Located>();
  for (const table of SYNCED_TABLES) for (const row of rows[table]) located.set(keyOf(table, row.syncId), { table, row });
  return located;
};

/** Gives a sync id to each row that has none, or shares one with an earlier row. Returns the updates to store. */
export const assignIds = (rows: Rows, newId: () => string): Op[] => {
  const ops: Op[] = [];
  for (const table of SYNCED_TABLES) {
    const seen = new Set<string>();
    for (const row of rows[table]) {
      const id = numberOrNull(row.id);
      if (id === null) continue;
      if (!isValidSyncId(row.syncId) || seen.has(row.syncId)) {
        const syncId = newId();
        row.syncId = syncId;
        ops.push({ kind: 'update', table, id, values: { syncId } });
      }
      seen.add(row.syncId as string);
    }
  }
  return ops;
};

/** Whether this many vanished rows (of this many known) look like lost storage rather than deliberate deletes. */
export const looksLikeLostStorage = (vanished: number, known: number) => vanished >= MASS_LOSS_MIN && vanished * 2 > known;

const tableOfKey = (key: string) => key.slice(0, key.indexOf(':'));

type ScanPlan = {
  puts: { key: string; table: EntityName; syncId: string; data: Record<string, unknown>; fingerprint: string }[];
  /** Keys of rows that are gone and were really deleted. */
  deletes: string[];
  /** Keys of rows that are gone and probably were not deleted by the person. */
  lost: string[];
  /** Waiting links the person has since replaced by choosing another. */
  droppedLinks: string[];
};

const changedRows = (loaded: Loaded, mirror: Record<string, string>, pending: Record<string, string>) => {
  const puts: ScanPlan['puts'] = [];
  const droppedLinks: string[] = [];
  for (const [key, { table, row }] of loaded.located) {
    const waitingLink = pending[key];
    const data = toRemote(table, row, loaded.links, waitingLink);
    if (waitingLink && data[linkOf(table)?.column ?? ''] !== waitingLink) droppedLinks.push(key);
    const print = fingerprint(data);
    if (mirror[key] !== print) puts.push({ key, table, syncId: row.syncId as string, data, fingerprint: print });
  }
  return { puts, droppedLinks };
};

const vanishedRows = (loaded: Loaded, mirror: Record<string, string>) => {
  const known = Object.keys(mirror).filter((key) => isSyncedTable(tableOfKey(key)));
  const deletes: string[] = [];
  const lost: string[] = [];
  for (const table of SYNCED_TABLES) {
    const gone = known.filter((key) => tableOfKey(key) === table && !loaded.located.has(key));
    const all = known.filter((key) => tableOfKey(key) === table).length;
    (looksLikeLostStorage(gone.length, all) ? lost : deletes).push(...gone);
  }
  return { deletes, lost };
};

export const planScan = (loaded: Loaded, mirror: Record<string, string>, pending: Record<string, string>): ScanPlan => ({
  ...changedRows(loaded, mirror, pending),
  ...vanishedRows(loaded, mirror),
});

type ApplyPlan = {
  ops: Op[];
  /** The key of each insert, in the order of the inserts in `ops`. */
  inserted: string[];
  applied: string[];
  removed: string[];
  /** Links whose other end is not on this device: row key -> sync id of the other end. */
  unresolved: Record<string, string>;
  /** Rows whose waiting link is no longer wanted because the server says there is none. */
  cleared: string[];
};

const isoOrNow = (ms: unknown): string => new Date(typeof ms === 'number' && Number.isFinite(ms) ? ms : Date.now()).toISOString();

const planPut = (plan: ApplyPlan, record: RemoteRecord, loaded: Loaded) => {
  const table = record.entity as EntityName;
  const key = keyOf(table, record.id);
  const have = loaded.located.get(key);
  const { columns, unresolvedLink } = fromRemote(table, record.data ?? {}, loaded.links);
  const values = table === 'tasks' ? { ...columns, updatedAt: isoOrNow(record.updatedAt) } : columns;
  if (have) plan.ops.push({ kind: 'update', table, id: Number(have.row.id), values });
  else {
    plan.ops.push({ kind: 'insert', table, values: { ...values, syncId: record.id } });
    plan.inserted.push(key);
  }
  plan.applied.push(key);
  if (unresolvedLink) plan.unresolved[key] = unresolvedLink;
  else plan.cleared.push(key);
};

const planRemove = (plan: ApplyPlan, record: RemoteRecord, loaded: Loaded) => {
  const key = keyOf(record.entity, record.id);
  const have = loaded.located.get(key);
  if (have) plan.ops.push({ kind: 'remove', table: have.table, id: Number(have.row.id) });
  plan.removed.push(key);
};

export const planApply = (records: RemoteRecord[], loaded: Loaded): ApplyPlan => {
  const plan: ApplyPlan = { ops: [], inserted: [], applied: [], removed: [], unresolved: {}, cleared: [] };
  for (const record of records) {
    if (record.deleted) planRemove(plan, record, loaded);
    // A record without content cannot be stored; the account never sends one, so it is skipped rather than guessed at.
    else if (record.data && typeof record.data === 'object') planPut(plan, record, loaded);
  }
  return plan;
};

/** What to store in the "links" map so it ends up as `after`, given what it held before. */
const linkChanges = (before: Record<string, string>, after: Record<string, string>, removed: string[]) => {
  const patch: Record<string, string | null> = {};
  for (const key of [...Object.keys(before), ...removed]) patch[key] = after[key] ?? null;
  return { ...patch, ...after };
};

// ---- the bridge ----------------------------------------------------------------------------------

export class Bridge implements SyncApplier {
  private readonly o: BridgeOptions;
  private readonly now: () => number;
  private readonly newId: () => string;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(options: BridgeOptions) {
    this.o = options;
    this.now = options.now ?? Date.now;
    this.newId = options.newId ?? newSyncId;
  }

  /** Looks at the database and hands the engine what changed since the last look. */
  scan(): Promise<ScanReport> {
    return this.serial(() => this.doScan());
  }

  /** The engine's door for the account's changes. */
  applyRemote(records: RemoteRecord[]): Promise<void> {
    return this.serial(() => this.doApply(records));
  }

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const run = this.chain.then(work, work);
    this.chain = run.catch(() => undefined);
    return run;
  }

  private async load(): Promise<Loaded> {
    const rows = {} as Rows;
    for (const table of SYNCED_TABLES) rows[table] = await this.o.store.list(table);
    const assigned = assignIds(rows, this.newId);
    if (assigned.length > 0) await this.o.store.apply(assigned);
    return { rows, links: lookupFor(rows), located: indexRows(rows) };
  }

  private maps() {
    return Promise.all([this.o.storage.getBucket('mirror'), this.o.storage.getBucket('links')]);
  }

  // ---- looking ------------------------------------------------------------------------------------

  private async doScan(): Promise<ScanReport> {
    const loaded = await this.load();
    const [mirror, pending] = await this.maps();
    const plan = planScan(loaded, mirror, pending);
    const at = this.now();
    const changes: NewChange[] = [
      ...plan.puts.map((p) => ({ entity: p.table, id: p.syncId, op: 'put' as const, data: p.data, localUpdatedAt: at })),
      ...plan.deletes.map((key) => ({ entity: tableOfKey(key), id: key.slice(key.indexOf(':') + 1), op: 'delete' as const, data: null, localUpdatedAt: at })),
    ];
    if (changes.length > 0) await this.o.record(changes);
    // Only after the engine holds the changes: a crash in between just means they are recorded again.
    const mirrorPatch: Record<string, string | null> = Object.fromEntries(plan.puts.map((p) => [p.key, p.fingerprint]));
    for (const key of plan.deletes) mirrorPatch[key] = null;
    if (Object.keys(mirrorPatch).length > 0) await this.o.storage.patchBucket('mirror', mirrorPatch);
    if (plan.droppedLinks.length > 0) await this.o.storage.patchBucket('links', Object.fromEntries(plan.droppedLinks.map((key) => [key, null])));
    if (plan.lost.length > 0) await this.fetchAgain(plan.lost);
    return { recorded: plan.puts.length, deleted: plan.deletes.length, restoring: plan.lost.length };
  }

  /** Rows vanished without being deleted: forget them here, so the account's copies are applied as new rows. */
  private async fetchAgain(keys: string[]) {
    await this.o.storage.setVersions(Object.fromEntries(keys.map((key) => [key, 0])));
    await this.o.storage.patchBucket('mirror', Object.fromEntries(keys.map((key) => [key, null])));
    await this.o.storage.patchBucket('links', Object.fromEntries(keys.map((key) => [key, null])));
    await this.o.restartPull();
  }

  // ---- applying -----------------------------------------------------------------------------------

  private async doApply(records: RemoteRecord[]): Promise<void> {
    const wanted = records.filter((r) => isSyncedTable(r.entity) && isValidSyncId(r.id));
    if (wanted.length === 0) return;
    const loaded = await this.load();
    const [mirror, pending] = await this.maps();
    this.refuseIfEdited(wanted, loaded, mirror, pending);
    const plan = planApply(wanted, loaded);
    if (plan.ops.length === 0) return this.forgetRemoved(plan);
    await this.writeAndSettle(plan, pending);
    this.o.announce();
  }

  /** Records that were deleted on the account and were never here: nothing to remove, only the notes about them. */
  private async forgetRemoved(plan: ApplyPlan) {
    const forget = Object.fromEntries(plan.removed.map((key) => [key, null]));
    await this.o.storage.patchBucket('mirror', forget);
    await this.o.storage.patchBucket('links', forget);
  }

  /** A row edited since the last scan must be scanned first: the engine decides who wins once it is on the list. */
  private refuseIfEdited(records: RemoteRecord[], loaded: Loaded, mirror: Record<string, string>, pending: Record<string, string>) {
    for (const record of records) {
      const key = keyOf(record.entity, record.id);
      const have = loaded.located.get(key);
      if (!have) continue;
      const print = fingerprint(toRemote(have.table, have.row, loaded.links, pending[key]));
      if (mirror[key] !== print) throw new ApplyDeferred();
    }
  }

  private async writeAndSettle(plan: ApplyPlan, pending: Record<string, string>) {
    await this.o.store.apply(plan.ops);
    const after = await this.load();
    const waiting = await this.settleLinks({ ...pending, ...plan.unresolved }, plan.cleared, after);
    const settled = waiting.fixed ? await this.load() : after;
    const mirrorPatch: Record<string, string | null> = {};
    for (const key of plan.removed) mirrorPatch[key] = null;
    for (const key of plan.applied) {
      const have = settled.located.get(key);
      if (have) mirrorPatch[key] = fingerprint(toRemote(have.table, have.row, settled.links, waiting.pending[key]));
    }
    await this.o.storage.patchBucket('mirror', mirrorPatch);
    await this.o.storage.patchBucket('links', linkChanges(pending, waiting.pending, plan.removed));
  }

  /** Fills in links whose other end is now here. Resolving a link never changes what is sent for a row. */
  private async settleLinks(pending: Record<string, string>, cleared: string[], loaded: Loaded) {
    const left: Record<string, string> = {};
    const ops: Op[] = [];
    for (const [key, target] of Object.entries(pending)) {
      const have = loaded.located.get(key);
      const link = have && linkOf(have.table);
      if (!have || !link || cleared.includes(key) || numberOrNull(have.row[link.column]) !== null) continue;
      const local = loaded.links.localIdOf(link.target, target);
      if (local === null) left[key] = target;
      else ops.push({ kind: 'update', table: have.table, id: Number(have.row.id), values: { [link.column]: local } });
    }
    if (ops.length > 0) await this.o.store.apply(ops);
    return { pending: left, fixed: ops.length > 0 };
  }
}
