import { expect, test, type Page } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

async function setupAlertsPage(page: Page) {
  const requests: string[] = [];
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-alerts-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.includes('/api/v1/')) requests.push(`${request.method()} ${url.pathname}`);
  });
  // Use trailing ** so the mock matches URLs with appended query params (e.g. ?region=IN&assetType=STOCK)
  await page.route('**/api/v1/auth/me**', (route) => route.fulfill({ json: { id: 'alerts-user', email: 'test@example.com', name: 'Test User' } }));
  await page.route('**/api/v1/alerts/rules**', (route) => route.fulfill({ json: { rules: [] } }));
  await page.route('**/api/v1/alerts/events**', (route) => route.fulfill({ json: { events: [] } }));
  // NavigationLayout also calls capital-posture on every mount
  await page.route('**/api/v1/market-context/capital-posture**', (route) => route.fulfill({ json: { availability: 'NOT_READY', postureLabel: null, suggestedExposureBand: null, message: 'Not available in test.' } }));
  await page.route('**/api/v1/alerts/evaluate', async (route) => {
    throw new Error(`Trader Alerts page must not evaluate shared alert conditions: ${route.request().url()}`);
  });
  return requests;
}

test.describe('Alerts trader workflow', () => {
  test('keeps personal alert CRUD visible but removes shared alert evaluation', async ({ page }) => {
    const requests = await setupAlertsPage(page);

    await visitAuthenticated(page, '/alerts');

    await expect(page.getByRole('main').getByRole('heading', { name: 'Alerts' })).toBeVisible();
    // Personal CRUD controls are present
    await expect(page.getByRole('button', { name: 'Create Alert' })).toBeVisible();
    // Shared bulk-evaluation button must not appear for traders
    await expect(page.getByRole('button', { name: 'Check Alerts' })).toHaveCount(0);
    // Personal evaluate button (Evaluate Now) is acceptable for trader use
    await expect(page.getByRole('button', { name: 'Evaluate Now' })).toBeVisible();
    // Empty-state labels confirm rule and event lists are rendered (just empty)
    await expect(page.getByRole('heading', { name: 'Alert Rules' })).toBeVisible();
    await expect(page.getByText('No alert rules yet.')).toBeVisible();
    expect(requests.some((item) => item.includes('/api/v1/alerts/evaluate'))).toBe(false);
  });
});
