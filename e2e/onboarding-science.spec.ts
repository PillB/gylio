import { expect, test, type Page } from '@playwright/test';

async function startFreshOnboarding(page: Page) {
  await page.goto('/gylio/onboarding');
  await page.evaluate(() => {
    localStorage.removeItem('onboardingFlowState');
    localStorage.setItem('gylio_lang', 'en');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/gylio\/onboarding$/);
}

test.describe('science-backed onboarding', () => {
  test('uses preference-based accessibility choices with safe defaults', async ({ page }) => {
    await startFreshOnboarding(page);

    await expect(page.getByRole('heading', { name: /make gylio comfortable to use/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /default readable text/i })).toBeChecked();
    await expect(page.getByRole('radio', { name: /follow device motion setting/i })).toBeChecked();
    await expect(page.getByText(/specialized dyslexia fonts.*not.*consistent/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  test('does not prescribe interface settings from diagnosis labels', async ({ page }) => {
    await startFreshOnboarding(page);
    await page.getByRole('button', { name: /next/i }).click();

    await expect(page.getByText(/ADHD|Autism \/ ASD|Anxiety/i)).toHaveCount(0);
    await expect(page.getByText('Dyslexia', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /start with something useful/i })).toBeVisible();
  });

  test('keeps starter task and income optional', async ({ page }) => {
    await startFreshOnboarding(page);
    await page.getByRole('button', { name: /next/i }).click();

    await expect(page.getByLabel(/first task.*optional/i)).toBeVisible();
    await expect(page.getByLabel(/monthly take-home income.*optional/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  test('does not collect a reminder preference that the product does not implement', async ({ page }) => {
    await startFreshOnboarding(page);
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /next/i }).click();

    await expect(page.getByRole('heading', { name: /know where things are/i })).toBeVisible();
    await expect(page.getByText(/reminder/i)).toHaveCount(0);
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /finish/i })).toBeEnabled();
  });

  test('localizes the evidence-based onboarding in Peruvian Spanish', async ({ page }) => {
    await startFreshOnboarding(page);

    const language = page.getByRole('combobox', { name: /select language/i }).first();
    await language.selectOption('es-PE');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-PE');
    await expect(page.getByRole('heading', { name: /haz que gylio sea cómodo de usar/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /seguir la configuración de movimiento del dispositivo/i })).toBeChecked();

    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(page.getByLabel(/primera tarea.*opcional/i)).toBeVisible();
    await expect(page.getByLabel(/ingreso mensual neto.*opcional/i)).toBeVisible();
  });
});
