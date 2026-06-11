import { expect, test, type Page } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-market-pulse-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
  });
  // Use trailing ** so the mock matches URLs with appended query params (e.g. ?region=IN&assetType=STOCK)
  await page.route('**/api/v1/auth/me**', async (route) => {
    await route.fulfill({
      json: {
        id: 'playwright-market-pulse-user',
        email: 'test@example.com',
        name: 'Test User',
      },
    });
  });
  // NavigationLayout fires these on every mount — mock to avoid real network calls.
  await page.route('**/api/v1/alerts/events**', async (route) => {
    await route.fulfill({ json: { events: [] } });
  });
  await page.route('**/api/v1/market-context/capital-posture**', async (route) => {
    await route.fulfill({ json: { availability: 'NOT_READY', postureLabel: null, suggestedExposureBand: null, message: 'Not available in test.' } });
  });
}

/** Minimal market-pulse backend response that puts the page into READY state. */
function marketPulseBackendPayload() {
  return {
    availability: 'READY',
    scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d' },
    snapshot: {
      snapshotDate: '2026-05-27',
      dataThroughDate: '2026-05-27',
      generatedAt: '2026-05-27T05:15:00.000Z',
      status: 'HEALTHY',
      marketHealthScore: 74,
      marketHealthLabel: 'Healthy',
      topIndices: [],
      strongSectors: ['Financial Services'],
      weakSectors: [],
      breadthSummary: 'Broad participation: 62% above SMA-50.',
      deliverySummary: 'Delivery participation is adequate.',
      candidateCount: 2,
      warnings: [],
      sourceSummary: { status: 'FRESH', dataThroughDate: '2026-05-27', latestCompletedTradingDate: '2026-05-27' },
      priorHealthScore: null,
      healthScoreHistory: null,
      vixSummary: null,
      advanceDecline: null,
    },
    warnings: [],
  };
}

test.describe('Market Pulse dashboard', () => {
  test('uses read-only snapshots and shows missing states for unavailable market domains', async ({ page }) => {
    await mockAuthenticatedUser(page);
    const requestedPaths: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/')) requestedPaths.push(`${request.method()} ${url.pathname}`);
    });

    // Mock the market-pulse persisted-read endpoint (what MarketPulsePage actually calls)
    await page.route('**/api/v1/market-intelligence/market-pulse**', async (route) => {
      await route.fulfill({ json: marketPulseBackendPayload() });
    });
    // Sector and earnings endpoints are not exercised in this test — let them return unavailable
    await page.route('**/api/v1/market-intelligence/sectors**', async (route) => {
      await route.fulfill({ json: { status: 'unavailable', sectors: [], warnings: [] } });
    });
    await page.route('**/api/v1/market-intelligence/earnings-intelligence**', async (route) => {
      await route.fulfill({ json: { availability: 'EMPTY', snapshot: [], warnings: [] } });
    });
    // The old market-context/summary computation endpoint must never be called
    await page.route('**/api/v1/market-context/summary**', async (route) => {
      throw new Error(`Market Pulse must not call ${route.request().url()}`);
    });

    await visitAuthenticated(page, '/');

    // MarketPulsePage heading is always rendered
    await expect(page.getByRole('heading', { name: 'Market Pulse' }).first()).toBeVisible();
    // Health label from the snapshot
    await expect(page.getByText('Healthy').first()).toBeVisible();
    // Strong sector chip rendered from strongSectors array
    await expect(page.getByText('Financial Services')).toBeVisible();
    // Empty indices show the honest unavailable state
    await expect(page.getByText('No index data available.')).toBeVisible();
    // Breadth summary text from the snapshot
    await expect(page.getByText('Broad participation: 62% above SMA-50.')).toBeVisible();

    // The old computation endpoint must not have been called
    expect(requestedPaths.some((item) => item.includes('/market-context/summary'))).toBe(false);
    // The persisted-read endpoint must have been called
    expect(requestedPaths.some((item) => item.includes('/market-intelligence/market-pulse'))).toBe(true);
    // No mutation (POST) calls allowed on the Market Pulse page
    expect(requestedPaths.some((item) => item.startsWith('POST '))).toBe(false);
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/Run Today's Review|Run Daily Pipeline|Generate Plans|Sync Market Data|buy now|sell now|guaranteed|price target|financial advice/i);
  });
});
