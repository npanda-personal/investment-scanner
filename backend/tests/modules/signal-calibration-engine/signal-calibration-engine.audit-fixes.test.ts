/// <reference types="@types/jest" />
import {
  SignalCalibrationEngineService,
  CalibrationScorer,
  CalibrationEvidenceBuilder,
  DEFAULT_CALIBRATION_POLICY,
  resolveCalibrationPolicy,
  type CalibrationPolicy,
  type CalibrationContext,
  type SignalLikeForCalibration,
} from '../../../src/modules/signal-calibration-engine';
import { parseCalibrationQuery, parseCalibrationRunRequest } from '../../../src/modules/signal-calibration-engine';

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

const sufficientContext = (overrides: Partial<CalibrationContext> = {}): CalibrationContext => ({
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

function service(overrides: Record<string, any> = {}, policyResolver?: (scope: any) => CalibrationPolicy) {
  const repository = {
    create: jest.fn(async (result) => ({ ...result, id: 'calibration-1' })),
    latestForInstrument: jest.fn().mockResolvedValue(null),
    latestForInstruments: jest.fn().mockResolvedValue([]),
    instrumentInScope: jest.fn().mockResolvedValue({ id: 'stock-1', region: 'IN', exchange: 'NSE', assetType: 'STOCK' }),
    top: jest.fn().mockResolvedValue({ items: [], totalCount: 0, limit: 25, offset: 0, hasMore: false, sortBy: 'calibratedScore', sortDirection: 'desc' }),
    count: jest.fn().mockResolvedValue({ total: 0, latestGeneratedAt: null }),
    ...overrides.repository,
  };
  const signalService = {
    latestForInstrument: jest.fn().mockResolvedValue(rawSignal()),
    latestPersistedForInstruments: jest.fn().mockResolvedValue([rawSignal()]),
    run: jest.fn().mockResolvedValue({ results: [rawSignal()] }),
    latestSignalUniverse: jest.fn().mockResolvedValue([rawSignal()]),
    latestSignalUniverseCount: jest.fn().mockResolvedValue(1),
    ...overrides.signalService,
  };
  const qualityService = {
    byType: jest.fn().mockResolvedValue([]),
    byScoreBucket: jest.fn().mockResolvedValue([]),
    bySector: jest.fn().mockResolvedValue([]),
    noisy: jest.fn().mockResolvedValue([]),
    summary: jest.fn().mockResolvedValue({
      generatedAt: '2026-05-10T09:30:00.000Z',
      dataStatus: 'PARTIAL',
      evaluationDiagnostics: { evaluatedSignals: 220, latestAvailablePriceDate: '2026-05-10', nextEvaluableDate: null },
      horizonAvailability: { '20D': { eligible: 220, evaluated: 220, insufficientFuturePrice: 0 } },
    }),
    ...overrides.qualityService,
  };
  const contextService = {
    lookup: jest.fn().mockResolvedValue({
      market: { regime: 'RISK_ON' }, sector: { leadershipStatus: 'LEADING' }, smartMoney: { status: 'ACCUMULATION' },
      dataQuality: { hasLatestPrice: true, priceHistoryDays: 260, hasFundamentals: true }, gaps: [],
    }),
    ...overrides.contextService,
  };
  const dataQualityService = {
    getLatestEvaluationForInstrument: jest.fn().mockResolvedValue(null),
    getEvaluationsForInstruments: jest.fn().mockResolvedValue([]),
    getEligibility: jest.fn().mockResolvedValue([]),
    ...overrides.dataQualityService,
  };
  return {
    repository, signalService, qualityService, contextService, dataQualityService,
    instance: new SignalCalibrationEngineService(
      repository as any, signalService as any, qualityService as any, contextService as any, dataQualityService as any,
      policyResolver
    ),
  };
}

describe('CalibrationPolicy injection (§3b, §1c)', () => {
  it('default policy reproduces the historical model constants', () => {
    expect(DEFAULT_CALIBRATION_POLICY.calibrationModelVersion).toBe('signal-calibration-v2');
    expect(DEFAULT_CALIBRATION_POLICY.samples.minOverall).toBe(50);
    expect(DEFAULT_CALIBRATION_POLICY.samples.minGroup).toBe(20);
    expect(DEFAULT_CALIBRATION_POLICY.totalDeltaCap).toBe(25);
    expect(DEFAULT_CALIBRATION_POLICY.adjustmentCaps).toEqual({ HIGH: 10, MEDIUM: 6, LOW: 3, INSUFFICIENT_SAMPLE: 1 });
  });

  it('resolveCalibrationPolicy returns the default when no override is registered', () => {
    expect(resolveCalibrationPolicy({ region: 'US', assetType: 'STOCK' })).toBe(DEFAULT_CALIBRATION_POLICY);
  });

  it('a scoped policy with a tighter total-delta cap bounds the calibrated score delta', () => {
    const tightPolicy: CalibrationPolicy = {
      ...DEFAULT_CALIBRATION_POLICY,
      totalDeltaCap: 2,
    };
    const scorer = new CalibrationScorer(tightPolicy, new CalibrationEvidenceBuilder(tightPolicy));
    const result = scorer.calibrate(rawSignal(), sufficientContext());
    // Default policy would yield a much larger positive delta; the tight cap clamps it.
    expect(result.scoreDelta).toBeLessThanOrEqual(2);
    expect(result.scoreDelta).toBeGreaterThan(0);
  });

  it('a scoped policy with a higher per-adjustment cap lets a single boost grow larger', () => {
    const loosePolicy: CalibrationPolicy = {
      ...DEFAULT_CALIBRATION_POLICY,
      qualityCutoffs: {
        ...DEFAULT_CALIBRATION_POLICY.qualityCutoffs,
        signalType: { boostWinRate: 0.58, penaltyWinRate: 0.45, boostDelta: 9, penaltyDelta: -5 },
      },
    };
    const scorer = new CalibrationScorer(loosePolicy, new CalibrationEvidenceBuilder(loosePolicy));
    const result = scorer.calibrate(rawSignal(), sufficientContext());
    const signalTypeBoost = result.boosts.find((b) => b.type === 'SIGNAL_TYPE');
    // HIGH tier cap is 10, so a boostDelta of 9 survives intact (default boostDelta=4).
    expect(signalTypeBoost?.delta).toBe(9);
  });
});

describe('configurable default scope (§3c)', () => {
  it('parseCalibrationQuery defaults region/assetType from config', () => {
    const parsed = parseCalibrationQuery({});
    expect(parsed.region).toBe('IN');
    expect(parsed.assetType).toBe('STOCK');
  });

  it('parseCalibrationRunRequest defaults region/assetType from config', () => {
    const parsed = parseCalibrationRunRequest({});
    expect(parsed.region).toBe('IN');
    expect(parsed.assetType).toBe('STOCK');
  });

  it('the engine resolves a per-scope policy via the injected resolver', async () => {
    const usPolicy: CalibrationPolicy = { ...DEFAULT_CALIBRATION_POLICY, runConcurrency: 1 };
    const resolver = jest.fn((scope: any) => (scope.region === 'US' ? usPolicy : DEFAULT_CALIBRATION_POLICY));
    const setup = service({}, resolver);
    await setup.instance.run({ batchSize: 1, offset: 0, region: 'US', assetType: 'STOCK' });
    expect(resolver).toHaveBeenCalledWith(expect.objectContaining({ region: 'US', assetType: 'STOCK' }));
  });
});

describe('explicit instrumentIds scope enforcement (§1f)', () => {
  it('skips instruments outside the requested market scope in an explicit batch', async () => {
    const setup = service({
      repository: {
        instrumentInScope: jest.fn(async (instrumentId: string) => (instrumentId === 'stock-2' ? null : { id: instrumentId, region: 'IN', exchange: 'NSE', assetType: 'STOCK' })),
      },
      signalService: {
        latestPersistedForInstruments: jest.fn().mockResolvedValue([
          rawSignal({ instrument_id: 'stock-1' }),
          rawSignal({ instrument_id: 'stock-2', symbol: 'MSFT' }),
        ]),
      },
    });
    const result = await setup.instance.run({ instrumentIds: ['stock-1', 'stock-2'], region: 'IN', assetType: 'STOCK' });
    expect(result.outOfScopeSkipped).toBe(1);
    expect(result.calibratedCount).toBe(1);
    expect(setup.repository.create).toHaveBeenCalledTimes(1);
    expect(result.warnings.join(' ')).toContain('outside requested market scope');
  });
});

describe('evidenceStatus filter (§1e)', () => {
  function persistedItem(svc: SignalCalibrationEngineService, overrides: Partial<SignalLikeForCalibration> = {}) {
    return { ...svc.calibrate(rawSignal(overrides), sufficientContext()), calibrationEvidence: null, calibrationReadiness: null };
  }

  it('returns only items matching the requested evidenceStatus', async () => {
    const probe = service().instance;
    const items = [
      persistedItem(probe, { instrument_id: 'stock-1', symbol: 'AAA' }),
      persistedItem(probe, { instrument_id: 'stock-2', symbol: 'BBB' }),
    ];
    const setup = service({
      repository: {
        top: jest.fn().mockResolvedValue({ items, totalCount: items.length, limit: 25, offset: 0, hasMore: false, sortBy: 'calibratedScore', sortDirection: 'desc' }),
      },
    });
    const matching = await setup.instance.top({ limit: 25, region: 'IN', assetType: 'STOCK', horizon: '20D', evidenceStatus: 'SUFFICIENT' });
    expect(matching.items.length).toBe(2);
    expect(matching.items.every((i) => i.evidenceStatus === 'SUFFICIENT')).toBe(true);

    const none = await setup.instance.top({ limit: 25, region: 'IN', assetType: 'STOCK', horizon: '20D', evidenceStatus: 'MISSING' });
    expect(none.items.length).toBe(0);
    expect(none.totalCount).toBe(0);
  });
});
