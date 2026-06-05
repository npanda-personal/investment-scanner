/// <reference types="@types/jest" />
import { SignalCalibrationEngineService, type CalibrationContext, type SignalLikeForCalibration } from '../../../src/modules/signal-calibration-engine';

const rawSignal = (overrides: Partial<SignalLikeForCalibration> = {}): SignalLikeForCalibration => ({
  id: 'signal-1',
  instrument_id: 'stock-1',
  symbol: 'AAPL',
  company_name: 'Apple',
  sector: 'Technology',
  country: 'US',
  score: 72,
  direction: 'BULLISH',
  confidence: 'HIGH',
  triggered_signals: [{ code: 'PRICE_ABOVE_SMA50', label: 'price above SMA50', category: 'TECHNICAL' }],
  negative_signals: [],
  generated_at: '2026-04-29T00:00:00.000Z',
  modelVersion: 'signal-engine-v1',
  ...overrides,
});

const context = (overrides: Partial<CalibrationContext> = {}): CalibrationContext => ({
  signalTypeMetrics: new Map([['PRICE_ABOVE_SMA50', { winRate: 0.65, averageForwardReturn: 0.04, sampleSize: 60 }]]),
  scoreBucketMetric: { winRate: 0.62, averageForwardReturn: 0.03, sampleSize: 55 },
  sectorMetric: { winRate: 0.61, averageForwardReturn: 0.02, sampleSize: 50 },
  regime: 'RISK_ON',
  sectorLeadership: 'LEADING',
  smartMoneyStatus: 'ACCUMULATION',
  dataQuality: { hasLatestPrice: true, priceHistoryDays: 260, hasFundamentals: true },
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
  evaluationDiagnostics: { evaluatedSignals: 220 },
  ...overrides,
});

function service(overrides: Record<string, any> = {}) {
  const repository = {
    create: jest.fn(async (result) => ({ ...result, id: 'calibration-1' })),
    latestForInstrument: jest.fn().mockResolvedValue(null),
    instrumentInScope: jest.fn().mockResolvedValue({ id: 'stock-1', region: 'US', exchange: 'NASDAQ', assetType: 'STOCK' }),
    top: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue({ total: 0, latestGeneratedAt: null }),
    ...overrides.repository,
  };
  const signalService = {
    latestForInstrument: jest.fn().mockResolvedValue(rawSignal()),
    run: jest.fn().mockResolvedValue({ results: [rawSignal()] }),
    topSignals: jest.fn().mockResolvedValue({ signals: [rawSignal()], total: 1, limit: 100, offset: 0 }),
    latestSignalUniverse: jest.fn().mockResolvedValue([rawSignal()]),
    latestSignalUniverseCount: jest.fn().mockResolvedValue(1),
    ...overrides.signalService,
  };
  const qualityService = {
    byType: jest.fn().mockResolvedValue([{ signalType: 'PRICE_ABOVE_SMA50', winRate: 0.65, averageForwardReturn: 0.04, sampleSize: 60 }]),
    byScoreBucket: jest.fn().mockResolvedValue([{ group: '70-84', winRate: 0.62, averageForwardReturn: 0.03, sampleSize: 55 }]),
    bySector: jest.fn().mockResolvedValue([{ group: 'Technology', winRate: 0.61, averageForwardReturn: 0.02, sampleSize: 50 }]),
    noisy: jest.fn().mockResolvedValue([]),
    summary: jest.fn().mockResolvedValue({
      generatedAt: '2026-05-10T09:30:00.000Z',
      dataStatus: 'PARTIAL',
      evaluationDiagnostics: {
        evaluatedSignals: 220,
        latestAvailablePriceDate: '2026-05-10',
        nextEvaluableDate: null,
      },
      horizonAvailability: {
        '1D': { eligible: 220, evaluated: 220, insufficientFuturePrice: 0 },
        '5D': { eligible: 220, evaluated: 220, insufficientFuturePrice: 0 },
        '10D': { eligible: 220, evaluated: 220, insufficientFuturePrice: 0 },
        '20D': { eligible: 220, evaluated: 220, insufficientFuturePrice: 0 },
        '60D': { eligible: 220, evaluated: 220, insufficientFuturePrice: 0 },
      },
    }),
    ...overrides.qualityService,
  };
  const contextService = {
    lookup: jest.fn().mockResolvedValue({
      market: { regime: 'RISK_ON' },
      sector: { leadershipStatus: 'LEADING' },
      smartMoney: { status: 'ACCUMULATION' },
      dataQuality: { hasLatestPrice: true, priceHistoryDays: 260, hasFundamentals: true },
      gaps: [],
    }),
    ...overrides.contextService,
  };
  const dataQualityService = {
    getLatestEvaluationForInstrument: jest.fn().mockResolvedValue(null),
    getEvaluationsForInstruments: jest.fn().mockResolvedValue([]),
    ...overrides.dataQualityService,
  };
  return {
    repository,
    signalService,
    qualityService,
    contextService,
    dataQualityService,
    instance: new SignalCalibrationEngineService(repository as any, signalService as any, qualityService as any, contextService as any, dataQualityService as any),
  };
}

describe('signal calibration engine service', () => {
  it('boosts aligned high-quality bullish signals', () => {
    const result = service().instance.calibrate(rawSignal(), context());
    expect(result.calibratedScore).toBeGreaterThan(result.rawScore);
    expect(result.boosts.map((item) => item.type)).toEqual(expect.arrayContaining(['SIGNAL_TYPE', 'REGIME', 'SECTOR', 'SMART_MONEY']));
    expect(result.calibratedConfidence).toBe('HIGH');
    expect(result.calibrationReadiness).toMatchObject({
      status: 'USABLE',
      confidenceTier: 'HIGH',
      downstreamInfluence: 'NORMAL',
      authoritativeScore: 'CALIBRATED_SCORE',
      calibrationApplied: true,
    });
    expect(result.calibrationEvidence).toMatchObject({
      horizon: '20D',
      evidenceStatus: 'SUFFICIENT',
      requiredOverallSamples: 50,
      requiredGroupSamples: 20,
    });
  });

  it('penalizes weak signal quality, risk-off conflict, distribution, data quality, and noise', () => {
    const result = service().instance.calibrate(rawSignal(), context({
      signalTypeMetrics: new Map([['PRICE_ABOVE_SMA50', { winRate: 0.4, averageForwardReturn: -0.02, sampleSize: 30 }]]),
      scoreBucketMetric: { winRate: 0.4, averageForwardReturn: -0.01, sampleSize: 10 },
      sectorMetric: { winRate: 0.42, averageForwardReturn: -0.02, sampleSize: 10 },
      regime: 'RISK_OFF',
      sectorLeadership: 'LAGGING',
      smartMoneyStatus: 'DISTRIBUTION',
      dataQuality: { hasLatestPrice: false, priceHistoryDays: 40, hasFundamentals: false },
      noisyIssueTypes: ['FAILED_HIGH_SCORE_BULLISH'],
    }));
    expect(result.calibratedScore).toBeLessThan(result.rawScore);
    expect(result.scoreDelta).toBeGreaterThanOrEqual(-25);
    expect(result.calibratedConfidence).toBe('LOW');
  });

  it('applies persisted data quality penalties and includes data quality in response', () => {
    const result = service().instance.calibrate(rawSignal(), context({
      dataQualityEvaluation: {
        coverageScore: 25,
        coverageStatus: 'UNUSABLE',
        signalReadinessScore: 20,
        signalReadinessStatus: 'NOT_READY',
        liquidityScore: 10,
        liquidityStatus: 'ILLIQUID',
        eligibleForSignals: false,
        eligibleForCalibration: false,
        warnings: ['Adjusted close fallback'],
        readinessBlockers: ['SMA200 requires at least 200 price rows.'],
      } as any,
    }));
    expect(result.scoreDelta).toBeLessThan(0);
    expect(result.penalties.map((item) => item.label)).toEqual(expect.arrayContaining(['Data quality coverage is unusable.', 'Signal readiness is not ready.', 'Liquidity quality is illiquid.']));
    expect(result.dataQuality).toMatchObject({ coverageStatus: 'UNUSABLE', signalReadinessStatus: 'NOT_READY', liquidityStatus: 'ILLIQUID' });
  });

  it('falls back to historical snapshot adjustment when DQE is missing (Fix 7: no stacking)', () => {
    // When dataQualityEvaluation=null, the code falls back to dataQualityAdjustment (historical).
    // With a good historical snapshot (hasLatestPrice=true, 260 days, fundamentals), no penalty fires.
    const result = service().instance.calibrate(rawSignal(), context({ dataQualityEvaluation: null }));
    // No DQ penalty since historical snapshot is clean
    expect(result.penalties.filter((p: any) => p.type === 'DATA_QUALITY')).toHaveLength(0);
  });

  it('adds a data gap when both DQE and historical snapshot are missing', () => {
    const result = service().instance.calibrate(rawSignal(), context({ dataQualityEvaluation: null, dataQuality: null }));
    expect(result.dataGaps.some((g: string) => g.toLowerCase().includes('data quality') || g.toLowerCase().includes('snapshot'))).toBe(true);
  });

  it('clamps calibrated score to 0-100 and total delta to bounds', () => {
    const bullish = service().instance.calibrate(rawSignal({ score: 95 }), context());
    expect(bullish.calibratedScore).toBeLessThanOrEqual(100);
    expect(bullish.scoreDelta).toBeLessThanOrEqual(25);
    const bearish = service().instance.calibrate(rawSignal({ score: 5 }), context({ smartMoneyStatus: 'DISTRIBUTION', regime: 'RISK_OFF' }));
    expect(bearish.calibratedScore).toBeGreaterThanOrEqual(0);
  });

  it('persists on-demand latest calibration and compare response', async () => {
    const setup = service();
    const latest = await setup.instance.latestForInstrument('stock-1');
    expect(latest?.id).toBe('calibration-1');
    expect(setup.repository.create).toHaveBeenCalled();
    const comparison = await setup.instance.compare('stock-1');
    expect(comparison?.rawSignal.symbol).toBe('AAPL');
    expect(comparison?.calibratedSignal.symbol).toBe('AAPL');
    expect(setup.qualityService.summary).toHaveBeenCalledWith(expect.objectContaining({ horizon: '20D' }));
    expect(comparison?.calibratedSignal.calibrationEvidence?.evidenceBasis).toMatchObject({
      status: 'MEASURED',
      signalQualityGeneratedAt: '2026-05-10T09:30:00.000Z',
      latestMeasurablePriceDate: '2026-05-10',
    });
  });

  it('projects scoped page summary and measured evidence basis from scoped top summary', async () => {
    const setup = service({
      repository: {
        top: jest.fn().mockResolvedValue({
          items: [{
            ...service().instance.calibrate(rawSignal(), context()),
            calibrationEvidence: null,
            calibrationReadiness: null,
          }],
          totalCount: 1,
          limit: 25,
          offset: 0,
          hasMore: false,
          sortBy: 'generatedAt',
          sortDirection: 'desc',
        }),
      },
      qualityService: {
        summary: jest.fn().mockResolvedValue({
          generatedAt: '2026-05-20T10:00:00.000Z',
          dataStatus: 'PARTIAL',
          evaluationDiagnostics: {
            evaluatedSignals: 220,
            latestAvailablePriceDate: '2026-05-20',
            nextEvaluableDate: null,
          },
          horizonAvailability: {
            '20D': { eligible: 220, evaluated: 220, insufficientFuturePrice: 0 },
          },
        }),
      },
    });

    const page = await setup.instance.top({ limit: 25, region: 'IN', assetType: 'STOCK', horizon: '20D' });
    expect(page.pageSummary).toBeDefined();
    expect(page.pageSummary!.scope).toEqual({ region: 'IN', assetType: 'STOCK', horizon: '20D' });
    expect(page.pageSummary!.calibrationEvidence.evidenceBasis).toMatchObject({
      status: 'MEASURED',
      signalQualityGeneratedAt: '2026-05-20T10:00:00.000Z',
      latestMeasurablePriceDate: '2026-05-20',
      nextEvaluableDate: null,
    });
    expect(page.items[0].calibrationEvidence?.evidenceBasis).toMatchObject({
      status: 'MEASURED',
      latestMeasurablePriceDate: '2026-05-20',
    });
  });

  it('uses the same summary scope query shape for compare and top under the same scope and horizon', async () => {
    const summary = jest.fn().mockResolvedValue({
      generatedAt: '2026-05-20T10:00:00.000Z',
      dataStatus: 'PARTIAL',
      evaluationDiagnostics: {
        evaluatedSignals: 220,
        latestAvailablePriceDate: '2026-05-20',
        nextEvaluableDate: null,
      },
      horizonAvailability: {
        '20D': { eligible: 220, evaluated: 220, insufficientFuturePrice: 0 },
      },
    });
    const setup = service({
      signalService: {
        latestForInstrument: jest.fn().mockResolvedValue(rawSignal({ sector: 'Technology', country: 'US' })),
      },
      repository: {
        top: jest.fn().mockResolvedValue({
          items: [{
            ...service().instance.calibrate(rawSignal(), context()),
            calibrationEvidence: null,
            calibrationReadiness: null,
          }],
          totalCount: 1,
          limit: 25,
          offset: 0,
          hasMore: false,
          sortBy: 'generatedAt',
          sortDirection: 'desc',
        }),
      },
      qualityService: {
        summary,
      },
    });

    await setup.instance.compare('stock-1', 'US', 'STOCK', '20D');
    await setup.instance.top({ limit: 25, region: 'US', assetType: 'STOCK', horizon: '20D' });

    expect(summary).toHaveBeenCalledTimes(2);
    expect(summary.mock.calls[0][0]).toEqual({
      horizon: '20D',
      limit: 1,
      minSampleSize: 0,
      region: 'US',
      assetType: 'STOCK',
      sector: undefined,
      country: undefined,
    });
    expect(summary.mock.calls[1][0]).toEqual(summary.mock.calls[0][0]);
  });

  it('marks horizon-limited evidence basis and exposes next evaluable date', async () => {
    const setup = service({
      repository: {
        top: jest.fn().mockResolvedValue({
          items: [{
            ...service().instance.calibrate(rawSignal(), context()),
            calibrationEvidence: null,
            calibrationReadiness: null,
          }],
          totalCount: 1,
          limit: 25,
          offset: 0,
          hasMore: false,
          sortBy: 'generatedAt',
          sortDirection: 'desc',
        }),
      },
      qualityService: {
        summary: jest.fn().mockResolvedValue({
          generatedAt: '2026-05-20T10:00:00.000Z',
          dataStatus: 'PARTIAL',
          evaluationDiagnostics: {
            evaluatedSignals: 90,
            latestAvailablePriceDate: '2026-05-20',
            nextEvaluableDate: '2026-06-10',
          },
          horizonAvailability: {
            '20D': { eligible: 150, evaluated: 90, insufficientFuturePrice: 60 },
          },
        }),
      },
    });

    const page = await setup.instance.top({ limit: 25, region: 'US', assetType: 'STOCK', horizon: '20D' });
    expect(page.pageSummary).toBeDefined();
    expect(page.pageSummary!.calibrationEvidence.evidenceBasis).toMatchObject({
      status: 'HORIZON_LIMITED',
      latestMeasurablePriceDate: '2026-05-20',
      nextEvaluableDate: '2026-06-10',
    });
    expect(page.items[0].calibrationEvidence?.evidenceBasis).toMatchObject({
      status: 'HORIZON_LIMITED',
      nextEvaluableDate: '2026-06-10',
    });
  });

  it('fails closed with missing Signal Quality evidence basis when scoped summary is unavailable', async () => {
    const setup = service({
      repository: {
        top: jest.fn().mockResolvedValue({
          items: [{
            ...service().instance.calibrate(rawSignal(), context()),
            calibrationEvidence: null,
            calibrationReadiness: null,
          }],
          totalCount: 1,
          limit: 25,
          offset: 0,
          hasMore: false,
          sortBy: 'generatedAt',
          sortDirection: 'desc',
        }),
      },
      qualityService: {
        summary: jest.fn().mockRejectedValue(new Error('summary missing')),
      },
    });

    const page = await setup.instance.top({ limit: 25, region: 'IN', assetType: 'STOCK', horizon: '20D' });
    expect(page.pageSummary).toBeDefined();
    expect(page.pageSummary!.calibrationEvidence.evidenceBasis.status).toBe('MISSING_SIGNAL_QUALITY_EVIDENCE');
    expect(page.pageSummary!.calibrationReadiness.status).toBe('UNAVAILABLE');
    expect(page.items[0].calibrationReadiness?.status).toBe('UNAVAILABLE');
    expect(page.items[0].calibrationEvidence?.evidenceBasis.status).toBe('MISSING_SIGNAL_QUALITY_EVIDENCE');
  });

  it('returns model and health metadata', async () => {
    expect(service().instance.model()).toMatchObject({ calibrationModelVersion: 'signal-calibration-v2', totalDeltaCap: 25, minOverallSamples: 50, minGroupSamples: 20 });
    await expect(service().instance.health()).resolves.toMatchObject({
      module: 'signal-calibration-engine',
      dataStatus: 'MISSING',
      calibrationEvidence: {
        horizon: '20D',
        evidenceStatus: 'INSUFFICIENT',
        overallEvaluatedSamples: 0,
        groupEvaluatedSamples: 0,
        requiredOverallSamples: 50,
        requiredGroupSamples: 20,
      },
      calibrationReadiness: {
        status: 'UNAVAILABLE',
        confidenceTier: 'INSUFFICIENT_SAMPLE',
        calibrationApplied: false,
        downstreamInfluence: 'NONE',
        authoritativeScore: 'NO_SCORE',
      },
    });
  });

  it('adds health evidence for persisted rows that still lack stored readiness evidence', async () => {
    const setup = service({ repository: { count: jest.fn().mockResolvedValue({ total: 4, latestGeneratedAt: new Date('2026-05-13T09:30:00.000Z') }) } });
    await expect(setup.instance.health()).resolves.toMatchObject({
      calibratedSignals: 4,
      latestGeneratedAt: '2026-05-13T09:30:00.000Z',
      dataStatus: 'PARTIAL',
      calibrationEvidence: {
        horizon: '20D',
        evidenceStatus: 'MISSING',
        overallEvaluatedSamples: 0,
        groupEvaluatedSamples: 0,
        requiredOverallSamples: 50,
        requiredGroupSamples: 20,
      },
      calibrationReadiness: {
        status: 'UNAVAILABLE',
        confidenceTier: 'INSUFFICIENT_SAMPLE',
        calibrationApplied: false,
        downstreamInfluence: 'NONE',
        authoritativeScore: 'RAW_SCORE',
      },
    });
  });

  it('marks 5D with zero evaluated samples as insufficient and skips adjustments', () => {
    const result = service().instance.calibrate(rawSignal(), context({
      horizon: '5D',
      horizonAvailability: {
        '1D': { eligible: 150, evaluated: 27, insufficientFuturePrice: 123 },
        '5D': { eligible: 150, evaluated: 0, insufficientFuturePrice: 150 },
        '10D': { eligible: 150, evaluated: 0, insufficientFuturePrice: 150 },
        '20D': { eligible: 150, evaluated: 0, insufficientFuturePrice: 150 },
        '60D': { eligible: 150, evaluated: 0, insufficientFuturePrice: 150 },
      },
      evaluationDiagnostics: { evaluatedSignals: 0 },
    }));
    expect(result.calibratedConfidence).toBe('INSUFFICIENT_SAMPLE');
    expect(result.evidenceStatus).toBe('INSUFFICIENT');
    expect(result.calibrationApplied).toBe(false);
    expect(result.calibratedScore).toBe(result.rawScore);
    expect(result.calibrationReadiness).toMatchObject({
      status: 'UNAVAILABLE',
      confidenceTier: 'INSUFFICIENT_SAMPLE',
      downstreamInfluence: 'NONE',
      authoritativeScore: 'RAW_SCORE',
      calibrationApplied: false,
    });
    expect(result.calibrationReadiness?.blockers).toContain('Selected horizon has 0 evaluated outcome samples.');
  });

  it('treats 1D with 27 evaluated samples as insufficient sample evidence', () => {
    const result = service().instance.calibrate(rawSignal(), context({
      horizon: '1D',
      horizonAvailability: {
        '1D': { eligible: 150, evaluated: 27, insufficientFuturePrice: 123 },
        '5D': { eligible: 150, evaluated: 0, insufficientFuturePrice: 150 },
        '10D': { eligible: 150, evaluated: 0, insufficientFuturePrice: 150 },
        '20D': { eligible: 150, evaluated: 0, insufficientFuturePrice: 150 },
        '60D': { eligible: 150, evaluated: 0, insufficientFuturePrice: 150 },
      },
      evaluationDiagnostics: { evaluatedSignals: 27 },
    }));
    expect(result.calibratedConfidence).toBe('INSUFFICIENT_SAMPLE');
    expect(result.evidenceStatus).toBe('INSUFFICIENT');
    expect(result.scoreDelta).toBe(0);
    expect(result.calibrationReadiness).toMatchObject({
      status: 'UNAVAILABLE',
      downstreamInfluence: 'NONE',
      authoritativeScore: 'RAW_SCORE',
    });
  });

  it('marks low sample evidence as limited downstream influence', () => {
    const result = service().instance.calibrate(rawSignal(), context({
      signalTypeMetrics: new Map([['PRICE_ABOVE_SMA50', { winRate: 0.65, averageForwardReturn: 0.04, sampleSize: 22 }]]),
      scoreBucketMetric: { winRate: 0.62, averageForwardReturn: 0.03, sampleSize: 22 },
      sectorMetric: { winRate: 0.61, averageForwardReturn: 0.02, sampleSize: 22 },
      evaluationDiagnostics: { evaluatedSignals: 70 },
      horizonAvailability: {
        '1D': { eligible: 70, evaluated: 70, insufficientFuturePrice: 0 },
        '5D': { eligible: 70, evaluated: 70, insufficientFuturePrice: 0 },
        '10D': { eligible: 70, evaluated: 70, insufficientFuturePrice: 0 },
        '20D': { eligible: 70, evaluated: 70, insufficientFuturePrice: 0 },
        '60D': { eligible: 70, evaluated: 60, insufficientFuturePrice: 10 },
      },
    }));
    expect(result.evidenceStatus).toBe('LOW_SAMPLE');
    expect(result.calibrationReadiness).toMatchObject({
      status: 'LIMITED',
      confidenceTier: 'LOW',
      downstreamInfluence: 'LIMITED',
      authoritativeScore: 'CALIBRATED_SCORE',
    });
  });

  it('caps low, medium, and high confidence adjustments', () => {
    const low = service().instance.calibrate(rawSignal(), context({ evaluationDiagnostics: { evaluatedSignals: 60 } }));
    const medium = service().instance.calibrate(rawSignal(), context({ evaluationDiagnostics: { evaluatedSignals: 120 } }));
    const high = service().instance.calibrate(rawSignal(), context({ evaluationDiagnostics: { evaluatedSignals: 220 } }));
    expect(Math.abs(low.boosts[0].delta)).toBeLessThanOrEqual(3);
    expect(Math.abs(medium.boosts[0].delta)).toBeLessThanOrEqual(6);
    expect(Math.abs(high.boosts[0].delta)).toBeLessThanOrEqual(10);
  });

  it('keeps Signal Quality failures as warnings instead of failing the run', async () => {
    const setup = service({ qualityService: { summary: jest.fn().mockRejectedValue(new Error('quality offline')) } });
    const result = await setup.instance.run({ batchSize: 1, offset: 0, region: 'IN', assetType: 'STOCK' });
    expect(result.failedCount).toBe(0);
    expect(result.passthroughCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(result.warnings.join(' ')).toContain('Signal Quality diagnostics unavailable');
    expect(result.results[0].calibratedConfidence).toBe('INSUFFICIENT_SAMPLE');
    expect(result.results[0].calibrationReadiness).toMatchObject({
      status: 'UNAVAILABLE',
      downstreamInfluence: 'NONE',
      authoritativeScore: 'RAW_SCORE',
    });
    expect(result.calibrationReadiness).toMatchObject({ status: 'UNAVAILABLE', downstreamInfluence: 'NONE' });
  });

  it('runs calibration for one latest-signal batch with progress metadata', async () => {
    const setup = service({
      signalService: {
        latestSignalUniverse: jest.fn().mockResolvedValue([rawSignal({ instrument_id: 'stock-1' }), rawSignal({ instrument_id: 'stock-2', symbol: 'MSFT' })]),
        latestSignalUniverseCount: jest.fn().mockResolvedValue(5),
      },
    });
    const result = await setup.instance.run({ batchSize: 2, offset: 2 });
    expect(setup.signalService.latestSignalUniverse).toHaveBeenCalledWith(expect.objectContaining({ limit: 2, offset: 2 }));
    expect(result).toMatchObject({
      processedCount: 2,
      totalCount: 5,
      batchSize: 2,
      offset: 2,
      nextOffset: 4,
      hasMore: true,
      calibratedCount: 2,
      passthroughCount: 0,
      skippedCount: 0,
      failedCount: 0,
      selectedHorizon: '20D',
    });
    expect(result.calibrationEvidence).toMatchObject({ horizon: '20D', evidenceStatus: 'SUFFICIENT' });
    expect(result.calibrationReadiness).toMatchObject({ status: 'USABLE', downstreamInfluence: 'NORMAL' });
  });

  it('runs explicit instrument calibration from persisted raw signals only', async () => {
    const latestPersistedForInstruments = jest.fn().mockResolvedValue([
      rawSignal({ instrument_id: 'stock-1' }),
      rawSignal({ instrument_id: 'stock-2', symbol: 'MSFT' }),
    ]);
    const latestSignalUniverse = jest.fn();
    const latestSignalUniverseCount = jest.fn();
    const signalRun = jest.fn();
    const latestForInstrument = jest.fn();
    const setup = service({
      signalService: {
        latestPersistedForInstruments,
        latestSignalUniverse,
        latestSignalUniverseCount,
        run: signalRun,
        latestForInstrument,
      },
    });

    const result = await setup.instance.run({
      instrumentIds: ['stock-2', 'stock-1', 'stock-2'],
      batchSize: 25,
      offset: 10,
      region: 'IN',
      assetType: 'STOCK',
    });

    expect(latestPersistedForInstruments).toHaveBeenCalledWith(['stock-2', 'stock-1']);
    expect(latestSignalUniverse).not.toHaveBeenCalled();
    expect(latestSignalUniverseCount).not.toHaveBeenCalled();
    expect(signalRun).not.toHaveBeenCalled();
    expect(latestForInstrument).not.toHaveBeenCalled();
    expect(setup.repository.create).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      processedCount: 2,
      totalCount: 2,
      batchSize: 2,
      offset: 0,
      nextOffset: null,
      hasMore: false,
      skippedCount: 0,
      failedCount: 0,
    });
  });

  it('counts requested explicit instruments without persisted raw signals as skipped', async () => {
    const setup = service({
      signalService: {
        latestPersistedForInstruments: jest.fn().mockResolvedValue([
          rawSignal({ instrument_id: 'stock-1' }),
        ]),
        latestSignalUniverse: jest.fn(),
        latestSignalUniverseCount: jest.fn(),
        run: jest.fn(),
        latestForInstrument: jest.fn(),
      },
    });

    const result = await setup.instance.run({
      instrumentIds: ['stock-1', 'stock-2', 'stock-2'],
      region: 'IN',
      assetType: 'STOCK',
    });

    expect(setup.repository.create).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      generated: 1,
      processedCount: 1,
      totalCount: 2,
      skippedCount: 1,
      failedCount: 0,
      hasMore: false,
    });
    expect(result.warnings.join(' ')).toContain('1 requested instruments did not have persisted raw signals');
  });

  it('attaches conservative readiness to existing persisted rows without stored evidence', async () => {
    const setup = service({
      repository: {
        latestForInstrument: jest.fn().mockResolvedValue({
          ...service().instance.calibrate(rawSignal(), context()),
          calibrationEvidence: null,
          calibrationReadiness: null,
        }),
      },
      qualityService: {
        summary: jest.fn().mockResolvedValue({
          dataStatus: 'PARTIAL',
          evaluationDiagnostics: { evaluatedSignals: 0 },
          horizonAvailability: { '20D': { eligible: 10, evaluated: 0, insufficientFuturePrice: 10 } },
        }),
      },
    });
    const latest = await setup.instance.latestForInstrument('stock-1');
    expect(latest?.calibrationReadiness).toMatchObject({
      status: 'UNAVAILABLE',
      downstreamInfluence: 'NONE',
      authoritativeScore: 'RAW_SCORE',
      calibrationApplied: false,
    });
    expect(latest?.calibratedConfidence).toBe('INSUFFICIENT_SAMPLE');
  });

  it('does not downgrade persisted table rows to insufficient sample when current summary evidence is sufficient', async () => {
    const persisted = {
      ...service().instance.calibrate(rawSignal(), context()),
      calibrationEvidence: null,
      calibrationReadiness: null,
      calibratedConfidence: 'HIGH' as const,
      boosts: [],
      penalties: [],
      groupEvaluatedSamples: undefined,
    };
    const setup = service({
      repository: {
        top: jest.fn().mockResolvedValue({
          items: [persisted],
          totalCount: 1,
          limit: 25,
          offset: 0,
          hasMore: false,
          sortBy: 'calibratedScore',
          sortDirection: 'desc',
        }),
      },
      qualityService: {
        summary: jest.fn().mockResolvedValue({
          dataStatus: 'COMPLETE',
          evaluationDiagnostics: { evaluatedSignals: 220 },
          horizonAvailability: { '20D': { eligible: 220, evaluated: 220, insufficientFuturePrice: 0 } },
        }),
      },
    });

    const page = await setup.instance.top({ region: 'IN', assetType: 'STOCK', limit: 25, offset: 0, sortBy: 'calibratedScore', sortDirection: 'desc' });

    expect(page.items[0].calibratedConfidence).toBe('HIGH');
    expect(page.items[0].confidenceTier).toBe('HIGH');
    expect(page.items[0].calibrationReadiness).toMatchObject({
      status: 'USABLE',
      downstreamInfluence: 'NORMAL',
      authoritativeScore: 'CALIBRATED_SCORE',
    });
  });

  it('loads Signal Quality grouping metrics once per batch instead of once per signal', async () => {
    const setup = service({
      signalService: {
        latestSignalUniverse: jest.fn().mockResolvedValue([
          rawSignal({ instrument_id: 'stock-1' }),
          rawSignal({ instrument_id: 'stock-2', symbol: 'MSFT' }),
          rawSignal({ instrument_id: 'stock-3', symbol: 'GOOG' }),
        ]),
        latestSignalUniverseCount: jest.fn().mockResolvedValue(3),
      },
    });
    await setup.instance.run({ batchSize: 3, offset: 0, region: 'IN', assetType: 'STOCK' });
    expect(setup.qualityService.byType).toHaveBeenCalledTimes(1);
    expect(setup.qualityService.byScoreBucket).toHaveBeenCalledTimes(1);
    expect(setup.qualityService.bySector).toHaveBeenCalledTimes(1);
    expect(setup.qualityService.noisy).toHaveBeenCalledTimes(1);
  });

  it('batch-loads Data Quality evaluations once for calibration run signals', async () => {
    const setup = service({
      signalService: {
        latestSignalUniverse: jest.fn().mockResolvedValue([
          rawSignal({ instrument_id: 'stock-1' }),
          rawSignal({ instrument_id: 'stock-2', symbol: 'MSFT' }),
          rawSignal({ instrument_id: 'stock-3', symbol: 'GOOG' }),
        ]),
        latestSignalUniverseCount: jest.fn().mockResolvedValue(3),
      },
      dataQualityService: {
        getEvaluationsForInstruments: jest.fn().mockResolvedValue([
          { instrumentId: 'stock-1', coverageStatus: 'GOOD', signalReadinessStatus: 'READY', liquidityStatus: 'LIQUID', eligibleForSignals: true, eligibleForCalibration: true, warnings: [], readinessBlockers: [] },
          { instrumentId: 'stock-2', coverageStatus: 'GOOD', signalReadinessStatus: 'READY', liquidityStatus: 'LIQUID', eligibleForSignals: true, eligibleForCalibration: true, warnings: [], readinessBlockers: [] },
        ]),
        getLatestEvaluationForInstrument: jest.fn().mockResolvedValue(null),
      },
    });

    await setup.instance.run({ batchSize: 3, offset: 0, region: 'IN', assetType: 'STOCK' });

    expect(setup.dataQualityService.getEvaluationsForInstruments).toHaveBeenCalledTimes(1);
    expect(setup.dataQualityService.getEvaluationsForInstruments).toHaveBeenCalledWith(['stock-1', 'stock-2', 'stock-3']);
    expect(setup.dataQualityService.getLatestEvaluationForInstrument).not.toHaveBeenCalled();
  });

  it('skips expensive quality grouping and historical context lookups when the selected horizon has no evaluated outcomes', async () => {
    const signals = [
      rawSignal({ instrument_id: 'stock-1' }),
      rawSignal({ instrument_id: 'stock-2', symbol: 'MSFT' }),
    ];
    const setup = service({
      signalService: {
        latestSignalUniverse: jest.fn().mockResolvedValue(signals),
        latestSignalUniverseCount: jest.fn().mockResolvedValue(signals.length),
      },
      qualityService: {
        summary: jest.fn().mockResolvedValue({
          dataStatus: 'PARTIAL',
          evaluationDiagnostics: { evaluatedSignals: 0 },
          horizonAvailability: {
            '20D': { eligible: 2, evaluated: 0, insufficientFuturePrice: 2 },
          },
        }),
        byType: jest.fn().mockResolvedValue([]),
        byScoreBucket: jest.fn().mockResolvedValue([]),
        bySector: jest.fn().mockResolvedValue([]),
        noisy: jest.fn().mockResolvedValue([]),
      },
      contextService: {
        lookup: jest.fn(),
      },
      dataQualityService: {
        getEvaluationsForInstruments: jest.fn().mockResolvedValue([]),
        getLatestEvaluationForInstrument: jest.fn().mockResolvedValue(null),
      },
    });

    const result = await setup.instance.run({ batchSize: 2, offset: 0, region: 'IN', assetType: 'STOCK', horizon: '20D' });

    expect(result.processedCount).toBe(2);
    expect(result.passthroughCount).toBe(2);
    expect(setup.qualityService.byType).not.toHaveBeenCalled();
    expect(setup.qualityService.byScoreBucket).not.toHaveBeenCalled();
    expect(setup.qualityService.bySector).not.toHaveBeenCalled();
    expect(setup.qualityService.noisy).not.toHaveBeenCalled();
    expect(setup.contextService.lookup).not.toHaveBeenCalled();
    expect(setup.dataQualityService.getEvaluationsForInstruments).toHaveBeenCalledWith(['stock-1', 'stock-2']);
  });

  it('processes calibration run signals with bounded concurrency', async () => {
    let activeLookups = 0;
    let maxActiveLookups = 0;
    const delayedLookup = jest.fn().mockImplementation(async () => {
      activeLookups += 1;
      maxActiveLookups = Math.max(maxActiveLookups, activeLookups);
      await new Promise((resolve) => setTimeout(resolve, 5));
      activeLookups -= 1;
      return {
        market: { regime: 'RISK_ON' },
        sector: { leadershipStatus: 'LEADING' },
        smartMoney: { status: 'ACCUMULATION' },
        dataQuality: { hasLatestPrice: true, priceHistoryDays: 260, hasFundamentals: true },
        gaps: [],
      };
    });
    const signals = Array.from({ length: 10 }, (_, index) => rawSignal({
      id: `signal-${index + 1}`,
      instrument_id: `stock-${index + 1}`,
      symbol: `SYM${index + 1}`,
    }));
    const setup = service({
      signalService: {
        latestSignalUniverse: jest.fn().mockResolvedValue(signals),
        latestSignalUniverseCount: jest.fn().mockResolvedValue(signals.length),
      },
      contextService: {
        lookup: delayedLookup,
      },
    });

    const result = await setup.instance.run({ batchSize: 10, offset: 0, region: 'IN', assetType: 'STOCK' });

    expect(result.processedCount).toBe(10);
    expect(delayedLookup).toHaveBeenCalledTimes(10);
    expect(maxActiveLookups).toBeGreaterThan(1);
    expect(maxActiveLookups).toBeLessThanOrEqual(4);
  });

  it('keeps single instrument calibration behavior working', async () => {
    const setup = service();
    const result = await setup.instance.run({ instrumentId: 'stock-1' });
    expect(setup.signalService.latestForInstrument).toHaveBeenCalledWith('stock-1');
    expect(result).toMatchObject({ processedCount: 1, totalCount: 1, batchSize: 1, hasMore: false });
  });

  it('continues a batch when one instrument fails', async () => {
    const setup = service({
      repository: {
        create: jest
          .fn()
          .mockRejectedValueOnce(new Error('write failed'))
          .mockImplementation(async (result) => ({ ...result, id: 'calibration-2' })),
      },
      signalService: {
        latestSignalUniverse: jest.fn().mockResolvedValue([rawSignal({ instrument_id: 'stock-1' }), rawSignal({ instrument_id: 'stock-2', symbol: 'MSFT' })]),
        latestSignalUniverseCount: jest.fn().mockResolvedValue(2),
      },
    });
    const result = await setup.instance.run({ batchSize: 2, offset: 0 });
    expect(result).toMatchObject({ processedCount: 2, calibratedCount: 1, failedCount: 1, hasMore: false });
    expect(result.warnings[0]).toContain('write failed');
  });

  it('does not persist comparison for instruments outside requested market scope', async () => {
    const setup = service({
      repository: {
        instrumentInScope: jest.fn().mockResolvedValue(null),
      },
    });
    const result = await setup.instance.compare('stock-1', 'IN', 'STOCK', '20D');
    expect(result).toBeNull();
    expect(setup.repository.create).not.toHaveBeenCalled();
  });

  it('counts single-instrument out-of-scope calibration as skipped, not passthrough', async () => {
    const setup = service({
      repository: {
        instrumentInScope: jest.fn().mockResolvedValue(null),
      },
    });
    const result = await setup.instance.run({ instrumentId: 'stock-1', region: 'IN', assetType: 'STOCK' });
    expect(result).toMatchObject({
      processedCount: 1,
      calibratedCount: 0,
      passthroughCount: 0,
      skippedCount: 1,
      outOfScopeSkipped: 1,
      failedCount: 0,
    });
    expect(setup.repository.create).not.toHaveBeenCalled();
  });
});

// ── CB-4: calibration direction label cut-points match engine thresholds ──────

describe('CB-4 calibration direction cut-points unified with engine (BULLISH>=60 / BEARISH<=40)', () => {
  // calibratedDirection is derived from calibratedScore (after boosts/penalties).
  // We use INSUFFICIENT_SAMPLE context (0 evaluated samples) so calibrationApplied=false
  // and calibratedScore == rawScore, giving us a clean 1:1 mapping to test the cut-points.
  const noCalibrationContext = (): CalibrationContext => context({
    horizonAvailability: {
      '1D': { eligible: 0, evaluated: 0, insufficientFuturePrice: 0 },
      '5D': { eligible: 0, evaluated: 0, insufficientFuturePrice: 0 },
      '10D': { eligible: 0, evaluated: 0, insufficientFuturePrice: 0 },
      '20D': { eligible: 0, evaluated: 0, insufficientFuturePrice: 0 },
      '60D': { eligible: 0, evaluated: 0, insufficientFuturePrice: 0 },
    },
    evaluationDiagnostics: { evaluatedSignals: 0 },
    signalTypeMetrics: new Map(),
    scoreBucketMetric: null,
    sectorMetric: null,
  });

  it('calibratedScore == rawScore when calibration is not applied (passthrough)', () => {
    const svc = service().instance;
    const result = svc.calibrate(rawSignal({ score: 65 }), noCalibrationContext());
    // With INSUFFICIENT_SAMPLE evidence, calibration is not applied → calibratedScore = rawScore
    expect(result.calibrationApplied).toBe(false);
    expect(result.calibratedScore).toBe(result.rawScore);
  });

  it('calibratedDirection matches calibratedScore using BULLISH>=60 cut-point', () => {
    const svc = service().instance;
    // Use a score well above the old 70-threshold but in the 60-69 zone
    // With no calibration applied, calibratedScore == rawScore → direction test is clean
    const result65 = svc.calibrate(rawSignal({ score: 65 }), noCalibrationContext());
    expect(result65.calibratedScore).toBe(65);
    expect(result65.calibratedDirection).toBe('BULLISH'); // old code would give NEUTRAL (cut was 70)
  });

  it('calibratedDirection is NEUTRAL for calibratedScore in 41-59 band', () => {
    const svc = service().instance;
    const result50 = svc.calibrate(rawSignal({ score: 50 }), noCalibrationContext());
    expect(result50.calibratedScore).toBe(50);
    expect(result50.calibratedDirection).toBe('NEUTRAL');
  });

  it('calibratedDirection is BEARISH for calibratedScore at 40', () => {
    const svc = service().instance;
    const result40 = svc.calibrate(rawSignal({ score: 40 }), noCalibrationContext());
    expect(result40.calibratedScore).toBe(40);
    expect(result40.calibratedDirection).toBe('BEARISH');
  });

  it('calibratedDirection is BULLISH for calibratedScore at 60', () => {
    const svc = service().instance;
    const result60 = svc.calibrate(rawSignal({ score: 60 }), noCalibrationContext());
    expect(result60.calibratedScore).toBe(60);
    expect(result60.calibratedDirection).toBe('BULLISH');
  });
});
