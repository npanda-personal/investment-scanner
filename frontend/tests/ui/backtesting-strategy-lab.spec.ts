import { expect, test } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

const strategy = (code: string, name: string, category: string) => ({
  code,
  name,
  description: `${name} description`,
  category,
  style: 'MOMENTUM',
  timeframe: 'DAILY_SWING',
  assetTypes: ['STOCK'],
  supportedRegions: ['IN'],
  version: '1.0.0',
  status: 'ACTIVE',
  requiredInputs: [],
  entryRules: [],
  exitRules: [],
  noiseFilters: [],
  riskRules: [],
  marketGateRules: [],
  parameters: { minScore: 70 },
  explanationTemplate: '',
  examples: { triggers: [], blocks: [] },
});

test.describe('Backtesting Strategy Lab UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/backtests/strategies', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/api/v1/backtests/runs**', async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('IN');
      expect(url.searchParams.get('assetType')).toBe('STOCK');
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/api/v1/strategies?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          strategy('TREND_MOMENTUM', 'Trend Momentum', 'ENTRY'),
          strategy('BREAKOUT_CONFIRMATION', 'Breakout Confirmation', 'ENTRY'),
          strategy('SMART_MONEY_ACCUMULATION', 'Smart Money Accumulation', 'ENTRY'),
          strategy('SECTOR_LEADER_MOMENTUM', 'Sector Leader Momentum', 'ENTRY'),
          strategy('DEFENSIVE_EXIT', 'Defensive Exit Review', 'EXIT'),
          strategy('RISK_OFF_AVOIDANCE', 'Risk-Off Avoidance', 'GATE'),
          strategy('LOW_QUALITY_DATA_REJECTION', 'Low Quality Data Rejection', 'FILTER'),
        ]),
      });
    });
  });

  test('registered selector exposes active entry strategies and hides support rules', async ({ page }) => {
    await visitModule(page, '/backtests', 'Backtesting & Strategy Lab');

    await expect(page.getByText('Registered backtests currently run active entry strategies.')).toBeVisible();
    await page.getByTestId('registered-strategy-select').click();

    await expect(page.getByRole('option', { name: 'Trend Momentum' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Breakout Confirmation' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Smart Money Accumulation' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Sector Leader Momentum' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Defensive Exit Review' })).toHaveCount(0);
    await expect(page.getByRole('option', { name: 'Risk-Off Avoidance' })).toHaveCount(0);
    await expect(page.getByRole('option', { name: 'Low Quality Data Rejection' })).toHaveCount(0);
  });

  test('registered run sends scoped Strategy Framework config without running a real backtest', async ({ page }) => {
    let runPayload: any = null;
    await page.route('**/api/v1/backtests/run', async (route) => {
      runPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'run-ui-test',
          strategyId: null,
          config: runPayload.config,
          status: 'COMPLETED',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          metrics: {
            totalReturn: 0,
            cagr: null,
            maxDrawdown: 0,
            volatility: null,
            sharpeRatio: null,
            winRate: null,
            averageWin: null,
            averageLoss: null,
            profitFactor: null,
            numberOfTrades: 0,
            averageHoldingDays: null,
            bestTrade: null,
            worstTrade: null,
            availabilityStatus: 'INSUFFICIENT_HISTORY',
            frameworkStrategyName: 'Trend Momentum',
            frameworkRating: {
              ratingScore: 0,
              ratingGrade: 'UNPROVEN',
              readinessLabel: 'RESEARCH_ONLY',
              ratingReasons: ['No proven sample yet.'],
              ratingWarnings: [],
              ratingCapsApplied: ['INSUFFICIENT_TRADES'],
            },
            dataCoverage: {
              instrumentsConsidered: 1,
              instrumentsWithEnoughHistory: 0,
              instrumentsExcludedForHistory: 1,
              instrumentsExcludedForDataQuality: 0,
              missingPriceHistoryCount: 0,
              insufficientHistoryCount: 1,
              warnings: ['No instruments had enough price history for the requested timeframe.'],
            },
          },
          equityCurve: [],
          trades: [],
          error: null,
        }),
      });
    });

    await visitModule(page, '/backtests', 'Backtesting & Strategy Lab');
    await page.getByTestId('run-registered-backtest-panel').click();

    await expect.poll(() => runPayload).toMatchObject({
      config: {
        mode: 'REGISTERED_STRATEGY',
        strategyCode: 'TREND_MOMENTUM',
        region: 'IN',
        assetType: 'STOCK',
        useDataQualityFilter: true,
      },
    });
    await expect(page.getByText('Trend Momentum').first()).toBeVisible();
    await expect(page.getByText('INSUFFICIENT_HISTORY').first()).toBeVisible();
  });
});
