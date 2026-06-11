import { defineConfig, devices } from '@playwright/test';

/**
 * QA-loop config: used by the chunked suite runner (one spec file per
 * invocation). Differences from the base playwright.config.ts:
 *  - globalSetup logs in ONCE via the API and persists storageState
 *    (the backend rate-limits /auth/login to 10 per 15 min — per-test
 *    real logins lock the suite out and masquerade as flakes)
 *  - globalTimeout self-kills a hung invocation (per spec-file chunk)
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests/ui',
  timeout: 60_000,
  globalTimeout: 8 * 60 * 1000,
  workers: 1,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  reporter: [['list']],
  globalSetup: './tests/ui/support/global-setup.ts',
  use: {
    baseURL,
    storageState: 'tests/ui/support/.auth-state.json',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
