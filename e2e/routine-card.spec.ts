/**
 * A routine card on a phone. At 320px the title column took no room of its own, so the Edit and Delete buttons
 * squeezed the title to one letter a line, and the "Due today" badge (an inline span) broke into pieces, each with its
 * own rounded background. The buttons now wrap below the title, and the badge stays one pill.
 */
import { test, expect } from '@playwright/test';
import { openSeedPage } from './helpers/seedPage';

test('the title keeps its width and the due badge stays one pill at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await openSeedPage(page);
  await page.evaluate(() => localStorage.setItem('onboardingFlowState', JSON.stringify({
    isOnboardingComplete: true,
    currentStep: 4,
    selections: {
      accessibility: { textStyle: 'normal', contrast: 'default', motion: 'reduced', animations: false, tts: false },
      neurodivergence: { preset: 'none', supports: [] },
      quickSetup: { starterGoal: '', monthlyBudget: '' },
      tour: { acknowledged: true, reminders: false },
    },
  })));
  await page.goto('routines');
  const add = async (name: string) => {
    await page.getByLabel(/^Routine name/).fill(name);
    await page.getByRole('button', { name: 'Add routine', exact: true }).click();
  };

  // At this length the badge lands at the end of the line, where an inline span broke in two.
  await add('Morning meds');
  const badge = page.getByText('Due today', { exact: true });
  await expect(badge).toBeVisible();
  expect(await badge.evaluate((element) => element.getClientRects().length)).toBe(1);

  await add('Evening wind-down and tidy desk');
  const title = page.getByText('Evening wind-down and tidy desk', { exact: true });
  expect((await title.boundingBox())?.width ?? 0).toBeGreaterThan(150);
  await expect(page.getByRole('button', { name: /^Edit/ }).first()).toBeVisible();
});
