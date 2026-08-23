import { test, expect, type Page } from '@playwright/test';

type AuditLocale = 'en' | 'es-PE';

async function seedCompletedOnboarding(page: Page, locale: AuditLocale) {
  await page.goto('./');
  await page.evaluate((selectedLocale) => {
    // Match src/i18n/i18n.js exactly so this test exercises the same explicit
    // user-language path as production rather than a stale detector key.
    localStorage.setItem('gylio_lang', selectedLocale);
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
  }, locale);
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

async function assertVisibleControlsHaveGeometry(page: Page) {
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

async function assertControlsStayInsideHorizontalViewport(page: Page) {
  const clippedControls = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const selector = 'button, a[href], input, select, textarea, [role="button"]';

    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .flatMap((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const visible =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity || '1') > 0 &&
          rect.width > 1 &&
          rect.height > 1;

        if (!visible || rect.bottom < 0 || rect.top > window.innerHeight) return [];
        if (rect.left >= -1 && rect.right <= viewportWidth + 1) return [];

        return [{
          tag: element.tagName,
          text: element.textContent?.trim().slice(0, 80) || '',
          aria: element.getAttribute('aria-label') || '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          viewportWidth,
        }];
      });
  });

  expect(clippedControls, 'Visible controls escape the horizontal viewport').toEqual([]);
}

const routes = [
  '/tasks',
  '/calendar',
  '/budget',
  '/social',
  '/routines',
  '/rewards',
  '/settings',
  '/pricing',
];

const viewports = [
  { name: 'small-mobile', width: 320, height: 568 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const locales: AuditLocale[] = ['en', 'es-PE'];

for (const locale of locales) {
  for (const viewport of viewports) {
    test.describe(`layout integrity — ${locale} — ${viewport.name}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      for (const route of routes) {
        test(`${route} stays inside the viewport`, async ({ page }) => {
          await seedCompletedOnboarding(page, locale);
          await page.goto(`.${route}`);
          await page.waitForLoadState('networkidle');

          await assertNoDocumentOverflow(page);
          await assertVisibleControlsHaveGeometry(page);
          await assertControlsStayInsideHorizontalViewport(page);

          const routeName = route.replace(/^\//, '').replace(/\//g, '-') || 'root';
          await page.screenshot({
            path: `e2e/screenshots/${locale}-${viewport.name}-${routeName}.png`,
            fullPage: true,
          });
        });
      }
    });
  }
}
