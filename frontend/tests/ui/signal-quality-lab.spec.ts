import { expect, test, type Page, type Route } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

const dashboardPayload = {
  summary: {
    totalSignals: 3,
    evaluatedSignals: 2,
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
      rawSignalCount: 3,
      signalsAfterFilters: 3,
      evaluatedSignals: 2,
      unevaluatedSignals: 1,
      insufficientFuturePriceCount: 1,
      missingPriceHistoryCount: 0,
      selectedHorizon: '20D',
      minimumRequiredFutureRows: 20,
      recommendedAction: 'Try a shorter horizon.',
      warnings: [],
    },
    horizonAvailability: {
      '1D': { eligible: 3, evaluated: 3, insufficientFuturePrice: 0 },
      '5D': { eligible: 3, evaluated: 2, insufficientFuturePrice: 1 },
      '10D': { eligible: 3, evaluated: 2, insufficientFuturePrice: 1 },
      '20D': { eligible: 3, evaluated: 2, insufficientFuturePrice: 1 },
      '60D': { eligible: 3, evaluated: 1, insufficientFuturePrice: 2 },
    },
  },
  byType: [],
  bySector: [],
  byRegime: [],
  byDataQuality: [],
  noisy: [],
};

async function routeDashboard(page: Page) {
  await page.route('**/api/v1/signals/quality/dashboard**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dashboardPayload),
    });
  });
}

test.describe('Signal Quality Lab UI', () => {
  test('exposes horizon controls and recalculation workflow', async ({ page }) => {
    await routeDashboard(page);
    await visitModule(page, '/signals/quality', 'Signal Quality Lab');
    await expect(page.getByRole('button', { name: 'Recalculate' })).toBeVisible();
    await expect(page.getByText('Horizon').first()).toBeVisible();
    await page.getByRole('tab', { name: 'Performance' }).click();
    await expect(page.getByText('Horizon Availability')).toBeVisible();
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
          evaluatedCount: 1,
          unevaluatedCount: 0,
          missingPriceHistoryCount: 0,
          warnings: [],
          durationMs: 1,
        }),
      });
    });

    await visitModule(page, '/signals/quality', 'Signal Quality Lab');
    await page.getByRole('button', { name: 'Recalculate' }).click();

    await expect.poll(() => recalculatePayload).toMatchObject({
      batchSize: 100,
      offset: 0,
      horizon: '20D',
      region: 'IN',
      assetType: 'STOCK',
    });
    await expect(page.getByText('Signal quality refresh complete. Processed 1 / 1 signal records.')).toBeVisible();
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
