import { expect, test, type Page, type Route } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-route-segregation-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        id: 'playwright-route-segregation-user',
        email: 'codex.test@example.com',
        name: 'Codex Test',
      },
    });
  });
}

async function fulfillShellReads(route: Route) {
  const url = new URL(route.request().url());
  if (url.pathname.includes('/today-review/latest')) {
    return route.fulfill({
      json: {
        run: null,
        groups: { longReview: [], shortReview: [], exitRiskReview: [], watchOnly: [], blocked: [], avoid: [], insufficientData: [], unproven: [] },
        scope: { region: 'IN', assetType: 'STOCK' },
      },
    });
  }
  if (url.pathname.includes('/market-data/movers')) {
    return route.fulfill({ json: { scope: { region: 'IN', assetType: 'STOCK' }, generatedAt: '2026-05-27T05:00:00.000Z', ranges: [] } });
  }
  if (url.pathname.includes('/market-data/universe/health')) {
    return route.fulfill({
      json: {
        scope: { region: 'IN', assetType: 'STOCK' },
        generatedAt: '2026-05-27T05:00:00.000Z',
        counts: { reviewReady: 0, totalCatalogInstruments: 0, activeInstruments: 0, priceReady: 0, contextReady: 0, byUniverseState: {}, readiness: { priceReady: 0, contextReady: 0, reviewReady: 0 } },
        coverage: { priceCoveragePercentage: 0, metadataCoveragePercentage: 0, reviewReadyPercentage: 0 },
        topBlockers: [],
        warnings: [],
        trustStatus: 'PARTIAL',
        trustReasons: [],
        universeSignoff: { status: 'FAIL', minReviewReadyRequired: 100, reviewReadyActual: 0, blockers: [], nextAction: null, downstreamAllowed: false },
      },
    });
  }
  if (url.pathname.includes('/v1/instruments')) {
    return route.fulfill({ json: { instruments: [], pagination: { page: 1, pageSize: 75, total: 0, totalPages: 0 } } });
  }
  return route.continue();
}

test.describe('User/admin route segregation', () => {
  test('primary trader routes avoid direct operator paths and shared write calls', async ({ page }) => {
    await mockAuthenticatedUser(page);
    const apiRequests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/')) apiRequests.push(`${request.method()} ${url.pathname}`);
    });
    await page.route('**/api/v1/today-review/latest**', fulfillShellReads);
    await page.route('**/api/v1/market-data/movers**', fulfillShellReads);
    await page.route('**/api/v1/market-data/universe/health**', fulfillShellReads);
    await page.route('**/api/v1/instruments**', fulfillShellReads);

    await visitAuthenticated(page, '/');

    await expect(page.getByRole('heading', { name: 'Market Pulse' }).first()).toBeVisible();
    await expect(page.locator('a[href="/"]').first()).toBeVisible();
    await expect(page.locator('a[href="/market-map"]')).toBeVisible();
    await expect(page.locator('a[href="/indices"]')).toBeVisible();
    await expect(page.locator('a[href="/breadth"]')).toBeVisible();
    await expect(page.locator('a[href="/institutional-flow"]')).toBeVisible();
    await expect(page.locator('a[href="/derivatives-context"]')).toBeVisible();

    await expect(page.locator('a[href="/pipeline-ops"]')).toHaveCount(0);
    await expect(page.locator('a[href="/market-data-foundation"]')).toHaveCount(0);
    await expect(page.locator('a[href="/signals"]')).toHaveCount(0);
    await expect(page.locator('a[href="/signals/calibration"]')).toHaveCount(0);
    await expect(page.locator('a[href="/backtests"]')).toHaveCount(0);
    await expect(page.locator('a[href="/trade-plans"]')).toHaveCount(0);

    await expect(page.locator('a[href="/admin/pipeline-ops"]')).toBeVisible();
    await expect(page.locator('a[href="/admin/market-data-foundation"]')).toBeVisible();
    await expect(page.locator('a[href="/admin/trade-plans"]')).toBeVisible();

    const prohibitedWrites = [
      '/today-review/run',
      '/active/refresh',
      '/pipeline',
      '/sync',
      '/repair',
      '/backfill',
      '/calibration',
      '/generate',
    ];
    expect(apiRequests.filter((item) => item.startsWith('POST ')).filter((item) => prohibitedWrites.some((path) => item.includes(path)))).toEqual([]);
  });
});
