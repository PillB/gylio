import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/authToken', () => ({ authHeaders: async (extra?: Record<string, string>) => ({ ...(extra ?? {}) }) }));
import { analyticsUploadEnabled, startAnalyticsUpload, uploadOnce } from './upload';

const queue = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `evt-${String(i).padStart(4, '0')}`, signedIn: true, name: 'paywall_viewed', sessionId: 's', ts: i }));

beforeEach(() => localStorage.clear());

describe('uploadOnce', () => {
  it('sends at most 50 events and keeps the rest queued', async () => {
    localStorage.setItem('analytics:queue', JSON.stringify(queue(60)));
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 202 }));
    expect(await uploadOnce(fetchImpl)).toBe(50);
    const sent = JSON.parse(fetchImpl.mock.calls[0][1].body).events;
    expect(sent).toHaveLength(50);
    // The id travels with the event so the server can drop a re-sent copy.
    expect(sent[0]).toEqual({ id: 'evt-0000', signedIn: true, name: 'paywall_viewed', sessionId: 's' });
    expect(JSON.parse(localStorage.getItem('analytics:queue') as string)).toHaveLength(10);
  });

  it('keeps everything when offline or the server fails', async () => {
    localStorage.setItem('analytics:queue', JSON.stringify(queue(3)));
    expect(await uploadOnce(vi.fn().mockRejectedValue(new TypeError('offline')))).toBe(0);
    expect(await uploadOnce(vi.fn().mockResolvedValue(new Response('', { status: 503 })))).toBe(0);
    expect(JSON.parse(localStorage.getItem('analytics:queue') as string)).toHaveLength(3);
  });

  it('does not lose events that were queued while the upload was in flight', async () => {
    localStorage.setItem('analytics:queue', JSON.stringify(queue(2)));
    const fetchImpl = vi.fn().mockImplementation(async () => {
      localStorage.setItem('analytics:queue', JSON.stringify([...queue(2), { id: 'evt-late', name: 'trial_started', sessionId: 's', ts: 9 }]));
      return new Response('{}', { status: 202 });
    });
    await uploadOnce(fetchImpl);
    expect(JSON.parse(localStorage.getItem('analytics:queue') as string)).toEqual([{ id: 'evt-late', name: 'trial_started', sessionId: 's', ts: 9 }]);
  });
});

describe('which builds send analytics', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([
    ['the Cloudflare build (the Worker stores them)', { VITE_SYNC_ENABLED: 'true', VITE_BILLING_ENABLED: 'false' }, true],
    ['a build with the old server', { VITE_SYNC_ENABLED: '', VITE_BILLING_ENABLED: 'true' }, true],
    ['the GitHub Pages preview, which has no API', { VITE_SYNC_ENABLED: '', VITE_BILLING_ENABLED: 'false' }, false],
  ])('%s', async (_build, flags, sends) => {
    for (const [name, value] of Object.entries(flags)) vi.stubEnv(name, value);
    localStorage.setItem('analytics:queue', JSON.stringify(queue(3)));
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(analyticsUploadEnabled()).toBe(sends);
    const stop = startAnalyticsUpload();
    await vi.waitFor(() => expect(fetchMock.mock.calls.length > 0).toBe(sends));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual(sends ? ['/api/analytics/events'] : []);
    stop();
  });
});
