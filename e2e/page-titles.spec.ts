import { test, expect, type Page } from '@playwright/test';

// A screen reader announces a page's first-level heading as its title. The app name in the header is that title on
// the tabs. Pricing, Privacy and Terms open with a title of their own, and used to have both.

async function seed(page: Page, dailyView = false) {
  await page.addInitScript((daily) => {
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
    if (daily) localStorage.setItem('gylio:dailyMode', 'true');
  }, dailyView);
}

const titles = (page: Page) => page.getByRole('heading', { level: 1 }).allTextContents();

test.describe('one page title per page', () => {
  for (const [path, title] of [
    ['./pricing', /pricing|plan/i],
    ['./privacy', /^Privacy Policy$/],
    ['./terms', /^Terms of Service$/],
  ] as const) {
    test(`${path} is titled by its own heading, with the app name still shown in the header`, async ({ page }) => {
      await seed(page);
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      expect(await titles(page)).toHaveLength(1);
      await expect(page.getByRole('banner').getByText('GYLIO', { exact: true })).toBeVisible();
    });
  }

  test('each tab is titled by the app name, with the tab name one level below', async ({ page }) => {
    await seed(page);
    for (const [tab, name] of [['tasks', 'Tasks'], ['calendar', 'Calendar'], ['budget', 'Budget'], ['connection-lab', 'Connection Lab'], ['routines', 'Routines'], ['settings', 'Settings']] as const) {
      await page.goto(`./${tab}`);
      await expect(page.getByRole('heading', { level: 2, name, exact: true }).first()).toBeVisible();
      expect(await titles(page), tab).toEqual(['GYLIO']);
    }
  });

  test('the daily view is a heading under the app name, not a second title', async ({ page }) => {
    await seed(page, true);
    await page.goto('./tasks');
    await expect(page.getByRole('heading', { level: 2, name: 'Daily Command Center' })).toBeVisible();
    expect(await titles(page)).toEqual(['GYLIO']);
  });
});
