import { expect, test, type Page } from '@playwright/test';
import { openSeedPage } from './helpers/seedPage';

async function seedCompletedOnboarding(page: Page) {
  // Seed from a blank page, like the other specs. Loading the app to seed let
  // its onboarding provider persist its own state over the fixture.
  await openSeedPage(page);
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
  // The internal deployment guide and its footer link are gone from the public site, in every language.
  await expect(page.locator('a[href*="deployment-guide"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /despliegue/i })).toHaveCount(0);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-PE');
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();

  await page.getByRole('combobox', { name: 'Seleccionar idioma' }).first().selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: /deployment/i })).toHaveCount(0);
});
