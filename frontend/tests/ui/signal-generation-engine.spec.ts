import { expect, test } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

test.describe('Signal Generation Engine UI', () => {
  test('exposes raw signal filters and batch action', async ({ page }) => {
    await visitModule(page, '/signals', 'Signal Generation Engine');
    await expect(page.getByRole('button', { name: 'Run Signals' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View Signal Quality Lab' })).toBeVisible();
    await expect(page.getByText('Raw signals are confirmation inputs')).toBeVisible();
    await expect(page.getByText('Use data quality filter')).toBeVisible();
    await expect(page.getByText('Direction').first()).toBeVisible();
  });

  test('run signals sends scoped bounded batch request without running the real calculation', async ({ page }) => {
    let runPayload: any = null;
    await page.route('**/api/v1/signals/run', async (route) => {
      runPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          processedCount: 1,
          totalCount: 1,
          batchSize: runPayload.batchSize,
          offset: runPayload.offset,
          nextOffset: null,
          hasMore: false,
          generatedCount: 1,
          updatedCount: 0,
          noOpCount: 0,
          skippedCount: 0,
          failedCount: 0,
          warnings: [],
          durationMs: 1,
        }),
      });
    });

    await visitModule(page, '/signals', 'Signal Generation Engine');
    await page.getByRole('button', { name: 'Run Signals' }).click();

    await expect.poll(() => runPayload).toMatchObject({
      batchSize: 100,
      limit: 100,
      offset: 0,
      maxConcurrency: 4,
      useDataQualityFilter: true,
      region: 'IN',
      assetType: 'STOCK',
    });
    await expect(page.getByText('Signal generation complete. Processed 1 instruments across 1 batches.')).toBeVisible();
  });
});
