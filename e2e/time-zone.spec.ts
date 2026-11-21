import { expect, test } from '@playwright/test';

// A person in Lima (UTC-5) uses the app on Friday evening. At 20:30 the UTC day is already Saturday, which used to
// make "today" tomorrow: a dismissed welcome-back card came back, and the stored "last seen" day was wrong.
test.use({ timezoneId: 'America/Lima', locale: 'en-US' });

const seed = () => {
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
  // Only on the first visit: a reload must see what the app itself stored.
  if (!localStorage.getItem('gylio:lastActiveDate')) localStorage.setItem('gylio:lastActiveDate', '2026-11-10');
};

test('a dismissed welcome-back card stays dismissed through the evening, and the stored day is the local one', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-20T23:00:00Z') }); // Fri 18:00 in Lima
  await page.addInitScript(seed);
  await page.goto('./tasks');

  const card = page.getByRole('complementary', { name: 'Welcome back message' });
  await expect(card, 'the card should show after a ten-day gap').toBeVisible();
  await card.getByRole('button', { name: 'Pick up where you left off' }).click();
  await expect(card).toBeHidden();

  // Two and a half hours later it is Saturday in UTC and still Friday in Lima.
  await page.clock.setSystemTime(new Date('2026-11-21T01:30:00Z'));
  await page.reload();
  await page.waitForLoadState('networkidle');

  await expect(card, 'dismissed at 18:00, so still dismissed at 20:30 the same local day').toBeHidden();
  const stored = await page.evaluate(() => ({
    lastActive: localStorage.getItem('gylio:lastActiveDate'),
    dismissed: localStorage.getItem('gylio:welcomeBackDismissed'),
  }));
  expect(stored, `stored days after the evening visit: ${JSON.stringify(stored)}`).toMatchObject({ lastActive: '2026-11-20' });
});
