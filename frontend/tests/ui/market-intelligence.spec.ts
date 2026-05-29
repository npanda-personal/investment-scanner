import { expect, test, type Page, type Route } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-market-intelligence-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        id: 'playwright-market-intelligence-user',
        email: 'codex.test@example.com',
        name: 'Codex Test',
      },
    });
  });
}

function persistedMarketContextPayload() {
  return {
    status: 'ready',
    scope: { region: 'IN' },
    asOf: '2026-05-27T05:15:00.000Z',
    materialized: false,
    summary: {
      regime: { regime: 'RISK_ON', score: 74, explanation: 'Participation is supportive.', updatedAt: '2026-05-27T05:15:00.000Z', dataStatus: 'COMPLETE' },
      topSectors: [
        { sector: 'Financial Services', return1M: 0.04, return3M: 0.09, return6M: 0.14, relativeStrengthScore: 78, instrumentCount: 24, bullishSignalCount: 8, bearishSignalCount: 1, leadershipStatus: 'LEADING' },
      ],
      weakSectors: [
        { sector: 'Utilities', return1M: -0.02, return3M: 0.01, return6M: 0.03, relativeStrengthScore: 42, instrumentCount: 10, bullishSignalCount: 1, bearishSignalCount: 4, leadershipStatus: 'LAGGING' },
      ],
      breadth: {
        percentAboveSma50: 0.62,
        percentAboveSma200: 0.54,
        sma50SampleCount: 220,
        sma200SampleCount: 180,
        advanceDeclineRatio: 1.35,
        newHigh52WeekCount: 18,
        newLow52WeekCount: 4,
        bullishSignalCount: 34,
        bearishSignalCount: 12,
        instrumentCount: 240,
        dataStatus: 'COMPLETE',
      },
      countryStrength: [],
      macro: { interestRateProxy: null, inflationProxy: null, usdStrengthProxy: null, commodityProxy: null, macroStatus: 'UNKNOWN', dataStatus: 'MISSING', explanation: 'Macro providers are not configured yet.' },
      explanation: ['Participation is supportive.'],
      updatedAt: '2026-05-27T05:15:00.000Z',
      dataStatus: 'COMPLETE',
    },
  };
}

function missingPersistedMarketContextPayload() {
  return {
    status: 'missing',
    scope: { region: 'IN' },
    asOf: null,
    materialized: false,
    summary: null,
    message: 'Saved market context is not available yet.',
  };
}

function todayReviewPayload() {
  return {
    run: {
      id: 'today-run-1',
      runDate: '2026-05-27T00:00:00.000Z',
      region: 'IN',
      assetType: 'STOCK',
      status: 'COMPLETED',
      trustStatus: 'OK',
      dataThroughDate: '2026-05-27T00:00:00.000Z',
      startedAt: '2026-05-27T05:00:00.000Z',
      finishedAt: '2026-05-27T05:05:00.000Z',
      warnings: [],
      candidateCounts: { LONG_REVIEW: 1 },
      sourceSnapshot: {},
      reviewUniverseMode: 'FULL_REVIEW',
      trustedUniverseCount: 144,
      catalogCount: 300,
      createdAt: '2026-05-27T05:00:00.000Z',
      updatedAt: '2026-05-27T05:05:00.000Z',
      candidates: [],
    },
    groups: { longReview: [], shortReview: [], exitRiskReview: [], watchOnly: [], blocked: [], avoid: [], insufficientData: [], unproven: [] },
    scope: { region: 'IN', assetType: 'STOCK' },
  };
}

function moversPayload() {
  return {
    scope: { region: 'IN', assetType: 'STOCK' },
    generatedAt: '2026-05-27T05:00:00.000Z',
    ranges: [{
      range: '1D',
      gainers: [{ instrumentId: 'stock-1', symbol: 'ALPHA', companyName: 'Alpha Ltd', sector: 'Financial Services', latestDate: '2026-05-27', latestClose: 120, baseDate: '2026-05-26', baseClose: 115, returnPercent: 0.043 }],
      losers: [{ instrumentId: 'stock-2', symbol: 'BETA', companyName: 'Beta Ltd', sector: 'Utilities', latestDate: '2026-05-27', latestClose: 85, baseDate: '2026-05-26', baseClose: 88, returnPercent: -0.034 }],
      warnings: [],
    }],
  };
}

function universeHealthPayload() {
  return {
    scope: { region: 'IN', assetType: 'STOCK' },
    generatedAt: '2026-05-27T05:10:00.000Z',
    counts: { reviewReady: 144, totalCatalogInstruments: 300, activeInstruments: 250, priceReady: 180, contextReady: 160, byUniverseState: {}, readiness: { priceReady: 180, contextReady: 160, reviewReady: 144 } },
    coverage: { priceCoveragePercentage: 90, metadataCoveragePercentage: 88, reviewReadyPercentage: 48 },
    topBlockers: [],
    warnings: [],
    trustStatus: 'OK',
    trustReasons: ['Trusted baseline ready.'],
    universeSignoff: { status: 'PASS', minReviewReadyRequired: 100, reviewReadyActual: 144, blockers: [], nextAction: null, downstreamAllowed: true },
  };
}

function instrumentsPayload(assetType: string) {
  return {
    instruments: [{
      id: assetType === 'INDEX' ? 'index-1' : 'stock-1',
      symbol: assetType === 'INDEX' ? 'NIFTY 50' : 'ALPHA',
      company_name: assetType === 'INDEX' ? 'Nifty 50 Index' : 'Alpha Ltd',
      display_symbol: assetType === 'INDEX' ? 'NIFTY 50' : 'ALPHA',
      exchange: 'NSE',
      country: 'IN',
      region: 'IN',
      sector: assetType === 'INDEX' ? null : 'Financial Services',
      industry: null,
      currency: 'INR',
      market_cap: 100000,
      asset_type: assetType,
      instrument_segment: assetType,
      derivatives_eligible: assetType !== 'INDEX',
      is_active: true,
      is_delisted: false,
      ipo_date: null,
      isin: null,
      source: 'LOCAL_TEST',
      ingestion_timestamp: '2026-05-27T05:00:00.000Z',
      last_updated_timestamp: '2026-05-27T05:00:00.000Z',
      data_status: 'COMPLETE',
    }],
    pagination: { page: 1, pageSize: 75, total: 1, totalPages: 1 },
  };
}

async function fulfillMarketReads(route: Route, persistedMarketContext = persistedMarketContextPayload()) {
  const url = new URL(route.request().url());
  if (url.pathname.includes('/market-context/persisted-summary')) return route.fulfill({ json: persistedMarketContext });
  if (url.pathname.includes('/today-review/latest')) return route.fulfill({ json: todayReviewPayload() });
  if (url.pathname.includes('/market-data/movers')) return route.fulfill({ json: moversPayload() });
  if (url.pathname.includes('/market-data/universe/health')) return route.fulfill({ json: universeHealthPayload() });
  if (url.pathname.includes('/v1/instruments')) return route.fulfill({ json: instrumentsPayload(url.searchParams.get('assetType') || 'STOCK') });
  return route.continue();
}

async function setupMarketPage(page: Page, options: { persistedMarketContext?: ReturnType<typeof persistedMarketContextPayload> | ReturnType<typeof missingPersistedMarketContextPayload> } = {}) {
  const apiRequests: string[] = [];
  const persistedMarketContext = options.persistedMarketContext ?? persistedMarketContextPayload();
  await mockAuthenticatedUser(page);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.includes('/api/')) apiRequests.push(`${request.method()} ${url.pathname}`);
  });
  await page.route('**/api/v1/market-context/persisted-summary**', (route) => fulfillMarketReads(route, persistedMarketContext));
  await page.route('**/api/v1/today-review/latest**', (route) => fulfillMarketReads(route, persistedMarketContext));
  await page.route('**/api/v1/market-data/movers**', (route) => fulfillMarketReads(route, persistedMarketContext));
  await page.route('**/api/v1/market-data/universe/health**', (route) => fulfillMarketReads(route, persistedMarketContext));
  await page.route('**/api/v1/instruments**', (route) => fulfillMarketReads(route, persistedMarketContext));
  await page.route('**/api/v1/market-context/summary**', async (route) => {
    throw new Error(`Trader page must not call materializing summary: ${route.request().url()}`);
  });
  return apiRequests;
}

async function expectNoSharedWritesOrDeveloperCopy(page: Page, apiRequests: string[]) {
  expect(apiRequests.some((item) => item.includes('/market-context/summary'))).toBe(false);
  expect(apiRequests.some((item) => item.startsWith('POST '))).toBe(false);
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/persisted-only|materializ|not wired|endpoint|read model|shared analysis pipeline|downstream|implementation|IndexContextSnapshot|BreadthSnapshot|InstitutionalFlowSnapshot|DerivativesContextSnapshot|Product Owner approval/i);
  expect(body).not.toMatch(/buy now|sell now|guaranteed|price target|profit target|financial advice|option strategy recommendation/i);
}

test.describe('Market Intelligence user pages', () => {
  test('Market Pulse uses persisted market-context read and never calls materializing summary', async ({ page }) => {
    const apiRequests = await setupMarketPage(page);

    await visitAuthenticated(page, '/market-pulse');

    await expect(page.getByRole('heading', { name: 'Market Pulse' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Financial Services' })).toBeVisible();
    await expect.poll(() => apiRequests.some((item) => item.includes('/market-context/persisted-summary'))).toBe(true);
    await expectNoSharedWritesOrDeveloperCopy(page, apiRequests);
  });

  test('Market Pulse shows an honest gap when persisted market context is missing', async ({ page }) => {
    const apiRequests = await setupMarketPage(page, { persistedMarketContext: missingPersistedMarketContextPayload() });

    await visitAuthenticated(page, '/market-pulse');

    await expect(page.getByRole('heading', { name: 'Market Pulse' }).first()).toBeVisible();
    await expect(page.getByText('Market is Unavailable')).toBeVisible();
    await expect(page.getByText('Persisted market evidence is unavailable for this scope.').first()).toBeVisible();
    await expect(page.getByText('Market context evidence: missing')).toBeVisible();
    await expect(page.getByText('Sector rotation snapshot unavailable')).toBeVisible();
    await expect.poll(() => apiRequests.some((item) => item.includes('/market-context/persisted-summary'))).toBe(true);
    await expectNoSharedWritesOrDeveloperCopy(page, apiRequests);
  });

  test('Indices Workspace renders source or missing state without shared writes', async ({ page }) => {
    const apiRequests = await setupMarketPage(page);

    await visitAuthenticated(page, '/indices');

    await expect(page.getByRole('heading', { name: 'Indices Workspace' }).first()).toBeVisible();
    await expect(page.getByText('NIFTY 50').first()).toBeVisible();
    await expectNoSharedWritesOrDeveloperCopy(page, apiRequests);
  });

  test('Breadth And Participation renders denominator-aware breadth context', async ({ page }) => {
    const apiRequests = await setupMarketPage(page);

    await visitAuthenticated(page, '/breadth');

    await expect(page.getByRole('heading', { name: 'Breadth And Participation' }).first()).toBeVisible();
    await expect(page.getByText('Sample: 220')).toBeVisible();
    await expect(page.getByText('Sample: 180')).toBeVisible();
    await expectNoSharedWritesOrDeveloperCopy(page, apiRequests);
  });

  test('Institutional Flow shows unavailable state without recommendation language', async ({ page }) => {
    const apiRequests = await setupMarketPage(page);

    await visitAuthenticated(page, '/institutional-flow');

    await expect(page.getByRole('heading', { name: 'Institutional Flow' }).first()).toBeVisible();
    await expect(page.getByText('FII/FPI and DII flow data is not available yet')).toBeVisible();
    await expectNoSharedWritesOrDeveloperCopy(page, apiRequests);
  });

  test('Derivatives Context stays unavailable and read-only until enabled', async ({ page }) => {
    const apiRequests = await setupMarketPage(page);

    await visitAuthenticated(page, '/derivatives-context');

    await expect(page.getByRole('heading', { name: 'Derivatives Context' }).first()).toBeVisible();
    await expect(page.getByText('Derivatives context is not enabled for this scope yet')).toBeVisible();
    await expectNoSharedWritesOrDeveloperCopy(page, apiRequests);
  });

  test('Market Map renders catalog evidence and drilldown links without shared writes', async ({ page }) => {
    const apiRequests = await setupMarketPage(page);

    await visitAuthenticated(page, '/market-map');

    await expect(page.getByRole('heading', { name: 'Market Map' }).first()).toBeVisible();
    await expect(page.locator('a[href="/stocks/stock-1"]').first()).toBeVisible();
    await expectNoSharedWritesOrDeveloperCopy(page, apiRequests);
  });
});
