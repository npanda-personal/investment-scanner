import { expect, test } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

/**
 * US equity support UI smoke — LIVE data (no API mocks). Validates that, after the
 * US ingestion runs, US scope surfaces real ingested data with correct currency and
 * NO India ($→₹) leakage, and that US-enabled / India-only capabilities gate right.
 *
 * Requires the dev frontend + backend running and US data ingested. Run during the
 * ingestion-signoff QA pass:
 *   npx playwright test tests/ui/us-equity-support.spec.ts
 */

test.describe('US equity support UI (live data)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('market_scope', JSON.stringify({ region: 'US', assetType: 'STOCK' }));
    });
  });

  test('market-scope selector reflects US scope', async ({ page }) => {
    await visitAuthenticated(page, '/screener');
    await expect(page.locator('#market-scope-button')).toContainText(/US/i, { timeout: 30_000 });
  });

  test('screener renders real US rows in USD with no rupee leak', async ({ page }) => {
    await visitAuthenticated(page, '/screener');
    // Real US tickers should appear (mega-caps are always in the priced universe).
    await expect(page.getByText(/\b(AAPL|MSFT|NVDA|AMZN)\b/).first()).toBeVisible({ timeout: 30_000 });
    // Prices in USD, never rupees under US scope.
    await expect(page.getByText('₹').first()).toHaveCount(0);
    await expect(page.getByText(/\$\s?\d/).first()).toBeVisible({ timeout: 30_000 });
  });

  test('instruments list shows US equities (USD)', async ({ page }) => {
    await visitAuthenticated(page, '/instruments');
    await expect(page.getByText(/\b(AAPL|MSFT|NVDA)\b/).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('₹').first()).toHaveCount(0);
  });

  test('index constituents renders S&P 500 for US (capability now enabled)', async ({ page }) => {
    await visitAuthenticated(page, '/index-constituents');
    // Should NOT show the "not applicable" gate; should show an S&P 500 / NASDAQ-100 label.
    await expect(page.getByTestId('not-applicable-asset-class')).toHaveCount(0);
    await expect(page.getByText(/S&P 500|NASDAQ-100/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test('India-only F&O derivatives screen gates as not-applicable for US', async ({ page }) => {
    await visitAuthenticated(page, '/derivatives');
    await expect(page.getByTestId('not-applicable-asset-class')).toBeVisible({ timeout: 30_000 });
    // No Indian FII/DII rupee data leaking into US scope.
    await expect(page.getByText('₹').first()).toHaveCount(0);
  });
});
