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

async function mockAuthenticatedUser(page: Page, fixtures?: Record<string, unknown>) {
  await page.addInitScript((nextFixtures) => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-market-intelligence-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
    if (nextFixtures) {
      (window as unknown as { __marketIntelligenceReadModelFixtures?: Record<string, unknown> }).__marketIntelligenceReadModelFixtures = nextFixtures;
    }
  }, fixtures);
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

async function setupReadOnlyPage(page: Page, fixtures?: Record<string, unknown>) {
  const apiRequests: string[] = [];
  await mockAuthenticatedUser(page, fixtures);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) apiRequests.push(`${request.method()} ${url.pathname}${url.search}`);
  });
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/v1/auth/me') return route.fallback();
    throw new Error(`Trader read-model page must not call backend APIs while read models are unavailable: ${route.request().method()} ${route.request().url()}`);
  });
  return apiRequests;
}

async function expectNoSharedMutationsOrOperatorControls(page: Page, apiRequests: string[]) {
  const prohibitedRequest = /(sync|repair|backfill|import|generate|evaluate|calibrat|pipeline|provider|refresh|run)/i;
  expect(apiRequests.filter((item) => !item.includes('/api/v1/auth/me')).filter((item) => /^(POST|PATCH|DELETE) /.test(item))).toEqual([]);
  expect(apiRequests.filter((item) => prohibitedRequest.test(item))).toEqual([]);

  const main = await page.locator('main').innerText();
  expect(main).not.toMatch(/buy now|sell now|guaranteed|profit target|price target|financial advice|must buy|must sell|broker order/i);
  expect(main).not.toMatch(/import|sync|repair|backfill|generate|evaluate|calibrate|run pipeline|provider validation|pipeline control/i);
}

test.describe('Market Intelligence read-model pages', () => {
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

  test('required pages show honest missing-backend states without side-effect calls', async ({ page }) => {
    const apiRequests = await setupReadOnlyPage(page);
    const routes = [
      ['/market-pulse', 'Market Pulse', 'Market Pulse backend not available yet.'],
      ['/stock-interest-radar', 'Stock Interest Radar', 'Stock Interest Radar backend not available yet.'],
      ['/earnings-intelligence', 'Earnings Intelligence', 'Earnings Intelligence backend not available yet.'],
      ['/compounder-radar', 'Compounder Radar', 'Compounder Radar backend not available yet.'],
      ['/trader-setup-radar', 'Trader Setup Radar', 'Trader Setup Radar backend not available yet.'],
      ['/risk-radar', 'Risk Radar', 'Risk Radar backend not available yet.'],
      ['/instrument-workspace', 'Instrument Workspace', 'Instrument Context backend not available yet.'],
    ];

    for (const [path, heading, missingText] of routes) {
      await visitAuthenticated(page, path);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
      await expect(page.getByText(missingText)).toBeVisible();
      await expect(page.getByText('No fake rows are shown.')).toBeVisible();
      await expectNoSharedMutationsOrOperatorControls(page, apiRequests);
    }
  });

  test('Market Pulse renders backend-provided labels without recalculating intelligence', async ({ page }) => {
    const apiRequests = await setupReadOnlyPage(page, {
      marketPulse: {
        snapshotDate: '2026-06-01',
        dataThroughDate: '2026-05-31',
        generatedAt: '2026-06-01T05:45:00.000Z',
        status: 'READY',
        marketHealthScore: 95,
        marketHealthLabel: 'Fragile',
        topIndices: [{ symbol: 'NIFTY 50', label: 'Nifty 50', value: 22900, changePercent: 0.012, freshness: 'Fresh' }],
        strongSectors: ['Energy'],
        weakSectors: ['Financial Services'],
        breadthSummary: 'Backend says breadth is narrow.',
        deliverySummary: 'Backend says delivery participation is light.',
        candidateCount: 3,
        warnings: ['Backend warning is displayed verbatim.'],
      },
    });

    await visitAuthenticated(page, '/market-pulse');

    await expect(page.getByText('Fragile').first()).toBeVisible();
    await expect(page.getByText('95').first()).toBeVisible();
    await expect(page.getByText('Backend says breadth is narrow.')).toBeVisible();
    await expect(page.getByText('Backend warning is displayed verbatim.')).toBeVisible();
    await expectNoSharedMutationsOrOperatorControls(page, apiRequests);
  });

  test('radar pages preserve backend row order and tags instead of sorting by score', async ({ page }) => {
    const apiRequests = await setupReadOnlyPage(page, {
      stockInterest: [
        {
          snapshotDate: '2026-06-01',
          generatedAt: '2026-06-01T05:45:00.000Z',
          score: 12,
          symbol: 'LOWFIRST',
          company: 'Low First Ltd',
          sector: 'Industrials',
          category: "Today's Top Interest",
          direction: 'Watch',
          reasonTags: ['backend-order-first'],
          riskTags: ['thin-history'],
          freshness: 'Fresh',
          returns: '1D +0.2%',
        },
        {
          snapshotDate: '2026-06-01',
          generatedAt: '2026-06-01T05:45:00.000Z',
          score: 98,
          symbol: 'HIGHSECOND',
          company: 'High Second Ltd',
          sector: 'Financial Services',
          category: "Today's Top Interest",
          direction: 'Bullish trigger',
          reasonTags: ['backend-order-second'],
          riskTags: ['event-risk'],
          freshness: 'Fresh',
          returns: '1D +4.2%',
        },
      ],
    });

    await visitAuthenticated(page, '/stock-interest-radar');

    const rows = page.locator('tbody tr');
    await expect(rows.nth(0)).toContainText('LOWFIRST');
    await expect(rows.nth(1)).toContainText('HIGHSECOND');
    await expect(page.getByText('backend-order-first')).toBeVisible();
    await expect(page.getByText('event-risk')).toBeVisible();
    await expectNoSharedMutationsOrOperatorControls(page, apiRequests);
  });
});
