import { expect, test, type Page, type Route } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

const dashboardPayload = {
  summary: {
    selectedHorizon: '20D',
    evidenceUsability: 'LIMITED',
    totalSignals: 3,
    matureSignals: 2,
    evaluatedSignals: 2,
    notYetMatureSignals: 1,
    unevaluatedSignals: 1,
    overallBullishWinRate: 0.5,
    overallBearishWinRate: 0,
    average5DReturn: 0.02,
    average20DReturn: 0.03,
    bestPerformingSignalType: 'PRICE_ABOVE_SMA50',
    worstPerformingSignalType: 'PE_ABOVE_PEERS',
    bestSector: 'Financials',
    worstSector: 'Utilities',
    noisySignalCount: 0,
    dataStatus: 'PARTIAL',
    generatedAt: '2026-05-11T00:00:00.000Z',
    recommendedAction: 'Try a shorter horizon.',
    warnings: [],
    dataQualityFilterSummary: {
      totalSignalsBeforeFilter: 3,
      totalSignalsAfterFilter: 3,
      excludedByDataQuality: 0,
      missingQualityEvaluationCount: 0,
      filterApplied: false,
    },
    evaluationDiagnostics: {
      totalSignals: 3,
      signalsAfterFilters: 3,
      matureSignals: 2,
      evaluatedSignals: 2,
      notYetMatureSignals: 1,
      unevaluatedSignals: 1,
      insufficientFuturePriceCount: 1,
      missingPriceHistoryCount: 0,
      missingInstrumentCount: 0,
      excludedByDataQualityCount: 0,
      excludedByDateFilterCount: 0,
      excludedByDirectionCount: 0,
      selectedHorizon: '20D',
      earliestSignalDate: '2026-04-01T00:00:00.000Z',
      latestSignalDate: '2026-05-01T00:00:00.000Z',
      latestAvailablePriceDate: '2026-05-11T00:00:00.000Z',
      minimumRequiredFutureRows: 20,
      nextEvaluableDate: '2026-05-21T00:00:00.000Z',
      recommendedAction: 'Try a shorter horizon.',
      warnings: [],
    },
    horizonAvailability: {
      '1D': { eligible: 3, evaluated: 3, insufficientFuturePrice: 0, missingPriceHistory: 0, evidenceUsability: 'LIMITED' },
      '5D': { eligible: 3, evaluated: 2, insufficientFuturePrice: 1, missingPriceHistory: 0, evidenceUsability: 'LIMITED' },
      '10D': { eligible: 3, evaluated: 2, insufficientFuturePrice: 1, missingPriceHistory: 0, evidenceUsability: 'LIMITED' },
      '20D': { eligible: 3, evaluated: 2, insufficientFuturePrice: 1, missingPriceHistory: 0, evidenceUsability: 'LIMITED' },
      '60D': { eligible: 3, evaluated: 1, insufficientFuturePrice: 2, missingPriceHistory: 0, evidenceUsability: 'LIMITED' },
    },
  },
  byType: [],
  bySector: [],
  byRegime: [],
  byDataQuality: [],
  noisy: [],
};

const zeroEvaluablePayload = {
  ...dashboardPayload,
  summary: {
    ...dashboardPayload.summary,
    evidenceUsability: 'UNAVAILABLE',
    totalSignals: 3,
    matureSignals: 0,
    evaluatedSignals: 0,
    notYetMatureSignals: 2,
    unevaluatedSignals: 2,
    overallBullishWinRate: null,
    overallBearishWinRate: null,
    average5DReturn: null,
    average20DReturn: null,
    evaluationDiagnostics: {
      ...dashboardPayload.summary.evaluationDiagnostics,
      matureSignals: 0,
      evaluatedSignals: 0,
      notYetMatureSignals: 2,
      unevaluatedSignals: 2,
      insufficientFuturePriceCount: 2,
      missingPriceHistoryCount: 1,
      recommendedAction: 'Try a shorter horizon such as 1D or 5D, sync latest market data, or wait until enough future trading days exist.',
    },
    horizonAvailability: {
      '1D': { eligible: 2, evaluated: 2, insufficientFuturePrice: 0, missingPriceHistory: 1, evidenceUsability: 'LIMITED' },
      '5D': { eligible: 2, evaluated: 1, insufficientFuturePrice: 1, missingPriceHistory: 1, evidenceUsability: 'LIMITED' },
      '10D': { eligible: 2, evaluated: 0, insufficientFuturePrice: 2, missingPriceHistory: 1, evidenceUsability: 'UNAVAILABLE' },
      '20D': { eligible: 2, evaluated: 0, insufficientFuturePrice: 2, missingPriceHistory: 1, evidenceUsability: 'UNAVAILABLE' },
      '60D': { eligible: 2, evaluated: 0, insufficientFuturePrice: 2, missingPriceHistory: 1, evidenceUsability: 'UNAVAILABLE' },
    },
  },
};

async function routeDashboard(page: Page, payload = dashboardPayload) {
  await page.route('**/api/v1/signals/quality/dashboard**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
}

test.describe('Signal Quality Lab UI', () => {
  test('exposes horizon controls and recalculation workflow', async ({ page }) => {
    await routeDashboard(page);
    await visitModule(page, '/signals/quality', 'Signal Quality Lab');
    await expect(page.getByRole('button', { name: 'Refresh Diagnostics' })).toBeVisible();
    await expect(page.getByText('Horizon').first()).toBeVisible();
    await page.getByRole('tab', { name: 'Performance' }).click();
    await expect(page.getByText('Horizon Availability')).toBeVisible();
  });

  test('sends selected model version through dashboard and recalculation requests', async ({ page }) => {
    const dashboardUrls: string[] = [];
    let recalculatePayload: any = null;
    await page.route('**/api/v1/signals/quality/dashboard**', async (route: Route) => {
      dashboardUrls.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dashboardPayload),
      });
    });
    await page.route('**/api/v1/signals/quality/recalculate', async (route) => {
      recalculatePayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          processedCount: 1,
          totalCount: 1,
          batchSize: recalculatePayload.batchSize,
          offset: recalculatePayload.offset,
          nextOffset: null,
          hasMore: false,
          selectedHorizon: '20D',
          evidenceUsability: 'LIMITED',
          evaluatedCount: 1,
          unevaluatedCount: 0,
          missingPriceHistoryInBatch: 0,
          missingPriceHistoryCount: 0,
          warnings: [],
          durationMs: 1,
        }),
      });
    });

    await visitModule(page, '/signals/quality', 'Signal Quality Lab');
    await page.getByLabel('Model version').fill('signal-engine-v1');

    await expect(page.getByLabel('Model version')).toHaveValue('signal-engine-v1');
    await expect.poll(() => dashboardUrls.some((url) => url.includes('modelVersion=signal-engine-v1'))).toBe(true);

    await page.getByRole('button', { name: 'Refresh Diagnostics' }).click();
    await expect.poll(() => recalculatePayload).toMatchObject({ modelVersion: 'signal-engine-v1' });
  });

  test('recalculate sends selected horizon and scoped bounded batch request without real recalculation', async ({ page }) => {
    let recalculatePayload: any = null;
    await routeDashboard(page);
    await page.route('**/api/v1/signals/quality/recalculate', async (route) => {
      recalculatePayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          processedCount: 1,
          totalCount: 1,
          batchSize: recalculatePayload.batchSize,
          offset: recalculatePayload.offset,
          nextOffset: null,
          hasMore: false,
          selectedHorizon: '20D',
          evidenceUsability: 'LIMITED',
          evaluatedCount: 1,
          matureSignalsInBatch: 1,
          unevaluatedCount: 0,
          notYetMatureInBatch: 0,
          insufficientFuturePriceInBatch: 0,
          insufficientFuturePriceCount: 0,
          missingPriceHistoryInBatch: 0,
          missingPriceHistoryCount: 0,
          warnings: [],
          durationMs: 1,
        }),
      });
    });

    await visitModule(page, '/signals/quality', 'Signal Quality Lab');
    await page.getByRole('button', { name: 'Refresh Diagnostics' }).click();

    await expect.poll(() => recalculatePayload).toMatchObject({
      batchSize: 100,
      offset: 0,
      horizon: '20D',
      region: 'IN',
      assetType: 'STOCK',
    });
    await expect(page.getByText('Signal quality refresh complete. Processed 1 / 1 signal records.')).toBeVisible();
    await expect(page.getByText('insufficient future price rows 0, missing local price history 0')).toBeVisible();
  });

  test('direct entry and hard reload settle into dashboard content instead of a generic spinner', async ({ page }) => {
    await routeDashboard(page);

    await visitModule(page, '/signals/quality', 'Signal Quality Lab');
    await expect(page.getByText('Total Signals')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Signal Quality Lab' })).toBeVisible();
    await expect(page.getByText('Total Signals')).toBeVisible();
    await expect(page.getByText('Loading Signal Quality dashboard')).toHaveCount(0);
  });

  test('explains zero-evaluable selected horizon without showing win-rate confidence', async ({ page }) => {
    await routeDashboard(page, zeroEvaluablePayload);

    await visitModule(page, '/signals/quality', 'Signal Quality Lab');

    await expect(page.getByText('Evidence usability is UNAVAILABLE')).toBeVisible();
    await expect(page.getByText('Missing local price history affects 1 signal, and 2 signals do not yet have 20 future trading rows.')).toBeVisible();
    await expect(page.getByText('Evidence Usability', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'UNAVAILABLE' })).toBeVisible();
    await expect(page.getByText('Mature / Evaluable')).toBeVisible();
    await expect(page.getByText('Insufficient Future Rows')).toBeVisible();
    await expect(page.getByText('Missing Price History')).toBeVisible();
    await expect(page.getByText('Bullish Win Rate')).toHaveCount(0);

    await page.getByRole('tab', { name: 'Performance' }).click();
    await expect(page.getByText('Selected 20D: eligible 2, mature/evaluable 0, not yet mature 2, missing price 1, evidence UNAVAILABLE.')).toBeVisible();
    await expect(page.getByText('A shorter horizon has evaluated samples.')).toBeVisible();
  });

  test('dashboard timeout shows Signal Quality-specific retry state', async ({ page }) => {
    test.setTimeout(70_000);
    await page.route('**/api/v1/signals/quality/dashboard**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 25_000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dashboardPayload),
      });
    });

    await visitModule(page, '/signals/quality', 'Signal Quality Lab');

    await expect(page.getByText('Signal Quality dashboard request timed out')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.getByText('Loading Signal Quality dashboard')).toHaveCount(0);
  });
});
