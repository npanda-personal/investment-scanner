import { defineConfig, devices } from '@playwright/test';

// 'localhost', not '127.0.0.1': Vite binds IPv6 ::1 on Windows, so the IPv4
// loopback is refused even when the dev server is healthy.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests/ui',
  timeout: 60_000,
  workers: 1,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL,
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
