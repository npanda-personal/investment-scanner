import { expect, test, type Page, type Route } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

const strategy = (code: string, name: string, category: string, status = 'ACTIVE') => ({
  code,
  name,
  description: `${name} description`,
  category,
  style: category === 'ENTRY' ? 'MOMENTUM' : category,
  timeframe: 'DAILY_SWING',
  assetTypes: ['STOCK'],
  supportedRegions: ['IN', 'GLOBAL'],
  version: '1.0.0',
  status,
  requiredInputs: [],
  entryRules: category === 'ENTRY' ? [{ code: 'ENTRY_RULE', label: 'Entry rule', kind: 'SCORES', input: 'price' }] : [],
  exitRules: category === 'EXIT' ? [{ code: 'EXIT_RULE', label: 'Exit rule', kind: 'SCORES', input: 'risk' }] : [],
  noiseFilters: category === 'FILTER' ? [{ code: 'FILTER_RULE', label: 'Filter rule', kind: 'BLOCKS', input: 'data' }] : [],
  riskRules: [],
  marketGateRules: category === 'GATE' ? [{ code: 'GATE_RULE', label: 'Gate rule', kind: 'BLOCKS', input: 'market' }] : [],
  parameters: {},
  explanationTemplate: '',
  examples: { triggers: [], blocks: [] },
  latestPerformance: null,
});

const strategies = [
  strategy('TREND_MOMENTUM', 'Trend Momentum', 'ENTRY'),
  strategy('BREAKOUT_CONFIRMATION', 'Breakout Confirmation', 'ENTRY'),
  strategy('DEFENSIVE_EXIT', 'Defensive Exit Review', 'EXIT'),
  strategy('RISK_OFF_AVOIDANCE', 'Risk-Off Avoidance', 'GATE'),
  strategy('LOW_QUALITY_DATA_REJECTION', 'Low Quality Data Rejection', 'FILTER'),
  strategy('QUALITY_TREND', 'Quality Trend', 'ENTRY', 'DRAFT'),
];

async function mockStrategyFrameworkApi(page: Page) {
  await page.route('**/api/v1/strategies**', async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.endsWith('/rankings')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }

    if (path.endsWith('/performance')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }

    const codeMatch = path.match(/\/api\/v1\/strategies\/([^/]+)$/);
    if (codeMatch) {
      const found = strategies.find((item) => item.code === codeMatch[1]);
      await route.fulfill({ status: found ? 200 : 404, contentType: 'application/json', body: JSON.stringify(found || { error: 'not found' }) });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(strategies) });
  });
}

test.describe('Strategy Framework UI', () => {
  test.beforeEach(async ({ page }) => {
    await mockStrategyFrameworkApi(page);
  });

  test('separates entry strategies from support rules and drafts', async ({ page }) => {
    await visitModule(page, '/strategies', 'Strategy Framework');

    await expect(page.getByText('Active ENTRY strategies are standalone candidates for registered backtests.')).toBeVisible();
    await expect(page.getByTestId('strategy-category-all')).toContainText('All (6)');
    await expect(page.getByTestId('strategy-category-entry')).toContainText('Entry (2)');
    await expect(page.getByTestId('strategy-category-exit')).toContainText('Exit (1)');
    await expect(page.getByTestId('strategy-category-gate')).toContainText('Gates (1)');
    await expect(page.getByTestId('strategy-category-filter')).toContainText('Filters (1)');
    await expect(page.getByTestId('strategy-category-draft')).toContainText('Drafts (1)');

    await page.getByTestId('strategy-category-entry').click();
    await expect(page.getByText('Trend Momentum').first()).toBeVisible();
    await expect(page.getByText('Breakout Confirmation').first()).toBeVisible();
    await expect(page.getByText('Defensive Exit Review')).toHaveCount(0);
    await expect(page.getByText('Quality Trend')).toHaveCount(0);
  });

  test('only active entry strategy rows link to Backtesting Lab', async ({ page }) => {
    await visitModule(page, '/strategies', 'Strategy Framework');

    const entryRow = page.getByRole('row').filter({ hasText: 'Trend Momentum' });
    await expect(entryRow.getByRole('link', { name: 'Backtest in Lab' })).toHaveAttribute('href', /strategyCode=TREND_MOMENTUM/);

    await page.getByTestId('strategy-category-exit').click();
    const exitRow = page.getByRole('row').filter({ hasText: 'Defensive Exit Review' });
    await expect(exitRow.getByRole('button', { name: 'Backtest in Lab' })).toBeDisabled();

    await page.getByTestId('strategy-category-draft').click();
    const draftRow = page.getByRole('row').filter({ hasText: 'Quality Trend' });
    await expect(draftRow.getByRole('button', { name: 'Backtest in Lab' })).toBeDisabled();
  });
});
