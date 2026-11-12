import { defineConfig, devices } from '@playwright/test';

/**
 * These tests open a real browser against a running shop. Start the shop
 * first (`docker compose up --build`), then run `npm run test:e2e`.
 * Set E2E_BASE_URL to test a shop running somewhere else.
 */
export default defineConfig({
  testDir: 'journeys',
  // The journeys share one shop and change its stock, so they run one after another.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Optional: use a Chromium that is already installed instead of Playwright's own download.
        launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
      },
    },
  ],
});
