/**
 * A routine card on a phone. At 320px the title column took no room of its own, so the Edit and Delete buttons
 * squeezed the title to one letter a line, and the "Due today" badge (an inline span) broke into pieces, each with its
 * own rounded background. The buttons now wrap below the title, and the badge stays one pill.
 */
import { test, expect, type Page } from '@playwright/test';
import { openSeedPage } from './helpers/seedPage';

async function openRoutinesOnSmallPhone(page: Page) {
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
}

test('the title keeps its width and the due badge stays one pill at 320px', async ({ page }) => {
  await openRoutinesOnSmallPhone(page);
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

// The order of steps was a graph canvas that drew off-centre when its section opened: one box half off the left edge
// and the rest missing. It is an ordered list now, and every step has to be readable inside the card.
test('the order of steps opens as a list with every step inside the card at 320px', async ({ page }) => {
  await openRoutinesOnSmallPhone(page);
  await page.getByLabel(/^Routine name/).fill('Morning start');
  await page.getByLabel(/^Stack onto a habit/).fill('After coffee');
  for (const [index, label] of ['Drink water', 'Take meds', 'Open planner'].entries()) {
    await page.getByPlaceholder(`Step ${index + 1}`).fill(label);
  }
  await page.getByRole('button', { name: 'Add routine', exact: true }).click();

  const order = page.locator('details', { hasText: 'See the order of steps' });
  await order.locator('summary').click();
  const steps = page.getByRole('list', { name: 'Morning start: steps in order' }).getByRole('listitem');
  await expect(steps).toHaveText([/After coffee/, /Drink water/, /Take meds/, /Open planner/]);
  const card = (await order.boundingBox())!;
  for (const step of await steps.all()) {
    const box = (await step.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(card.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(card.x + card.width + 1);
    expect(box.width).toBeGreaterThan(150);
  }
  // Nothing inside takes keyboard focus: the checklist below is where steps are ticked.
  expect(await order.locator('a, button, input, [tabindex]').count()).toBe(0);
});
