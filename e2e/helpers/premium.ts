import { expect, type Page } from '@playwright/test';

/** Premium needs a Clerk account with a paid plan, which browser tests do not have. */
export const premiumNeedsDevServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

/**
 * Serves the paid plan to the app, so browser tests reach the Routines, Social and Rewards screens
 * instead of their upgrade prompt. It rewrites one module, which only works against the Vite dev
 * server (it serves each source file at its own URL); a built site is skipped by the callers.
 */
export async function unlockPremium(page: Page) {
  await page.route(/\/src\/features\/subscription\/useSubscription\.ts/, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/const plan\s*=\s*[^;]+;/, 'const plan = "user_subscription";');
    await route.fulfill({ response, body });
  });
}

/**
 * Fails if the screen still shows the Pro prompt, so a premium test cannot pass on the wrong screen. It looks for the
 * prompt itself: where Pro isn't on sale the prompt has no "See plans" button to look for.
 */
export async function expectPremiumScreen(page: Page) {
  await expect(page.getByRole('region', { name: /^(a pro feature|una función de pro)$/i })).toHaveCount(0);
}
