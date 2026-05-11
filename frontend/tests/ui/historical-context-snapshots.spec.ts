import { expect, test } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

test.describe('Historical Context Snapshots UI', () => {
  test('uses global market scope for snapshot lists, generation, and lookup', async ({ page }) => {
    const requested: string[] = [];
    let generatePayload: any = null;
    let lookupUrl: URL | null = null;

    await page.route('**/api/v1/context-snapshots/coverage**', async (route) => {
      requested.push(route.request().url());
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('IN');
      expect(url.searchParams.get('assetType')).toBe('STOCK');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          marketSnapshots: 1,
          sectorSnapshots: 1,
          countrySnapshots: 1,
          smartMoneySnapshots: 0,
          dataQualitySnapshots: 0,
          latestSnapshotDate: '2026-05-10T00:00:00.000Z',
          warnings: [],
        }),
      });
    });
    await page.route('**/api/v1/context-snapshots/market**', async (route) => {
      requested.push(route.request().url());
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('IN');
      expect(url.searchParams.get('assetType')).toBe('STOCK');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [{ id: 'm1', snapshotDate: '2026-05-10T00:00:00.000Z', region: 'IN', regime: 'RISK_ON', regimeScore: 75, breadthPercentAboveSma50: 0.6, dataStatus: 'COMPLETE' }] }),
      });
    });
    await page.route('**/api/v1/context-snapshots/sectors**', async (route) => {
      requested.push(route.request().url());
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('IN');
      expect(url.searchParams.get('assetType')).toBe('STOCK');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [
          { id: 's0', snapshotDate: '2026-05-10T00:00:00.000Z', region: 'IN', sector: 'Unknown', leadershipStatus: 'LEADING', relativeStrengthScore: 72, instrumentCount: 72, dataStatus: 'COMPLETE' },
          { id: 's1', snapshotDate: '2026-05-10T00:00:00.000Z', region: 'IN', sector: 'Financials', leadershipStatus: 'LEADING', relativeStrengthScore: 80, instrumentCount: 12, dataStatus: 'COMPLETE' },
        ] }),
      });
    });
    await page.route('**/api/v1/context-snapshots/countries**', async (route) => {
      requested.push(route.request().url());
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('IN');
      expect(url.searchParams.get('assetType')).toBe('STOCK');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [{ id: 'c1', snapshotDate: '2026-05-10T00:00:00.000Z', region: 'IN', country: 'India', relativeStrengthScore: 70, dataStatus: 'COMPLETE' }] }),
      });
    });
    await page.route('**/api/v1/context-snapshots/generate**', async (route) => {
      generatePayload = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          snapshotDate: '2026-05-10T00:00:00.000Z',
          region: generatePayload.region,
          assetType: generatePayload.assetType,
          market: { inserted: 0, updated: 1, skipped: 0 },
          sectors: { inserted: 0, updated: 1, skipped: 0 },
          countries: { inserted: 0, updated: 1, skipped: 0 },
          smartMoney: { inserted: 0, updated: 0, skipped: 0 },
          dataQuality: { inserted: 0, updated: 0, skipped: 0 },
          warnings: [],
        }),
      });
    });
    await page.route('**/api/v1/context-snapshots/lookup**', async (route) => {
      lookupUrl = new URL(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          market: { id: 'm1', snapshotDate: '2026-05-10T00:00:00.000Z', region: 'IN', regime: 'RISK_ON', regimeScore: 75, dataStatus: 'COMPLETE' },
          sector: null,
          country: null,
          smartMoney: null,
          dataQuality: null,
          dataStatus: 'PARTIAL',
          gaps: ['sector context snapshot missing'],
        }),
      });
    });

    await visitModule(page, '/context-snapshots', 'Historical Context Snapshots');

    await expect(page.getByText('IN/STOCK')).toBeVisible();
    await expect(page.getByText('RISK_ON')).toBeVisible();
    await expect(page.getByText('Financials')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Unknown' })).toHaveCount(0);
    await expect(page.getByText('sector metadata-gap row hidden from ranked sector evidence')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'India' })).toBeVisible();
    await page.getByRole('button', { name: 'Generate' }).click();
    await expect.poll(() => generatePayload).toMatchObject({ region: 'IN', assetType: 'STOCK' });
    await expect(page.getByText('Generated 2026-05-10T00:00:00.000Z for IN/STOCK')).toBeVisible();

    await page.getByRole('button', { name: 'Lookup' }).click();
    await expect.poll(() => lookupUrl?.searchParams.get('region')).toBe('IN');
    await expect.poll(() => lookupUrl?.searchParams.get('assetType')).toBe('STOCK');
    expect(requested.length).toBeGreaterThanOrEqual(4);
  });
});
