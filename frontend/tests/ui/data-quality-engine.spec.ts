import { expect, test } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

test.describe('Data Quality Engine UI', () => {
  test('shows tier visibility and blocker-first diagnostics', async ({ page }) => {
    await mockDataQualityResponses(page);
    await mockReviewReadiness(page);
    await mockPipelineStatus(page, 'running');
    await visitModule(page, '/data-quality', 'Data Quality Engine');

    const indicator = page.getByTestId('data-quality-pipeline-status-strip');
    await expect(indicator.getByText('Data Quality')).toBeVisible();
    await expect(indicator.getByText('IN / STOCK')).toBeVisible();
    await expect(indicator.getByText('RUNNING')).toBeVisible();
    await expect(indicator.getByText('Progress: 20 / 80 (25%)')).toBeVisible();
    await expect(indicator.getByText('Warnings: 1')).toBeVisible();
    await expect(indicator.getByText('Errors: 2')).toBeVisible();
    await expect(indicator.getByRole('link', { name: 'View Pipeline Ops details' })).toHaveAttribute('href', '/pipeline-ops');

    await expect(page.getByRole('button', { name: 'Evaluate Scope' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
    await expect(page.getByText('Coverage').first()).toBeVisible();
    await expect(page.getByText('Signal Readiness').first()).toBeVisible();
    await expect(page.getByText('Daily Review').first()).toBeVisible();
    await expect(page.getByText('Signal Tier').first()).toBeVisible();
    await expect(page.getByText('Backtest Tier').first()).toBeVisible();
    await expect(page.getByText('Calibration Tier').first()).toBeVisible();
    await expect(page.getByText('Automation Tier').first()).toBeVisible();
    await expect(page.getByText('Review Readiness Summary')).toBeVisible();
    await expect(page.getByText('Mode: LIMITED_REVIEW')).toBeVisible();
    await expect(page.getByText('Next bounded action: Validate unknown providers')).toBeVisible();

    await page.getByText('INFY').first().click();
    const drawer = page.locator('.MuiDrawer-paperAnchorRight');
    await expect(drawer.getByText('Use-case Readiness')).toBeVisible();
    await expect(drawer.getByText('Tier Blockers (blocker-first)')).toBeVisible();
    await expect(drawer.getByText('Automation remains policy-blocked in Phase 0 and is not broker-authorized.')).toBeVisible();

    const blockerText = await drawer.innerText();
    const signalIndex = blockerText.indexOf('Signal: Signal readiness is not ready.');
    const backtestIndex = blockerText.indexOf('Backtest: Trusted baseline context is missing.');
    const calibrationIndex = blockerText.indexOf('Calibration: Signal history is missing for calibration.');
    const automationIndex = blockerText.indexOf('Automation: Policy gate: automation is blocked in Phase 0 and is not broker-authorized.');
    expect(signalIndex).toBeGreaterThan(-1);
    expect(backtestIndex).toBeGreaterThan(signalIndex);
    expect(calibrationIndex).toBeGreaterThan(backtestIndex);
    expect(automationIndex).toBeGreaterThan(calibrationIndex);
  });

  test('evaluate scope sends scoped bounded batch request without running the real evaluation', async ({ page }) => {
    let evaluatePayload: any = null;
    await mockDataQualityResponses(page);
    await mockReviewReadiness(page);
    await mockPipelineStatus(page, 'terminal');
    await page.route('**/api/v1/data-quality/evaluate', async (route) => {
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
          evaluatedCount: 1,
          skippedCount: 0,
          failedCount: 0,
          warnings: [],
          durationMs: 1,
        }),
      });
    });

    await visitModule(page, '/data-quality', 'Data Quality Engine');
    await expect(page.getByTestId('data-quality-pipeline-status-strip').locator('.MuiChip-label', { hasText: 'COMPLETED' })).toBeVisible();
    await page.getByRole('button', { name: 'Evaluate Scope' }).click();

    await expect.poll(() => evaluatePayload).toMatchObject({
      batchSize: 100,
      offset: 0,
      region: 'IN',
      assetType: 'STOCK',
    });
    await expect(page.getByText('Evaluation complete. Processed 1 instruments across 1 batches.')).toBeVisible();
  });

  test('shows no-run evidence and does not post any commands while rendering indicator', async ({ page }) => {
    let evaluatePostCount = 0;
    let commandPostCount = 0;

    await mockDataQualityResponses(page);
    await mockReviewReadiness(page);
    await mockPipelineStatus(page, 'none');
    await page.route('**/api/v1/data-quality/evaluate', async (route) => {
      evaluatePostCount += 1;
      await route.abort();
    });
    await page.route('**/api/v1/pipeline/commands', async (route) => {
      commandPostCount += 1;
      await route.abort();
    });

    await visitModule(page, '/data-quality', 'Data Quality Engine');

    const indicator = page.getByTestId('data-quality-pipeline-status-strip');
    await expect(indicator.getByText('NO_RUN_EVIDENCE')).toBeVisible();
    await expect(indicator.getByText('No run evidence is available yet for the current scope.')).toBeVisible();
    await expect(indicator.locator('.MuiLinearProgress-determinate')).toBeVisible();
    await expect(indicator.locator('.MuiLinearProgress-indeterminate')).toHaveCount(0);
    await expect(indicator.getByRole('link', { name: 'View Pipeline Ops details' })).toHaveAttribute('href', '/pipeline-ops');
    expect(evaluatePostCount).toBe(0);
    expect(commandPostCount).toBe(0);
  });

  test('does not claim no-run evidence while pipeline status is still loading', async ({ page }) => {
    await mockDataQualityResponses(page);
    await mockReviewReadiness(page);
    await mockPipelineStatus(page, 'running', { delayMs: 1_500 });

    await visitModule(page, '/data-quality', 'Data Quality Engine');

    const indicator = page.getByTestId('data-quality-pipeline-status-strip');
    await expect(indicator.getByText('Progress: Loading pipeline snapshot...')).toBeVisible();
    await expect(indicator.getByText('NO_RUN_EVIDENCE')).toHaveCount(0);
    await expect(indicator.getByText('No run evidence is available yet for the current scope.')).toHaveCount(0);
    await expect(indicator.getByText('RUNNING')).toBeVisible();
  });

  test('shows inline unavailable state when pipeline status fetch fails', async ({ page }) => {
    await mockDataQualityResponses(page);
    await mockReviewReadiness(page);
    await mockPipelineStatus(page, 'error');

    await visitModule(page, '/data-quality', 'Data Quality Engine');

    const indicator = page.getByTestId('data-quality-pipeline-status-strip');
    await expect(indicator.getByText(/Pipeline status unavailable:/)).toBeVisible();
    await expect(indicator.getByText('NO_RUN_EVIDENCE')).toHaveCount(0);
    await expect(indicator.getByText('No run evidence is available yet for the current scope.')).toHaveCount(0);
  });
});

type PipelineStatusMode = 'running' | 'terminal' | 'none' | 'error';

async function mockPipelineStatus(page: any, mode: PipelineStatusMode, options?: { delayMs?: number }) {
  await page.route('**/api/v1/pipeline/status**', async (route: any) => {
    if (options?.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }

    if (mode === 'error') {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Pipeline status unavailable for current scope' }),
      });
      return;
    }

    const runningStage = {
      id: 'stage-data-quality-running',
      pipelineRunId: 'run-data-quality-running',
      stageKey: 'DATA_QUALITY',
      stageOrder: 2,
      status: 'RUNNING',
      dataThroughDate: '2026-05-24T00:00:00.000Z',
      changedInstrumentCount: 20,
      batchSize: 25,
      offset: 0,
      nextOffset: 25,
      hasMore: true,
      totalCount: 80,
      processedCount: 20,
      succeededCount: 18,
      partialCount: 1,
      failedCount: 1,
      skippedCount: 0,
      unchangedCount: 0,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'MISS',
      cacheExpiresAt: null,
      inputFingerprint: null,
      outputFingerprint: null,
      leaseOwner: 'worker-1',
      leaseExpiresAt: '2026-05-25T09:15:00.000Z',
      startedAt: '2026-05-25T09:00:00.000Z',
      completedAt: null,
      durationMs: null,
      warnings: ['batch timeout warning'],
      errors: ['row failed', 'dependency stale'],
      updatedAt: '2026-05-25T09:05:00.000Z',
    };

    const terminalStage = {
      ...runningStage,
      id: 'stage-data-quality-complete',
      pipelineRunId: 'run-data-quality-complete',
      status: 'COMPLETED',
      hasMore: false,
      processedCount: 80,
      succeededCount: 79,
      partialCount: 1,
      failedCount: 0,
      warnings: [],
      errors: [],
      completedAt: '2026-05-25T09:20:00.000Z',
      durationMs: 1_200_000,
      updatedAt: '2026-05-25T09:20:00.000Z',
    };

    const payloadByMode: Record<Exclude<PipelineStatusMode, 'error'>, any> = {
      running: {
        scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
        generatedAt: '2026-05-25T09:05:00.000Z',
        activeRun: {
          id: 'run-data-quality-running',
          status: 'RUNNING',
          triggerType: 'manual',
          dataThroughDate: '2026-05-24T00:00:00.000Z',
          changedInstrumentCount: 20,
          totalCount: 80,
          processedCount: 20,
          succeededCount: 18,
          partialCount: 1,
          failedCount: 1,
          skippedCount: 0,
          unchangedCount: 0,
          sourceFingerprint: null,
          startedAt: '2026-05-25T09:00:00.000Z',
          completedAt: null,
          durationMs: null,
          warnings: ['batch timeout warning'],
          errors: ['row failed'],
          updatedAt: '2026-05-25T09:05:00.000Z',
        },
        lastRun: null,
        stages: [{ stageKey: 'DATA_QUALITY', stageOrder: 2, activeStage: runningStage, lastStage: null }],
      },
      terminal: {
        scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
        generatedAt: '2026-05-25T09:20:30.000Z',
        activeRun: null,
        lastRun: {
          id: 'run-data-quality-complete',
          status: 'COMPLETED',
          triggerType: 'manual',
          dataThroughDate: '2026-05-24T00:00:00.000Z',
          changedInstrumentCount: 80,
          totalCount: 80,
          processedCount: 80,
          succeededCount: 79,
          partialCount: 1,
          failedCount: 0,
          skippedCount: 0,
          unchangedCount: 0,
          sourceFingerprint: null,
          startedAt: '2026-05-25T09:00:00.000Z',
          completedAt: '2026-05-25T09:20:00.000Z',
          durationMs: 1_200_000,
          warnings: [],
          errors: [],
          updatedAt: '2026-05-25T09:20:00.000Z',
        },
        stages: [{ stageKey: 'DATA_QUALITY', stageOrder: 2, activeStage: null, lastStage: terminalStage }],
      },
      none: {
        scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
        generatedAt: '2026-05-25T09:30:00.000Z',
        activeRun: null,
        lastRun: null,
        stages: [
          {
            stageKey: 'MARKET_DATA',
            stageOrder: 1,
            activeStage: null,
            lastStage: { ...terminalStage, stageKey: 'MARKET_DATA' },
          },
        ],
      },
    };

    await route.fulfill({ json: payloadByMode[mode] });
  });
}

async function mockDataQualityResponses(page: any) {
  await page.route('**/api/v1/data-quality/summary**', async (route: any) => {
    await route.fulfill({
      json: {
        totalInstruments: 1,
        goodCoverageCount: 1,
        partialCoverageCount: 0,
        poorCoverageCount: 0,
        unusableCoverageCount: 0,
        signalReadyCount: 1,
        notSignalReadyCount: 0,
        stalePriceCount: 0,
        missingFundamentalsCount: 0,
        missingSectorCount: 0,
        missingIndustryCount: 0,
        missingCountryCount: 0,
        lowLiquidityCount: 0,
        missingVolumeCount: 0,
        latestEvaluationAt: '2026-05-14T09:00:00.000Z',
        dataStatus: 'COMPLETE',
      },
    });
  });

  await page.route('**/api/v1/data-quality/instruments?**', async (route: any) => {
    await route.fulfill({
      json: {
        items: [
          {
            instrumentId: 'stock-1',
            symbol: 'INFY',
            companyName: 'Infosys Ltd',
            sector: 'Technology',
            industry: 'IT Services',
            country: 'IN',
            currency: 'INR',
            coverageScore: 88,
            coverageStatus: 'GOOD',
            signalReadinessScore: 72,
            signalReadinessStatus: 'LIMITED',
            liquidityScore: 75,
            liquidityStatus: 'LIQUID',
            eligibleForSignals: false,
            eligibleForBacktesting: true,
            eligibleForCalibration: false,
            dataGaps: [],
            warnings: [],
            readinessReasons: [],
            readinessBlockers: [],
            recommendedFixes: [],
            useCaseTiers: {
              dailyReview: { status: 'LIMITED', reasons: ['SIGNAL_LIMITED'] },
              signal: { status: 'BLOCKED', reasons: ['SIGNAL_NOT_READY'] },
              backtest: { status: 'BLOCKED', reasons: ['TRUST_CONTEXT_MISSING'] },
              calibration: { status: 'BLOCKED', reasons: ['CALIBRATION_SIGNAL_HISTORY_MISSING'] },
              automation: { status: 'BLOCKED', reasons: ['PHASE0_AUTOMATION_NOT_AUTHORIZED'] },
            },
            tierEvidence: {
              trustedBaselineResidualState: 'PARTIAL',
              requiredHistoryStatus: null,
              listingDateStatus: null,
              trustedBaselineBlockerCodes: ['FALLBACK_REQUIRED_AFTER_YAHOO_ZERO_ROWS'],
              hasSignalHistory: false,
            },
            lastEvaluatedAt: '2026-05-14T09:00:00.000Z',
            researchUrl: '/research/stocks/stock-1',
          },
        ],
        pagination: {
          total: 1,
          limit: 25,
          offset: 0,
          nextOffset: null,
          hasMore: false,
        },
      },
    });
  });

  await page.route('**/api/v1/data-quality/instruments/stock-1', async (route: any) => {
    await route.fulfill({
      json: {
        instrumentId: 'stock-1',
        symbol: 'INFY',
        companyName: 'Infosys Ltd',
        sector: 'Technology',
        industry: 'IT Services',
        country: 'IN',
        currency: 'INR',
        coverageScore: 88,
        coverageStatus: 'GOOD',
        signalReadinessScore: 72,
        signalReadinessStatus: 'LIMITED',
        liquidityScore: 75,
        liquidityStatus: 'LIQUID',
        eligibleForSignals: false,
        eligibleForBacktesting: true,
        eligibleForCalibration: false,
        dataGaps: [],
        warnings: [],
        readinessReasons: ['Enough price history for SMA50.'],
        readinessBlockers: ['Signal readiness is not ready.'],
        recommendedFixes: ['Improve trusted baseline completeness.'],
        useCaseTiers: {
          dailyReview: { status: 'LIMITED', reasons: ['SIGNAL_LIMITED'] },
          signal: { status: 'BLOCKED', reasons: ['SIGNAL_NOT_READY'] },
          backtest: { status: 'BLOCKED', reasons: ['TRUST_CONTEXT_MISSING'] },
          calibration: { status: 'BLOCKED', reasons: ['CALIBRATION_SIGNAL_HISTORY_MISSING'] },
          automation: { status: 'BLOCKED', reasons: ['PHASE0_AUTOMATION_NOT_AUTHORIZED'] },
        },
        tierEvidence: {
          trustedBaselineResidualState: 'PARTIAL',
          requiredHistoryStatus: null,
          listingDateStatus: null,
          trustedBaselineBlockerCodes: ['FALLBACK_REQUIRED_AFTER_YAHOO_ZERO_ROWS'],
          hasSignalHistory: false,
        },
        lastEvaluatedAt: '2026-05-14T09:00:00.000Z',
        researchUrl: '/research/stocks/stock-1',
      },
    });
  });
}

async function mockReviewReadiness(page: any) {
  await page.route('**/api/v1/market-data/review-readiness-summary**', async (route: any) => {
    await route.fulfill({
      json: {
        scope: { region: 'IN', assetType: 'STOCK' },
        reviewMode: 'LIMITED_REVIEW',
        trustStatus: 'PARTIAL',
        userDecision: 'PROCEED_LIMITED',
        reviewUniverse: {
          catalogCount: 2910,
          providerSupportedCount: 585,
          trustedCount: 144,
          targetTradingDate: '2026-05-12',
          requiredDataThroughDate: '2026-05-11',
          storedDataThroughDate: '2026-05-11',
        },
        readinessCounts: {
          priceReady: 144,
          reviewReady: 0,
          missingLatestPrice: 2325,
          staleLatestPrice: 200,
          inadequateHistory: 30,
          missingRecentVolume: 20,
        },
        nextAction: { code: 'VALIDATE_PROVIDERS', label: 'Validate unknown providers', boundedRequest: { batchSize: 50, region: 'IN', assetType: 'STOCK' } },
        blockers: [
          { category: 'PROVIDER_VALIDATION', severity: 'HARD_BLOCKER', affectedCount: 2909, nextActionLabel: 'Validate unknown providers' },
        ],
      },
    });
  });
}
