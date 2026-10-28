import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncAction } from './offlineSync';

const queue: SyncAction[] = [];
const removeSyncAction = vi.fn(async (_id: string) => undefined);
const updateSyncAction = vi.fn(async (_id: string, _updates: Partial<SyncAction>) => undefined);

vi.mock('./offlineSync', () => ({
  addSyncConflict: vi.fn(async () => undefined),
  listPendingSyncActions: async () => queue,
  removeSyncAction: (id: string) => removeSyncAction(id),
  updateSyncAction: (id: string, updates: Partial<SyncAction>) => updateSyncAction(id, updates),
}));
vi.mock('./authToken', () => ({
  getAuthToken: async () => 'token',
  authHeaders: async (extra?: HeadersInit) => ({ ...(extra ?? {}), Authorization: 'Bearer token' }),
}));

const { isPermanentSyncFailure, processSyncQueue, retryAfterMs } = await import('./backgroundSync');

const action = (id: string): SyncAction => ({
  id,
  entityType: 'task',
  action: 'update',
  payload: { id: 7, title: 'Water plants' },
  clientUpdatedAt: '2026-10-28T10:00:00.000Z',
  attempts: 0,
  nextAttemptAt: 0,
  status: 'pending',
});

const answer = (status: number, headers: Record<string, string> = {}) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status, headers }));

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
  queue.splice(0, queue.length, action('a'));
  removeSyncAction.mockClear();
  updateSyncAction.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('retryAfterMs', () => {
  it('reads seconds and HTTP dates, and ignores what it cannot read', () => {
    expect(retryAfterMs('120')).toBe(120_000);
    expect(retryAfterMs('Wed, 28 Oct 2026 10:01:00 GMT', Date.parse('2026-10-28T10:00:00Z'))).toBe(60_000);
    expect(retryAfterMs(null)).toBe(0);
    expect(retryAfterMs('soon')).toBe(0);
    expect(retryAfterMs('-5')).toBe(0);
  });
});

describe('isPermanentSyncFailure', () => {
  it('gives up on answers that cannot change, and keeps trying on ones that can', () => {
    for (const status of [400, 404, 405, 410, 413, 422]) expect(isPermanentSyncFailure(status)).toBe(true);
    for (const status of [401, 403, 408, 429, 500, 502, 503]) expect(isPermanentSyncFailure(status)).toBe(false);
  });
});

describe('processSyncQueue', () => {
  it('drops a change the server can never accept (404: the route does not exist) instead of retrying it forever', async () => {
    answer(404);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await processSyncQueue();
    expect(removeSyncAction).toHaveBeenCalledWith('a');
    expect(updateSyncAction).not.toHaveBeenCalled();
  });

  it('waits at least as long as a 503 Retry-After asks before trying again', async () => {
    answer(503, { 'Retry-After': '600' });
    const before = Date.now();
    await processSyncQueue();
    const [, updates] = updateSyncAction.mock.calls[0];
    expect(updates.status).toBe('retry');
    expect(updates.nextAttemptAt).toBeGreaterThanOrEqual(before + 600_000);
    expect(removeSyncAction).not.toHaveBeenCalled();
  });

  it('keeps a change that hit a network error, to try again later', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await processSyncQueue();
    expect(updateSyncAction.mock.calls[0][1]).toMatchObject({ status: 'retry', attempts: 1, lastErrorCode: 'NETWORK_ERROR' });
  });
});
