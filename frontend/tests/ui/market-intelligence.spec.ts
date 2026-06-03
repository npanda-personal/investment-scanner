import { expect, test, type Page } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

const traderNavLabels = [
  'Market Pulse',
  'Daily Review Shortlist',
  'Stock Interest Radar',
  'Earnings Intelligence',
  'Compounder Radar',
  'Trader Setup Radar',
  'Risk Radar',
  'Watchlists',
  'Portfolios',
  'Alerts',
  'Instrument Workspace',
];

const hiddenTraderLabels = [
  'Market Map',
  'Breadth',
  'Institutional Flow',
  'Derivatives Context',
  'Research Workbench',
  'Research Hub',
  'Data Ingestion',
  'Provider Validation',
  'Backfill',
  'Repair',
  'Signal Generation',
  'Strategy Evaluation',
  'Pipeline Controls',
  'Pipeline Ops',
  'Market Data Ops',
  'Admin / Data Ops',
];

const emptyEarningsCategories = {
  UPCOMING_RESULTS: [],
  PRE_RESULT_INTEREST: [],
  RESULT_WINNERS: [],
  RESULT_DISAPPOINTMENTS: [],
  RESULT_REACTION_HISTORY: [],
  EARNINGS_WATCHLIST: [],
};

type MarketIntelligenceResponses = {
  marketPulse?: unknown;
  sectors?: unknown;
  stockInterest?: unknown;
  earnings?: unknown;
  todayReview?: unknown;
  reviewReadiness?: unknown;
  dataQualitySummary?: unknown;
  activeLedger?: unknown;
  portfolios?: unknown;
  portfolioSummaries?: Record<string, unknown>;
  watchlists?: unknown;
  watchlistDetails?: Record<string, unknown>;
};

function defaultResponses(): Required<MarketIntelligenceResponses> {
  return {
    marketPulse: {
      availability: 'EMPTY',
      scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d' },
      snapshot: null,
      message: 'Market Pulse snapshot is not available for this scope.',
      warnings: ['No fake rows are shown.'],
    },
    sectors: {
      status: 'missing',
      scope: { region: 'IN', assetType: 'STOCK' },
      snapshotDate: null,
      dataThroughDate: null,
      generatedAt: '2026-06-01T05:45:00.000Z',
      materialized: true,
      sourceLabels: { sectorIndexes: 'Persisted sector index catalog rows', prices: 'Persisted PriceTick rows' },
      warnings: ['No persisted SectorSnapshot rows exist for this scope.'],
      sectors: [],
    },
    stockInterest: {
      availability: 'EMPTY',
      scope: { region: 'IN', assetType: 'STOCK' },
      snapshot: null,
      message: 'Stock Interest snapshot is not available for this scope.',
      warnings: ['No fake rows are shown.'],
    },
    earnings: {
      scope: { region: 'IN', assetType: 'STOCK' },
      snapshotDate: null,
      dataThroughDate: null,
      generatedAt: '2026-06-01T05:45:00.000Z',
      freshness: 'NO_SNAPSHOT',
      categories: emptyEarningsCategories,
      items: [],
      warnings: ['No fake rows are shown.'],
    },
    todayReview: {
      run: null,
      groups: { longReview: [], shortReview: [], exitRiskReview: [], watchOnly: [], specialCases: [], blocked: [], avoid: [], insufficientData: [], unproven: [] },
      scope: { region: 'IN', assetType: 'STOCK' },
    },
    reviewReadiness: {
      scope: { region: 'IN', assetType: 'STOCK' },
      reviewMode: 'NO_REVIEW',
      trustStatus: 'NOT_TRUSTWORTHY',
      userDecision: 'REPAIR_DATA',
      reviewUniverse: {
        catalogCount: 0,
        providerSupportedCount: 0,
        trustedCount: 0,
        targetTradingDate: null,
        requiredDataThroughDate: null,
        storedDataThroughDate: null,
      },
      readinessCounts: {
        priceReady: 0,
        reviewReady: 0,
        missingLatestPrice: 0,
        staleLatestPrice: 0,
        inadequateHistory: 0,
        missingRecentVolume: 0,
      },
      nextAction: null,
      blockers: [],
    },
    dataQualitySummary: {
      totalInstruments: 0,
      goodCoverageCount: 0,
      partialCoverageCount: 0,
      poorCoverageCount: 0,
      unusableCoverageCount: 0,
      signalReadyCount: 0,
      notSignalReadyCount: 0,
      stalePriceCount: 0,
      missingFundamentalsCount: 0,
      missingSectorCount: 0,
      missingIndustryCount: 0,
      missingCountryCount: 0,
      lowLiquidityCount: 0,
      missingVolumeCount: 0,
      latestEvaluationAt: null,
      dataStatus: 'MISSING',
    },
    activeLedger: {
      items: [],
      totalCount: 0,
      limit: 100,
      offset: 0,
      nextOffset: null,
      hasMore: false,
      scope: { region: 'IN', assetType: 'STOCK' },
      refresh: {
        runId: null,
        status: 'IDLE',
        totalCount: 0,
        processedCount: 0,
        succeededCount: 0,
        failedCount: 0,
        skippedCount: 0,
        materializedRowCount: 0,
        startedAt: null,
        completedAt: null,
        updatedAt: null,
        warnings: [],
        errors: [],
      },
      warnings: [],
    },
    portfolios: { portfolios: [] },
    portfolioSummaries: {},
    watchlists: { watchlists: [] },
    watchlistDetails: {},
  };
}

async function setupReadOnlyPage(page: Page, responses: MarketIntelligenceResponses = {}) {
  const apiRequests: string[] = [];
  const nextResponses = { ...defaultResponses(), ...responses };

  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-market-intelligence-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
  });

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) apiRequests.push(`${request.method()} ${url.pathname}${url.search}`);
  });

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === '/api/v1/auth/me') {
      await route.fulfill({
        json: {
          id: 'playwright-market-intelligence-user',
          email: 'test@example.com',
          name: 'Test User',
        },
      });
      return;
    }

    if (request.method() !== 'GET') {
      throw new Error(`Trader read-model page must not mutate backend state: ${request.method()} ${request.url()}`);
    }

    const implementedReads: Record<string, unknown> = {
      '/api/v1/market-intelligence/market-pulse': nextResponses.marketPulse,
      '/api/v1/market-intelligence/sectors': nextResponses.sectors,
      '/api/v1/market-intelligence/stock-interest': nextResponses.stockInterest,
      '/api/v1/market-intelligence/earnings': nextResponses.earnings,
      '/api/v1/today-review/latest': nextResponses.todayReview,
      '/api/v1/market-data/review-readiness-summary': nextResponses.reviewReadiness,
      '/api/v1/data-quality/summary': nextResponses.dataQualitySummary,
      '/api/v1/signals/position-ledger/persisted/active': nextResponses.activeLedger,
      '/api/v1/portfolios': nextResponses.portfolios,
      '/api/v1/watchlists': nextResponses.watchlists,
    };

    if (path in implementedReads) {
      await route.fulfill({ json: implementedReads[path] });
      return;
    }

    const portfolioSummaryMatch = path.match(/^\/api\/v1\/portfolios\/([^/]+)\/summary$/);
    if (portfolioSummaryMatch) {
      await route.fulfill({ json: nextResponses.portfolioSummaries[portfolioSummaryMatch[1]] || { error: 'Portfolio summary not mocked.' } });
      return;
    }

    const watchlistDetailMatch = path.match(/^\/api\/v1\/watchlists\/([^/]+)$/);
    if (watchlistDetailMatch) {
      await route.fulfill({ json: nextResponses.watchlistDetails[watchlistDetailMatch[1]] || { error: 'Watchlist detail not mocked.' } });
      return;
    }

    throw new Error(`Unexpected trader read-model API request: ${request.method()} ${request.url()}`);
  });

  return apiRequests;
}

async function expectNoSharedMutationsOrOperatorControls(page: Page, apiRequests: string[]) {
  const prohibitedRequest = /(sync|repair|backfill|import|generate|evaluate|calibrat|pipeline|provider|refresh|run)/i;
  expect(apiRequests.filter((item) => !item.includes('/api/v1/auth/me')).filter((item) => /^(POST|PATCH|DELETE) /.test(item))).toEqual([]);
  expect(apiRequests.filter((item) => prohibitedRequest.test(item))).toEqual([]);

  const main = await page.locator('main').innerText();
  expect(main).not.toMatch(/buy now|sell now|guaranteed|profit target|price target|financial advice|must buy|must sell|broker order/i);
  expect(main).not.toMatch(/\b(import|sync|repair|backfill|generate|evaluate|calibrate)\b|run pipeline|provider validation|pipeline control/i);
}

test.describe('Market Intelligence persisted read-model pages', () => {
  test('primary trader navigation is the required workflow set only', async ({ page }) => {
    await setupReadOnlyPage(page);

    await visitAuthenticated(page, '/market-pulse');

    const drawerLinks = page.locator('.MuiDrawer-paper a[href]');
    await expect(drawerLinks).toHaveCount(traderNavLabels.length);
    await expect(drawerLinks).toHaveText(traderNavLabels);

    for (const label of hiddenTraderLabels) {
      await expect(page.locator('.MuiDrawer-paper').getByText(label, { exact: true })).toHaveCount(0);
    }
  });

  test('empty and future pages show honest unavailable states without side-effect calls', async ({ page }) => {
    const apiRequests = await setupReadOnlyPage(page);
    const routes = [
      ['/market-pulse', 'Market Pulse', 'Market Pulse snapshot is not available for this scope.'],
      ['/stock-interest-radar', 'Stock Interest Radar', 'Stock Interest snapshot is not available for this scope.'],
      ['/earnings-intelligence', 'Earnings Intelligence', 'Earnings Intelligence snapshot is not available for this scope.'],
      ['/compounder-radar', 'Compounder Radar', 'Compounder Radar backend not available yet.'],
      ['/trader-setup-radar', 'Trader Setup Radar', 'Trader Setup Radar backend not available yet.'],
      ['/risk-radar', 'Risk Radar', 'Risk Radar backend not available yet.'],
      ['/instrument-workspace', 'Instrument Workspace', 'Instrument Context backend not available yet.'],
    ];

    for (const [path, heading, missingText] of routes) {
      await visitAuthenticated(page, path);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
      await expect(page.getByText(missingText).first()).toBeVisible();
      await expect(page.getByText('No fake rows are shown.').first()).toBeVisible();
      await expectNoSharedMutationsOrOperatorControls(page, apiRequests);
    }
  });

  test('Market Pulse renders backend snapshot, sector rows, PARTIAL state, and warnings', async ({ page }) => {
    const apiRequests = await setupReadOnlyPage(page, {
      marketPulse: {
        availability: 'READY',
        scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d' },
        snapshot: {
          snapshotDate: '2026-06-01',
          dataThroughDate: '2026-05-31',
          generatedAt: '2026-06-01T05:45:00.000Z',
          status: 'PARTIAL',
          marketHealthScore: 95,
          marketHealthLabel: 'FRAGILE',
          indexTrendScore: 80,
          sectorStrengthScore: 70,
          breadthScore: 55,
          deliveryParticipationScore: 40,
          dataFreshnessScore: 60,
          topIndices: [{ symbol: 'NIFTY 50', label: 'Nifty 50', value: 22900, changePercent: 0.012, return1W: 0.02, return1M: 0.04, return3M: 0.06, score: 90, freshness: 'FRESH' }],
          strongSectors: ['Energy'],
          weakSectors: ['Financial Services'],
          breadthSummary: 'Backend says breadth is narrow.',
          deliverySummary: 'Backend says delivery participation is light.',
          candidateCount: 3,
          warnings: ['Backend warning is displayed verbatim.'],
          sourceSummary: { status: 'PARTIAL', dataThroughDate: '2026-05-31', latestCompletedTradingDate: '2026-05-31' },
        },
        message: 'Persisted Market Pulse snapshot loaded.',
        warnings: ['Backend warning is displayed verbatim.'],
      },
      sectors: {
        status: 'ready',
        scope: { region: 'IN', assetType: 'STOCK' },
        snapshotDate: '2026-06-01',
        dataThroughDate: '2026-05-31',
        generatedAt: '2026-06-01T05:45:00.000Z',
        materialized: true,
        sourceLabels: { sectorIndexes: 'Persisted sector index catalog rows', prices: 'Persisted PriceTick rows' },
        warnings: ['Sector backend warning.'],
        sectors: [
          {
            snapshotDate: '2026-06-01',
            dataThroughDate: '2026-05-31',
            sector: 'Energy',
            classification: 'STRONG',
            sectorScore: 88,
            return1W: 3.25,
            return1M: 7.5,
            return3M: 11.2,
            trendScore: 82,
            reasonTags: ['POSITIVE_1M_RETURN'],
            warnings: [],
          },
        ],
      },
    });

    await visitAuthenticated(page, '/market-pulse');

    await expect(page.getByText('Fragile').first()).toBeVisible();
    await expect(page.getByText('Partial').first()).toBeVisible();
    await expect(page.getByText('Backend says breadth is narrow.')).toBeVisible();
    await expect(page.getByText('Backend warning is displayed verbatim.').first()).toBeVisible();
    await expect(page.getByText('Sector Intelligence')).toBeVisible();
    await expect(page.getByText('Energy').first()).toBeVisible();
    await expect(page.getByText('POSITIVE_1M_RETURN')).toBeVisible();
    await expect(page.getByText('+7.5%')).toBeVisible();
    await expectNoSharedMutationsOrOperatorControls(page, apiRequests);
  });

  test('Stock Interest maps backend categories to tabs, preserves row order, and handles empty tabs', async ({ page }) => {
    const apiRequests = await setupReadOnlyPage(page, {
      stockInterest: {
        availability: 'READY',
        scope: { region: 'IN', assetType: 'STOCK' },
        snapshot: [
          {
            snapshotDate: '2026-06-01',
            dataThroughDate: '2026-05-31',
            generatedAt: '2026-06-01T05:45:00.000Z',
            score: 12,
            symbol: 'LOWFIRST',
            company: 'Low First Ltd',
            sector: 'Industrials',
            category: 'TODAY_TOP_INTEREST',
            direction: 'Watch',
            reasonTags: ['backend-order-first'],
            riskTags: ['thin-history'],
            freshness: 'FRESH',
            warnings: [],
          },
          {
            snapshotDate: '2026-06-01',
            dataThroughDate: '2026-05-31',
            generatedAt: '2026-06-01T05:45:00.000Z',
            score: 98,
            symbol: 'HIGHSECOND',
            company: 'High Second Ltd',
            sector: 'Financial Services',
            category: 'TODAY_TOP_INTEREST',
            direction: 'Bullish trigger',
            reasonTags: ['backend-order-second'],
            riskTags: ['event-risk'],
            freshness: 'FRESH',
            warnings: [],
          },
          {
            snapshotDate: '2026-06-01',
            dataThroughDate: '2026-05-31',
            generatedAt: '2026-06-01T05:45:00.000Z',
            score: 8,
            symbol: 'RISKROW',
            company: 'Risk Row Ltd',
            sector: 'Materials',
            category: 'RISK_AVOID',
            direction: 'Risk warning',
            reasonTags: ['weak-context'],
            riskTags: ['negative-trend'],
            freshness: 'STALE',
            warnings: ['stale-stock-interest-row'],
          },
        ],
        message: 'Persisted Stock Interest snapshot rows loaded.',
        warnings: ['3 row-level Stock Interest data warnings across 1 symbols.'],
      },
    });

    await visitAuthenticated(page, '/stock-interest-radar');

    const rows = page.locator('tbody tr');
    await expect(rows.nth(0)).toContainText('LOWFIRST');
    await expect(rows.nth(1)).toContainText('HIGHSECOND');
    await expect(page.getByText('backend-order-first')).toBeVisible();
    await expect(page.getByText('event-risk')).toBeVisible();
    await expect(page.getByText('3 row-level Stock Interest data warnings across 1 symbols.')).toBeVisible();
    await expect(page.getByText('stale-stock-interest-row')).toHaveCount(0);
    await expect(page.getByText('RISKROW')).toHaveCount(0);

    await page.getByRole('tab', { name: 'Risk / Avoid' }).click();
    await expect(page.getByText('RISKROW')).toBeVisible();
    await expect(page.getByText('negative-trend')).toBeVisible();
    await expect(page.getByText('stale-stock-interest-row')).toHaveCount(0);

    await page.getByRole('tab', { name: 'Growth Consistency' }).click();
    await expect(page.getByText('No Growth Consistency rows were present in the backend snapshot.')).toBeVisible();
    await expectNoSharedMutationsOrOperatorControls(page, apiRequests);
  });

  test('Daily Review Shortlist shows count, source contribution, explainability, overlays, and active exclusions', async ({ page }) => {
    const todayCandidate = {
      id: 'today-omega',
      runId: 'run-shortlist',
      instrumentId: 'instrument-omega',
      symbol: 'OMEGA',
      companyName: 'Omega Capital',
      direction: 'LONG',
      state: 'LONG_REVIEW',
      setupType: 'BREAKOUT',
      strategyCode: 'TREND_MOMENTUM',
      strategyVersion: '1.0.0',
      rank: 1,
      grade: 'A',
      confidenceScore: 84,
      reasonSummary: 'Rule-backed bullish review candidate with current data-quality evidence.',
      blockers: [],
      watchReasons: [],
      dataQualitySnapshot: {
        sector: 'Energy',
        signalReadinessStatus: 'READY',
        coverageStatus: 'GOOD',
        warnings: [],
        readinessReasons: ['TRUSTED_BASELINE_READY'],
        useCaseTiers: {
          dailyReview: { status: 'READY', reasons: ['TRUSTED_BASELINE_READY'] },
        },
      },
      explainability: {
        watchReasons: [],
        blockers: [],
      },
      boardReason: 'Today Review source rank.',
      createdAt: '2026-06-02T06:00:00.000Z',
      updatedAt: '2026-06-02T06:00:00.000Z',
    };
    const activeFilteredCandidate = {
      ...todayCandidate,
      id: 'today-alpha',
      instrumentId: 'instrument-alpha',
      symbol: 'ALPHA',
      companyName: 'Alpha Holdings',
      rank: 2,
      reasonSummary: 'Should be excluded because a normal active ledger row already exists.',
    };
    const blockedCandidate = {
      ...todayCandidate,
      id: 'today-blocked',
      instrumentId: 'instrument-blocked',
      symbol: 'BLOCKED',
      companyName: 'Blocked Ltd',
      state: 'BLOCKED',
      direction: 'BLOCKED',
      reasonSummary: 'Blocked by data-quality readiness.',
      blockers: ['Daily review data-quality tier is blocked.'],
      watchReasons: [],
    };
    const apiRequests = await setupReadOnlyPage(page, {
      marketPulse: {
        availability: 'READY',
        scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d' },
        snapshot: {
          snapshotDate: '2026-06-02',
          dataThroughDate: '2026-06-01',
          generatedAt: '2026-06-02T06:00:00.000Z',
          status: 'FRESH',
          marketHealthScore: 82,
          marketHealthLabel: 'TRADABLE_BUT_SELECTIVE',
          topIndices: [],
          strongSectors: ['Energy'],
          weakSectors: ['Financial Services'],
          breadthSummary: 'Selective breadth.',
          deliverySummary: 'Delivery participation available.',
          candidateCount: 4,
          warnings: [],
          sourceSummary: { status: 'FRESH', dataThroughDate: '2026-06-01', latestCompletedTradingDate: '2026-06-01' },
        },
        message: 'Persisted Market Pulse snapshot loaded.',
        warnings: [],
      },
      todayReview: {
        run: {
          id: 'run-shortlist',
          runDate: '2026-06-02',
          region: 'IN',
          assetType: 'STOCK',
          status: 'COMPLETED',
          trustStatus: 'OK',
          dataThroughDate: '2026-06-01',
          warnings: [],
          candidateCounts: { LONG_REVIEW: 2, BLOCKED: 1 },
          sourceSnapshot: {},
          candidates: [todayCandidate, activeFilteredCandidate, blockedCandidate],
        },
        groups: {
          longReview: [todayCandidate, activeFilteredCandidate],
          shortReview: [],
          exitRiskReview: [],
          watchOnly: [],
          specialCases: [],
          blocked: [blockedCandidate],
          avoid: [],
          insufficientData: [],
          unproven: [],
        },
        scope: { region: 'IN', assetType: 'STOCK' },
      },
      stockInterest: {
        availability: 'READY',
        scope: { region: 'IN', assetType: 'STOCK' },
        snapshot: [
          {
            snapshotDate: '2026-06-02',
            dataThroughDate: '2026-06-01',
            generatedAt: '2026-06-02T06:00:00.000Z',
            score: 71,
            symbol: 'GAMMA',
            company: 'Gamma Industries',
            sector: 'Energy',
            category: 'TODAY_TOP_INTEREST',
            direction: 'Review',
            reasonTags: ['backend-interest-order'],
            riskTags: [],
            freshness: 'FRESH',
            warnings: [],
          },
          {
            snapshotDate: '2026-06-02',
            dataThroughDate: '2026-06-01',
            generatedAt: '2026-06-02T06:00:00.000Z',
            score: 10,
            symbol: 'RISKROW',
            company: 'Risk Row Ltd',
            sector: 'Financial Services',
            category: 'RISK_AVOID',
            direction: 'Risk warning',
            reasonTags: ['weak-context'],
            riskTags: ['stale-data-risk'],
            freshness: 'STALE',
            warnings: ['risk row warning'],
          },
        ],
        message: 'Persisted Stock Interest snapshot rows loaded.',
        warnings: [],
      },
      earnings: {
        scope: { region: 'IN', assetType: 'STOCK' },
        snapshotDate: '2026-06-02',
        dataThroughDate: '2026-06-01',
        generatedAt: '2026-06-02T06:00:00.000Z',
        freshness: 'FRESH',
        categories: {
          ...emptyEarningsCategories,
          EARNINGS_WATCHLIST: [
            {
              id: 'earnings-omega',
              snapshotDate: '2026-06-02',
              dataThroughDate: '2026-06-01',
              symbol: 'OMEGA',
              resultDate: null,
              resultDateSource: 'MANUAL_VERIFIED',
              periodEndDate: '2026-03-31',
              validatedAt: '2026-05-30',
              revenueGrowth: 12,
              profitGrowth: 8,
              epsGrowth: 7,
              marginTrend: 1,
              consistencyScore: 70,
              accelerationScore: 68,
              categories: ['EARNINGS_WATCHLIST'],
              reasonTags: ['verified-fundamentals'],
              riskTags: [],
              warnings: [],
              freshness: 'FRESH',
            },
          ],
        },
        items: [],
        warnings: [],
      },
      reviewReadiness: {
        scope: { region: 'IN', assetType: 'STOCK' },
        reviewMode: 'FULL_REVIEW',
        trustStatus: 'OK',
        userDecision: 'READY_FOR_REVIEW',
        reviewUniverse: {
          catalogCount: 3000,
          providerSupportedCount: 600,
          trustedCount: 144,
          targetTradingDate: '2026-06-03',
          requiredDataThroughDate: '2026-06-02',
          storedDataThroughDate: '2026-06-02',
        },
        blockers: [],
      },
      dataQualitySummary: {
        totalInstruments: 144,
        goodCoverageCount: 120,
        partialCoverageCount: 24,
        poorCoverageCount: 0,
        unusableCoverageCount: 0,
        signalReadyCount: 118,
        notSignalReadyCount: 26,
        stalePriceCount: 0,
        missingFundamentalsCount: 8,
        missingSectorCount: 0,
        missingIndustryCount: 0,
        missingCountryCount: 0,
        lowLiquidityCount: 3,
        missingVolumeCount: 0,
        latestEvaluationAt: '2026-06-02T06:00:00.000Z',
        dataStatus: 'COMPLETE',
      },
      activeLedger: {
        items: [
          {
            ledgerKey: 'active-warning',
            status: 'ACTIVE',
            signalId: 'signal-warning',
            instrumentId: 'instrument-warning',
            symbol: 'WARNROW',
            companyName: 'Warning Row Ltd',
            region: 'IN',
            assetType: 'STOCK',
            triggerType: 'bullish_entry_trigger',
            entryTriggerTimestamp: '2026-06-01T10:00:00.000Z',
            entryTriggerPrice: 101,
            entryReasonSummary: 'Existing active row has a risk warning.',
            strategyId: 'TREND_MOMENTUM',
            strategyVersion: '1.0.0',
            strategyDecision: 'ENTRY_CANDIDATE',
            strategyReadinessLabel: 'READY',
            strategyRatingGrade: 'GOOD',
            entryRuleId: 'ENTRY_BREAKOUT',
            latestTrustedPriceDate: '2026-06-01',
            latestTrustedPrice: 105,
            currentReturnPercent: 0.04,
            currentReturnStatus: 'CURRENT',
            currentDataQualityStatus: 'READY',
            healthState: 'RISK_WARNING',
            lifecycleEvidenceStatus: 'ACTIVE_ENTRY',
            trustEvidenceStatus: 'SOURCE_PROVEN',
            calibrationEvidenceStatus: 'AVAILABLE',
            displayWarnings: ['Reduce-risk evidence needs review.'],
            exitReasonSummary: 'Reduce-risk evidence needs review.',
          },
          {
            ledgerKey: 'active-normal',
            status: 'ACTIVE',
            signalId: 'signal-alpha',
            instrumentId: 'instrument-alpha',
            symbol: 'ALPHA',
            companyName: 'Alpha Holdings',
            region: 'IN',
            assetType: 'STOCK',
            triggerType: 'bullish_entry_trigger',
            entryTriggerTimestamp: '2026-06-01T09:00:00.000Z',
            entryTriggerPrice: 50,
            entryReasonSummary: 'Normal active row.',
            strategyId: 'TREND_MOMENTUM',
            strategyVersion: '1.0.0',
            strategyDecision: 'ENTRY_CANDIDATE',
            strategyReadinessLabel: 'READY',
            strategyRatingGrade: 'GOOD',
            entryRuleId: 'ENTRY_BREAKOUT',
            latestTrustedPriceDate: '2026-06-01',
            latestTrustedPrice: 52,
            currentReturnPercent: 0.04,
            currentReturnStatus: 'CURRENT',
            currentDataQualityStatus: 'READY',
            healthState: null,
            lifecycleEvidenceStatus: 'ACTIVE_ENTRY',
            trustEvidenceStatus: 'SOURCE_PROVEN',
            calibrationEvidenceStatus: 'AVAILABLE',
            displayWarnings: [],
          },
        ],
        totalCount: 2,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
        scope: { region: 'IN', assetType: 'STOCK' },
        refresh: {
          runId: null,
          status: 'IDLE',
          totalCount: 0,
          processedCount: 0,
          succeededCount: 0,
          failedCount: 0,
          skippedCount: 0,
          materializedRowCount: 2,
          startedAt: null,
          completedAt: null,
          updatedAt: null,
          warnings: [],
          errors: [],
        },
        warnings: [],
      },
      portfolios: { portfolios: [{ id: 'portfolio-1', name: 'Core Portfolio', baseCurrency: 'INR', description: null, createdAt: '2026-06-01', updatedAt: '2026-06-01' }] },
      portfolioSummaries: {
        'portfolio-1': {
          portfolio: { id: 'portfolio-1', name: 'Core Portfolio', baseCurrency: 'INR', description: null, createdAt: '2026-06-01', updatedAt: '2026-06-01' },
          totalValue: 1000,
          totalInvested: 900,
          totalUnrealizedPnL: 100,
          totalUnrealizedPnLPercent: 0.1,
          dailyPnL: 0,
          dailyPnLPercent: 0,
          numberOfHoldings: 1,
          holdings: [{ id: 'holding-1', portfolioId: 'portfolio-1', instrumentId: 'instrument-omega', symbol: 'OMEGA', companyName: 'Omega Capital', quantity: 1, averageCost: 100, currency: 'INR', notes: null, createdAt: '2026-06-01', updatedAt: '2026-06-01', currentPrice: 110, marketValue: 110, investedAmount: 100, unrealizedPnL: 10, unrealizedPnLPercent: 0.1, dailyChange: 1, dailyChangePercent: 0.01, allocationPercent: 11, sector: 'Energy', country: 'India', signal: null }],
          source: 'mock',
          dataStatus: 'COMPLETE',
          generatedAt: '2026-06-02T06:00:00.000Z',
        },
      },
      watchlists: { watchlists: [{ id: 'watchlist-1', name: 'Breakout Watchlist', description: null, createdAt: '2026-06-01', updatedAt: '2026-06-01' }] },
      watchlistDetails: {
        'watchlist-1': {
          watchlist: { id: 'watchlist-1', name: 'Breakout Watchlist', description: null, createdAt: '2026-06-01', updatedAt: '2026-06-01' },
          items: [{ id: 'watchitem-1', watchlistId: 'watchlist-1', instrumentId: 'instrument-gamma', symbol: 'GAMMA', companyName: 'Gamma Industries', notes: null, tags: [], createdAt: '2026-06-01', updatedAt: '2026-06-01', sector: 'Energy', country: 'India', currency: 'INR', currentPrice: 80, dailyChange: 1, dailyChangePercent: 0.01, latestSignal: null, researchUrl: '/stocks/instrument-gamma' }],
          source: 'mock',
          generatedAt: '2026-06-02T06:00:00.000Z',
        },
      },
    });

    await visitAuthenticated(page, '/daily-review-shortlist');

    await expect(page.getByRole('heading', { name: 'Daily Review Shortlist' })).toBeVisible();
    await expect(page.getByText('3 / 10')).toBeVisible();
    await expect(page.getByText('Active Ledger')).toBeVisible();
    await expect(page.getByText('1 selected')).toBeVisible();
    await expect(page.getByText('Today Review')).toBeVisible();
    await expect(page.getByText('Stock Interest')).toBeVisible();
    const rows = page.locator('tbody tr');
    await expect(rows.nth(0)).toContainText('WARNROW');
    await expect(rows.nth(1)).toContainText('OMEGA');
    await expect(rows.nth(2)).toContainText('GAMMA');
    await expect(page.getByText('Portfolio: Core Portfolio')).toBeVisible();
    await expect(page.getByText('Watchlist: Breakout Watchlist')).toBeVisible();
    await expect(page.getByText('Selected from persisted Today Review groups in source rank order.')).toBeVisible();
    await expect(page.getByText('Selected from persisted Stock Interest backend order only after Today Review and active-risk rows.')).toBeVisible();
    await expect(page.getByText('Normal active ledger row excluded from new-review shortlist.')).toBeVisible();
    await expect(page.getByText('RISKROW')).toBeVisible();
    await expect(page.getByText('BLOCKED')).toBeVisible();
    await expect(page.getByText('No fake rows are shown.')).toHaveCount(0);
    await expectNoSharedMutationsOrOperatorControls(page, apiRequests);
  });

  test('Earnings renders backend rows, result date provenance, estimated-date risk, and empty tabs', async ({ page }) => {
    const earningsRow = {
      id: 'earnings-row-1',
      snapshotDate: '2026-06-01',
      dataThroughDate: '2026-05-31',
      symbol: 'EARNEST',
      resultDate: '2026-06-20',
      resultDateSource: 'ESTIMATED_FROM_PERIOD_CADENCE',
      periodEndDate: '2026-03-31',
      validatedAt: '2026-05-10',
      daysToResult: 19,
      revenueGrowth: 12.5,
      profitGrowth: 9.25,
      epsGrowth: 7,
      marginTrend: -1.5,
      consistencyScore: 74,
      accelerationScore: 81,
      reasonTags: ['PRE_RESULT_INTEREST'],
      riskTags: ['ESTIMATED_RESULT_DATE'],
      warnings: ['RESULT_DATE_ESTIMATED_FROM_PERIOD_CADENCE'],
      freshness: 'PARTIAL',
      categories: ['UPCOMING_RESULTS', 'EARNINGS_WATCHLIST'],
    };
    const apiRequests = await setupReadOnlyPage(page, {
      earnings: {
        scope: { region: 'IN', assetType: 'STOCK' },
        snapshotDate: '2026-06-01',
        dataThroughDate: '2026-05-31',
        generatedAt: '2026-06-01T05:45:00.000Z',
        freshness: 'PARTIAL',
        categories: {
          ...emptyEarningsCategories,
          UPCOMING_RESULTS: [earningsRow],
          EARNINGS_WATCHLIST: [earningsRow],
        },
        items: [earningsRow],
        warnings: ['Estimated result dates are not official calendar events.'],
      },
    });

    await visitAuthenticated(page, '/earnings-intelligence');

    await expect(page.getByText('EARNEST')).toBeVisible();
    await expect(page.getByText('Estimated From Period Cadence')).toBeVisible();
    await expect(page.getByText('3/31/2026')).toBeVisible();
    await expect(page.getByText('5/10/2026')).toBeVisible();
    await expect(page.getByText('ESTIMATED_RESULT_DATE')).toBeVisible();
    await expect(page.getByText('RESULT_DATE_ESTIMATED_FROM_PERIOD_CADENCE')).toBeVisible();
    await expect(page.getByText('+12.5%')).toBeVisible();
    await expect(page.getByText('-1.5%')).toBeVisible();
    await expect(page.getByText('Estimated result dates are not official calendar events.')).toBeVisible();

    await page.getByRole('tab', { name: 'Earnings Watchlist' }).click();
    await expect(page.getByText('EARNEST')).toBeVisible();

    await page.getByRole('tab', { name: 'Result Winners' }).click();
    await expect(page.getByText('No Result Winners rows were present in the backend snapshot.')).toBeVisible();
    await expectNoSharedMutationsOrOperatorControls(page, apiRequests);
  });
});
