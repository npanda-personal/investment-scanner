import { expect, test } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

test.describe('Signal Quality Lab UI', () => {
  test('exposes horizon controls and recalculation workflow', async ({ page }) => {
    await visitModule(page, '/signals/quality', 'Signal Quality Lab');
    await expect(page.getByRole('button', { name: 'Recalculate' })).toBeVisible();
    await expect(page.getByText('Horizon').first()).toBeVisible();
    await page.getByRole('tab', { name: 'Performance' }).click();
    await expect(page.getByText('Horizon Availability')).toBeVisible();
  });

  test('recalculate sends selected horizon and scoped bounded batch request without real recalculation', async ({ page }) => {
    let recalculatePayload: any = null;
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
});
