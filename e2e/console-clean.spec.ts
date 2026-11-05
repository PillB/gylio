/**
 * The main screens open with nothing in the browser console: no warnings, no errors. React Native Paper's provider
 * (wrapping an app that used no Paper component) printed "props.pointerEvents is deprecated" on every load, and the
 * dev server logged a failed service worker registration on every page. A new message should be seen and fixed, not
 * scrolled past.
 */
import { expect, test } from '@playwright/test';

const SCREENS = ['tasks', 'calendar', 'budget', 'routines', 'rewards', 'social', 'settings', 'pricing'];

test('the main screens open with no console warnings or errors', async ({ page }) => {
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
  // A cold dev server optimizes its dependencies on the first load and reloads once; that is not the app's output.
  await page.goto('tasks', { waitUntil: 'networkidle' });

  const messages: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') messages.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));

  for (const screen of SCREENS) {
    await page.goto(screen, { waitUntil: 'networkidle' });
    await expect(page.getByRole('main')).toBeVisible();
  }
  expect(messages).toEqual([]);
});
