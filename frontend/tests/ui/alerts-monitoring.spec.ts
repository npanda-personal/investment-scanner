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
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { id: 'alerts-user', email: 'test@example.com', name: 'Test User' } }));
  await page.route('**/api/v1/alerts/rules', (route) => route.fulfill({ json: { rules: [] } }));
  await page.route('**/api/v1/alerts/events', (route) => route.fulfill({ json: { events: [] } }));
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
    await expect(page.getByRole('button', { name: 'Create Alert' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check Alerts' })).toHaveCount(0);
    await expect(page.getByText('Entered Radar')).toBeVisible();
    await expect(page.getByText('Upcoming Result')).toBeVisible();
    await expect(page.getByText('Risk Radar Entry')).toBeVisible();
    await expect(page.getByText('Sector Weakness')).toBeVisible();
    await expect(page.getByText('52W High')).toBeVisible();
    await expect(page.getByText('Delivery Accumulation')).toBeVisible();
    expect(requests.some((item) => item.includes('/api/v1/alerts/evaluate'))).toBe(false);
  });
});
