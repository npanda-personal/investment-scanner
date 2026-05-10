import { expect, test } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

test.describe('Smart Money Intelligence UI', () => {
  const expectSmartMoneyRangeOutcome = async (page: import('@playwright/test').Page) => {
    await expect(page.getByText('No records found.')).toHaveCount(0);
    await expect(page.getByText(/^No accumulation candidates/).or(page.getByText('ACCUMULATION', { exact: true }).first())).toBeVisible();
    await expect(page.getByText(/^No distribution warnings/).or(page.getByText('DISTRIBUTION', { exact: true }).first())).toBeVisible();
  };

  test('exposes authenticated refresh and meaningful empty states', async ({ page }) => {
    await visitModule(page, '/smart-money', 'Smart Money Intelligence');
    await expect(page.getByRole('button', { name: 'Refresh Snapshots' })).toBeVisible();
    await expect(page.getByText('Top Accumulation Candidates')).toBeVisible();
    await expect(page.getByText('Top Distribution Warnings')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sector Smart Money View' })).toBeVisible();
    await expectSmartMoneyRangeOutcome(page);
  });

  test('sends selected range to smart money list endpoints and renders each selected range', async ({ page }) => {
    const requestedRanges: Record<string, string[]> = {
      top: [],
      distribution: [],
      sectors: [],
    };
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/v1/smart-money/top')) {
        requestedRanges.top.push(url.searchParams.get('range') || '');
      }
      if (url.pathname.includes('/api/v1/smart-money/distribution')) {
        requestedRanges.distribution.push(url.searchParams.get('range') || '');
      }
      if (url.pathname.includes('/api/v1/smart-money/sectors')) {
        requestedRanges.sectors.push(url.searchParams.get('range') || '');
      }
    });

    await visitModule(page, '/smart-money', 'Smart Money Intelligence');
    await page.getByRole('combobox', { name: 'Range' }).click();
    await page.getByRole('option', { name: '1M' }).click();
    await expect.poll(() => requestedRanges.top).toContain('1M');
    await expect.poll(() => requestedRanges.distribution).toContain('1M');
    await expect.poll(() => requestedRanges.sectors).toContain('1M');
    await expectSmartMoneyRangeOutcome(page);

    await page.getByRole('combobox', { name: 'Range' }).click();
    await page.getByRole('option', { name: '6M' }).click();
    await expect.poll(() => requestedRanges.top).toContain('6M');
    await expect.poll(() => requestedRanges.distribution).toContain('6M');
    await expect.poll(() => requestedRanges.sectors).toContain('6M');
    await expectSmartMoneyRangeOutcome(page);
  });

  test('refreshes snapshots through bounded scoped batches', async ({ page }) => {
    const refreshPayloads: any[] = [];
    await page.route('**/api/v1/smart-money/run', async (route) => {
      const payload = route.request().postDataJSON();
      refreshPayloads.push(payload);
      const firstBatch = payload.offset === 0;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generated: firstBatch ? 300 : 60,
          skipped: 0,
          errors: [],
          byRange: {
            '1M': { generated: firstBatch ? 100 : 20, skipped: 0 },
            '3M': { generated: firstBatch ? 100 : 20, skipped: 0 },
            '6M': { generated: firstBatch ? 100 : 20, skipped: 0 },
          },
          processedCount: firstBatch ? 100 : 20,
          totalCount: 120,
          batchSize: 100,
          offset: payload.offset,
          nextOffset: firstBatch ? 100 : null,
          hasMore: firstBatch,
          generatedCount: firstBatch ? 300 : 60,
          skippedCount: 0,
          failedCount: 0,
          warnings: [],
          durationMs: 5,
          scope: { region: 'IN', assetType: 'STOCK' },
        }),
      });
    });

    await visitModule(page, '/smart-money', 'Smart Money Intelligence');
    await page.getByRole('button', { name: 'Refresh Snapshots' }).click();

    await expect(page.getByText('Smart money snapshot refresh')).toBeVisible();
    await expect.poll(() => refreshPayloads.length).toBe(2);
    expect(refreshPayloads[0]).toEqual(expect.objectContaining({ batchSize: 100, offset: 0, region: 'IN', assetType: 'STOCK' }));
    expect(refreshPayloads[1]).toEqual(expect.objectContaining({ batchSize: 100, offset: 100, region: 'IN', assetType: 'STOCK' }));
    await expect(page.getByText('Processed 120 / 120')).toBeVisible();
  });
});
