import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const screenshotDir = path.join(process.cwd(), 'e2e', 'screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

const openGuide = async (page) => {
  await page.goto('deployment-guide.html');
  await expect(page.getByRole('heading', { level: 1, name: /From your laptop to a real production app/i })).toBeVisible();
  await expect(page.locator('meta[name="gylio-guide-validated"]')).toHaveAttribute('content', '2026-08-23');
};

test.describe('GYLIO Production Deployment Academy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('deployment-guide.html');
    await page.evaluate(() => {
      localStorage.removeItem('gylio-deploy-guide-progress-v1');
      localStorage.removeItem('gylio-deploy-guide-settings-v1');
    });
    await page.reload();
  });

  test('standalone guide exposes all 24 steps and current validation date', async ({ page }) => {
    await openGuide(page);
    await expect(page.locator('meta[name="gylio-guide-validated"]')).toHaveAttribute('content', '2026-08-23');
    await expect(page.locator('.step[data-step]')).toHaveCount(24);
    await expect(page.getByRole('heading', { name: /Reusable perfected prompts/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Bibliography/i })).toBeVisible();
  });

  test('checkmarks persist across reload and progress updates', async ({ page }) => {
    await openGuide(page);
    const first = page.locator('#step-01 .step-check');
    await first.check();
    await expect(page.locator('#progress-label')).toContainText('1 / 24 done');
    await page.reload();
    await expect(page.locator('#step-01 .step-check')).toBeChecked();
    await expect(page.locator('#step-01')).toHaveClass(/done/);
  });

  test('non-secret personalization persists and updates commands', async ({ page }) => {
    await openGuide(page);
    const domain = page.locator('[data-config="DOMAIN"]');
    await domain.fill('guide-test.example');
    await expect(page.locator('code.templated').filter({ hasText: 'guide-test.example' }).first()).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-config="DOMAIN"]')).toHaveValue('guide-test.example');
    const configKeys = await page.locator('[data-config]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-config')));
    expect(configKeys.join(' ')).not.toMatch(/SECRET|PASSWORD|TOKEN|MONGODB_URI|OPENAI/i);
  });

  test('320px iPhone-sized viewport has no page-level horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openGuide(page);
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    await page.screenshot({ path: path.join(screenshotDir, 'deployment-guide-iphone-320.png'), fullPage: true });
  });

  test('390px iPhone viewport supports filter, self-check and screenshot evidence', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openGuide(page);
    await page.locator('#step-filter').fill('nginx');
    await expect(page.locator('#filter-count')).not.toContainText('24 of 24');
    await page.locator('#step-filter').fill('');
    await page.getByRole('button', { name: 'Run guide self-check' }).click();
    await expect(page.locator('#self-check-results .result')).toHaveCount(6);
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    await page.screenshot({ path: path.join(screenshotDir, 'deployment-guide-iphone-390.png'), fullPage: true });
  });

  test('desktop guide and main app footer integration are reachable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openGuide(page);
    await page.screenshot({ path: path.join(screenshotDir, 'deployment-guide-desktop.png'), fullPage: true });
    await page.goto('.');
    const footerLink = page.getByRole('link', { name: 'Production Deployment Academy' });
    await expect(footerLink).toBeVisible();
    await expect(footerLink).toHaveAttribute('href', /deployment-guide\.html$/);
  });
});
