import { test, expect, type Page } from '@playwright/test';

// A screen with nothing in it yet should show what to do first, once. Before this, Calendar stacked
// three headings over "nothing here", Budget offered a transaction form that could not be completed,
// and Routines repeated its own two buttons in a card under the form.

async function seed(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('onboardingFlowState', JSON.stringify({
      isOnboardingComplete: true,
      currentStep: 4,
      selections: {
        accessibility: { textStyle: 'normal', contrast: 'default', motion: 'reduced', animations: true, tts: false },
        neurodivergence: { preset: 'none', supports: [] },
        quickSetup: { starterGoal: '', monthlyBudget: '' },
        tour: { acknowledged: true, reminders: false },
      },
    }));
  });
}

/** What the app has queued for analytics, read where it keeps it until upload. */
const sent = (page: Page, name: string) =>
  page.evaluate(
    (wanted) =>
      (JSON.parse(localStorage.getItem('analytics:queue') ?? '[]') as { name: string; props: unknown }[])
        .filter((event) => event.name === wanted)
        .map((event) => event.props),
    name,
  );

test.describe('empty screens', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page);
  });

  test('Calendar shows the grid and "Add event", with no empty sections under them', async ({ page }) => {
    await page.goto('./calendar');
    const add = page.getByRole('button', { name: /^add event$/i });
    await expect(add).toBeVisible();
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(0);
    await expect(page.getByText(/no events yet/i)).toHaveCount(0);
    // The help button is on the button's row, not on a line of its own under it.
    const help = add.locator('xpath=following-sibling::*[1]').getByRole('button');
    const [a, h] = [await add.boundingBox(), await help.boundingBox()];
    expect(Math.abs((a!.y + a!.height / 2) - (h!.y + h!.height / 2))).toBeLessThan(4);
    expect(h!.x).toBeGreaterThan(a!.x + a!.width - 1);
    await expect.poll(() => sent(page, 'screen_state')).toEqual([{ screen: 'calendar', state: 'empty' }]);
  });

  test('Calendar sections appear with their content, each heading named without its help button', async ({ page }) => {
    await page.goto('./calendar');
    await page.getByRole('button', { name: /^add event$/i }).click();
    await page.getByLabel('Title', { exact: true }).fill('Dentist');
    await page.getByLabel('Start time', { exact: true }).fill('2026-11-12T09:00');
    await page.getByLabel('End time', { exact: true }).fill('2026-11-12T10:00');
    await page.getByRole('button', { name: /^save event$/i }).click();
    const heading = page.getByRole('heading', { level: 3, name: 'Scheduled events', exact: true });
    await expect(heading).toBeVisible();
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(1);
  });

  test('Budget asks for a category before it offers the transaction form', async ({ page }) => {
    await page.goto('./budget');
    const transactions = page.locator('[data-tour="budget-transactions"]');
    await expect(transactions.getByText('Add a category first. Then you can log what you spend here.')).toBeVisible();
    await expect(transactions.getByRole('button', { name: /add transaction/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /log weekly review/i })).toHaveCount(0);
    await expect(page.getByText(/top bar shows planned/i)).toHaveCount(0);
    await expect.poll(() => sent(page, 'screen_state')).toEqual([{ screen: 'budget_transactions', state: 'needs_category' }]);

    const categories = page.locator('[data-tour="budget-categories"]');
    await categories.getByLabel('Category', { exact: true }).fill('Groceries');
    await categories.getByLabel('Planned amount', { exact: true }).fill('200');
    await categories.getByRole('button', { name: /^add category$/i }).click();

    await expect(transactions.getByRole('button', { name: /add transaction/i })).toBeVisible();
    await expect(transactions.getByText(/add a category first/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /log weekly review/i })).toBeVisible();
    await expect(page.getByText(/top bar shows planned/i)).toBeVisible();
    await expect.poll(() => sent(page, 'screen_state')).toEqual([
      { screen: 'budget_transactions', state: 'needs_category' },
      { screen: 'budget_transactions', state: 'form' },
    ]);
  });

  test('Tasks explains focus blocks once there is a task to start one on', async ({ page }) => {
    await page.goto('./tasks');
    await expect(page.getByRole('textbox', { name: /task/i }).first()).toBeVisible();
    const focus = page.getByRole('region', { name: 'Pomodoro and focus controls' });
    await expect(focus).toHaveCount(0);
    await expect(page.getByText(/on any task above/i)).toHaveCount(0);
    await expect.poll(() => sent(page, 'screen_state')).toEqual([{ screen: 'tasks', state: 'empty' }]);

    await page.locator('#new-task').fill('Water the plants');
    await page.locator('#new-task').press('Enter');
    await expect(page.getByText('Water the plants').first()).toBeVisible();
    await expect(focus).toBeVisible();
    await expect(focus.getByText(/on any task above/i)).toBeVisible();
    await expect.poll(() => sent(page, 'screen_state')).toEqual([
      { screen: 'tasks', state: 'empty' },
      { screen: 'tasks', state: 'has_items' },
    ]);
  });

  test('Routines says there are none in one line and offers the templates once', async ({ page }) => {
    await page.goto('./routines');
    const empty = page.locator('[data-tour="routines-list"]');
    await expect(empty).toHaveText('No routines yet. The first one you add shows up here.');
    await expect(page.getByRole('button', { name: /browse routine templates/i })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /build your first routine/i })).toHaveCount(0);
    const box = await empty.boundingBox();
    expect(box!.height).toBeLessThan(80);
    await expect.poll(() => sent(page, 'screen_state')).toEqual([{ screen: 'routines', state: 'empty' }]);
  });

  test('Settings counts a switch that is changed', async ({ page }) => {
    await page.goto('./settings');
    const animations = page.getByRole('checkbox', { name: 'Allow animations', exact: true });
    await expect(animations).toBeChecked();
    expect(await sent(page, 'setting_changed')).toEqual([]);
    await animations.uncheck();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await expect.poll(() => sent(page, 'setting_changed')).toEqual([{ setting: 'animations', on: false }]);
  });

  test('Rewards introduces itself in the present tense', async ({ page }) => {
    await page.goto('./rewards');
    await expect(page.getByText('Points and streaks for what you get done. They are optional: turn them off any time.')).toBeVisible();
    await expect(page.getByText(/will appear here/i)).toHaveCount(0);
  });
});
