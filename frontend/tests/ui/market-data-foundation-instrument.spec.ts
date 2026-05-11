import { expect, test } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

test.describe('Market Data Instrument Detail UI', () => {
  test('renders deduplicated corporate actions for the 360ONE detail route', async ({ page }) => {
    const id = 'cmo8zr8340000w5eknasxnzpg';
    await page.route(`**/api/v1/instruments/${id}**`, async (route) => {
      await route.fulfill({ json: { id, symbol: '360ONE.NS', company_name: '360 ONE WAM LIMITED', region: 'IN', asset_type: 'STOCK', currency: 'INR', exchange: 'NSE', data_status: 'PARTIAL' } });
    });
    await page.route(`**/api/v1/prices/${id}/latest**`, async (route) => {
      await route.fulfill({ json: { instrument_id: id, symbol: '360ONE.NS', latest: { close: 1000, date: '2026-05-10T00:00:00.000Z' }, source: 'database', data_status: 'COMPLETE' } });
    });
    await page.route(`**/api/v1/prices/${id}?**`, async (route) => {
      await route.fulfill({ json: { instrument_id: id, symbol: '360ONE.NS', prices: [{ date: '2026-05-10T00:00:00.000Z', close: 1000, open: 990, high: 1010, low: 980, adjusted_close: 1000, volume: 1000, source: 'database' }] } });
    });
    await page.route(`**/api/v1/fundamentals/${id}**`, async (route) => {
      await route.fulfill({ json: { instrument_id: id, symbol: '360ONE.NS', records: [] } });
    });
    await page.route(`**/api/v1/corporate-actions/${id}**`, async (route) => {
      await route.fulfill({
        json: {
          instrument_id: id,
          symbol: '360ONE.NS',
          source: 'yahoo',
          data_status: 'COMPLETE',
          actions: [
            { action_type: 'dividend', effective_date: '2026-04-27T00:00:00.000Z', declared_date: null, payment_date: null, value: 6, ratio: null, amount: 6, currency: null, source: 'yahoo', data_status: 'COMPLETE', ingestion_timestamp: '2026-05-03T00:00:00.000Z', last_updated_timestamp: '2026-05-07T00:00:00.000Z' },
            { action_type: 'dividend', effective_date: '2025-10-27T00:00:00.000Z', declared_date: null, payment_date: null, value: 6, ratio: null, amount: 6, currency: null, source: 'yahoo', data_status: 'COMPLETE', ingestion_timestamp: '2026-05-03T00:00:00.000Z', last_updated_timestamp: '2026-05-07T00:00:00.000Z' },
            { action_type: 'split', effective_date: '2023-03-02T00:00:00.000Z', declared_date: null, payment_date: null, value: 2, ratio: 2, amount: null, currency: null, source: 'yahoo', data_status: 'COMPLETE', ingestion_timestamp: '2026-05-03T00:00:00.000Z', last_updated_timestamp: '2026-05-07T00:00:00.000Z' },
          ],
        },
      });
    });

    await visitModule(page, `/stocks/${id}`, 'Stock Workspace');

    await expect(page.getByRole('heading', { name: 'Corporate Actions' })).toBeVisible();
    await expect(page.getByRole('row', { name: /dividend\s+4\/27\/2026\s+N\/A\s+N\/A\s+6\s+N\/A\s+6\s+N\/A\s+yahoo\s+COMPLETE/ })).toHaveCount(1);
    await expect(page.getByRole('row', { name: /dividend\s+10\/27\/2025\s+N\/A\s+N\/A\s+6\s+N\/A\s+6\s+N\/A\s+yahoo\s+COMPLETE/ })).toHaveCount(1);
    await expect(page.getByRole('row', { name: /split\s+3\/2\/2023\s+N\/A\s+N\/A\s+2\s+2\s+N\/A\s+N\/A\s+yahoo\s+COMPLETE/ })).toHaveCount(1);
  });
});
