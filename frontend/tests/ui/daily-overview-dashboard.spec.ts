import { expect, test, type Page } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-daily-overview-token');
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        id: 'playwright-daily-overview-user',
        email: 'codex.test@example.com',
        name: 'Codex Test',
      },
    });
  });
  await page.route('**/api/v1/auth/logout', async (route) => {
    await route.fulfill({ json: { success: true } });
  });
}

function createTodayReviewPayload() {
  return {
    run: {
      id: 'today-run-1',
      runDate: '2026-05-26T00:00:00.000Z',
      region: 'IN',
      assetType: 'STOCK',
      status: 'PARTIAL',
      trustStatus: 'PARTIAL',
      dataThroughDate: '2026-05-26T00:00:00.000Z',
      startedAt: '2026-05-26T05:00:00.000Z',
      finishedAt: '2026-05-26T05:05:00.000Z',
      warnings: ['Trusted review universe is limited; verify blocker categories before candidate review.'],
      candidateCounts: { LONG_REVIEW: 1, EXIT_RISK_REVIEW: 1, WATCH_ONLY: 1, BLOCKED: 1 },
      sourceSnapshot: {
        reviewReadiness: {
          reviewMode: 'LIMITED_REVIEW',
          trustStatus: 'PARTIAL',
          requiredDataThroughDate: '2026-05-26',
          storedDataThroughDate: '2026-05-26',
          nextAction: { code: 'REVIEW_REPAIR_PLAN', label: 'Review bounded repair plan' },
        },
      },
      trustedUniverseCount: 144,
      catalogCount: 2910,
      createdAt: '2026-05-26T05:00:00.000Z',
      updatedAt: '2026-05-26T05:05:00.000Z',
      candidates: [],
    },
    groups: {
      longReview: [
        {
          id: 'c1',
          runId: 'today-run-1',
          instrumentId: 'inst-1',
          symbol: 'ALPHA.NS',
          companyName: 'Alpha Ltd',
          direction: 'LONG',
          state: 'LONG_REVIEW',
          setupType: 'BREAKOUT',
          strategyCode: 'TREND_BREAKOUT',
          strategyVersion: '1.2.0',
          rank: 1,
          grade: 'A',
          confidenceScore: 82,
          reasonSummary: 'Bullish review candidate with trusted baseline and usable proof.',
          blockers: [],
          watchReasons: [],
          dataQualitySnapshot: null,
          marketContextSnapshot: null,
          strategyProofSnapshot: null,
          tradePlanSnapshot: null,
          sourceSignalSnapshot: null,
          createdAt: '2026-05-26T05:05:00.000Z',
          updatedAt: '2026-05-26T05:05:00.000Z',
        },
      ],
      shortReview: [
        {
          id: 'c2-short',
          runId: 'today-run-1',
          instrumentId: 'inst-2-short',
          symbol: 'BETA.NS',
          companyName: 'Beta Ltd',
          direction: 'SHORT',
          state: 'SHORT_REVIEW',
          setupType: 'BREAKDOWN',
          strategyCode: 'RISK_BREAKDOWN',
          strategyVersion: '1.0.0',
          rank: 2,
          grade: 'B',
          confidenceScore: 71,
          reasonSummary: 'Bearish review candidate from Today Review source evidence.',
          blockers: [],
          watchReasons: [],
          dataQualitySnapshot: null,
          marketContextSnapshot: null,
          strategyProofSnapshot: null,
          tradePlanSnapshot: null,
          sourceSignalSnapshot: null,
          createdAt: '2026-05-26T05:05:00.000Z',
          updatedAt: '2026-05-26T05:05:00.000Z',
        },
      ],
      exitRiskReview: [
        {
          id: 'c2',
          runId: 'today-run-1',
          instrumentId: 'inst-2',
          symbol: 'EXIT.NS',
          companyName: 'Exit Ltd',
          direction: 'EXIT_RISK',
          state: 'EXIT_RISK_REVIEW',
          setupType: 'RISK',
          strategyCode: 'RISK_EXIT',
          strategyVersion: '0.9.1',
          rank: 2,
          grade: 'B',
          confidenceScore: 70,
          reasonSummary: 'Exit-risk review candidate because recent conditions weakened.',
          blockers: [],
          watchReasons: [],
          dataQualitySnapshot: null,
          marketContextSnapshot: null,
          strategyProofSnapshot: null,
          tradePlanSnapshot: null,
          sourceSignalSnapshot: null,
          createdAt: '2026-05-26T05:05:00.000Z',
          updatedAt: '2026-05-26T05:05:00.000Z',
        },
      ],
      watchOnly: [
        {
          id: 'c3',
          runId: 'today-run-1',
          instrumentId: 'inst-3',
          symbol: 'WATCH.NS',
          companyName: 'Watch Ltd',
          direction: 'WATCH',
          state: 'WATCH_ONLY',
          setupType: 'WATCH',
          strategyCode: 'WATCH_SETUP',
          strategyVersion: '1.0.0',
          rank: 3,
          grade: 'C',
          confidenceScore: 50,
          reasonSummary: 'Watch-only candidate with mixed evidence.',
          blockers: [],
          watchReasons: ['Mixed evidence across modules.'],
          dataQualitySnapshot: null,
          marketContextSnapshot: null,
          strategyProofSnapshot: null,
          tradePlanSnapshot: null,
          sourceSignalSnapshot: null,
          createdAt: '2026-05-26T05:05:00.000Z',
          updatedAt: '2026-05-26T05:05:00.000Z',
        },
      ],
      blocked: [
        {
          id: 'c4',
          runId: 'today-run-1',
          instrumentId: 'inst-4',
          symbol: 'BLOCK.NS',
          companyName: 'Blocked Ltd',
          direction: 'BLOCKED',
          state: 'BLOCKED',
          setupType: 'BLOCKED',
          strategyCode: 'BLOCKER_CHECK',
          strategyVersion: '2.0.0',
          rank: 4,
          grade: 'D',
          confidenceScore: 0,
          reasonSummary: 'Blocked candidate due to unresolved trust blockers.',
          blockers: ['Provider support not validated.'],
          watchReasons: [],
          dataQualitySnapshot: null,
          marketContextSnapshot: null,
          strategyProofSnapshot: null,
          tradePlanSnapshot: null,
          sourceSignalSnapshot: null,
          createdAt: '2026-05-26T05:05:00.000Z',
          updatedAt: '2026-05-26T05:05:00.000Z',
        },
      ],
      avoid: [],
      insufficientData: [],
      unproven: [],
    },
    scope: { region: 'IN', assetType: 'STOCK' },
  };
}

function createResearchOverviewPayload() {
  return {
    actionability: {
      overallStatus: 'LIMITED',
      canReviewActionableSetups: false,
      headline: 'Review is limited while upstream blockers remain.',
      researchSupportOnly: true,
      dimensions: {
        marketEnvironment: { status: 'READY', label: 'Market Environment', sourceModule: 'strategy-decision-engine', blocking: false, message: 'Environment is usable for review support.' },
        dataReadiness: { status: 'LIMITED', label: 'Data Readiness', sourceModule: 'data-quality-engine', blocking: false, message: 'Partial trust due to provider gaps.' },
        signalEvidence: { status: 'READY', label: 'Signal Evidence', sourceModule: 'signal-generation-engine', blocking: false, message: 'Signal evidence is available.' },
        calibrationReadiness: { status: 'INSUFFICIENT_DATA', label: 'Calibration Readiness', sourceModule: 'signal-calibration-engine', blocking: true, message: 'Calibration aggregate not available.' },
        strategyProof: { status: 'READY', label: 'Strategy Proof', sourceModule: 'strategy-framework', blocking: false, message: 'Proof is usable for multiple candidates.' },
        todayReviewReadiness: { status: 'LIMITED', label: 'Today Review Readiness', sourceModule: 'today-trade-review', blocking: false, message: 'Trusted universe is limited.' },
        tradePlanReadiness: { status: 'INSUFFICIENT_DATA', label: 'Risk Plan Readiness', sourceModule: 'trade-plan-risk-engine', blocking: true, message: 'Risk-plan readiness is not the Daily Pulse authority.' },
      },
      nextBestAction: null,
      blockers: [],
    },
    marketReadiness: {
      marketGate: 'OPEN',
      marketCondition: 'HEALTHY',
      headline: 'Market gate is open, but trusted review coverage is still limited.',
      allowedActions: ['RESEARCH_REVIEW'],
      reasons: [],
      blockers: [],
      dataStatus: 'PARTIAL',
    },
    researchPriorities: {
      tradeCandidates: [{ id: 'p1', symbol: 'PRIORITY1.NS', strategy: 'BREAKOUT_CONFIRM', strategyVersion: '1.1.0', primaryNextAction: 'Inspect confirmation stack', targetRoute: '/research', reasons: [] }],
      watchCandidates: [{ id: 'p2', symbol: 'WATCHP.NS', strategy: 'WATCH_BAND', strategyVersion: '1.0.0', primaryNextAction: 'Monitor contradiction notes', targetRoute: '/research', reasons: [] }],
      avoidCandidates: [{ id: 'p3', symbol: 'BLOCKP.NS', strategy: 'RISK_FILTER', strategyVersion: '2.0.0', primaryNextAction: 'Resolve blocker before review', targetRoute: '/research', reasons: [] }],
      exitCandidates: [{ id: 'p4', symbol: 'EXITP.NS', strategy: 'EXIT_ALERT', strategyVersion: '1.0.0', primaryNextAction: 'Inspect exit-risk stack', targetRoute: '/research', reasons: [] }],
    },
    strategyProofSummary: {
      strategiesProducingCandidates: [],
      provenCandidateCount: 2,
      unprovenCandidateCount: 1,
      blockedByMarketGateCount: 0,
      missingBacktestCount: 4,
      notes: [],
    },
    confirmationSummary: {
      signalSummary: { topBullishCount: 12, topBearishCount: 5, reliabilityAvailable: false, notes: [] },
      smartMoneySummary: {
        accumulationCount: 8,
        distributionCount: 3,
        topConfirmations: ['Accumulation trend supports selective review.'],
        topContradictions: ['Distribution pressure increased in one leading sector.'],
      },
      marketContextSummary: { leadingSectors: ['Financials', 'Industrials'], weakSectors: ['Utilities'], breadthStatus: 'Mixed', notes: [] },
    },
    whatChanged: { newTradeCandidates: [], downgradedCandidates: [], marketGateChange: null, warnings: [] },
    nextActions: [{ label: 'Open Today Review shortlist', priority: 'HIGH', targetRoute: '/today-review' }],
    generatedAt: '2026-05-26T05:06:00.000Z',
    dataGaps: [],
  };
}

function createCalibrationTopPayload(input?: {
  horizon?: string;
  readinessStatus?: 'USABLE' | 'LIMITED' | 'UNAVAILABLE';
  evidenceBasisStatus?: 'MEASURED' | 'HORIZON_LIMITED' | 'MISSING_SIGNAL_QUALITY_EVIDENCE';
  signalQualityGeneratedAt?: string | null;
  latestMeasurablePriceDate?: string | null;
  nextEvaluableDate?: string | null;
  reasonSummary?: string;
}) {
  const horizon = input?.horizon || '20D';
  return {
    items: [
      {
        id: 'cal-row-1',
        signalResultId: 'signal-1',
        instrumentId: 'inst-1',
        symbol: 'ALPHA.NS',
        companyName: 'Alpha Ltd',
        sector: 'Financials',
        country: 'IN',
        exchange: 'NSE',
        region: 'IN',
        assetType: 'STOCK',
        rawScore: 0.62,
        calibratedScore: 0.66,
        scoreDelta: 0.04,
        rawDirection: 'LONG',
        calibratedDirection: 'LONG',
        rawConfidence: 'MEDIUM',
        calibratedConfidence: 'MEDIUM',
        boosts: [],
        penalties: [],
        calibrationReasons: ['Evidence supports mild uplift.'],
        dataGaps: [],
        calibrationModelVersion: 'cal-v1',
        rawSignalModelVersion: 'sig-v1',
        generatedAt: '2026-05-25T12:00:00.000Z',
        dataStatus: 'COMPLETE',
        researchUrl: '/research',
      },
    ],
    totalCount: 1,
    limit: 25,
    offset: 0,
    hasMore: false,
    sortBy: 'generatedAt',
    sortDirection: 'desc',
    pageSummary: {
      scope: {
        region: 'IN',
        assetType: 'STOCK',
        horizon,
      },
      itemsOnPage: 1,
      totalScopedRows: 1,
      calibrationReadiness: {
        status: input?.readinessStatus || 'USABLE',
        confidenceTier: 'MEDIUM',
        calibrationApplied: true,
        adjustmentCapApplied: 0.15,
        downstreamInfluence: 'NORMAL',
        authoritativeScore: 'CALIBRATED_SCORE',
        reasons: ['Scoped calibration evidence is usable.'],
        blockers: [],
      },
      calibrationEvidence: {
        horizon,
        overallEvaluatedSamples: 120,
        groupEvaluatedSamples: 66,
        minimumOverallSamples: 50,
        minimumGroupSamples: 20,
        requiredOverallSamples: 50,
        requiredGroupSamples: 20,
        horizonAvailability: {},
        dataStatus: 'COMPLETE',
        evidenceStatus: 'SUFFICIENT',
        evidenceReasons: [],
        evidenceWarnings: [],
        warnings: [],
        evidenceBasis: {
          status: input?.evidenceBasisStatus || 'MEASURED',
          signalQualityGeneratedAt: input && Object.prototype.hasOwnProperty.call(input, 'signalQualityGeneratedAt') ? input.signalQualityGeneratedAt : '2026-05-24T10:00:00.000Z',
          latestMeasurablePriceDate: input && Object.prototype.hasOwnProperty.call(input, 'latestMeasurablePriceDate') ? input.latestMeasurablePriceDate : '2026-05-23',
          nextEvaluableDate: input && Object.prototype.hasOwnProperty.call(input, 'nextEvaluableDate') ? input.nextEvaluableDate : null,
          reasonSummary: input?.reasonSummary || 'Measured calibration evidence is available for this scope and horizon.',
        },
      },
    },
  };
}

function forbiddenVisibleCopyPattern() {
  const phrases = [
    'buy ' + 'now',
    'sell ' + 'now',
    'must ' + 'buy',
    'must ' + 'sell',
    'target ' + 'price',
    'price ' + 'target',
    'profit ' + 'target',
    'reward' + '/risk',
    'R' + ':R',
    'guaran' + 'teed',
    'financial ' + 'advice',
    'best ' + 'trade',
  ];
  return new RegExp(phrases.map(escapeRegExp).join('|'), 'i');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('Daily Overview dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test('renders first-slice dashboard with approved reads, placeholders, and drilldowns', async ({ page }) => {
    const calls = {
      todayReview: 0,
      research: 0,
      readiness: 0,
      marketContext: 0,
      dataQuality: 0,
      signalRun: 0,
      pipeline: 0,
      calibrationModel: 0,
      calibrationTop: 0,
      calibrationHealth: 0,
    };
    const queryMap: Record<string, string[]> = {
      todayReview: [],
      research: [],
      readiness: [],
      marketContext: [],
      dataQuality: [],
      signalRun: [],
      pipeline: [],
      calibrationTop: [],
    };

    await page.route('**/api/v1/today-review/latest**', async (route) => {
      calls.todayReview += 1;
      queryMap.todayReview.push(new URL(route.request().url()).search);
      await route.fulfill({ json: createTodayReviewPayload() });
    });
    await page.route('**/api/v1/research/overview**', async (route) => {
      calls.research += 1;
      queryMap.research.push(new URL(route.request().url()).search);
      await route.fulfill({ json: createResearchOverviewPayload() });
    });
    await page.route('**/api/v1/market-data/review-readiness-summary**', async (route) => {
      calls.readiness += 1;
      queryMap.readiness.push(new URL(route.request().url()).search);
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
            targetTradingDate: '2026-05-26',
            requiredDataThroughDate: '2026-05-26',
            storedDataThroughDate: '2026-05-26',
          },
          readinessCounts: {
            priceReady: 144,
            reviewReady: 120,
            missingLatestPrice: 4,
            staleLatestPrice: 2,
            inadequateHistory: 8,
            missingRecentVolume: 10,
          },
          nextAction: { code: 'REVIEW_REPAIR_PLAN', label: 'Review bounded repair plan', boundedRequest: { batchSize: 50, region: 'IN', assetType: 'STOCK' } },
          blockers: [{ category: 'PROVIDER_VALIDATION', severity: 'LIMITED', affectedCount: 12, nextActionLabel: 'Validate unknown providers' }],
        },
      });
    });
    await page.route('**/api/v1/market-context/summary**', async (route) => {
      calls.marketContext += 1;
      queryMap.marketContext.push(new URL(route.request().url()).search);
      await route.fulfill({
        json: {
          regime: { regime: 'NEUTRAL', score: 55, explanation: 'Mixed data', updatedAt: '2026-05-26T05:00:00.000Z', dataStatus: 'PARTIAL' },
          topSectors: [{ sector: 'Financials', return1M: 0.03, return3M: 0.05, return6M: 0.09, relativeStrengthScore: 68, instrumentCount: 40, bullishSignalCount: 12, bearishSignalCount: 3, leadershipStatus: 'LEADING' }],
          weakSectors: [{ sector: 'Utilities', return1M: -0.01, return3M: -0.02, return6M: -0.03, relativeStrengthScore: 30, instrumentCount: 20, bullishSignalCount: 2, bearishSignalCount: 9, leadershipStatus: 'LAGGING' }],
          breadth: {
            percentAboveSma50: 0.58,
            percentAboveSma200: 0.52,
            advanceDeclineRatio: 1.1,
            newHigh52WeekCount: 44,
            newLow52WeekCount: 18,
            bullishSignalCount: 90,
            bearishSignalCount: 55,
            instrumentCount: 300,
            dataStatus: 'PARTIAL',
          },
          countryStrength: [],
          macro: { interestRateProxy: null, inflationProxy: null, usdStrengthProxy: null, commodityProxy: null, macroStatus: 'MIXED', dataStatus: 'PARTIAL', explanation: 'Partial' },
          explanation: ['Partial evidence'],
          updatedAt: '2026-05-26T05:00:00.000Z',
          dataStatus: 'PARTIAL',
        },
      });
    });
    await page.route('**/api/v1/data-quality/summary**', async (route) => {
      calls.dataQuality += 1;
      queryMap.dataQuality.push(new URL(route.request().url()).search);
      await route.fulfill({
        json: {
          totalInstruments: 2910,
          goodCoverageCount: 1400,
          partialCoverageCount: 700,
          poorCoverageCount: 500,
          unusableCoverageCount: 310,
          signalReadyCount: 1300,
          notSignalReadyCount: 1610,
          stalePriceCount: 22,
          missingFundamentalsCount: 30,
          missingSectorCount: 20,
          missingIndustryCount: 20,
          missingCountryCount: 0,
          lowLiquidityCount: 25,
          missingVolumeCount: 15,
          latestEvaluationAt: '2026-05-26T04:40:00.000Z',
          dataStatus: 'PARTIAL',
        },
      });
    });
    await page.route('**/api/v1/signals/runs/latest**', async (route) => {
      calls.signalRun += 1;
      queryMap.signalRun.push(new URL(route.request().url()).search);
      await route.fulfill({
        json: {
          id: 'signal-run-1',
          scope: { region: 'IN', assetType: 'STOCK' },
          requestedByUserId: 'user-1',
          status: 'COMPLETED',
          modelVersion: 'v1',
          rulesetVersion: 'v1',
          sourceDataDate: '2026-05-26',
          generatedDate: '2026-05-26',
          batchSize: 25,
          offset: 0,
          totalCount: 300,
          processedCount: 300,
          generatedCount: 220,
          updatedCount: 40,
          noOpCount: 40,
          duplicateOrIdempotentCount: 0,
          skippedCount: 0,
          failedCount: 0,
          excludedByDataQuality: 20,
          missingQualityEvaluationCount: 0,
          durationMs: 12000,
          startedAt: '2026-05-26T04:50:00.000Z',
          completedAt: '2026-05-26T05:02:00.000Z',
          warnings: [],
        },
      });
    });
    await page.route('**/api/v1/pipeline/status**', async (route) => {
      calls.pipeline += 1;
      queryMap.pipeline.push(new URL(route.request().url()).search);
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
          generatedAt: '2026-05-26T05:03:00.000Z',
          activeRun: { id: 'run-active', status: 'RUNNING', triggerType: 'MANUAL', dataThroughDate: '2026-05-26', changedInstrumentCount: 40, totalCount: 300, processedCount: 120, succeededCount: 100, partialCount: 10, failedCount: 10, skippedCount: 0, unchangedCount: 0, sourceFingerprint: null, startedAt: '2026-05-26T05:01:00.000Z', completedAt: null, durationMs: null, warnings: ['One stage is delayed'], errors: [], updatedAt: '2026-05-26T05:03:00.000Z' },
          lastRun: null,
          stages: [],
        },
      });
    });
    await page.route('**/api/v1/signals/calibration/model', async (route) => {
      calls.calibrationModel += 1;
      await route.fulfill({
        json: {
          calibrationModelVersion: 'cal-v1',
          qualityMetricWindow: '20D',
          supportedHorizons: ['10D', '20D', '40D'],
          defaultHorizon: '40D',
          minSampleSize: 50,
          perAdjustmentDeltaCap: 0.15,
          totalDeltaCap: 0.3,
          rules: ['Use scoped evidence basis only.'],
        },
      });
    });
    await page.route('**/api/v1/signals/calibration/top**', async (route) => {
      calls.calibrationTop += 1;
      const search = new URL(route.request().url()).search;
      queryMap.calibrationTop.push(search);
      await route.fulfill({ json: createCalibrationTopPayload({ horizon: '40D' }) });
    });
    await page.route('**/api/v1/signals/calibration/health**', async (route) => {
      calls.calibrationHealth += 1;
      await route.fulfill({ json: { status: 'OK' } });
    });

    await visitAuthenticated(page, '/');

    await expect(page.locator('h4', { hasText: 'Daily Overview' })).toBeVisible();
    await expect(page.getByText('IN / STOCK', { exact: true })).toBeVisible();
    await expect(page.getByText('Research-support context only')).toBeVisible();
    await expect(page.getByText(/^Dashboard refetched:/)).toBeVisible();
    await expect(page.getByText(/^Latest source timestamp:/)).toBeVisible();
    await expect(page.getByText(/^Latest loaded:/)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Market Pulse' })).toBeVisible();
    await expect(page.getByText('Review limited')).toBeVisible();
    await expect(page.getByText('Today Review run: PARTIAL')).toBeVisible();
    await expect(page.getByText('Trust status: PARTIAL')).toBeVisible();
    await expect(page.getByText('Review mode: LIMITED_REVIEW')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'High-Priority Review Candidates' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Watch And Blocked' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Calibration Evidence-Through Summary' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Evidence Caveats' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Supporting Navigation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Data Trust and Pipeline Health' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Signal and Evidence Health' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Drilldown Strip' })).toHaveCount(0);
    await expect(page.getByText('Breadth: Mixed')).toBeVisible();
    await expect(page.getByText('Market context is region-level for this scope; asset-type specific context is still limited.')).toBeVisible();
    await expect(page.getByText('Horizon: 40D')).toBeVisible();
    await expect(page.getByText('Usable', { exact: true })).toBeVisible();
    const measuredEvidenceDate = await page.evaluate(() => new Date('2026-05-23').toLocaleDateString());
    await expect(page.getByText(`Latest measurable evidence: ${measuredEvidenceDate}`)).toBeVisible();

    await page.getByRole('button', { name: /Bearish review/ }).click();
    await expect(page.getByText('BETA.NS - SHORT REVIEW - RISK_BREAKDOWN v1.0.0')).toBeVisible();
    await page.getByRole('button', { name: /Exit-risk review/ }).click();
    await expect(page.getByText('EXIT.NS - EXIT RISK REVIEW - RISK_EXIT v0.9.1')).toBeVisible();
    await expect(page.getByText('WATCH.NS - Watch only')).toBeVisible();
    await expect(page.getByText('BLOCK.NS - Blocked')).toBeVisible();

    await expect(page.getByText('Coming soon - Market Movers')).toBeVisible();
    await expect(page.getByText('Coming soon - FII/DII Activity')).toBeVisible();

    await expect(page.locator('a[href="/today-review"]').first()).toBeVisible();
    await expect(page.locator('a[href="/research"]').first()).toBeVisible();
    await expect(page.locator('a[href="/market-context"]').first()).toBeVisible();
    await expect(page.locator('a[href="/signals"]').first()).toBeVisible();
    await expect(page.locator('a[href="/signals/calibration"]').first()).toBeVisible();
    await expect(page.locator('a[href="/data-quality"]').first()).toBeVisible();
    await expect(page.locator('a[href="/smart-money"]').first()).toBeVisible();
    await expect(page.locator('a[href="/pipeline-ops"]').first()).toBeVisible();
    await expect(page.locator('a[href="/backtests"]').first()).toBeVisible();

    await page.getByRole('button', { name: 'Refresh dashboard' }).click();
    await expect.poll(() => calls.todayReview).toBeGreaterThan(1);
    await expect.poll(() => calls.research).toBeGreaterThan(1);
    await expect.poll(() => calls.readiness).toBeGreaterThan(1);
    await expect.poll(() => calls.marketContext).toBeGreaterThan(1);
    await expect.poll(() => calls.dataQuality).toBeGreaterThan(1);
    await expect.poll(() => calls.signalRun).toBeGreaterThan(1);
    await expect.poll(() => calls.pipeline).toBeGreaterThan(1);
    await expect.poll(() => calls.calibrationTop).toBeGreaterThan(1);

    await expect.poll(() => queryMap.todayReview.some((q) => q.includes('region=IN') && q.includes('assetType=STOCK'))).toBe(true);
    await expect.poll(() => queryMap.research.some((q) => q.includes('region=IN') && q.includes('assetType=STOCK'))).toBe(true);
    await expect.poll(() => queryMap.readiness.some((q) => q.includes('region=IN') && q.includes('assetType=STOCK'))).toBe(true);
    await expect.poll(() => queryMap.dataQuality.some((q) => q.includes('region=IN') && q.includes('assetType=STOCK'))).toBe(true);
    await expect.poll(() => queryMap.signalRun.some((q) => q.includes('region=IN') && q.includes('assetType=STOCK'))).toBe(true);
    await expect.poll(() => queryMap.pipeline.some((q) => q.includes('region=IN') && q.includes('assetType=STOCK'))).toBe(true);
    await expect.poll(() => queryMap.marketContext.some((q) => q.includes('region=IN'))).toBe(true);
    await expect.poll(() => queryMap.calibrationTop.some((q) => q.includes('region=IN') && q.includes('assetType=STOCK') && q.includes('horizon=40D'))).toBe(true);
    expect(calls.calibrationHealth).toBe(0);

    const panelHeadingOrder = await page.locator('h6').allInnerTexts();
    expect(panelHeadingOrder.indexOf('Calibration Evidence-Through Summary')).toBeGreaterThan(panelHeadingOrder.indexOf('Watch And Blocked'));

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(forbiddenVisibleCopyPattern());
  });

  test('does not synthesize source freshness or breadth from dashboard fetch time and data status', async ({ page }) => {
    await page.route('**/api/v1/today-review/latest**', async (route) => {
      const payload = createTodayReviewPayload() as any;
      payload.run.dataThroughDate = null;
      payload.run.finishedAt = null;
      delete payload.run.updatedAt;
      await route.fulfill({ json: payload });
    });
    await page.route('**/api/v1/research/overview**', async (route) => {
      const payload = createResearchOverviewPayload() as any;
      delete payload.generatedAt;
      delete payload.confirmationSummary.marketContextSummary.breadthStatus;
      await route.fulfill({ json: payload });
    });
    await page.route('**/api/v1/market-data/review-readiness-summary**', async (route) => {
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
            targetTradingDate: '2026-05-26',
            requiredDataThroughDate: '2026-05-26',
            storedDataThroughDate: '2026-05-26',
          },
          readinessCounts: {
            priceReady: 144,
            reviewReady: 120,
            missingLatestPrice: 4,
            staleLatestPrice: 2,
            inadequateHistory: 8,
            missingRecentVolume: 10,
          },
          nextAction: null,
          blockers: [],
        },
      });
    });
    await page.route('**/api/v1/market-context/summary**', async (route) => {
      await route.fulfill({
        json: {
          regime: { regime: 'NEUTRAL', score: 55, explanation: 'Mixed data', updatedAt: null, dataStatus: 'PARTIAL' },
          topSectors: [],
          weakSectors: [],
          breadth: {
            percentAboveSma50: 0.58,
            percentAboveSma200: 0.52,
            advanceDeclineRatio: 1.1,
            newHigh52WeekCount: 44,
            newLow52WeekCount: 18,
            bullishSignalCount: 90,
            bearishSignalCount: 55,
            instrumentCount: 300,
            dataStatus: 'PARTIAL',
          },
          countryStrength: [],
          macro: null,
          explanation: ['Partial evidence'],
          updatedAt: null,
          dataStatus: 'PARTIAL',
        },
      });
    });
    await page.route('**/api/v1/data-quality/summary**', async (route) => {
      await route.fulfill({
        json: {
          totalInstruments: 2910,
          goodCoverageCount: 1400,
          partialCoverageCount: 700,
          poorCoverageCount: 500,
          unusableCoverageCount: 310,
          signalReadyCount: 1300,
          notSignalReadyCount: 1610,
          stalePriceCount: 22,
          missingFundamentalsCount: 30,
          missingSectorCount: 20,
          missingIndustryCount: 20,
          missingCountryCount: 0,
          lowLiquidityCount: 25,
          missingVolumeCount: 15,
          latestEvaluationAt: null,
          dataStatus: 'PARTIAL',
        },
      });
    });
    await page.route('**/api/v1/signals/runs/latest**', async (route) => {
      await route.fulfill({
        json: {
          id: 'signal-run-without-source-time',
          scope: { region: 'IN', assetType: 'STOCK' },
          requestedByUserId: 'user-1',
          status: 'COMPLETED',
          modelVersion: 'v1',
          rulesetVersion: 'v1',
          sourceDataDate: null,
          generatedDate: '2026-05-26',
          batchSize: 25,
          offset: 0,
          totalCount: 300,
          processedCount: 300,
          generatedCount: 220,
          updatedCount: 40,
          noOpCount: 40,
          duplicateOrIdempotentCount: 0,
          skippedCount: 0,
          failedCount: 0,
          excludedByDataQuality: 20,
          missingQualityEvaluationCount: 0,
          durationMs: 12000,
          startedAt: null,
          completedAt: null,
          warnings: [],
        },
      });
    });
    await page.route('**/api/v1/pipeline/status**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
          generatedAt: null,
          activeRun: null,
          lastRun: null,
          stages: [],
        },
      });
    });
    await page.route('**/api/v1/signals/calibration/model', async (route) => {
      await route.fulfill({
        json: {
          calibrationModelVersion: 'cal-v1',
          qualityMetricWindow: '20D',
          supportedHorizons: ['10D', '20D', '40D'],
          defaultHorizon: '20D',
          minSampleSize: 50,
          perAdjustmentDeltaCap: 0.15,
          totalDeltaCap: 0.3,
          rules: ['Use scoped evidence basis only.'],
        },
      });
    });
    await page.route('**/api/v1/signals/calibration/top**', async (route) => {
      await route.fulfill({
        json: createCalibrationTopPayload({
          horizon: '20D',
          readinessStatus: 'LIMITED',
          evidenceBasisStatus: 'HORIZON_LIMITED',
          signalQualityGeneratedAt: null,
          latestMeasurablePriceDate: null,
          nextEvaluableDate: '2026-06-02',
          reasonSummary: 'Waiting for maturity before measured evidence is available for this horizon.',
        }),
      });
    });
    await page.route('**/api/v1/signals/calibration/health**', async (route) => {
      await route.fulfill({ json: { status: 'OK' } });
    });

    await visitAuthenticated(page, '/');

    await expect(page.getByText('IN / STOCK', { exact: true })).toBeVisible();
    await expect(page.getByText(/^Dashboard refetched:/)).toBeVisible();
    await expect(page.getByText(/^Latest source timestamp:/)).toHaveCount(0);
    await expect(page.getByText(/^Latest loaded:/)).toHaveCount(0);
    await expect(page.getByText('Breadth: Unavailable')).toBeVisible();
    await expect(page.getByText('Breadth: PARTIAL')).toHaveCount(0);
    await expect(page.getByText('Market context is region-level for this scope; asset-type specific context is still limited.')).toBeVisible();
    await expect(page.getByText('Waiting', { exact: true })).toBeVisible();
    await expect(page.getByText(/^Waiting for maturity for 20D/)).toBeVisible();
    await expect(page.getByText('Latest measurable evidence: Unavailable')).toBeVisible();
  });

  test('shows unavailable calibration status for successful missing signal quality evidence basis', async ({ page }) => {
    let calibrationHealthCalls = 0;
    await page.route('**/api/v1/today-review/latest**', async (route) => {
      await route.fulfill({ json: createTodayReviewPayload() });
    });
    await page.route('**/api/v1/research/overview**', async (route) => {
      await route.fulfill({ json: createResearchOverviewPayload() });
    });
    await page.route('**/api/v1/market-data/review-readiness-summary**', async (route) => {
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
            targetTradingDate: '2026-05-26',
            requiredDataThroughDate: '2026-05-26',
            storedDataThroughDate: '2026-05-26',
          },
          readinessCounts: {
            priceReady: 144,
            reviewReady: 120,
            missingLatestPrice: 4,
            staleLatestPrice: 2,
            inadequateHistory: 8,
            missingRecentVolume: 10,
          },
          nextAction: null,
          blockers: [],
        },
      });
    });
    await page.route('**/api/v1/market-context/summary**', async (route) => {
      await route.fulfill({
        json: {
          regime: { regime: 'NEUTRAL', score: 55, explanation: 'Mixed data', updatedAt: '2026-05-26T05:00:00.000Z', dataStatus: 'PARTIAL' },
          topSectors: [],
          weakSectors: [],
          breadth: {
            percentAboveSma50: 0.58,
            percentAboveSma200: 0.52,
            advanceDeclineRatio: 1.1,
            newHigh52WeekCount: 44,
            newLow52WeekCount: 18,
            bullishSignalCount: 90,
            bearishSignalCount: 55,
            instrumentCount: 300,
            dataStatus: 'PARTIAL',
          },
          countryStrength: [],
          macro: null,
          explanation: ['Partial evidence'],
          updatedAt: '2026-05-26T05:00:00.000Z',
          dataStatus: 'PARTIAL',
        },
      });
    });
    await page.route('**/api/v1/data-quality/summary**', async (route) => {
      await route.fulfill({
        json: {
          totalInstruments: 2910,
          goodCoverageCount: 1400,
          partialCoverageCount: 700,
          poorCoverageCount: 500,
          unusableCoverageCount: 310,
          signalReadyCount: 1300,
          notSignalReadyCount: 1610,
          stalePriceCount: 22,
          missingFundamentalsCount: 30,
          missingSectorCount: 20,
          missingIndustryCount: 20,
          missingCountryCount: 0,
          lowLiquidityCount: 25,
          missingVolumeCount: 15,
          latestEvaluationAt: '2026-05-26T04:40:00.000Z',
          dataStatus: 'PARTIAL',
        },
      });
    });
    await page.route('**/api/v1/signals/runs/latest**', async (route) => {
      await route.fulfill({
        json: {
          id: 'signal-run-with-missing-evidence-basis',
          scope: { region: 'IN', assetType: 'STOCK' },
          requestedByUserId: 'user-1',
          status: 'COMPLETED',
          modelVersion: 'v1',
          rulesetVersion: 'v1',
          sourceDataDate: '2026-05-26',
          generatedDate: '2026-05-26',
          batchSize: 25,
          offset: 0,
          totalCount: 300,
          processedCount: 300,
          generatedCount: 220,
          updatedCount: 40,
          noOpCount: 40,
          duplicateOrIdempotentCount: 0,
          skippedCount: 0,
          failedCount: 0,
          excludedByDataQuality: 20,
          missingQualityEvaluationCount: 0,
          durationMs: 12000,
          startedAt: '2026-05-26T05:00:00.000Z',
          completedAt: '2026-05-26T05:12:00.000Z',
          warnings: [],
        },
      });
    });
    await page.route('**/api/v1/pipeline/status**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
          generatedAt: '2026-05-26T05:03:00.000Z',
          activeRun: null,
          lastRun: {
            id: 'last-run',
            status: 'COMPLETED',
            triggerType: 'SCHEDULED',
            dataThroughDate: '2026-05-26',
            changedInstrumentCount: 10,
            totalCount: 2910,
            processedCount: 2910,
            succeededCount: 2910,
            partialCount: 0,
            failedCount: 0,
            skippedCount: 0,
            unchangedCount: 0,
            sourceFingerprint: null,
            startedAt: '2026-05-26T03:00:00.000Z',
            completedAt: '2026-05-26T03:10:00.000Z',
            durationMs: 600000,
            warnings: [],
            errors: [],
            updatedAt: '2026-05-26T03:10:00.000Z',
          },
          stages: [],
        },
      });
    });
    await page.route('**/api/v1/signals/calibration/model', async (route) => {
      await route.fulfill({
        json: {
          calibrationModelVersion: 'cal-v1',
          qualityMetricWindow: '20D',
          supportedHorizons: ['10D', '20D', '40D'],
          defaultHorizon: '20D',
          minSampleSize: 50,
          perAdjustmentDeltaCap: 0.15,
          totalDeltaCap: 0.3,
          rules: ['Use scoped evidence basis only.'],
        },
      });
    });
    await page.route('**/api/v1/signals/calibration/top**', async (route) => {
      await route.fulfill({
        json: createCalibrationTopPayload({
          horizon: '20D',
          readinessStatus: 'USABLE',
          evidenceBasisStatus: 'MISSING_SIGNAL_QUALITY_EVIDENCE',
          signalQualityGeneratedAt: null,
          latestMeasurablePriceDate: null,
          nextEvaluableDate: null,
          reasonSummary: 'Signal Quality evidence is missing for this scope and horizon. Generate Signal Quality before calibration evidence can be measured.',
        }),
      });
    });
    await page.route('**/api/v1/signals/calibration/health**', async (route) => {
      calibrationHealthCalls += 1;
      await route.fulfill({ json: { status: 'OK' } });
    });

    await visitAuthenticated(page, '/');

    await expect(page.getByText('IN / STOCK', { exact: true })).toBeVisible();
    await expect(page.getByText('Scope: IN / STOCK')).toBeVisible();
    await expect(page.getByText('Horizon: 20D')).toBeVisible();
    await expect(page.getByText('Unavailable', { exact: true })).toBeVisible();
    await expect(page.getByText('Latest measurable evidence: Unavailable')).toBeVisible();
    await expect(page.getByText('Signal Quality evidence is missing for this scope and horizon. Generate Signal Quality before calibration evidence can be measured.')).toBeVisible();
    await expect(page.getByText(/^Calibration evidence summary is unavailable for this scope and horizon:/)).toHaveCount(0);
    expect(calibrationHealthCalls).toBe(0);
  });

  test('shows explicit unavailable states and section-local research failures without synthetic fallback values', async ({ page }) => {
    let calibrationHealthCalls = 0;
    await page.route('**/api/v1/today-review/latest**', async (route) => {
      await route.fulfill({
        json: {
          run: null,
          groups: {
            longReview: [],
            shortReview: [],
            exitRiskReview: [],
            watchOnly: [],
            blocked: [],
            avoid: [],
            insufficientData: [],
            unproven: [],
          },
          scope: { region: 'IN', assetType: 'STOCK' },
        },
      });
    });
    await page.route('**/api/v1/research/overview**', async (route) => {
      await route.fulfill({ status: 500, json: { error: 'Research overview source failed for this scope.' } });
    });
    await page.route('**/api/v1/market-data/review-readiness-summary**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          reviewMode: 'NO_REVIEW',
          trustStatus: 'NOT_TRUSTWORTHY',
          userDecision: 'BLOCK',
          reviewUniverse: null,
          readinessCounts: null,
          nextAction: null,
          blockers: [],
        },
      });
    });
    await page.route('**/api/v1/market-context/summary**', async (route) => {
      await route.fulfill({
        json: {
          regime: null,
          topSectors: [],
          weakSectors: [],
          breadth: null,
          countryStrength: [],
          macro: null,
          explanation: [],
          updatedAt: '2026-05-26T06:00:00.000Z',
          dataStatus: 'PARTIAL',
        },
      });
    });
    await page.route('**/api/v1/data-quality/summary**', async (route) => {
      await route.fulfill({ status: 500, json: { error: 'Data Quality summary unavailable for this scope.' } });
    });
    await page.route('**/api/v1/signals/runs/latest**', async (route) => {
      await route.fulfill({ json: null });
    });
    await page.route('**/api/v1/pipeline/status**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
          generatedAt: null,
          activeRun: null,
          lastRun: null,
          stages: [],
        },
      });
    });
    await page.route('**/api/v1/signals/calibration/model', async (route) => {
      await route.fulfill({
        json: {
          calibrationModelVersion: 'cal-v1',
          qualityMetricWindow: '20D',
          supportedHorizons: ['10D', '20D', '40D'],
          defaultHorizon: '20D',
          minSampleSize: 50,
          perAdjustmentDeltaCap: 0.15,
          totalDeltaCap: 0.3,
          rules: ['Use scoped evidence basis only.'],
        },
      });
    });
    await page.route('**/api/v1/signals/calibration/top**', async (route) => {
      await route.fulfill({ status: 500, json: { error: 'Calibration summary read failed for this scope.' } });
    });
    await page.route('**/api/v1/signals/calibration/health**', async (route) => {
      calibrationHealthCalls += 1;
      await route.fulfill({ json: { status: 'OK' } });
    });

    await visitAuthenticated(page, '/');

    await expect(page.getByText('Today Review run: Unavailable')).toBeVisible();
    await expect(page.getByText('Trusted universe: Unavailable')).toBeVisible();
    await expect(page.getByText(/^Research overview is unavailable for supporting market context:/)).toBeVisible();
    await expect(page.getByText('Market gate: Unavailable')).toBeVisible();
    await expect(page.getByText('Data quality: Unavailable')).toBeVisible();
    await expect(page.getByText('Signal run: Unavailable')).toBeVisible();
    await expect(page.getByText('Pipeline: Unavailable')).toBeVisible();
    await expect(page.getByText('Calibration evidence summary is unavailable for this scope and horizon')).toBeVisible();
    await expect(page.getByText('Latest measurable evidence: Unavailable')).toBeVisible();

    await page.getByRole('button', { name: /Bearish review/ }).click();
    await expect(page.getByText(/No bearish review rows are currently published/)).toBeVisible();
    expect(calibrationHealthCalls).toBe(0);

    const body = await page.locator('body').innerText();
    expect(body).not.toContain('No run');
    expect(body).not.toContain('Data quality: 0');
    expect(body).not.toContain('Signal run: 0');
  });

  test('keeps first viewport usable when a deferred section fails and honors scope from storage', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('market_scope', JSON.stringify({ region: 'US', assetType: 'ETF' }));
    });

    await page.route('**/api/v1/today-review/latest**', async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('US');
      expect(url.searchParams.get('assetType')).toBe('ETF');
      const payload = createTodayReviewPayload();
      payload.run.region = 'US';
      payload.run.assetType = 'ETF';
      payload.scope = { region: 'US', assetType: 'ETF' };
      await route.fulfill({ json: payload });
    });
    await page.route('**/api/v1/research/overview**', async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('US');
      expect(url.searchParams.get('assetType')).toBe('ETF');
      await route.fulfill({ json: createResearchOverviewPayload() });
    });
    await page.route('**/api/v1/market-data/review-readiness-summary**', async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('US');
      expect(url.searchParams.get('assetType')).toBe('ETF');
      await route.fulfill({
        json: {
          scope: { region: 'US', assetType: 'ETF' },
          reviewMode: 'LIMITED_REVIEW',
          trustStatus: 'PARTIAL',
          userDecision: 'PROCEED_LIMITED',
          reviewUniverse: {
            catalogCount: 1000,
            providerSupportedCount: 500,
            trustedCount: 250,
            targetTradingDate: '2026-05-26',
            requiredDataThroughDate: '2026-05-26',
            storedDataThroughDate: '2026-05-26',
          },
          readinessCounts: {
            priceReady: 250,
            reviewReady: 220,
            missingLatestPrice: 0,
            staleLatestPrice: 0,
            inadequateHistory: 10,
            missingRecentVolume: 20,
          },
          nextAction: { code: 'REVIEW_REPAIR_PLAN', label: 'Review bounded repair plan', boundedRequest: { batchSize: 25, region: 'US', assetType: 'ETF' } },
          blockers: [],
        },
      });
    });
    await page.route('**/api/v1/market-context/summary**', async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('US');
      await route.fulfill({ status: 500, json: { error: 'Market context summary unavailable for this scope right now.' } });
    });
    await page.route('**/api/v1/data-quality/summary**', async (route) => {
      await route.fulfill({
        json: {
          totalInstruments: 1000,
          goodCoverageCount: 600,
          partialCoverageCount: 250,
          poorCoverageCount: 100,
          unusableCoverageCount: 50,
          signalReadyCount: 580,
          notSignalReadyCount: 420,
          stalePriceCount: 5,
          missingFundamentalsCount: 8,
          missingSectorCount: 4,
          missingIndustryCount: 4,
          missingCountryCount: 0,
          lowLiquidityCount: 10,
          missingVolumeCount: 8,
          latestEvaluationAt: '2026-05-26T04:50:00.000Z',
          dataStatus: 'PARTIAL',
        },
      });
    });
    await page.route('**/api/v1/signals/runs/latest**', async (route) => {
      await route.fulfill({ json: null });
    });
    await page.route('**/api/v1/pipeline/status**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'US', assetType: 'ETF', timeframe: '1d', pipelineKey: 'market-intelligence' },
          generatedAt: '2026-05-26T05:03:00.000Z',
          activeRun: null,
          lastRun: { id: 'last-run', status: 'COMPLETED', triggerType: 'SCHEDULED', dataThroughDate: '2026-05-26', changedInstrumentCount: 10, totalCount: 1000, processedCount: 1000, succeededCount: 1000, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0, sourceFingerprint: null, startedAt: '2026-05-26T03:00:00.000Z', completedAt: '2026-05-26T03:10:00.000Z', durationMs: 600000, warnings: [], errors: [], updatedAt: '2026-05-26T03:10:00.000Z' },
          stages: [],
        },
      });
    });
    await page.route('**/api/v1/signals/calibration/model', async (route) => {
      await route.fulfill({
        json: {
          calibrationModelVersion: 'cal-v1',
          qualityMetricWindow: '20D',
          supportedHorizons: ['10D', '20D', '40D'],
          defaultHorizon: '20D',
          minSampleSize: 50,
          perAdjustmentDeltaCap: 0.15,
          totalDeltaCap: 0.3,
          rules: ['Use scoped evidence basis only.'],
        },
      });
    });
    await page.route('**/api/v1/signals/calibration/top**', async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('US');
      expect(url.searchParams.get('assetType')).toBe('ETF');
      expect(url.searchParams.get('horizon')).toBe('20D');
      await route.fulfill({ json: createCalibrationTopPayload({ horizon: '20D' }) });
    });
    await page.route('**/api/v1/signals/calibration/health**', async (route) => {
      await route.fulfill({ json: { status: 'OK' } });
    });

    await visitAuthenticated(page, '/');

    await expect(page.locator('h4', { hasText: 'Daily Overview' })).toBeVisible();
    await expect(page.getByText('US / ETF', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Market Pulse' })).toBeVisible();
    await expect(page.getByText('Market context summary unavailable for this scope right now.')).toBeVisible();
    await expect(page.getByText('Market context is region-level for this scope; asset-type specific context is still limited.')).toBeVisible();
    await expect(page.getByText('Scope: US / ETF')).toBeVisible();
    await expect(page.getByText('Horizon: 20D')).toBeVisible();
    await expect(page.getByText('Coming soon - Market Movers')).toBeVisible();
    await expect(page.getByText('Coming soon - FII/DII Activity')).toBeVisible();
  });
});
