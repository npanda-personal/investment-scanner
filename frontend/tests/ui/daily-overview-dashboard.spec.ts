import { expect, test, type Page } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-daily-overview-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        id: 'playwright-daily-overview-user',
        email: 'codex.test@example.com',
        name: 'Codex Test',
      },
    });
  });
}

function candidate(rank: number, confidenceScore: number) {
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
    grade: rank <= 3 ? 'A' : 'B',
    confidenceScore,
    reasonSummary: `Rank ${rank} trigger reason from Today Review evidence.`,
    blockers: [],
    watchReasons: rank === 1 ? ['Data quality is ready for research review.'] : [],
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
  const ranked = Array.from({ length: 12 }, (_unused, index) => candidate(13 - index, 40 + (13 - index)));
  return {
    run: {
      id: 'today-run-1',
      runDate: '2026-05-26T00:00:00.000Z',
      region: 'IN',
      assetType: 'STOCK',
      status: 'COMPLETED',
      dataThroughDate: '2026-05-26T00:00:00.000Z',
      startedAt: '2026-05-26T05:00:00.000Z',
      finishedAt: '2026-05-26T05:05:00.000Z',
      warnings: [],
      candidateCounts: { LONG_REVIEW: 12, SHORT_REVIEW: 1 },
      sourceSnapshot: {},
      createdAt: '2026-05-26T05:00:00.000Z',
      updatedAt: '2026-05-26T05:05:00.000Z',
      candidates: [],
    },
    groups: {
      longReview: ranked,
      shortReview: [candidate(1, 41)],
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

function moversPayload(range: string) {
  return {
    scope: { region: 'IN', assetType: 'STOCK' },
    generatedAt: '2026-05-27T05:00:00.000Z',
    ranges: [{
      range,
      gainers: Array.from({ length: 20 }, (_unused, index) => mover(index + 1, (index + 1) / 100)),
      losers: Array.from({ length: 20 }, (_unused, index) => mover(index + 1, -(index + 1) / 100)),
      warnings: [],
    }],
  };
}

function marketContextPayload() {
  return {
    regime: { regime: 'NEUTRAL', score: 55, explanation: 'Mixed data', updatedAt: '2026-05-26T05:00:00.000Z', dataStatus: 'PARTIAL' },
    topSectors: [{ sector: 'Financials', return1M: 0.03, return3M: 0.05, return6M: 0.09, relativeStrengthScore: 68 }],
    weakSectors: [{ sector: 'Utilities', return1M: -0.01, return3M: -0.02, return6M: -0.03, relativeStrengthScore: 30 }],
    breadth: { advanceDeclineRatio: 1.1 },
    countryStrength: [],
    macro: null,
    explanation: ['Partial evidence'],
    updatedAt: '2026-05-26T05:00:00.000Z',
    dataStatus: 'PARTIAL',
  };
}

test.describe('Daily Overview dashboard', () => {
  test('shows 20 market movers and top 10 ranked signal candidates with details', async ({ page }) => {
    await mockAuthenticatedUser(page);
    let moversQuery: URLSearchParams | null = null;

    await page.route('**/api/v1/today-review/latest**', async (route) => {
      await route.fulfill({ json: todayReviewPayload() });
    });
    await page.route('**/api/v1/market-data/movers**', async (route) => {
      const url = new URL(route.request().url());
      moversQuery = url.searchParams;
      await route.fulfill({ json: moversPayload(url.searchParams.get('range') || '1D') });
    });
    await page.route('**/api/v1/market-context/summary**', async (route) => {
      await route.fulfill({ json: marketContextPayload() });
    });

    await visitAuthenticated(page, '/');

    await expect(page.locator('h4').filter({ hasText: 'Daily Overview' })).toBeVisible();
    expect(moversQuery?.get('region')).toBe('IN');
    expect(moversQuery?.get('assetType')).toBe('STOCK');
    expect(moversQuery?.get('range')).toBe('1D');
    expect(moversQuery?.get('limit')).toBe('20');

    await expect(page.getByText('GAIN20 - Industrials')).toBeVisible();
    await expect(page.getByText('LOSS20 - Industrials')).toBeVisible();
    await expect(page.getByText(/GAIN\d{2} - Industrials/)).toHaveCount(20);
    await expect(page.getByText(/LOSS\d{2} - Industrials/)).toHaveCount(20);

    await expect(page.getByRole('heading', { name: 'Top Signal Candidates' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '#1', exact: true })).toBeVisible();
    await expect(page.getByText('CAND01 - Candidate 1 Ltd')).toBeVisible();
    await expect(page.getByText('CAND10 - Candidate 10 Ltd')).toBeVisible();
    await expect(page.getByText('CAND11 - Candidate 11 Ltd')).toHaveCount(0);

    await page.getByText('CAND01 - Candidate 1 Ltd').click();
    await expect(page.getByRole('dialog')).toContainText('Rank #1');
    await expect(page.getByRole('dialog')).toContainText('Rank 1 trigger reason from Today Review evidence.');
    await expect(page.getByRole('dialog')).toContainText('Strategy TREND_BREAKOUT v1.2.0');
    await expect(page.getByRole('dialog')).toContainText('DQ READY');
  });
});
