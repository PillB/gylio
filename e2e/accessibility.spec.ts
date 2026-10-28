/**
 * Automated accessibility checks on every screen, in each theme and both shipped languages, plus the
 * states that only appear after a tap: open forms, validation errors, the tour picker and Daily mode.
 *
 * axe-core finds what people miss when they look at one screen at a time: contrast that only fails on a
 * tinted card, a second main landmark, a field named by its help button. The name checks below cover what
 * axe does not: a button whose spoken name does not contain its visible text (speech users say what they
 * see), and lists of Edit or Delete buttons that a screen reader cannot tell apart.
 */
import { createRequire } from 'node:module';
import { test, expect, type Page } from '@playwright/test';
import { premiumNeedsDevServer, unlockPremium } from './helpers/premium';

const AXE_SOURCE = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const ROUTES = ['/tasks', '/calendar', '/budget', '/social', '/routines', '/rewards', '/settings', '/pricing'];
const PREMIUM = new Set(['/social', '/routines', '/rewards']);

type Combo = { locale: 'en' | 'es-PE'; theme: 'light' | 'dark' | 'highContrast'; width: number };
const COMBOS: Combo[] = [
  { locale: 'en', theme: 'light', width: 1280 },
  { locale: 'es-PE', theme: 'dark', width: 320 },
  { locale: 'en', theme: 'highContrast', width: 390 },
];

async function seed(page: Page, { locale, theme }: Combo) {
  await page.addInitScript(
    ({ locale: lang, theme: mode }) => {
      localStorage.setItem('gylio_lang', lang);
      localStorage.setItem('theme-mode', mode);
      localStorage.setItem(
        'onboardingFlowState',
        JSON.stringify({
          isOnboardingComplete: true,
          currentStep: 4,
          selections: {
            accessibility: { textStyle: 'normal', contrast: 'default', motion: 'reduced', animations: false, tts: false },
            neurodivergence: { preset: 'none', supports: [] },
            quickSetup: { starterGoal: '', monthlyBudget: '' },
            tour: { acknowledged: true, reminders: false },
          },
        })
      );
    },
    { locale, theme }
  );
}

async function open(page: Page, route: string) {
  await page.goto(`.${route}`);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

/** axe violations as "rule: selector" lines, so a failure names what to fix. */
async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: AXE_SOURCE });
  return page.evaluate(async (tags) => {
    type Result = { violations: { id: string; nodes: { target: string[] }[] }[] };
    const axe = (window as unknown as { axe: { run: (context: Document, options: unknown) => Promise<Result> } }).axe;
    const result = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return result.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`));
  }, WCAG_TAGS);
}

/** Buttons whose aria-label leaves out the words they show (WCAG 2.5.3, label in name). */
async function labelNotInName(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const words = (text: string) =>
      text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^\p{L}\p{N} ]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return Array.from(document.querySelectorAll<HTMLElement>('button[aria-label], a[aria-label], [role=tab][aria-label]')).flatMap((element) => {
      const box = element.getBoundingClientRect();
      const visible = words(element.innerText || '');
      if (!box.width || !box.height || visible.length < 2) return [];
      return words(element.getAttribute('aria-label') ?? '').includes(visible)
        ? []
        : [`"${element.innerText.trim()}" is spoken as "${element.getAttribute('aria-label')}"`];
    });
  });
}

for (const combo of COMBOS) {
  test.describe(`accessibility — ${combo.locale}, ${combo.theme}, ${combo.width}px`, () => {
    test.use({ viewport: { width: combo.width, height: 900 } });

    for (const route of ROUTES) {
      test(`${route} has no axe violations and every spoken name contains its visible text`, async ({ page }) => {
        test.skip(PREMIUM.has(route) && premiumNeedsDevServer, 'Unlocking premium needs the dev server.');
        await seed(page, combo);
        if (PREMIUM.has(route)) await unlockPremium(page);
        await open(page, route);
        expect(await axeViolations(page)).toEqual([]);
        expect(await labelNotInName(page)).toEqual([]);
      });
    }

    test('validation errors, the open event form and the tour picker stay readable', async ({ page }) => {
      await seed(page, combo);
      await open(page, '/calendar');
      await page.getByRole('button', { name: /^(add event|agregar evento)$/i }).click();
      await page.getByRole('button', { name: /^(save event|guardar evento)$/i }).click();
      await expect(page.getByText(/title is required|el título es obligatorio/i).first()).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);

      await open(page, '/budget');
      await page.getByRole('button', { name: /^(add income|agregar ingreso)$/i }).click();
      expect(await axeViolations(page)).toEqual([]);

      const guide = page.getByRole('button', { name: /guide|guía/i }).first();
      if (await guide.isVisible()) {
        await guide.click();
        expect(await axeViolations(page)).toEqual([]);
      }
    });

    test('Daily mode is a region inside the page, not a second main landmark', async ({ page }) => {
      await seed(page, combo);
      await page.addInitScript(() => localStorage.setItem('gylio:dailyMode', 'true'));
      await open(page, '/tasks');
      await expect(page.getByRole('main')).toHaveCount(1);
      expect(await axeViolations(page)).toEqual([]);
    });
  });
}

test.describe('accessible names in lists', () => {
  test('Edit and Delete buttons on task cards say which task they act on', async ({ page }) => {
    await seed(page, COMBOS[0]);
    await open(page, '/tasks');
    for (const title of ['Water plants', 'Call the bank']) {
      await page.locator('#new-task').fill(title);
      await page.locator('#new-task').press('Enter');
    }
    for (const title of ['Water plants', 'Call the bank']) {
      await expect(page.getByRole('button', { name: `Edit ${title}`, exact: true })).toHaveCount(1);
      await expect(page.getByRole('button', { name: `Delete ${title}`, exact: true })).toHaveCount(1);
    }
    expect(await labelNotInName(page)).toEqual([]);
  });

  test('the task view tabs move with the arrow keys', async ({ page }) => {
    await seed(page, COMBOS[0]);
    await open(page, '/tasks');
    const today = page.getByRole('tab', { name: 'Today' });
    await today.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'This week' })).toBeFocused();
    await expect(page.getByRole('tab', { name: 'This week' })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: 'Backlog' })).toBeFocused();
  });
});
