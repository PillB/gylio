import { expect, test } from '@playwright/test';

test('legacy budget data is not silently reinterpreted as take-home income', async ({ page }) => {
  await page.goto('/gylio/onboarding');
  await page.evaluate(() => {
    localStorage.setItem('gylio_lang', 'en');
    localStorage.setItem('onboardingFlowState', JSON.stringify({
      schemaVersion: 1,
      currentStep: 2,
      isOnboardingComplete: false,
      selections: {
        accessibility: {
          textStyle: 'standard',
          contrast: 'balanced',
          motion: 'standard',
          animations: true,
          tts: false
        },
        quickSetup: {
          starterGoal: 'Keep this task',
          monthlyBudget: '9999'
        },
        tour: {}
      }
    }));
  });

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /start with something useful/i })).toBeVisible();
  await expect(page.getByLabel(/first task.*optional/i)).toHaveValue('Keep this task');
  await expect(page.getByLabel(/monthly take-home income.*optional/i)).toHaveValue('');
});
