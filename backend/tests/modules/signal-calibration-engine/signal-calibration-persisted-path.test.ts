/// <reference types="@types/jest" />
/**
 * Tests for Slice 3: signal-calibration-engine uses persisted SignalOutcome
 * aggregates when >= MIN_PERSISTED_SAMPLES (200) mature rows exist for the
 * selected horizon; falls back to the on-demand path otherwise.
 *
 * All DB / service calls are mocked — no real DB is accessed.
 */

import { SignalCalibrationEngineService } from '../../../src/modules/signal-calibration-engine';
import { SignalQualityLabService } from '../../../src/modules/signal-quality-lab';
import type {
  QualityMetricGroup,
  SignalTypePerformance,
  NoisySignalItem,
  PersistedQualityMetrics,
} from '../../../src/modules/signal-quality-lab';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const rawSignal = () => ({
  id: 'signal-1',
  instrument_id: 'stock-1',
  symbol: 'TCS',
  company_name: 'TCS Ltd',
  sector: 'Technology',
  country: 'IN',
  score: 72,
  direction: 'BULLISH' as const,
  confidence: 'HIGH' as const,
  triggered_signals: [{ code: 'PRICE_ABOVE_SMA50', label: 'price above SMA50', category: 'TECHNICAL' }],
  negative_signals: [],
  generated_at: '2026-04-01T00:00:00.000Z',
  modelVersion: 'signal-engine-v1',
});

const persistedMetrics: PersistedQualityMetrics = {
  byType: [
    {
      group: 'PRICE_ABOVE_SMA50',
      name: 'PRICE_ABOVE_SMA50',
      horizon: '20D',
      rawSignalCount: 300,
      sampleSize: 280,
      samples: 280,
      unevaluatedCount: 0,
      winRate: 0.61,
      averageForwardReturn: 0.03,
      averageReturn: 0.03,
      medianForwardReturn: null,
      medianReturn: null,
      averageMaxDrawdown: null,
      bestReturn: null,
      worstReturn: null,
      positiveCount: 0,
      negativeCount: 0,
      status: 'EVALUATED',
      reason: null,
      signalType: 'PRICE_ABOVE_SMA50',
      category: 'UNKNOWN',
    } as SignalTypePerformance,
  ],
  byScore: [
    {
      group: '70-84',
      name: '70-84',
      horizon: '20D',
      rawSignalCount: 250,
      sampleSize: 240,
      samples: 240,
      unevaluatedCount: 0,
      winRate: 0.58,
      averageForwardReturn: 0.025,
      averageReturn: 0.025,
      medianForwardReturn: null,
      medianReturn: null,
      averageMaxDrawdown: null,
      bestReturn: null,
      worstReturn: null,
      positiveCount: 0,
      negativeCount: 0,
      status: 'EVALUATED',
      reason: null,
    } as QualityMetricGroup,
  ],
  bySector: [
    {
      group: 'Technology',
      name: 'Technology',
      horizon: '20D',
      rawSignalCount: 200,
      sampleSize: 190,
      samples: 190,
      unevaluatedCount: 0,
      winRate: 0.59,
      averageForwardReturn: 0.02,
      averageReturn: 0.02,
      medianForwardReturn: null,
      medianReturn: null,
      averageMaxDrawdown: null,
      bestReturn: null,
      worstReturn: null,
      positiveCount: 0,
      negativeCount: 0,
      status: 'EVALUATED',
      reason: null,
    } as QualityMetricGroup,
  ],
  noisy: [] as NoisySignalItem[],
  matureCount: 380,
};

const goodSummary = {
  generatedAt: '2026-05-10T09:30:00.000Z',
  dataStatus: 'PARTIAL',
  evaluationDiagnostics: {
    evaluatedSignals: 380,
    latestAvailablePriceDate: '2026-05-10',
    nextEvaluableDate: null,
  },
  horizonAvailability: {
    '1D': { eligible: 380, evaluated: 380, insufficientFuturePrice: 0 },
    '5D': { eligible: 380, evaluated: 380, insufficientFuturePrice: 0 },
    '10D': { eligible: 380, evaluated: 380, insufficientFuturePrice: 0 },
    '20D': { eligible: 380, evaluated: 380, insufficientFuturePrice: 0 },
    '60D': { eligible: 380, evaluated: 380, insufficientFuturePrice: 0 },
  },
};

// ---------------------------------------------------------------------------
// Service factory
// ---------------------------------------------------------------------------

function makeService(qualityServiceOverrides: Partial<Record<string, jest.Mock>> = {}) {
  const repository = {
    create: jest.fn(async (result: any) => ({ ...result, id: 'cal-1' })),
    latestForInstrument: jest.fn().mockResolvedValue(null),
    instrumentInScope: jest.fn().mockResolvedValue({ id: 'stock-1', region: 'IN', exchange: 'NSE', assetType: 'STOCK' }),
    top: jest.fn().mockResolvedValue({ items: [], totalCount: 0, limit: 25, offset: 0, hasMore: false, sortBy: 'generatedAt', sortDirection: 'desc' }),
    count: jest.fn().mockResolvedValue({ total: 0, latestGeneratedAt: null }),
  };
  const signalService = {
    latestForInstrument: jest.fn().mockResolvedValue(rawSignal()),
    run: jest.fn().mockResolvedValue({ results: [rawSignal()] }),
    latestSignalUniverse: jest.fn().mockResolvedValue([rawSignal()]),
    latestSignalUniverseCount: jest.fn().mockResolvedValue(1),
  };
  const qualityService: Record<string, jest.Mock> = {
    summary: jest.fn().mockResolvedValue(goodSummary),
    byType: jest.fn().mockResolvedValue([]),
    byScoreBucket: jest.fn().mockResolvedValue([]),
    bySector: jest.fn().mockResolvedValue([]),
    noisy: jest.fn().mockResolvedValue([]),
    countMatureByHorizon: jest.fn().mockResolvedValue(380),
    qualityMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue(persistedMetrics),
    ...qualityServiceOverrides,
  };
  const contextService = {
    lookup: jest.fn().mockResolvedValue({
      market: { regime: 'RISK_ON' },
      sector: { leadershipStatus: 'LEADING' },
      smartMoney: { status: 'ACCUMULATION' },
      dataQuality: { hasLatestPrice: true, priceHistoryDays: 260, hasFundamentals: true },
      gaps: [],
    }),
  };
  const dataQualityService = {
    getLatestEvaluationForInstrument: jest.fn().mockResolvedValue(null),
    getEvaluationsForInstruments: jest.fn().mockResolvedValue([]),
    getEligibility: jest.fn().mockResolvedValue([]),
  };
  const instance = new SignalCalibrationEngineService(
    repository as any,
    signalService as any,
    qualityService as any,
    contextService as any,
    dataQualityService as any,
  );
  return { repository, signalService, qualityService, contextService, dataQualityService, instance };
}

// ---------------------------------------------------------------------------
// Tests: persisted path is chosen when mature count >= 200
// ---------------------------------------------------------------------------

describe('signal-calibration-engine — persisted outcomes path', () => {
  it('calls qualityMetricsFromPersistedOutcomes and NOT byType/byScoreBucket/bySector/noisy when matureCount >= 200', async () => {
    const setup = makeService();
    await setup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' });

    expect(setup.qualityService.countMatureByHorizon).toHaveBeenCalledWith('20D', 'signal-engine-v3');
    expect(setup.qualityService.qualityMetricsFromPersistedOutcomes).toHaveBeenCalledWith({ horizon: '20D', modelVersion: 'signal-engine-v3' });
    expect(setup.qualityService.byType).not.toHaveBeenCalled();
    expect(setup.qualityService.byScoreBucket).not.toHaveBeenCalled();
    expect(setup.qualityService.bySector).not.toHaveBeenCalled();
    expect(setup.qualityService.noisy).not.toHaveBeenCalled();
  });

  it('sets evidenceBasis.status to MEASURED_FROM_PERSISTED_OUTCOMES when persisted path is used', async () => {
    const setup = makeService();
    const result = await setup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' });

    expect(result.results.length).toBe(1);
    const r = result.results[0];
    expect(r.calibrationEvidence?.evidenceBasis.status).toBe('MEASURED_FROM_PERSISTED_OUTCOMES');
    expect(r.calibrationEvidence?.metricsSource).toBe('PERSISTED_OUTCOMES');
  });

  it('applies calibration adjustments using persisted metrics (boosts for high win-rate signal type)', async () => {
    const setup = makeService();
    const result = await setup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' });

    const r = result.results[0];
    // PRICE_ABOVE_SMA50 has winRate=0.61 > 0.58 threshold → should boost
    expect(r.boosts.some((b) => b.type === 'SIGNAL_TYPE')).toBe(true);
    expect(r.calibratedScore).toBeGreaterThan(r.rawScore);
  });

  it('sets calibrationReadiness.status to USABLE when persisted path has sufficient samples', async () => {
    const setup = makeService();
    const result = await setup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' });

    const r = result.results[0];
    expect(r.calibrationReadiness?.status).toBe('USABLE');
    expect(r.calibrationReadiness?.downstreamInfluence).toBe('NORMAL');
    expect(r.calibrationReadiness?.authoritativeScore).toBe('CALIBRATED_SCORE');
  });

  it('uses persisted path when on-demand summary has 0 evaluated outcomes but persisted count >= 200', async () => {
    // This is the key real-world case: on-demand price-series computation returns 0
    // evaluated signals (e.g. no future price rows yet), but persisted outcomes exist.
    const setup = makeService({
      summary: jest.fn().mockResolvedValue({
        generatedAt: '2026-05-01T00:00:00.000Z',
        dataStatus: 'PARTIAL',
        evaluationDiagnostics: { evaluatedSignals: 0, latestAvailablePriceDate: null, nextEvaluableDate: null },
        horizonAvailability: { '20D': { eligible: 0, evaluated: 0, insufficientFuturePrice: 0 } },
      }),
      countMatureByHorizon: jest.fn().mockResolvedValue(380),
      qualityMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue(persistedMetrics),
    });

    const result = await setup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' });

    // Persisted path was used even though on-demand said 0 evaluated
    expect(setup.qualityService.qualityMetricsFromPersistedOutcomes).toHaveBeenCalled();
    expect(result.results.length).toBe(1);
    const r = result.results[0];
    expect(r.calibrationEvidence?.metricsSource).toBe('PERSISTED_OUTCOMES');
    expect(r.calibrationEvidence?.evidenceBasis.status).toBe('MEASURED_FROM_PERSISTED_OUTCOMES');
    // Calibration should be USABLE (not UNAVAILABLE) because persisted metrics have enough samples
    expect(r.calibrationReadiness?.status).toBe('USABLE');
  });
});

// ---------------------------------------------------------------------------
// Tests: noisy flags are populated and penalties applied in the persisted path
// ---------------------------------------------------------------------------

describe('signal-calibration-engine — noisy flags in persisted path (hybrid)', () => {
  it('applies NOISE penalty when persisted metrics include noisy flags for the signal instrument', async () => {
    const noisyFlag: NoisySignalItem = {
      instrumentId: 'stock-1',
      symbol: 'TCS',
      issueType: 'DIRECTION_FLIPS',
      severity: 'HIGH',
      description: '3 direction flips in the last 30 days.',
      evidence: { flips: 3 },
      researchUrl: '/research/stocks/stock-1',
    };
    const metricsWithNoisy: PersistedQualityMetrics = {
      ...persistedMetrics,
      noisy: [noisyFlag],
    };

    const setup = makeService({
      qualityMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue(metricsWithNoisy),
    });
    const result = await setup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' });

    expect(result.results.length).toBe(1);
    const r = result.results[0];
    // DIRECTION_FLIPS → delta: -3 (non-FAILED noise)
    expect(r.penalties.some((p) => p.type === 'NOISE')).toBe(true);
    expect(r.penalties.find((p) => p.type === 'NOISE')?.evidence).toMatchObject({ issue: 'DIRECTION_FLIPS' });
  });

  it('applies larger NOISE penalty for FAILED_HIGH_SCORE_BULLISH flag', async () => {
    const noisyFlag: NoisySignalItem = {
      instrumentId: 'stock-1',
      symbol: 'TCS',
      issueType: 'FAILED_HIGH_SCORE_BULLISH',
      severity: 'MEDIUM',
      description: 'High-score bullish signal had a negative 10D outcome.',
      evidence: { return10D: -0.04, score: 80 },
      researchUrl: '/research/stocks/stock-1',
    };
    const metricsWithNoisy: PersistedQualityMetrics = {
      ...persistedMetrics,
      noisy: [noisyFlag],
    };

    const setup = makeService({
      qualityMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue(metricsWithNoisy),
    });
    const result = await setup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' });

    const r = result.results[0];
    const noisePenalty = r.penalties.find((p) => p.type === 'NOISE');
    expect(noisePenalty).toBeDefined();
    // FAILED_* noise → delta -6
    expect(noisePenalty!.delta).toBe(-6);
  });

  it('noisy flag for a different instrument does NOT apply a penalty to the current signal', async () => {
    const noisyFlag: NoisySignalItem = {
      instrumentId: 'other-stock', // different instrument
      symbol: 'OTHER',
      issueType: 'DIRECTION_FLIPS',
      severity: 'HIGH',
      description: '4 direction flips in 30 days.',
      evidence: { flips: 4 },
      researchUrl: '/research/stocks/other-stock',
    };
    const metricsWithNoisy: PersistedQualityMetrics = {
      ...persistedMetrics,
      noisy: [noisyFlag],
    };

    const setup = makeService({
      qualityMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue(metricsWithNoisy),
    });
    const result = await setup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' });

    const r = result.results[0];
    expect(r.penalties.some((p) => p.type === 'NOISE')).toBe(false);
  });

  it('persisted path with noisy flags produces a lower calibrated score than without', async () => {
    // Baseline: no noisy flags
    const baselineSetup = makeService({
      qualityMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue(persistedMetrics),
    });
    const baselineResult = await baselineSetup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' });
    const baselineScore = baselineResult.results[0].calibratedScore;

    // With noisy flag for the same instrument
    const noisyFlag: NoisySignalItem = {
      instrumentId: 'stock-1',
      symbol: 'TCS',
      issueType: 'DIRECTION_FLIPS',
      severity: 'HIGH',
      description: '3 direction flips.',
      evidence: { flips: 3 },
      researchUrl: '/research/stocks/stock-1',
    };
    const noisySetup = makeService({
      qualityMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue({ ...persistedMetrics, noisy: [noisyFlag] }),
    });
    const noisyResult = await noisySetup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' });
    const noisyScore = noisyResult.results[0].calibratedScore;

    expect(noisyScore).toBeLessThan(baselineScore);
  });
});

// ---------------------------------------------------------------------------
// Tests: on-demand fallback when matureCount < 200
// ---------------------------------------------------------------------------

describe('signal-calibration-engine — on-demand fallback path', () => {
  it('falls back to byType/byScoreBucket/bySector/noisy when matureCount < 200', async () => {
    const setup = makeService({
      countMatureByHorizon: jest.fn().mockResolvedValue(150), // below threshold
      byType: jest.fn().mockResolvedValue([]),
      byScoreBucket: jest.fn().mockResolvedValue([]),
      bySector: jest.fn().mockResolvedValue([]),
      noisy: jest.fn().mockResolvedValue([]),
    });

    await setup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' });

    expect(setup.qualityService.countMatureByHorizon).toHaveBeenCalledWith('20D', 'signal-engine-v3');
    expect(setup.qualityService.qualityMetricsFromPersistedOutcomes).not.toHaveBeenCalled();
    expect(setup.qualityService.byType).toHaveBeenCalled();
    expect(setup.qualityService.byScoreBucket).toHaveBeenCalled();
    expect(setup.qualityService.bySector).toHaveBeenCalled();
    expect(setup.qualityService.noisy).toHaveBeenCalled();
  });

  it('falls back to on-demand when matureCount is 0 (no persisted outcomes)', async () => {
    const setup = makeService({
      countMatureByHorizon: jest.fn().mockResolvedValue(0),
      byType: jest.fn().mockResolvedValue([]),
      byScoreBucket: jest.fn().mockResolvedValue([]),
      bySector: jest.fn().mockResolvedValue([]),
      noisy: jest.fn().mockResolvedValue([]),
    });

    await setup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' });

    expect(setup.qualityService.qualityMetricsFromPersistedOutcomes).not.toHaveBeenCalled();
    expect(setup.qualityService.byType).toHaveBeenCalled();
  });

  it('falls back to on-demand when countMatureByHorizon throws', async () => {
    const setup = makeService({
      countMatureByHorizon: jest.fn().mockRejectedValue(new Error('db down')),
      byType: jest.fn().mockResolvedValue([]),
      byScoreBucket: jest.fn().mockResolvedValue([]),
      bySector: jest.fn().mockResolvedValue([]),
      noisy: jest.fn().mockResolvedValue([]),
    });

    // Should not throw
    await expect(setup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' }))
      .resolves.toMatchObject({ processedCount: 1 });

    expect(setup.qualityService.qualityMetricsFromPersistedOutcomes).not.toHaveBeenCalled();
    expect(setup.qualityService.byType).toHaveBeenCalled();
  });

  it('falls back to on-demand when qualityMetricsFromPersistedOutcomes throws', async () => {
    const setup = makeService({
      countMatureByHorizon: jest.fn().mockResolvedValue(380),
      qualityMetricsFromPersistedOutcomes: jest.fn().mockRejectedValue(new Error('scorecard failed')),
      byType: jest.fn().mockResolvedValue([]),
      byScoreBucket: jest.fn().mockResolvedValue([]),
      bySector: jest.fn().mockResolvedValue([]),
      noisy: jest.fn().mockResolvedValue([]),
    });

    await expect(setup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' }))
      .resolves.toMatchObject({ processedCount: 1 });

    expect(setup.qualityService.byType).toHaveBeenCalled();
  });

  it('on-demand result does not set MEASURED_FROM_PERSISTED_OUTCOMES basis status', async () => {
    const setup = makeService({
      countMatureByHorizon: jest.fn().mockResolvedValue(0),
      byType: jest.fn().mockResolvedValue([]),
      byScoreBucket: jest.fn().mockResolvedValue([]),
      bySector: jest.fn().mockResolvedValue([]),
      noisy: jest.fn().mockResolvedValue([]),
    });

    const result = await setup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' });
    const r = result.results[0];
    expect(r.calibrationEvidence?.evidenceBasis.status).not.toBe('MEASURED_FROM_PERSISTED_OUTCOMES');
    expect(r.calibrationEvidence?.metricsSource).toBe('ON_DEMAND');
  });
});

// ---------------------------------------------------------------------------
// Tests: direction-aware win-rate shape from qualityMetricsFromPersistedOutcomes
// ---------------------------------------------------------------------------

describe('signal-quality-lab — qualityMetricsFromPersistedOutcomes shape', () => {
  function makeQualityService(repositoryOverrides: Record<string, jest.Mock> = {}) {
    const repository = {
      scorecard: jest.fn().mockResolvedValue([]),
      scorecardSummary: jest.fn().mockResolvedValue([]),
      countMatureByHorizon: jest.fn().mockResolvedValue(500),
      signalTypeMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue([]),
      ...repositoryOverrides,
    };
    const service = new SignalQualityLabService(
      repository as any,
      { signalHistory: jest.fn().mockResolvedValue([]), signalHistoryCount: jest.fn().mockResolvedValue(0) } as any,
      {} as any,
      {} as any,
      { getEvaluationsForInstruments: jest.fn().mockResolvedValue([]) } as any,
    );
    return { repository, service };
  }

  it('returns matureCount from countMatureByHorizon', async () => {
    const { service } = makeQualityService({ countMatureByHorizon: jest.fn().mockResolvedValue(420) });
    const result = await service.qualityMetricsFromPersistedOutcomes({ horizon: '20D' });
    expect(result.matureCount).toBe(420);
  });

  it('noisy is populated via the lightweight on-demand pass (hybrid path)', async () => {
    // The persisted path now calls noisy() internally; noisy should not be empty
    // when the signal-service returns signals with detectable issues.
    const noisySignal = {
      id: 'ns-1',
      instrument_id: 'stock-noisy',
      symbol: 'NOISYCO',
      company_name: 'Noisy Co',
      sector: 'Finance',
      country: 'IN',
      score: 75,
      direction: 'BULLISH',
      confidence: 'HIGH',
      triggered_signals: [],
      negative_signals: [],
      // Old enough to be stale (> 7 days ago)
      generated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      modelVersion: 'signal-engine-v1',
    };
    // Build a service with a signalService that returns stale signals
    const signalServiceWithNoise = {
      signalHistory: jest.fn().mockResolvedValue([noisySignal]),
      signalHistoryCount: jest.fn().mockResolvedValue(1),
    };
    const dataQualityService = { getEvaluationsForInstruments: jest.fn().mockResolvedValue([]) };
    const repository = {
      scorecard: jest.fn().mockResolvedValue([]),
      scorecardSummary: jest.fn().mockResolvedValue([]),
      countMatureByHorizon: jest.fn().mockResolvedValue(500),
      signalTypeMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue([]),
    };
    const serviceWithNoise = new SignalQualityLabService(
      repository as any,
      signalServiceWithNoise as any,
      // marketDataService — noisy() path calls outcomesForSignals → pricesForSignals
      // returns empty prices for the stale check, but stale detection only needs signal date
      { listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [] }) } as any,
      {} as any,
      dataQualityService as any,
    );

    const result = await serviceWithNoise.qualityMetricsFromPersistedOutcomes({ horizon: '20D' });
    // STALE_SIGNAL should appear: signal is > 7 days old
    expect(result.noisy.length).toBeGreaterThan(0);
    expect(result.noisy.some((n) => n.issueType === 'STALE_SIGNAL')).toBe(true);
  });

  it('maps scorecard sector rows to QualityMetricGroup with direction-aware win rate', async () => {
    const scorecardRows = [
      {
        horizon: '20D' as const,
        groupKey: 'Technology',
        sampleSize: 200,
        directionalSampleSize: 180,
        winRate: 0.61,
        avgReturnPercent: 0.025,
        medianReturnPercent: 0.018,
        expectancy: 0.012,
        profitFactor: 1.5,
        avgMaxAdverseExcursion: -0.02,
        avgMaxFavorableExcursion: 0.04,
        bestReturnPercent: 0.15,
        worstReturnPercent: -0.10,
      },
    ];

    const { service } = makeQualityService({
      scorecard: jest.fn()
        .mockResolvedValueOnce(scorecardRows) // calibrationScoreBucket call
        .mockResolvedValueOnce(scorecardRows), // sector call
      signalTypeMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue([]),
    });

    const result = await service.qualityMetricsFromPersistedOutcomes({ horizon: '20D' });
    expect(result.bySector.length).toBe(1);
    const sector = result.bySector[0];
    // sampleSize maps to directionalSampleSize (direction-aware denominator)
    expect(sector.sampleSize).toBe(180);
    // winRate is direction-aware (as stored in the ScorecardRow)
    expect(sector.winRate).toBe(0.61);
    expect(sector.averageForwardReturn).toBe(0.025);
    expect(sector.group).toBe('Technology');
  });

  it('maps signal type rows to SignalTypePerformance shape', async () => {
    const signalTypeRows = [
      {
        horizon: '20D' as const,
        signalTypeCode: 'RSI_OVERSOLD',
        sampleSize: 120,
        directionalSampleSize: 110,
        winRate: 0.64,
        avgReturnPercent: 0.032,
      },
    ];

    const { service } = makeQualityService({
      scorecard: jest.fn().mockResolvedValue([]),
      signalTypeMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue(signalTypeRows),
    });

    const result = await service.qualityMetricsFromPersistedOutcomes({ horizon: '20D' });
    expect(result.byType.length).toBe(1);
    const st = result.byType[0];
    expect(st.signalType).toBe('RSI_OVERSOLD');
    expect(st.winRate).toBe(0.64);
    expect(st.averageForwardReturn).toBe(0.032);
    // sampleSize = directionalSampleSize (direction-aware)
    expect(st.sampleSize).toBe(110);
  });

  it('maps calibration-compatible score buckets (0-39, 40-69, 70-84, 85-100)', async () => {
    const bucketRows = [
      { horizon: '20D' as const, groupKey: '0-39', sampleSize: 50, directionalSampleSize: 45, winRate: 0.40, avgReturnPercent: -0.01, medianReturnPercent: null, expectancy: null, profitFactor: null, avgMaxAdverseExcursion: null, avgMaxFavorableExcursion: null, bestReturnPercent: null, worstReturnPercent: null },
      { horizon: '20D' as const, groupKey: '40-69', sampleSize: 100, directionalSampleSize: 90, winRate: 0.50, avgReturnPercent: 0.005, medianReturnPercent: null, expectancy: null, profitFactor: null, avgMaxAdverseExcursion: null, avgMaxFavorableExcursion: null, bestReturnPercent: null, worstReturnPercent: null },
      { horizon: '20D' as const, groupKey: '70-84', sampleSize: 80, directionalSampleSize: 75, winRate: 0.60, avgReturnPercent: 0.02, medianReturnPercent: null, expectancy: null, profitFactor: null, avgMaxAdverseExcursion: null, avgMaxFavorableExcursion: null, bestReturnPercent: null, worstReturnPercent: null },
      { horizon: '20D' as const, groupKey: '85-100', sampleSize: 40, directionalSampleSize: 38, winRate: 0.68, avgReturnPercent: 0.04, medianReturnPercent: null, expectancy: null, profitFactor: null, avgMaxAdverseExcursion: null, avgMaxFavorableExcursion: null, bestReturnPercent: null, worstReturnPercent: null },
    ];

    const { service } = makeQualityService({
      scorecard: jest.fn()
        .mockResolvedValueOnce(bucketRows)  // calibrationScoreBucket
        .mockResolvedValueOnce([]),          // sector
      signalTypeMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue([]),
    });

    const result = await service.qualityMetricsFromPersistedOutcomes({ horizon: '20D' });
    const bucketKeys = result.byScore.map((b) => b.group).sort();
    expect(bucketKeys).toEqual(['0-39', '40-69', '70-84', '85-100']);
  });

  it('countMatureByHorizon is exposed through qualityMetricsFromPersistedOutcomes.matureCount', async () => {
    const { service } = makeQualityService({
      countMatureByHorizon: jest.fn().mockResolvedValue(38000),
    });
    const result = await service.qualityMetricsFromPersistedOutcomes({ horizon: '20D' });
    expect(result.matureCount).toBe(38000);
  });

  it('noisy defaults to empty array when signalService returns no signals (no spurious items)', async () => {
    const { service } = makeQualityService();
    const result = await service.qualityMetricsFromPersistedOutcomes({ horizon: '20D' });
    // signalHistory returns [] → detectNoisySignals([], []) → []
    expect(result.noisy).toEqual([]);
  });

  it('noisy detection gracefully handles signalService errors (returns empty, does not throw)', async () => {
    const repository = {
      scorecard: jest.fn().mockResolvedValue([]),
      scorecardSummary: jest.fn().mockResolvedValue([]),
      countMatureByHorizon: jest.fn().mockResolvedValue(500),
      signalTypeMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue([]),
    };
    const service = new SignalQualityLabService(
      repository as any,
      { signalHistory: jest.fn().mockRejectedValue(new Error('db timeout')), signalHistoryCount: jest.fn().mockResolvedValue(0) } as any,
      {} as any,
      {} as any,
      { getEvaluationsForInstruments: jest.fn().mockResolvedValue([]) } as any,
    );
    // Should not throw; noisy falls back to empty via .catch(() => [])
    const result = await service.qualityMetricsFromPersistedOutcomes({ horizon: '20D' });
    expect(result.noisy).toEqual([]);
    expect(result.matureCount).toBe(500);
  });
});
