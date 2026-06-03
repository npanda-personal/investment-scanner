import { expect, test, type Page } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

const instrumentId = 'persisted-instrument-360one';

type RecordedRequest = {
  method: string;
  path: string;
};

const prohibitedSideEffectPath =
  /\/(sync-runs|sync|import|repair|backfill|generate|generation|evaluate|evaluation|calibration|run|refresh|manual-verified-import|exchange-files)(\/|$|-)/i;

async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-market-data-instrument-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        id: 'playwright-market-data-instrument-user',
        email: 'test@example.com',
        name: 'Test User',
      },
    });
  });
}

function recordApiRequests(page: Page): RecordedRequest[] {
  const requests: RecordedRequest[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) return;
    requests.push({
      method: request.method(),
      path: `${url.pathname}${url.search}`,
    });
  });
  return requests;
}

function expectReadOnlyInitialRender(requests: RecordedRequest[]) {
  expect(requests.filter((request) => ['POST', 'PATCH', 'DELETE'].includes(request.method))).toEqual([]);
  expect(requests.filter((request) => prohibitedSideEffectPath.test(request.path))).toEqual([]);
}

async function mockInstrumentWorkspace(page: Page) {
  await page.route(`**/api/v1/instruments/${instrumentId}**`, async (route) => {
    await route.fulfill({
      json: {
        id: instrumentId,
        symbol: '360ONE.NS',
        company_name: '360 ONE WAM LIMITED',
        display_symbol: '360ONE',
        provider_symbol: null,
        source_symbol: '360ONE',
        exchange: 'NSE',
        country: 'IN',
        region: 'IN',
        sector: 'Financial Services',
        industry: 'Asset Management',
        currency: 'INR',
        market_cap: 1000000000,
        asset_type: 'STOCK',
        instrument_segment: 'EQUITY',
        latest_price_date: '2026-05-10T00:00:00.000Z',
        expected_latest_trading_date: '2026-05-10T00:00:00.000Z',
        stored_data_through_date: '2026-05-10T00:00:00.000Z',
        price_readiness: 'PRICE_READY',
        is_active: true,
        is_delisted: false,
        ipo_date: null,
        isin: 'INE466L01038',
        source: 'persisted exchange',
        ingestion_timestamp: '2026-05-10T18:00:00.000Z',
        last_updated_timestamp: '2026-05-10T18:15:00.000Z',
        data_status: 'COMPLETE',
      },
    });
  });
  await page.route(`**/api/v1/prices/${instrumentId}/latest**`, async (route) => {
    await route.fulfill({
      json: {
        instrument_id: instrumentId,
        symbol: '360ONE.NS',
        latest: {
          close: 1000,
          date: '2026-05-10T00:00:00.000Z',
          open: 990,
          high: 1010,
          low: 980,
          adjusted_close: 1000,
          volume: 1000,
          source: 'persisted exchange',
          ingestion_timestamp: '2026-05-10T18:00:00.000Z',
          last_updated_timestamp: '2026-05-10T18:15:00.000Z',
          data_status: 'COMPLETE',
        },
        data_status: 'COMPLETE',
      },
    });
  });
  await page.route(`**/api/v1/prices/${instrumentId}?**`, async (route) => {
    await route.fulfill({
      json: {
        instrument_id: instrumentId,
        symbol: '360ONE.NS',
        adjustment_strategy: 'Persisted adjusted close',
        source: 'persisted exchange',
        ingestion_timestamp: '2026-05-10T18:00:00.000Z',
        last_updated_timestamp: '2026-05-10T18:15:00.000Z',
        data_status: 'COMPLETE',
        prices: [
          {
            date: '2026-05-10T00:00:00.000Z',
            close: 1000,
            open: 990,
            high: 1010,
            low: 980,
            adjusted_close: 1000,
            volume: 1000,
            source: 'persisted exchange',
            ingestion_timestamp: '2026-05-10T18:00:00.000Z',
            last_updated_timestamp: '2026-05-10T18:15:00.000Z',
            data_status: 'COMPLETE',
          },
        ],
      },
    });
  });
  await page.route(`**/api/v1/fundamentals/${instrumentId}**`, async (route) => {
    await route.fulfill({
      json: {
        instrument_id: instrumentId,
        symbol: '360ONE.NS',
        source: 'manual verified',
        ingestion_timestamp: '2026-05-09T10:00:00.000Z',
        last_updated_timestamp: '2026-05-09T10:05:00.000Z',
        data_status: 'COMPLETE',
        records: [
          {
            period_type: 'FY',
            period_end_date: '2026-03-31T00:00:00.000Z',
            revenue: 120000,
            eps: 30.5,
            net_income: 50000,
            pe_ratio: 24,
            dividend_yield: 0.01,
            shares_outstanding: 100000000,
            market_cap: 1000000000,
            currency: 'INR',
            source: 'manual verified',
            ingestion_timestamp: '2026-05-09T10:00:00.000Z',
            last_updated_timestamp: '2026-05-09T10:05:00.000Z',
            data_status: 'COMPLETE',
          },
        ],
      },
    });
  });
  await page.route(`**/api/v1/corporate-actions/${instrumentId}**`, async (route) => {
    await route.fulfill({
      json: {
        instrument_id: instrumentId,
        symbol: '360ONE.NS',
        source: 'exchange corporate actions',
        ingestion_timestamp: '2026-05-03T00:00:00.000Z',
        last_updated_timestamp: '2026-05-07T00:00:00.000Z',
        data_status: 'COMPLETE',
        actions: [
          {
            action_type: 'dividend',
            effective_date: '2026-04-27T00:00:00.000Z',
            declared_date: null,
            payment_date: null,
            value: 6,
            ratio: null,
            amount: 6,
            currency: 'INR',
            source: 'exchange corporate actions',
            data_status: 'COMPLETE',
            ingestion_timestamp: '2026-05-03T00:00:00.000Z',
            last_updated_timestamp: '2026-05-07T00:00:00.000Z',
          },
          {
            action_type: 'split',
            effective_date: '2023-03-02T00:00:00.000Z',
            declared_date: null,
            payment_date: null,
            value: 2,
            ratio: 2,
            amount: null,
            currency: null,
            source: 'exchange corporate actions',
            data_status: 'COMPLETE',
            ingestion_timestamp: '2026-05-03T00:00:00.000Z',
            last_updated_timestamp: '2026-05-07T00:00:00.000Z',
          },
        ],
      },
    });
  });
}

async function mockResearchTab(page: Page) {
  await page.route(`**/api/v1/research/stocks/${instrumentId}/workbench**`, async (route) => {
    await route.fulfill({
      json: {
        overview: {
          instrument_id: instrumentId,
          company_name: '360 ONE WAM LIMITED',
          symbol: '360ONE.NS',
          exchange: 'NSE',
          country: 'IN',
          sector: 'Financial Services',
          industry: 'Asset Management',
          currency: 'INR',
          market_cap: 1000000000,
          latest_price: 1000,
          daily_change: 10,
          daily_change_percent: 0.01,
          last_updated_timestamp: '2026-05-10T18:15:00.000Z',
          source: 'persisted exchange',
          data_status: 'COMPLETE',
        },
        chart: {
          range: '1Y',
          prices: [{ date: '2026-05-10T00:00:00.000Z', close: 1000, adjusted_close: 1000, volume: 1000 }],
          adjusted_close_fallback: false,
          source: 'persisted exchange',
          last_updated_timestamp: '2026-05-10T18:15:00.000Z',
          data_status: 'COMPLETE',
        },
        performance: {
          selected_range_return: 0.12,
          return_1d: 0.01,
          return_1w: 0.02,
          return_1m: 0.04,
          return_ytd: 0.08,
          return_1y: 0.12,
          cagr_3y: null,
          max_drawdown: -0.05,
          volatility: 0.18,
        },
        fundamentals: null,
        valuation: {
          pe_ratio: null,
          peer_average_pe: null,
          dividend_yield: null,
          peer_average_dividend_yield: null,
          market_cap_rank: null,
          peer_count: 0,
        },
        peers: [],
        relative_strength: {
          stock_return: 0.12,
          peer_average_return: null,
          relative_to_peer_average: null,
          fallback_used: 'persisted price history',
          data_status: 'PARTIAL',
        },
        corporate_actions: [],
        trust: {
          source: 'persisted exchange',
          last_updated_timestamp: '2026-05-10T18:15:00.000Z',
          data_status: 'COMPLETE',
        },
      },
    });
  });
  await page.route(`**/api/v1/signals/${instrumentId}`, async (route) => {
    await route.fulfill({ json: null });
  });
  await page.route(`**/api/v1/strategy/${instrumentId}`, async (route) => {
    await route.fulfill({ json: null });
  });
  await page.route('**/api/v1/strategy/market-gate**', async (route) => {
    await route.fulfill({
      json: {
        marketCondition: 'UNKNOWN',
        marketGate: 'UNKNOWN',
        allowedActions: [],
        marketScore: 0,
        reasons: [],
        blockers: ['Persisted market gate evidence is unavailable in this fixture.'],
        dataStatus: 'MISSING',
        updatedAt: '2026-05-10T18:15:00.000Z',
      },
    });
  });
}

test.describe('Market Data Instrument Detail UI', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test('renders persisted evidence and stays read-only on the Instrument Workspace initial render', async ({ page }) => {
    const requests = recordApiRequests(page);
    await mockInstrumentWorkspace(page);

    await visitModule(page, `/stocks/${instrumentId}`, 'Instrument Workspace');

    await expect(page.getByText('Read-only instrument evidence, market context gaps, personal research workflow links, and source freshness.')).toBeVisible();
    await expect(page.getByText('Data through:').first()).toBeVisible();
    await expect(page.getByText('Freshness: Price Ready')).toBeVisible();
    await expect(page.getByText('Source: Persisted Exchange', { exact: true })).toBeVisible();
    await expect(page.getByText('Source status: Complete', { exact: true })).toBeVisible();
    await expect(page.getByText('manual verified')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Corporate Actions' })).toBeVisible();
    await expect(page.getByRole('row', { name: /dividend\s+4\/27\/2026\s+N\/A\s+N\/A\s+6\s+N\/A\s+6\s+INR\s+exchange corporate actions\s+COMPLETE/ })).toHaveCount(1);
    await expect(page.getByRole('row', { name: /split\s+3\/2\/2023\s+N\/A\s+N\/A\s+2\s+2\s+N\/A\s+N\/A\s+exchange corporate actions\s+COMPLETE/ })).toHaveCount(1);
    await expect.poll(() => requests.some((request) => request.path.includes(`/api/v1/prices/${instrumentId}/latest`) && request.path.includes('region=IN') && request.path.includes('assetType=STOCK'))).toBe(true);
    expectReadOnlyInitialRender(requests);
  });

  test('renders the research tab from persisted read-only endpoints without side-effect requests', async ({ page }) => {
    const requests = recordApiRequests(page);
    await mockResearchTab(page);

    await visitModule(page, `/stocks/${instrumentId}?tab=research`, 'Instrument Workspace');

    await expect(page.getByText('360 ONE WAM LIMITED').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Price Chart' })).toBeVisible();
    await expect(page.getByText('persisted exchange').first()).toBeVisible();
    await expect(page.getByText('No signal generated yet.')).toBeVisible();
    await expect(page.getByText('No strategy decision generated yet.')).toBeVisible();
    await expect.poll(() => requests.some((request) => request.path.includes(`/api/v1/research/stocks/${instrumentId}/workbench`) && request.path.includes('range=1Y'))).toBe(true);
    expectReadOnlyInitialRender(requests);
  });
});
