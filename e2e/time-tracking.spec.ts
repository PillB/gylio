import { expect, test, type Page } from '@playwright/test';
import { openSeedPage } from './helpers/seedPage';

async function openFreshTasks(page: Page) {
  await openSeedPage(page);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('gylio_lang', 'en');
    localStorage.setItem('onboardingFlowState', JSON.stringify({
      schemaVersion: 5,
      currentStep: 2,
      isOnboardingComplete: true,
      selections: {
        accessibility: { textStyle: 'standard', contrast: 'balanced', motion: 'system', animations: true, tts: false },
        quickSetup: { starterGoal: '' },
        tour: {}
      }
    }));
  });
  await page.goto('/gylio/tasks', { waitUntil: 'networkidle' });
}

async function expectNoHorizontalOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
}

async function addTaskWithEstimate(page: Page, title: string) {
  const form = page.locator('form').filter({ has: page.locator('#new-task') });
  await form.locator('#new-task').fill(title);
  await form.getByRole('button', { name: /add details/i }).click();
  await form.getByRole('button', { name: '30m', exact: true }).click();
  await expect(form.getByRole('button', { name: '30m', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await form.getByRole('button', { name: /^add task$/i }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

test.describe('time tracking', () => {
  test.beforeEach(async ({ page }) => {
    await openFreshTasks(page);
  });

  test('start, stop, fix and review time on a task, with the keyboard', async ({ page }) => {
    await addTaskWithEstimate(page, 'Write report');

    const start = page.getByRole('button', { name: /track time on write report/i });
    await start.focus();
    await page.keyboard.press('Enter');

    const bar = page.getByRole('region', { name: /time tracker/i });
    await expect(bar).toBeVisible();
    await expect(bar).toContainText('Write report');
    await expect(page).toHaveTitle(/⏱ \d\d:\d\d · Write report/);

    await page.waitForTimeout(6000);
    await bar.getByRole('button', { name: /stop tracking/i }).click();
    await expect(page.getByRole('status', { name: /time saved/i })).toBeVisible();

    await page.getByRole('button', { name: /^fix$/i }).click();
    await page.locator('#fix-minutes').fill('45');
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(/Tracked 45m/)).toBeVisible();
    await expect(page.getByText(/Your guess 30m/)).toBeVisible();

    await page.getByText(/Time log \(1 entry\)/).click();
    await expect(page.getByLabel(/Minutes for the stretch on/)).toHaveValue('45');
  });

  test('starting a second task saves the first and moves the timer', async ({ page }) => {
    await addTaskWithEstimate(page, 'First thing');
    await addTaskWithEstimate(page, 'Second thing');
    await page.getByRole('button', { name: /track time on first thing/i }).click();
    // Pretend the first task has been running for ten minutes (the person was active a moment ago).
    await page.evaluate(() => {
      const run = JSON.parse(localStorage.getItem('gylio:timeTracker:v1') ?? '{}');
      run.startedAt = new Date(Date.now() - 10 * 60_000).toISOString();
      localStorage.setItem('gylio:timeTracker:v1', JSON.stringify(run));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /track time on second thing/i }).click();
    await expect(page.getByRole('region', { name: /time tracker/i })).toContainText('Second thing');
    await expect(page.getByText(/Tracked 10m/)).toBeVisible();
  });

  test('a timer left running overnight asks what to do with the gap and never discards it silently', async ({ page }) => {
    await addTaskWithEstimate(page, 'Forgotten timer');
    await page.evaluate(() => {
      const now = Date.now();
      localStorage.setItem('gylio:timeTracker:v1', JSON.stringify({
        taskId: 1,
        title: 'Forgotten timer',
        estimateMin: 30,
        startedAt: new Date(now - 10 * 3600_000).toISOString(),
        lastActiveAt: new Date(now - 9 * 3600_000).toISOString()
      }));
    });
    await page.reload({ waitUntil: 'networkidle' });

    const question = page.getByRole('group', { name: /you were away/i });
    await expect(question).toBeVisible();
    await expect(question.getByRole('button')).toHaveText([
      'Yes, I was still working',
      'No: remove that time and stop',
      'Remove that time, keep timing'
    ]);

    await question.getByRole('button', { name: /remove that time and stop/i }).click();
    await expect(page.getByRole('status', { name: /time saved/i })).toContainText('1h');
  });

  for (const width of [320, 390]) {
    test(`bar and prompts fit a ${width}px screen without horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await addTaskWithEstimate(page, 'A fairly long task title that should wrap rather than push the page sideways');
      await page.getByRole('button', { name: /track time on a fairly long/i }).click();
      await expect(page.getByRole('region', { name: /time tracker/i })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.evaluate(() => {
        const now = Date.now();
        localStorage.setItem('gylio:timeTracker:v1', JSON.stringify({
          taskId: 1,
          title: 'A fairly long task title that should wrap rather than push the page sideways',
          estimateMin: 30,
          startedAt: new Date(now - 5 * 3600_000).toISOString(),
          lastActiveAt: new Date(now - 4 * 3600_000).toISOString()
        }));
      });
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.getByRole('group', { name: /you were away/i })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});
