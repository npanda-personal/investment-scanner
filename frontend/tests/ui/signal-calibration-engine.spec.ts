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
    evidenceBasis: {
      status: 'HORIZON_LIMITED',
      signalQualityGeneratedAt: '2026-05-10T09:30:00.000Z',
      latestMeasurablePriceDate: '2026-05-09',
      nextEvaluableDate: '2026-05-27',
      reasonSummary: 'Selected horizon 20D is still maturing; evidence currently measures outcomes through 2026-05-09.',
    },
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
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-signal-calibration-token');
  });
  await page.route('**/api/v1/auth/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'playwright-signal-calibration-user',
        email: 'codex.test@example.com',
        name: 'Codex Test',
        createdAt: '2026-05-25T00:00:00.000Z',
        updatedAt: '2026-05-25T00:00:00.000Z',
        lastLoginAt: '2026-05-25T00:00:00.000Z',
      }),
    });
  });
  await page.route('**/api/v1/auth/logout', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  let healthRequested = false;
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
    healthRequested = true;
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
    expect(url.searchParams.get('sortBy')).toBe('calibratedScore');
    expect(url.searchParams.get('sortDirection')).toBe('desc');
    expect(url.searchParams.get('horizon')).toBe('20D');
    const leadingRow = {
      ...calibratedRow,
      id: 'cal-2',
      symbol: 'INFY.NS',
      calibratedConfidence: 'HIGH',
      evidenceStatus: 'SUFFICIENT',
      scoreDelta: 4,
      dataGaps: [],
      warningsCount: 0,
      calibrationEvidence: {
        ...calibratedRow.calibrationEvidence,
        evidenceStatus: 'SUFFICIENT',
        evidenceWarnings: [],
        warnings: [],
        evidenceBasis: {
          status: 'MEASURED',
          signalQualityGeneratedAt: '2026-05-10T09:30:00.000Z',
          latestMeasurablePriceDate: '2026-05-10',
          nextEvaluableDate: null,
          reasonSummary: 'Measured evidence for 20D is available through 2026-05-10.',
        },
      },
      calibrationReadiness: {
        ...calibratedRow.calibrationReadiness,
        status: 'USABLE',
        confidenceTier: 'HIGH',
        downstreamInfluence: 'NORMAL',
      },
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [leadingRow, calibratedRow],
        totalCount: 2,
        limit: Number(url.searchParams.get('limit') || 25),
        offset: Number(url.searchParams.get('offset') || 0),
        hasMore: false,
        sortBy: 'calibratedScore',
        sortDirection: 'desc',
        pageSummary: {
          scope: { region: 'IN', assetType: 'STOCK', horizon: '20D' },
          itemsOnPage: 2,
          totalScopedRows: 2,
          calibrationEvidence: {
            ...calibratedRow.calibrationEvidence,
            evidenceStatus: 'MISSING',
            evidenceWarnings: ['Signal Quality diagnostics unavailable for this scope.'],
            warnings: ['Signal Quality diagnostics unavailable for this scope.'],
            evidenceBasis: {
              status: 'MISSING_SIGNAL_QUALITY_EVIDENCE',
              signalQualityGeneratedAt: null,
              latestMeasurablePriceDate: null,
              nextEvaluableDate: null,
              reasonSummary: 'Signal Quality evidence basis is missing for 20D.',
            },
          },
          calibrationReadiness: {
            ...calibratedRow.calibrationReadiness,
            status: 'UNAVAILABLE',
            confidenceTier: 'INSUFFICIENT_SAMPLE',
            downstreamInfluence: 'NONE',
            authoritativeScore: 'RAW_SCORE',
            blockers: ['Signal Quality evidence is missing.'],
          },
        },
      }),
    });
  });
  return {
    wasHealthRequested: () => healthRequested,
  };
}

test.describe('Signal Calibration Engine UI', () => {
  test('shows calibrated evidence fields and scoped batch run payload', async ({ page }) => {
    const api = await mockCalibrationApi(page);
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
    await expect(page.getByText('Signal Quality diagnostics unavailable for this scope.')).toBeVisible();
    await expect(page.getByText('Calibration Evidence Warnings')).toBeVisible();
    await expect(page.getByText('1 visible rows have warnings or data gaps. Use filters or CSV export for row-level evidence.')).toBeVisible();
    await expect(page.getByText('Calibration Readiness Blocked')).toBeVisible();
    await expect(page.getByText('Signal Quality evidence is missing.')).toBeVisible();
    await expect(page.getByText('Readiness', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Downstream Influence', { exact: true })).toBeVisible();
    await expect(page.getByText('Evidence Basis', { exact: true })).toBeVisible();
    await expect(page.getByText('Normal Influence on Page', { exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Evidence Through' })).toBeVisible();
    await expect(page.getByText('MISSING_SIGNAL_QUALITY_EVIDENCE')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'UNAVAILABLE' }).first()).toBeVisible();
    await expect(page.getByText('Limited Evidence on Page', { exact: true })).toBeVisible();
    expect(await page.getByRole('columnheader', { name: 'Calibrated' }).count()).toBeGreaterThan(0);
    expect(await page.getByRole('columnheader', { name: 'Evidence' }).count()).toBeGreaterThan(0);
    expect(await page.getByRole('columnheader', { name: 'Evidence Through' }).count()).toBeGreaterThan(0);
    expect(await page.getByRole('columnheader', { name: 'Readiness' }).count()).toBeGreaterThan(0);
    expect(await page.getByRole('columnheader', { name: 'Influence' }).count()).toBeGreaterThan(0);
    await expect(page.getByText('RELIANCE.NS')).toBeVisible();
    await expect(page.getByText('INFY.NS')).toBeVisible();
    await expect(page.getByText('Low Sample')).toBeVisible();
    await expect(page.getByText('Limited').nth(1)).toBeVisible();
    expect(await page.getByText('110 / 18').count()).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('signal-calibration-in-stock');
    await expect(page.getByText('Exported 2 latest-per-stock calibration rows for IN / STOCK as an Excel-compatible CSV.')).toBeVisible();
    expect(await page.getByRole('cell', { name: '110 / 18' }).count()).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Run Calibration' }).click();
    await expect(page.getByText('Calibration complete for IN / STOCK.')).toBeVisible();
    expect(runPayload).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      horizon: '20D',
      offset: 0,
    });
    expect(runPayload.batchSize).toBeLessThanOrEqual(100);
    expect(api.wasHealthRequested()).toBe(false);
  });

  test('fail-closes page summary after a scoped /top request fails following a successful load', async ({ page }) => {
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
          rules: [],
          sampleSafetyRules: [],
          calibrationReadinessRules: [],
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
      if (url.searchParams.get('horizon') !== '10D') {
        const row = {
          ...calibratedRow,
          evidenceStatus: 'SUFFICIENT',
          calibrationEvidence: {
            ...calibratedRow.calibrationEvidence,
            evidenceStatus: 'SUFFICIENT',
            evidenceWarnings: [],
            warnings: [],
            evidenceBasis: {
              status: 'MEASURED',
              signalQualityGeneratedAt: '2026-05-10T09:30:00.000Z',
              latestMeasurablePriceDate: '2026-05-10',
              nextEvaluableDate: null,
              reasonSummary: 'Measured evidence for 20D is available through 2026-05-10.',
            },
          },
          calibrationReadiness: {
            ...calibratedRow.calibrationReadiness,
            status: 'USABLE',
            confidenceTier: 'HIGH',
            downstreamInfluence: 'NORMAL',
            blockers: [],
          },
        };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [row],
            totalCount: 1,
            limit: 25,
            offset: 0,
            hasMore: false,
            sortBy: 'generatedAt',
            sortDirection: 'desc',
            pageSummary: {
              scope: { region: 'IN', assetType: 'STOCK', horizon: '20D' },
              itemsOnPage: 1,
              totalScopedRows: 1,
              calibrationEvidence: row.calibrationEvidence,
              calibrationReadiness: row.calibrationReadiness,
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Scoped top failed' }),
      });
    });

    await visitModule(page, '/signals/calibration', 'Signal Calibration Engine');

    await expect(page.getByText('MEASURED')).toBeVisible();
    await expect(page.getByText('RELIANCE.NS')).toBeVisible();

    await page.getByRole('combobox', { name: /Horizon/i }).click();
    await page.getByRole('option', { name: '10D' }).click();

    await expect(page.getByText('Scoped top failed')).toBeVisible();
    await expect(page.getByText('MISSING_SIGNAL_QUALITY_EVIDENCE')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'UNAVAILABLE' }).first()).toBeVisible();
    await expect(page.getByText('Signal Quality diagnostics unavailable for this scope.')).toBeVisible();
    await expect(page.getByText('RELIANCE.NS')).not.toBeVisible();
  });
});
