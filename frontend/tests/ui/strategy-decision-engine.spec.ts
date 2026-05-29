import { expect, test } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

test.describe('Strategy Decision Engine UI', () => {
  test('review candidates uses global scope and exposes validation fields', async ({ page }) => {
    const candidateRequests: string[] = [];

    await page.route('**/api/v1/strategy/market-gate**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          marketCondition: 'HEALTHY',
          marketGate: 'OPEN',
          allowedActions: ['ONLY_HIGH_QUALITY_SETUPS'],
          marketScore: 72,
          reasons: ['Scoped market context is available.'],
          blockers: [],
          dataStatus: 'COMPLETE',
          updatedAt: new Date().toISOString(),
        }),
      });
    });
    await page.route('**/api/v1/strategy/exits**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/v1/strategy/model**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          modelVersion: 'strategy-decision-v1',
          strategies: [],
          marketGateRules: { HEALTHY: 'Open', MIXED: 'Selective', BAD: 'Closed' },
          languageSafetyRules: ['Use candidate language.'],
        }),
      });
    });
    await page.route('**/api/v1/strategy/candidates**', async (route) => {
      const url = new URL(route.request().url());
      candidateRequests.push(url.search);
      const decision = url.searchParams.get('decision');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: decision === 'TRADE_CANDIDATE' ? 1 : 0,
          results: decision === 'TRADE_CANDIDATE' ? [{
            id: 'decision-1',
            instrumentId: 'stock-1',
            symbol: 'RELIANCE.NS',
            country: 'IN',
            exchange: 'NSE',
            strategy: 'TREND_MOMENTUM',
            decision: 'TRADE_CANDIDATE',
            action: 'CONSIDER_ENTRY',
            decisionScore: 82,
            confidence: 'HIGH',
            marketCondition: 'HEALTHY',
            marketGate: 'OPEN',
            reasons: ['Framework rules passed.'],
            blockers: [],
            warnings: [],
            dataGaps: [],
            modelVersion: 'strategy-decision-v1',
            generatedAt: '2026-05-10T10:00:00.000Z',
            strategyVersion: '1.0.0',
            frameworkBacked: true,
            strategyRating: { ratingScore: 78, ratingGrade: 'GOOD', readinessLabel: 'PAPER_TEST_CANDIDATE' },
            readinessLabel: 'PAPER_TEST_CANDIDATE',
          }] : [],
        }),
      });
    });

    await visitModule(page, '/strategy', 'Strategy Decision Engine');
    await page.getByRole('tab', { name: 'Review Candidates' }).click();

    await expect(page.getByLabel('Region Override')).toHaveCount(0);
    await expect(page.getByText('Current scope: IN / STOCK')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review candidates' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Decision' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Framework' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Rating' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Readiness' })).toBeVisible();
    const candidatesTable = page.getByRole('table');
    await expect(candidatesTable.getByText('TRADE_CANDIDATE', { exact: true })).toBeVisible();
    await expect(candidatesTable.getByText('Framework-backed')).toBeVisible();
    await expect(candidatesTable.getByText('GOOD')).toBeVisible();
    await expect(candidatesTable.getByText('PAPER_TEST_CANDIDATE')).toBeVisible();

    expect(candidateRequests.some((query) => query.includes('region=IN') && query.includes('assetType=STOCK'))).toBe(true);
    expect(candidateRequests.some((query) => query.includes('includeLegacy=true'))).toBe(false);

    await page.getByRole('button', { name: 'Good / Excellent' }).click();
    await expect.poll(() => candidateRequests.some((query) => (
      query.includes('strategyRatingGrades=GOOD%2CEXCELLENT')
      || query.includes('strategyRatingGrades=GOOD,EXCELLENT')
    ))).toBe(true);
  });

  test('exposes evaluation and review candidate surfaces', async ({ page }) => {
    await visitModule(page, '/strategy', 'Strategy Decision Engine');
    await expect(page.getByRole('button', { name: 'Run Evaluation' })).toBeVisible();
    await expect(page.getByText('review candidates').first()).toBeVisible();
    await expect(page.getByText('Market Gate').first()).toBeVisible();
  });

  test('loads Strategy Framework-backed review strategies in the evaluation selector', async ({ page }) => {
    await page.route('**/api/v1/strategy/model', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          modelVersion: 'strategy-decision-v1',
          strategies: [
            {
              code: 'TREND_MOMENTUM',
              name: 'Trend Momentum',
              description: 'Trend continuation review.',
              category: 'ENTRY',
              status: 'ACTIVE',
              version: '1.0.0',
              evaluationSupported: true,
              thresholds: { tradeCandidate: 75, watch: 50, wait: 40 },
              weights: {},
            },
            {
              code: 'BREAKOUT_CONFIRMATION',
              name: 'Breakout Confirmation',
              description: 'Breakout review.',
              category: 'ENTRY',
              status: 'ACTIVE',
              version: '1.0.0',
              evaluationSupported: true,
              thresholds: { tradeCandidate: 72, watch: 50, wait: 40 },
              weights: {},
            },
            {
              code: 'SMART_MONEY_ACCUMULATION',
              name: 'Smart Money Accumulation',
              description: 'Price-volume accumulation review.',
              category: 'ENTRY',
              status: 'ACTIVE',
              version: '1.0.0',
              evaluationSupported: true,
              thresholds: { tradeCandidate: 70, watch: 50, wait: 40 },
              weights: {},
            },
            {
              code: 'RISK_OFF_AVOIDANCE',
              name: 'Risk-Off Avoidance',
              description: 'Market gate support rule.',
              category: 'GATE',
              status: 'ACTIVE',
              version: '1.0.0',
              evaluationSupported: false,
              thresholds: { tradeCandidate: 1, watch: 50, wait: 40 },
              weights: {},
            },
          ],
          marketGateRules: { HEALTHY: 'Risk-On', MIXED: 'Mixed', BAD: 'Risk-Off' },
          languageSafetyRules: ['Use candidate language.'],
        }),
      });
    });

    await visitModule(page, '/strategy', 'Strategy Decision Engine');
    await page.getByRole('button', { name: 'Run Evaluation' }).click();
    await expect(page.getByText('All Review Strategies (3)')).toBeVisible();

    await page.getByLabel('Strategy').click();
    await expect(page.getByRole('option', { name: /Breakout Confirmation/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /Smart Money Accumulation/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /Risk-Off Avoidance/ })).toHaveCount(0);
  });

  test('stock lookup renders framework invalidation review without target or reward-risk labels', async ({ page }) => {
    await page.route('**/api/v1/strategy/market-gate**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          marketCondition: 'BAD',
          marketGate: 'CLOSED',
          allowedActions: ['MANAGE_EXISTING_POSITIONS_ONLY'],
          marketScore: 20,
          reasons: ['Market risk is elevated.'],
          blockers: [],
          dataStatus: 'COMPLETE',
          updatedAt: new Date().toISOString(),
        }),
      });
    });
    await page.route('**/api/v1/strategy/exits**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/v1/strategy/model**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          modelVersion: 'strategy-decision-v1',
          strategies: [],
          marketGateRules: { BAD: 'Closed' },
          languageSafetyRules: ['Use research-support language.'],
        }),
      });
    });
    await page.route('**/api/v1/strategy/candidates**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ total: 0, results: [] }),
      });
    });
    await page.route('**/api/v1/instruments**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          instruments: [{
            id: 'stock-1',
            symbol: 'ABC',
            company_name: 'ABC Ltd',
            region: 'IN',
            assetType: 'STOCK',
            asset_type: 'STOCK',
            exchange: 'NSE',
            country: 'IN',
            sector: 'Technology',
          }],
          pagination: { total: 1, page: 1, pageSize: 20 },
        }),
      });
    });
    await page.route('**/api/v1/strategy/history/stock-1', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/v1/strategy/stock-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'decision-1',
          instrumentId: 'stock-1',
          symbol: 'ABC',
          country: 'IN',
          exchange: 'NSE',
          strategy: 'DEFENSIVE_EXIT',
          decision: 'EXIT_CANDIDATE',
          action: 'REVIEW_EXIT',
          decisionScore: 76,
          confidence: 'LOW',
          marketCondition: 'BAD',
          marketGate: 'CLOSED',
          reasons: ['Distribution warning is active.'],
          blockers: [],
          warnings: [],
          dataGaps: [],
          modelVersion: 'strategy-decision-v1',
          generatedAt: '2026-05-29T10:00:00.000Z',
          strategyVersion: '1.2.0',
          frameworkBacked: true,
          frameworkDecision: 'EXIT_CANDIDATE',
          frameworkAction: 'REVIEW_EXIT',
          invalidationRulesTriggered: ['DISTRIBUTION_EXIT'],
          riskPlan: {
            stopLoss: 'Not applicable; framework invalidation evidence only.',
            targetPrice: null,
            rewardRiskRatio: null,
            riskReviewLevel: 'HIGH',
            rationale: 'Risk review uses Strategy Framework invalidation evidence. No projected outcome is produced.',
            reasonSummary: 'Candidate review is based on rule evidence.',
            invalidationRules: ['Strategy Framework invalidation rule triggered: DISTRIBUTION_EXIT.'],
            exitRules: ['Distribution warning is active.'],
          },
        }),
      });
    });

    await visitModule(page, '/strategy', 'Strategy Decision Engine');
    await page.getByRole('tab', { name: 'Stock Lookup' }).click();
    await page.getByRole('combobox', { name: 'Search Stock' }).fill('ABC');
    await page.getByRole('option', { name: /ABC/ }).click();

    await expect(page.getByRole('heading', { name: 'Risk Review' })).toBeVisible();
    await expect(page.getByText('Risk Review Level')).toBeVisible();
    await expect(page.getByText('HIGH')).toBeVisible();
    await expect(page.getByText('Strategy Framework invalidation rule triggered: DISTRIBUTION_EXIT.')).toBeVisible();
    await expect(page.getByText('Target Price')).toHaveCount(0);
    await expect(page.getByText('Reward/Risk')).toHaveCount(0);
  });

  test('start evaluation sends scoped bounded batch request without real decision run', async ({ page }) => {
    let evaluatePayload: any = null;
    await page.route('**/api/v1/strategy/evaluate', async (route) => {
      evaluatePayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          processedCount: 1,
          totalCount: 1,
          batchSize: evaluatePayload.batchSize,
          offset: evaluatePayload.offset,
          nextOffset: null,
          hasMore: false,
          generatedCount: 1,
          failedCount: 0,
          warnings: [],
        }),
      });
    });

    await visitModule(page, '/strategy', 'Strategy Decision Engine');
    await page.getByRole('button', { name: 'Run Evaluation' }).click();
    await expect(page.getByRole('button', { name: 'Start Evaluation' })).toBeVisible();
    await page.getByRole('button', { name: 'Start Evaluation' }).click();

    await expect.poll(() => evaluatePayload).toMatchObject({
      strategy: 'ALL',
      batchSize: 100,
      offset: 0,
      region: 'IN',
      assetType: 'STOCK',
    });
    await expect(page.getByText('Complete. Processed 1 / 1 in 1 batch.')).toBeVisible();
  });
});
