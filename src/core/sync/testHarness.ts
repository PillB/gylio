import { SyncEngine, type Auth, type EngineOptions } from './engine';
import { MemoryStorage } from './memoryStorage';
import { ApplyDeferred } from './types';
import type { HttpRequest, HttpResponse, RemoteRecord, SyncApplier, Transport } from './types';

// Test-only helpers: a clock the test moves by hand, and a small stand-in for the Worker that follows
// the same rules (versions, tombstones, 409 with the current copy). The real Worker is exercised in
// worker/test/syncClient.test.ts, so this stand-in only has to be faithful enough for timing tests.

export class FakeTime {
  nowMs = Date.UTC(2026, 9, 27, 12, 0, 0);
  private timers: { id: number; at: number; fn: () => void }[] = [];
  private nextId = 1;

  now = () => this.nowMs;
  set = (fn: () => void, ms: number) => {
    const id = this.nextId++;
    this.timers.push({ id, at: this.nowMs + ms, fn });
    return id;
  };
  clear = (handle: unknown) => {
    this.timers = this.timers.filter((t) => t.id !== handle);
  };
  get pending() {
    return this.timers.length;
  }

  /** Things that are still working in real time (a request into the Worker), so a step waits for them. */
  busy: (() => boolean)[] = [];

  private tick = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  /** Lets queued promise work finish, using the real event loop (nothing here replaces setTimeout). */
  settle = async () => {
    await this.tick(0);
    for (let i = 0; i < 4000 && this.busy.some((isBusy) => isBusy()); i += 1) await this.tick(2);
    await this.tick(0);
  };

  async advance(ms: number) {
    const end = this.nowMs + ms;
    await this.settle();
    for (;;) {
      const due = this.timers.filter((t) => t.at <= end).sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) break;
      this.timers = this.timers.filter((t) => t.id !== due.id);
      this.nowMs = Math.max(this.nowMs, due.at);
      due.fn();
      await this.settle();
    }
    this.nowMs = end;
    await this.settle();
  }
}

export type Mode =
  | { kind: 'ok' }
  | { kind: 'shed'; retryAfter?: string; until?: number }
  | { kind: 'closed' }
  | { kind: 'down' }
  | { kind: 'status'; status: number; body?: unknown; headers?: Record<string, string> }
  | { kind: 'warn' };

export type LoggedRequest = { at: number; method: string; path: string; body: unknown; token: string };

const response = (status: number, body: unknown, headers: Record<string, string> = {}): HttpResponse => ({
  status,
  headers: { get: (name) => headers[name] ?? headers[name.toLowerCase()] ?? null },
  json: async () => {
    if (body === undefined) throw new Error('no body');
    return body;
  },
});

const versionOf = (record: RemoteRecord | undefined) => record?.version ?? 0;
const isRetry = (record: RemoteRecord | undefined, data: Record<string, unknown>) =>
  !!record && !record.deleted && JSON.stringify(record.data) === JSON.stringify(data);

export class FakeServer {
  mode: Mode = { kind: 'ok' };
  log: LoggedRequest[] = [];
  records = new Map<string, RemoteRecord>();
  seq = 0;
  /** Holds responses until released, to test edits made while a request is in flight. */
  gate: Promise<void> | null = null;
  validToken = 'token-1';

  constructor(private readonly time: FakeTime) {}

  transport: Transport = async (req: HttpRequest) => {
    this.log.push({ at: this.time.now(), method: req.method, path: req.path, body: req.body, token: req.token });
    if (this.gate) await this.gate;
    const refused = this.refusal();
    if (refused) return refused;
    if (req.token !== this.validToken) return response(401, { error: { code: 'TOKEN_EXPIRED', message: 'expired' } });
    const headers: Record<string, string> = this.mode.kind === 'warn' ? { 'Gylio-Usage': 'warn' } : {};
    return this.handle(req, headers);
  };

  private refusal(): HttpResponse | null {
    const mode = this.mode;
    if (mode.kind === 'down') throw new TypeError('Failed to fetch');
    if (mode.kind === 'closed') return response(503, { error: { code: 'SIGNUP_CLOSED', message: 'closed' } });
    if (mode.kind === 'status') return response(mode.status, mode.body, mode.headers);
    if (mode.kind === 'shed' && (mode.until === undefined || this.time.now() < mode.until)) {
      const headers: Record<string, string> = { 'Gylio-Usage': 'shed' };
      const wait = mode.retryAfter ?? (mode.until === undefined ? '3600' : String(Math.ceil((mode.until - this.time.now()) / 1000)));
      headers['Retry-After'] = wait;
      return response(503, { error: { code: 'SYNC_PAUSED', message: 'paused' } }, headers);
    }
    return null;
  }

  private handle(req: HttpRequest, headers: Record<string, string>): HttpResponse {
    if (req.method === 'GET') return this.pull(req.path, headers);
    const [, , entity, id] = req.path.split('/');
    return req.method === 'DELETE' ? this.remove(entity, id, headers) : this.put(entity, id, req.body, headers);
  }

  private remove(entity: string, id: string, headers: Record<string, string>): HttpResponse {
    const current = this.records.get(`${entity}:${id}`);
    if (current && !current.deleted) this.store(`${entity}:${id}`, entity, id, current.version + 1, true, undefined);
    return response(204, undefined, headers);
  }

  private put(entity: string, id: string, body: unknown, headers: Record<string, string>): HttpResponse {
    const key = `${entity}:${id}`;
    const current = this.records.get(key);
    const { baseVersion = 0, ...data } = (body ?? {}) as Record<string, unknown>;
    // The same body again is a retry of a write that already landed: success, nothing written.
    if (isRetry(current, data)) return response(200, current, headers);
    if (versionOf(current) !== baseVersion) return response(409, { error: { code: 'CONFLICT', message: 'changed' }, current: current ?? null }, headers);
    const saved = this.store(key, entity, id, versionOf(current) + 1, false, data);
    return response(current ? 200 : 201, saved, headers);
  }

  private store(key: string, entity: string, id: string, version: number, deleted: boolean, data?: Record<string, unknown>) {
    this.seq += 1;
    const record: RemoteRecord = { entity, id, version, seq: this.seq, updatedAt: this.time.now(), deleted, ...(deleted ? {} : { data }) };
    this.records.set(key, record);
    return record;
  }

  private pull(path: string, headers: Record<string, string>): HttpResponse {
    const params = new URL(path, 'https://x.test').searchParams;
    const since = Number(params.get('since') ?? 0);
    const limit = Number(params.get('limit') ?? 200);
    const changed = [...this.records.values()].filter((r) => r.seq > since).sort((a, b) => a.seq - b.seq);
    const page = changed.slice(0, limit);
    return response(200, { records: page, cursor: page.length ? page[page.length - 1].seq : since, hasMore: changed.length > limit }, headers);
  }

  /** Another device changes a record on the server. */
  otherDeviceSets(entity: string, id: string, data: Record<string, unknown>) {
    const key = `${entity}:${id}`;
    return this.store(key, entity, id, (this.records.get(key)?.version ?? 0) + 1, false, data);
  }

  otherDeviceDeletes(entity: string, id: string) {
    const key = `${entity}:${id}`;
    return this.store(key, entity, id, (this.records.get(key)?.version ?? 0) + 1, true);
  }

  requests(filter?: (r: LoggedRequest) => boolean) {
    return filter ? this.log.filter(filter) : this.log;
  }
}

export class FakeApplier implements SyncApplier {
  applied: RemoteRecord[][] = [];
  fail = false;
  /** How many of the next calls say "an edit got in first, look again" before one is allowed to apply. */
  deferTimes = 0;
  async applyRemote(records: RemoteRecord[]) {
    if (this.fail) throw new Error('local database is busy');
    if (this.deferTimes > 0) {
      this.deferTimes -= 1;
      throw new ApplyDeferred();
    }
    this.applied.push(records);
  }
  get records() {
    return this.applied.flat();
  }
}

export type Rig = ReturnType<typeof makeRig>;

export const makeRig = (
  options: { random?: () => number; auth?: Auth | null; storage?: MemoryStorage; tuning?: EngineOptions['tuning']; time?: FakeTime; server?: FakeServer; beforePass?: () => Promise<void> } = {},
) => {
  const time = options.time ?? new FakeTime();
  const server = options.server ?? new FakeServer(time);
  const storage = options.storage ?? new MemoryStorage();
  const applier = new FakeApplier();
  const state = { auth: options.auth === undefined ? ({ token: 'token-1', userId: 'user_a' } as Auth | null) : options.auth, refreshes: 0, refreshFixes: true };
  const engine = new SyncEngine({
    storage,
    applier,
    transport: server.transport,
    getAuth: async ({ forceRefresh }) => {
      if (forceRefresh) {
        state.refreshes += 1;
        if (state.auth && state.refreshFixes) state.auth = { ...state.auth, token: server.validToken };
      }
      return state.auth;
    },
    clock: { now: time.now, random: options.random ?? (() => 0.5) },
    timers: { set: time.set, clear: time.clear },
    tuning: options.tuning,
    beforePass: options.beforePass,
  });
  return { time, server, storage, applier, engine, state };
};

export const task = (id: string, title: string, at: number) => ({ entity: 'tasks', id, op: 'put' as const, data: { title }, localUpdatedAt: at });

export const last = <T>(items: T[]): T => items[items.length - 1];
