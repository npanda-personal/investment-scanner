import { expect, test, type Page } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

async function setupPortfolioPage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-portfolio-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
  });
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { id: 'portfolio-user', email: 'codex.test@example.com', name: 'Codex Test' } }));
  await page.route('**/api/v1/portfolios', (route) => route.fulfill({ json: { portfolios: [] } }));
}

test.describe('Portfolio trader workflow', () => {
  test('keeps personal portfolio controls and shows planned intelligence overlays', async ({ page }) => {
    await setupPortfolioPage(page);

    await visitAuthenticated(page, '/portfolios');

    await expect(page.getByRole('main').getByRole('heading', { name: 'Portfolios' })).toBeVisible();
    await expect(page.getByText('Create New')).toBeVisible();
    await expect(page.getByText('Sector Exposure', { exact: true })).toBeVisible();
    await expect(page.getByText('Weak Sector Exposure')).toBeVisible();
    await expect(page.getByText('Upcoming Result Exposure')).toBeVisible();
    await expect(page.getByText('Risk Exposure')).toBeVisible();
    await expect(page.getByText('Freshness')).toBeVisible();
    await expect(page.getByText('Portfolio intelligence read models are not available yet.')).toBeVisible();
  });
});
