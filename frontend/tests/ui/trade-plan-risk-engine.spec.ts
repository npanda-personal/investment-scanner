import { expect, test } from '@playwright/test';
import { visitAuthenticated } from './support/auth';
import { visitModule } from './support/moduleAssertions';

const funnelResponse = {
  region: 'IN',
  assetType: 'STOCK',
  generatedAt: '2026-05-10T00:00:00.000Z',
  rawSignals: { total: 8, bullish: 5, bearish: 1, neutral: 2, byDirection: { BULLISH: 5, BEARISH: 1, NEUTRAL: 2 } },
  strategyMatches: { totalWithMatch: 4, totalWithoutMatch: 4, byStrategy: [{ reason: 'TREND_MOMENTUM', count: 4 }] },
  strategyDecisions: { total: 4, tradeCandidates: 3, watch: 1, avoid: 0, exitCandidates: 0, reduceRisk: 0, hold: 0, insufficientData: 0, frameworkBacked: 4, notFrameworkBacked: 0 },
  tradePlanCandidateDiscovery: { discoveredCandidates: 4, eligibleForPlanGeneration: 3, skippedBeforeGeneration: 1, skipReasonCounts: { 'WATCH decisions are not batch-generated unless explicitly allowed.': 1 }, skipReasons: [{ reason: 'WATCH decisions are not batch-generated unless explicitly allowed.', count: 1 }] },
  generatedPlans: { total: 3, valid: 2, watch: 0, blocked: 1, insufficientData: 0, byStrategy: [], byRiskGrade: [], byPlanStatus: [] },
  paperReadiness: { readyForPaperReview: 0, watchOnly: 3, blocked: 0, insufficientData: 0, blockerCounts: [{ reason: 'UNPROVEN strategy rating', count: 3 }], topBlockers: [{ reason: 'UNPROVEN strategy rating', count: 3 }], reasonCounts: [] },
  proof: { byBacktestTimeframe: [], byStrategyRating: [], missingBacktestSummaryCount: 0, weakOrUnprovenRatingCount: 0 },
  dataQuality: { missingSnapshotCount: 0, unusableCount: 0, illiquidCount: 0, unknownLiquidityCount: 0 },
  recommendations: ['Run trade plan generation after Strategy Decision produces candidates.'],
  paperReadinessProofChain: {
    scope: { region: 'IN', assetType: 'STOCK', backtestTimeframe: null },
    generatedPlanCount: 3,
    paperReadyCount: 0,
    stages: [
      { stage: 'DATA_QUALITY', status: 'PASS', affectedCount: 0, hardBlockerCount: 0, topBlockers: [] },
      { stage: 'STRATEGY_DECISION', status: 'PASS', affectedCount: 0, hardBlockerCount: 0, topBlockers: [] },
      { stage: 'STRATEGY_PROOF', status: 'UNPROVEN', affectedCount: 3, hardBlockerCount: 0, topBlockers: [{ code: 'WEAK_OR_UNPROVEN_STRATEGY', label: 'Weak or unproven strategy', count: 3, targetRoute: '/strategy-framework' }] },
      { stage: 'BACKTEST_EVIDENCE', status: 'PASS', affectedCount: 0, hardBlockerCount: 0, topBlockers: [] },
      { stage: 'RISK_GEOMETRY', status: 'PASS', affectedCount: 0, hardBlockerCount: 0, topBlockers: [] },
      { stage: 'SCOPE', status: 'PASS', affectedCount: 0, hardBlockerCount: 0, topBlockers: [] },
      { stage: 'PAPER_READINESS', status: 'LIMITED', affectedCount: 3, hardBlockerCount: 0, topBlockers: [] },
    ],
    prioritizedBlockers: [
      { priority: 1, category: 'WEAK_OR_UNPROVEN_STRATEGY', count: 3, sourceModule: 'Strategy Framework', nextActionLabel: 'Review strategy rating proof', targetRoute: '/strategy-framework' },
    ],
  },
};

test.describe('Trade Plan Risk Engine UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/trade-plans/funnel**', async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('IN');
      expect(url.searchParams.get('assetType')).toBe('STOCK');
      expect(url.searchParams.get('includeLegacy')).toBeNull();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(funnelResponse) });
    });
    await page.route('**/api/v1/trade-plans/candidates**', async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('IN');
      expect(url.searchParams.get('assetType')).toBe('STOCK');
      expect(url.searchParams.get('includeLegacy')).toBeNull();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], total: 0 }) });
    });
  });

  test('shows scoped funnel diagnostics and a domain-specific empty state', async ({ page }) => {
    await visitModule(page, '/trade-plans', 'Trade Plans');

    await expect(page.getByText('Generation Funnel')).toBeVisible();
    await expect(page.getByText('IN/STOCK', { exact: true })).toBeVisible();
    await expect(page.getByText('Eligible Review Candidates')).toBeVisible();
    await expect(page.getByText('Blocked / Watch / Insufficient')).toBeVisible();
    await expect(page.getByText('Blocked / Watch / Insufficient').locator('xpath=..').getByText('3', { exact: true })).toBeVisible();
    await expect(page.getByText('3 UNPROVEN strategy rating')).toBeVisible();
    await expect(page.getByText('Paper Readiness Proof Chain')).toBeVisible();
    await expect(page.getByText('Strategy Proof: UNPROVEN (3)')).toBeVisible();
    await expect(page.getByText('1. 3 Review strategy rating proof')).toBeVisible();
    await expect(page.getByText('No trade plans found for IN/STOCK. Run Generate Plans after Strategy Decision has review candidates, or loosen the readiness/proof filters.')).toBeVisible();
  });

  test('batch generation sends scoped bounded requests and shows progress summary', async ({ page }) => {
    const payloads: any[] = [];
    let releaseFirstBatch: (() => void) | null = null;
    const firstBatchStarted = new Promise<void>((resolveStarted) => {
      releaseFirstBatch = resolveStarted;
    });
    await page.route('**/api/v1/trade-plans/generate/batch', async (route) => {
      const payload = route.request().postDataJSON();
      payloads.push(payload);
      const isFirst = payload.offset === 0;
      if (isFirst) await firstBatchStarted;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 25,
          processedCount: 25,
          generatedCount: 25,
          failedCount: 0,
          candidateCount: 25,
          rawCandidateCount: 50,
          eligibleCandidateCount: 25,
          skippedCount: 0,
          paperReadinessSummary: { READY_FOR_PAPER_REVIEW: isFirst ? 2 : 1 },
          topBlockers: [],
          backtestTimeframe: payload.backtestTimeframe,
          totalCount: 50,
          batchSize: payload.batchSize,
          offset: payload.offset,
          nextOffset: isFirst ? 25 : null,
          hasMore: isFirst,
          plans: [],
          failures: [],
        }),
      });
    });

    await visitModule(page, '/trade-plans', 'Trade Plans');
    await page.getByRole('button', { name: 'Generate Plans' }).click();

    await expect(page.getByRole('button', { name: 'Generating...' })).toBeVisible();
    await expect(page.getByText('Generating plans: discovering eligible Strategy Decision review candidates. Proof timeframe: 3Y.')).toBeVisible();
    releaseFirstBatch?.();
    await expect(page.getByText('Batch complete: 50 plans generated from 50 eligible Strategy Decision review candidates (50 discovered, 0 skipped). 3 are paper-ready. Proof timeframe: 3Y. Top blockers: none. Failed: 0.')).toBeVisible();
    expect(payloads).toEqual([
      expect.objectContaining({ region: 'IN', assetType: 'STOCK', batchSize: 25, offset: 0, backtestTimeframe: '3Y' }),
      expect.objectContaining({ region: 'IN', assetType: 'STOCK', batchSize: 25, offset: 25, backtestTimeframe: '3Y' }),
    ]);
  });

  test('detail lookup is scoped and explains when no scoped plan exists', async ({ page }) => {
    let detailUrl: URL | null = null;
    await page.route('**/api/v1/trade-plans/INST-1**', async (route) => {
      detailUrl = new URL(route.request().url());
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Trade plan not found for instrument.' }) });
    });

    await visitAuthenticated(page, '/trade-plans/INST-1');

    await expect.poll(() => detailUrl?.searchParams.get('region')).toBe('IN');
    await expect.poll(() => detailUrl?.searchParams.get('assetType')).toBe('STOCK');
    await expect(page.getByText('No scoped plan exists for IN/STOCK.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to Trade Plans' })).toBeVisible();
  });

  test('detail view formats plan money with persisted market currency', async ({ page }) => {
    await page.route('**/api/v1/trade-plans/INST-2**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'plan-2',
          instrumentId: 'INST-2',
          symbol: 'RELIANCE.NS',
          strategy: 'TREND_MOMENTUM',
          strategyVersion: '1.0.0',
          region: 'IN',
          assetType: 'STOCK',
          planStatus: 'VALID',
          riskGrade: 'MEDIUM',
          entryZone: { type: 'CURRENT_PRICE', referencePrice: 2500, preferredEntryMin: 2475, preferredEntryMax: 2525, quality: 'ACCEPTABLE', rationale: 'Entry near current price.' },
          stopLoss: { price: 2350, percentBelowEntry: 6, method: 'RECENT_SWING_LOW', quality: 'STRONG', rationale: 'Below recent support.' },
          target: { price: 2800, expectedReturnPercent: 12, method: 'REWARD_RISK_MULTIPLE', quality: 'ACCEPTABLE', rationale: 'Target is modeled at 2R by default.' },
          rewardRiskRatio: 2,
          positionSizing: { portfolioId: null, capitalBase: 100000, riskPercent: 1, maxRiskAmount: 1000, suggestedQuantity: 6, estimatedPositionValue: 15000, positionValuePercent: 15, notes: [] },
          portfolioImpact: null,
          invalidationRules: ['Daily close below stop loss level of 2350.00.'],
          warnings: [],
          blockers: [],
          dataGaps: [],
          paperReadinessStatus: 'WATCH_ONLY',
          paperReadinessBlockers: [],
          paperReadinessReasons: [],
          marketDataSnapshot: { instrumentId: 'INST-2', symbol: 'RELIANCE.NS', latestPrice: 2500, latestPriceTimestamp: '2026-05-10T00:00:00.000Z', latestCompletedTradingDate: '2026-05-10T00:00:00.000Z', latestStoredTradingDate: '2026-05-10T00:00:00.000Z', currency: 'INR', exchange: 'NSE', region: 'IN', assetType: 'STOCK', dataStatus: 'COMPLETE' },
          dataQualitySnapshot: { status: 'AVAILABLE', coverageStatus: 'GOOD', signalReadinessStatus: 'READY', liquidityStatus: 'LIQUID', warnings: [], blockers: [], generatedAt: '2026-05-10T00:00:00.000Z' },
          paperReadinessProofChain: {
            scope: { region: 'IN', assetType: 'STOCK', backtestTimeframe: null },
            generatedPlanCount: 1,
            paperReadyCount: 0,
            stages: [
              { stage: 'RISK_GEOMETRY', status: 'BLOCKED', affectedCount: 1, hardBlockerCount: 1, topBlockers: [{ code: 'INVALID_LONG_GEOMETRY', label: 'Invalid long geometry', count: 1, targetRoute: '/trade-plans' }] },
              { stage: 'PAPER_READINESS', status: 'BLOCKED', affectedCount: 1, hardBlockerCount: 0, topBlockers: [] },
            ],
            prioritizedBlockers: [
              { priority: 1, category: 'INVALID_LONG_GEOMETRY', count: 1, sourceModule: 'Trade Plan Risk Engine', nextActionLabel: 'Repair entry/stop/target geometry', targetRoute: '/trade-plans' },
            ],
          },
          generatedAt: '2026-05-10T00:00:00.000Z',
          modelVersion: 'trade-plan-risk-v1',
        }),
      });
    });

    await visitAuthenticated(page, '/trade-plans/INST-2');

    await expect(page.getByText('INR 2,475.00 - INR 2,525.00')).toBeVisible();
    await expect(page.getByText('INR 2,350.00')).toBeVisible();
    await expect(page.getByText('Estimated Value: INR 15,000.00')).toBeVisible();
    await expect(page.getByText('Latest Price: INR 2,500.00')).toBeVisible();
    await expect(page.getByText('$')).toHaveCount(0);
  });

  test('detail view shows geometry blocker when stop sits inside long entry zone', async ({ page }) => {
    await page.route('**/api/v1/trade-plans/cmo2xk6xa0010w5og9g9zg0am**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'plan-powergrid',
          instrumentId: 'cmo2xk6xa0010w5og9g9zg0am',
          symbol: 'POWERGRID.NS',
          strategy: 'PULLBACK_IN_UPTREND',
          strategyVersion: '1.0.0',
          region: 'IN',
          assetType: 'STOCK',
          planStatus: 'BLOCKED',
          riskGrade: 'HIGH',
          entryZone: { type: 'PULLBACK', referencePrice: 304.51, preferredEntryMin: 298.42, preferredEntryMax: 310.60, quality: 'STRONG', rationale: 'Preferred entry near SMA50 pullback support.' },
          stopLoss: { price: 307.49, percentBelowEntry: 0.81, method: 'RECENT_SWING_LOW', quality: 'WEAK', rationale: 'Stop placed slightly below recent 10-day swing low. Geometry blocked: stop must sit below the long entry-zone floor.' },
          target: { price: 326.86, expectedReturnPercent: 4.11, method: 'REWARD_RISK_MULTIPLE', quality: 'FALLBACK', rationale: 'Target is modeled at 2R by default.' },
          rewardRiskRatio: 2,
          positionSizing: { portfolioId: null, capitalBase: 100000, riskPercent: 1, maxRiskAmount: 1000, suggestedQuantity: 325, estimatedPositionValue: 100750, positionValuePercent: 100.75, notes: [] },
          portfolioImpact: null,
          invalidationRules: ['Plan is currently blocked. Consider review later.'],
          warnings: [],
          blockers: ['Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.'],
          dataGaps: [],
          paperReadinessStatus: 'BLOCKED',
          paperReadinessBlockers: [
            'Plan status is BLOCKED; VALID is required.',
            'Trade plan has active blockers.',
            'Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.',
          ],
          paperReadinessReasons: ['Trade plan status is VALID.', 'Risk grade is LOW.', 'Strategy Framework-backed proof is present.'],
          marketDataSnapshot: { instrumentId: 'cmo2xk6xa0010w5og9g9zg0am', symbol: 'POWERGRID.NS', latestPrice: 310, latestPriceTimestamp: '2026-05-10T00:00:00.000Z', latestCompletedTradingDate: '2026-05-10T00:00:00.000Z', latestStoredTradingDate: '2026-05-10T00:00:00.000Z', currency: 'INR', exchange: 'NSE', region: 'IN', assetType: 'STOCK', dataStatus: 'COMPLETE' },
          dataQualitySnapshot: { status: 'AVAILABLE', coverageStatus: 'GOOD', signalReadinessStatus: 'READY', liquidityStatus: 'LIQUID', warnings: [], blockers: [], generatedAt: '2026-05-10T00:00:00.000Z' },
          paperReadinessProofChain: {
            scope: { region: 'IN', assetType: 'STOCK', backtestTimeframe: null },
            generatedPlanCount: 1,
            paperReadyCount: 0,
            stages: [
              { stage: 'RISK_GEOMETRY', status: 'BLOCKED', affectedCount: 1, hardBlockerCount: 1, topBlockers: [{ code: 'INVALID_LONG_GEOMETRY', label: 'Invalid long geometry', count: 1, targetRoute: '/trade-plans' }] },
              { stage: 'PAPER_READINESS', status: 'BLOCKED', affectedCount: 1, hardBlockerCount: 0, topBlockers: [] },
            ],
            prioritizedBlockers: [
              { priority: 1, category: 'INVALID_LONG_GEOMETRY', count: 1, sourceModule: 'Trade Plan Risk Engine', nextActionLabel: 'Repair entry/stop/target geometry', targetRoute: '/trade-plans' },
            ],
          },
          generatedAt: '2026-05-10T00:00:00.000Z',
          modelVersion: 'trade-plan-risk-v1',
        }),
      });
    });

    await visitAuthenticated(page, '/trade-plans/cmo2xk6xa0010w5og9g9zg0am');

    await expect(page.getByText('Plan Blocked')).toBeVisible();
    await expect(page.getByText('INR 298.42 - INR 310.60')).toBeVisible();
    await expect(page.getByText('INR 307.49')).toBeVisible();
    await expect(page.getByText('Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.')).toHaveCount(1);
    await expect(page.getByText('Plan status is BLOCKED; VALID is required.', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Paper Readiness Reasons')).toHaveCount(0);
    await expect(page.getByText('Trade plan status is VALID.')).toHaveCount(0);
    await expect(page.getByText('Risk grade is LOW.')).toHaveCount(0);
    await expect(page.getByText('Strategy Framework-backed proof is present.')).toHaveCount(0);
    await page.getByRole('heading', { name: 'Proof Snapshot' }).scrollIntoViewIfNeeded();
    await expect(page.getByText('Risk Geometry: BLOCKED')).toBeVisible();
    await expect(page.getByText('1. Repair entry/stop/target geometry')).toBeVisible();
  });
});
