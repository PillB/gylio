import { expect, test, type Page } from '@playwright/test';

/** Seed before boot so onboarding cannot overwrite the fixture during hydration. */
async function openLab(page: Page, locale: 'en' | 'es-PE') {
  await page.addInitScript((language) => {
    localStorage.setItem('gylio_lang', language);
    localStorage.setItem('onboardingFlowState', JSON.stringify({
      isOnboardingComplete: true,
      currentStep: 4,
      selections: {
        accessibility: { textStyle: 'normal', contrast: 'default', motion: 'reduced', animations: false, tts: false },
        neurodivergence: { preset: 'none', supports: [] },
        quickSetup: { starterGoal: '', monthlyBudget: '' },
        tour: { acknowledged: true, reminders: false }
      }
    }));
  }, locale);
  await page.goto('./connection-lab', { waitUntil: 'networkidle' });
}

test('English: conversation exercise works in Chromium and analytics excludes selected text', async ({ page }) => {
  const errors: string[] = [];
  const failedAssets: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    if (request.url().includes('/gylio/assets/')) failedAssets.push(request.url());
  });

  await openLab(page, 'en');
  await expect(page.getByRole('heading', { name: 'Connection Lab' })).toBeVisible();
  await page.getByRole('button', { name: /Approach and start/ }).click();
  await expect(page.getByText(/At a community event/)).toBeVisible();
  await page.getByRole('button', { name: /Have you tried any of these activities/ }).click();
  await expect(page.getByText(/One possible reaction/)).toBeVisible();
  await expect(page.getByText(/respects the other person's agency/)).toBeVisible();
  await page.getByRole('button', { name: 'Next scene' }).click();
  await page.getByRole('button', { name: 'Skip without penalty' }).click();
  await expect(page.getByRole('heading', { name: 'Practice finished' })).toBeVisible();

  const events = await page.evaluate(() => JSON.parse(localStorage.getItem('analytics:queue') ?? '[]'));
  const choice = events.find((event: { name: string }) => event.name === 'connection_lab_choice');
  expect(choice.props).toEqual({ lesson: 'approach', turn: 0 });
  expect(JSON.stringify(choice)).not.toContain('Have you tried');
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);

  // The lesson does not leak into a future session, by design.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Choose a skill to practice' })).toBeVisible();
});

test('Peruvian Spanish: mobile scene, timebox controls and consent feedback are usable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openLab(page, 'es-PE');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-PE');
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await page.getByRole('button', { name: /Expresar interés con respeto/ }).click();
  await expect(page.getByText(/Después de una clase de arte/)).toBeVisible();

  await page.getByRole('button', { name: '25 min' }).click();
  await expect(page.getByRole('button', { name: '25 min' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /me debes una cita/ }).click();
  await expect(page.getByText(/podría generar presión/)).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente escena' }).click();
  await page.getByRole('button', { name: 'Omitir sin penalización' }).click();
  await expect(page.getByRole('heading', { name: 'Práctica terminada' })).toBeVisible();

  // The new module should not force sideways scrolling on a narrow phone.
  const width = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.page).toBeLessThanOrEqual(width.viewport + 1);
  expect(errors).toEqual([]);
});
