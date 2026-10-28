import { describe, expect, it, vi } from 'vitest';
import { createFetchTransport } from './transport';

describe('the fetch transport', () => {
  const okResponse = () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Gylio-Usage': 'warn' } });

  it('sends the token as a bearer header, JSON only when there is a body, and never caches or sends cookies', async () => {
    const fetchFn = vi.fn(async () => okResponse());
    const transport = createFetchTransport('https://gylio.app', fetchFn as unknown as typeof fetch);
    await transport({ method: 'PUT', path: '/api/tasks/a', token: 't0ken', body: { title: 'x', baseVersion: 0 } });
    await transport({ method: 'GET', path: '/api/sync/pull?since=0', token: 't0ken' });
    const [putUrl, putInit] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    const [, getInit] = fetchFn.mock.calls[1] as unknown as [string, RequestInit];
    expect(putUrl).toBe('https://gylio.app/api/tasks/a');
    expect(putInit.headers).toMatchObject({ Authorization: 'Bearer t0ken', 'Content-Type': 'application/json' });
    expect(putInit.body).toBe('{"title":"x","baseVersion":0}');
    expect(getInit.headers).toEqual({ Authorization: 'Bearer t0ken' });
    expect(getInit.body).toBeUndefined();
    expect([putInit.cache, putInit.credentials]).toEqual(['no-store', 'omit']);
  });

  it('hands back status, headers and the JSON body', async () => {
    const transport = createFetchTransport('', (async () => okResponse()) as unknown as typeof fetch);
    const res = await transport({ method: 'GET', path: '/x', token: 't' });
    expect(res.status).toBe(200);
    expect(res.headers.get('Gylio-Usage')).toBe('warn');
    expect(await res.json()).toEqual({ ok: true });
  });

  it('turns a request that never answers into a failure, so the pass cannot hang', async () => {
    const hang = ((_: string, init: RequestInit) =>
      new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))) as unknown as typeof fetch;
    const transport = createFetchTransport('', hang, 20);
    await expect(transport({ method: 'GET', path: '/x', token: 't' })).rejects.toThrow();
  });

  it('lets a network error through as an error', async () => {
    const transport = createFetchTransport('', (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch);
    await expect(transport({ method: 'GET', path: '/x', token: 't' })).rejects.toThrow('Failed to fetch');
  });
});
