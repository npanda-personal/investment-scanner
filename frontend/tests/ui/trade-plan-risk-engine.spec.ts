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
    await expect(page.getByText('Eligible Plan Candidates')).toBeVisible();
    await expect(page.getByText('Blocked / Watch / Insufficient')).toBeVisible();
    await expect(page.getByText('Blocked / Watch / Insufficient').locator('xpath=..').getByText('3', { exact: true })).toBeVisible();
    await expect(page.getByText('3 UNPROVEN strategy rating')).toBeVisible();
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
    await expect(page.getByText('Generating plans: discovering eligible Strategy Decision candidates. Proof timeframe: 3Y.')).toBeVisible();
    releaseFirstBatch?.();
    await expect(page.getByText('Batch complete: 50 plans generated from 50 eligible Strategy Decision candidates (50 discovered, 0 skipped). 3 are paper-ready. Proof timeframe: 3Y. Top blockers: none. Failed: 0.')).toBeVisible();
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
});
