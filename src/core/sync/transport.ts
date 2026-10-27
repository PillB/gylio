import type { HttpResponse, Transport } from './types';

/**
 * `fetch` pointed at the API. A request that hangs counts as a failed one after `timeoutMs`, so a dead
 * connection cannot hold the sync pass (and the lock) forever. Nothing is cached and no cookies are sent.
 */
export const createFetchTransport =
  (baseUrl: string, fetchFn: typeof fetch = (...args) => fetch(...args), timeoutMs = 20_000): Transport =>
  async (request): Promise<HttpResponse> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchFn(`${baseUrl}${request.path}`, {
        method: request.method,
        headers: {
          Authorization: `Bearer ${request.token}`,
          ...(request.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit',
      });
      return {
        status: response.status,
        headers: response.headers,
        json: async () => {
          try {
            return await response.json();
          } finally {
            clearTimeout(timer);
          }
        },
      };
    } catch (error) {
      clearTimeout(timer);
      throw error;
    }
  };
