import { expect, test } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

/**
 * Crypto support UI smoke — verifies (deterministically, with mocked APIs) that:
 *  1. Selecting the CRYPTO asset class propagates region=GLOBAL & assetType=CRYPTO
 *     to the signals API and renders the returned crypto signals.
 *  2. The market-scope selector reflects the Crypto asset class.
 *  3. Equity-only screens degrade gracefully (NotApplicableForAssetClass) under
 *     crypto scope rather than erroring or showing fabricated equity data.
 */

const CRYPTO_SIGNALS = {
  signals: [
    { instrument_id: 'c-btc', symbol: 'BTCUSDT', score: 26, direction: 'BEARISH', confidence: 'HIGH', explanation: 'Bearish because price is below SMA50.', triggered_signals: [], negative_signals: [], company_name: 'Bitcoin', sector: null, country: null, currency: 'USD' },
    { instrument_id: 'c-eth', symbol: 'ETHUSDT', score: 26, direction: 'BEARISH', confidence: 'HIGH', explanation: 'Bearish because momentum is negative.', triggered_signals: [], negative_signals: [], company_name: 'Ethereum', sector: null, country: null, currency: 'USD' },
  ],
  total: 2,
  totalCount: 2,
  limit: 25,
  offset: 0,
  hasMore: false,
  scope: { region: 'GLOBAL', assetType: 'CRYPTO' },
  directionCounts: { BULLISH: 0, BEARISH: 2, NEUTRAL: 0 },
};

test.describe('Crypto support UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('market_scope', JSON.stringify({ region: 'GLOBAL', assetType: 'CRYPTO' }));
    });
  });

  test('signals dashboard sends crypto scope and renders crypto signals', async ({ page }) => {
    const seenAssetTypes: string[] = [];
    const respond = async (route: import('@playwright/test').Route) => {
      const params = new URL(route.request().url()).searchParams;
      const at = params.get('assetType');
      if (at) seenAssetTypes.push(at);
      const body = { ...CRYPTO_SIGNALS, signals: CRYPTO_SIGNALS.signals, items: CRYPTO_SIGNALS.signals };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    };
    await page.route('**/api/v1/signals/top**', respond);
    await page.route('**/api/v1/signals/screener**', respond);

    await visitAuthenticated(page, '/signals');

    await expect.poll(() => seenAssetTypes.some((v) => v === 'CRYPTO'), { timeout: 30_000 }).toBe(true);
    await expect(page.getByText('BTCUSDT').first()).toBeVisible({ timeout: 30_000 });
  });

  test('market-scope selector reflects the Crypto asset class', async ({ page }) => {
    await page.route('**/api/v1/signals/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CRYPTO_SIGNALS) }));
    await visitAuthenticated(page, '/signals');
    await expect(page.locator('#market-scope-button')).toContainText(/Crypto|CRYPTO/, { timeout: 30_000 });
  });

  test('equity-only Smart Money screen degrades for crypto', async ({ page }) => {
    await visitAuthenticated(page, '/smart-money');
    await expect(page.getByTestId('not-applicable-asset-class')).toBeVisible({ timeout: 30_000 });
  });

  test('Market Scans shows crypto assets — no NSE leak, no delivery tab', async ({ page }) => {
    await visitAuthenticated(page, '/market-scans');
    // Crypto-flavored subtitle, not the NSE/BSE equity copy.
    await expect(page.getByText(/Daily screening scans for crypto assets/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Indian NSE\/BSE equities/i)).toHaveCount(0);
    // Delivery Spikes tab is NSE-only → hidden for crypto.
    await expect(page.getByRole('tab', { name: /Delivery/i })).toHaveCount(0);
    // No ₹ symbol anywhere under crypto scope (prices are USD).
    await expect(page.getByText(/₹/)).toHaveCount(0);
  });

  test('equity-flavored pages degrade for crypto (daily overview, stock interest)', async ({ page }) => {
    await visitAuthenticated(page, '/daily-overview');
    await expect(page.getByTestId('not-applicable-asset-class')).toBeVisible({ timeout: 30_000 });
    await visitAuthenticated(page, '/stock-interest-radar');
    await expect(page.getByTestId('not-applicable-asset-class')).toBeVisible({ timeout: 30_000 });
  });
});
