import { expect, test } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

test.describe('Market Data Foundation UI', () => {
  test('catalog table exposes scoped instrument fields and compact filters', async ({ page }) => {
    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await expect(page.getByRole('button', { name: 'Sync Catalog' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingestion' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Instrument' })).toBeVisible();
    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Segment/Class').first()).toBeVisible();
    await expect(page.getByText('Provider Support').first()).toBeVisible();
    await expect(page.getByText('No configured URL for this source')).toHaveCount(0);
  });

  test('import and backfill panel exposes usable catalog actions', async ({ page }) => {
    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await page.getByRole('tab', { name: 'Import & Backfill' }).click();
    await expect(page.getByRole('button', { name: 'Import Catalog' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Backfill Metadata' })).toBeVisible();
    await expect(page.getByText('NSE Equity Securities')).toBeVisible();
  });

  test('configured catalog import sends safe source mode without running a real import', async ({ page }) => {
    let importPayload: any = null;
    await page.route('**/api/v1/market-data/catalog/import', async (route) => {
      importPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          catalogSource: importPayload.catalogSource,
          importMode: importPayload.importMode,
          downloaded: true,
          fileSizeBytes: 1024,
          tempFileDeleted: true,
          sourceRows: 1,
          processedCount: 1,
          totalCount: 1,
          batchSize: importPayload.batchSize,
          offset: importPayload.offset,
          nextOffset: null,
          hasMore: false,
          insertedCount: 0,
          updatedCount: 0,
          noOpCount: 1,
          invalidCount: 0,
          providerValidatedCount: 0,
          providerUnsupportedCount: 0,
          warnings: [],
          durationMs: 1,
        }),
      });
    });

    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await page.getByRole('tab', { name: 'Import & Backfill' }).click();
    await page.getByRole('button', { name: 'Import Catalog' }).click();

    await expect.poll(() => importPayload).toMatchObject({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
      validateProvider: false,
      batchSize: 100,
      offset: 0,
    });
    await expect(page.getByText('NSE_EQUITY_SECURITIES: 0 inserted, 0 updated, 1 no-op')).toBeVisible();
  });
});
