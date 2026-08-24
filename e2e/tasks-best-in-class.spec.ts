import { expect, test, type Page } from '@playwright/test';

async function openFreshTasks(page: Page, language = 'en') {
  // Seed persistence before React mounts so the fixture cannot race provider hydration.
  await page.goto('/gylio/deployment-guide.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate((lang) => {
    localStorage.clear();
    localStorage.setItem('gylio_lang', lang);
    localStorage.setItem('onboardingFlowState', JSON.stringify({
      schemaVersion: 5,
      currentStep: 2,
      isOnboardingComplete: true,
      selections: {
        accessibility: {
          textStyle: 'standard',
          contrast: 'balanced',
          motion: 'system',
          animations: true,
          tts: false
        },
        quickSetup: { starterGoal: '' },
        tour: {}
      }
    }));
  }, language);

  await page.goto('/gylio/tasks', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/gylio\/tasks$/);
}

async function expectNoHorizontalOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
}

test.describe('best-in-class Tasks critical path', () => {
  test.beforeEach(async ({ page }) => {
    await openFreshTasks(page);
  });

  test('starts with a short capture path and defers optional task details', async ({ page }) => {
    const form = page.locator('form').filter({ has: page.locator('#new-task') });

    await expect(form.locator('#new-task')).toBeVisible();
    await expect(form.getByRole('button', { name: /^add task$/i })).toBeVisible();
    await expect(form.getByRole('button', { name: /add details/i })).toBeVisible();

    // Date, energy, implementation-intention and subtask controls are useful,
    // but none is required to capture a task. Keep them one clear action away.
    await expect(form.locator('#planned-date')).toBeHidden();
    await expect(form.getByText(/energy required/i)).toBeHidden();
    await expect(form.getByRole('button', { name: /break into steps/i })).toBeHidden();
  });

  test('a title-only task created in Today stays visible in Today and confirms success', async ({ page }) => {
    const title = 'Send the signed form';
    await page.locator('#new-task').fill(title);
    await page.getByRole('button', { name: /^add task$/i }).click();

    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^today$/i })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('status')).toContainText(/added.*today/i);
  });

  test('reveals familiar, reversible scheduling choices only when details are requested', async ({ page }) => {
    const form = page.locator('form').filter({ has: page.locator('#new-task') });
    await form.locator('#new-task').fill('Review travel checklist');
    await form.getByRole('button', { name: /add details/i }).click();

    const schedule = form.getByRole('group', { name: /schedule task/i });
    await expect(schedule).toBeVisible();
    await expect(schedule.getByRole('button', { name: /^today$/i })).toBeVisible();
    await expect(schedule.getByRole('button', { name: /^tomorrow$/i })).toBeVisible();
    await expect(schedule.getByRole('button', { name: /^no date$/i })).toBeVisible();
    await expect(schedule.getByRole('button', { name: /pick date/i })).toBeVisible();

    await schedule.getByRole('button', { name: /^no date$/i }).click();
    await form.getByRole('button', { name: /^add task$/i }).click();
    await expect(page.getByText('Review travel checklist', { exact: true })).toHaveCount(0);

    await page.getByRole('tab', { name: /^backlog$/i }).click();
    await expect(page.getByText('Review travel checklist', { exact: true })).toBeVisible();
  });

  test('keeps the 320px empty-state Tasks journey materially shorter than the old four-screen baseline', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.reload({ waitUntil: 'networkidle' });
    await expectNoHorizontalOverflow(page);

    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(height).toBeLessThanOrEqual(1900);
    await page.screenshot({ path: 'e2e/screenshots/tasks-best-in-class-320.png', fullPage: true });
  });

  test('retains the fast keyboard entry path', async ({ page }) => {
    await page.locator('body').click();
    await page.keyboard.press('n');
    await expect(page.locator('#new-task')).toBeFocused();
  });
});
