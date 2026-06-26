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

    // Select Bullish → the 9 bullish setup sub-tabs (plus "All Bullish") appear.
    await page.getByRole('tab', { name: 'Bullish' }).click();
    await expect(page.getByRole('tab', { name: 'All Bullish' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Breakout' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Trend Momentum' })).toBeVisible();
    // The omnibus "Quality / Value / Growth" tab was split into distinct Quality and Growth tabs.
    await expect(page.getByRole('tab', { name: 'Quality', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Growth', exact: true })).toBeVisible();

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
    // Weak Fundamentals was split, adding an Earnings Decline tab (mirror of bullish Growth).
    await expect(page.getByRole('tab', { name: 'Earnings Decline', exact: true })).toBeVisible();
    // Bullish-only setup is no longer offered under Bearish.
    await expect(page.getByRole('tab', { name: 'Breakout' })).toHaveCount(0);
  });

  /**
   * Direction-aware default sort (dev b008d995). `score` is a DIRECTIONAL 0-100 scale
   * (>=60 BULLISH, <=40 BEARISH), so "strongest conviction first" is score DESC for
   * Bullish but ASC for Bearish (lowest score = most bearish). The fix lives in two
   * layers — the backend ORDER BY *and* the FE client-side default sort on tab switch —
   * so this drives the REAL stack (no API mock) to prove the rendered order end-to-end.
   */
  test('Bearish tab renders most-bearish (lowest score) first; Bullish renders highest first', async ({ page }) => {
    // Pin India/STOCK so the equity ScreenerPage renders (crypto → CryptoSignalBoard).
    await page.addInitScript(() => {
      window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
    });
    await visitAuthenticated(page, '/screener');

    // Each row's SignalChip label is `${direction} ${roundedScore}` — read them in row order.
    const scoresFor = async (direction: 'BULLISH' | 'BEARISH'): Promise<number[]> => {
      const labels = await page.locator('table tbody .MuiChip-label').allInnerTexts();
      return labels
        .map((t) => t.match(new RegExp(`${direction}\\s+(\\d+)`)))
        .filter((m): m is RegExpMatchArray => Boolean(m))
        .map((m) => Number(m[1]));
    };

    // --- Bearish: expect ASCENDING (most bearish, lowest score, first) ---
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/market-data/screener') && r.url().includes('signalDirection=BEARISH') && r.status() === 200,
      ),
      page.getByRole('tab', { name: 'Bearish', exact: true }).click(),
    ]);
    // Wait until the table has re-rendered with bearish rows (no bullish chips left over).
    await expect.poll(async () => (await scoresFor('BULLISH')).length).toBe(0);
    const bearish = await scoresFor('BEARISH');
    expect(bearish.length).toBeGreaterThan(1);
    expect(bearish).toEqual([...bearish].sort((a, b) => a - b)); // non-decreasing
    expect(bearish[0]).toBeLessThanOrEqual(40); // genuinely bearish leads, not a score-40 near-neutral

    // --- Bullish: expect DESCENDING (most bullish, highest score, first) — unchanged behavior ---
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/market-data/screener') && r.url().includes('signalDirection=BULLISH') && r.status() === 200,
      ),
      page.getByRole('tab', { name: 'Bullish', exact: true }).click(),
    ]);
    await expect.poll(async () => (await scoresFor('BEARISH')).length).toBe(0);
    const bullish = await scoresFor('BULLISH');
    expect(bullish.length).toBeGreaterThan(1);
    expect(bullish).toEqual([...bullish].sort((a, b) => b - a)); // non-increasing
    expect(bullish[0]).toBeGreaterThanOrEqual(60);
  });
});
