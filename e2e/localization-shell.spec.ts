import { expect, test, type Page } from '@playwright/test';

async function seedCompletedOnboarding(page: Page) {
  await page.goto('.');
  await page.evaluate(() => {
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
  });
}

test('app shell localizes visible and accessible strings with the selected locale', async ({ page }) => {
  await seedCompletedOnboarding(page);
  await page.goto('settings', { waitUntil: 'networkidle' });

  const language = page.getByRole('combobox', { name: 'Select language' }).first();
  await language.selectOption('es-PE');

  await expect(page.locator('html')).toHaveAttribute('lang', 'es-PE');
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await expect(page.locator('footer[aria-label="Recursos del producto"]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Academia de despliegue a producción' })).toBeVisible();
  await expect(page.getByText('Recursos de GYLIO')).toBeVisible();

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-PE');
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();

  await page.getByRole('combobox', { name: 'Seleccionar idioma' }).first().selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await expect(page.locator('footer[aria-label="Product resources"]')).toBeVisible();
});
