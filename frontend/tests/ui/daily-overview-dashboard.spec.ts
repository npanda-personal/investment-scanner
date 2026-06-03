import { expect, test, type Page, type Route } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-market-pulse-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        id: 'playwright-market-pulse-user',
        email: 'test@example.com',
        name: 'Test User',
      },
    });
  });
}

function candidate(rank: number) {
  return {
    id: `candidate-${rank}`,
    runId: 'today-run-1',
    instrumentId: `inst-${rank}`,
    symbol: `CAND${String(rank).padStart(2, '0')}`,
    companyName: `Candidate ${rank} Ltd`,
    direction: 'LONG',
    state: 'LONG_REVIEW',
    setupType: 'BREAKOUT',
    strategyCode: 'TREND_BREAKOUT',
    strategyVersion: '1.2.0',
    rank,
    grade: 'A',
    confidenceScore: 80,
    reasonSummary: `Rank ${rank} trigger reason from Today Review evidence.`,
    blockers: [],
    watchReasons: [],
    dataQualitySnapshot: { signalReadinessStatus: 'READY' },
    marketContextSnapshot: null,
    strategyProofSnapshot: null,
    tradePlanSnapshot: null,
    sourceSignalSnapshot: null,
    createdAt: '2026-05-26T05:05:00.000Z',
    updatedAt: '2026-05-26T05:05:00.000Z',
  };
}

function todayReviewPayload() {
  const candidates = [candidate(1), candidate(2)];
  return {
    run: {
      id: 'today-run-1',
      runDate: '2026-05-26T00:00:00.000Z',
      region: 'IN',
      assetType: 'STOCK',
      status: 'COMPLETED',
      trustStatus: 'OK',
      dataThroughDate: '2026-05-26T00:00:00.000Z',
      startedAt: '2026-05-26T05:00:00.000Z',
      finishedAt: '2026-05-26T05:05:00.000Z',
      warnings: [],
      candidateCounts: { LONG_REVIEW: 2 },
      sourceSnapshot: {},
      reviewUniverseMode: 'FULL_REVIEW',
      trustedUniverseCount: 144,
      catalogCount: 300,
      createdAt: '2026-05-26T05:00:00.000Z',
      updatedAt: '2026-05-26T05:05:00.000Z',
      candidates,
    },
    groups: {
      longReview: candidates,
      shortReview: [],
      exitRiskReview: [],
      watchOnly: [],
      blocked: [],
      avoid: [],
      insufficientData: [],
      unproven: [],
    },
    scope: { region: 'IN', assetType: 'STOCK' },
  };
}

function mover(index: number, returnPercent: number) {
  return {
    instrumentId: `mover-${index}`,
    symbol: `${returnPercent >= 0 ? 'GAIN' : 'LOSS'}${String(index).padStart(2, '0')}`,
    companyName: `Mover ${index} Ltd`,
    sector: 'Industrials',
    latestDate: '2026-05-27',
    latestClose: 100 + index,
    baseDate: '2026-05-26',
    baseClose: 100,
    returnPercent,
    priceBasis: 'ADJUSTED_CLOSE',
  };
}

function moversPayload() {
  return {
    scope: { region: 'IN', assetType: 'STOCK' },
    generatedAt: '2026-05-27T05:00:00.000Z',
    ranges: [{
      range: '1D',
      gainers: [mover(1, 0.04), mover(2, 0.03)],
      losers: [mover(3, -0.02), mover(4, -0.01)],
      warnings: [],
    }],
  };
}

function universeHealthPayload() {
  return {
    scope: { region: 'IN', assetType: 'STOCK' },
    generatedAt: '2026-05-27T05:10:00.000Z',
    latestStoredEodDate: '2026-05-26',
    expectedLatestTradingDate: '2026-05-26',
    counts: {
      byUniverseState: {},
      readiness: { priceReady: 180, contextReady: 160, reviewReady: 144 },
      totalCatalogInstruments: 300,
      activeInstruments: 250,
      inactiveOrDelistedInstruments: 50,
      providerSupported: 200,
      providerUnknown: 10,
      providerUnknownValidationNeeded: 0,
      providerRetryValidationNeeded: 0,
      providerUnsupportedExcluded: 0,
      providerValidationFailed: 0,
      unsupported: 0,
      unsupportedExcluded: 0,
      supportedCatalogIdentityRepairNeeded: 0,
      supportedBusinessMetadataRepairNeeded: 0,
      supportedPriceBackfillNeeded: 0,
      catalogOnly: 0,
      priceReady: 180,
      contextReady: 160,
      reviewReady: 144,
      staleOrIncomplete: 5,
      missingLatestPrice: 0,
      staleLatestPrice: 0,
      missingOrInadequatePriceHistory: 0,
      missingRecentVolume: 0,
      missingSector: 0,
      missingIndustry: 0,
      missingCountry: 0,
      missingCurrency: 0,
      missingMarketCap: 0,
      missingIsin: 0,
      missingListingDate: 0,
    },
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
    instruments: [
      {
        id: `${assetType.toLowerCase()}-1`,
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
      },
    ],
    pagination: { page: 1, pageSize: 75, total: 1, totalPages: 1 },
  };
}

async function fulfillMarketIntelligence(route: Route) {
  const url = new URL(route.request().url());
  if (url.pathname.includes('/market-context/persisted-summary')) {
    return route.fulfill({
      json: {
        status: 'ready',
        scope: { region: 'IN' },
        asOf: '2026-05-27T05:15:00.000Z',
        materialized: false,
        summary: {
          regime: { regime: 'RISK_ON', score: 74, explanation: 'Participation is supportive.', updatedAt: '2026-05-27T05:15:00.000Z', dataStatus: 'COMPLETE' },
          topSectors: [{ sector: 'Financial Services', return1M: 0.04, return3M: 0.09, return6M: 0.14, relativeStrengthScore: 78, instrumentCount: 24, bullishSignalCount: 8, bearishSignalCount: 1, leadershipStatus: 'LEADING' }],
          weakSectors: [],
          breadth: { percentAboveSma50: 0.62, percentAboveSma200: 0.54, sma50SampleCount: 220, sma200SampleCount: 180, advanceDeclineRatio: 1.35, newHigh52WeekCount: 18, newLow52WeekCount: 4, bullishSignalCount: 34, bearishSignalCount: 12, instrumentCount: 240, dataStatus: 'COMPLETE' },
          countryStrength: [],
          macro: { interestRateProxy: null, inflationProxy: null, usdStrengthProxy: null, commodityProxy: null, macroStatus: 'UNKNOWN', dataStatus: 'MISSING', explanation: 'Macro providers are not configured yet.' },
          explanation: ['Participation is supportive.'],
          updatedAt: '2026-05-27T05:15:00.000Z',
          dataStatus: 'COMPLETE',
        },
      },
    });
  }
  if (url.pathname.includes('/today-review/latest')) return route.fulfill({ json: todayReviewPayload() });
  if (url.pathname.includes('/market-data/movers')) return route.fulfill({ json: moversPayload() });
  if (url.pathname.includes('/market-data/universe/health')) return route.fulfill({ json: universeHealthPayload() });
  if (url.pathname.includes('/v1/instruments')) return route.fulfill({ json: instrumentsPayload(url.searchParams.get('assetType') || 'STOCK') });
  return route.continue();
}

test.describe('Market Pulse dashboard', () => {
  test('uses read-only snapshots and shows missing states for unavailable market domains', async ({ page }) => {
    await mockAuthenticatedUser(page);
    const requestedPaths: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/')) requestedPaths.push(`${request.method()} ${url.pathname}`);
    });
    await page.route('**/api/v1/today-review/latest**', fulfillMarketIntelligence);
    await page.route('**/api/v1/market-context/persisted-summary**', fulfillMarketIntelligence);
    await page.route('**/api/v1/market-data/movers**', fulfillMarketIntelligence);
    await page.route('**/api/v1/market-data/universe/health**', fulfillMarketIntelligence);
    await page.route('**/api/v1/instruments**', fulfillMarketIntelligence);
    await page.route('**/api/v1/market-context/summary**', async (route) => {
      throw new Error(`Market Pulse must not call ${route.request().url()}`);
    });

    await visitAuthenticated(page, '/');

    await expect(page.getByRole('heading', { name: 'Market Pulse' }).first()).toBeVisible();
    await expect(page.getByText('Market is Supportive')).toBeVisible();
    await expect(page.getByText('Review candidates')).toBeVisible();
    await expect(page.getByText('GAIN01')).toBeVisible();
    await expect(page.getByText('LOSS03')).toBeVisible();
    await expect(page.getByText('Financial Services')).toBeVisible();
    await expect(page.getByText('Index context is not available yet')).toBeVisible();
    await expect(page.getByText('FII/FPI and DII flow data is not available yet')).toBeVisible();
    await expect(page.getByText('Derivatives context is not enabled for this scope yet')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open Daily Review' })).toHaveAttribute('href', '/today-review');

    expect(requestedPaths.some((item) => item.includes('/market-context/summary'))).toBe(false);
    expect(requestedPaths.some((item) => item.includes('/market-context/persisted-summary'))).toBe(true);
    expect(requestedPaths.some((item) => item.startsWith('POST '))).toBe(false);
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/Run Today's Review|Run Daily Pipeline|Generate Plans|Sync Market Data|buy now|sell now|guaranteed|price target|financial advice/i);
  });
});
