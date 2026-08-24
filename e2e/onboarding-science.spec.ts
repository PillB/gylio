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

async function seedCompletedOnboarding(page: Page) {
  await page.goto('/gylio/');
  await page.evaluate(() => {
    localStorage.setItem('gylio_lang', 'en');
    localStorage.setItem('onboardingFlowState', JSON.stringify({
      schemaVersion: 3,
      currentStep: 3,
      isOnboardingComplete: true,
      selections: {
        accessibility: {
          textStyle: 'standard',
          contrast: 'balanced',
          motion: 'system',
          animations: true,
          tts: false
        },
        supportProfile: { profile: 'keep' },
        quickSetup: { starterGoal: '', monthlyIncome: '' },
        tour: {}
      }
    }));
  });
  // Force the provider tree to hydrate from the seeded state before the test
  // navigates to a protected app route. This also makes retries independent of
  // the page state left by a previous failed assertion.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/gylio\/tasks$/);
}

test.describe('evidence-calibrated onboarding', () => {
  test('uses preference-based accessibility choices with safe defaults', async ({ page }) => {
    await startFreshOnboarding(page);

    await expect(page.getByRole('heading', { name: /make gylio comfortable to use/i })).toBeVisible();
    await expect(page.getByText(/preferences, not medical recommendations/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /standard text/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /follow my device/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /larger text/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /more spacing/i })).toBeVisible();
    await expect(page.getByText(/opendyslexic/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  test('offers optional evidence-informed starter profiles without diagnosis labels', async ({ page }) => {
    await startFreshOnboarding(page);
    await page.getByRole('button', { name: /next/i }).click();

    await expect(page.getByRole('heading', { name: /try a starter support profile/i })).toBeVisible();
    await expect(page.getByText(/optional experiment/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /focus-friendly/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /quiet motion/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /reading support/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /high visibility/i })).toBeVisible();
    await expect(page.getByText(/ADHD|Autism \/ ASD|Anxiety/i)).toHaveCount(0);
    await expect(page.getByText('Dyslexia', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /keep my current choices/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  test('starter profiles are reversible suggestions rather than prescriptions', async ({ page }) => {
    await startFreshOnboarding(page);
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /reading support/i }).click();
    await expect(page.getByText(/settings applied.*change them anytime/i)).toBeVisible();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByRole('button', { name: /larger text/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('checkbox', { name: /read text aloud/i })).toBeChecked();
  });

  test('keeps starter task and income optional and explains their effects', async ({ page }) => {
    await startFreshOnboarding(page);
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /keep my current choices/i }).click();
    await page.getByRole('button', { name: /next/i }).click();

    await expect(page.getByLabel(/first task.*optional/i)).toBeVisible();
    await expect(page.getByLabel(/monthly take-home income.*optional/i)).toBeVisible();
    await expect(page.getByText(/will not invent spending categories/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  test('does not collect a reminder preference or require acknowledgement', async ({ page }) => {
    await startFreshOnboarding(page);
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /keep my current choices/i }).click();
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /next/i }).click();

    await expect(page.getByRole('heading', { name: /know where things are/i })).toBeVisible();
    await expect(page.getByText(/reminder/i)).toHaveCount(0);
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /finish/i })).toBeEnabled();
  });

  test('Settings exposes the same reversible reading and motion choices', async ({ page }) => {
    await seedCompletedOnboarding(page);
    await page.goto('/gylio/settings', { waitUntil: 'networkidle' });

    const readingStyle = page.getByRole('combobox', { name: /reading style/i });
    await expect(readingStyle).toBeVisible();
    const readingOptions = await readingStyle.locator('option').allTextContents();
    expect(readingOptions).toEqual([
      'Standard text',
      'Larger text',
      'More spacing'
    ]);
    expect(readingOptions.join(' ')).not.toMatch(/dyslex/i);

    const motion = page.getByRole('combobox', { name: /motion preference/i });
    await expect(motion).toBeVisible();
    await expect(motion.locator('option')).toHaveText([
      'Follow my device',
      'Reduce non-essential motion',
      'Allow non-essential motion'
    ]);

    await page.setViewportSize({ width: 320, height: 568 });
    const geometry = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  });

  test('localizes the evidence-calibrated onboarding in Peruvian Spanish', async ({ page }) => {
    await startFreshOnboarding(page);

    const language = page.getByRole('combobox', { name: /select language/i }).first();
    await language.selectOption('es-PE');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-PE');
    await expect(page.getByRole('heading', { name: /haz que gylio sea cómodo de usar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /seguir la configuración de mi dispositivo/i })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(page.getByRole('heading', { name: /prueba un perfil inicial de apoyo/i })).toBeVisible();
    await page.getByRole('button', { name: /mantener mis opciones actuales/i }).click();
    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(page.getByLabel(/primera tarea.*opcional/i)).toBeVisible();
    await expect(page.getByLabel(/ingreso mensual neto.*opcional/i)).toBeVisible();
  });
});