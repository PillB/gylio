import { expect, test, type Page } from '@playwright/test';

const accessibility = {
  textStyle: 'large',
  contrast: 'high',
  motion: 'reduced',
  animations: false,
  tts: true
};

/**
 * Seed persisted onboarding state before the React onboarding provider mounts.
 *
 * The previous helper opened /onboarding first and then wrote localStorage.
 * That created a real race: the already-mounted provider could persist its
 * current state between our localStorage write and reload, nondeterministically
 * replacing the migration fixture. A same-origin standalone HTML page gives us
 * storage access without mounting any GYLIO state providers.
 */
async function seedState(page: Page, state: Record<string, unknown>) {
  await page.goto('/gylio/deployment-guide.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate((payload) => {
    localStorage.setItem('gylio_lang', 'en');
    localStorage.setItem('onboardingFlowState', JSON.stringify(payload));
  }, state);
  await page.goto('/gylio/onboarding', { waitUntil: 'networkidle' });
}

test('legacy budget and income setup are not carried into the minimized onboarding flow', async ({ page }) => {
  await seedState(page, {
    schemaVersion: 1,
    currentStep: 2,
    isOnboardingComplete: false,
    selections: {
      accessibility,
      quickSetup: {
        starterGoal: 'Keep this task',
        monthlyBudget: '9999',
        monthlyIncome: '4200'
      },
      tour: {}
    }
  });

  await expect(page.getByRole('heading', { name: /start with something useful/i })).toBeVisible();
  await expect(page.getByLabel(/first task.*optional/i)).toHaveValue('Keep this task');
  await expect(page.getByLabel(/monthly take-home income/i)).toHaveCount(0);

  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('onboardingFlowState') || '{}'));
  expect(persisted.schemaVersion).toBe(5);
  expect(persisted.selections.quickSetup).toEqual({ starterGoal: 'Keep this task' });
});

test('schema v3 support-profile position migrates directly to quick setup and preserves applied accessibility settings', async ({ page }) => {
  await seedState(page, {
    schemaVersion: 3,
    currentStep: 1,
    isOnboardingComplete: false,
    selections: {
      accessibility,
      supportProfile: { profile: 'visibility' },
      quickSetup: { starterGoal: 'Preserved task', monthlyIncome: '4200' },
      tour: {}
    }
  });

  await expect(page.getByText(/step 2 of 3/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /start with something useful/i })).toBeVisible();
  await expect(page.getByLabel(/first task.*optional/i)).toHaveValue('Preserved task');
  await expect(page.getByLabel(/monthly take-home income/i)).toHaveCount(0);

  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('onboardingFlowState') || '{}'));
  expect(persisted.schemaVersion).toBe(5);
  expect(persisted.currentStep).toBe(1);
  expect(persisted.selections.supportProfile).toBeUndefined();
  expect(persisted.selections.accessibility).toMatchObject(accessibility);
  expect(persisted.selections.quickSetup).toEqual({ starterGoal: 'Preserved task' });
});

test('schema v3 quick-setup and tour positions map to the equivalent three-step screens', async ({ page }) => {
  await seedState(page, {
    schemaVersion: 3,
    currentStep: 2,
    isOnboardingComplete: false,
    selections: {
      accessibility,
      supportProfile: { profile: 'keep' },
      quickSetup: { starterGoal: 'Task', monthlyIncome: '' },
      tour: {}
    }
  });
  await expect(page.getByText(/step 2 of 3/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /start with something useful/i })).toBeVisible();

  await seedState(page, {
    schemaVersion: 3,
    currentStep: 3,
    isOnboardingComplete: false,
    selections: {
      accessibility,
      supportProfile: { profile: 'keep' },
      quickSetup: { starterGoal: '', monthlyIncome: '' },
      tour: {}
    }
  });
  await expect(page.getByText(/step 3 of 3/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /know where things are/i })).toBeVisible();
});
