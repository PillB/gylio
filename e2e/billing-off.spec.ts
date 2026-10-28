/**
 * A build where Pro can't be bought yet (VITE_BILLING_ENABLED off, as on the Cloudflare site): the pricing page shows
 * the planned plans and prices with nothing to buy, and no screen offers a trial or a price that isn't real.
 */
import { test, expect, type Page } from '@playwright/test';

test.skip(process.env.VITE_BILLING_ENABLED === 'true', 'This build sells Pro.');

async function seed(page: Page, lang: 'en' | 'es-PE') {
  await page.addInitScript((language) => {
    localStorage.setItem('gylio_lang', language);
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
  }, lang);
}

test('the pricing page shows planned prices, says Pro is not on sale, and has nothing to buy', async ({ page }) => {
  await seed(page, 'en');
  await page.goto('./pricing');
  const main = page.getByRole('main', { name: 'Simple, honest pricing' });
  await expect(main).toContainText("Pro isn't on sale yet: these are the plans and prices we intend to offer, and they may change.");
  await expect(main.getByText('Not on sale yet')).toBeVisible();
  await expect(main.getByRole('button')).toHaveCount(0);
  await expect(main).not.toContainText(/free trial|Cancel anytime|\$12/);
  await expect(page.getByRole('region', { name: 'Free' })).toContainText('Up to');
  const viewed = await page.evaluate(() =>
    (JSON.parse(localStorage.getItem('analytics:queue') ?? '[]') as { name: string; props?: Record<string, unknown> }[])
      .filter((event) => event.name === 'paywall_viewed').map((event) => event.props?.selling));
  expect(viewed).toEqual([false]);
});

test('in Spanish too, with no price in dollars hard-coded anywhere on the Social prompt', async ({ page }) => {
  await seed(page, 'es-PE');
  await page.goto('./social');
  const gate = page.getByRole('region', { name: 'Una función de Pro' });
  await expect(gate).toContainText('que todavía no está a la venta');
  await expect(gate.getByRole('button')).toHaveCount(0);
  await expect(gate).not.toContainText(/\$|prueba/);
});
