/**
 * The text for each language is a file of its own, fetched when that language is first used. On a built copy of
 * the site (the dev server serves every source file separately, so it cannot show which files a visit downloads):
 * a visit in one language does not download the other, choosing the other fetches it, and a file that cannot be
 * fetched leaves the app usable and says so.
 *
 * The service worker is off here (the config's default), so every file a page asks for is a request this can see.
 * Switching language with no connection, from the worker's cache, is in offline.spec.ts.
 */
import { test, expect, type Page } from '@playwright/test';
import { builtSiteUrl } from './helpers/builtSite';

const ENGLISH = /\/assets\/catalog\.en-[\w-]+\.js$/;
const SPANISH = /\/assets\/catalog\.es-PE-[\w-]+\.js$/;

async function open(page: Page, route = 'settings') {
  const asked: string[] = [];
  page.on('request', (request) => asked.push(new URL(request.url()).pathname));
  await page.addInitScript(() => {
    if (localStorage.getItem('onboardingFlowState')) return;
    localStorage.setItem('onboardingFlowState', JSON.stringify({
      isOnboardingComplete: true,
      currentStep: 4,
      selections: {
        accessibility: { textStyle: 'normal', contrast: 'default', motion: 'reduced', animations: false, tts: false },
        neurodivergence: { preset: 'none', supports: [] },
        quickSetup: { starterGoal: '', monthlyBudget: '' },
        tour: { acknowledged: true, reminders: false },
      },
    }));
  });
  await page.goto(new URL(route, builtSiteUrl).toString());
  return asked;
}

const sent = (page: Page, name: string) =>
  page.evaluate(
    (wanted) =>
      (JSON.parse(localStorage.getItem('analytics:queue') ?? '[]') as { name: string; props: unknown }[])
        .filter((event) => event.name === wanted)
        .map((event) => event.props),
    name,
  );

test('a visit in English downloads the English text only; choosing Spanish fetches the Spanish', async ({ page }) => {
  const asked = await open(page);
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  expect(asked.filter((path) => ENGLISH.test(path))).toHaveLength(1);
  expect(asked.filter((path) => SPANISH.test(path))).toEqual([]);

  await page.getByRole('combobox', { name: 'Select language' }).first().selectOption('es-PE');
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-PE');
  expect(asked.filter((path) => SPANISH.test(path))).toHaveLength(1);
  await expect.poll(() => sent(page, 'language_changed')).toEqual([{ to: 'es-PE' }]);

  // The choice is remembered: the next visit starts in Spanish and does not fetch English at all.
  asked.length = 0;
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  expect(asked.filter((path) => SPANISH.test(path))).toHaveLength(1);
  expect(asked.filter((path) => ENGLISH.test(path))).toEqual([]);
});

test('a browser set to Spanish opens in Spanish without downloading the English text', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'es-MX' });
  const page = await context.newPage();
  const asked = await open(page, 'tasks');
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-PE');
  expect(asked.filter((path) => SPANISH.test(path))).toHaveLength(1);
  expect(asked.filter((path) => ENGLISH.test(path))).toEqual([]);
  // No screen was drawn with keys in place of words while the text was on its way.
  await expect(page.getByText(/^[a-z]+(\.[a-zA-Z]+)+$/)).toHaveCount(0);
  await context.close();
});

test('the app stays in English and says why when the Spanish text cannot be fetched', async ({ page }) => {
  await page.route(SPANISH, (route) => route.abort('internetdisconnected'));
  await open(page);
  const language = page.getByRole('combobox', { name: 'Select language' }).first();
  await language.selectOption('es-PE');
  await expect(page.getByRole('alert').filter({ hasText: 'Could not load that language. Check your connection and try again.' })).toBeVisible();
  await expect(language).toHaveValue('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await expect.poll(() => sent(page, 'language_load_failed')).toEqual([{ to: 'es-PE' }]);
  expect(await sent(page, 'language_changed')).toEqual([]);

  // "Try again" is true: with the connection back, the same choice works without a reload. The file is asked for
  // under a new address, because Safari answers a second import of an address that failed with the same failure.
  await page.unroute(SPANISH);
  const retry = page.waitForRequest(/\/assets\/catalog\.es-PE-[\w-]+\.js\?attempt=1$/);
  await language.selectOption('es-PE');
  await retry;
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a start-up that cannot fetch its text offers a reload in both languages, and the reload opens the app', async ({ page }) => {
  await page.route(ENGLISH, (route) => route.abort('internetdisconnected'));
  await open(page);
  const problem = page.getByRole('alert');
  await expect(problem.getByText('GYLIO could not finish loading. Check your connection, then reload.')).toBeVisible();
  await expect(problem.getByText('GYLIO no pudo terminar de cargar. Revisa tu conexión y vuelve a cargar.')).toBeVisible();
  // Nothing of the app is drawn without its words.
  await expect(page.getByRole('navigation')).toHaveCount(0);

  // The reload asks for the file under a new address: in Safari a reload alone gets the same failure back.
  await page.unroute(ENGLISH);
  const retry = page.waitForRequest(/\/assets\/catalog\.en-[\w-]+\.js\?attempt=1$/);
  await page.getByRole('button', { name: 'Reload / Recargar' }).click();
  await retry;
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
});
