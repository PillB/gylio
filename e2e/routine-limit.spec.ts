/**
 * The free routine limit in a real browser: the count under the form, the calm note in place of the form once the
 * free plan is full, the routines already made left as they are, and each step in the app's analytics queue. The
 * group is chosen with `?exp_routine_free_limit=`; the hook and the thank-you rule are covered in
 * src/features/routines/components/RoutineAllowance.test.tsx.
 */
import { createRequire } from 'node:module';
import { test, expect, type Page } from '@playwright/test';

const AXE_SOURCE = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

/** axe violations (WCAG 2.2 AA and best practice) as "rule: selector" lines. */
async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: AXE_SOURCE });
  return page.evaluate(async () => {
    type Result = { violations: { id: string; nodes: { target: string[] }[] }[] };
    const axe = (window as unknown as { axe: { run: (context: Document, options: unknown) => Promise<Result> } }).axe;
    const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
    const result = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return result.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`));
  });
}

async function seed(page: Page, extra?: object) {
  await page.addInitScript((given) => {
    if (sessionStorage.getItem('routine-limit-seeded')) return;
    sessionStorage.setItem('routine-limit-seeded', 'yes');
    localStorage.setItem('onboardingFlowState', JSON.stringify({
      isOnboardingComplete: true,
      currentStep: 4,
      selections: {
        accessibility: { textStyle: 'normal', contrast: 'default', motion: 'reduced', animations: false, tts: false },
        neurodivergence: { preset: 'none', supports: [] },
        quickSetup: { starterGoal: '', monthlyBudget: '' },
        tour: { acknowledged: true, reminders: false },
      },
    }));
    if (given) localStorage.setItem('gylio:routines:extra', JSON.stringify(given));
  }, extra ?? null);
}

async function addRoutine(page: Page, name: string) {
  await page.getByLabel(/^Routine name/).fill(name);
  await page.getByRole('button', { name: 'Add routine', exact: true }).click();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
}

type Queued = { name: string; props?: Record<string, unknown> };
const queued = (page: Page, name: string) =>
  page.evaluate((wanted) => (JSON.parse(localStorage.getItem('analytics:queue') ?? '[]') as Queued[]).filter((event) => event.name === wanted).map((event) => event.props), name);

test('three routines fit on the free plan; then a calm note takes the form’s place and every routine stays', async ({ page }) => {
  await seed(page);
  await page.goto('./routines?exp_routine_free_limit=three');
  await expect(page.getByText('0 of 3 routines in use')).toBeVisible();

  await addRoutine(page, 'Morning meds');
  await expect(page.getByText('1 of 3 routines in use')).toBeVisible();
  await addRoutine(page, 'Evening wind-down');
  await addRoutine(page, 'Weekly reset');

  const note = page.getByRole('note').filter({ hasText: 'The free plan keeps up to 3 routines, and you have 3.' });
  await expect(note).toBeVisible();
  await expect(page.getByLabel(/^Routine name/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add routine', exact: true })).toHaveCount(0);
  for (const name of ['Morning meds', 'Evening wind-down', 'Weekly reset']) await expect(page.getByText(name, { exact: true }).first()).toBeVisible();

  expect(await queued(page, 'routine_created')).toEqual([
    { variant: 'three', limit: 3, count: 1 },
    { variant: 'three', limit: 3, count: 2 },
    { variant: 'three', limit: 3, count: 3 },
  ]);
  expect(await queued(page, 'routine_limit')).toEqual([{ step: 'reached', variant: 'three', limit: 3, used: 3 }]);
  expect(await queued(page, 'experiment_exposure')).toContainEqual(expect.objectContaining({ experiment: 'routine_free_limit', variant: 'three' }));
  expect(await axeViolations(page)).toEqual([]);

  // Still full after a reload; removing one opens the form again: the limit only ever stops adding.
  await page.reload();
  await expect(note).toBeVisible();
  await page.getByRole('button', { name: 'Delete Weekly reset' }).click();
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await expect(page.getByText('2 of 3 routines in use')).toBeVisible();
  await expect(page.getByLabel(/^Routine name/)).toBeVisible();
  expect(await queued(page, 'routine_deleted')).toEqual([{ variant: 'three', limit: 3, count: 2 }]);
});

test('the "five" group keeps room after three', async ({ page }) => {
  await seed(page);
  await page.goto('./routines?exp_routine_free_limit=five');
  for (const name of ['One', 'Two', 'Three']) await addRoutine(page, name);
  await expect(page.getByText('3 of 5 routines in use')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add routine', exact: true })).toBeVisible();
});

test('a thank-you already given keeps its two spaces on this device', async ({ page }) => {
  await seed(page, { spaces: 2, givenAt: '2026-10-20T09:00:00.000Z', seen: true });
  await page.goto('./routines?exp_routine_free_limit=three');
  await expect(page.getByText('0 of 5 routines in use')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'A thank-you' })).toHaveCount(0);
});

test('a new thank-you is read out without taking focus, passes axe, and goes on OK', async ({ page }) => {
  await seed(page, { spaces: 2, givenAt: '2026-10-28T09:00:00.000Z', seen: false });
  await page.goto('./routines?exp_routine_free_limit=three_plus_surprise');
  const notice = page.getByRole('status').filter({ hasText: 'A thank-you' });
  await expect(notice).toContainText('You now have room for 2 more, up to 5 routines. They are yours to keep.');
  expect(await page.evaluate(() => document.activeElement?.closest('[role="status"]') ?? null)).toBeNull();
  expect(await axeViolations(page)).toEqual([]);
  await notice.getByRole('button', { name: 'OK' }).focus();
  await page.keyboard.press('Enter');
  await expect(notice).toHaveCount(0);
  expect(await queued(page, 'routine_limit')).toContainEqual({ step: 'extra_seen', variant: 'three_plus_surprise' });
});
