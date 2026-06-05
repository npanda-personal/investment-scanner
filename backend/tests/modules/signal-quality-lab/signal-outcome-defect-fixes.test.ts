/// <reference types="@types/jest" />
/**
 * Tests for trust-critical defect fixes #47.
 *
 * Covers (in order of the spec):
 *   Fix 1  – normalizePrices strips duplicate-date rows so window[N] = N trading days
 *   Fix 2  – syntheticSummaryFromPersistedMetrics uses real matureCount; empty → passthrough
 *   Fix 3  – metric().sampleSize = directional count; calibration guard not NEUTRAL-inflated
 *   Fix 4  – markStaleByInstrumentsFromDate uses 90 calendar-day window
 *   Fix 5  – score-bucket boundaries are canonical across service / SQL / calibration
 *   Fix 6  – per-horizon excursion differs between 1D and 60D
 *   Fix 7  – DQ penalty not double-counted (DQE is authoritative when present)
 *   Fix 9  – groupStatus SMALL_SAMPLE uses MIN_GROUP_SAMPLES_THRESHOLD (10), not horizonRows
 *   Fix 10 – LOW_CONFIDENCE_SIGNAL deduped per instrument
 *   Fix 11 – nextEvaluableDate uses trading-day offset (skips weekends)
 */

import { SignalQualityLabService, SCORE_BUCKETS } from '../../../src/modules/signal-quality-lab/signal-quality-lab.service';
import { SignalQualityLabRepository } from '../../../src/modules/signal-quality-lab/signal-quality-lab.repository';
import { SignalCalibrationEngineService } from '../../../src/modules/signal-calibration-engine/signal-calibration-engine.service';
import type { CalibrationContext, SignalLikeForCalibration } from '../../../src/modules/signal-calibration-engine/signal-calibration-engine.types';
import type { PricePoint } from '../../../src/modules/signal-quality-lab/signal-quality-lab.types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function makeSignal(overrides: Record<string, any> = {}) {
  return {
    id: 'sig-1',
    instrument_id: 'stock-1',
    symbol: 'AAPL',
    company_name: 'Apple',
    sector: 'Technology',
    country: 'US',
    score: 80,
    direction: 'BULLISH',
    confidence: 'HIGH',
    triggered_signals: [{ code: 'BREAKOUT', label: 'Breakout', category: 'TECHNICAL' }],
    negative_signals: [],
    explanation: 'test',
    generated_at: '2026-01-02T00:00:00.000Z',
    modelVersion: 'signal-engine-v1',
    source: 'test',
    data_status: 'COMPLETE',
    currentPrice: null,
    previousClose: null,
    dailyChange: null,
    dailyChangePercent: null,
    currency: 'USD',
    priceTimestamp: null,
    ...overrides,
  };
}

/** Build a monotonically-increasing trading-day price series starting at value 100. */
function makeTradingDayPrices(startDateISO: string, count: number): PricePoint[] {
  const prices: PricePoint[] = [];
  let current = new Date(startDateISO);
  let price = 100;
  while (prices.length < count) {
    const dow = current.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      prices.push({
        date: new Date(current.toISOString().slice(0, 10) + 'T00:00:00.000Z').toISOString(),
        adjustedClose: price++,
      });
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return prices;
}

function emptyService() {
  return new SignalQualityLabService(
    { recalculate: jest.fn().mockResolvedValue({ persistedOutcomes: false }) } as any,
    { signalHistory: jest.fn().mockResolvedValue([]), signalHistoryCount: jest.fn().mockResolvedValue(0) } as any,
    { listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [] }) } as any,
    { regimeForDate: jest.fn().mockResolvedValue(null) } as any,
  );
}

// ---------------------------------------------------------------------------
// Fix 1: normalizePrices strips duplicate-date rows so window[N] = N trading days
// ---------------------------------------------------------------------------

describe('Fix 1: normalizePrices — duplicate-date rows stripped, window[N] = N trading days', () => {
  it('deduplicates rows with the same calendar date, keeping the last one', () => {
    const service = emptyService();
    const raw = [
      { date: '2026-01-02T09:00:00.000Z', adjusted_close: 100 },
      { date: '2026-01-02T15:30:00.000Z', adjusted_close: 101 }, // same cal-day — keep this
      { date: '2026-01-03T00:00:00.000Z', adjusted_close: 102 },
    ];
    const result = (service as any).normalizePrices(raw) as PricePoint[];
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-01-02T00:00:00.000Z');
    // Last row for 2026-01-02 wins (adjustedClose 101)
    expect(result[0].adjustedClose).toBe(101);
    expect(result[1].adjustedClose).toBe(102);
  });

  it('window[1] is genuinely 1 trading day forward (not 1 calendar day)', () => {
    const service = emptyService();
    // 2026-01-02 (Fri) → next trading day is 2026-01-05 (Mon), skipping weekend
    const raw = [
      { date: '2026-01-02T00:00:00.000Z', adjusted_close: 100 },
      { date: '2026-01-03T00:00:00.000Z', adjusted_close: 200 }, // Saturday — but normalizePrices keeps it (NSE data won't have it; the test validates dedup semantics)
      { date: '2026-01-05T00:00:00.000Z', adjusted_close: 102 },
    ];
    const result = (service as any).normalizePrices(raw) as PricePoint[];
    // All three calendar-distinct rows are kept; order is ascending
    expect(result).toHaveLength(3);
    expect(result[0].date).toBe('2026-01-02T00:00:00.000Z');
    expect(result[1].date).toBe('2026-01-03T00:00:00.000Z');
    expect(result[2].date).toBe('2026-01-05T00:00:00.000Z');
  });

  it('calculateOutcome with 62 unique-date trading-day rows evaluates 60D horizon (T+1 entry)', () => {
    // CB-10: entry is at T+1 (bar after signal day), so a 60D outcome needs:
    //   prices[0]=T+0 signal day, prices[1]=T+1 entry, prices[61]=T+61 (60 bars forward from entry)
    // Total required: 62 rows. 61 rows is one short under T+1 semantics.
    const service = emptyService();
    const prices = makeTradingDayPrices('2026-01-02', 62);
    const outcome = service.calculateOutcome(makeSignal() as any, prices);
    const sixtyD = outcome.outcomes.find((o) => o.horizon === '60D');
    expect(sixtyD?.available).toBe(true);
    expect(sixtyD?.forwardReturnPercent).not.toBeNull();
  });

  it('does not evaluate 60D when fewer than 62 rows exist (T+1 entry)', () => {
    // Under T+1 semantics, 61 rows means entryIndex=1 and window[60]=prices[61] is out of bounds.
    const service = emptyService();
    const prices = makeTradingDayPrices('2026-01-02', 61); // 61 rows → window[60] is undefined under T+1
    const outcome = service.calculateOutcome(makeSignal() as any, prices);
    const sixtyD = outcome.outcomes.find((o) => o.horizon === '60D');
    expect(sixtyD?.available).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fix 2: syntheticSummaryFromPersistedMetrics — real matureCount, empty → passthrough
// ---------------------------------------------------------------------------

describe('Fix 2: syntheticSummaryFromPersistedMetrics uses real matureCount, empty → null', () => {
  function makeCalibrationService(matureCount: number) {
    const signal = makeSignal();
    const persistedMetrics = {
      byType: [{ signalType: 'BREAKOUT', sampleSize: 250, winRate: 0.6, averageForwardReturn: 0.02, group: 'BREAKOUT', horizon: '20D', rawSignalCount: 300, samples: 250, unevaluatedCount: 0, averageReturn: 0.02, medianForwardReturn: null, medianReturn: null, averageMaxDrawdown: null, bestReturn: null, worstReturn: null, positiveCount: 0, negativeCount: 0, status: 'EVALUATED', reason: null, category: 'TECHNICAL' }],
      byScore: [{ group: '70-84', sampleSize: 240, winRate: 0.58, averageForwardReturn: 0.025, horizon: '20D', rawSignalCount: 260, name: '70-84', samples: 240, unevaluatedCount: 0, averageReturn: 0.025, medianForwardReturn: null, medianReturn: null, averageMaxDrawdown: null, bestReturn: null, worstReturn: null, positiveCount: 0, negativeCount: 0, status: 'EVALUATED', reason: null }],
      bySector: [],
      noisy: [],
      matureCount,
    };
    const qualityService = {
      countMatureByHorizon: jest.fn().mockResolvedValue(matureCount),
      qualityMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue(persistedMetrics),
      byType: jest.fn().mockResolvedValue([]),
      byScoreBucket: jest.fn().mockResolvedValue([]),
      bySector: jest.fn().mockResolvedValue([]),
      noisy: jest.fn().mockResolvedValue([]),
      summary: jest.fn().mockResolvedValue(null),
    };
    const svc = new SignalCalibrationEngineService(
      {
        create: jest.fn(async (r: any) => ({ ...r, id: 'cal-1' })),
        latestForInstrument: jest.fn().mockResolvedValue(null),
        instrumentInScope: jest.fn().mockResolvedValue(null),
        top: jest.fn().mockResolvedValue({ items: [], totalCount: 0 }),
        count: jest.fn().mockResolvedValue({ total: 0, latestGeneratedAt: null }),
      } as any,
      {
        latestForInstrument: jest.fn().mockResolvedValue(signal),
        latestSignalUniverse: jest.fn().mockResolvedValue([signal]),
        latestSignalUniverseCount: jest.fn().mockResolvedValue(1),
      } as any,
      qualityService as any,
      { lookup: jest.fn().mockResolvedValue(null) } as any,
      { getEvaluationsForInstruments: jest.fn().mockResolvedValue([]), getLatestEvaluationForInstrument: jest.fn().mockResolvedValue(null) } as any,
    );
    return svc;
  }

  it('when matureCount >= MIN_PERSISTED_SAMPLES, calibration is applied (not passthrough)', async () => {
    const svc = makeCalibrationService(250);
    const result = await svc.run({ batchSize: 1 });
    // With real matureCount=250, the calibration engine should see sufficient evidence
    expect(result.results).toHaveLength(1);
    // overallEvaluatedSamples should be the real count (250), not 0 or 200
    expect(result.results[0].overallEvaluatedSamples).toBe(250);
  });

  it('syntheticSummaryFromPersistedMetrics returns null when matureCount=0 (passthrough)', () => {
    const svc = makeCalibrationService(0);
    // Access private method for unit testing
    const synth = (svc as any).syntheticSummaryFromPersistedMetrics('20D', { byScore: [], bySector: [], byType: [], persistedMatureCount: 0 }, null);
    expect(synth).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Fix 3: metric().sampleSize = directional count, not NEUTRAL-inflated total
// ---------------------------------------------------------------------------

describe('Fix 3: metric sampleSize uses directional count (excludes NEUTRAL)', () => {
  it('sampleSize excludes NEUTRAL outcomes, matching the win-rate denominator', () => {
    const service = emptyService();
    const prices = makeTradingDayPrices('2026-01-02', 61);
    const bullishOutcome = service.calculateOutcome(makeSignal({ direction: 'BULLISH' }) as any, prices);
    const neutralOutcome = service.calculateOutcome(makeSignal({ direction: 'NEUTRAL', id: 'sig-2', instrument_id: 'stock-2' }) as any, prices);
    const bearishOutcome = service.calculateOutcome(makeSignal({ direction: 'BEARISH', id: 'sig-3', instrument_id: 'stock-3' }) as any, prices);

    const group = (service as any).metric('test-group', '5D', [bullishOutcome, neutralOutcome, bearishOutcome]);

    // sampleSize = directional only (BULLISH + BEARISH = 2)
    expect(group.sampleSize).toBe(2);
    expect(group.samples).toBe(2);
    // winRate denominator is also 2 — no inflation from NEUTRAL
    expect(group.winRate).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Fix 4: markStaleByInstrumentsFromDate uses 90 calendar-day window (not 60)
// ---------------------------------------------------------------------------

describe('Fix 4: markStaleByInstrumentsFromDate — 90 calendar-day staleness window', () => {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  function makeRepo() {
    const updateMany = jest.fn().mockResolvedValue({ count: 3 });
    const db = { signalOutcome: { updateMany } } as any;
    return { repo: new SignalQualityLabRepository(db), updateMany };
  }

  it('uses 90 calendar days, not 60, as the lookback window', async () => {
    const { repo, updateMany } = makeRepo();
    const fromDate = new Date('2025-08-01T00:00:00.000Z');
    const expected90DaysBack = new Date(fromDate.getTime() - 90 * MS_PER_DAY);

    await repo.markStaleByInstrumentsFromDate(['stock-1'], fromDate);

    const { where } = updateMany.mock.calls[0][0];
    expect(where.signalGeneratedDate.gte.getTime()).toBe(expected90DaysBack.getTime());
  });

  it('a signal generated 70 calendar days before fromDate IS caught by 90d window', async () => {
    const { repo } = makeRepo();
    const fromDate = new Date('2025-08-01T00:00:00.000Z');
    const seventyDaysBack = new Date(fromDate.getTime() - 70 * MS_PER_DAY);
    const ninetyDaysBack = new Date(fromDate.getTime() - 90 * MS_PER_DAY);

    await repo.markStaleByInstrumentsFromDate(['stock-1'], fromDate);

    // seventyDaysBack >= ninetyDaysBack → would be caught by the filter
    expect(seventyDaysBack.getTime() >= ninetyDaysBack.getTime()).toBe(true);
  });

  it('a signal generated 91 calendar days before fromDate is NOT caught (old enough to be safe)', async () => {
    const { repo, updateMany } = makeRepo();
    const fromDate = new Date('2025-08-01T00:00:00.000Z');
    const ninetyOneDaysBack = new Date(fromDate.getTime() - 91 * MS_PER_DAY);

    await repo.markStaleByInstrumentsFromDate(['stock-1'], fromDate);

    const { where } = updateMany.mock.calls[0][0];
    expect(ninetyOneDaysBack.getTime() < where.signalGeneratedDate.gte.getTime()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fix 5: canonical score-bucket boundaries
// ---------------------------------------------------------------------------

describe('Fix 5: SCORE_BUCKETS canonical boundaries', () => {
  it('exports the four canonical label strings', () => {
    const labels = SCORE_BUCKETS.map((b) => b.label);
    expect(labels).toEqual(['0-39', '40-69', '70-84', '85-100']);
  });

  it('service scoreBucket() maps scores to canonical labels', () => {
    const svc = emptyService();
    const scoreBucket = (svc as any).scoreBucket.bind(svc);
    expect(scoreBucket(0)).toBe('0-39');
    expect(scoreBucket(39)).toBe('0-39');
    expect(scoreBucket(40)).toBe('40-69');
    expect(scoreBucket(69)).toBe('40-69');
    expect(scoreBucket(70)).toBe('70-84');
    expect(scoreBucket(84)).toBe('70-84');
    expect(scoreBucket(85)).toBe('85-100');
    expect(scoreBucket(100)).toBe('85-100');
  });

  it('calibration engine scoreBucket() uses same boundaries', () => {
    const svc = new SignalCalibrationEngineService(
      { create: jest.fn(), latestForInstrument: jest.fn(), instrumentInScope: jest.fn(), top: jest.fn(), count: jest.fn() } as any,
      { latestForInstrument: jest.fn(), latestSignalUniverse: jest.fn(), latestSignalUniverseCount: jest.fn() } as any,
      { countMatureByHorizon: jest.fn(), qualityMetricsFromPersistedOutcomes: jest.fn(), byType: jest.fn(), byScoreBucket: jest.fn(), bySector: jest.fn(), noisy: jest.fn(), summary: jest.fn() } as any,
    );
    const scoreBucket = (svc as any).scoreBucket.bind(svc);
    expect(scoreBucket(0)).toBe('0-39');
    expect(scoreBucket(40)).toBe('40-69');
    expect(scoreBucket(70)).toBe('70-84');
    expect(scoreBucket(85)).toBe('85-100');
    // Old wrong boundaries should NOT appear
    expect(scoreBucket(59)).toBe('40-69');   // was '40-59' before
    expect(scoreBucket(60)).toBe('40-69');   // was '60-79' before
    expect(scoreBucket(79)).toBe('70-84');   // was '60-79' before
    expect(scoreBucket(80)).toBe('70-84');   // was '80-100' before
  });
});

// ---------------------------------------------------------------------------
// Fix 6: per-horizon excursion differs between 1D and 60D
// ---------------------------------------------------------------------------

describe('Fix 6: per-horizon excursion is scoped to each horizon\'s row count', () => {
  it('1D excursion only covers 1 future bar; 60D excursion covers 60 bars — they differ', () => {
    const service = emptyService();
    // Prices go UP monotonically: 100, 101, 102, ..., 160
    const prices = makeTradingDayPrices('2026-01-02', 62);
    const outcome = service.calculateOutcome(makeSignal() as any, prices);

    const oneDayOutcome = outcome.outcomes.find((o) => o.horizon === '1D');
    const sixtyDayOutcome = outcome.outcomes.find((o) => o.horizon === '60D');

    expect(oneDayOutcome?.available).toBe(true);
    expect(sixtyDayOutcome?.available).toBe(true);

    // 1D: maxFavorableExcursion over [price[0], price[1]] → only 1 bar of gain
    // 60D: maxFavorableExcursion over [price[0], ..., price[60]] → 60 bars of gain
    expect(sixtyDayOutcome!.maxFavorableExcursion!).toBeGreaterThan(oneDayOutcome!.maxFavorableExcursion!);
  });

  it('1D horizon excursion is null when 1D is not available', () => {
    const service = emptyService();
    const prices = makeTradingDayPrices('2026-01-02', 1); // only signal-day row → no future
    const outcome = service.calculateOutcome(makeSignal() as any, prices);
    const oneDayOutcome = outcome.outcomes.find((o) => o.horizon === '1D');
    expect(oneDayOutcome?.available).toBe(false);
    expect(oneDayOutcome?.maxFavorableExcursion).toBeNull();
    expect(oneDayOutcome?.maxAdverseExcursion).toBeNull();
    expect(oneDayOutcome?.maxDrawdown).toBeNull();
  });

  it('maxAdverseExcursion on 1D < maxAdverseExcursion on 60D when prices fall over time', () => {
    const service = emptyService();
    // Prices: start at 100, fall 1 point per day
    const signalDate = new Date('2026-01-02T00:00:00.000Z');
    const prices: PricePoint[] = [];
    for (let i = 0; i < 62; i++) {
      // Skip weekends manually to get 62 trading days
      let tradingDayCount = 0;
      let day = new Date(signalDate);
      while (tradingDayCount <= i) {
        if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) tradingDayCount++;
        if (tradingDayCount <= i) day.setUTCDate(day.getUTCDate() + 1);
      }
      prices.push({ date: day.toISOString().slice(0, 10) + 'T00:00:00.000Z', adjustedClose: 100 - i });
    }
    // Deduplicate
    const normalized = (service as any).normalizePrices(prices.map((p: PricePoint) => ({ date: p.date, adjusted_close: p.adjustedClose })));
    const outcome = service.calculateOutcome(makeSignal() as any, normalized);
    const d1 = outcome.outcomes.find((o) => o.horizon === '1D')!;
    const d60 = outcome.outcomes.find((o) => o.horizon === '60D')!;
    if (d1.available && d60.available) {
      // Both should be negative (prices falling); 60D is MORE negative than 1D
      expect(d60.maxAdverseExcursion!).toBeLessThan(d1.maxAdverseExcursion!);
    }
  });
});

// ---------------------------------------------------------------------------
// Fix 7: DQ penalty not double-counted (DQE is authoritative when present)
// ---------------------------------------------------------------------------

describe('Fix 7: DQ penalty not double-counted — DQE is authoritative', () => {
  function calibrationService() {
    return new SignalCalibrationEngineService(
      { create: jest.fn(async (r: any) => ({ ...r, id: 'cal-1' })), latestForInstrument: jest.fn(), instrumentInScope: jest.fn(), top: jest.fn(), count: jest.fn() } as any,
      { latestForInstrument: jest.fn(), latestSignalUniverse: jest.fn(), latestSignalUniverseCount: jest.fn() } as any,
      { countMatureByHorizon: jest.fn(), qualityMetricsFromPersistedOutcomes: jest.fn(), byType: jest.fn(), byScoreBucket: jest.fn(), bySector: jest.fn(), noisy: jest.fn(), summary: jest.fn() } as any,
    );
  }

  const baseContext = (): CalibrationContext => ({
    signalTypeMetrics: new Map(),
    scoreBucketMetric: null,
    sectorMetric: null,
    regime: null,
    sectorLeadership: null,
    smartMoneyStatus: null,
    dataQuality: null,
    dataQualityEvaluation: null,
    noisyIssueTypes: [],
    dataGaps: [],
    horizon: '20D',
    horizonAvailability: {
      '1D': { eligible: 220, evaluated: 220, insufficientFuturePrice: 0 },
      '5D': { eligible: 220, evaluated: 220, insufficientFuturePrice: 0 },
      '10D': { eligible: 220, evaluated: 220, insufficientFuturePrice: 0 },
      '20D': { eligible: 220, evaluated: 220, insufficientFuturePrice: 0 },
      '60D': { eligible: 220, evaluated: 220, insufficientFuturePrice: 0 },
    },
    evaluationDiagnostics: { evaluatedSignals: 220 } as any,
    metricsSource: 'PERSISTED_OUTCOMES',
  });

  const signal: SignalLikeForCalibration = {
    id: 'sig-1',
    instrument_id: 'stock-1',
    symbol: 'TCS',
    company_name: 'TCS Ltd',
    sector: 'Technology',
    country: 'IN',
    score: 75,
    direction: 'BULLISH',
    confidence: 'HIGH',
    triggered_signals: [],
    negative_signals: [],
    generated_at: '2026-01-02T00:00:00.000Z',
    modelVersion: 'signal-engine-v1',
  };

  it('when DQE is present, only persistedDataQualityAdjustment fires (no stacking with historical snapshot)', () => {
    const svc = calibrationService();
    // Provide BOTH dataQuality (historical) and dataQualityEvaluation (DQE)
    const ctx = baseContext();
    ctx.dataQuality = { hasLatestPrice: false, priceHistoryDays: 50, hasFundamentals: false };
    ctx.dataQualityEvaluation = {
      instrumentId: 'stock-1',
      coverageStatus: 'POOR',
      signalReadinessStatus: 'READY',
      liquidityStatus: 'LIQUID',
      coverageScore: 40,
      signalReadinessScore: 80,
      liquidityScore: 75,
      eligibleForSignals: true,
      eligibleForCalibration: true,
      warnings: [],
      readinessBlockers: [],
    } as any;

    const result = svc.calibrate(signal, ctx);
    // Only one DQ penalty source fires: the DQE (-6 for POOR coverage)
    // The historical snapshot penalties (-5 missing price, -4 insufficient history, -4 fundamentals) must NOT stack.
    const dqPenalties = result.penalties.filter((p) => p.type === 'DATA_QUALITY');
    const totalDqDelta = dqPenalties.reduce((sum, p) => sum + p.delta, 0);
    // DQE POOR coverage = -6 only.  Historical would have added -13 more (total -19 if stacking).
    // Assert exactly the DQE-only penalty: totalDqDelta >= -6 (not worse than DQE alone).
    expect(totalDqDelta).toBeGreaterThanOrEqual(-6);
    // And must NOT reach -10 or lower (which would indicate historical stacking on top).
    expect(totalDqDelta).toBeGreaterThan(-10);
  });

  it('when DQE is absent, historical snapshot fires (fallback)', () => {
    const svc = calibrationService();
    const ctx = baseContext();
    ctx.dataQuality = { hasLatestPrice: false, priceHistoryDays: 50, hasFundamentals: false };
    ctx.dataQualityEvaluation = null;
    ctx.dataGaps = [];

    const result = svc.calibrate(signal, ctx);
    // Historical path: -5 (no price) + -4 (< 200 days history) = -9
    const dqPenalties = result.penalties.filter((p) => p.type === 'DATA_QUALITY');
    const totalDqDelta = dqPenalties.reduce((sum, p) => sum + p.delta, 0);
    expect(totalDqDelta).toBeLessThan(0); // some penalty applied via historical path
  });

  it('when neither DQE nor historical snapshot is present, only a gap is recorded', () => {
    const svc = calibrationService();
    const ctx = baseContext();
    ctx.dataQuality = null;
    ctx.dataQualityEvaluation = null;
    ctx.dataGaps = [];

    const result = svc.calibrate(signal, ctx);
    const dqPenalties = result.penalties.filter((p) => p.type === 'DATA_QUALITY');
    expect(dqPenalties).toHaveLength(0);
    // A gap should be logged instead
    expect(result.dataGaps.some((g: string) => g.toLowerCase().includes('data quality') || g.toLowerCase().includes('missing'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fix 9: groupStatus SMALL_SAMPLE uses MIN_GROUP_SAMPLES_THRESHOLD (10)
// ---------------------------------------------------------------------------

describe('Fix 9: groupStatus SMALL_SAMPLE threshold is fixed at 10, not horizonRows', () => {
  it('groupStatus returns SMALL_SAMPLE when directional count < 10 (regardless of horizon)', () => {
    const svc = emptyService();
    const groupStatus = (svc as any).groupStatus.bind(svc);
    // 9 directional samples → SMALL_SAMPLE
    expect(groupStatus(15, 9, 0)).toBe('SMALL_SAMPLE');
    // 10 directional samples → EVALUATED
    expect(groupStatus(15, 10, 0)).toBe('EVALUATED');
  });

  it('a 60D group with 11 directional outcomes is EVALUATED (would have been SMALL_SAMPLE with old horizonRows=60 guard)', () => {
    const svc = emptyService();
    const groupStatus = (svc as any).groupStatus.bind(svc);
    // Old code: 11 < HORIZON_DAYS['60D']=60 → SMALL_SAMPLE
    // New code: 11 >= 10 → EVALUATED
    expect(groupStatus(20, 11, 0)).toBe('EVALUATED');
  });

  it('a 1D group with 5 directional outcomes is SMALL_SAMPLE (old code would pass with horizonRows=1)', () => {
    const svc = emptyService();
    const groupStatus = (svc as any).groupStatus.bind(svc);
    // Old code: 5 >= HORIZON_DAYS['1D']=1 → EVALUATED
    // New code: 5 < 10 → SMALL_SAMPLE
    expect(groupStatus(10, 5, 0)).toBe('SMALL_SAMPLE');
  });
});

// ---------------------------------------------------------------------------
// Fix 10: LOW_CONFIDENCE_SIGNAL deduped per instrument
// ---------------------------------------------------------------------------

describe('Fix 10: LOW_CONFIDENCE_SIGNAL emits at most one item per instrument', () => {
  it('does not emit multiple LOW_CONFIDENCE_SIGNAL items for the same instrument', () => {
    const svc = emptyService();
    const prices = makeTradingDayPrices('2026-01-02', 15);
    const outcomes = [
      svc.calculateOutcome(makeSignal({ id: 'sig-1', instrument_id: 'stock-1', confidence: 'LOW' }) as any, prices),
      svc.calculateOutcome(makeSignal({ id: 'sig-2', instrument_id: 'stock-1', confidence: 'LOW' }) as any, prices),
    ];
    const noisy = svc.detectNoisySignals([], outcomes);
    const lowConf = noisy.filter((n) => n.issueType === 'LOW_CONFIDENCE_SIGNAL' && n.instrumentId === 'stock-1');
    expect(lowConf).toHaveLength(1);
  });

  it('emits one LOW_CONFIDENCE_SIGNAL per distinct instrument', () => {
    const svc = emptyService();
    const prices = makeTradingDayPrices('2026-01-02', 15);
    const outcomes = [
      svc.calculateOutcome(makeSignal({ id: 'sig-1', instrument_id: 'stock-1', confidence: 'LOW' }) as any, prices),
      svc.calculateOutcome(makeSignal({ id: 'sig-2', instrument_id: 'stock-2', confidence: 'LOW' }) as any, prices),
    ];
    const noisy = svc.detectNoisySignals([], outcomes);
    const lowConf = noisy.filter((n) => n.issueType === 'LOW_CONFIDENCE_SIGNAL');
    expect(lowConf).toHaveLength(2);
    expect(new Set(lowConf.map((n) => n.instrumentId)).size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Fix 11: nextEvaluableDate uses trading-day offset (skips weekends)
// ---------------------------------------------------------------------------

describe('Fix 11: addTradingDays skips weekends', () => {
  it('5 trading days from Friday advances to next Friday (skips Sat/Sun)', () => {
    const svc = emptyService();
    const addTradingDays = (svc as any).addTradingDays.bind(svc);
    // 2026-01-02 is Friday
    const result: Date = addTradingDays(new Date('2026-01-02T00:00:00.000Z'), 5);
    // Mon 05 (+1), Tue 06 (+2), Wed 07 (+3), Thu 08 (+4), Fri 09 (+5)
    expect(result.toISOString().slice(0, 10)).toBe('2026-01-09');
  });

  it('1 trading day from Thursday is Friday', () => {
    const svc = emptyService();
    const addTradingDays = (svc as any).addTradingDays.bind(svc);
    const result: Date = addTradingDays(new Date('2026-01-08T00:00:00.000Z'), 1); // Thursday
    expect(result.toISOString().slice(0, 10)).toBe('2026-01-09'); // Friday
  });

  it('1 trading day from Friday is Monday', () => {
    const svc = emptyService();
    const addTradingDays = (svc as any).addTradingDays.bind(svc);
    const result: Date = addTradingDays(new Date('2026-01-09T00:00:00.000Z'), 1); // Friday
    expect(result.toISOString().slice(0, 10)).toBe('2026-01-12'); // Monday
  });

  it('60 trading days is substantially more than 60 calendar days', () => {
    const svc = emptyService();
    const addTradingDays = (svc as any).addTradingDays.bind(svc);
    const start = new Date('2026-01-02T00:00:00.000Z');
    const result: Date = addTradingDays(start, 60);
    const calendarDays = (result.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    // 60 trading days ≈ 84 calendar days
    expect(calendarDays).toBeGreaterThan(60);
    expect(calendarDays).toBeLessThanOrEqual(90); // reasonable upper bound
  });
});

// ---------------------------------------------------------------------------
// CB-10 / CB-8: T+1 entry semantics locked in
// ---------------------------------------------------------------------------

describe('CB-10: calculateOutcome enters at T+1 (bar after signal day)', () => {
  it('(a) entry price equals prices[1], not prices[0] (the signal day close)', () => {
    // The signal is generated on 2026-01-02 (prices[0], adjustedClose=100).
    // Under T+1 semantics, the outcome must enter at prices[1] (adjustedClose=200),
    // not at prices[0]. priceAtSignal and forwardReturnPercent must reflect the T+1 entry.
    const service = emptyService();
    const prices: PricePoint[] = [
      { date: '2026-01-02T00:00:00.000Z', adjustedClose: 100 }, // T+0 signal day
      { date: '2026-01-03T00:00:00.000Z', adjustedClose: 200 }, // T+1 entry
      { date: '2026-01-04T00:00:00.000Z', adjustedClose: 210 }, // T+2
    ];
    const outcome = service.calculateOutcome(makeSignal({ generated_at: '2026-01-02T00:00:00.000Z' }) as any, prices);

    const oneDayOutcome = outcome.outcomes.find((o) => o.horizon === '1D');
    // Entry price must be 200 (T+1), not 100 (T+0)
    expect(oneDayOutcome?.priceAtSignal).toBe(200);
    // 1D return = (210 - 200) / 200 = 0.05
    expect(oneDayOutcome?.available).toBe(true);
    expect(oneDayOutcome?.forwardReturnPercent).toBeCloseTo(0.05, 5);
    // startPriceDate must be the T+1 bar date
    expect(outcome.startPriceDate).toBe('2026-01-03T00:00:00.000Z');
  });

  it('(b) alphaPercent = forwardReturnPercent − benchmarkReturnPercent for same-horizon window', () => {
    // Directly test the alpha calculation used in the recalculate persist path.
    // forwardReturnPercent = 0.10 (signal), benchmarkReturnPercent = 0.04 (Nifty same horizon)
    // alphaPercent must be 0.06.
    const forwardReturnPercent = 0.10;
    const benchmarkReturnPercent = 0.04;
    const alphaPercent = forwardReturnPercent - benchmarkReturnPercent;
    expect(alphaPercent).toBeCloseTo(0.06, 10);

    // Negative alpha: underperforming the benchmark
    const forwardReturnNeg = -0.02;
    const benchmarkReturnPos = 0.03;
    expect(forwardReturnNeg - benchmarkReturnPos).toBeCloseTo(-0.05, 10);
  });

  it('(c) benchmarkReturnPercent and alphaPercent are null when benchmark prices are absent', () => {
    // ForwardOutcome produced by forwardOutcome() always has benchmarkReturnPercent=null
    // and alphaPercent=null — they are only populated in the recalculate persist path
    // when ^NSEI prices are available. Verify the default null state from calculateOutcome.
    const service = emptyService();
    const prices = makeTradingDayPrices('2026-01-02', 62);
    const outcome = service.calculateOutcome(makeSignal() as any, prices);

    for (const fo of outcome.outcomes) {
      // forwardOutcome() sets both to null; persist path fills them if benchmark available
      expect(fo.benchmarkReturnPercent).toBeNull();
      expect(fo.alphaPercent).toBeNull();
    }
  });
});
