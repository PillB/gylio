import { test, expect, type Page } from '@playwright/test';

async function seedCompletedOnboarding(page: Page) {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.setItem(
      'onboardingFlowState',
      JSON.stringify({
        isOnboardingComplete: true,
        currentStep: 4,
        selections: {
          accessibility: {
            textStyle: 'normal',
            contrast: 'default',
            motion: 'reduced',
            animations: false,
            tts: false,
          },
          neurodivergence: { preset: 'none', supports: [] },
          quickSetup: { starterGoal: '', monthlyBudget: '' },
          tour: { acknowledged: true, reminders: false },
        },
      })
    );
  });
}

async function assertNoDocumentOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
  }));

  expect(
    geometry.scrollWidth,
    `Document overflows horizontally: ${JSON.stringify(geometry)}`
  ).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect(
    geometry.bodyScrollWidth,
    `Body overflows horizontally: ${JSON.stringify(geometry)}`
  ).toBeLessThanOrEqual(geometry.innerWidth + 1);
}

async function assertNoZeroSizedVisibleControls(page: Page) {
  const brokenControls = await page.evaluate(() => {
    const selector = 'button, a[href], input, select, textarea, [role="button"]';
    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const visible =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity || '1') > 0 &&
          rect.width > 0 &&
          rect.height > 0;
        return visible && (rect.width < 2 || rect.height < 2);
      })
      .map((element) => ({
        tag: element.tagName,
        text: element.textContent?.trim().slice(0, 80) || '',
        aria: element.getAttribute('aria-label') || '',
      }));
  });

  expect(brokenControls).toEqual([]);
}

const routes = ['/tasks', '/calendar', '/budget', '/settings'];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

for (const viewport of viewports) {
  test.describe(`layout integrity — ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of routes) {
      test(`${route} has no accidental horizontal overflow or collapsed controls`, async ({ page }) => {
        await seedCompletedOnboarding(page);
        await page.goto(`.${route}`);
        await page.waitForLoadState('networkidle');

        await assertNoDocumentOverflow(page);
        await assertNoZeroSizedVisibleControls(page);
      });
    }
  });
}
