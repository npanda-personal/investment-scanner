import { expect, test } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

const signal = (id: string, symbol: string, lifecycle: string, direction = 'BULLISH', score = 65) => ({
  id,
  instrument_id: `inst-${id}`,
  symbol,
  company_name: `${symbol} Corp`,
  sector: 'Technology',
  country: 'India',
  score,
  direction,
  confidence: 'MEDIUM',
  triggered_signals: [{ code: 'SMA_CROSS', label: 'SMA cross', category: 'TECHNICAL' }],
  negative_signals: [],
  explanation: 'Test signal',
  generated_at: '2026-06-20T10:00:00Z',
  source: 'signal-generation-engine',
  data_status: 'CURRENT',
  currentPrice: 100,
  previousClose: 99,
  dailyChange: 1,
  dailyChangePercent: 1.01,
  currency: 'INR',
  priceTimestamp: '2026-06-20T15:30:00Z',
  lifecycleState: lifecycle,
  modelVersion: 'signal-engine-v4',
  reliabilityTier: 'FULL',
});

const mockSignals = [
  signal('s1', 'ENTRY_CO', 'ENTRY'),
  signal('s2', 'ACTIVE_CO', 'ACTIVE'),
  signal('s3', 'EXIT_CO', 'EXIT', 'NEUTRAL', 40),
  signal('s4', 'EXPIRED_CO', 'EXPIRED', 'BEARISH', 25),
];

const topResponse = {
  signals: mockSignals,
  items: mockSignals,
  total: 4,
  totalCount: 4,
  limit: 25,
  offset: 0,
  hasMore: false,
  scope: { region: 'IN', assetType: 'STOCK' },
  directionCounts: { BULLISH: 2, NEUTRAL: 1, BEARISH: 1 },
};

test.describe('Lifecycle Badge Smoke', () => {
  test('renders all 4 lifecycle badge states in the signals table', async ({ page }) => {
    await page.route('**/api/v1/signals/top*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(topResponse) }));
    await page.route('**/api/v1/signals/screener*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(topResponse) }));
    await page.route('**/api/v1/signals/runs/latest*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(null) }));

    await visitAuthenticated(page, '/signals');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: 'ENTRY_CO' })).toBeVisible({ timeout: 15000 });

    for (const state of ['ENTRY', 'ACTIVE', 'EXIT', 'EXPIRED']) {
      await expect(page.locator('.MuiChip-root', { hasText: state }).first()).toBeVisible();
    }

    const exitChip = page.locator('.MuiChip-filled', { hasText: 'EXIT' });
    await expect(exitChip).toBeVisible();
  });
});
