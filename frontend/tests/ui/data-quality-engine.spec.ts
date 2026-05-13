import { expect, test } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

test.describe('Data Quality Engine UI', () => {
  test('exposes scoped evaluation controls and readiness columns', async ({ page }) => {
    await mockReviewReadiness(page);
    await visitModule(page, '/data-quality', 'Data Quality Engine');
    await expect(page.getByRole('button', { name: 'Evaluate Scope' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
    await expect(page.getByText('Coverage').first()).toBeVisible();
    await expect(page.getByText('Signal Readiness').first()).toBeVisible();
    await expect(page.getByText('Review Readiness Summary')).toBeVisible();
    await expect(page.getByText('Mode: LIMITED_REVIEW')).toBeVisible();
    await expect(page.getByText('Next bounded action: Validate unknown providers')).toBeVisible();
  });

  test('evaluate scope sends scoped bounded batch request without running the real evaluation', async ({ page }) => {
    let evaluatePayload: any = null;
    await mockReviewReadiness(page);
    await page.route('**/api/v1/data-quality/evaluate', async (route) => {
      evaluatePayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          processedCount: 1,
          totalCount: 1,
          batchSize: evaluatePayload.batchSize,
          offset: evaluatePayload.offset,
          nextOffset: null,
          hasMore: false,
          evaluatedCount: 1,
          skippedCount: 0,
          failedCount: 0,
          warnings: [],
          durationMs: 1,
        }),
      });
    });

    await visitModule(page, '/data-quality', 'Data Quality Engine');
    await page.getByRole('button', { name: 'Evaluate Scope' }).click();

    await expect.poll(() => evaluatePayload).toMatchObject({
      batchSize: 100,
      offset: 0,
      region: 'IN',
      assetType: 'STOCK',
    });
    await expect(page.getByText('Evaluation complete. Processed 1 instruments across 1 batches.')).toBeVisible();
  });
});

async function mockReviewReadiness(page: any) {
  await page.route('**/api/v1/market-data/review-readiness-summary**', async (route: any) => {
    await route.fulfill({
      json: {
        scope: { region: 'IN', assetType: 'STOCK' },
        reviewMode: 'LIMITED_REVIEW',
        trustStatus: 'PARTIAL',
        userDecision: 'PROCEED_LIMITED',
        reviewUniverse: {
          catalogCount: 2910,
          providerSupportedCount: 585,
          trustedCount: 144,
          targetTradingDate: '2026-05-12',
          requiredDataThroughDate: '2026-05-11',
          storedDataThroughDate: '2026-05-11',
        },
        readinessCounts: {
          priceReady: 144,
          reviewReady: 0,
          missingLatestPrice: 2325,
          staleLatestPrice: 200,
          inadequateHistory: 30,
          missingRecentVolume: 20,
        },
        nextAction: { code: 'VALIDATE_PROVIDERS', label: 'Validate unknown providers', boundedRequest: { batchSize: 50, region: 'IN', assetType: 'STOCK' } },
        blockers: [
          { category: 'PROVIDER_VALIDATION', severity: 'HARD_BLOCKER', affectedCount: 2909, nextActionLabel: 'Validate unknown providers' },
        ],
      },
    });
  });
}
