import { defineConfig, devices } from '@playwright/test';

const localBaseUrl = 'http://localhost:5173/gylio/';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || localBaseUrl;
const isRemoteTarget = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: isRemoteTarget
    ? undefined
    : {
        command: 'npm run dev',
        url: localBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
