import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

/** Seed before boot so onboarding cannot overwrite the fixture during hydration. */
async function openLab(page: Page, locale: 'en' | 'es-PE') {
  await page.addInitScript((language) => {
    localStorage.setItem('gylio_lang', language);
    localStorage.setItem('onboardingFlowState', JSON.stringify({
      isOnboardingComplete: true,
      currentStep: 4,
      selections: {
        accessibility: { textStyle: 'normal', contrast: 'default', motion: 'reduced', animations: false, tts: false },
        neurodivergence: { preset: 'none', supports: [] },
        quickSetup: { starterGoal: '', monthlyBudget: '' },
        tour: { acknowledged: true, reminders: false }
      }
    }));
  }, locale);
  await page.goto('./connection-lab', { waitUntil: 'networkidle' });
}

test('English: conversation exercise works in Chromium and analytics excludes selected text', async ({ page }) => {
  const errors: string[] = [];
  const failedAssets: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    if (request.url().includes('/gylio/assets/')) failedAssets.push(request.url());
  });

  await openLab(page, 'en');
  await expect(page.getByRole('heading', { name: 'Connection Lab' })).toBeVisible();
  await page.getByRole('button', { name: /Approach and start/ }).click();
  await expect(page.getByText(/At a community event/)).toBeVisible();
  await page.getByRole('button', { name: /Have you tried any of these activities/ }).click();
  await expect(page.getByText(/One possible reaction/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip without penalty' })).toHaveCount(0);
  await expect(page.getByText(/respects the other person's agency/)).toBeVisible();
  await page.getByRole('button', { name: 'Next scene' }).click();
  await expect(page.getByText(/A separate practice situation/)).toBeVisible();
  await page.getByRole('button', { name: 'Skip without penalty' }).click();
  await expect(page.getByRole('heading', { name: 'Practice finished' })).toBeVisible();

  const events = await page.evaluate(() => JSON.parse(localStorage.getItem('analytics:queue') ?? '[]'));
  const choice = events.find((event: { name: string }) => event.name === 'connection_lab_choice');
  expect(choice.props).toEqual({ lesson: 'approach', turn: 0 });
  expect(JSON.stringify(choice)).not.toContain('Have you tried');
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);

  // The lesson does not leak into a future session, by design.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Choose a skill to practice' })).toBeVisible();
});

test('Peruvian Spanish: mobile scene, timebox controls and consent feedback are usable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openLab(page, 'es-PE');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-PE');
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await page.getByRole('button', { name: /Expresar interés con respeto/ }).click();
  await expect(page.getByText(/Después de una clase de arte/)).toBeVisible();

  await page.getByRole('button', { name: '25 min' }).click();
  await expect(page.getByRole('button', { name: '25 min' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /me debes una cita/ }).click();
  await expect(page.getByText(/podría generar presión/)).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente escena' }).click();
  await page.getByRole('button', { name: 'Omitir sin penalización' }).click();
  await expect(page.getByRole('heading', { name: 'Práctica terminada' })).toBeVisible();

  // The new module should not force sideways scrolling on a narrow phone.
  const width = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.page).toBeLessThanOrEqual(width.viewport + 1);
  expect(errors).toEqual([]);
});

/**
 * Forensic visual inventory: capture every lesson before and after a choice in
 * each shipped locale at two realistic viewport widths. The snapshots are
 * uploaded to the CI playwright-audit artifact for manual review.
 */
test('screenshots: six English lesson scenes and feedback on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openLab(page, 'en');
  const catalog = JSON.parse(fs.readFileSync('src/i18n/connectionLab.en.json', 'utf8'));
  for (const lesson of ['approach', 'flow', 'flirt', 'connect', 'rejection', 'repair'] as const) {
    const title = catalog.lessons[lesson].title;
    await page.getByRole('button', { name: new RegExp(title) }).click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await page.screenshot({ path: `e2e/screenshots/connection-lab-en-${lesson}-scene.png`, fullPage: true });
    const first = Object.values(catalog.lessons[lesson].turns)[0];
    await page.getByRole('button', { name: first.options.a.text }).click();
    await expect(page.getByText(first.options.a.response)).toBeVisible();
    await page.screenshot({ path: `e2e/screenshots/connection-lab-en-${lesson}-feedback.png`, fullPage: true });
    await page.getByRole('button', { name: 'Back to skills' }).click();
  }
});

test('screenshots: six es-PE lesson scenes and feedback at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await openLab(page, 'es-PE');
  const catalog = JSON.parse(fs.readFileSync('src/i18n/connectionLab.es-PE.json', 'utf8'));
  for (const lesson of ['approach', 'flow', 'flirt', 'connect', 'rejection', 'repair'] as const) {
    const title = catalog.lessons[lesson].title;
    await page.getByRole('button', { name: new RegExp(title) }).click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await page.screenshot({ path: `e2e/screenshots/connection-lab-es-PE-${lesson}-scene.png`, fullPage: true });
    const first = Object.values(catalog.lessons[lesson].turns)[0];
    await page.getByRole('button', { name: first.options.a.text }).click();
    await expect(page.getByText(first.options.a.response)).toBeVisible();
    await page.screenshot({ path: `e2e/screenshots/connection-lab-es-PE-${lesson}-feedback.png`, fullPage: true });
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(dimensions.scrollWidth, `${lesson}: unexpected horizontal overflow`).toBeLessThanOrEqual(dimensions.viewport + 1);
    await page.getByRole('button', { name: 'Volver a las habilidades' }).click();
  }
});

/** Exercise every response and transition via accessible controls, in both languages. */
for (const locale of ['en', 'es-PE'] as const) {
  test(`all 36 response choices and focus presets: ${locale}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: locale === 'en' ? 1280 : 320, height: 800 });
    await openLab(page, locale);
    const catalog = JSON.parse(fs.readFileSync(`src/i18n/connectionLab.${locale}.json`, 'utf8'));
    const main = page.locator('main');
    for (const lessonId of ['approach', 'flow', 'flirt', 'connect', 'rejection', 'repair']) {
      const lesson = catalog.lessons[lessonId];
      for (const id of ['a', 'b', 'c']) {
        await main.getByRole('button', { name: new RegExp(lesson.title) }).click();
        const turns = Object.values(lesson.turns) as {prompt: string; options: Record<string, {text: string; response: string}>}[];
        for (const [index, turn] of turns.entries()) {
          await expect(main.getByText(turn.prompt, { exact: true })).toBeVisible();
          for (const count of [5, 10, 25, 45]) {
            const control = main.getByRole('button', { name: `${count} min`, exact: true });
            await control.click();
            await expect(control).toHaveAttribute('aria-pressed', 'true');
          }
          const button = main.getByRole('button', { name: turn.options[id].text, exact: true });
          await button.click();
          await expect(button).toBeDisabled();
          await expect(main.getByText(turn.options[id].response, { exact: true })).toBeVisible();
          await expect(main.getByRole('button', { name: catalog.skip, exact: true })).toHaveCount(0);
          await main.getByRole('button', { name: index === turns.length - 1 ? catalog.finish : catalog.next, exact: true }).click();
        }
        await expect(main.getByRole('heading', { name: catalog.finished, exact: true })).toBeVisible();
        await main.getByRole('button', { name: catalog.back, exact: true }).click();
      }
    }
  });
}
