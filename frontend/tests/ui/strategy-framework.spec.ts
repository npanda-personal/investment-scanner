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

const proofRows = [
  {
    strategyCode: 'TREND_MOMENTUM',
    strategyVersion: '1.0.0',
    strategyName: 'Trend Momentum',
    category: 'ENTRY',
    status: 'PROVEN',
    scope: { region: 'IN', assetType: 'STOCK', universeKey: 'ALL_ELIGIBLE' },
    selectedTimeframe: '3Y',
    latestEvaluationDate: '2026-05-13T00:00:00.000Z',
    sample: { tradeCount: 72, requiredTradeCount: 60, sampleSufficiency: 'SUFFICIENT' },
    performance: { cagr: 0.12, maxDrawdown: -0.14, sharpe: 1.2, winRate: 0.58, profitFactor: 1.5, dataCoveragePercent: 0.96, benchmarkCagr: 0.07, excessCagr: 0.05 },
    rating: { ratingGrade: 'GOOD', readinessLabel: 'WATCHLIST_CANDIDATE', reasons: ['Sufficient sample.'], warnings: [], capsApplied: [] },
    missingEvidenceReason: null,
    nextAction: { label: 'Inspect proof details', targetRoute: '/strategies?strategyCode=TREND_MOMENTUM', sourceModule: 'strategy-framework' },
  },
  {
    strategyCode: 'BREAKOUT_CONFIRMATION',
    strategyVersion: '1.0.0',
    strategyName: 'Breakout Confirmation',
    category: 'ENTRY',
    status: 'LIMITED',
    scope: { region: 'IN', assetType: 'STOCK', universeKey: 'ALL_ELIGIBLE' },
    selectedTimeframe: '3Y',
    latestEvaluationDate: '2026-05-13T00:00:00.000Z',
    sample: { tradeCount: 36, requiredTradeCount: 60, sampleSufficiency: 'LOW_SAMPLE' },
    performance: { cagr: 0.05, maxDrawdown: -0.22, sharpe: 0.7, winRate: 0.51, profitFactor: 1.1, dataCoveragePercent: 0.74, benchmarkCagr: 0.07, excessCagr: -0.02 },
    rating: { ratingGrade: 'GOOD', readinessLabel: 'WATCHLIST_CANDIDATE', reasons: [], warnings: ['Coverage cap applied.'], capsApplied: ['LOW_COVERAGE'] },
    missingEvidenceReason: null,
    nextAction: { label: 'Inspect or run bounded backtest', targetRoute: '/backtests?mode=registered&strategyCode=BREAKOUT_CONFIRMATION&timeframe=3Y&region=IN&assetType=STOCK', sourceModule: 'backtesting-strategy-lab' },
  },
  {
    strategyCode: 'QUALITY_TREND',
    strategyVersion: '1.0.0',
    strategyName: 'Quality Trend',
    category: 'DRAFT',
    status: 'UNPROVEN',
    scope: { region: 'IN', assetType: 'STOCK', universeKey: 'ALL_ELIGIBLE' },
    selectedTimeframe: '3Y',
    latestEvaluationDate: null,
    sample: { tradeCount: 0, requiredTradeCount: 60, sampleSufficiency: 'INSUFFICIENT' },
    performance: { cagr: null, maxDrawdown: null, sharpe: null, winRate: null, profitFactor: null, dataCoveragePercent: null, benchmarkCagr: null, excessCagr: null },
    rating: { ratingGrade: null, readinessLabel: null, reasons: [], warnings: [], capsApplied: [] },
    missingEvidenceReason: 'Draft strategy requires promotion and bounded backtest evidence before proof can be accepted.',
    nextAction: { label: 'Review strategy definition', targetRoute: '/strategies?strategyCode=QUALITY_TREND', sourceModule: 'strategy-framework' },
  },
  {
    strategyCode: 'LOW_QUALITY_DATA_REJECTION',
    strategyVersion: '1.0.0',
    strategyName: 'Low Quality Data Rejection',
    category: 'FILTER',
    status: 'BLOCKED',
    scope: { region: 'IN', assetType: 'STOCK', universeKey: 'ALL_ELIGIBLE' },
    selectedTimeframe: '3Y',
    latestEvaluationDate: null,
    sample: { tradeCount: 0, requiredTradeCount: 0, sampleSufficiency: 'NOT_APPLICABLE' },
    performance: { cagr: null, maxDrawdown: null, sharpe: null, winRate: null, profitFactor: null, dataCoveragePercent: null, benchmarkCagr: null, excessCagr: null },
    rating: { ratingGrade: null, readinessLabel: null, reasons: [], warnings: [], capsApplied: [] },
    missingEvidenceReason: 'FILTER strategies are support rules and cannot be standalone registered backtests in this slice.',
    nextAction: { label: 'Review strategy definition', targetRoute: '/strategies?strategyCode=LOW_QUALITY_DATA_REJECTION', sourceModule: 'strategy-framework' },
  },
  {
    strategyCode: 'SMART_MONEY_ACCUMULATION',
    strategyVersion: '1.0.0',
    strategyName: 'Smart Money Accumulation',
    category: 'ENTRY',
    status: 'MISSING',
    scope: { region: 'IN', assetType: 'STOCK', universeKey: 'ALL_ELIGIBLE' },
    selectedTimeframe: '3Y',
    latestEvaluationDate: null,
    sample: { tradeCount: 0, requiredTradeCount: 60, sampleSufficiency: 'INSUFFICIENT' },
    performance: { cagr: null, maxDrawdown: null, sharpe: null, winRate: null, profitFactor: null, dataCoveragePercent: null, benchmarkCagr: null, excessCagr: null },
    rating: { ratingGrade: null, readinessLabel: null, reasons: [], warnings: [], capsApplied: [] },
    missingEvidenceReason: 'No compact StrategyPerformanceSummary exists for 3Y in the selected scope.',
    nextAction: { label: 'Inspect or run bounded backtest', targetRoute: '/backtests?mode=registered&strategyCode=SMART_MONEY_ACCUMULATION&timeframe=3Y&region=IN&assetType=STOCK', sourceModule: 'backtesting-strategy-lab' },
  },
];

async function mockStrategyFrameworkApi(page: Page) {
  await page.route('**/api/v1/strategies**', async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.endsWith('/rankings')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }

    if (path.endsWith('/proof-registry')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rows: proofRows,
          statusCounts: { PROVEN: 1, LIMITED: 1, UNPROVEN: 1, BLOCKED: 1, MISSING: 1 },
          scope: { region: 'IN', assetType: 'STOCK', universeKey: 'ALL_ELIGIBLE' },
          selectedTimeframe: '3Y',
        }),
      });
      return;
    }

    const proofMatch = path.match(/\/api\/v1\/strategies\/([^/]+)\/proof$/);
    if (proofMatch) {
      const found = proofRows.find((item) => item.strategyCode === proofMatch[1]) || proofRows[0];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(found) });
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

  test('shows proof registry statuses, evidence gaps, and next actions', async ({ page }) => {
    await visitModule(page, '/strategies', 'Strategy Framework');

    await page.getByRole('tab', { name: 'Proof Registry' }).click();
    await expect(page.getByText(/^PROVEN\s+1$/)).toBeVisible();
    await expect(page.getByText(/^LIMITED\s+1$/)).toBeVisible();
    await expect(page.getByText(/^UNPROVEN\s+1$/)).toBeVisible();
    await expect(page.getByText(/^BLOCKED\s+1$/)).toBeVisible();
    await expect(page.getByText(/^MISSING\s+1$/)).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Trend Momentum' }).getByText('PROVEN')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Breakout Confirmation' }).getByText('Warnings/Caps')).toBeVisible();
    await expect(page.getByText('No compact StrategyPerformanceSummary exists for 3Y in the selected scope.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Inspect or run bounded backtest' }).first()).toHaveAttribute('href', /backtests\?mode=registered/);
  });
});
