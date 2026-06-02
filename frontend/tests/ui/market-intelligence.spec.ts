import { expect, test, type Page } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

const traderNavLabels = [
  'Market Pulse',
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
          email: 'codex.test@example.com',
          name: 'Codex Test',
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
    };

    if (path in implementedReads) {
      await route.fulfill({ json: implementedReads[path] });
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

  test('Earnings renders backend rows, result date provenance, estimated-date risk, and empty tabs', async ({ page }) => {
    const earningsRow = {
      id: 'earnings-row-1',
      snapshotDate: '2026-06-01',
      dataThroughDate: '2026-05-31',
      symbol: 'EARNEST',
      resultDate: '2026-06-20',
      resultDateSource: 'ESTIMATED_FROM_PERIOD_CADENCE',
      daysToResult: 19,
      revenueGrowth: 12.5,
      profitGrowth: 9.25,
      epsGrowth: 7,
      marginTrend: -1.5,
      consistencyScore: 74,
      accelerationScore: 81,
      reasonTags: ['PRE_RESULT_INTEREST'],
      riskTags: ['ESTIMATED_RESULT_DATE'],
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
    await expect(page.getByText('ESTIMATED_RESULT_DATE')).toBeVisible();
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
