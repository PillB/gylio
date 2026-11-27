import { test, expect, type Page } from '@playwright/test';
import { openSeedPage } from './helpers/seedPage';

const tabs = ['tasks', 'calendar', 'budget', 'social', 'connection-lab', 'routines', 'rewards', 'settings'] as const;
type Tab = typeof tabs[number];

async function openTab(page: Page, tab: Tab) {
  const control = page.locator(`[data-tour="nav-${tab}"]`);
  await expect(control).toBeVisible();
  await control.click();
  await expect(page).toHaveURL(new RegExp(`/${tab}/?$`));
  await expect(control).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('main')).toBeVisible();
}

async function visitEveryTab(page: Page) {
  for (const tab of tabs) {
    await openTab(page, tab);
    // Exactly one navigation destination is selected, even for gated features.
    await expect(page.locator('[data-tour="nav-bar"] button[aria-pressed="true"]')).toHaveCount(1);
  }
}

async function firstUse(page: Page, title: string) {
  await page.clock.setFixedTime(new Date('2026-11-16T15:00:00Z'));
  await openSeedPage(page);
  await page.evaluate(() => localStorage.setItem('gylio_lang', 'en'));
  await page.goto('/gylio/onboarding');
  await page.getByRole('button', { name: /next/i }).click();
  await page.getByLabel(/first task.*optional/i).fill(title);
  await page.getByRole('button', { name: /next/i }).click();
  await page.getByRole('button', { name: /finish/i }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

test.describe('cross-tab lifecycle (local test data, no production writes)', () => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), 'Requires an isolated local development origin.');
  test('onboarding, daily task, linked weekly event and month view preserve the same records', async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const title = 'QA daily planning task';
    await firstUse(page, title);
    await visitEveryTab(page);
    await openTab(page, 'tasks');
    await expect(page.getByText(title, { exact: true })).toBeVisible();

    await openTab(page, 'calendar');
    const convert = page.getByRole('button', { name: `Convert to event: ${title}`, exact: true });
    await convert.click();
    await expect(convert).toHaveCount(0);
    const grid = page.locator('[data-tour="calendar-grid"]');
    for (const mode of ['Day', 'Week', 'Month']) {
      const button = page.getByRole('group', { name: /view/i }).getByRole('button', { name: mode, exact: true });
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(grid.getByText(title, { exact: true }).first()).toBeVisible();
    }
    await visitEveryTab(page);
    await openTab(page, 'calendar');
    await expect(convert).toHaveCount(0);
    await page.getByRole('button', { name: `Delete ${title}`, exact: true }).click();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(convert).toBeVisible();
    await visitEveryTab(page);
    await openTab(page, 'tasks');
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('new-month income cannot overwrite the previous budget after navigation or reload', async ({ page }) => {
    test.setTimeout(120_000);
    await firstUse(page, 'QA monthly planning task');
    await openTab(page, 'budget');
    const period = page.getByLabel(/^period$/i);
    const income = page.locator('[data-tour="budget-income"]');
    const addIncome = async (source: string, amount: string) => {
      await income.getByLabel(/^income source/i).fill(source);
      await income.getByLabel(/^amount/i).fill(amount);
      await income.getByRole('button', { name: /add income/i }).click();
      await expect(income.getByText(source, { exact: true })).toBeVisible();
    };
    await period.fill('2026-11');
    await page.getByRole('button', { name: /open budget/i }).click();
    await addIncome('QA November salary', '3000');
    await visitEveryTab(page);
    await openTab(page, 'budget');
    await period.fill('2026-12');
    // Regression: the November income used to remain active when December had no row.
    await expect(income.getByText('QA November salary', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: /open budget/i }).click();
    await addIncome('QA December salary', '4200');
    await visitEveryTab(page);
    await openTab(page, 'budget');
    await page.reload();
    await period.fill('2026-11');
    await expect(income.getByText('QA November salary', { exact: true })).toBeVisible();
    await expect(income.getByText('QA December salary', { exact: true })).toHaveCount(0);
    await period.fill('2026-12');
    await expect(income.getByText('QA December salary', { exact: true })).toBeVisible();
    await expect(income.getByText('QA November salary', { exact: true })).toHaveCount(0);
  });
});
