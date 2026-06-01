import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { visitAuthenticated } from './support/auth';

async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-today-review-token');
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        id: 'playwright-today-review-user',
        email: 'codex.test@example.com',
        name: 'Codex Test',
        createdAt: '2026-05-14T00:00:00.000Z',
        updatedAt: '2026-05-14T00:00:00.000Z',
        lastLoginAt: '2026-05-14T00:00:00.000Z',
      },
    });
  });
  await page.route('**/api/v1/auth/logout', async (route) => {
    await route.fulfill({ json: { success: true } });
  });
}

const candidate = {
  id: 'candidate-1',
  runId: 'run-1',
  instrumentId: 'stock-1',
  symbol: 'ALPHA.NS',
  companyName: 'Alpha Ltd',
  direction: 'LONG',
  state: 'LONG_REVIEW',
  setupType: 'BREAKOUT',
  strategyCode: 'TREND_MOMENTUM',
  strategyVersion: '1.0.0',
  rank: 1,
  grade: 'A',
  confidenceScore: 88,
  reasonSummary: 'Long review candidate with Strategy Framework proof, acceptable data quality, market alignment, and valid trade-plan geometry.',
  blockers: [],
  watchReasons: [],
  dataQualitySnapshot: {
    instrumentId: 'stock-1',
    symbol: 'ALPHA.NS',
    companyName: 'Alpha Ltd',
    sector: 'Financial Services',
    coverageStatus: 'GOOD',
    signalReadinessStatus: 'READY',
    liquidityStatus: 'LIQUID',
    coverageScore: 92,
    signalReadinessScore: 88,
    liquidityScore: 84,
    useCaseTiers: {
      dailyReview: { status: 'READY', reasons: ['TRUSTED_BASELINE_READY'] },
      signal: { status: 'READY', reasons: ['SIGNAL_HISTORY_AVAILABLE'] },
      backtest: { status: 'LIMITED', reasons: ['REQUIRED_HISTORY_PARTIAL'] },
      calibration: { status: 'LIMITED', reasons: ['CALIBRATION_WINDOW_THIN'] },
      automation: { status: 'BLOCKED', reasons: ['PHASE0_AUTOMATION_NOT_AUTHORIZED'] },
    },
    tierEvidence: {
      trustedBaselineResidualState: 'TRUSTED_READY',
      requiredHistoryStatus: 'PARTIAL',
      listingDateStatus: 'LISTED_LONG_ENOUGH',
      trustedBaselineBlockerCodes: ['NONE'],
      hasSignalHistory: true,
    },
    lastEvaluatedAt: '2026-05-10T16:00:00.000Z',
  },
  marketContextSnapshot: {
    regime: { regime: 'RISK_ON', score: 80 },
    breadth: { percentAboveSma50: 0.7, percentAboveSma200: 0.62 },
    dataStatus: 'COMPLETE',
  },
  strategyProofSnapshot: {
    strategyCode: 'TREND_MOMENTUM',
    strategyVersion: '1.0.0',
    frameworkBacked: true,
    strategyRating: { ratingGrade: 'GOOD', ratingScore: 82 },
    readinessLabel: 'PAPER_TEST_CANDIDATE',
    decision: 'TRADE_CANDIDATE',
    action: 'CONSIDER_ENTRY',
    confidence: 'HIGH',
    decisionScore: 84,
  },
  tradePlanSnapshot: {
    id: 'plan-1',
    instrumentId: 'stock-1',
    symbol: 'ALPHA.NS',
    strategy: 'TREND_MOMENTUM',
    strategyVersion: '1.0.0',
    strategyRating: 'GOOD',
    readinessLabel: 'PAPER_TEST_CANDIDATE',
    planStatus: 'VALID',
    riskGrade: 'LOW',
    entryZone: { type: 'BREAKOUT', referencePrice: 100, preferredEntryMin: 99, preferredEntryMax: 101, quality: 'STRONG', rationale: 'Breakout review zone.' },
    stopLoss: { price: 95, percentBelowEntry: 5, method: 'RECENT_SWING_LOW', quality: 'STRONG', rationale: 'Below review floor.' },
    target: { price: 112, expectedReturnPercent: 12, method: 'REWARD_RISK_MULTIPLE', quality: 'ACCEPTABLE', rationale: 'Modeled reward range.' },
    rewardRiskRatio: 2.4,
    invalidationRules: ['Daily close below stop level.'],
    warnings: [],
    blockers: [],
    dataGaps: [],
    paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
    paperReadinessReasons: [],
    paperReadinessBlockers: [],
    marketDataSnapshot: { latestStoredTradingDate: '2026-05-10T00:00:00.000Z', latestPriceTimestamp: '2026-05-10T00:00:00.000Z', currency: 'INR' },
    generatedAt: '2026-05-11T06:30:00.000Z',
    modelVersion: 'trade-plan-risk-v1',
  },
  sourceSignalSnapshot: {
    rawSignal: { direction: 'BULLISH', score: 77, confidence: 'HIGH', supportOnly: true },
    calibration: { calibratedDirection: 'BULLISH', calibratedScore: 80, calibratedConfidence: 'HIGH', supportOnly: true },
    smartMoney: { status: 'ACCUMULATION', score: 70, confidence: 'MEDIUM', supportOnly: true },
  },
  explainability: {
    candidateId: 'candidate-1',
    state: 'LONG_REVIEW',
    rankingComponents: {
      strategyProof: 22,
      tradePlan: 19.6,
      marketRegime: 15,
      sectorAlignment: 10,
      signalCalibration: 10,
      dataQuality: 15,
      smartMoney: 5,
      hardBlockerOverride: false,
    },
    promotionReasons: [
      { category: 'READINESS', code: 'TRUSTED_REVIEW_READY', label: 'Trusted review data is available for this candidate.', severity: 'INFO', sourceModule: 'Market Data Foundation', evidenceDate: '2026-05-10T16:00:00.000Z' },
      { category: 'STRATEGY_PROOF', code: 'STRATEGY_PROOF_USABLE', label: 'Strategy proof is usable for research review.', severity: 'INFO', sourceModule: 'Strategy Framework', evidenceDate: '2026-05-11T06:30:00.000Z' },
      { category: 'TRADE_PLAN_PROOF_CHAIN', code: 'TRADE_PLAN_REVIEW_READY', label: 'Trade-plan proof-chain snapshot supports paper-review research.', severity: 'INFO', sourceModule: 'Trade Plan Risk Engine', evidenceDate: '2026-05-11T06:30:00.000Z' },
    ],
    watchReasons: [],
    blockers: [],
    upstreamEvidence: {
      readiness: { coverageStatus: 'GOOD', signalReadinessStatus: 'READY' },
      signalEvidence: { direction: 'BULLISH', supportOnly: true },
      calibrationReadiness: { calibratedDirection: 'BULLISH', supportOnly: true },
      strategyProof: { frameworkBacked: true, strategyRating: { ratingGrade: 'GOOD' } },
      tradePlanProofChain: { planStatus: 'VALID', paperReadinessStatus: 'READY_FOR_PAPER_REVIEW' },
    },
  },
  createdAt: '2026-05-11T06:30:00.000Z',
  updatedAt: '2026-05-11T06:30:00.000Z',
};

const blockedCandidate = {
  ...candidate,
  id: 'candidate-2',
  instrumentId: 'stock-2',
  symbol: 'BLOCKED.NS',
  companyName: 'Blocked Ltd',
  direction: 'BLOCKED',
  state: 'BLOCKED',
  rank: 2,
  grade: 'D',
  confidenceScore: 0,
  reasonSummary: 'Blocked: Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.',
  blockers: ['Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.'],
  explainability: {
    ...candidate.explainability,
    candidateId: 'candidate-2',
    state: 'BLOCKED',
    rankingComponents: { ...candidate.explainability.rankingComponents, hardBlockerOverride: true },
    promotionReasons: [],
    blockers: [
      { category: 'TRADE_PLAN_PROOF_CHAIN', code: 'STOP_LOSS_BLOCKED', label: 'Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.', severity: 'BLOCKER', sourceModule: 'Trade Plan Risk Engine', evidenceDate: '2026-05-11T06:30:00.000Z' },
    ],
  },
  tradePlanSnapshot: {
    ...candidate.tradePlanSnapshot,
    id: 'plan-2',
    instrumentId: 'stock-2',
    symbol: 'BLOCKED.NS',
    planStatus: 'BLOCKED',
    riskGrade: 'HIGH',
    entryZone: { type: 'PULLBACK', referencePrice: 304.51, preferredEntryMin: 298.42, preferredEntryMax: 310.6, quality: 'STRONG', rationale: 'Pullback review zone.' },
    stopLoss: { price: 307.49, percentBelowEntry: 0.81, method: 'RECENT_SWING_LOW', quality: 'WEAK', rationale: 'Geometry blocked.' },
    blockers: ['Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.'],
    paperReadinessStatus: 'BLOCKED',
    paperReadinessReasons: [],
    paperReadinessBlockers: ['Trade-plan snapshot has hard blockers.'],
  },
  dataQualitySnapshot: {
    ...candidate.dataQualitySnapshot,
    instrumentId: 'stock-2',
    symbol: 'BLOCKED.NS',
    companyName: 'Blocked Ltd',
    useCaseTiers: {
      dailyReview: { status: 'BLOCKED', reasons: ['DAILY_REVIEW_BLOCKED_BY_HISTORY'] },
      signal: { status: 'LIMITED', reasons: ['SIGNAL_HISTORY_PARTIAL'] },
      backtest: { status: 'BLOCKED', reasons: ['BACKTEST_BLOCKED_REQUIRED_HISTORY'] },
      calibration: { status: 'BLOCKED', reasons: ['CALIBRATION_BLOCKED_REQUIRED_HISTORY'] },
      automation: { status: 'BLOCKED', reasons: ['PHASE0_AUTOMATION_NOT_AUTHORIZED'] },
    },
    tierEvidence: {
      trustedBaselineResidualState: 'LIMITED_HISTORY',
      requiredHistoryStatus: 'INSUFFICIENT',
      listingDateStatus: 'LISTED_RECENTLY',
      trustedBaselineBlockerCodes: ['INSUFFICIENT_HISTORY'],
      hasSignalHistory: false,
    },
  },
};

const unprovenCandidate = {
  ...candidate,
  id: 'candidate-3',
  instrumentId: 'stock-3',
  symbol: 'UNPROVEN.NS',
  companyName: 'Unproven Ltd',
  direction: 'WATCH',
  state: 'UNPROVEN',
  rank: 3,
  grade: 'UNPROVEN',
  confidenceScore: 35,
  reasonSummary: 'Unproven: Strategy Framework proof is missing or weak.',
  blockers: [],
  watchReasons: ['Strategy Framework proof is missing or weak.'],
  explainability: {
    ...candidate.explainability,
    candidateId: 'candidate-3',
    state: 'UNPROVEN',
    promotionReasons: [],
    watchReasons: [
      { category: 'STRATEGY_PROOF', code: 'STRATEGY_FRAMEWORK_PROOF_MISSING_OR_WEAK', label: 'Strategy Framework proof is missing or weak.', severity: 'WATCH', sourceModule: 'Strategy Framework', evidenceDate: '2026-05-11T06:30:00.000Z' },
    ],
  },
  strategyProofSnapshot: {
    ...candidate.strategyProofSnapshot,
    frameworkBacked: false,
    strategyRating: { ratingGrade: 'UNPROVEN', ratingScore: 0 },
  },
  dataQualitySnapshot: {
    ...candidate.dataQualitySnapshot,
    instrumentId: 'stock-3',
    symbol: 'UNPROVEN.NS',
    companyName: 'Unproven Ltd',
    useCaseTiers: undefined,
    tierEvidence: undefined,
  },
};

const completedResponse = {
  run: {
    id: 'run-1',
    runDate: '2026-05-11T00:00:00.000Z',
    region: 'IN',
    assetType: 'STOCK',
    status: 'COMPLETED',
    trustStatus: 'OK',
    dataThroughDate: '2026-05-10T00:00:00.000Z',
    startedAt: '2026-05-11T06:30:00.000Z',
    finishedAt: '2026-05-11T06:31:00.000Z',
    warnings: [],
    candidateCounts: { LONG_REVIEW: 1, BLOCKED: 1, UNPROVEN: 1 },
    sourceSnapshot: {
      rawSignalUniverse: { supportOnly: true, sampleCount: 25 },
      reviewReadiness: {
        scope: { region: 'IN', assetType: 'STOCK' },
        generatedAt: '2026-05-11T06:30:00.000Z',
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
          contextReady: 0,
          reviewReady: 0,
          missingLatestPrice: 0,
          staleLatestPrice: 0,
          inadequateHistory: 0,
          missingRecentVolume: 0,
          providerUnknown: 2325,
          providerValidationFailedRetryable: 7,
          unsupportedExcluded: 0,
        },
        blockers: [],
        nextAction: { code: 'REVIEW_REPAIR_PLAN', label: 'Review bounded repair plan', boundedRequest: { batchSize: 50, region: 'IN', assetType: 'STOCK' } },
        warnings: [],
      },
      reviewUniverse: {
        mode: 'LIMITED_REVIEW',
        trustedCount: 144,
        catalogCount: 2910,
        targetTradingDate: '2026-05-12',
        requiredDataThroughDate: '2026-05-11',
        storedDataThroughDate: '2026-05-11',
        dataThroughDate: '2026-05-10',
        scanPolicy: {
          scanLimit: 144,
          scanComplete: true,
          scanOrdering: 'recentVolumeDesc_priceHistoryCompleteness_latestFreshness_symbol',
        },
        warnings: ['Missing metadata is shown as context gap, not a hard blocker for price-action review.'],
      },
      scanFunnel: {
        trustedUniverseCount: 144,
        trustedInstrumentsScanned: 144,
        trustedInstrumentsSkipped: 0,
        scanLimit: 144,
        scanComplete: true,
        scanOrdering: 'recentVolumeDesc_priceHistoryCompleteness_latestFreshness_symbol',
        trustedLoadStatus: 'COMPLETE',
        membershipLoadFailureReason: null,
        strategyCandidatesSeen: 18,
        strategyCandidatesEligible: 12,
        strategyCandidatesExcluded: 6,
        outsideTrustedUniverse: 6,
        setupsDetected: 12,
        promotedCandidates: 1,
        watchOnly: 4,
        unproven: 1,
        blocked: 1,
        noSetup: 132,
        topNoPromotionReasons: { 'historical evidence unproven': 1 },
      },
    },
    reviewUniverseMode: 'LIMITED_REVIEW',
    trustedUniverseCount: 144,
    catalogCount: 2910,
    coverageWarnings: ['Missing metadata is shown as context gap, not a hard blocker for price-action review.'],
    scanFunnel: {
      trustedUniverseCount: 144,
      trustedInstrumentsScanned: 144,
      trustedInstrumentsSkipped: 0,
      scanLimit: 144,
      scanComplete: true,
      scanOrdering: 'recentVolumeDesc_priceHistoryCompleteness_latestFreshness_symbol',
      trustedLoadStatus: 'COMPLETE',
      membershipLoadFailureReason: null,
      strategyCandidatesSeen: 18,
      strategyCandidatesEligible: 12,
      strategyCandidatesExcluded: 6,
      outsideTrustedUniverse: 6,
      setupsDetected: 12,
      promotedCandidates: 1,
      watchOnly: 4,
      unproven: 1,
      blocked: 1,
      noSetup: 132,
      topNoPromotionReasons: { 'historical evidence unproven': 1 },
    },
    explainability: {
      runId: 'run-1',
      scope: { region: 'IN', assetType: 'STOCK' },
      reviewMode: 'LIMITED_REVIEW',
      trustedUniverseCount: 144,
      scannedCount: 144,
      promotedCount: 1,
      watchCount: 0,
      blockedCount: 1,
      unprovenCount: 1,
      insufficientDataCount: 0,
      excludedCount: 139,
      exclusionSummaries: [
        { category: 'NO_SETUP', code: 'NO_PRICE_ACTION_SETUP', label: 'Trusted instruments had no Today Review setup.', count: 132, blocking: false, sourceModule: 'Today Review' },
        { category: 'OUTSIDE_SCOPE', code: 'OUTSIDE_TRUSTED_UNIVERSE', label: 'Strategy candidates were outside the trusted review universe.', count: 6, blocking: true, sourceModule: 'Market Data Foundation' },
        { category: 'STRATEGY_PROOF', code: 'UNPROVEN_EVIDENCE', label: 'Strategy or lite historical evidence is unproven.', count: 1, blocking: false, sourceModule: 'Strategy Framework' },
      ],
      inspectableExcludedExamples: [
        {
          instrumentId: 'stock-x',
          symbol: 'OUTSIDE.NS',
          companyName: 'Outside Ltd',
          primaryReasonCode: 'OUTSIDE_TRUSTED_UNIVERSE',
          primaryReasonLabel: 'Strategy Decision candidate is outside the trusted review universe.',
          reasonCategories: ['OUTSIDE_SCOPE'],
          promoted: false,
        },
      ],
    },
    createdAt: '2026-05-11T06:30:00.000Z',
    updatedAt: '2026-05-11T06:31:00.000Z',
    candidates: [candidate, blockedCandidate, unprovenCandidate],
  },
  groups: {
    longReview: [candidate],
    shortReview: [],
    exitRiskReview: [],
    watchOnly: [],
    blocked: [blockedCandidate],
    avoid: [],
    insufficientData: [],
    unproven: [unprovenCandidate],
  },
  scope: { region: 'IN', assetType: 'STOCK' },
};

test.describe('Today Trade Review UI', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test('deep link settles, missing snapshot explains admin ownership, and completed run shows grouped shortlist', async ({ page }) => {
    let showCompletedSnapshot = false;
    const postRequests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (request.method() === 'POST' && url.pathname.includes('/api/v1/today-review')) {
        postRequests.push(url.pathname);
      }
    });
    await page.route('**/api/v1/today-review/latest**', async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get('region')).toBe('IN');
      expect(url.searchParams.get('assetType')).toBe('STOCK');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(!showCompletedSnapshot ? {
          run: null,
          groups: { longReview: [], shortReview: [], exitRiskReview: [], watchOnly: [], blocked: [], avoid: [], insufficientData: [], unproven: [] },
          scope: { region: 'IN', assetType: 'STOCK' },
        } : completedResponse),
      });
    });

    await visitAuthenticated(page, '/today-review');

    await expect(page.getByRole('main').getByRole('heading', { name: 'Daily Review' })).toBeVisible();
    await expect(page.getByText('No Daily Review snapshot has been published for IN / STOCK.')).toBeVisible();
    await expect(page.getByText('Data-production workflows are handled in Admin / Data Ops.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Run review|Run Today's Review/i })).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);

    showCompletedSnapshot = true;
    await page.getByRole('button', { name: 'Reload snapshot' }).click();

    await expect(page.getByText('Scope: IN / STOCK')).toBeVisible();
    await expect(page.getByText('Long review candidates', { exact: true })).toBeVisible();
    await expect(page.getByText('Signals and calibration are supporting evidence only.').first()).toBeVisible();
    await expect(page.getByText('Review mode: LIMITED_REVIEW').first()).toBeVisible();
    await expect(page.getByText('Readiness decision: PROCEED_LIMITED')).toBeVisible();
    await expect(page.getByText('Market Data summary mode: LIMITED_REVIEW')).toBeVisible();
    await expect(page.getByText('Next bounded action: Review bounded repair plan')).toBeVisible();
    await expect(page.getByText('Data Quality tiers are read-only context from Data Quality Engine and never change Today Review ranking or promotion in this view.')).toBeVisible();
    await expect(page.getByText('Target session: 2026-05-12').first()).toBeVisible();
    await expect(page.getByText('Required data-through: 2026-05-11').first()).toBeVisible();
    await expect(page.getByText('Stored data-through: 2026-05-11').first()).toBeVisible();
    await expect(page.getByText('Limited review mode: candidates are generated only from stocks with current price, sufficient OHLCV history, and recent volume. Missing sector/market-cap data is shown as context gaps.')).toBeVisible();
    await expect(page.getByText('Scanned: 144')).toBeVisible();
    await expect(page.getByText('Scan complete: yes')).toBeVisible();
    await expect(page.getByText('Membership load: COMPLETE')).toBeVisible();
    await expect(page.getByText('Trusted universe membership unavailable')).toHaveCount(0);
    await expect(page.getByText('Strategy outside trusted universe: 6')).toBeVisible();
    await expect(page.getByText('Exclusion reasons')).toBeVisible();
    await expect(page.getByText('Excluded 139')).toBeVisible();
    await expect(page.getByText('OUTSIDE_SCOPE: 6 - Strategy candidates were outside the trusted review universe.')).toBeVisible();
    await expect(page.getByText('OUTSIDE.NS')).toBeVisible();
    await expect(page.getByText('Not promoted')).toBeVisible();
    await expect(page.getByRole('link', { name: 'ALPHA.NS' })).toBeVisible();
    await expect(page.getByText('Daily: READY').first()).toBeVisible();
    await expect(page.getByText('Automation: BLOCKED').first()).toBeVisible();
    await expect(page.getByTitle('Automation: BLOCKED - PHASE0_AUTOMATION_NOT_AUTHORIZED').first()).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Long Review (1)' })).toBeVisible();
    await page.getByRole('tab', { name: /Watch Only/ }).click();
    await expect(page.getByText('UNPROVEN.NS')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Unproven', exact: true })).toBeVisible();
    await expect(page.getByText('Daily: Missing').first()).toBeVisible();
    await expect(page.getByTitle('28 (from 35) - Conservative display-only downgrade: missing DQ tier context').first()).toBeVisible();
    await expect(page.getByText('Data Quality use-case tier context is missing; confidence view is conservatively downgraded.').first()).toBeVisible();
    await page.getByRole('tab', { name: /Blocked/ }).click();
    await expect(page.getByText('BLOCKED.NS')).toBeVisible();
    await expect(page.getByText('Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.').first()).toBeVisible();
    await expect(page.getByText('Daily: BLOCKED').first()).toBeVisible();
    await expect(page.getByTitle('Daily: BLOCKED - DAILY_REVIEW_BLOCKED_BY_HISTORY').first()).toBeVisible();

    await page.reload();
    await expect(page.getByRole('main').getByRole('heading', { name: 'Daily Review' })).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'ALPHA.NS' })).toBeVisible();
    await expect(page.getByText('Missing DQ tier context')).toBeVisible();

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/buy now|sell now|guaranteed|place order|execute order|live trade|financial advice|execution/i);
    expect(body).not.toContain('Raw signal count');
    expect(postRequests).toEqual([]);
  });

  test('candidate table supports filtering, sorting, pagination, and hover-only full cell text', async ({ page }, testInfo) => {
    const longRows = [
      { symbol: 'ZETA.NS', companyName: 'Zeta Industries', rank: 1, grade: 'B', confidenceScore: 78, dq: 'GOOD' },
      { symbol: 'OMEGA.NS', companyName: 'Omega Capital Services', rank: 2, grade: 'A', confidenceScore: 91, dq: 'READY' },
      { symbol: 'BETA.NS', companyName: 'Beta Manufacturing', rank: 3, grade: 'C', confidenceScore: 61, dq: 'LIMITED' },
      { symbol: 'DELTA.NS', companyName: 'Delta Energy', rank: 4, grade: 'B', confidenceScore: 72, dq: 'GOOD' },
      { symbol: 'KAPPA.NS', companyName: 'Kappa Retail', rank: 5, grade: 'A', confidenceScore: 86, dq: 'READY' },
      { symbol: 'ALPHA.NS', companyName: 'Alpha Ltd', rank: 6, grade: 'A', confidenceScore: 88, dq: 'GOOD' },
      { symbol: 'SIGMA.NS', companyName: 'Sigma Tools', rank: 7, grade: 'D', confidenceScore: 44, dq: 'WATCH' },
    ].map((row, index) => ({
      ...candidate,
      id: `candidate-table-${index + 1}`,
      instrumentId: `stock-table-${index + 1}`,
      symbol: row.symbol,
      companyName: row.companyName,
      rank: row.rank,
      grade: row.grade,
      confidenceScore: row.confidenceScore,
      reasonSummary: `${row.symbol} has a long clipped research-support reason that should stay on one table line and remain available from the cell hover title.`,
      dataQualitySnapshot: {
        ...candidate.dataQualitySnapshot,
        instrumentId: `stock-table-${index + 1}`,
        symbol: row.symbol,
        companyName: row.companyName,
        coverageStatus: row.dq,
      },
    }));
    const tableResponse = {
      ...completedResponse,
      run: {
        ...completedResponse.run,
        candidateCounts: { LONG_REVIEW: longRows.length },
        candidates: longRows,
      },
      groups: {
        ...completedResponse.groups,
        longReview: longRows,
        blocked: [],
        unproven: [],
      },
    };
    await page.route('**/api/v1/today-review/latest**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tableResponse) });
    });

    await visitAuthenticated(page, '/today-review');

    await expect(page.getByLabel('Search rows')).toBeVisible();
    await expect(page.getByText('Hover any clipped cell to read the full value.')).toBeVisible();
    await expect(page.getByTitle(/long clipped research-support reason/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('today-review-current-table');
    const csvPath = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(csvPath);
    const csv = await readFile(csvPath, 'utf8');
    const header = csv.split(/\r?\n/)[0].replace(/^\uFEFF/, '');
    expect(header).toBe('Rank,Symbol,Company,State,Setup,Entry Evidence,Confidence,Grade,Daily Tier,Data Through,Data Quality,Reason Summary,Blocker,Strategy Code');
    expect(header).not.toContain('Automation Reason');
    expect(header).not.toContain('Candidate URL');
    await expect(page.getByText('Exported 7 Today Review rows as an Excel-compatible CSV.')).toBeVisible();

    await page.getByLabel('Search rows').fill('OMEGA');
    await expect(page.getByText('Showing 1-1 of 1 filtered candidates.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'OMEGA.NS' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ZETA.NS' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Clear table filters' }).click();
    await expect(page.getByText('Showing 1-7 of 7 filtered candidates.')).toBeVisible();

    await page.getByLabel('Rows per page:').click();
    await page.getByRole('option', { name: '5', exact: true }).click();
    await expect(page.getByText('Showing 1-5 of 7 filtered candidates.')).toBeVisible();
    await page.getByRole('button', { name: 'Go to next page' }).click();
    await expect(page.getByText('Showing 6-7 of 7 filtered candidates.')).toBeVisible();

    await page.getByRole('button', { name: 'Symbol' }).click();
    await expect(page.getByRole('link', { name: 'ZETA.NS' })).toBeVisible();

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/R:R|reward\/risk|target \/ reward|buy now|sell now|guaranteed|financial advice/i);
  });

  test('candidate detail shows plan, invalidation, context, data quality, and proof panels', async ({ page }) => {
    await page.route('**/api/v1/today-review/candidates/candidate-1', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(candidate) });
    });

    await visitAuthenticated(page, '/today-review/candidates/candidate-1');

    await expect(page.getByRole('heading', { name: 'ALPHA.NS research support' })).toBeVisible();
    await expect(page.getByText('Preferred entry zone')).toBeVisible();
    await expect(page.getByText('INR 99.00 - INR 101.00').first()).toBeVisible();
    await expect(page.getByText('Stop / invalidation').first()).toBeVisible();
    await expect(page.getByText('INR 95.00; Daily close below stop level.').first()).toBeVisible();
    await expect(page.getByText('Target 1 / Target 2 or reward range')).toBeVisible();
    await expect(page.getByText('Reward/risk').first()).toBeVisible();
    await expect(page.getByText('Do nothing unless')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Strategy proof' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Market context' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Data quality' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Use-case tiers (read-only)' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Trade plan' })).toBeVisible();
    await expect(page.getByText('Daily review tier')).toBeVisible();
    await expect(page.getByText('READY (TRUSTED_BASELINE_READY)')).toBeVisible();
    await expect(page.getByText('Backtest tier')).toBeVisible();
    await expect(page.getByText('LIMITED (REQUIRED_HISTORY_PARTIAL)')).toBeVisible();
    await expect(page.getByText('Automation tier')).toBeVisible();
    await expect(page.getByText('BLOCKED (PHASE0_AUTOMATION_NOT_AUTHORIZED)')).toBeVisible();
    await expect(page.getByText('Automation is policy-blocked in Today Review and is never broker-authorized in this phase.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ranking components' })).toBeVisible();
    const rankingComponentsPanel = page.getByRole('heading', { name: 'Ranking components' }).locator('xpath=..');
    await expect(rankingComponentsPanel.getByText('Strategy proof', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reason categories' })).toBeVisible();
    await expect(page.getByText('READINESS / INFO')).toBeVisible();
    await expect(page.getByText('Source: Market Data Foundation')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Supporting evidence' })).toBeVisible();
    const supportingEvidencePanel = page.getByRole('heading', { name: 'Supporting evidence' }).locator('xpath=..');
    await expect(supportingEvidencePanel.getByText('Trade-plan proof-chain', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'Instrument Workspace' })).toHaveAttribute('href', '/stocks/stock-1');

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/buy now|sell now|guaranteed|place order|execute order|live trade|financial advice|execution/i);
  });

  test('candidate detail shows conservative fallback when use-case tiers are missing', async ({ page }) => {
    await page.route('**/api/v1/today-review/candidates/candidate-3', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(unprovenCandidate) });
    });

    await visitAuthenticated(page, '/today-review/candidates/candidate-3');

    await expect(page.getByRole('heading', { name: 'UNPROVEN.NS research support' })).toBeVisible();
    await expect(page.getByText('Confidence score (conservative view)')).toBeVisible();
    await expect(page.getByText('28 (from 35; conservative due to missing DQ tiers)')).toBeVisible();
    await expect(page.getByText('Data Quality use-case tier context is missing for this candidate snapshot.')).toBeVisible();
    await expect(page.getByText('MISSING (Missing from snapshot)').first()).toBeVisible();
    await expect(page.getByText('Automation tier')).toBeVisible();
    await expect(page.getByText('MISSING (Missing from snapshot; policy remains blocked.)')).toBeVisible();
    await expect(page.getByText('Automation is policy-blocked in Today Review and is never broker-authorized in this phase.')).toBeVisible();
  });

  test('NO_REVIEW explains trusted-universe gating and scan evidence', async ({ page }) => {
    await page.route('**/api/v1/today-review/latest**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          run: {
            ...completedResponse.run,
            id: 'run-no-review',
            status: 'PARTIAL',
            trustStatus: 'PARTIAL',
            warnings: ['Trusted Review Universe unavailable or not ready; Today Review cannot publish candidates.'],
            candidateCounts: {},
            sourceSnapshot: {
              ...completedResponse.run.sourceSnapshot,
              reviewReadiness: {
                ...completedResponse.run.sourceSnapshot.reviewReadiness,
                reviewMode: 'NO_REVIEW',
                trustStatus: 'NOT_TRUSTWORTHY',
                userDecision: 'REPAIR_DATA',
                reviewUniverse: {
                  catalogCount: 2910,
                  providerSupportedCount: 585,
                  trustedCount: 0,
                  targetTradingDate: '2026-05-12',
                  requiredDataThroughDate: '2026-05-11',
                  storedDataThroughDate: '2026-05-10',
                },
              },
              reviewUniverse: {
                mode: 'NO_REVIEW',
                trustedCount: 0,
                catalogCount: 2910,
                targetTradingDate: '2026-05-12',
                requiredDataThroughDate: '2026-05-11',
                storedDataThroughDate: '2026-05-10',
                dataThroughDate: '2026-05-10',
                warnings: ['Trusted Review Universe unavailable or not ready; Today Review cannot publish candidates.'],
              },
              scanFunnel: {
                trustedUniverseCount: 0,
                trustedInstrumentsScanned: 0,
                trustedInstrumentsSkipped: 0,
                scanLimit: 0,
                scanComplete: false,
                scanOrdering: 'recentVolumeDesc_priceHistoryCompleteness_latestFreshness_symbol',
                trustedLoadStatus: 'LOAD_FAILED',
                membershipLoadFailureReason: 'Trusted universe membership page failed at offset 250.',
                strategyCandidatesSeen: 8,
                strategyCandidatesEligible: 0,
                strategyCandidatesExcluded: 8,
                outsideTrustedUniverse: 8,
                setupsDetected: 0,
                promotedCandidates: 0,
                watchOnly: 0,
                unproven: 0,
                blocked: 0,
                noSetup: 0,
                topNoPromotionReasons: { NO_REVIEW_UNIVERSE: 0 },
              },
            },
            reviewUniverseMode: 'NO_REVIEW',
            trustedUniverseCount: 0,
            scanFunnel: {
              trustedUniverseCount: 0,
              trustedInstrumentsScanned: 0,
              trustedInstrumentsSkipped: 0,
              scanLimit: 0,
              scanComplete: false,
              scanOrdering: 'recentVolumeDesc_priceHistoryCompleteness_latestFreshness_symbol',
              trustedLoadStatus: 'LOAD_FAILED',
              membershipLoadFailureReason: 'Trusted universe membership page failed at offset 250.',
              strategyCandidatesSeen: 8,
              strategyCandidatesEligible: 0,
              strategyCandidatesExcluded: 8,
              outsideTrustedUniverse: 8,
              setupsDetected: 0,
              promotedCandidates: 0,
              watchOnly: 0,
              unproven: 0,
              blocked: 0,
              noSetup: 0,
              topNoPromotionReasons: { NO_REVIEW_UNIVERSE: 0 },
            },
            candidates: [],
          },
          groups: { longReview: [], shortReview: [], exitRiskReview: [], watchOnly: [], blocked: [], avoid: [], insufficientData: [], unproven: [] },
          scope: { region: 'IN', assetType: 'STOCK' },
        }),
      });
    });

    await visitAuthenticated(page, '/today-review');

    await expect(page.getByText('Review mode: NO_REVIEW').first()).toBeVisible();
    await expect(page.getByText('No review mode: trusted price-action universe is unavailable or below the lite threshold. Today review cannot publish candidates until the trusted-universe evidence is ready.')).toBeVisible();
    await expect(page.getByText('Target session: 2026-05-12').first()).toBeVisible();
    await expect(page.getByText('Required data-through: 2026-05-11').first()).toBeVisible();
    await expect(page.getByText('Stored data-through: 2026-05-10').first()).toBeVisible();
    await expect(page.getByText('Trusted universe membership unavailable. Trusted universe membership page failed at offset 250.')).toBeVisible();
    await expect(page.getByText('Membership load: LOAD_FAILED')).toBeVisible();
    await expect(page.getByText('Strategy outside trusted universe: 8')).toBeVisible();
    await expect(page.getByText(/No long review candidates are currently promoted/)).toBeVisible();
  });

  test('configured partial membership scan is disclosed without treating it as a load failure', async ({ page }) => {
    const partialResponse = {
      ...completedResponse,
      run: {
        ...completedResponse.run,
        status: 'PARTIAL',
        trustStatus: 'PARTIAL',
        warnings: ['Trusted universe scan is partial: scanned 100 of 500 instruments.'],
        sourceSnapshot: {
          ...completedResponse.run.sourceSnapshot,
          reviewUniverse: {
            ...completedResponse.run.sourceSnapshot.reviewUniverse,
            trustedCount: 500,
            scanPolicy: {
              scanLimit: 100,
              scanComplete: false,
              scanOrdering: 'recentVolumeDesc_priceHistoryCompleteness_latestFreshness_symbol',
            },
          },
          scanFunnel: {
            ...completedResponse.run.sourceSnapshot.scanFunnel,
            trustedUniverseCount: 500,
            trustedInstrumentsScanned: 100,
            trustedInstrumentsSkipped: 400,
            scanLimit: 100,
            scanComplete: false,
            trustedLoadStatus: 'CONFIGURED_PARTIAL',
            membershipLoadFailureReason: null,
          },
        },
        trustedUniverseCount: 500,
        scanFunnel: {
          ...completedResponse.run.scanFunnel,
          trustedUniverseCount: 500,
          trustedInstrumentsScanned: 100,
          trustedInstrumentsSkipped: 400,
          scanLimit: 100,
          scanComplete: false,
          trustedLoadStatus: 'CONFIGURED_PARTIAL',
          membershipLoadFailureReason: null,
        },
      },
    };
    await page.route('**/api/v1/today-review/latest**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(partialResponse) });
    });

    await visitAuthenticated(page, '/today-review');

    await expect(page.getByText('Partial trusted-universe scan: scanned 100 of 500 instruments using recentVolumeDesc_priceHistoryCompleteness_latestFreshness_symbol ordering.')).toBeVisible();
    await expect(page.getByText('Membership load: CONFIGURED_PARTIAL')).toBeVisible();
    await expect(page.getByText('Trusted universe membership unavailable')).toHaveCount(0);
  });

  test('partial run keeps usable grouped sections and shows warnings', async ({ page }) => {
    await page.route('**/api/v1/today-review/latest**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...completedResponse,
          run: {
            ...completedResponse.run,
            status: 'PARTIAL',
            trustStatus: 'PARTIAL',
            warnings: ['Market context snapshot is unavailable.'],
          },
        }),
      });
    });

    await visitAuthenticated(page, '/today-review');

    await expect(page.getByText('Run status: PARTIAL')).toBeVisible();
    await expect(page.getByText('Market context snapshot is unavailable.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'ALPHA.NS' })).toBeVisible();
    await page.getByRole('tab', { name: /Watch Only/ }).click();
    await expect(page.getByText('UNPROVEN.NS')).toBeVisible();
  });
});
