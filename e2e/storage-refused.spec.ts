import { test, expect } from '@playwright/test';

// A browser set to refuse site data (Chrome's "block all cookies", Firefox with storage off) does not hand over an
// empty store: reading `window.localStorage` throws. The app must still be drawn; it just cannot remember.

test.describe('a browser that refuses storage', () => {
  test('still draws the app, starting from the beginning', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      });
    });
    await page.goto('./');
    await expect(page.getByText(/step 1 of 3/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /make gylio comfortable to use/i })).toBeVisible();
    // The steps still work for this visit; nothing can be kept for the next one.
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText(/step 2 of 3/i)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
