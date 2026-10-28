/**
 * Budget deep-flow e2e — the zero-based money loop with real input events.
 * Runs with Clerk disabled (VITE_CLERK_PUBLISHABLE_KEY unset).
 *
 * Flow: add income → quick-start categories → log a transaction →
 * planned-vs-actual and Remaining must react.
 *
 * Regression context: a browser-automation session could not confirm the
 * "Add transaction" path, so this spec drives it with real Playwright input.
 * If it fails here, the app has a real defect; if it passes, the earlier
 * symptom was an automation artifact.
 */
import { test, expect, type Page } from '@playwright/test';

const seededPages = new WeakSet<Page>();
async function bypassOnboarding(page: Page) {
  if (seededPages.has(page)) return;
  seededPages.add(page);
  await page.addInitScript(() => {
    const now = new Date();
    const localDateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
    localStorage.setItem('gylio:lastActiveDate', localDateKey);
  });
}

async function gotoPage(page: Page, route: string) {
  await bypassOnboarding(page);
  await page.goto(`.${route}`);
  // networkidle never settles on a Clerk-enabled build (background polling);
  // domcontentloaded plus the settled-UI wait below matches the app's needs.
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
}

test('budget: income → suggested categories → transaction updates actuals', async ({ page }) => {
  await gotoPage(page, '/budget');
  // Help text sits in the page as hidden tooltips (read with each field), so only visible matches count.

  // ── 1. Add income ────────────────────────────────────────────────────────
  // Fields are found by their spoken names: each label points at its input, with the help button beside it.
  await page.getByLabel(/^income source/i).first().fill('Salary');
  await page.getByLabel(/^amount/i).first().fill('3000');
  await page.getByRole('button', { name: /add income/i }).click();
  await expect(page.locator('main').getByText('Salary', { exact: false }).filter({ visible: true }).first()).toBeVisible();

  // ── 2. Quick-start the 8 suggested categories ───────────────────────────
  await page.getByRole('button', { name: /quick-start with 8/i }).click();
  await expect(page.getByText('Food & Groceries').filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('Housing').filter({ visible: true }).first()).toBeVisible();

  // Remaining starts at income minus the suggested planned totals (1150.00).
  await expect(page.locator('main').getByText(/1,?150\.00/).filter({ visible: true }).first()).toBeVisible();

  // ── 3. Log a transaction against Food & Groceries ───────────────────────
  await page.getByLabel(/^amount/i).nth(1).fill('85.50');
  // The transaction category select is the one holding the "Select category" placeholder.
  const categorySelect = page.locator('select').filter({ hasText: 'Select category' });
  await categorySelect.selectOption({ label: 'Food & Groceries' });
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  await page.getByLabel(/^date/i).first().fill(iso);
  await page.getByRole('button', { name: /add transaction/i }).click();

  // ── 4. The actual spend must appear on the Food & Groceries row ─────────
  await expect(page.getByText(/85\.50\s*\/\s*300\.00/).filter({ visible: true }).first()).toBeVisible({ timeout: 5000 });

  // Remaining is a PLANNING number (income − planned): logging actual spend
  // must NOT change it. It stays at 1150.00.
  await expect(page.locator('main').getByText(/1,?150\.00/).filter({ visible: true }).first()).toBeVisible({ timeout: 5000 });
});

test('budget: debt simulator shows snowball vs avalanche payoff comparison', async ({ page }) => {
  await gotoPage(page, '/budget');

  // ── 1. Add two debts with different balances and rates ──────────────────
  // Debt payoff is an optional section that starts closed until a debt exists.
  const debtDisclosure = page.locator('details').filter({ has: page.locator('summary', { hasText: /debt payoff/i }) });
  if (!(await debtDisclosure.getAttribute('open').then((v) => v !== null))) {
    await debtDisclosure.locator('summary').click();
  }
  const addDebt = async (name: string, balance: string, rate: string, min: string) => {
    // The debt form is the last form on the page: name, balance, rate, minimum payment.
    await page.getByLabel(/^title/i).last().fill(name);
    await page.getByLabel(/^balance/i).last().fill(balance);
    await page.getByLabel(/annual rate/i).last().fill(rate);
    await page.getByLabel(/minimum/i).last().fill(min);
    await page.getByRole('button', { name: /add debt/i }).click();
    await expect(page.locator('main').getByText(name, { exact: false }).filter({ visible: true }).first()).toBeVisible();
  };

  await addDebt('Credit card', '1000', '24', '50');
  await addDebt('Store card', '500', '12', '25');

  // ── 2. The simulator must show both strategies with month estimates ─────
  await expect(page.getByText(/snowball/i).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(/avalanche/i).filter({ visible: true }).first()).toBeVisible();
  await expect(page.locator('main').getByText(/pa(?:yoff|id) off|months/i).filter({ visible: true }).first()).toBeVisible();
});
