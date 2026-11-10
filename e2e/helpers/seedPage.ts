import type { Page } from '@playwright/test';

const SEED_PAGE = '__seed.html';

/**
 * Opens a blank page on the app's origin, so a test can write localStorage before any part of the app mounts: a
 * mounted provider can write its own state over the fixture (Firefox showed it: a fixture written into the open app
 * and then reloaded lost to the onboarding provider's own state). Playwright answers the request itself, so the page
 * never ships. `site` is the origin to seed when it is not the dev server, such as the built copy.
 */
export async function openSeedPage(page: Page, site?: string): Promise<void> {
  await page.route(`**/${SEED_PAGE}`, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html lang="en"><title>Seed</title></html>' }));
  await page.goto(site ? new URL(SEED_PAGE, site).toString() : SEED_PAGE, { waitUntil: 'domcontentloaded' });
}
