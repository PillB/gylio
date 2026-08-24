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
      schemaVersion: 4,
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
        quickSetup: { starterGoal: '', monthlyIncome: '' },
        tour: {}
      }
    }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/gylio\/tasks$/);
}

async function expectNoHorizontalOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
}

test.describe('evidence-calibrated onboarding', () => {
  test('uses direct preference choices, safe defaults, and only three necessary steps', async ({ page }) => {
    await startFreshOnboarding(page);

    await expect(page.getByText(/step 1 of 3/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /make gylio comfortable to use/i })).toBeVisible();
    await expect(page.getByText(/preferences, not medical recommendations/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /standard text/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /follow my device/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /larger text/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /more spacing/i })).toBeVisible();
    await expect(page.getByText(/opendyslexic/i)).toHaveCount(0);
    await expect(page.getByText(/ADHD|Autism \/ ASD|Anxiety/i)).toHaveCount(0);
    await expect(page.getByText('Dyslexia', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  test('goes directly from interface preferences to optional starter data', async ({ page }) => {
    await startFreshOnboarding(page);
    await page.getByRole('button', { name: /next/i }).click();

    await expect(page.getByText(/step 2 of 3/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /start with something useful/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /starter support profile/i })).toHaveCount(0);
    await expect(page.getByText(/focus-friendly|quiet motion|reading support|high visibility/i)).toHaveCount(0);
    await expect(page.getByLabel(/first task.*optional/i)).toBeVisible();
    await expect(page.getByLabel(/monthly take-home income.*optional/i)).toBeVisible();
    await expect(page.getByText(/will not invent spending categories/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  test('reading, contrast and device-motion choices change behavior and are reversible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await startFreshOnboarding(page);

    await expect.poll(() => page.evaluate(() => localStorage.getItem('accessibility:reduceMotion'))).toBe('true');

    await page.getByRole('button', { name: /allow non-essential motion/i }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('accessibility:reduceMotion'))).toBe('false');
    await page.getByRole('button', { name: /follow my device/i }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('accessibility:reduceMotion'))).toBe('true');

    await page.getByRole('button', { name: /more spacing/i }).click();
    let readingStyles = await page.evaluate(() => ({
      lineHeight: document.body.style.lineHeight,
      letterSpacing: document.body.style.letterSpacing,
      wordSpacing: document.body.style.wordSpacing
    }));
    expect(readingStyles).toEqual({ lineHeight: '1.65', letterSpacing: '0.025em', wordSpacing: '0.08em' });

    await page.getByRole('button', { name: /standard text/i }).click();
    readingStyles = await page.evaluate(() => ({
      lineHeight: document.body.style.lineHeight,
      letterSpacing: document.body.style.letterSpacing,
      wordSpacing: document.body.style.wordSpacing
    }));
    expect(readingStyles).toEqual({ lineHeight: '', letterSpacing: '', wordSpacing: '' });

    await page.getByRole('button', { name: /higher contrast/i }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('theme-mode'))).toBe('highContrast');
    await page.getByRole('button', { name: /use app theme/i }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('theme-mode'))).not.toBe('highContrast');
  });

  test('keeps starter task and income optional and validates only entered income', async ({ page }) => {
    await startFreshOnboarding(page);
    await page.getByRole('button', { name: /next/i }).click();

    const income = page.getByLabel(/monthly take-home income.*optional/i);
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
    await income.fill('-1');
    await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
    await expect(page.getByText(/non-negative income/i)).toBeVisible();
    await income.fill('3500');
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  test('finishes with orientation only, without reminder or acknowledgement collection', async ({ page }) => {
    await startFreshOnboarding(page);
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /next/i }).click();

    await expect(page.getByText(/step 3 of 3/i)).toBeVisible();
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
    expect(readingOptions).toEqual(['Standard text', 'Larger text', 'More spacing']);
    expect(readingOptions.join(' ')).not.toMatch(/dyslex/i);

    const motion = page.getByRole('combobox', { name: /motion preference/i });
    await expect(motion).toBeVisible();
    await expect(motion.locator('option')).toHaveText([
      'Follow my device',
      'Reduce non-essential motion',
      'Allow non-essential motion'
    ]);
  });

  test('all onboarding screens fit 320px and 390px viewports without page overflow', async ({ page }) => {
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await startFreshOnboarding(page);
      await expectNoHorizontalOverflow(page);
      await page.getByRole('button', { name: /next/i }).click();
      await expectNoHorizontalOverflow(page);
      await page.getByRole('button', { name: /next/i }).click();
      await expectNoHorizontalOverflow(page);
    }
  });

  test('localizes the minimal evidence-calibrated flow in Peruvian Spanish', async ({ page }) => {
    await startFreshOnboarding(page);

    const language = page.getByRole('combobox', { name: /select language/i }).first();
    await language.selectOption('es-PE');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-PE');
    await expect(page.getByText(/paso 1 de 3/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /haz que gylio sea cómodo de usar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /seguir la configuración de mi dispositivo/i })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(page.getByText(/paso 2 de 3/i)).toBeVisible();
    await expect(page.getByLabel(/primera tarea.*opcional/i)).toBeVisible();
    await expect(page.getByLabel(/ingreso mensual neto.*opcional/i)).toBeVisible();
    await expect(page.getByText(/perfil inicial de apoyo|favorecer el enfoque|apoyo para la lectura/i)).toHaveCount(0);

    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(page.getByText(/paso 3 de 3/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /conoce dónde está cada cosa/i })).toBeVisible();
  });
});
