import { defineConfig, devices } from '@playwright/test';

// PLAYWRIGHT_PORT lets a second checkout (for example a git worktree) run its own
// dev server. Without it, a run would reuse another checkout's server on 5173 and
// test that code instead.
const port = Number(process.env.PLAYWRIGHT_PORT) || 5173;
const localBaseUrl = `http://localhost:${port}/gylio/`;
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
    // A registered service worker can answer navigations from cache, which
    // turned the static seeding page into an app boot and raced the fixtures.
    serviceWorkers: 'block',
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
        command: `npm run dev -- --port ${port} --strictPort`,
        url: localBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
