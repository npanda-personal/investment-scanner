import { expect, test } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

const candidate = {
  id: 'candidate-1',
  runId: 'run-1',
  instrumentId: 'stock-1',
  symbol: 'ALPHA.NS',
  companyName: 'Alpha Ltd',
  direction: 'LONG',
  state: 'LONG_REVIEW',
  setupType: 'BREAKOUT',
  strategyCode: 'TREND_MOMENTUM',
  strategyVersion: '1.0.0',
  rank: 1,
  grade: 'A',
  confidenceScore: 88,
  reasonSummary: 'Long review candidate with Strategy Framework proof, acceptable data quality, market alignment, and valid trade-plan geometry.',
  blockers: [],
  watchReasons: [],
  dataQualitySnapshot: {
    instrumentId: 'stock-1',
    symbol: 'ALPHA.NS',
    companyName: 'Alpha Ltd',
    sector: 'Financial Services',
    coverageStatus: 'GOOD',
    signalReadinessStatus: 'READY',
    liquidityStatus: 'LIQUID',
    coverageScore: 92,
    signalReadinessScore: 88,
    liquidityScore: 84,
    lastEvaluatedAt: '2026-05-10T16:00:00.000Z',
  },
  marketContextSnapshot: {
    regime: { regime: 'RISK_ON', score: 80 },
    breadth: { percentAboveSma50: 0.7, percentAboveSma200: 0.62 },
    dataStatus: 'COMPLETE',
  },
  strategyProofSnapshot: {
    strategyCode: 'TREND_MOMENTUM',
    strategyVersion: '1.0.0',
    frameworkBacked: true,
    strategyRating: { ratingGrade: 'GOOD', ratingScore: 82 },
    readinessLabel: 'PAPER_TEST_CANDIDATE',
    decision: 'TRADE_CANDIDATE',
    action: 'CONSIDER_ENTRY',
    confidence: 'HIGH',
    decisionScore: 84,
  },
  tradePlanSnapshot: {
    id: 'plan-1',
    instrumentId: 'stock-1',
    symbol: 'ALPHA.NS',
    strategy: 'TREND_MOMENTUM',
    strategyVersion: '1.0.0',
    strategyRating: 'GOOD',
    readinessLabel: 'PAPER_TEST_CANDIDATE',
    planStatus: 'VALID',
    riskGrade: 'LOW',
    entryZone: { type: 'BREAKOUT', referencePrice: 100, preferredEntryMin: 99, preferredEntryMax: 101, quality: 'STRONG', rationale: 'Breakout review zone.' },
    stopLoss: { price: 95, percentBelowEntry: 5, method: 'RECENT_SWING_LOW', quality: 'STRONG', rationale: 'Below review floor.' },
    target: { price: 112, expectedReturnPercent: 12, method: 'REWARD_RISK_MULTIPLE', quality: 'ACCEPTABLE', rationale: 'Modeled reward range.' },
    rewardRiskRatio: 2.4,
    invalidationRules: ['Daily close below stop level.'],
    warnings: [],
    blockers: [],
    dataGaps: [],
    paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
    paperReadinessReasons: [],
    paperReadinessBlockers: [],
    marketDataSnapshot: { latestStoredTradingDate: '2026-05-10T00:00:00.000Z', latestPriceTimestamp: '2026-05-10T00:00:00.000Z', currency: 'INR' },
    generatedAt: '2026-05-11T06:30:00.000Z',
    modelVersion: 'trade-plan-risk-v1',
  },
  sourceSignalSnapshot: {
    rawSignal: { direction: 'BULLISH', score: 77, confidence: 'HIGH', supportOnly: true },
    calibration: { calibratedDirection: 'BULLISH', calibratedScore: 80, calibratedConfidence: 'HIGH', supportOnly: true },
    smartMoney: { status: 'ACCUMULATION', score: 70, confidence: 'MEDIUM', supportOnly: true },
  },
  createdAt: '2026-05-11T06:30:00.000Z',
  updatedAt: '2026-05-11T06:30:00.000Z',
};

const blockedCandidate = {
  ...candidate,
  id: 'candidate-2',
  instrumentId: 'stock-2',
  symbol: 'BLOCKED.NS',
  companyName: 'Blocked Ltd',
  direction: 'BLOCKED',
  state: 'BLOCKED',
  rank: 2,
  grade: 'D',
  confidenceScore: 0,
  reasonSummary: 'Blocked: Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.',
  blockers: ['Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.'],
  tradePlanSnapshot: {
    ...candidate.tradePlanSnapshot,
    id: 'plan-2',
    instrumentId: 'stock-2',
    symbol: 'BLOCKED.NS',
    planStatus: 'BLOCKED',
    riskGrade: 'HIGH',
    entryZone: { type: 'PULLBACK', referencePrice: 304.51, preferredEntryMin: 298.42, preferredEntryMax: 310.6, quality: 'STRONG', rationale: 'Pullback review zone.' },
    stopLoss: { price: 307.49, percentBelowEntry: 0.81, method: 'RECENT_SWING_LOW', quality: 'WEAK', rationale: 'Geometry blocked.' },
    blockers: ['Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.'],
    paperReadinessStatus: 'BLOCKED',
    paperReadinessReasons: [],
    paperReadinessBlockers: ['Trade-plan snapshot has hard blockers.'],
  },
};

const unprovenCandidate = {
  ...candidate,
  id: 'candidate-3',
  instrumentId: 'stock-3',
  symbol: 'UNPROVEN.NS',
  companyName: 'Unproven Ltd',
  direction: 'WATCH',
  state: 'UNPROVEN',
  rank: 3,
  grade: 'UNPROVEN',
  confidenceScore: 35,
  reasonSummary: 'Unproven: Strategy Framework proof is missing or weak.',
  blockers: [],
  watchReasons: ['Strategy Framework proof is missing or weak.'],
  strategyProofSnapshot: {
    ...candidate.strategyProofSnapshot,
    frameworkBacked: false,
    strategyRating: { ratingGrade: 'UNPROVEN', ratingScore: 0 },
  },
};

const completedResponse = {
  run: {
    id: 'run-1',
    runDate: '2026-05-11T00:00:00.000Z',
    region: 'IN',
    assetType: 'STOCK',
    status: 'COMPLETED',
    trustStatus: 'OK',
    dataThroughDate: '2026-05-10T00:00:00.000Z',
    startedAt: '2026-05-11T06:30:00.000Z',
    finishedAt: '2026-05-11T06:31:00.000Z',
    warnings: [],
    candidateCounts: { LONG_REVIEW: 1, BLOCKED: 1, UNPROVEN: 1 },
    sourceSnapshot: { rawSignalUniverse: { supportOnly: true, sampleCount: 25 } },
    createdAt: '2026-05-11T06:30:00.000Z',
    updatedAt: '2026-05-11T06:31:00.000Z',
    candidates: [candidate, blockedCandidate, unprovenCandidate],
  },
  groups: {
    longReview: [candidate],
    shortReview: [],
    exitRiskReview: [],
    watchOnly: [],
    blocked: [blockedCandidate],
    avoid: [],
    insufficientData: [],
    unproven: [unprovenCandidate],
  },
  scope: { region: 'IN', assetType: 'STOCK' },
};

test.describe('Today Trade Review UI', () => {
  test('deep link settles, no-run state offers manual run, and completed run shows grouped shortlist', async ({ page }) => {
    let manualRunCompleted = false;
    await page.route('**/api/v1/today-review/latest**', async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('IN');
      expect(url.searchParams.get('assetType')).toBe('STOCK');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(!manualRunCompleted ? {
          run: null,
          groups: { longReview: [], shortReview: [], exitRiskReview: [], watchOnly: [], blocked: [], avoid: [], insufficientData: [], unproven: [] },
          scope: { region: 'IN', assetType: 'STOCK' },
        } : completedResponse),
      });
    });
    await page.route('**/api/v1/today-review/run', async (route) => {
      const body = route.request().postDataJSON();
      expect(body).toEqual({ region: 'IN', assetType: 'STOCK' });
      manualRunCompleted = true;
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(completedResponse) });
    });

    await visitAuthenticated(page, '/today-review');

    await expect(page.getByRole('heading', { name: 'Today’s Trade Review' })).toBeVisible();
    await expect(page.getByText('No Today review has been published for IN / STOCK.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run review' })).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveCount(0);

    await page.getByRole('button', { name: 'Run review' }).click();

    await expect(page.getByText('Scope: IN / STOCK')).toBeVisible();
    await expect(page.getByText('Long review candidates', { exact: true })).toBeVisible();
    await expect(page.getByText('Signals and calibration are supporting evidence only.').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'ALPHA.NS' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Long Review (1)' })).toBeVisible();
    await page.getByRole('tab', { name: /Watch Only/ }).click();
    await expect(page.getByText('UNPROVEN.NS')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Unproven', exact: true })).toBeVisible();
    await page.getByRole('tab', { name: /Blocked/ }).click();
    await expect(page.getByText('BLOCKED.NS')).toBeVisible();
    await expect(page.getByText('Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.').first()).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Today’s Trade Review' })).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'ALPHA.NS' })).toBeVisible();

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/buy now|sell now|guaranteed|place order|execute order|live trade|financial advice/i);
    expect(body).not.toContain('Raw signal count');
  });

  test('candidate detail shows plan, invalidation, context, data quality, and proof panels', async ({ page }) => {
    await page.route('**/api/v1/today-review/candidates/candidate-1', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(candidate) });
    });

    await visitAuthenticated(page, '/today-review/candidates/candidate-1');

    await expect(page.getByRole('heading', { name: 'ALPHA.NS research support' })).toBeVisible();
    await expect(page.getByText('Preferred entry zone')).toBeVisible();
    await expect(page.getByText('INR 99.00 - INR 101.00').first()).toBeVisible();
    await expect(page.getByText('Stop / invalidation').first()).toBeVisible();
    await expect(page.getByText('INR 95.00; Daily close below stop level.').first()).toBeVisible();
    await expect(page.getByText('Target 1 / Target 2 or reward range')).toBeVisible();
    await expect(page.getByText('Reward/risk').first()).toBeVisible();
    await expect(page.getByText('Do nothing unless')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Strategy proof' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Market context' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Data quality' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Trade plan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Supporting evidence' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Research Hub stock view' })).toHaveAttribute('href', '/research/stocks/stock-1');

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/buy now|sell now|guaranteed|place order|execute order|live trade|financial advice/i);
  });

  test('partial run keeps usable grouped sections and shows warnings', async ({ page }) => {
    await page.route('**/api/v1/today-review/latest**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...completedResponse,
          run: {
            ...completedResponse.run,
            status: 'PARTIAL',
            trustStatus: 'PARTIAL',
            warnings: ['Market context snapshot is unavailable.'],
          },
        }),
      });
    });

    await visitAuthenticated(page, '/today-review');

    await expect(page.getByText('Run status: PARTIAL')).toBeVisible();
    await expect(page.getByText('Market context snapshot is unavailable.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'ALPHA.NS' })).toBeVisible();
    await page.getByRole('tab', { name: /Watch Only/ }).click();
    await expect(page.getByText('UNPROVEN.NS')).toBeVisible();
  });
});
