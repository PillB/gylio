/**
 * Starting the app with no connection, on a built copy of the site (the dev server has no service worker).
 *
 * The service worker cached only the start page: it read the web app manifest as if it were the build's file
 * list, and the scripts it did store were missed on lookup because the server answers `Vary: Origin`. Once
 * offline, every screen was blank. This opens the app once online, as a first visit, then goes offline and
 * opens screens that were never visited.
 */
import { test, expect } from '@playwright/test';
import { builtSiteUrl } from './helpers/builtSite';

test.use({ serviceWorkers: 'allow' });

test('opens screens never visited before, with no connection, after one online visit', async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'onboardingFlowState',
      JSON.stringify({
        isOnboardingComplete: true,
        currentStep: 4,
        selections: {
          accessibility: { textStyle: 'normal', contrast: 'default', motion: 'reduced', animations: false, tts: false },
          neurodivergence: { preset: 'none', supports: [] },
          quickSetup: { starterGoal: '', monthlyBudget: '' },
          tour: { acknowledged: true, reminders: false },
        },
      })
    );
  });
  await page.goto(new URL('tasks', builtSiteUrl).toString());
  await expect(page.locator('#new-task')).toBeVisible();
  // Wait for the worker to finish installing, which is when it caches the build's files.
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active?.state !== 'activated') {
      await new Promise((resolve) => registration.active?.addEventListener('statechange', resolve));
    }
  });

  await context.setOffline(true);
  for (const [route, landmark] of [
    ['budget', /^budget$/i],
    ['calendar', /^calendar$/i],
    ['settings', /^settings$/i],
  ] as const) {
    await page.goto(new URL(route, builtSiteUrl).toString());
    await expect(page.getByRole('navigation').getByRole('button', { name: landmark })).toBeVisible();
    await expect(page.getByRole('main')).not.toBeEmpty();
  }
});
