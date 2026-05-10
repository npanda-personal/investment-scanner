import { expect, test } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

test.describe('Research Hub UI', () => {
  test('exposes proof-driven triage and research-only language', async ({ page }) => {
    const overviewRequests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/v1/research/overview')) {
        overviewRequests.push(url.search);
      }
    });

    await visitModule(page, '/research', 'Research Command Center');
    await expect(page.getByRole('heading', { name: 'Review Candidates' })).toBeVisible();
    await expect(page.getByText('Strategy Proof').first()).toBeVisible();
    await expect(page.getByText('Confirmation Layers')).toBeVisible();
    await expect(page.getByText('NEW TRADE CANDIDATES')).toHaveCount(0);
    await expect.poll(() => overviewRequests.some((search) => search.includes('region=IN') && search.includes('assetType=STOCK'))).toBe(true);
  });

  test('links to current module routes', async ({ page }) => {
    await visitModule(page, '/research', 'Research Command Center');
    await expect(page.getByRole('heading', { name: 'Research Command Center' })).toBeVisible();

    await expect(page.locator('a[href="/research/strategy"]')).toHaveCount(0);
    await expect(page.locator('a[href="/research/signals"]')).toHaveCount(0);
    await expect(page.locator('a[href="/research/smart-money"]')).toHaveCount(0);
    await expect(page.locator('a[href="/research/market-context"]')).toHaveCount(0);

    await expect(page.locator('a[href="/strategy"]').first()).toBeVisible();
    await expect(page.locator('a[href="/signals"]').first()).toBeVisible();
    await expect(page.locator('a[href="/smart-money"]').first()).toBeVisible();
    await expect(page.locator('a[href="/market-context"]').first()).toBeVisible();
  });
});
