import { expect, test, type Page, type Request } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

/**
 * Screener direction + trade-setup tabs.
 * Verifies the tab UI added on top of the equity Screener: an All/Bullish/Bearish direction
 * selector, direction-specific setup sub-tabs, removal of the legacy "Signal Direction" dropdown,
 * and that selecting a setup issues a screener request carrying the `setup` query param.
 * Auth uses the real session (storageState / form-login fallback, like the other module specs);
 * only the screener API itself is mocked, so no live screener data is required.
 */

const SAMPLE_ROW = {
  instrumentId: 'in-1', symbol: 'BIMETAL', companyName: 'Bimetal Bearings', price: 1234.5,
  signalDirection: 'BULLISH', signalScore: 72, rsPercentile: 88, sector: 'Auto Components',
  capBand: 'SMALL', deliveryPct: 55.2, range52wPositionPct: 91.0, inFnoBan: false,
  buildupLabel: null, oiChangePct: null, pcrOi: null, fnoReadinessScore: null, fnoGrade: null,
  fnoComponents: null, scoreDeltaPrev: 2.1, isNewEntry: false,
  factorFamilies: { TREND: 2, MOMENTUM: 1 }, setups: ['TREND_MOMENTUM', 'BREAKOUT'],
  smartMoneyStatus: 'NEUTRAL', sectorLeadershipStatus: 'LAGGING', sparkline: [10, 11, 12, 13],
  currency: 'INR',
};

/** Mock the screener endpoint and record every request URL it receives (to assert query params). */
async function mockScreener(page: Page, seen: string[]) {
  await page.route('**/api/v1/market-data/screener**', async (route, request: Request) => {
    seen.push(request.url());
    await route.fulfill({
      json: { generatedAt: '2026-06-24T00:00:00.000Z', count: 1, results: [SAMPLE_ROW], warnings: [] },
    });
  });
}

test.describe('Screener — direction + setup tabs', () => {
  test('renders direction tabs, hides the legacy dropdown, and threads setup into the request', async ({ page }) => {
    const seen: string[] = [];
    await mockScreener(page, seen);

    // Screener renders the equity table only under an equity scope; pin India/STOCK
    // so we exercise the new tabs (a crypto scope renders the separate CryptoSignalBoard).
    await page.addInitScript(() => {
      window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
    });

    await visitAuthenticated(page, '/screener');

    // Direction selector tabs are present.
    await expect(page.getByRole('tab', { name: 'All', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Bullish', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Bearish', exact: true })).toBeVisible();

    // The legacy "Signal Direction" dropdown is gone — direction is now driven by the tabs.
    // (Target the combobox role specifically: the new direction tablist carries
    // aria-label="Signal direction", which a plain getByLabel would match by substring.)
    await expect(page.getByRole('combobox', { name: 'Signal Direction' })).toHaveCount(0);

    // No setup sub-tabs while "All" is selected.
    await expect(page.getByRole('tab', { name: 'Breakout' })).toHaveCount(0);

    // Select Bullish → the 8 bullish setup sub-tabs (plus "All Bullish") appear.
    await page.getByRole('tab', { name: 'Bullish' }).click();
    await expect(page.getByRole('tab', { name: 'All Bullish' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Breakout' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Trend Momentum' })).toBeVisible();

    // Selecting a setup issues a screener request carrying setup=BREAKOUT.
    await page.getByRole('tab', { name: 'Breakout' }).click();
    await expect
      .poll(() => seen.some((u) => u.includes('setup=BREAKOUT') && u.includes('signalDirection=BULLISH')))
      .toBe(true);

    // Switching to Bearish swaps in the bearish setup sub-tabs.
    await page.getByRole('tab', { name: 'Bearish' }).click();
    await expect(page.getByRole('tab', { name: 'All Bearish' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Trend Bearish' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Breakdown' })).toBeVisible();
    // Bullish-only setup is no longer offered under Bearish.
    await expect(page.getByRole('tab', { name: 'Breakout' })).toHaveCount(0);
  });
});
