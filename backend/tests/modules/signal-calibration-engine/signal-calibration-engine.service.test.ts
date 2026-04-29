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
  signalTypeMetrics: new Map([['PRICE_ABOVE_SMA50', { winRate: 0.65, averageForwardReturn: 0.04, sampleSize: 30 }]]),
  scoreBucketMetric: { winRate: 0.62, averageForwardReturn: 0.03, sampleSize: 25 },
  sectorMetric: { winRate: 0.61, averageForwardReturn: 0.02, sampleSize: 20 },
  regime: 'RISK_ON',
  sectorLeadership: 'LEADING',
  smartMoneyStatus: 'ACCUMULATION',
  dataQuality: { hasLatestPrice: true, priceHistoryDays: 260, hasFundamentals: true },
  noisyIssueTypes: [],
  dataGaps: [],
  ...overrides,
});

function service(overrides: Record<string, any> = {}) {
  const repository = {
    create: jest.fn(async (result) => ({ ...result, id: 'calibration-1' })),
    latestForInstrument: jest.fn().mockResolvedValue(null),
    top: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue({ total: 0, latestGeneratedAt: null }),
    ...overrides.repository,
  };
  const signalService = {
    latestForInstrument: jest.fn().mockResolvedValue(rawSignal()),
    run: jest.fn().mockResolvedValue({ results: [rawSignal()] }),
    topSignals: jest.fn().mockResolvedValue([rawSignal()]),
    latestSignalUniverse: jest.fn().mockResolvedValue([rawSignal()]),
    latestSignalUniverseCount: jest.fn().mockResolvedValue(1),
    ...overrides.signalService,
  };
  const qualityService = {
    byType: jest.fn().mockResolvedValue([{ signalType: 'PRICE_ABOVE_SMA50', winRate: 0.65, averageForwardReturn: 0.04, sampleSize: 30 }]),
    byScoreBucket: jest.fn().mockResolvedValue([{ group: '70-84', winRate: 0.62, averageForwardReturn: 0.03, sampleSize: 25 }]),
    bySector: jest.fn().mockResolvedValue([{ group: 'Technology', winRate: 0.61, averageForwardReturn: 0.02, sampleSize: 20 }]),
    noisy: jest.fn().mockResolvedValue([]),
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
  return {
    repository,
    signalService,
    instance: new SignalCalibrationEngineService(repository as any, signalService as any, qualityService as any, contextService as any),
  };
}

describe('signal calibration engine service', () => {
  it('boosts aligned high-quality bullish signals', () => {
    const result = service().instance.calibrate(rawSignal(), context());
    expect(result.calibratedScore).toBeGreaterThan(result.rawScore);
    expect(result.boosts.map((item) => item.type)).toEqual(expect.arrayContaining(['SIGNAL_TYPE', 'REGIME', 'SECTOR', 'SMART_MONEY']));
    expect(result.calibratedConfidence).toBe('HIGH');
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
  });

  it('returns model and health metadata', async () => {
    expect(service().instance.model()).toMatchObject({ calibrationModelVersion: 'signal-calibration-v1', totalDeltaCap: 25 });
    await expect(service().instance.health()).resolves.toMatchObject({ module: 'signal-calibration-engine', dataStatus: 'MISSING' });
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
      failedCount: 0,
    });
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
});
