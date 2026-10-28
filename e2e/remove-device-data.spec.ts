/**
 * "Sign out and remove my data from this device", in the built site: the removal runs as the next page starts,
 * before the database stand-in loads its copy, so nothing of the person's comes back. Sign-out itself needs a live
 * Clerk instance and is covered by src/features/account/SignOutSection.test.tsx; this asks for the removal the way
 * that screen does, then loads the page.
 */
import { test, expect } from '@playwright/test';
import { builtSiteUrl } from './helpers/builtSite';

const ONBOARDED = JSON.stringify({
  isOnboardingComplete: true,
  currentStep: 4,
  selections: {
    accessibility: { textStyle: 'normal', contrast: 'default', motion: 'reduced', animations: false, tts: false },
    neurodivergence: { preset: 'none', supports: [] },
    quickSetup: { starterGoal: '', monthlyBudget: '' },
    tour: { acknowledged: true, reminders: false },
  },
});

test('removes the tasks, answers and sync data of the person who asked, and keeps the device settings', async ({ page }) => {
  const tasks = new URL('tasks', builtSiteUrl).toString();
  await page.goto(tasks);
  await page.evaluate((onboarded) => localStorage.setItem('onboardingFlowState', onboarded), ONBOARDED);
  await page.reload();

  const title = page.locator('#new-task');
  await expect(title).toBeVisible();
  await title.fill('A: pay rent');
  await title.press('Enter');
  await expect(page.getByText('A: pay rent').first()).toBeVisible();

  await page.evaluate(async () => {
    localStorage.setItem('theme-mode', 'dark');
    localStorage.setItem('gylio:owner', 'user_a');
    localStorage.setItem('gylio:archive:user_b', '{"gylio_sqlite":"B"}');
    await new Promise<void>((resolve) => {
      const request = indexedDB.open('gylio-sync-v2:user_a', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('outbox');
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
    });
    // What "Remove and sign out" leaves for the next page, once sign-out went through.
    localStorage.setItem('gylio:removeOnLoad', 'user_a');
  });

  await page.goto(tasks);
  // The answers went too, so the app starts at setup, with none of A's tasks anywhere.
  await expect(page).toHaveURL(/onboarding/);
  await expect(page.getByText('A: pay rent')).toHaveCount(0);
  const left = await page.evaluate(async () => {
    const databases = (await indexedDB.databases()).map((db) => db.name);
    for (let tries = 0; localStorage.getItem('gylio:removeDatabases') && tries < 50; tries += 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return {
      sqlite: localStorage.getItem('gylio_sqlite') ?? '',
      theme: localStorage.getItem('theme-mode'),
      owner: localStorage.getItem('gylio:owner'),
      archiveB: localStorage.getItem('gylio:archive:user_b'),
      marks: [localStorage.getItem('gylio:removeOnLoad'), localStorage.getItem('gylio:removeDatabases')],
      databases: (await indexedDB.databases()).map((db) => db.name),
      before: databases,
      notice: sessionStorage.getItem('gylio:removedNotice'),
    };
  });
  expect(left.sqlite).not.toContain('pay rent');
  expect(left.theme).toBe('dark');
  expect(left.owner).toBeNull();
  expect(left.archiveB).toBe('{"gylio_sqlite":"B"}');
  expect(left.marks).toEqual([null, null]);
  expect(left.databases).not.toContain('gylio-sync-v2:user_a');
  expect(left.notice).toBe('true');
});
