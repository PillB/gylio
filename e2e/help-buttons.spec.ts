import { test, expect, type Page } from '@playwright/test';

// Every help button used to be named "Information": twenty identical lines in a screen reader's list of buttons on
// Budget. Each now says what it explains ("Information: Income").

async function seed(page: Page) {
  await page.addInitScript(() => {
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
}

const helpNames = (page: Page) =>
  page.getByRole('button', { name: /^(Information|Información)/ }).evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label') ?? ''));

test.describe('help buttons', () => {
  test('each says what it explains, on every tab', async ({ page }) => {
    await seed(page);
    for (const tab of ['tasks', 'calendar', 'budget', 'routines', 'settings']) {
      await page.goto(`./${tab}`);
      await expect(page.getByRole('button', { name: /^Information: / }).first()).toBeVisible();
      const names = await helpNames(page);
      expect(names.filter((name) => !/^Information: \S/.test(name)), `${tab}: help buttons with no subject`).toEqual([]);
    }
  });

  test('on Budget no two share a name, and the name is the heading or label beside the button', async ({ page }) => {
    await seed(page);
    await page.goto('./budget');
    await expect(page.getByRole('button', { name: 'Information: Income', exact: true })).toBeVisible();
    const names = await helpNames(page);
    expect(names.length).toBeGreaterThan(10);
    expect(names.filter((name, index) => names.indexOf(name) !== index), 'names used twice').toEqual([]);
    // Opening one shows the help for the thing it names.
    const income = page.getByRole('button', { name: 'Information: Income', exact: true });
    await income.click();
    const bubble = page.locator(`[id="${await income.getAttribute('aria-describedby')}"]`);
    await expect(bubble).toBeVisible();
    await expect(bubble).toHaveText(/\w{4,}/);
  });

  test('the help beside a button that changes its wording keeps one name', async ({ page }) => {
    await seed(page);
    await page.goto('./settings');
    const help = page.getByRole('button', { name: 'Information: Screen tint', exact: true });
    await expect(help).toBeVisible();
    await page.getByRole('button', { name: 'Enable screen tint', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Disable screen tint', exact: true })).toBeVisible();
    await expect(help).toBeVisible();
    await expect(page.getByRole('button', { name: /^Information: (Enable|Disable) / })).toHaveCount(0);
  });

  test('in Spanish the name is in Spanish', async ({ page }) => {
    await seed(page);
    await page.addInitScript(() => localStorage.setItem('gylio_lang', 'es-PE'));
    await page.goto('./budget');
    await expect(page.getByRole('button', { name: 'Información: Ingresos', exact: true })).toBeVisible();
    const names = await helpNames(page);
    expect(names.filter((name) => !/^Información: \S/.test(name))).toEqual([]);
  });
});
