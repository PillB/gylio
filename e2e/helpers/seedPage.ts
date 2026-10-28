import type { Page } from '@playwright/test';

const SEED_PAGE = '__seed.html';

/**
 * Opens a blank page on the app's origin, so a test can write localStorage before any part of the app mounts: a
 * mounted provider can write its own state over the fixture. Playwright answers the request itself, so the page
 * never ships (the specs used to borrow the public deployment guide for this).
 */
export async function openSeedPage(page: Page): Promise<void> {
  await page.route(`**/${SEED_PAGE}`, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html lang="en"><title>Seed</title></html>' }));
  await page.goto(SEED_PAGE, { waitUntil: 'domcontentloaded' });
}
