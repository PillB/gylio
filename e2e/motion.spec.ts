import { test, expect, type Page } from '@playwright/test';

// The motion setting has to reach every transition, and most components set theirs inline without
// reading it. Before this, 27 of them ran whatever the setting or the device said. These checks read
// what the browser will actually do (computed styles), in each combination of setting and device.

type Motion = 'system' | 'reduced' | 'standard';

async function seed(page: Page, motion: Motion, animations: boolean) {
  await page.addInitScript(([m, a]) => {
    localStorage.setItem('onboardingFlowState', JSON.stringify({
      isOnboardingComplete: true,
      currentStep: 4,
      selections: {
        accessibility: { textStyle: 'normal', contrast: 'default', motion: m, animations: a, tts: false },
        neurodivergence: { preset: 'none', supports: [] },
        quickSetup: { starterGoal: '', monthlyBudget: '' },
        tour: { acknowledged: true, reminders: false },
      },
    }));
  }, [motion, animations] as const);
}

// The header's guide button declares `transition: all 150ms` inline: the worst case for a setting to reach.
const read = (page: Page) => page.evaluate(() => {
  const button = Array.from(document.querySelectorAll('button')).find((b) => /guide/i.test(b.textContent ?? ''))!;
  const style = getComputedStyle(button);
  return {
    mode: document.documentElement.getAttribute('data-motion'),
    inline: button.style.transition,
    property: style.transitionProperty,
    duration: style.transitionDuration,
    pageScroll: getComputedStyle(document.documentElement).scrollBehavior,
  };
});

const CASES: { name: string; motion: Motion; animations: boolean; device: 'reduce' | 'no-preference'; mode: string }[] = [
  { name: 'nothing asks for less motion', motion: 'system', animations: true, device: 'no-preference', mode: 'full' },
  { name: 'Settings reduces motion on a device that does not', motion: 'reduced', animations: true, device: 'no-preference', mode: 'reduced' },
  { name: 'the device reduces motion and the app follows it', motion: 'system', animations: true, device: 'reduce', mode: 'reduced' },
  { name: 'Settings allows motion on a device that reduces it', motion: 'standard', animations: true, device: 'reduce', mode: 'full' },
  { name: 'animations are switched off', motion: 'standard', animations: false, device: 'no-preference', mode: 'off' },
];

test.describe('motion setting', () => {
  for (const c of CASES) {
    test(`${c.name}: ${c.mode}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: c.device });
      await seed(page, c.motion, c.animations);
      await page.goto('./tasks');
      await expect(page.locator('html')).toHaveAttribute('data-motion', c.mode);
      const seen = await read(page);
      // Browsers serialise `all 150ms` as `150ms`.
      expect(seen.inline, 'the button no longer declares its own transition; pick another probe').toBe('150ms');

      if (c.mode === 'full') {
        expect(seen.property).toBe('all');
        expect(seen.duration).toBe('0.15s');
        expect(seen.pageScroll).toBe('smooth');
      }
      if (c.mode === 'reduced') {
        // Fades stay; size and position (width, height, transform, top, left: everything "all" covered) do not animate.
        expect(seen.property).toContain('opacity');
        expect(seen.property).toContain('background-color');
        expect(seen.property).not.toMatch(/\ball\b|width|height|transform|top|left|margin|padding/);
        expect(seen.pageScroll).toBe('auto');
      }
      if (c.mode === 'off') {
        expect(seen.property === 'none' || seen.duration === '0s').toBe(true);
        expect(seen.pageScroll).toBe('auto');
      }
    });
  }

  // Before: the switch was saved, then overwritten with the start-up default on the next load.
  test('animations switched off in Settings are still off after a reload', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('onboardingFlowState')) return; // keep what Settings saved across the reload
      localStorage.setItem('onboardingFlowState', JSON.stringify({
        isOnboardingComplete: true,
        currentStep: 4,
        selections: {
          accessibility: { textStyle: 'normal', contrast: 'default', motion: 'system', animations: true, tts: false },
          neurodivergence: { preset: 'none', supports: [] },
          quickSetup: { starterGoal: '', monthlyBudget: '' },
          tour: { acknowledged: true, reminders: false },
        },
      }));
    });
    await page.goto('./settings');
    const animations = page.getByRole('checkbox', { name: /animations/i });
    await expect(animations).toBeChecked();
    await animations.uncheck();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');

    await page.reload();
    await expect(page.getByRole('checkbox', { name: /animations/i })).not.toBeChecked();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  });

  test('the screen tint is still on after a reload', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('onboardingFlowState')) return;
      localStorage.setItem('onboardingFlowState', JSON.stringify({
        isOnboardingComplete: true,
        currentStep: 4,
        selections: {
          accessibility: { textStyle: 'normal', contrast: 'default', motion: 'system', animations: true, tts: false },
          neurodivergence: { preset: 'none', supports: [] },
          quickSetup: { starterGoal: '', monthlyBudget: '' },
          tour: { acknowledged: true, reminders: false },
        },
      }));
    });
    await page.goto('./settings');
    await page.getByRole('button', { name: 'Enable screen tint', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Disable screen tint', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Disable screen tint', exact: true })).toBeVisible();
  });

  test('with motion reduced, a progress bar jumps to its new width instead of growing', async ({ page }) => {
    await seed(page, 'reduced', true);
    await page.goto('./tasks');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    const widthAnimated = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.transition = 'width 0.4s, transform 0.2s ease, top 250ms';
      document.body.appendChild(probe);
      const property = getComputedStyle(probe).transitionProperty;
      probe.remove();
      return property;
    });
    expect(widthAnimated).not.toMatch(/width|transform|top/);
  });

  test('before the app has read the setting, a device that reduces motion is respected', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seed(page, 'system', true);
    await page.goto('./tasks');
    const property = await page.evaluate(() => {
      document.documentElement.removeAttribute('data-motion'); // as on first paint
      const probe = document.createElement('div');
      probe.style.transition = 'all 150ms';
      document.body.appendChild(probe);
      const seen = getComputedStyle(probe).transitionProperty;
      probe.remove();
      return seen;
    });
    expect(property).not.toMatch(/\ball\b/);
    expect(property).toContain('opacity');
  });
});
