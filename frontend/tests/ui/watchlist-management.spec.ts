import { expect, test, type Page } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

async function setupWatchlistPage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-watchlist-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
  });
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { id: 'watchlist-user', email: 'test@example.com', name: 'Test User' } }));
  await page.route('**/api/v1/watchlists', (route) => route.fulfill({ json: { watchlists: [] } }));
}

test.describe('Watchlist trader workflow', () => {
  test('keeps personal watchlist controls and shows planned radar overlays', async ({ page }) => {
    await setupWatchlistPage(page);

    await visitAuthenticated(page, '/watchlists');

    await expect(page.getByRole('main').getByRole('heading', { name: 'Watchlists' })).toBeVisible();
    await expect(page.getByText('Create New')).toBeVisible();
    await expect(page.getByText('Upcoming Result')).toBeVisible();
    await expect(page.getByText('Radar Membership')).toBeVisible();
    await expect(page.getByText('Risk Membership')).toBeVisible();
    await expect(page.getByText('Sector State')).toBeVisible();
    await expect(page.getByText('Freshness')).toBeVisible();
    await expect(page.getByText('Watchlist intelligence read models are not available yet.')).toBeVisible();
  });
});
