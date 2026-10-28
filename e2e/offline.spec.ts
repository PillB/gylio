/**
 * Starting the app with no connection, on a built copy of the site (the dev server has no service worker).
 *
 * The service worker cached only the start page: it read the web app manifest as if it were the build's file
 * list, and the scripts it did store were missed on lookup because the server answers `Vary: Origin`. Once
 * offline, every screen was blank. This opens the app once online, as a first visit, then goes offline and
 * opens screens that were never visited. The app's typeface used to come from Google Fonts, which the worker
 * never cached, so offline text fell back to the system font; it is bundled now (src/styles/fonts.css).
 */
import { test, expect } from '@playwright/test';
import { builtSiteUrl } from './helpers/builtSite';

test.use({ serviceWorkers: 'allow' });

test('opens screens never visited before, with no connection, after one online visit', async ({ page, context }) => {
  const fontHosts: string[] = [];
  page.on('request', (request) => {
    const host = new URL(request.url()).host;
    if (/fonts\.(googleapis|gstatic)\.com$/.test(host)) fontHosts.push(host);
  });
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

  // The typeface comes from the app's own cache, not a font service: the text keeps Inter offline.
  const faces = await page.evaluate(async () => (await document.fonts.load('600 16px Inter', 'Plan')).map((face) => face.status));
  expect(faces).toEqual(['loaded']);
  expect(fontHosts).toEqual([]);
});
