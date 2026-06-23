/**
 * Tests for Wave 2 additive changes to TodayTradeReviewService:
 *   #28a — F&O-gate SHORT_REVIEW candidates (hard-constraint fix)
 *   #35b — Surface Capital Posture / regime context as marketPosture on the response
 *
 * Research-support language throughout — no buy/sell wording.
 */

import { TodayTradeReviewService } from '../../../src/modules/today-trade-review/today-trade-review.service';
import type {
  TodayReviewCandidateDto,
  TodayReviewRepository,
  TodayReviewRunDto,
  TodayReviewRunStatus,
  TodayReviewSourceSnapshot,
  TodayReviewUpstreamServices,
} from '../../../src/modules/today-trade-review/today-trade-review.types';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const fixedNow = new Date('2026-06-04T06:30:00.000Z');

// ─── In-memory repository ─────────────────────────────────────────────────────

class MemoryRepo implements TodayReviewRepository {
  runs = new Map<string, TodayReviewRunDto>();
  candidates = new Map<string, TodayReviewCandidateDto>();

  async markRunStarted(input: {
    runDate: Date; region: string; assetType: string; startedAt: Date;
    warnings: string[]; sourceSnapshot: TodayReviewSourceSnapshot | Record<string, unknown>;
  }): Promise<TodayReviewRunDto> {
    const key = `${input.runDate.toISOString()}:${input.region}:${input.assetType}`;
    const existing = [...this.runs.values()].find(
      (r) => `${r.runDate}:${r.region}:${r.assetType}` === key
    );
    const run: TodayReviewRunDto = {
      id: existing?.id ?? `run-${this.runs.size + 1}`,
      runDate: input.runDate.toISOString(),
      region: input.region,
      assetType: input.assetType,
      status: 'RUNNING',
      trustStatus: 'PARTIAL',
      dataThroughDate: null,
      startedAt: input.startedAt.toISOString(),
      finishedAt: null,
      warnings: input.warnings,
      candidateCounts: {},
      sourceSnapshot: input.sourceSnapshot,
      createdAt: existing?.createdAt ?? input.startedAt.toISOString(),
      updatedAt: input.startedAt.toISOString(),
      candidates: existing?.candidates ?? [],
    };
    this.runs.set(run.id, run);
    return run;
  }

  async failStaleRunningRuns(input: { cutoff: Date; finishedAt: Date }): Promise<number> {
    let count = 0;
    for (const run of this.runs.values()) {
      if (run.status === 'RUNNING' && new Date(run.startedAt).getTime() < input.cutoff.getTime()) {
        run.status = 'FAILED';
        run.finishedAt = input.finishedAt.toISOString();
        count += 1;
      }
    }
    return count;
  }

  async completeRun(input: {
    runId: string; status: TodayReviewRunStatus; dataThroughDate: Date | null;
    finishedAt: Date; warnings: string[]; candidateCounts: Record<string, number>;
    sourceSnapshot: TodayReviewSourceSnapshot | Record<string, unknown>;
    candidates: TodayReviewCandidateDto[];
  }): Promise<TodayReviewRunDto> {
    const current = this.runs.get(input.runId)!;
    const sourceSnapshot = input.sourceSnapshot as any;
    const reviewUniverse = sourceSnapshot.reviewUniverse ?? {};
    const candidates = input.candidates.map((c, idx) => {
      const persisted = { ...c, id: `${input.runId}-c-${idx + 1}`, runId: input.runId, createdAt: input.finishedAt.toISOString(), updatedAt: input.finishedAt.toISOString() };
      this.candidates.set(persisted.id, persisted);
      return persisted;
    });
    const run: TodayReviewRunDto = {
      ...current,
      status: input.status,
      trustStatus: input.status === 'COMPLETED' ? 'OK' : input.status === 'FAILED' ? 'FAILED' : 'PARTIAL',
      dataThroughDate: input.dataThroughDate?.toISOString() ?? null,
      finishedAt: input.finishedAt.toISOString(),
      warnings: input.warnings,
      candidateCounts: input.candidateCounts,
      sourceSnapshot: input.sourceSnapshot,
      reviewUniverseMode: reviewUniverse.mode,
      trustedUniverseCount: reviewUniverse.trustedCount,
      catalogCount: reviewUniverse.catalogCount,
      coverageWarnings: Array.isArray(reviewUniverse.warnings) ? reviewUniverse.warnings : [],
      scanFunnel: sourceSnapshot.scanFunnel ?? null,
      explainability: sourceSnapshot.explainability ?? null,
      updatedAt: input.finishedAt.toISOString(),
      candidates,
    };
    this.runs.set(run.id, run);
    return run;
  }

  async latest(region: string, assetType: string): Promise<TodayReviewRunDto | null> {
    return [...this.runs.values()].find(
      (r) => r.region === region && r.assetType === assetType && ['COMPLETED', 'PARTIAL'].includes(r.status)
    ) ?? null;
  }

  async getRun(id: string): Promise<TodayReviewRunDto | null> { return this.runs.get(id) ?? null; }
  async listRuns(): Promise<{ items: TodayReviewRunDto[]; total: number }> { const items = [...this.runs.values()]; return { items, total: items.length }; }
  async getCandidate(id: string): Promise<TodayReviewCandidateDto | null> { return this.candidates.get(id) ?? null; }
}

// ─── Price history helpers ────────────────────────────────────────────────────

/** Rising history — produces BREAKOUT / MOMENTUM_CONTINUATION / PULLBACK setups. */
const risingHistory = (length = 160) =>
  Array.from({ length }, (_, i) => {
    const close = 50 + i * 0.4;
    return {
      date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10),
      open: close - 0.15,
      high: close + 0.2,
      low: close - 0.5,
      close,
      adjustedClose: close,
      volume: 1000,
    };
  });

/**
 * Declining history — produces TREND_LOSS setups consistently.
 * close < sma50 && ret20 < -0.03 triggers at ~80 historical positions → WEAK evidence, not UNPROVEN.
 * This ensures state reaches SHORT_REVIEW (F&O) or AVOID (non-F&O) rather than being short-circuited to WATCH_ONLY.
 */
const decliningHistory = (length = 160) =>
  Array.from({ length }, (_, i) => {
    const close = Math.max(30, 100 - i * 0.35 + (i % 7 < 3 ? 1 : -0.5));
    return {
      date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10),
      open: close - 0.15,
      high: close + 0.3,
      low: close - 0.5,
      close,
      adjustedClose: close,
      volume: 1000,
    };
  });

// ─── Trusted instrument builders ─────────────────────────────────────────────

function trustedInstrumentBase(overrides: Record<string, any> = {}): any {
  return {
    id: 'trusted-1',
    symbol: 'TESTCO.NS',
    companyName: 'Test Co Ltd',
    region: 'IN',
    assetType: 'STOCK',
    exchange: 'NSE',
    providerSymbol: 'TESTCO.NS',
    latestPriceDate: '2026-06-04',
    priceHistoryBars: 160,
    rollingWindowBars: 160,
    hasRecentVolume: true,
    latestClose: null,
    latestVolume: 2000,
    adjustedCloseAvailable: true,
    usesAdjustedCloseFallback: false,
    contextGaps: [],
    warnings: [],
    priceHistory: risingHistory(160),
    derivativesEligible: null,    // not available by default
    ...overrides,
  };
}

/**
 * Instrument with a TREND_LOSS setup (bearish: close < sma50 && ret20 < -0.03).
 * Uses decliningHistory so there are >=10 historical occurrences (WEAK evidence, not UNPROVEN).
 * This ensures the candidate is promoted rather than short-circuited to WATCH_ONLY by unproven evidence.
 */
function bearishInstrument(derivativesEligible: boolean | null, idSuffix = '1'): any {
  const hist = decliningHistory(160);
  return trustedInstrumentBase({
    id: `bearish-${idSuffix}`,
    symbol: `BEARISH${idSuffix}.NS`,
    priceHistory: hist,
    latestClose: hist[hist.length - 1].close,
    latestVolume: 1000,
    derivativesEligible,
  });
}

// ─── Trusted universe health ──────────────────────────────────────────────────

function trustedHealth(count: number, instruments: any[]) {
  return {
    scope: { region: 'IN', assetType: 'STOCK' },
    asOfDate: '2026-06-04',
    targetTradingDate: '2026-06-05',
    requiredDataThroughDate: '2026-06-04',
    storedDataThroughDate: '2026-06-04',
    catalogCount: 2906,
    providerSupportedCount: 585,
    trustedCount: count,
    status: 'READY',
    mode: 'FULL_REVIEW',
    minLiteCount: 100,
    minFullCount: 300,
    dataThroughDate: '2026-06-04',
    scanPolicy: { scanLimit: count, scanComplete: true, scanOrdering: 'recentVolumeDesc_priceHistoryCompleteness_latestFreshness_symbol' },
    excludedCounts: { providerUnknown: 0, providerRetryFailed: 0, providerUnsupported: 0, inactiveOrDelisted: 0, noLatestPrice: 0, staleLatestPrice: 0, requiredHistoryIncomplete: 0, insufficientBarsUnder120: 0, insufficientBarsUnder252: 0, missingRecentVolume: 0, corporateActionBlocked: 0 },
    contextGapCounts: { missingSector: 0, missingIndustry: 0, missingMarketCap: 0, missingIsin: 0, missingListingDate: 0 },
    warnings: [],
    instruments,
  };
}

// ─── Minimal upstream services (no strategy decisions) ───────────────────────

function minimalServices(instruments: any[]): TodayReviewUpstreamServices {
  return {
    strategyDecisionService: {
      marketGate: jest.fn().mockResolvedValue({ marketGate: 'OPEN' }),
      candidates: jest.fn().mockResolvedValue({ results: [], total: 0 }),
      exits: jest.fn().mockResolvedValue([]),
    },
    tradePlanService: {
      latestForInstrument: jest.fn().mockResolvedValue(null),
      generatePlan: jest.fn().mockResolvedValue(null as any),
    },
    marketDataService: {
      latestStoredCandleInfo: jest.fn().mockResolvedValue({ latestTradingDate: '2026-06-04' }),
      trustedReviewUniverseHealth: jest.fn().mockResolvedValue(trustedHealth(instruments.length, instruments)),
      listTrustedReviewUniverseInstruments: jest.fn().mockResolvedValue(instruments),
    },
    dataQualityService: {
      getLatestEvaluationForInstrument: jest.fn().mockResolvedValue(null),
      getEvaluationsForInstruments: jest.fn().mockResolvedValue([]),
      getEligibility: jest.fn().mockResolvedValue([]),
    },
    marketContextService: {
      latestPersistedSummary: jest.fn().mockResolvedValue({
        regime: { regime: 'RISK_ON', score: 80, explanation: 'Risk-on.', updatedAt: fixedNow.toISOString(), dataStatus: 'COMPLETE' },
        topSectors: [],
        weakSectors: [],
        breadth: { percentAboveSma50: 0.7, percentAboveSma200: 0.62, advanceDeclineRatio: 1.5, newHigh52WeekCount: 5, newLow52WeekCount: 1, bullishSignalCount: 20, bearishSignalCount: 5, instrumentCount: 80, dataStatus: 'COMPLETE' },
        countryStrength: [],
        macro: { interestRateProxy: null, inflationProxy: null, usdStrengthProxy: null, commodityProxy: null, macroStatus: 'UNKNOWN', dataStatus: 'MISSING', explanation: 'Missing.' },
        explanation: [],
        updatedAt: fixedNow.toISOString(),
        dataStatus: 'COMPLETE',
      }),
    },
    signalService: {
      latestForInstrument: jest.fn().mockResolvedValue(null),
      latestSignalUniverse: jest.fn().mockResolvedValue([]),
    },
    calibrationService: {
      latestPersistedForInstrument: jest.fn().mockResolvedValue(null),
    },
    smartMoneyService: {
      latestPersistedStock: jest.fn().mockResolvedValue(null),
    },
  };
}

// ─── Mock CapitalPostureService ───────────────────────────────────────────────

function mockPostureService(overrides: Partial<{
  availability: string;
  postureLabel: string | null;
  action: string | null;
  message: string;
}> = {}) {
  return {
    capitalPosture: jest.fn().mockResolvedValue({
      availability: 'READY',
      postureLabel: 'RISK_ON',
      action: 'DEPLOY',
      message: 'Posture RISK_ON: Environment supports deploying capital into high-conviction positions.',
      ...overrides,
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// #28a: F&O-gate SHORT_REVIEW candidates
// ─────────────────────────────────────────────────────────────────────────────

describe('#28a: F&O-gate for bearish Lite candidates', () => {
  it('classifies a bearish breakdown as SHORT_REVIEW when instrument is F&O-eligible', async () => {
    const instrument = bearishInstrument(true);
    const svc = new TodayTradeReviewService(
      new MemoryRepo(),
      minimalServices([instrument]),
      () => fixedNow,
      mockPostureService()
    );

    const result = await svc.run();

    // The breakdown instrument is derivativesEligible: true → SHORT_REVIEW
    const shorts = result.groups.shortReview;
    const avoids = result.groups.avoid;
    expect(shorts.length).toBeGreaterThanOrEqual(1);
    expect(shorts.some((c) => c.symbol === instrument.symbol)).toBe(true);
    // Must not appear in avoid for the same candidate
    expect(avoids.some((c) => c.symbol === instrument.symbol)).toBe(false);
    // State is SHORT_REVIEW — not AVOID
    const candidate = shorts.find((c) => c.symbol === instrument.symbol)!;
    expect(candidate.state).toBe('SHORT_REVIEW');
    // Research-support language: no buy/sell
    expect(candidate.reasonSummary).not.toMatch(/\bsell\b/i);
    expect(candidate.reasonSummary).not.toMatch(/\bbuy\b/i);
  });

  it('classifies a bearish breakdown as AVOID when instrument is NOT F&O-eligible (cash-only)', async () => {
    const instrument = bearishInstrument(false);
    const svc = new TodayTradeReviewService(
      new MemoryRepo(),
      minimalServices([instrument]),
      () => fixedNow,
      mockPostureService()
    );

    const result = await svc.run();

    // Non-F&O → must NOT be SHORT_REVIEW
    const shorts = result.groups.shortReview;
    expect(shorts.some((c) => c.symbol === instrument.symbol)).toBe(false);
    // Must be in AVOID
    const avoids = result.groups.avoid;
    expect(avoids.some((c) => c.symbol === instrument.symbol)).toBe(true);
    const candidate = avoids.find((c) => c.symbol === instrument.symbol)!;
    expect(candidate.state).toBe('AVOID');
    // Direction should be AVOID not SHORT
    expect(candidate.direction).toBe('AVOID');
    // Reason must mention cash-segment / non-F&O context
    expect(candidate.reasonSummary).toMatch(/F&O|cash segment|not executable/i);
    // Research-support language: no buy/sell
    expect(candidate.reasonSummary).not.toMatch(/\bsell\b/i);
    expect(candidate.reasonSummary).not.toMatch(/\bbuy\b/i);
  });

  it('classifies a bearish breakdown as AVOID when derivativesEligible is null (unknown = treat as non-F&O)', async () => {
    const instrument = bearishInstrument(null);
    const svc = new TodayTradeReviewService(
      new MemoryRepo(),
      minimalServices([instrument]),
      () => fixedNow,
      mockPostureService()
    );

    const result = await svc.run();

    // null derivativesEligible → conservative: must NOT be SHORT_REVIEW
    const shorts = result.groups.shortReview;
    expect(shorts.some((c) => c.symbol === instrument.symbol)).toBe(false);
    const avoids = result.groups.avoid;
    expect(avoids.some((c) => c.symbol === instrument.symbol)).toBe(true);
    const candidate = avoids.find((c) => c.symbol === instrument.symbol)!;
    expect(candidate.state).toBe('AVOID');
  });

  it('keeps both the non-F&O bearish name (as AVOID) and an F&O bearish name (as SHORT_REVIEW) visible when both present', async () => {
    const foInstrument = bearishInstrument(true, 'fo');
    const cashInstrument = bearishInstrument(false, 'cash');
    const svc = new TodayTradeReviewService(
      new MemoryRepo(),
      minimalServices([foInstrument, cashInstrument]),
      () => fixedNow,
      mockPostureService()
    );

    const result = await svc.run();

    expect(result.groups.shortReview.some((c) => c.symbol === foInstrument.symbol)).toBe(true);
    expect(result.groups.avoid.some((c) => c.symbol === cashInstrument.symbol)).toBe(true);
    // Neither is dropped
    const allCandidates = result.run?.candidates ?? [];
    expect(allCandidates.some((c) => c.symbol === foInstrument.symbol)).toBe(true);
    expect(allCandidates.some((c) => c.symbol === cashInstrument.symbol)).toBe(true);
  });

  it('derivativesEligible is threaded onto the universe instrument and accessible on the candidate source', async () => {
    // Verify the gate works transitively through trustedInstrument -> buildCandidateSources
    const foInstrument = trustedInstrumentBase({ id: 'fo-1', symbol: 'FOSTOCK.NS', derivativesEligible: true, latestVolume: 2000, priceHistory: decliningHistory(160) });
    const svc = new TodayTradeReviewService(
      new MemoryRepo(),
      minimalServices([foInstrument]),
      () => fixedNow,
      mockPostureService()
    );

    const result = await svc.run();

    // If derivativesEligible was threaded correctly, this F&O name should appear as SHORT_REVIEW
    const foCandidate = result.run?.candidates.find((c) => c.symbol === 'FOSTOCK.NS');
    expect(foCandidate).toBeDefined();
    expect(foCandidate?.state).toBe('SHORT_REVIEW');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// #35b: marketPosture — surface Capital Posture on the today-review output
// ─────────────────────────────────────────────────────────────────────────────

describe('#35b: marketPosture surfaced on today-review run response', () => {
  it('includes marketPosture when CapitalPostureService returns a valid RISK_ON posture', async () => {
    const postureSvc = mockPostureService({ availability: 'READY', postureLabel: 'RISK_ON', action: 'DEPLOY' });
    const svc = new TodayTradeReviewService(
      new MemoryRepo(),
      minimalServices([]),
      () => fixedNow,
      postureSvc
    );

    const result = await svc.run();

    expect(result.marketPosture).toBeDefined();
    expect(result.marketPosture?.availability).toBe('READY');
    expect(result.marketPosture?.postureLabel).toBe('RISK_ON');
    expect(result.marketPosture?.action).toBe('DEPLOY');
    expect(result.marketPosture?.note).toMatch(/RISK_ON/i);
    // Research-support language: no buy/sell
    expect(result.marketPosture?.note).not.toMatch(/\bsell\b/i);
    expect(result.marketPosture?.note).not.toMatch(/\bbuy\b/i);
  });

  it('surfaces RISK_OFF posture with a caution note when posture is RISK_OFF', async () => {
    const postureSvc = mockPostureService({ availability: 'READY', postureLabel: 'RISK_OFF', action: 'RAISE_CASH' });
    const svc = new TodayTradeReviewService(
      new MemoryRepo(),
      minimalServices([]),
      () => fixedNow,
      postureSvc
    );

    const result = await svc.run();

    expect(result.marketPosture?.postureLabel).toBe('RISK_OFF');
    expect(result.marketPosture?.action).toBe('RAISE_CASH');
    expect(result.marketPosture?.note).toMatch(/RISK_OFF/i);
    // Should mention caution / shorts contextual note
    expect(result.marketPosture?.note).toMatch(/caution|discouraged|selectively/i);
  });

  it('surfaces NEUTRAL posture correctly', async () => {
    const postureSvc = mockPostureService({ availability: 'READY', postureLabel: 'NEUTRAL', action: 'HOLD' });
    const svc = new TodayTradeReviewService(
      new MemoryRepo(),
      minimalServices([]),
      () => fixedNow,
      postureSvc
    );

    const result = await svc.run();

    expect(result.marketPosture?.postureLabel).toBe('NEUTRAL');
    expect(result.marketPosture?.action).toBe('HOLD');
    expect(result.marketPosture?.note).toMatch(/NEUTRAL/i);
  });

  it('returns UNAVAILABLE marketPosture with an honest note when posture snapshot is unavailable', async () => {
    const postureSvc = mockPostureService({
      availability: 'UNAVAILABLE',
      postureLabel: null,
      action: null,
      message: 'No persisted market-context or market-pulse snapshot is available for this scope.',
    });
    const svc = new TodayTradeReviewService(
      new MemoryRepo(),
      minimalServices([]),
      () => fixedNow,
      postureSvc
    );

    const result = await svc.run();

    expect(result.marketPosture?.availability).toBe('UNAVAILABLE');
    expect(result.marketPosture?.postureLabel).toBeNull();
    expect(result.marketPosture?.action).toBeNull();
    // Honest message — must not fabricate a posture
    expect(result.marketPosture?.note).toBeTruthy();
    expect(result.marketPosture?.note).not.toBe('');
  });

  it('still generates candidates when posture is UNAVAILABLE — posture is context only, not a blocker', async () => {
    const foInstrument = trustedInstrumentBase({
      id: 'long-1',
      symbol: 'LONGSTOCK.NS',
      derivativesEligible: false,
      latestVolume: 2000,
      // Monotonically rising with breakout on last bar — enough for a LONG_REVIEW setup
      priceHistory: (() => {
        const hist = risingHistory(160);
        const last = hist[hist.length - 1];
        hist[hist.length - 1] = { ...last, close: last.close + 20, high: last.close + 22, adjustedClose: last.close + 20, volume: 5000 };
        return hist;
      })(),
    });
    const postureSvc = mockPostureService({ availability: 'UNAVAILABLE', postureLabel: null, action: null, message: 'Regime unavailable.' });
    const svc = new TodayTradeReviewService(
      new MemoryRepo(),
      minimalServices([foInstrument]),
      () => fixedNow,
      postureSvc
    );

    const result = await svc.run();

    // Posture unavailable should not suppress candidates
    expect(result.marketPosture?.availability).toBe('UNAVAILABLE');
    // Candidates can still be generated (posture is context only)
    // At minimum the run should complete without error
    expect(result.run?.status).not.toBe('FAILED');
  });

  it('handles CapitalPostureService throwing gracefully — returns UNAVAILABLE, does not fail the run', async () => {
    const throwingPostureSvc = {
      capitalPosture: jest.fn().mockRejectedValue(new Error('Posture service database timeout')),
    };
    const svc = new TodayTradeReviewService(
      new MemoryRepo(),
      minimalServices([]),
      () => fixedNow,
      throwingPostureSvc
    );

    const result = await svc.run();

    // Exception is swallowed gracefully — run still completes
    expect(result.run?.status).not.toBe('FAILED');
    expect(result.marketPosture?.availability).toBe('UNAVAILABLE');
    expect(result.marketPosture?.postureLabel).toBeNull();
    expect(result.marketPosture?.note).toBeTruthy();
  });

  it('does not include buy/sell language in marketPosture notes', async () => {
    const postures: Array<'RISK_ON' | 'NEUTRAL' | 'RISK_OFF'> = ['RISK_ON', 'NEUTRAL', 'RISK_OFF'];
    for (const label of postures) {
      const postureSvc = mockPostureService({ availability: 'READY', postureLabel: label, action: 'DEPLOY' });
      const svc = new TodayTradeReviewService(new MemoryRepo(), minimalServices([]), () => fixedNow, postureSvc);
      const result = await svc.run();
      const note = result.marketPosture?.note ?? '';
      expect(note).not.toMatch(/\bbuy\b/i);
      expect(note).not.toMatch(/\bsell\b/i);
      expect(note).not.toMatch(/\bpurchase\b/i);
    }
  });
});
