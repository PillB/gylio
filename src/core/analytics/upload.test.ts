import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/authToken', () => ({ authHeaders: async (extra?: Record<string, string>) => ({ ...(extra ?? {}) }) }));
import { uploadOnce } from './upload';

const queue = (n: number) => Array.from({ length: n }, (_, i) => ({ name: 'paywall_viewed', sessionId: 's', ts: i }));

beforeEach(() => localStorage.clear());

describe('uploadOnce', () => {
  it('sends at most 50 events and keeps the rest queued', async () => {
    localStorage.setItem('analytics:queue', JSON.stringify(queue(60)));
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 202 }));
    expect(await uploadOnce(fetchImpl)).toBe(50);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).events).toHaveLength(50);
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
      localStorage.setItem('analytics:queue', JSON.stringify([...queue(2), { name: 'trial_started', sessionId: 's', ts: 9 }]));
      return new Response('{}', { status: 202 });
    });
    await uploadOnce(fetchImpl);
    expect(JSON.parse(localStorage.getItem('analytics:queue') as string)).toEqual([{ name: 'trial_started', sessionId: 's', ts: 9 }]);
  });
});
