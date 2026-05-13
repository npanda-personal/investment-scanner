import { expect, test, type Page, type Route } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

const calibratedRow = {
  id: 'cal-1',
  signalResultId: 'sig-1',
  instrumentId: 'stock-1',
  symbol: 'RELIANCE.NS',
  companyName: 'Reliance Industries',
  sector: 'Energy',
  country: 'India',
  exchange: 'NSE',
  region: 'IN',
  assetType: 'STOCK',
  rawScore: 78,
  calibratedScore: 72,
  scoreDelta: -6,
  rawDirection: 'BULLISH',
  calibratedDirection: 'BULLISH',
  rawConfidence: 'HIGH',
  calibratedConfidence: 'LOW',
  boosts: [{ type: 'SMART_MONEY', label: 'Accumulation confirmation', delta: 3 }],
  penalties: [{ type: 'SAMPLE', label: 'Low sample evidence', delta: -6 }],
  calibrationReasons: ['Sample evidence lowered confidence.'],
  dataGaps: ['Sector sample below threshold'],
  calibrationModelVersion: 'signal-calibration-v2',
  rawSignalModelVersion: 'signal-generation-v1',
  generatedAt: '2026-05-10T00:00:00.000Z',
  dataStatus: 'READY',
  researchUrl: '/research/stocks/stock-1',
  calibrationApplied: true,
  adjustmentCapApplied: 6,
  sampleSizePenaltyApplied: true,
  overallEvaluatedSamples: 110,
  groupEvaluatedSamples: 18,
  evidenceStatus: 'LOW_SAMPLE',
  warningsCount: 1,
  calibrationEvidence: {
    horizon: '20D',
    overallEvaluatedSamples: 110,
    groupEvaluatedSamples: 18,
    minimumOverallSamples: 50,
    minimumGroupSamples: 20,
    horizonAvailability: {
      '20D': { eligible: 150, evaluated: 110, insufficientFuturePrice: 40 },
    },
    dataStatus: 'PARTIAL',
    evidenceStatus: 'LOW_SAMPLE',
    evidenceReasons: ['Overall evidence is available.'],
    evidenceWarnings: ['Group sample is below calibration threshold.'],
    warnings: ['Group sample is below calibration threshold.'],
  },
  calibrationReadiness: {
    status: 'LIMITED',
    confidenceTier: 'LOW',
    calibrationApplied: true,
    adjustmentCapApplied: 6,
    downstreamInfluence: 'LIMITED',
    authoritativeScore: 'CALIBRATED_SCORE',
    reasons: ['Group sample is below calibration threshold.'],
    blockers: [],
  },
  confidenceTier: 'LOW',
  downstreamInfluence: 'LIMITED',
  authoritativeScore: 'CALIBRATED_SCORE',
};

async function mockCalibrationApi(page: Page) {
  await page.route('**/api/v1/signals/calibration/model', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        calibrationModelVersion: 'signal-calibration-v2',
        qualityMetricWindow: '20D',
        supportedHorizons: ['1D', '5D', '10D', '20D', '60D'],
        defaultHorizon: '20D',
        minSampleSize: 50,
        minOverallSamples: 50,
        minGroupSamples: 20,
        perAdjustmentDeltaCap: 10,
        totalDeltaCap: 25,
        rules: ['Preserve raw signal when samples are insufficient.'],
        sampleSafetyRules: ['Require enough overall and group evidence before applying larger adjustments.'],
        calibrationReadinessRules: ['Unavailable evidence sets downstream influence to NONE.'],
        fallbackBehavior: 'Preserve raw score when evidence is insufficient.',
      }),
    });
  });

  await page.route('**/api/v1/signals/calibration/health', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ calibratedSignals: 1, latestGeneratedAt: '2026-05-10T00:00:00.000Z' }),
    });
  });

  await page.route('**/api/v1/signals/calibration/top**', async (route: Route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('region')).toBe('IN');
    expect(url.searchParams.get('assetType')).toBe('STOCK');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [calibratedRow],
        totalCount: 1,
        limit: 25,
        offset: 0,
        hasMore: false,
        sortBy: 'generatedAt',
        sortDirection: 'desc',
      }),
    });
  });
}

test.describe('Signal Calibration Engine UI', () => {
  test('shows calibrated evidence fields and scoped batch run payload', async ({ page }) => {
    await mockCalibrationApi(page);
    let runPayload: any = null;
    await page.route('**/api/v1/signals/calibration/run', async (route: Route) => {
      runPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generated: 1,
          skipped: 0,
          errors: [],
          results: [calibratedRow],
          generatedAt: '2026-05-10T00:00:00.000Z',
          processedCount: 1,
          totalCount: 1,
          batchSize: runPayload.batchSize,
          offset: runPayload.offset,
          nextOffset: null,
          hasMore: false,
          calibratedCount: 1,
          passthroughCount: 0,
          skippedCount: 0,
          failedCount: 0,
          outOfScopeSkipped: 0,
          warnings: [],
          durationMs: 25,
        }),
      });
    });

    await visitModule(page, '/signals/calibration', 'Signal Calibration Engine');

    await expect(page.getByText('Calibration uses historical evidence and context snapshots for research support only.')).toBeVisible();
    await expect(page.getByText('Calibration Sample Warning')).toBeVisible();
    await expect(page.getByText('Group sample is below calibration threshold.')).toBeVisible();
    await expect(page.getByText('Readiness', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Downstream Influence', { exact: true })).toBeVisible();
    await expect(page.getByText('Limited Evidence on Page', { exact: true })).toBeVisible();
    expect(await page.getByRole('columnheader', { name: 'Raw' }).count()).toBeGreaterThan(0);
    expect(await page.getByRole('columnheader', { name: 'Calibrated' }).count()).toBeGreaterThan(0);
    expect(await page.getByRole('columnheader', { name: 'Evidence' }).count()).toBeGreaterThan(0);
    expect(await page.getByRole('columnheader', { name: 'Readiness' }).count()).toBeGreaterThan(0);
    expect(await page.getByRole('columnheader', { name: 'Influence' }).count()).toBeGreaterThan(0);
    await expect(page.getByText('RELIANCE.NS')).toBeVisible();
    await expect(page.getByText('LOW_SAMPLE')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'LIMITED' }).first()).toBeVisible();
    await expect(page.getByText('CALIBRATED_SCORE')).toBeVisible();
    await expect(page.getByText('110 / 18')).toBeVisible();

    await page.getByRole('button', { name: 'Run Calibration' }).click();
    await expect(page.getByText('Calibration complete for IN / STOCK.')).toBeVisible();
    expect(runPayload).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      horizon: '20D',
      offset: 0,
    });
    expect(runPayload.batchSize).toBeLessThanOrEqual(100);
  });
});
