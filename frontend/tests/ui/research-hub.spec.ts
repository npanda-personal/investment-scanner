import { expect, test, type Page } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-research-hub-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        id: 'playwright-research-hub-user',
        email: 'codex.test@example.com',
        name: 'Codex Test',
      },
    });
  });
}

function researchOverviewPayload() {
  return {
    actionability: {
      overallStatus: 'INSUFFICIENT_DATA',
      canReviewActionableSetups: false,
      headline: 'Actionable setup review is not confirmed because required readiness evidence is unavailable.',
      researchSupportOnly: true,
      dimensions: {
        marketEnvironment: {
          status: 'READY',
          label: 'Market Environment',
          sourceModule: 'strategy-decision-engine',
          blocking: false,
          message: 'Market environment is open, but this does not prove actionable setup readiness.'
        },
        dataReadiness: {
          status: 'LIMITED',
          label: 'Data Readiness',
          sourceModule: 'research-hub',
          blocking: false,
          message: 'Research Hub has no local data gaps, but trusted review-universe readiness is not yet wired.'
        },
        signalEvidence: {
          status: 'INSUFFICIENT_DATA',
          label: 'Signal Evidence',
          sourceModule: 'signal-quality-lab',
          blocking: true,
          message: 'Signal Quality evidence maturity is not yet available for this overview.'
        },
        calibrationReadiness: {
          status: 'INSUFFICIENT_DATA',
          label: 'Calibration Readiness',
          sourceModule: 'signal-calibration-engine',
          blocking: true,
          message: 'Calibration readiness is not yet wired into Research Hub actionability.'
        },
        strategyProof: {
          status: 'INSUFFICIENT_DATA',
          label: 'Strategy Proof',
          sourceModule: 'strategy-decision-engine',
          blocking: true,
          message: 'No framework-backed strategy proof is available for review candidates.'
        },
        todayReviewReadiness: {
          status: 'INSUFFICIENT_DATA',
          label: 'Today Review Readiness',
          sourceModule: 'today-trade-review',
          blocking: true,
          message: 'Today Review readiness is not yet a stable Research Hub input.'
        },
        tradePlanReadiness: {
          status: 'INSUFFICIENT_DATA',
          label: 'Trade Plan Readiness',
          sourceModule: 'trade-plan-risk-engine',
          blocking: true,
          message: 'Trade Plan paper-readiness is not yet a stable Research Hub input.'
        }
      },
      nextBestAction: null,
      blockers: []
    },
    marketReadiness: {
      marketGate: 'OPEN',
      marketCondition: 'HEALTHY',
      headline: 'Environment is healthy: high-conviction setups allowed.',
      allowedActions: ['NEW_LONG_TRADES_ALLOWED'],
      reasons: [],
      blockers: [],
      dataStatus: 'COMPLETE'
    },
    researchPriorities: {
      tradeCandidates: [],
      watchCandidates: [],
      avoidCandidates: [],
      exitCandidates: []
    },
    strategyProofSummary: {
      strategiesProducingCandidates: [],
      provenCandidateCount: 0,
      unprovenCandidateCount: 0,
      blockedByMarketGateCount: 0,
      missingBacktestCount: 0,
      notes: []
    },
    confirmationSummary: {
      signalSummary: { topBullishCount: 0, topBearishCount: 0, reliabilityAvailable: false, notes: [] },
      smartMoneySummary: { accumulationCount: 0, distributionCount: 0, topConfirmations: [], topContradictions: [] },
      marketContextSummary: { leadingSectors: [], weakSectors: [], breadthStatus: 'Neutral', notes: [] }
    },
    whatChanged: {
      newTradeCandidates: [],
      downgradedCandidates: [],
      warnings: []
    },
    nextActions: [],
    dataGaps: [],
    generatedAt: '2026-05-10T00:00:00.000Z'
  };
}

test.describe('Research Hub UI', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test('exposes proof-driven triage and research-only language', async ({ page }) => {
    const overviewRequests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/v1/research/overview')) {
        overviewRequests.push(url.search);
      }
    });
    await page.route('**/api/v1/research/overview**', async (route) => {
      await route.fulfill({ json: researchOverviewPayload() });
    });

    await visitModule(page, '/research', 'Research Command Center');
    await expect(page.getByRole('heading', { name: 'Actionability' })).toBeVisible();
    await expect(page.getByText('Reviewable setups not confirmed')).toBeVisible();
    await expect(page.getByText('Actionable setup review is not confirmed because required readiness evidence is unavailable.')).toBeVisible();
    await expect(page.getByText('Market environment is open, but this does not prove actionable setup readiness.').first()).toBeVisible();
    await expect(page.getByText('Market input only')).toBeVisible();
    await expect(page.getByText('Review actionability evidence')).toBeVisible();
    await expect(page.getByText('Environment is healthy: high-conviction setups allowed.')).toHaveCount(0);
    await expect(page.getByText('NEW LONG TRADES ALLOWED')).toHaveCount(0);
    await expect(page.getByText('Trade Plan Readiness')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Review Candidates' })).toBeVisible();
    await expect(page.getByText('Strategy Proof').first()).toBeVisible();
    await expect(page.getByText('Confirmation Layers')).toBeVisible();
    await expect(page.getByText('NEW TRADE CANDIDATES')).toHaveCount(0);
    await expect(page.getByText('No framework-backed strategies are producing review candidates yet.')).toBeVisible();
    await expect(page.getByText('No new review candidates since the last evaluation.')).toBeVisible();
    await expect.poll(() => overviewRequests.some((search) => search.includes('region=IN') && search.includes('assetType=STOCK'))).toBe(true);
  });

  test('links user drilldowns to market intelligence pages instead of operator dashboards', async ({ page }) => {
    await page.route('**/api/v1/research/overview**', async (route) => {
      await route.fulfill({ json: researchOverviewPayload() });
    });
    await visitModule(page, '/research', 'Research Command Center');
    await expect(page.getByRole('heading', { name: 'Research Command Center' })).toBeVisible();

    await expect(page.locator('a[href="/research/strategy"]')).toHaveCount(0);
    await expect(page.locator('a[href="/research/signals"]')).toHaveCount(0);
    await expect(page.locator('a[href="/research/smart-money"]')).toHaveCount(0);
    await expect(page.locator('a[href="/research/market-context"]')).toHaveCount(0);

    await expect(page.locator('a[href="/strategy"]')).toHaveCount(0);
    await expect(page.locator('a[href="/signals"]')).toHaveCount(0);
    await expect(page.locator('a[href="/smart-money"]')).toHaveCount(0);
    await expect(page.locator('a[href="/market-context"]')).toHaveCount(0);

    await expect(page.locator('a[href="/market-pulse"]').first()).toBeVisible();
    await expect(page.locator('a[href="/market-map"]').first()).toBeVisible();
    await expect(page.locator('a[href="/breadth"]').first()).toBeVisible();
    await expect(page.locator('a[href="/institutional-flow"]').first()).toBeVisible();
  });

  test('renders research ideas from persisted reads without triggering import or generation workflows', async ({ page }) => {
    const forbiddenRequests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (!url.pathname.includes('/api/v1/')) return;
      const isMutation = request.method() !== 'GET';
      const isWorkflowEndpoint = /import|generate|generation|backfill|sync|repair|evaluate|evaluation|calibrate|calibration|run/i.test(url.pathname);
      if (isMutation || isWorkflowEndpoint) {
        forbiddenRequests.push(`${request.method()} ${url.pathname}`);
      }
    });
    await page.route('**/api/v1/research/overview**', async (route) => {
      await route.fulfill({ json: researchOverviewPayload() });
    });

    await visitModule(page, '/research', 'Research Command Center');
    await expect(page.getByRole('heading', { name: 'Review Candidates' })).toBeVisible();

    expect(forbiddenRequests).toEqual([]);
  });
});
