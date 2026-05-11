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

const mockFrameworkStrategies = async (page: any) => {
  await page.route('**/api/v1/backtests/strategies', async (route: any) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route('**/api/v1/strategies?**', async (route: any) => {
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
};

test.describe('Backtesting Strategy Lab UI', () => {
  test('registered selector exposes active entry strategies and hides support rules', async ({ page }) => {
    await mockFrameworkStrategies(page);
    await page.route('**/api/v1/backtests/runs**', async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('IN');
      expect(url.searchParams.get('assetType')).toBe('STOCK');
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

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
    await mockFrameworkStrategies(page);
    await page.route('**/api/v1/backtests/runs**', async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('IN');
      expect(url.searchParams.get('assetType')).toBe('STOCK');
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
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

  test('marks legacy invalid saved-run aggregates and shows repaired trade returns', async ({ page }) => {
    await page.route('**/api/v1/backtests/strategies**', async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route('**/api/v1/strategies**', async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route('**/api/v1/backtests/runs**', async (route) => {
      await route.fulfill({
        json: [{
          id: 'legacy-run',
          strategyId: null,
          config: {
            mode: 'CUSTOM_RULES',
            region: 'IN',
            assetType: 'STOCK',
            universe: { type: 'ALL' },
            entryRule: { type: 'PRICE_ABOVE_SMA50' },
            exitRule: { type: 'PRICE_BELOW_SMA50' },
            startDate: '2026-01-01',
            endDate: '2026-05-10',
            initialCapital: 100000,
            positionSizeType: 'EQUAL_WEIGHT',
            maxPositions: 10,
            transactionCostPercent: 0.001,
          },
          status: 'COMPLETED',
          startedAt: '2026-05-10T00:00:00.000Z',
          completedAt: '2026-05-10T00:01:00.000Z',
          metrics: {
            totalReturn: -0.99992,
            cagr: null,
            maxDrawdown: -0.999,
            volatility: null,
            sharpeRatio: null,
            winRate: null,
            averageWin: null,
            averageLoss: null,
            profitFactor: null,
            numberOfTrades: 614,
            averageHoldingDays: null,
            bestTrade: -0.0102,
            worstTrade: -0.0404,
            realismWarnings: ['Persisted aggregate equity metrics were generated by a legacy invalid math path; trade rows are repaired but aggregate return is withheld.'],
            availabilityStatus: 'ERROR',
            calculationAudit: {
              tradeReturnFormula: 'NET_PNL_OVER_COMMITTED_ENTRY_CAPITAL',
              repairedTradeReturnCount: 3,
              aggregateStatus: 'LEGACY_INVALID',
              warnings: ['Persisted aggregate equity metrics were generated by a legacy invalid math path; trade rows are repaired but aggregate return is withheld.'],
            },
          },
          equityCurve: [{ date: '2026-05-10', equity: 8, cash: 8, investedValue: 0, drawdownPercent: -0.999 }],
          trades: [
            { instrumentId: 'AAKASH.NS', symbol: 'AAKASH.NS', entryDate: '2026-04-01', entryPrice: 10.25, exitDate: '2026-04-02', exitPrice: 10.05, quantity: 100, grossPnL: -20, netPnL: -22.04, returnPercent: -0.0215, holdingDays: 1, exitReason: 'STRATEGY_EXIT', calculationStatus: 'REPAIRED_FROM_PNL' },
            { instrumentId: 'ABMINTLLTD.NS', symbol: 'ABMINTLLTD.NS', entryDate: '2026-04-01', entryPrice: 58.40, exitDate: '2026-04-02', exitPrice: 56.15, quantity: 100, grossPnL: -225, netPnL: -236.46, returnPercent: -0.0404, holdingDays: 1, exitReason: 'STRATEGY_EXIT', calculationStatus: 'REPAIRED_FROM_PNL' },
            { instrumentId: '3MINDIA.NS', symbol: '3MINDIA.NS', entryDate: '2026-04-01', entryPrice: 31977.65, exitDate: '2026-04-02', exitPrice: 31714.35, quantity: 1, grossPnL: -263.30, netPnL: -327.0, returnPercent: -0.0102, holdingDays: 1, exitReason: 'STRATEGY_EXIT', calculationStatus: 'REPAIRED_FROM_PNL' },
          ],
          error: null,
        }],
      });
    });

    await visitModule(page, '/backtests', 'Backtesting & Strategy Lab');

    await expect(page.getByRole('heading', { name: 'Legacy invalid' }).first()).toBeVisible();
    await expect(page.getByText('Persisted aggregate equity metrics were generated by a legacy invalid math path').first()).toBeVisible();
    await expect(page.getByText('AAKASH.NS')).toBeVisible();
    await expect(page.getByText('-2.1%')).toBeVisible();
    await expect(page.getByText('ABMINTLLTD.NS')).toBeVisible();
    await expect(page.getByText('-4.0%')).toBeVisible();
    await expect(page.getByText('3MINDIA.NS')).toBeVisible();
    await expect(page.getByText('-1.0%')).toBeVisible();
    await expect(page.getByText('614')).toBeVisible();
  });
});
