import { defineConfig, devices } from '@playwright/test';

/**
 * TEMPORARY isolated config for verifying strategy-decision-engine while a
 * parallel agent runs the shared QA suite. Differences from playwright.qa.config.ts:
 *  - storageState points to a PRIVATE auth-state file (no collision on the shared
 *    .auth-state.json that the concurrent run deletes/rewrites)
 *  - no globalSetup (auth-state is pre-generated), so we never trip the login limiter
 * Safe to delete.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests/ui',
  timeout: 90_000,
  globalTimeout: 10 * 60 * 1000,
  workers: 1,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL,
    storageState: 'tests/ui/support/.auth-state.sde.json',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
