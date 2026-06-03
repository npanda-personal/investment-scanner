import { expect, test, type Page } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

async function setupResearchCompatibility(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-stock-research-token');
  });
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { id: 'research-user', email: 'test@example.com', name: 'Test User' } }));
  await page.route('**/api/v1/research/stocks/*/workbench**', (route) => route.fulfill({
    json: {
      overview: {
        instrument_id: 'stock-1',
        symbol: 'ALPHA',
        company_name: 'Alpha Ltd',
        exchange: 'NSE',
        country: 'IN',
        currency: 'INR',
        sector: 'Financial Services',
        industry: 'Banking',
        latest_price: 120,
        daily_change: 1,
        daily_change_percent: 0.01,
        source: 'LOCAL',
        last_updated_timestamp: '2026-06-01T06:00:00.000Z',
        data_status: 'COMPLETE',
      },
      chart: { prices: [], adjusted_close_fallback: false },
      trust: { data_status: 'COMPLETE', source: 'LOCAL', last_updated_timestamp: '2026-06-01T06:00:00.000Z' },
      performance: {},
      fundamentals: null,
      valuation: {},
      relative_strength: {},
      peers: [],
      corporate_actions: [],
    },
  }));
  await page.route('**/api/v1/signals/latest/**', (route) => route.fulfill({ json: null }));
  await page.route('**/api/v1/strategy-decisions/latest/**', (route) => route.fulfill({ json: null }));
}

test.describe('Stock Research compatibility route', () => {
  test('remains reachable by direct URL while hidden from primary trader nav', async ({ page }) => {
    await setupResearchCompatibility(page);

    await visitAuthenticated(page, '/research/stocks/stock-1');

    await expect(page.getByRole('heading', { name: 'Alpha Ltd' })).toBeVisible();
    await expect(page.locator('.MuiDrawer-paper').getByText('Research Workbench', { exact: true })).toHaveCount(0);
  });
});
