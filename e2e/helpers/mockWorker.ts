import type { Page } from '@playwright/test';
import { FakeServer, type FakeTime } from '../../src/core/sync/testHarness';

/**
 * The Worker's sync endpoints for a browser test: the same stand-in the unit tests use (versions, tombstones,
 * 409 with the current copy, 503 pauses), answering real network calls from a real page. The real Worker is
 * exercised separately in worker/test/syncClient.test.ts.
 */
export class MockWorker extends FakeServer {
  constructor() {
    super({ now: () => Date.now() } as FakeTime);
    this.validToken = 'e2e-token';
  }

  async attach(page: Page) {
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const post = request.postData();
      try {
        const response = await this.transport({
          method: request.method() as 'GET' | 'PUT' | 'DELETE',
          path: `${url.pathname}${url.search}`,
          token: (request.headers().authorization ?? '').replace('Bearer ', ''),
          body: post ? JSON.parse(post) : undefined,
        });
        const body = await response.json().then(
          (value) => JSON.stringify(value),
          () => '',
        );
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        for (const name of ['Retry-After', 'Gylio-Usage']) {
          const value = response.headers.get(name);
          if (value) headers[name] = value;
        }
        await route.fulfill({ status: response.status, headers, body });
      } catch {
        // The stand-in "down" mode throws like a dropped connection.
        await route.abort('failed');
      }
    });
  }

  get titles() {
    return [...this.records.values()].filter((r) => !r.deleted).map((r) => String(r.data?.title)).sort();
  }
}
