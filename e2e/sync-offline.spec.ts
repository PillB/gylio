import { expect, test, type Page } from '@playwright/test';
import { MockWorker } from './helpers/mockWorker';

// Real browser, real storage, real timers: the sync harness page (e2e/harness/sync.html) runs the real task screen
// and the real sync against a stand-in Worker that these tests switch between working, paused (503) and unreachable.

const HARNESS = '/gylio/e2e/harness/sync.html';

async function open(page: Page, worker: MockWorker, query = '') {
  await worker.attach(page);
  await page.goto(`${HARNESS}${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('#new-task')).toBeVisible();
}

async function addTask(page: Page, title: string) {
  await page.locator('#new-task').fill(title);
  await page.getByRole('button', { name: /^add task$/i }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

type Hooks = { __sync: { engine: { snapshot: () => { state: { kind: string; reason?: string }; pending: number }; kick: (reason: string) => void } } };
const snapshot = (page: Page) => page.evaluate(() => (window as unknown as Hooks).__sync.engine.snapshot());
const kick = (page: Page, reason = 'poll') => page.evaluate((r) => (window as unknown as Hooks).__sync.engine.kick(r), reason);
const note = (page: Page) => page.getByLabel('Sync status');
/** The task list shows the top three tasks until asked for the rest (Focus mode); this asks for the rest. */
const showAll = async (page: Page) => {
  const more = page.getByRole('button', { name: /^Show all \d+/ });
  if (await more.isVisible().catch(() => false)) await more.click();
};
const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};
// Planned for today, so it shows in the screen's default "Today" view.
const remoteTask = (title: string) => ({ title, status: 'pending', subtasks: [], energyRequired: 'medium', calendarEventId: null, plannedDate: today() });

test.describe('sync in a real browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(HARNESS, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      localStorage.clear();
      localStorage.setItem('gylio_lang', 'en');
      localStorage.setItem(
        'onboardingFlowState',
        JSON.stringify({ schemaVersion: 5, currentStep: 2, isOnboardingComplete: true, selections: { accessibility: { textStyle: 'standard', contrast: 'balanced', motion: 'system', animations: true, tts: false }, quickSetup: { starterGoal: '' }, tour: {} } }),
      );
      for (const db of await indexedDB.databases()) if (db.name) indexedDB.deleteDatabase(db.name);
    });
  });

  test('a task added in the screen reaches the account, and a reload neither loses it nor sends it again', async ({ page }) => {
    const worker = new MockWorker();
    await open(page, worker);
    await addTask(page, 'Pay the electricity bill');
    await expect.poll(() => worker.titles, { timeout: 15_000 }).toEqual(['Pay the electricity bill']);
    const sent = worker.requests((r) => r.method === 'PUT').length;

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('Pay the electricity bill', { exact: true })).toBeVisible();
    await page.waitForTimeout(3000);
    expect(worker.requests((r) => r.method === 'PUT')).toHaveLength(sent);
    expect((await snapshot(page)).pending).toBe(0);
  });

  test('during a 503 pause the person keeps working, the note is calm, a reload loses nothing, and "Try now" sends it all', async ({ page }) => {
    const worker = new MockWorker();
    await open(page, worker);
    await addTask(page, 'Before the pause');
    await expect.poll(() => worker.titles, { timeout: 15_000 }).toEqual(['Before the pause']);

    worker.mode = { kind: 'shed', retryAfter: '3600' };
    await addTask(page, 'During the pause');
    await addTask(page, 'Also during the pause');
    // The screen answered at once: nothing waited for the account.
    await expect.poll(async () => (await snapshot(page)).state, { timeout: 15_000 }).toMatchObject({ kind: 'waiting', reason: 'paused' });
    await expect(note(page)).toContainText('Saved on this device');
    await expect(note(page)).not.toContainText(/error|failed/i);
    await expect(page.getByText('2 changes are waiting to sync.').first()).toBeVisible();

    // Closing and reopening the page during the pause: nothing lost, still waiting, no request storm.
    const requestsBefore = worker.requests().length;
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('During the pause', { exact: true })).toBeVisible();
    await expect(page.getByText('Also during the pause', { exact: true })).toBeVisible();
    await expect.poll(async () => (await snapshot(page)).pending).toBe(2);
    await page.waitForTimeout(3000);
    expect(worker.requests().length - requestsBefore).toBeLessThanOrEqual(4);
    expect(worker.titles).toEqual(['Before the pause']);

    worker.mode = { kind: 'ok' };
    await page.getByRole('button', { name: 'Try now' }).click();
    await expect.poll(() => worker.titles, { timeout: 15_000 }).toEqual(['Also during the pause', 'Before the pause', 'During the pause']);
    await expect.poll(async () => (await snapshot(page)).pending).toBe(0);
    await expect(note(page)).toBeHidden();
  });

  test('after the pause ends by itself, everything is sent without the person doing anything', async ({ page }) => {
    await page.clock.install();
    const worker = new MockWorker();
    await open(page, worker);
    worker.mode = { kind: 'shed', retryAfter: '3600' };
    await addTask(page, 'Written during the pause');
    await expect.poll(async () => (await snapshot(page)).state, { timeout: 15_000 }).toMatchObject({ kind: 'waiting', reason: 'paused' });
    worker.mode = { kind: 'ok' };
    await page.clock.fastForward('02:00:00');
    await expect.poll(() => worker.titles, { timeout: 20_000 }).toEqual(['Written during the pause']);
    await expect.poll(async () => (await snapshot(page)).pending).toBe(0);
  });

  test('with no network the screen still works, says where the data is, and sends it when the network returns', async ({ page, context }) => {
    const worker = new MockWorker();
    await open(page, worker);
    await addTask(page, 'Online task');
    await expect.poll(() => worker.titles, { timeout: 15_000 }).toEqual(['Online task']);

    await context.setOffline(true);
    await addTask(page, 'Offline task');
    await expect(note(page)).toContainText("It will sync when you're back online", { timeout: 15_000 });
    await context.setOffline(false);
    await expect.poll(() => worker.titles, { timeout: 20_000 }).toEqual(['Offline task', 'Online task']);
    await expect(note(page)).toBeHidden();
  });

  test('a change made on another device appears in the open screen by itself', async ({ page }) => {
    const worker = new MockWorker();
    await open(page, worker);
    await addTask(page, 'Mine');
    await expect.poll(() => worker.titles, { timeout: 15_000 }).toEqual(['Mine']);
    worker.otherDeviceSets('tasks', 'phone-1', remoteTask('From my phone'));
    await kick(page);
    await expect(page.getByText('From my phone', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Mine', { exact: true })).toBeVisible();
    // It is not sent back.
    const puts = worker.requests((r) => r.method === 'PUT').length;
    await page.waitForTimeout(3000);
    expect(worker.requests((r) => r.method === 'PUT')).toHaveLength(puts);
  });

  test('a second tab sees what the first saved, and the two do not send it twice', async ({ page, context }) => {
    const worker = new MockWorker();
    await open(page, worker);
    const other = await context.newPage();
    await open(other, worker);
    await addTask(page, 'Saved in tab one');
    await expect(other.getByText('Saved in tab one', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => worker.titles, { timeout: 15_000 }).toEqual(['Saved in tab one']);
    await addTask(other, 'Saved in tab two');
    await expect(page.getByText('Saved in tab two', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => worker.titles, { timeout: 20_000 }).toEqual(['Saved in tab one', 'Saved in tab two']);
    await page.waitForTimeout(3000);
    // Each task was written to the account once, give or take an identical retry the account ignores.
    const writes = worker.requests((r) => r.method === 'PUT').length;
    expect(writes).toBeLessThanOrEqual(4);
    expect([...worker.records.values()].every((r) => r.version === 1)).toBe(true);
  });

  test('if the browser loses most of the saved tasks, they are fetched again, not deleted from the account', async ({ page }) => {
    const worker = new MockWorker();
    for (let i = 1; i <= 6; i += 1) worker.otherDeviceSets('tasks', `seed-${i}`, remoteTask(`Seed task ${i}`));
    await open(page, worker);
    await showAll(page);
    await expect(page.getByText('Seed task 6', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => (await snapshot(page)).pending).toBe(0);

    await page.evaluate(() => localStorage.removeItem('gylio_sqlite'));
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('Seed task 1', { exact: true })).toBeVisible({ timeout: 20_000 });
    await showAll(page);
    await expect(page.getByText('Seed task 6', { exact: true })).toBeVisible();
    expect(worker.requests((r) => r.method === 'DELETE')).toHaveLength(0);
    expect(worker.titles).toHaveLength(6);
  });
});
