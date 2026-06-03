import { expect, test, type Page } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-route-segregation-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        id: 'playwright-route-segregation-user',
        email: 'test@example.com',
        name: 'Test User',
      },
    });
  });
}

test.describe('User/admin route segregation', () => {
  test('primary trader nav stays unchanged while /admin shows admin navigation', async ({ page }) => {
    await mockAuthenticatedUser(page);
    const apiRequests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/')) apiRequests.push(`${request.method()} ${url.pathname}`);
    });

    await visitAuthenticated(page, '/');

    const drawerLinks = page.locator('.MuiDrawer-paper a[href]');
    await expect(drawerLinks).toHaveText([
      'Market Pulse',
      'Stock Interest Radar',
      'Earnings Intelligence',
      'Compounder Radar',
      'Trader Setup Radar',
      'Risk Radar',
      'Watchlists',
      'Portfolios',
      'Alerts',
      'Instrument Workspace',
    ]);

    for (const href of [
      '/pipeline-ops',
      '/market-data-foundation',
      '/signals',
      '/signals/calibration',
      '/backtests',
      '/trade-plans',
      '/signal-position-ledger',
      '/admin/pipeline-ops',
      '/admin/market-data-foundation',
      '/admin/trade-plans',
      '/admin/signal-position-ledger',
    ]) {
      await expect(page.locator(`.MuiDrawer-paper a[href="${href}"]`)).toHaveCount(0);
    }

    expect(apiRequests.filter((item) => item.startsWith('POST ')).filter((item) => /today-review\/run|alerts\/evaluate|sync|repair|backfill|calibration|generate|pipeline/i.test(item))).toEqual([]);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(drawerLinks).toHaveText([
      'Admin Home',
      'Market Data Ops',
      'Add Instrument',
      'Pipeline Ops',
      'Data Quality',
      'Historical Context',
      'Market Context',
      'Signal Generation',
      'Signal Quality Lab',
      'Signal Calibration',
      'Strategy Decision',
      'Strategy Framework',
      'Backtesting Lab',
      'Trade Plans',
      'Trigger Monitor',
      'Smart Money',
      'Billing',
    ]);
    await expect(page.locator('.MuiDrawer-paper a[href="/admin/pipeline-ops"]')).toBeVisible();
    await expect(page.locator('.MuiDrawer-paper a[href="/admin/market-data-foundation"]')).toBeVisible();
    await expect(page.locator('.MuiDrawer-paper a[href="/admin/trade-plans"]')).toBeVisible();

    await page.goto('/admin/pipeline-ops');
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/pipeline-ops/);
  });
});
