import { test, expect, type Page } from '@playwright/test';
import { expectPremiumScreen, premiumNeedsDevServer, unlockPremium } from './helpers/premium';

type AuditLocale = 'en' | 'es-PE';

async function seedCompletedOnboarding(page: Page, locale: AuditLocale) {
  // Seed browser state before the application scripts execute. Writing storage
  // after the provider has hydrated creates a race where its initial state can
  // overwrite the fixture and redirect the test back to onboarding.
  await page.addInitScript((selectedLocale) => {
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

async function assertDocumentLanguage(page: Page, locale: AuditLocale) {
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
}

async function assertNoDocumentOverflow(page: Page) {
  // Measure only after web fonts settle. Widths depend on the loaded face, so
  // measuring during a fallback font let local runs pass what CI (Inter) fails.
  await page.evaluate(() => document.fonts.ready);
  const audit = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const geometry = {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      innerWidth: viewportWidth,
    };

    const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .flatMap((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) {
          return [];
        }

        const leftOverflow = Math.max(0, -rect.left);
        const rightOverflow = Math.max(0, rect.right - viewportWidth);
        const overflow = Math.max(leftOverflow, rightOverflow);
        if (overflow <= 1) return [];

        return [{
          tag: element.tagName,
          id: element.id,
          className: typeof element.className === 'string' ? element.className.slice(0, 120) : '',
          text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) || '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          overflow: Math.round(overflow),
        }];
      })
      .sort((a, b) => b.overflow - a.overflow)
      .slice(0, 12);

    return { geometry, offenders };
  });

  const diagnostic = JSON.stringify(audit);
  expect(
    audit.geometry.scrollWidth,
    `Document overflows horizontally: ${diagnostic}`
  ).toBeLessThanOrEqual(audit.geometry.clientWidth + 1);
  expect(
    audit.geometry.bodyScrollWidth,
    `Body overflows horizontally: ${diagnostic}`
  ).toBeLessThanOrEqual(audit.geometry.innerWidth + 1);
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

/**
 * Form controls must stay inside the card (section) that holds them, anywhere on the page. The
 * viewport check above only looks at the first screenful and only at the page edge, so inputs that
 * ran past their card's border at 320px (Calendar's add-event form) were never caught.
 */
async function assertFieldsStayInsideTheirCard(page: Page) {
  const escaped = await page.evaluate(() => {
    const scrolls = (element: Element | null): boolean => {
      for (let node = element; node && node !== document.body; node = node.parentElement) {
        const overflowX = window.getComputedStyle(node).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') return true;
      }
      return false;
    };
    return Array.from(document.querySelectorAll<HTMLElement>('input, select, textarea, button'))
      .flatMap((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 1 || rect.height <= 1) return [];
        const card = element.closest('section');
        if (!card || scrolls(element.parentElement)) return [];
        const box = card.getBoundingClientRect();
        if (rect.left >= box.left - 1 && rect.right <= box.right + 1) return [];
        return [{
          tag: element.tagName,
          label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 40) || '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          cardLeft: Math.round(box.left),
          cardRight: Math.round(box.right),
        }];
      });
  });
  expect(escaped, 'Form controls run past the edge of their card').toEqual([]);
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

          await assertDocumentLanguage(page, locale);
          await assertNoDocumentOverflow(page);
          await assertVisibleControlsHaveGeometry(page);
          await assertControlsStayInsideHorizontalViewport(page);
          await assertFieldsStayInsideTheirCard(page);

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

// The routes above show the upgrade prompt to a free user, so the premium editors themselves were never
// measured (Social overflowed a 320px phone unnoticed). These open the real screens.
const premiumRoutes = ['/social', '/routines', '/rewards'];

for (const locale of locales) {
  for (const viewport of viewports) {
    test.describe(`layout integrity — premium — ${locale} — ${viewport.name}`, () => {
      test.skip(premiumNeedsDevServer, 'Unlocking premium needs the dev server.');
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      for (const route of premiumRoutes) {
        test(`${route} stays inside the viewport`, async ({ page }) => {
          await seedCompletedOnboarding(page, locale);
          await unlockPremium(page);
          await page.goto(`.${route}`);
          await page.waitForLoadState('networkidle');
          await expectPremiumScreen(page);

          await assertNoDocumentOverflow(page);
          await assertVisibleControlsHaveGeometry(page);
          await assertControlsStayInsideHorizontalViewport(page);
          await assertFieldsStayInsideTheirCard(page);
        });
      }
    });
  }
}

// Panels that only appear after a tap were never measured: the routine template gallery had a 320px
// minimum column and the financial check-up a 200px one, both wider than a phone's card.
const panels: { route: string; premium: boolean; open: RegExp[] }[] = [
  { route: '/budget', premium: false, open: [/^(run financial health check|diagnóstico de salud financiera)$/i] },
  { route: '/tasks', premium: false, open: [/^(add details|agregar detalles)$/i, /^(start with a template|empezar con una plantilla)$/i] },
  { route: '/routines', premium: true, open: [/(browse routine templates|ver plantillas de rutinas)/i] },
  { route: '/social', premium: true, open: [/^🤝 (friend|amigo\/a)$/i] },
];

test.describe('layout integrity — opened panels — small-mobile', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  for (const locale of locales) {
    for (const panel of panels) {
      test(`${locale}: ${panel.route} with its panel open stays inside the viewport`, async ({ page }) => {
        test.skip(panel.premium && premiumNeedsDevServer, 'Unlocking premium needs the dev server.');
        await seedCompletedOnboarding(page, locale);
        if (panel.premium) await unlockPremium(page);
        await page.goto(`.${panel.route}`);
        await page.waitForLoadState('networkidle');
        for (const name of panel.open) {
          const toggle = page.getByRole('button', { name }).first();
          if (await toggle.count()) await toggle.click();
        }
        await page.waitForTimeout(300);

        await assertNoDocumentOverflow(page);
        await assertControlsStayInsideHorizontalViewport(page);
        await assertFieldsStayInsideTheirCard(page);
      });
    }
  }
});

test.describe('layout integrity — task edit form — small-mobile', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  for (const locale of locales) {
    test(`${locale}: editing a task stays inside the viewport`, async ({ page }) => {
      await seedCompletedOnboarding(page, locale);
      await page.goto('./tasks');
      await page.waitForLoadState('networkidle');

      const title = 'Reply to the project email';
      await page.locator('#new-task').fill(title);
      await page.locator('#new-task').press('Enter');
      await expect(page.getByText(title, { exact: true })).toBeVisible();

      await page.getByRole('button', { name: `${locale === 'en' ? 'Edit' : 'Editar'} ${title}`, exact: true }).click();
      await expect(page.locator('input[id^="edit-title-"]')).toBeVisible();

      await assertNoDocumentOverflow(page);
      await assertControlsStayInsideHorizontalViewport(page);
      await assertFieldsStayInsideTheirCard(page);
    });

    test(`${locale}: the add-event form stays inside its card`, async ({ page }) => {
      await seedCompletedOnboarding(page, locale);
      await page.goto('./calendar');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /add event|agregar evento/i }).click();
      await expect(page.getByRole('button', { name: /save event|guardar evento/i })).toBeVisible();

      await assertNoDocumentOverflow(page);
      await assertFieldsStayInsideTheirCard(page);
    });
  }
});
