import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

const BASE = 'http://localhost:5173/gylio';
const goto = (page: Page, route: string) =>
  page.goto(route === '/' ? `${BASE}/` : `${BASE}${route}`);

async function completeOnboardingIfNeeded(page: Page) {
  if (!page.url().includes('/onboarding')) return;

  await page.evaluate(() => {
    localStorage.setItem('onboardingFlowState', JSON.stringify({
      isOnboardingComplete: true,
      currentStep: 4,
      selections: {
        accessibility: { textStyle: 'normal', contrast: 'default', motion: 'full', animations: true, tts: false },
        neurodivergence: { preset: 'none', supports: [] },
        quickSetup: { starterGoal: '', monthlyBudget: '' },
        tour: { acknowledged: true, reminders: false }
      }
    }));
  });

  // The onboarding provider has already hydrated by this point. Reload the
  // document so the completed fixture is consumed during the next hydration,
  // rather than racing the provider's initial persistence effect.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
}

test.describe('GYLIO App Visual Audit', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, '/');
    await page.waitForLoadState('networkidle');
  });

  test('01 - Landing / Onboarding', async ({ page }) => {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-landing.png`, fullPage: true });
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    console.log('URL:', page.url());
  });

  test('02 - Onboarding flow (if shown)', async ({ page }) => {
    if (!page.url().includes('/onboarding')) {
      console.log('Onboarding already completed — skipping');
      await page.screenshot({ path: `${SCREENSHOT_DIR}/02-onboarding-skipped.png`, fullPage: true });
      return;
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-onboarding-step1.png`, fullPage: true });
    const nextBtn = page.locator('button').filter({ hasText: /next|continue/i }).first();
    const isEnabled = await nextBtn.isVisible() && await nextBtn.isEnabled();
    if (isEnabled) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/02-onboarding-step2.png`, fullPage: true });
    } else {
      console.log('Next button disabled (requires selections) — screenshot only');
    }
  });

  test('03 - Tasks view', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/tasks');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-tasks.png`, fullPage: true });
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('04 - Calendar view', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/calendar');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-calendar.png`, fullPage: true });
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('05 - Social plans view', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/social');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-social.png`, fullPage: true });
    await expect(page.locator('main').first()).toBeVisible();
  });

  test('06 - Budget view', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/budget');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-budget.png`, fullPage: true });
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('07 - Rewards view', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/rewards');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-rewards.png`, fullPage: true });
    await expect(page.locator('main').first()).toBeVisible();
  });

  test('08 - Routines premium gate', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/routines');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-routines.png`, fullPage: true });

    // CI intentionally runs without production Clerk credentials, so the
    // subscription defaults to free_user. Validate the product contract that a
    // premium feature is gated instead of falsely expecting the editor itself.
    await expect(page.getByRole('region', { name: /upgrade to access this feature/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /routines is a premium feature/i })).toBeVisible();
  });

  test('09 - Settings view', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/settings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-settings.png`, fullPage: true });
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('10 - Add a task planned for today and verify it appears', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/tasks');
    await page.waitForLoadState('networkidle');

    // The active task view is "Today". An unscheduled task correctly belongs in
    // backlog and therefore would not be visible here. Exercise the actual
    // Today-view contract by assigning the task the browser's local date.
    const today = await page.evaluate(() => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    });

    await page.locator('#new-task').fill('E2E Test Task');
    await page.locator('#planned-date').fill(today);
    await page.locator('form button[type="submit"]').click();

    await expect(page.getByText('E2E Test Task').first()).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-task-added.png`, fullPage: true });
  });

  test('11 - NavBar navigation check', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/tasks');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('nav[aria-label="Primary navigation"]');
    if (await nav.isVisible()) {
      await nav.screenshot({ path: `${SCREENSHOT_DIR}/11-navbar.png` });
      const buttons = await nav.locator('button').allTextContents();
      console.log('Nav buttons:', buttons);
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/11-navbar-not-found.png` });
    }
  });

  test('12 - Dark / High-contrast themes (settings)', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/settings');
    await page.waitForLoadState('networkidle');

    const darkBtn = page.locator('button').filter({ hasText: /dark/i }).first();
    if (await darkBtn.isVisible()) {
      await darkBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/12a-dark-theme.png`, fullPage: true });
    }

    const hcBtn = page.locator('button').filter({ hasText: /contrast/i }).first();
    if (await hcBtn.isVisible()) {
      await hcBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/12b-high-contrast-theme.png`, fullPage: true });
    }

    const lightBtn = page.locator('button').filter({ hasText: /light/i }).first();
    if (await lightBtn.isVisible()) {
      await lightBtn.click();
    }
  });

  test('13 - Premium routines gate links to pricing', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/routines');
    await page.waitForLoadState('networkidle');

    const gate = page.getByRole('region', { name: /upgrade to access this feature/i });
    await expect(gate).toBeVisible();
    await gate.getByRole('button', { name: /see plans/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/pricing$/);
    await expect(page.getByRole('heading', { name: /simple, honest pricing/i })).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-pricing-from-routines.png`, fullPage: true });
  });

  test('14 - Keyboard navigation on tasks', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/tasks');
    await page.waitForLoadState('networkidle');
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-keyboard-nav.png`, fullPage: true });
  });

  test('15 - Console errors across all routes', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await completeOnboardingIfNeeded(page);
    for (const route of ['/tasks', '/calendar', '/budget', '/social', '/rewards', '/routines', '/settings', '/pricing']) {
      await goto(page, route);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/15-final-state.png`, fullPage: true });
    const appErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('non-Error') &&
        !e.includes('404') &&
        !e.includes('MIME type') &&
        !e.includes('ServiceWorker') &&
        !e.includes('service-worker') &&
        !e.includes('SecurityError')
    );
    if (appErrors.length > 0) console.log('App errors:', appErrors);
    else console.log('No app-level errors detected across all routes.');
    expect(appErrors, 'Application routes emitted unexpected console/page errors').toEqual([]);
  });
});
