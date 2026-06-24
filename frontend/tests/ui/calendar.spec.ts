import { expect, test, type Page } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

const CALENDAR_PAYLOAD = {
  scope: { region: 'IN', assetType: 'STOCK' },
  type: 'ALL',
  range: { from: '2026-06-01T00:00:00.000Z', to: '2026-09-01T00:00:00.000Z' },
  generatedAt: '2026-06-24T00:00:00.000Z',
  freshness: 'PARTIAL',
  counts: { IPO: 1, DIVIDEND: 1, SPLIT: 0, EARNINGS: 1, ECONOMIC: 1 },
  warnings: [],
  items: [
    {
      id: 'econ:FRED:10:2026-07-10',
      eventType: 'ECONOMIC',
      date: '2026-07-10T00:00:00.000Z',
      region: 'US',
      symbol: null,
      companyName: null,
      title: 'Consumer Price Index',
      detail: 'FRED · CPIAUCSL',
      metrics: { actualValue: 310, previousValue: 309, unit: 'Index 1982-84=100' },
      sourceUrl: 'https://fred.stlouisfed.org/release?rid=10',
    },
    {
      id: 'ipo:NEWCO:2026-06-05',
      eventType: 'IPO',
      date: '2026-06-05T00:00:00.000Z',
      region: 'IN',
      symbol: 'NEWCO',
      companyName: 'New Co Ltd',
      title: 'New Co Ltd — recently listed',
      detail: 'Listed on NSE',
      metrics: { daysListed: 19, firstClose: 100, latestClose: 120, returnSinceListing: 0.2, sector: 'Tech', exchange: 'NSE', currency: 'INR' },
      sourceUrl: null,
    },
    {
      id: 'earn:AAA:2026-07-15',
      eventType: 'EARNINGS',
      date: '2026-07-15T00:00:00.000Z',
      region: 'IN',
      symbol: 'AAA',
      companyName: 'Alpha Ltd',
      title: 'Alpha Ltd — results',
      detail: 'Date source: OFFICIAL_CALENDAR',
      metrics: { daysToResult: 21, resultDateSource: 'OFFICIAL_CALENDAR' },
      sourceUrl: null,
    },
    {
      id: 'ca:div1',
      eventType: 'DIVIDEND',
      date: '2026-06-20T00:00:00.000Z',
      region: 'IN',
      symbol: 'BBB',
      companyName: 'Beta Ltd',
      title: 'Dividend 4.5 INR',
      detail: 'dividend',
      metrics: { amount: 4.5, currency: 'INR', actionType: 'dividend', paymentDate: null },
      sourceUrl: null,
    },
  ],
};

async function setupCalendar(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-calendar-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
  });
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ json: { id: 'calendar-user', email: 'test@example.com', name: 'Test User' } }),
  );
  await page.route('**/api/v1/calendar**', (route) => route.fulfill({ json: CALENDAR_PAYLOAD }));
}

test.describe('Calendar', () => {
  test('renders tabs, events, economic note and earnings deep-link', async ({ page }) => {
    await setupCalendar(page);
    await visitAuthenticated(page, '/calendar');

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Calendar' })).toBeVisible();

    // Tabs present (with counts from the payload).
    await expect(page.getByRole('tab', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /IPO/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Earnings/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Economic/ })).toBeVisible();

    // All tab shows a mix of event rows.
    await expect(main.getByText('New Co Ltd — recently listed')).toBeVisible();
    await expect(main.getByText('Consumer Price Index').first()).toBeVisible();

    // IPO tab shows the return-since-listing value.
    await page.getByRole('tab', { name: /IPO/ }).click();
    await expect(main.getByText('+20.0%')).toBeVisible();

    // Economic tab shows the US/global FRED note.
    await page.getByRole('tab', { name: /Economic/ }).click();
    await expect(main.getByText(/Economic releases are US\/global \(FRED\)/)).toBeVisible();

    // Earnings tab exposes the deep-link to Earnings Intelligence.
    await page.getByRole('tab', { name: /Earnings/ }).click();
    await expect(main.getByRole('button', { name: 'Open Earnings Intelligence' })).toBeVisible();
  });

  test('shows an empty state when a tab has no events', async ({ page }) => {
    await setupCalendar(page);
    await visitAuthenticated(page, '/calendar');

    const main = page.getByRole('main');
    // SPLIT has zero rows in the payload.
    await page.getByRole('tab', { name: 'Splits' }).click();
    await expect(main.getByText('Nothing scheduled here yet')).toBeVisible();
  });
});
