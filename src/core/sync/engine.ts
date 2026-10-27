import { decide } from './conflict';
import {
  backoffUntil,
  classify,
  classifyNetworkFailure,
  SYNC_LIMITS,
  type Clock,
  type PauseReason,
  type Verdict,
} from './policy';
import type { HttpRequest, HttpResponse, NewChange, OutboxEntry, RemoteRecord, SyncApplier, SyncStorage, Transport } from './types';

/** What the person is told, in the order of how much attention each needs. Nothing here blocks the app. */
export type SyncState =
  | { kind: 'idle' }
  | { kind: 'syncing' }
  /** Saved on this device; trying again by itself. `retryAt` is null while the browser reports no network. */
  | { kind: 'waiting'; reason: PauseReason; retryAt: number | null }
  /** Sign-up is not open yet, so nothing leaves this device. */
  | { kind: 'closed' }
  | { kind: 'signed-out' }
  /** This device holds another person's synced data. Nothing is sent until the person chooses. */
  | { kind: 'other-account' };

export type SyncSnapshot = {
  state: SyncState;
  /** Changes saved on this device that the server does not have yet. */
  pending: number;
  /** Changes the server refused for good; they stay on this device. */
  refused: number;
  /** Earlier versions kept after a conflict. */
  kept: number;
  lastSyncedAt: number | null;
  /** The server asked everyone to go easy; the engine sends less often. */
  economy: boolean;
};

export type SyncReason = 'start' | 'change' | 'poll' | 'retry' | 'more' | 'online' | 'visible' | 'flush' | 'manual' | 'auth' | 'background';

export type Auth = { token: string; userId: string };

export type EngineOptions = {
  storage: SyncStorage;
  applier: SyncApplier;
  transport: Transport;
  /** The signed-in person's token and id, or null when signed out. `forceRefresh` asks for a new token. */
  getAuth: (options: { forceRefresh: boolean }) => Promise<Auth | null>;
  clock?: { now: () => number; random: () => number };
  timers?: { set: (fn: () => void, ms: number) => unknown; clear: (handle: unknown) => void };
  /** Runs `work` only if no other tab is syncing (Web Locks). Return `SKIPPED` when another tab holds it. */
  exclusive?: <T>(work: () => Promise<T>) => Promise<T | typeof SKIPPED>;
  tuning?: Partial<Tuning>;
};

export const SKIPPED = Symbol('another tab is syncing');

export type Tuning = {
  debounceMs: number;
  maxWaitMs: number;
  pollMs: number;
  batch: number;
  moreDelayMs: number;
  /** Extra caution while the server says it is busy. */
  economyFactor: number;
  manualGapMs: number;
  pullPageSize: number;
  pullMaxPages: number;
};

const DEFAULT_TUNING: Tuning = {
  debounceMs: 3_000,
  maxWaitMs: 30_000,
  pollMs: 5 * 60_000,
  batch: 50,
  moreDelayMs: 1_000,
  economyFactor: 6,
  manualGapMs: 10_000,
  pullPageSize: 200,
  pullMaxPages: 10,
};

const ENTITY_PATH = /^[a-z]+$/;
const ID_PATH = /^[A-Za-z0-9_-]{1,64}$/;

type Step = 'continue' | 'halt';

const readBody = async (response: HttpResponse): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const isRemoteRecord = (value: unknown): value is RemoteRecord => {
  const r = value as Partial<RemoteRecord> | null;
  return (
    !!r &&
    typeof r.entity === 'string' &&
    ENTITY_PATH.test(r.entity) &&
    typeof r.id === 'string' &&
    ID_PATH.test(r.id) &&
    Number.isInteger(r.version) &&
    typeof r.deleted === 'boolean'
  );
};

export class SyncEngine {
  private readonly o: EngineOptions;
  private readonly tuning: Tuning;
  private readonly now: () => number;
  private readonly random: () => number;

  private listeners = new Set<(snapshot: SyncSnapshot) => void>();
  private state: SyncState = { kind: 'idle' };
  private counts = { pending: 0, refused: 0, kept: 0 };
  private lastSyncedAt: number | null = null;
  private economy = false;

  private running = false;
  private rerun = false;
  private stopped = false;
  private visible = true;
  private online = true;
  private dueWhenVisible = false;

  private failures = 0;
  private pausedUntil = 0;
  private pauseReason: PauseReason | null = null;
  private lastAttemptAt = 0;
  private firstChangeAt: number | null = null;
  private timer: { handle: unknown; dueAt: number; reason: SyncReason } | null = null;
  /** The sign-in used by the pass that is running; replaced when the token had to be refreshed. */
  private auth: Auth | null = null;

  constructor(options: EngineOptions) {
    this.o = options;
    this.tuning = { ...DEFAULT_TUNING, ...options.tuning };
    this.now = options.clock?.now ?? Date.now;
    this.random = options.clock?.random ?? Math.random;
  }

  // ---- what the app calls ------------------------------------------------------------------------

  /** Loads the counts and tries a first sync. Safe to call once at app start. */
  async start() {
    await this.refreshCounts();
    this.schedule(0, 'start');
  }

  stop() {
    this.stopped = true;
    this.clearTimer();
    this.listeners.clear();
  }

  /** True while a pass is talking to the server or the local database (tests wait for it). */
  isRunning() {
    return this.running;
  }

  snapshot(): SyncSnapshot {
    return { state: this.state, ...this.counts, lastSyncedAt: this.lastSyncedAt, economy: this.economy };
  }

  subscribe(listener: (snapshot: SyncSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Called after every local save. The change is stored before this returns; sending comes later. */
  async recordChange(change: NewChange) {
    await this.o.storage.putChange(change);
    await this.refreshCounts();
    this.firstChangeAt ??= this.now();
    // Wait for a quiet moment so a burst of edits goes out as one change, but never longer than the cap.
    const quiet = this.now() + this.economyScale(this.tuning.debounceMs);
    const cap = this.firstChangeAt + this.economyScale(this.tuning.maxWaitMs);
    this.schedule(Math.max(0, Math.min(quiet, cap) - this.now()), 'change');
  }

  /** Refused changes become sendable again. A pause that is still running is respected. */
  async retryRefused() {
    await this.o.storage.clearRejections();
    await this.refreshCounts();
    this.schedule(0, 'more');
  }

  kick(reason: SyncReason) {
    this.schedule(reason === 'online' ? Math.round(this.random() * 3_000) : 0, reason);
  }

  setOnline(online: boolean) {
    this.online = online;
    if (online) {
      if (this.state.kind === 'waiting' && this.state.reason === 'offline') this.clearPause();
      this.kick('online');
    } else if (this.state.kind !== 'syncing') {
      this.setState({ kind: 'waiting', reason: 'offline', retryAt: null });
    }
  }

  /** A hidden tab does not poll; it sends what is waiting once (the person may be closing it) and catches up when shown. */
  setVisible(visible: boolean) {
    this.visible = visible;
    if (visible) {
      if (this.dueWhenVisible || this.now() - (this.lastSyncedAt ?? 0) > 60_000) this.kick('visible');
      this.dueWhenVisible = false;
      return;
    }
    if (this.timer?.reason === 'poll') this.clearTimer();
    this.dueWhenVisible = true;
    if (this.counts.pending > 0) this.kick('flush');
  }

  /** The signed-in person changed (signed in, signed out, token returned). */
  authChanged() {
    this.clearPause();
    this.kick('auth');
  }

  /** The person chose to link this device's data to the account that is signed in now. */
  async claimForCurrentAccount() {
    const auth = await this.o.getAuth({ forceRefresh: false });
    if (!auth) return;
    await this.o.storage.setMeta({ owner: auth.userId });
    this.authChanged();
  }

  // ---- scheduling --------------------------------------------------------------------------------

  private economyScale(ms: number) {
    return this.economy ? ms * this.tuning.economyFactor : ms;
  }

  private clearTimer() {
    if (!this.timer) return;
    if (this.o.timers) this.o.timers.clear(this.timer.handle);
    else clearTimeout(this.timer.handle as ReturnType<typeof setTimeout>);
    this.timer = null;
  }

  /**
   * One timer at most: a sooner request replaces a later one and a later one is ignored, except that a new
   * edit restarts the wait of an earlier edit (that is what makes it a debounce).
   */
  private schedule(delayMs: number, reason: SyncReason) {
    if (this.stopped) return;
    const dueAt = this.now() + delayMs;
    const restartsEdit = reason === 'change' && this.timer?.reason === 'change';
    if (this.timer && this.timer.dueAt <= dueAt && !restartsEdit) return;
    this.clearTimer();
    const fire = () => {
      this.timer = null;
      this.run(reason).catch((error) => console.warn('Sync could not start a pass', error instanceof Error ? error.message : error));
    };
    const handle = this.o.timers ? this.o.timers.set(fire, delayMs) : setTimeout(fire, delayMs);
    this.timer = { handle, dueAt, reason };
  }

  private clearPause() {
    this.pausedUntil = 0;
    this.pauseReason = null;
  }

  private wake(reason: SyncReason): boolean {
    const t = this.now();
    if (reason === 'manual') return t - this.lastAttemptAt >= this.tuning.manualGapMs;
    if (reason === 'auth') return true;
    if (t < this.pausedUntil) return false;
    return this.online;
  }

  // ---- one pass ----------------------------------------------------------------------------------

  private async run(reason: SyncReason) {
    if (this.stopped) return;
    if (this.running) {
      this.rerun = true;
      return;
    }
    if (!this.wake(reason)) {
      this.scheduleAfterPause();
      return;
    }
    this.running = true;
    this.lastAttemptAt = this.now();
    this.firstChangeAt = null;
    if (this.state.kind !== 'waiting') this.setState({ kind: 'syncing' });
    try {
      const outcome = await (this.o.exclusive ? this.o.exclusive(() => this.cycle()) : this.cycle());
      if (outcome === SKIPPED) {
        this.setState({ kind: 'idle' });
        this.schedule(60_000, 'poll');
      }
    } catch (error) {
      console.warn('Sync stopped unexpectedly; the changes are safe on this device', error instanceof Error ? error.message : error);
      this.pause(this.unexplainedPause());
    } finally {
      this.running = false;
      await this.refreshCounts();
    }
    if (this.rerun) {
      this.rerun = false;
      this.schedule(this.tuning.moreDelayMs, 'more');
    }
  }

  private clock(): Clock {
    return { nowMs: this.now(), random: this.random };
  }

  private scheduleAfterPause() {
    if (this.pausedUntil > this.now()) this.schedule(this.pausedUntil - this.now(), 'retry');
  }

  private unexplainedPause(): Extract<Verdict, { kind: 'pause' }> {
    return { kind: 'pause', reason: 'server-error', retryAt: backoffUntil(this.failures + 1, this.clock()), failure: true };
  }

  private async cycle(): Promise<void> {
    this.auth = await this.o.getAuth({ forceRefresh: false });
    if (!this.auth) return this.setState({ kind: 'signed-out' });
    if (!(await this.ownerMatches(this.auth))) return this.setState({ kind: 'other-account' });
    if ((await this.push()) === 'halt') return;
    if ((await this.pull()) === 'halt') return;
    this.succeeded();
  }

  private async ownerMatches(auth: Auth) {
    const { owner } = await this.o.storage.getMeta();
    if (owner === null) await this.o.storage.setMeta({ owner: auth.userId });
    return owner === null || owner === auth.userId;
  }

  private succeeded() {
    this.failures = 0;
    this.clearPause();
    this.lastSyncedAt = this.now();
    this.setState({ kind: 'idle' });
    if (this.visible) this.schedule(this.economyScale(this.tuning.pollMs), 'poll');
  }

  // ---- talking to the server ---------------------------------------------------------------------

  private async call(request: Omit<HttpRequest, 'token'>): Promise<{ verdict: Verdict; body: unknown }> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response: HttpResponse;
      try {
        response = await this.o.transport({ ...request, token: (this.auth as Auth).token });
      } catch {
        return { verdict: classifyNetworkFailure(this.clock(), this.failures), body: null };
      }
      const body = await readBody(response);
      this.noteUsage(response);
      const verdict = classify(
        { status: response.status, retryAfter: response.headers.get('Retry-After'), usage: response.headers.get('Gylio-Usage'), body },
        this.clock(),
        this.failures,
      );
      if (verdict.kind === 'unauthorized' && attempt === 0) {
        const fresh = await this.o.getAuth({ forceRefresh: true });
        if (fresh) {
          this.auth = fresh;
          continue;
        }
      }
      return { verdict, body };
    }
    return { verdict: { kind: 'unauthorized', expired: false }, body: null };
  }

  private noteUsage(response: HttpResponse) {
    this.economy = response.headers.get('Gylio-Usage') === 'warn';
  }

  /** Applies a verdict that stops the pass. Always returns 'halt'. */
  private halt(verdict: Verdict): Step {
    switch (verdict.kind) {
      case 'pause':
        this.pause(verdict);
        break;
      case 'closed':
        this.closeUntil(this.now() + SYNC_LIMITS.closedRecheckMs);
        break;
      case 'unauthorized':
        this.setState({ kind: 'signed-out' });
        break;
      default:
        // An answer that should not occur here (for example a refusal of a read): wait, keep everything.
        this.pause(this.unexplainedPause());
    }
    return 'halt';
  }

  private pause(verdict: Extract<Verdict, { kind: 'pause' }>) {
    if (verdict.failure) this.failures += 1;
    this.pausedUntil = verdict.retryAt;
    this.pauseReason = verdict.reason;
    this.setState({ kind: 'waiting', reason: verdict.reason, retryAt: verdict.retryAt });
    this.schedule(Math.max(0, verdict.retryAt - this.now()), 'retry');
  }

  private closeUntil(at: number) {
    this.pausedUntil = at;
    this.pauseReason = null;
    this.setState({ kind: 'closed' });
    this.schedule(at - this.now(), 'retry');
  }

  // ---- sending our changes -----------------------------------------------------------------------

  private async push(): Promise<Step> {
    const waiting = (await this.o.storage.listOutbox()).filter((e) => !e.rejected);
    const limit = this.economy ? Math.max(1, Math.floor(this.tuning.batch / this.tuning.economyFactor)) : this.tuning.batch;
    for (const entry of waiting.slice(0, limit)) {
      if ((await this.pushOne(entry)) === 'halt') return 'halt';
    }
    if (waiting.length > limit) this.schedule(this.economyScale(this.tuning.moreDelayMs), 'more');
    return 'continue';
  }

  private request(entry: OutboxEntry, baseVersion: number): Omit<HttpRequest, 'token'> {
    const path = `/api/${entry.entity}/${entry.id}`;
    return entry.op === 'delete' ? { method: 'DELETE', path } : { method: 'PUT', path, body: { ...entry.data, baseVersion } };
  }

  /** Up to three tries per record per pass: a conflict is settled and the same change is sent again on top. */
  private async pushOne(entry: OutboxEntry): Promise<Step> {
    if (!ENTITY_PATH.test(entry.entity) || !ID_PATH.test(entry.id)) {
      await this.refuse(entry, { kind: 'reject', code: 'BAD_ID', message: 'This record has an id the server cannot accept' });
      return 'continue';
    }
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const base = await this.o.storage.getVersion(entry.key);
      if (entry.op === 'delete' && base === 0 && !entry.sendAttempted) {
        await this.o.storage.settle(entry.key, entry.rev);
        return 'continue';
      }
      await this.o.storage.markAttempted(entry.key, entry.rev);
      const { verdict, body } = await this.call(this.request(entry, base));
      const next = await this.afterPush(entry, verdict, body);
      if (next !== 'again') return next;
    }
    return 'continue';
  }

  private async afterPush(entry: OutboxEntry, verdict: Verdict, body: unknown): Promise<Step | 'again'> {
    switch (verdict.kind) {
      case 'ok':
        await this.pushed(entry, body);
        return 'continue';
      case 'conflict':
        return this.settleConflict(entry, verdict.current);
      case 'reject':
        await this.refuse(entry, verdict);
        return 'continue';
      default:
        return this.halt(verdict);
    }
  }

  private async pushed(entry: OutboxEntry, body: unknown) {
    if (isRemoteRecord(body)) await this.o.storage.setVersions({ [entry.key]: body.version });
    await this.o.storage.settle(entry.key, entry.rev);
  }

  private async refuse(entry: OutboxEntry, verdict: Extract<Verdict, { kind: 'reject' }>) {
    await this.o.storage.reject(entry.key, entry.rev, { code: verdict.code, message: verdict.message, at: this.now() });
  }

  /** Both sides changed the record. See conflict.ts for the rule; the loser is kept, never discarded. */
  private async settleConflict(entry: OutboxEntry, remote: RemoteRecord | null): Promise<'continue' | 'again'> {
    const decision = decide(entry, remote);
    switch (decision.action) {
      case 'both-gone':
        if (remote) await this.o.storage.setVersions({ [entry.key]: remote.version });
        await this.o.storage.settle(entry.key, entry.rev);
        return 'continue';
      case 'recreate':
        await this.o.storage.setVersions({ [entry.key]: 0 });
        return 'again';
      case 'keep-local':
        await this.o.storage.setVersions({ [entry.key]: remote?.version ?? 0 });
        return 'again';
      default:
        await this.takeRemote(entry, remote as RemoteRecord, decision.keepLoser);
        return 'continue';
    }
  }

  private async takeRemote(entry: OutboxEntry, remote: RemoteRecord, keepLoser: boolean) {
    if (keepLoser) {
      await this.o.storage.keepVersion({
        key: entry.key,
        entity: entry.entity,
        id: entry.id,
        op: entry.op,
        data: entry.data,
        localUpdatedAt: entry.localUpdatedAt,
        keptAt: this.now(),
        reason: remote.deleted ? 'remote-deleted' : 'older-than-remote',
      });
    }
    await this.o.applier.applyRemote([remote]);
    await this.o.storage.setVersions({ [entry.key]: remote.version });
    await this.o.storage.settle(entry.key, entry.rev);
  }

  // ---- receiving theirs --------------------------------------------------------------------------

  private async pull(): Promise<Step> {
    for (let page = 0; page < this.tuning.pullMaxPages; page += 1) {
      const { cursor } = await this.o.storage.getMeta();
      const { verdict, body } = await this.call({ method: 'GET', path: `/api/sync/pull?since=${cursor}&limit=${this.tuning.pullPageSize}` });
      if (verdict.kind !== 'ok') return this.halt(verdict);
      const parsed = body as { records?: unknown; cursor?: unknown; hasMore?: unknown } | null;
      if (!Array.isArray(parsed?.records) || typeof parsed?.cursor !== 'number') {
        return this.halt(this.unexplainedPause());
      }
      await this.applyPage(parsed.records.filter(isRemoteRecord));
      await this.o.storage.setMeta({ cursor: parsed.cursor });
      if (parsed.hasMore !== true) return 'continue';
    }
    this.schedule(this.economyScale(this.tuning.moreDelayMs), 'more');
    return 'continue';
  }

  private async applyPage(records: RemoteRecord[]) {
    const waiting = new Map((await this.o.storage.listOutbox()).map((e) => [e.key, e]));
    const toApply: RemoteRecord[] = [];
    const versions: Record<string, number> = {};
    for (const record of records) {
      const key = `${record.entity}:${record.id}`;
      if (record.version <= (await this.o.storage.getVersion(key))) continue;
      versions[key] = record.version;
      const mine = waiting.get(key);
      if (!mine) toApply.push(record);
      else if (await this.reconcile(mine, record)) toApply.push(record);
    }
    await this.o.applier.applyRemote(toApply);
    await this.o.storage.setVersions(versions);
  }

  /** A server change arrived for a record with an unsent local change. True when the server copy should be applied. */
  private async reconcile(mine: OutboxEntry, record: RemoteRecord): Promise<boolean> {
    const decision = decide(mine, record);
    if (decision.action === 'both-gone') {
      await this.o.storage.settle(mine.key, mine.rev);
      return false;
    }
    if (decision.action !== 'take-remote') return false;
    if (decision.keepLoser) {
      await this.o.storage.keepVersion({
        key: mine.key,
        entity: mine.entity,
        id: mine.id,
        op: mine.op,
        data: mine.data,
        localUpdatedAt: mine.localUpdatedAt,
        keptAt: this.now(),
        reason: 'older-than-remote',
      });
    }
    await this.o.storage.settle(mine.key, mine.rev);
    return true;
  }

  // ---- state -------------------------------------------------------------------------------------

  private async refreshCounts() {
    const [outbox, kept] = await Promise.all([this.o.storage.listOutbox(), this.o.storage.listKept()]);
    const refused = outbox.filter((e) => e.rejected).length;
    this.counts = { pending: outbox.length - refused, refused, kept: kept.length };
    this.emit();
  }

  private setState(state: SyncState) {
    this.state = state;
    this.emit();
  }

  private emit() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
