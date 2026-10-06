import { test, expect, type Page } from '@playwright/test';

// Geometry checks for the 2026-10-06 layout and tour review. They assert what a
// person sees (what overlaps what, what shares a row), not implementation details.

const TABS = ['tasks', 'calendar', 'budget', 'social', 'routines', 'rewards', 'settings'];

async function seedOnboarded(page: Page) {
  await page.addInitScript(() => {
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
  });
}

test.describe('layout review', () => {
  test('no tab scrolls sideways at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await seedOnboarded(page);
    for (const tab of TABS) {
      await page.goto(`./${tab}`);
      await page.waitForTimeout(600);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${tab} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });

  test('budget puts income and the planned-vs-actual summary on one row on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedOnboarded(page);
    await page.goto('./budget');
    const income = page.locator('[data-tour="budget-income"]');
    const summary = page.locator('[data-tour="budget-summary"]');
    await expect(summary).toBeVisible();
    const a = await income.boundingBox();
    const b = await summary.boundingBox();
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(40);
    expect(b!.x).toBeGreaterThan(a!.x + a!.width - 1);
  });

  test('onboarding option groups do not leave an orphan on a second row', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('./');
    await page.waitForSelector('fieldset');
    const rows = await page.$$eval('fieldset', (sets) =>
      sets.map((fs) => {
        const tops = Array.from(fs.querySelectorAll('button')).map((b) => Math.round(b.getBoundingClientRect().top));
        return new Set(tops).size;
      })
    );
    expect(rows.every((n) => n === 1)).toBe(true);
  });

  test('the calendar opens scrolled toward the current time', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.clock.install({ time: new Date('2026-10-06T14:00:00') });
    await seedOnboarded(page);
    await page.goto('./calendar');
    const top = await page.locator('[role="region"][tabindex="0"]').first().evaluate((el) => el.scrollTop);
    expect(top).toBeGreaterThan(100);
  });

  test('tour cards never cover a small target and stay on screen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedOnboarded(page);
    await page.goto('./tasks');
    await page.getByRole('button', { name: /guide/i }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: /Quick overview/i }).click();
    let checked = 0;
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(1500);
      const dialog = await page.getByRole('dialog').boundingBox();
      expect(dialog).not.toBeNull();
      expect(dialog!.y).toBeGreaterThanOrEqual(0);
      expect(dialog!.y + dialog!.height).toBeLessThanOrEqual(800 + 1);
      const target = await page.evaluate(() => {
        const ring = document.querySelector('div[aria-hidden="true"][style*="box-shadow"]') as HTMLElement | null;
        if (!ring) return null;
        const r = ring.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
      // When some side of the target has room for the card, the card must be there.
      // A target spanning most of the screen (the calendar grid) cannot be left uncovered.
      if (target) {
        const room = Math.max(target.y, 800 - (target.y + target.h), target.x, 1280 - (target.x + target.w));
        const sideways = room === target.x || room === 1280 - (target.x + target.w);
        if (room >= (sideways ? dialog!.width : dialog!.height) + 20) {
          checked += 1;
          const overlap = dialog!.x < target.x + target.w && dialog!.x + dialog!.width > target.x &&
            dialog!.y < target.y + target.h && dialog!.y + dialog!.height > target.y;
          expect(overlap, `step ${i + 1} card covers its target`).toBe(false);
        }
      }
      const next = page.getByRole('button', { name: /next step|finish tour/i });
      const label = (await next.first().getAttribute('aria-label')) ?? '';
      await next.first().click();
      if (/finish/i.test(label)) break;
    }
    expect(checked, 'spotlight was not detected on enough steps').toBeGreaterThanOrEqual(4);
  });
});
