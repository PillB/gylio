import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const LIVE_BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://pillb.github.io/gylio/';
const screenshotDir = path.join(process.cwd(), 'e2e', 'live-screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

const liveUrl = (route = '') => new URL(route.replace(/^\//, ''), LIVE_BASE).toString();

async function seedCompletedOnboarding(page: Page) {
  await page.goto(liveUrl(), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('onboardingFlowState', JSON.stringify({
      isOnboardingComplete: true,
      currentStep: 4,
      selections: {
        accessibility: { textStyle: 'normal', contrast: 'default', motion: 'full', animations: true, tts: false },
        neurodivergence: { preset: 'none', supports: [] },
        quickSetup: { starterGoal: '', monthlyBudget: '' },
        tour: { acknowledged: true, reminders: false },
      },
    }));
  });
}

async function openAppRoute(page: Page, route: string) {
  await seedCompletedOnboarding(page);
  const response = await page.goto(liveUrl(route), { waitUntil: 'networkidle' });
  // GitHub Pages deep BrowserRouter paths use the deployed 404.html SPA shell,
  // so a direct deep-link may have HTTP 404 while still booting the correct app.
  expect([200, 404]).toContain(response?.status());
  await expect(page.locator('#root')).toBeVisible();
}

function collectRuntimeErrors(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  return { pageErrors, consoleErrors };
}

test.describe('GYLIO live GitHub Pages production audit', () => {
  test('01 public shell, footer and Deployment Academy are reachable', async ({ page }) => {
    const response = await page.goto(liveUrl(), { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/GYLIO/i);
    await expect(page.locator('#root')).toBeVisible();
    const academy = page.getByRole('link', { name: 'Production Deployment Academy' });
    await expect(academy).toBeVisible();
    await expect(academy).toHaveAttribute('href', /deployment-guide\.html$/);
    await page.screenshot({ path: path.join(screenshotDir, '01-live-root-desktop.png'), fullPage: true });
  });

  test('02 direct deep links boot the SPA and render core routes', async ({ page }) => {
    for (const route of ['tasks', 'calendar', 'budget', 'settings', 'pricing']) {
      await openAppRoute(page, route);
      await expect(page).toHaveURL(new RegExp(`/gylio/${route}$`));
      await expect(page.locator('main, #root').first()).toBeVisible();
      if (route !== 'pricing') await expect(page.locator('h1, h2').first()).toBeVisible();
    }
  });

  test('03 task creation persists after a real live reload', async ({ page }) => {
    await openAppRoute(page, 'tasks');
    const title = `Live validation task ${Date.now()}`;
    const today = await page.evaluate(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });
    await page.locator('#new-task').fill(title);
    await page.locator('#planned-date').fill(today);
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(title).first()).toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText(title).first()).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, '03-live-task-persistence.png'), fullPage: true });
  });

  test('04 primary navigation and premium-to-pricing flow work live', async ({ page }) => {
    await openAppRoute(page, 'tasks');
    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(nav).toBeVisible();

    for (const [name, route] of [['Calendar', 'calendar'], ['Budget', 'budget'], ['Settings', 'settings']] as const) {
      await nav.getByRole('button', { name }).click();
      await expect(page).toHaveURL(new RegExp(`/gylio/${route}$`));
    }

    await page.goto(liveUrl('routines'), { waitUntil: 'networkidle' });
    const gate = page.getByRole('region', { name: /upgrade to access this feature/i });
    await expect(gate).toBeVisible();
    await gate.getByRole('button', { name: /see plans/i }).click();
    await expect(page).toHaveURL(/\/gylio\/pricing$/);
    await expect(page.getByRole('heading', { name: /simple, honest pricing/i })).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, '04-live-pricing-flow.png'), fullPage: true });
  });

  test('05 language selection localizes visible and accessible shell and persists', async ({ page }) => {
    await openAppRoute(page, 'settings');
    const language = page.getByRole('combobox', { name: /select language/i }).first();
    await expect(language).toBeVisible();
    await language.selectOption('es-PE');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-PE');
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
    await expect(page.locator('footer[aria-label="Recursos del producto"]')).toBeVisible();
    await expect(page.getByText('Recursos de GYLIO')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Academia de despliegue a producción' })).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, '05-live-es-pe-localization.png'), fullPage: true });

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-PE');
    await expect(page.getByText('Calendario').first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
    await expect(page.locator('footer[aria-label="Recursos del producto"]')).toBeVisible();
  });

  test('06 keyboard navigation reaches interactive UI instead of trapping focus', async ({ page }) => {
    await openAppRoute(page, 'tasks');
    const visited: string[] = [];
    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press('Tab');
      visited.push(await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return `${el?.tagName || 'NONE'}:${el?.getAttribute('aria-label') || el?.textContent?.trim().slice(0, 40) || ''}`;
      }));
    }
    expect(visited.some((entry) => !entry.startsWith('BODY:') && !entry.startsWith('NONE:'))).toBeTruthy();
    console.log('Keyboard focus sequence:', visited);
  });

  test('07 no uncaught JavaScript errors while traversing live core routes', async ({ page }) => {
    const errors = collectRuntimeErrors(page);
    await seedCompletedOnboarding(page);
    for (const route of ['tasks', 'calendar', 'budget', 'social', 'routines', 'rewards', 'settings', 'pricing']) {
      await page.goto(liveUrl(route), { waitUntil: 'networkidle' });
      await page.waitForTimeout(250);
    }
    console.log('Live console errors (informational):', errors.consoleErrors);
    expect(errors.pageErrors, 'Uncaught browser runtime errors').toEqual([]);
  });

  test('08 Deployment Academy content and persistence work on the public URL', async ({ page }) => {
    await page.goto(liveUrl('deployment-guide.html'), { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1, name: /From your laptop to a real production app/i })).toBeVisible();
    await expect(page.locator('meta[name="gylio-guide-validated"]')).toHaveAttribute('content', '2026-08-23');
    await expect(page.locator('.step[data-step]')).toHaveCount(24);
    await expect(page.getByRole('heading', { name: /Bibliography/i })).toBeVisible();

    await page.evaluate(() => {
      localStorage.removeItem('gylio-deploy-guide-progress-v1');
      localStorage.removeItem('gylio-deploy-guide-settings-v1');
    });
    await page.reload();
    await page.locator('#step-01 .step-check').check();
    await expect(page.locator('#progress-label')).toContainText('1 / 24 done');
    await page.reload();
    await expect(page.locator('#step-01 .step-check')).toBeChecked();

    await page.locator('#step-filter').fill('nginx');
    await expect(page.locator('#filter-count')).not.toContainText('24 of 24');
    await page.locator('#step-filter').fill('');
    await page.getByRole('button', { name: 'Run guide self-check' }).click();
    await expect(page.locator('#self-check-results .result')).toHaveCount(6);
  });

  test('09 public guide personalization changes commands without storing secrets', async ({ page }) => {
    await page.goto(liveUrl('deployment-guide.html'), { waitUntil: 'networkidle' });
    const domain = page.locator('[data-config="DOMAIN"]');
    await domain.fill('live-validation.example');
    await expect(page.locator('code.templated').filter({ hasText: 'live-validation.example' }).first()).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-config="DOMAIN"]')).toHaveValue('live-validation.example');
    const keys = await page.locator('[data-config]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-config') || ''));
    expect(keys.join(' ')).not.toMatch(/SECRET|PASSWORD|TOKEN|MONGODB_URI|OPENAI/i);
  });

  test('10 iPhone 320/390 layouts have no page-level horizontal overflow', async ({ page }) => {
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await openAppRoute(page, 'tasks');
      let dims = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(dims.scroll).toBeLessThanOrEqual(dims.client + 1);
      await page.screenshot({ path: path.join(screenshotDir, `10-live-tasks-${viewport.width}.png`), fullPage: true });

      await page.goto(liveUrl('deployment-guide.html'), { waitUntil: 'networkidle' });
      dims = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(dims.scroll).toBeLessThanOrEqual(dims.client + 1);
      await page.screenshot({ path: path.join(screenshotDir, `10-live-guide-${viewport.width}.png`), fullPage: true });
    }
  });

  test('11 live DOM has no duplicate IDs on audited public views', async ({ page }) => {
    for (const route of ['tasks', 'calendar', 'budget', 'settings', 'pricing', 'deployment-guide.html']) {
      if (route === 'deployment-guide.html') await page.goto(liveUrl(route), { waitUntil: 'networkidle' });
      else await openAppRoute(page, route);
      const duplicates = await page.evaluate(() => {
        const ids = Array.from(document.querySelectorAll('[id]')).map((el) => el.id).filter(Boolean);
        return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
      });
      expect(duplicates, `Duplicate IDs on ${route}`).toEqual([]);
    }
  });
});
