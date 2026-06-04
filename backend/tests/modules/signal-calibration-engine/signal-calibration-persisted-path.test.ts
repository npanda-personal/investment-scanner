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

    expect(setup.qualityService.countMatureByHorizon).toHaveBeenCalledWith('20D');
    expect(setup.qualityService.qualityMetricsFromPersistedOutcomes).toHaveBeenCalledWith({ horizon: '20D' });
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

    expect(setup.qualityService.countMatureByHorizon).toHaveBeenCalledWith('20D');
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

  it('noisy is always empty (not derivable from persisted outcomes)', async () => {
    const { service } = makeQualityService();
    const result = await service.qualityMetricsFromPersistedOutcomes({ horizon: '20D' });
    expect(result.noisy).toEqual([]);
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
});
