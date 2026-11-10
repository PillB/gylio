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
          // The card keeps a visible gap from the highlight ring, not just a shared edge: a card that only
          // touches the ring is one extra line of copy (WebKit, Spanish, larger text) away from covering it.
          const gap = 4;
          const overlap = dialog!.x < target.x + target.w + gap && dialog!.x + dialog!.width > target.x - gap &&
            dialog!.y < target.y + target.h + gap && dialog!.y + dialog!.height > target.y - gap;
          expect(overlap, `step ${i + 1} card covers or touches its target`).toBe(false);
        }
      }
      const next = page.getByRole('button', { name: /next step|finish tour/i });
      const label = (await next.first().getAttribute('aria-label')) ?? '';
      await next.first().click();
      if (/finish/i.test(label)) break;
    }
    expect(checked, 'spotlight was not detected on enough steps').toBeGreaterThanOrEqual(4);
  });

  // On a phone the card is about half the screen tall, so where the page is scrolled to decides whether the card
  // lands on the thing it explains. Centring the target (the old behaviour) put the card on top of it on 28 of the
  // 47 steps at 320x568. Three walkthroughs cover the cases: a field behind "Add details" (Tasks), a view that
  // differs on phones (Calendar), and the last section of a page, which cannot be scrolled higher (Rewards).
  for (const [width, height] of [[390, 844], [320, 568]] as const) {
    test(`on a ${width}x${height} phone every tour step is highlighted and no card covers a target it could sit beside`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height });
      await seedOnboarded(page);
      await page.goto('./tasks');

      const measure = () => page.evaluate(() => {
        const box = (el: Element | null) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
        };
        const card = document.querySelector('[role="dialog"]');
        return {
          ring: box(document.querySelector('div[aria-hidden="true"][style*="box-shadow"]')),
          card: box(card),
          centred: card?.getAttribute('aria-modal') === 'true',
          title: card?.querySelector('h3')?.textContent ?? '',
        };
      });
      // The page scrolls to each step and tabs load their sections late: wait until nothing has moved for 300ms.
      const settled = async () => {
        let last = '';
        let still = 0;
        for (let i = 0; i < 60 && still < 3; i++) {
          await page.waitForTimeout(100);
          const now = JSON.stringify(await measure());
          still = now === last ? still + 1 : 0;
          last = now;
        }
        return measure();
      };

      let beside = 0;
      for (const flow of ['Tasks walkthrough', 'Calendar walkthrough', 'Rewards walkthrough']) {
        await page.getByRole('button', { name: /guide/i }).first().click();
        await page.getByRole('dialog').getByRole('button', { name: new RegExp(flow) }).click();
        for (let i = 0; i < 12; i++) {
          const step = await settled();
          const where = `${flow}, "${step.title}"`;
          expect(step.card, where).not.toBeNull();
          expect(step.card!.y, `${where}: card above the screen`).toBeGreaterThanOrEqual(0);
          expect(step.card!.y + step.card!.h, `${where}: card below the screen`).toBeLessThanOrEqual(height + 1);
          // Only the welcome and closing cards are centred; every other step points at something.
          if (!step.centred) expect(step.ring, `${where}: nothing is highlighted`).not.toBeNull();
          if (step.ring) {
            const target = { y: step.ring.y + 8, h: step.ring.h - 16 };
            expect(step.ring.y, `${where}: the top of the target is off screen`).toBeGreaterThanOrEqual(0);
            const fitTogether = target.h + 14 + step.card!.h <= height - 24;
            const gap = 4;
            const apart = step.card!.y >= step.ring.y + step.ring.h + gap || step.card!.y + step.card!.h <= step.ring.y - gap;
            if (apart) {
              beside += 1;
            } else {
              // Only a target too tall to share the screen may be covered, and then its lower part, never the top.
              // (A card a fraction of a pixel over still goes beside its target: Firefox measures this one at 330.53.)
              expect(fitTogether, `${where}: the card covers or touches its target`).toBe(false);
              expect(step.card!.y, `${where}: the card covers the top of its target`).toBeGreaterThan(target.y + 40);
            }
          }
          const next = page.getByRole('button', { name: /next step|finish tour/i }).first();
          const label = (await next.getAttribute('aria-label')) ?? '';
          await next.click();
          if (/finish/i.test(label)) break;
        }
        await expect(page.getByRole('dialog')).toHaveCount(0);
      }
      expect(beside, 'too few steps were small enough to check').toBeGreaterThanOrEqual(6);
    });
  }

  test('the Tasks walkthrough points at "Add details" for a hidden field, then at the field once it is open', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedOnboarded(page);
    await page.goto('./tasks');
    await page.getByRole('button', { name: /guide/i }).first().click();
    const selector = page.getByRole('dialog');
    // Social is locked on the free plan: its walkthrough would point at the upgrade card on every step.
    await expect(selector.getByRole('button', { name: /Tasks walkthrough/ })).toBeVisible();
    await expect(selector.getByRole('button', { name: /Social walkthrough/ })).toHaveCount(0);
    await selector.getByRole('button', { name: /Tasks walkthrough/ }).click();

    const card = page.getByRole('dialog');
    const next = page.getByRole('button', { name: /next step/i });
    while (!(await card.getByRole('heading', { name: /Schedule it/ }).count())) await next.click();

    const ringBox = () => page.locator('div[aria-hidden="true"][style*="box-shadow"]').boundingBox();
    const toggle = page.getByRole('button', { name: 'Add details' });
    await expect(card.getByText(/Open “Add details”/)).toBeVisible();
    await expect.poll(async () => {
      const [ring, button] = [await ringBox(), await toggle.boundingBox()];
      return ring && button ? Math.abs(ring.y + 8 - button.y) + Math.abs(ring.height - 16 - button.height) : 999;
    }).toBeLessThan(2);

    await toggle.click();
    const dateField = page.locator('[data-tour="task-date"]');
    await expect(dateField).toBeVisible();
    await expect(card.getByText(/Open “Add details”/)).toHaveCount(0);
    await expect.poll(async () => {
      const [ring, field] = [await ringBox(), await dateField.boundingBox()];
      return ring && field ? Math.abs(ring.y + 8 - field.y) + Math.abs(ring.height - 16 - field.height) : 999;
    }).toBeLessThan(2);
    // The field and the card are both on screen, apart, once the page has finished scrolling to the field.
    await expect.poll(async () => {
      const [ring, cardBox] = [await ringBox(), await card.boundingBox()];
      if (!ring || !cardBox) return 'missing';
      if (ring.y < 0) return 'the field is above the screen';
      return cardBox.y >= ring.y + ring.height || cardBox.y + cardBox.height <= ring.y ? 'apart' : 'the card is on the field';
    }).toBe('apart');
  });

  // A tour step opens its tab. Before setup is finished (and, with sign-in on, before signing in) every tab
  // redirects away, and the step used to ask again on each redirect: 762 page changes in 3 seconds, measured here.
  test('a tour started where its tabs cannot open asks once and stays usable', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('./privacy');
    await page.getByRole('button', { name: /guide/i }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: /Quick overview/i }).click();
    await page.evaluate(() => {
      const counter = window as unknown as { pageChanges: number };
      counter.pageChanges = 0;
      for (const method of ['pushState', 'replaceState'] as const) {
        const original = history[method].bind(history);
        history[method] = (...args: Parameters<History['pushState']>) => {
          counter.pageChanges += 1;
          return original(...args);
        };
      }
    });
    await page.getByRole('button', { name: /next step/i }).click();
    await page.waitForTimeout(1500);
    const pageChanges = await page.evaluate(() => (window as unknown as { pageChanges: number }).pageChanges);
    expect(pageChanges).toBeLessThanOrEqual(4);
    await expect(page).toHaveURL(/\/onboarding$/);
    // The tour is still there and still answers.
    await expect(page.getByRole('dialog').getByText('Step 2 of 9')).toBeVisible();
    await page.getByRole('button', { name: /pause tour/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('debt payoff is collapsed until wanted, and the quick-add experiment moves Add transaction to the top', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedOnboarded(page);
    await page.goto('./budget');
    await expect(page.getByRole('button', { name: 'Add debt' })).toBeHidden();
    await page.getByText('Debt payoff (optional)').click();
    await expect(page.getByRole('button', { name: 'Add debt' })).toBeVisible();

    const headingY = async (name: string) => (await page.getByRole('heading', { name: new RegExp(`^${name}`) }).first().boundingBox())!.y;
    const incomeFirst = (await headingY('Income')) < (await headingY('Transactions')) || (await headingY('Income')) === (await headingY('Transactions'));
    expect(incomeFirst).toBe(true);
    await page.goto('./budget?exp_budget_quick_add=top');
    // In the experiment, Transactions is the first section: it is above, or level with, Income.
    expect(await headingY('Transactions')).toBeLessThanOrEqual(await headingY('Income'));
  });

  test('the short-tour experiment shows five steps; the default shows nine', async ({ browser }) => {
    for (const [query, total] of [['', 9], ['?exp_tour_length=overview5', 5]] as const) {
      // A fresh context each time: an unfinished tour is restored on reload.
      const context = await browser.newContext();
      const page = await context.newPage();
      await seedOnboarded(page);
      await page.goto(`./tasks${query}`);
      await page.getByRole('button', { name: /guide/i }).first().click();
      await page.getByRole('dialog').getByRole('button', { name: /Quick overview/i }).click();
      await expect(page.getByText(`Step 1 of ${total}`)).toBeVisible();
      await context.close();
    }
  });
});
