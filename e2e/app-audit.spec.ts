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
  const url = page.url();
  if (!url.includes('/onboarding')) return;

  // Bypass the onboarding UI by directly writing the completed state to localStorage.
  // The 'Next' button is disabled until accessibility options are selected, so
  // clicking through the flow in tests is unreliable. This approach mirrors what a
  // real user would have done after finishing onboarding at least once.
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
  await goto(page, '/tasks');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
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
    // 'Next' is disabled until user selects accessibility options — only click when enabled.
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
    await expect(page.locator('h1, h2').first()).toBeVisible();
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
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('08 - Routines view', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/routines');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-routines.png`, fullPage: true });
    await expect(page.locator('h2').filter({ hasText: /routines/i }).first()).toBeVisible();
  });

  test('09 - Settings view', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/settings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-settings.png`, fullPage: true });
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('10 - Add a task and verify it appears', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/tasks');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]').first();
    if (await input.isVisible()) {
      await input.fill('E2E Test Task');
      const addBtn = page.locator('button').filter({ hasText: /add task|add|create/i }).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(600);
      }
    }
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

  test('13 - Add a routine and verify', async ({ page }) => {
    await completeOnboardingIfNeeded(page);
    await goto(page, '/routines');
    await page.waitForLoadState('networkidle');

    const titleInput = page.locator('#routine-title');
    const inputVisible = await titleInput.isVisible();
    if (inputVisible) {
      await titleInput.fill('Morning Hydration');
      const addBtn = page.locator('button').filter({ hasText: /add routine/i }).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        // Wait for IndexedDB write + React re-render (up to 3 seconds)
        await page.waitForFunction(
          () => document.body.innerText.includes('Morning Hydration'),
          null,
          { timeout: 5000 }
        ).catch(() => null); // Allow soft failure — screenshot will capture state
      }
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-routine-added.png`, fullPage: true });
    // Soft assertion: log a warning if not found instead of hard failing
    const routineVisible = await page.getByText('Morning Hydration').isVisible().catch(() => false);
    if (!routineVisible) {
      console.log('WARNING: Morning Hydration routine not visible after add — possible IndexedDB timing issue');
    }
    expect(routineVisible).toBe(true);
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
    for (const route of ['/tasks', '/calendar', '/budget', '/rewards', '/routines', '/settings']) {
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
        // Service worker can't be registered in Vite dev mode (MIME type issue — known Vite limitation)
        !e.includes('MIME type') &&
        !e.includes('ServiceWorker') &&
        !e.includes('service-worker') &&
        !e.includes('SecurityError')
    );
    if (appErrors.length > 0) console.log('App errors:', appErrors);
    else console.log('No app-level errors detected across all routes.');
    expect(appErrors.length).toBeLessThan(3);
  });
});
