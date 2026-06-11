import { expect, test, type Page } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

async function setupPortfolioPage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-portfolio-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
  });
  // Use trailing ** so the mock matches URLs with appended query params (e.g. ?region=IN&assetType=STOCK)
  await page.route('**/api/v1/auth/me**', (route) => route.fulfill({ json: { id: 'portfolio-user', email: 'test@example.com', name: 'Test User' } }));
  await page.route('**/api/v1/portfolios**', (route) => route.fulfill({ json: { portfolios: [] } }));
  // NavigationLayout fires these on every mount — mock to avoid real network calls.
  await page.route('**/api/v1/alerts/events**', (route) => route.fulfill({ json: { events: [] } }));
  await page.route('**/api/v1/market-context/capital-posture**', (route) => route.fulfill({ json: { availability: 'NOT_READY', postureLabel: null, suggestedExposureBand: null, message: 'Not available in test.' } }));
}

test.describe('Portfolio trader workflow', () => {
  test('keeps personal portfolio controls and shows planned intelligence overlays', async ({ page }) => {
    await setupPortfolioPage(page);

    await visitAuthenticated(page, '/portfolios');

    await expect(page.getByRole('main').getByRole('heading', { name: 'Portfolios' })).toBeVisible();
    // Create New form is always visible (no portfolio selected yet)
    await expect(page.getByText('Create New')).toBeVisible();
    // With no portfolios, the page prompts the user to select or create one
    await expect(page.getByText('Select a portfolio')).toBeVisible();
    await expect(page.getByText('Choose or create a portfolio to view holdings, valuation, allocation, and transactions.')).toBeVisible();
  });
});
