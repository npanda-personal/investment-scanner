import { expect, test } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

test.describe('Data Quality Engine UI', () => {
  test('exposes scoped evaluation controls and readiness columns', async ({ page }) => {
    await visitModule(page, '/data-quality', 'Data Quality Engine');
    await expect(page.getByRole('button', { name: 'Evaluate Scope' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
    await expect(page.getByText('Coverage').first()).toBeVisible();
    await expect(page.getByText('Signal Readiness').first()).toBeVisible();
  });

  test('evaluate scope sends scoped bounded batch request without running the real evaluation', async ({ page }) => {
    let evaluatePayload: any = null;
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
