import { TradePlanRiskEngineRepository } from '../../../src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository';
import type { TradePlanResultDto } from '../../../src/modules/trade-plan-risk-engine';

const record = (overrides: Record<string, any> = {}) => ({
  id: 'plan-1',
  instrumentId: 'INST-1',
  strategyDecisionId: 'DEC-1',
  portfolioId: null,
  portfolioKey: 'NO_PORTFOLIO',
  symbol: 'TEST',
  region: 'IN',
  assetType: 'STOCK',
  strategy: 'TREND_MOMENTUM',
  strategyVersion: '1.0.0',
  strategyRating: 'GOOD',
  readinessLabel: 'PAPER_TEST_CANDIDATE',
  backtestTimeframe: '3Y',
  backtestSummary: { timeframe: '3Y', ratingGrade: 'GOOD' },
  strategyProofSnapshot: { proofStatus: 'AVAILABLE', frameworkBacked: true },
  strategyDecisionSnapshot: { decision: 'TRADE_CANDIDATE' },
  latestPrice: 100,
  latestPriceTimestamp: new Date('2026-05-06T00:00:00.000Z'),
  marketDataSnapshot: { latestPrice: 100 },
  dataQualitySnapshot: { coverageStatus: 'GOOD' },
  paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
  paperReadinessReasons: ['Ready'],
  paperReadinessBlockers: [],
  proofGeneratedAt: new Date('2026-05-07T00:00:00.000Z'),
  snapshotVersion: 'trade-plan-proof-snapshot-v1',
  planStatus: 'VALID',
  riskGrade: 'LOW',
  entryZone: null,
  stopLoss: null,
  target: null,
  rewardRiskRatio: 2,
  positionSizing: null,
  portfolioImpact: null,
  invalidationRules: [],
  warnings: [],
  blockers: [],
  dataGaps: [],
  modelVersion: 'trade-plan-risk-v1',
  generatedAt: new Date('2026-05-07T01:00:00.000Z'),
  generatedDate: new Date('2026-05-07T00:00:00.000Z'),
  ...overrides,
});

const dto = (overrides: Partial<TradePlanResultDto> = {}): TradePlanResultDto => ({
  instrumentId: 'INST-1',
  symbol: 'TEST',
  region: 'IN',
  assetType: 'STOCK',
  strategy: 'TREND_MOMENTUM',
  strategyVersion: '1.0.0',
  strategyDecisionId: 'DEC-1',
  portfolioId: null,
  strategyRating: 'GOOD',
  readinessLabel: 'PAPER_TEST_CANDIDATE',
  backtestTimeframe: '3Y',
  backtestSummary: { timeframe: '3Y', cagr: 0.1, maxDrawdown: -0.1, sharpe: 1, winRate: 0.6, profitFactor: 1.4, tradeCount: 30, ratingGrade: 'GOOD', availabilityStatus: 'AVAILABLE', generatedAt: '2026-05-07T00:00:00.000Z' },
  strategyProofSnapshot: { strategyCode: 'TREND_MOMENTUM', strategyVersion: '1.0.0', strategyRating: 'GOOD', readinessLabel: 'PAPER_TEST_CANDIDATE', frameworkBacked: true, backtestTimeframe: '3Y', backtestSummary: null, proofStatus: 'AVAILABLE', proofWarnings: [] },
  strategyDecisionSnapshot: { strategyDecisionId: 'DEC-1', decision: 'TRADE_CANDIDATE', action: 'CONSIDER_ENTRY', decisionScore: 90, confidence: 'HIGH', marketGate: 'OPEN', marketCondition: 'HEALTHY', frameworkBacked: true, reasons: [], blockers: [], warnings: [], dataGaps: [], generatedAt: '2026-05-07T00:00:00.000Z' },
  latestPrice: 100,
  latestPriceTimestamp: '2026-05-06T00:00:00.000Z',
  marketDataSnapshot: { instrumentId: 'INST-1', symbol: 'TEST', latestPrice: 100, latestPriceTimestamp: '2026-05-06T00:00:00.000Z', latestCompletedTradingDate: '2026-05-06T00:00:00.000Z', latestStoredTradingDate: '2026-05-06T00:00:00.000Z', currency: 'INR', exchange: 'NSE', region: 'IN', assetType: 'STOCK', dataStatus: 'COMPLETE' },
  dataQualitySnapshot: { status: 'AVAILABLE', coverageStatus: 'GOOD', signalReadinessStatus: 'READY', liquidityStatus: 'LIQUID', coverageScore: 90, signalReadinessScore: 90, liquidityScore: 80, eligibleForSignals: true, warnings: [], blockers: [], generatedAt: '2026-05-07T00:00:00.000Z' },
  paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
  paperReadinessReasons: ['Ready'],
  paperReadinessBlockers: [],
  proofGeneratedAt: '2026-05-07T00:00:00.000Z',
  snapshotVersion: 'trade-plan-proof-snapshot-v1',
  planStatus: 'VALID',
  riskGrade: 'LOW',
  entryZone: null,
  stopLoss: null,
  target: null,
  rewardRiskRatio: 2,
  positionSizing: null,
  portfolioImpact: null,
  invalidationRules: [],
  warnings: [],
  blockers: [],
  dataGaps: [],
  generatedAt: '2026-05-07T01:00:00.000Z',
  modelVersion: 'trade-plan-risk-v1',
  ...overrides,
});

const stalePowergridRecord = () => record({
  id: 'plan-powergrid',
  instrumentId: 'cmo2xk6xa0010w5og9g9zg0am',
  symbol: 'POWERGRID.NS',
  latestPrice: 310,
  marketDataSnapshot: { latestPrice: 310 },
  entryZone: {
    type: 'PULLBACK',
    referencePrice: 304.512001953125,
    preferredEntryMin: 298.4217619140625,
    preferredEntryMax: 310.6022419921875,
    quality: 'STRONG',
    rationale: 'Preferred entry near SMA50 pullback support.',
  },
  stopLoss: {
    price: 307.4940060424805,
    method: 'RECENT_SWING_LOW',
    quality: 'STRONG',
    rationale: 'Stop placed slightly below recent 10-day swing low.',
    percentBelowEntry: 2.056380287793535,
  },
  blockers: [],
  paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
  paperReadinessReasons: ['Trade plan status is VALID.', 'Risk grade is LOW.', 'Strategy Framework-backed proof is present.'],
  paperReadinessBlockers: [],
  planStatus: 'VALID',
  riskGrade: 'LOW',
});

const repairedPowergridRecord = () => record({
  ...stalePowergridRecord(),
  planStatus: 'BLOCKED',
  riskGrade: 'HIGH',
  blockers: ['Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.'],
  paperReadinessStatus: 'BLOCKED',
  paperReadinessReasons: [],
  paperReadinessBlockers: [
    'Plan status is BLOCKED; VALID is required.',
    'Trade plan has active blockers.',
    'Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.',
  ],
  stopLoss: {
    ...(stalePowergridRecord().stopLoss as any),
    quality: 'WEAK',
    percentBelowEntry: ((310 - 307.4940060424805) / 310) * 100,
    rationale: 'Stop placed slightly below recent 10-day swing low. Geometry blocked: stop must sit below the long entry-zone floor.',
  },
});

describe('TradePlanRiskEngineRepository snapshot persistence', () => {
  it('upserts same-day plans by instrument, strategy, model, scope, and portfolio key', async () => {
    const repository = new TradePlanRiskEngineRepository() as any;
    const upsert = jest.fn().mockResolvedValue(record());
    repository.db = { tradePlanResult: { upsert } };

    await repository.upsert(dto());

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        instrumentId_strategy_modelVersion_generatedDate_region_assetType_portfolioKey: expect.objectContaining({
          instrumentId: 'INST-1',
          strategy: 'TREND_MOMENTUM',
          modelVersion: 'trade-plan-risk-v1',
          region: 'IN',
          assetType: 'STOCK',
          portfolioKey: 'NO_PORTFOLIO',
        }),
      },
      create: expect.objectContaining({
        region: 'IN',
        assetType: 'STOCK',
        strategyProofSnapshot: expect.any(Object),
        strategyDecisionSnapshot: expect.any(Object),
        marketDataSnapshot: expect.any(Object),
        dataQualitySnapshot: expect.any(Object),
        paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
      }),
      update: expect.objectContaining({
        strategyProofSnapshot: expect.any(Object),
        paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
      }),
    }));
  });

  it('filters candidates by persisted scope and proof fields', async () => {
    const repository = new TradePlanRiskEngineRepository() as any;
    const count = jest.fn().mockResolvedValue(1);
    const findMany = jest.fn().mockResolvedValue([record()]);
    repository.db = { tradePlanResult: { count, findMany } };

    const result = await repository.list({
      region: 'IN',
      assetType: 'STOCK',
      paperReadyOnly: true,
      paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
      backtestTimeframe: '3Y',
      strategyRating: 'GOOD',
      readinessLabel: 'PAPER_TEST_CANDIDATE',
      sortBy: 'paperReadinessStatus',
    });

    expect(count).toHaveBeenCalledWith({ where: expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
      backtestTimeframe: '3Y',
      strategyRating: 'GOOD',
      readinessLabel: 'PAPER_TEST_CANDIDATE',
      strategyProofSnapshot: { path: ['frameworkBacked'], equals: true },
    }) });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { paperReadinessStatus: 'desc' },
    }));
    expect(result.results[0]).toEqual(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      strategyProofSnapshot: { proofStatus: 'AVAILABLE', frameworkBacked: true },
      paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
    }));
  });

  it('repairs stale geometry before paperReadyOnly list filters are counted and returned', async () => {
    const repository = new TradePlanRiskEngineRepository() as any;
    const stale = stalePowergridRecord();
    const findMany = jest.fn()
      .mockResolvedValueOnce([stale])
      .mockResolvedValueOnce([]);
    const count = jest.fn().mockResolvedValue(0);
    const update = jest.fn().mockResolvedValue({});
    repository.db = { tradePlanResult: { findMany, count, update } };

    const result = await repository.list({
      region: 'IN',
      assetType: 'STOCK',
      paperReadyOnly: true,
      limit: 25,
      offset: 0,
    });

    expect(findMany.mock.calls[0][0].where).toEqual(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      strategyProofSnapshot: { path: ['frameworkBacked'], equals: true },
    }));
    expect(findMany.mock.calls[0][0].where).not.toEqual(expect.objectContaining({
      paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
    }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'plan-powergrid' },
      data: expect.objectContaining({
        planStatus: 'BLOCKED',
        riskGrade: 'HIGH',
        paperReadinessStatus: 'BLOCKED',
        paperReadinessReasons: [],
      }),
    }));
    expect(findMany.mock.invocationCallOrder[0]).toBeLessThan(count.mock.invocationCallOrder[0]);
    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
      }),
    });
    expect(result).toEqual({ results: [], total: 0 });
  });

  it('excludes stale geometry rows from READY_FOR_PAPER_REVIEW list filters after repair', async () => {
    const repository = new TradePlanRiskEngineRepository() as any;
    const findMany = jest.fn()
      .mockResolvedValueOnce([stalePowergridRecord()])
      .mockResolvedValueOnce([]);
    const count = jest.fn().mockResolvedValue(0);
    const update = jest.fn().mockResolvedValue({});
    repository.db = { tradePlanResult: { findMany, count, update } };

    const result = await repository.list({
      region: 'IN',
      assetType: 'STOCK',
      paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
      limit: 25,
      offset: 0,
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ paperReadinessStatus: 'BLOCKED' }),
    }));
    expect(result.results).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('can include legacy non-framework-backed plans only when explicitly requested', async () => {
    const repository = new TradePlanRiskEngineRepository() as any;
    const count = jest.fn().mockResolvedValue(1);
    const findMany = jest.fn().mockResolvedValue([record({ strategyProofSnapshot: { proofStatus: 'LEGACY', frameworkBacked: false } })]);
    repository.db = { tradePlanResult: { count, findMany } };

    await repository.list({ region: 'IN', assetType: 'STOCK', includeLegacy: true });

    expect(count).toHaveBeenCalledWith({
      where: expect.not.objectContaining({
        strategyProofSnapshot: expect.anything(),
      }),
    });
  });

  it('filters latest plan lookup by market scope when supplied', async () => {
    const repository = new TradePlanRiskEngineRepository() as any;
    const findFirst = jest.fn().mockResolvedValue(record({ region: 'IN', assetType: 'STOCK' }));
    repository.db = { tradePlanResult: { findFirst } };

    await repository.latestForInstrument('INST-1', 'TREND_MOMENTUM', undefined, { region: 'IN', assetType: 'STOCK' });

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        instrumentId: 'INST-1',
        strategy: 'TREND_MOMENTUM',
        region: 'IN',
        assetType: 'STOCK',
        strategyProofSnapshot: { path: ['frameworkBacked'], equals: true },
      },
      orderBy: { generatedAt: 'desc' },
    }));
  });

  it('repairs persisted stop geometry for latest plan reads', async () => {
    const repository = new TradePlanRiskEngineRepository() as any;
    const findFirst = jest.fn().mockResolvedValue(record({
      instrumentId: 'cmo2xk6xa0010w5og9g9zg0am',
      symbol: 'POWERGRID.NS',
      latestPrice: 310,
      marketDataSnapshot: { latestPrice: 310 },
      entryZone: {
        type: 'PULLBACK',
        referencePrice: 304.512001953125,
        preferredEntryMin: 298.4217619140625,
        preferredEntryMax: 310.6022419921875,
        quality: 'STRONG',
        rationale: 'Preferred entry near SMA50 pullback support.',
      },
      stopLoss: {
        price: 307.4940060424805,
        method: 'RECENT_SWING_LOW',
        quality: 'STRONG',
        rationale: 'Stop placed slightly below recent 10-day swing low.',
        percentBelowEntry: 2.056380287793535,
      },
      blockers: [],
      paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
      paperReadinessReasons: ['Trade plan status is VALID.', 'Risk grade is LOW.', 'Strategy Framework-backed proof is present.'],
      paperReadinessBlockers: [],
      planStatus: 'VALID',
      riskGrade: 'LOW',
    }));
    const update = jest.fn().mockResolvedValue({});
    repository.db = { tradePlanResult: { findFirst, update } };

    const result = await repository.latestForInstrument('cmo2xk6xa0010w5og9g9zg0am', undefined, undefined, { region: 'IN', assetType: 'STOCK' });

    expect(result?.planStatus).toBe('BLOCKED');
    expect(result?.riskGrade).toBe('HIGH');
    expect(result?.paperReadinessStatus).toBe('BLOCKED');
    expect(result?.paperReadinessReasons).toEqual([]);
    expect(result?.blockers).toContain('Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.');
    expect(result?.paperReadinessBlockers).toContain('Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'plan-1' },
      data: expect.objectContaining({
        planStatus: 'BLOCKED',
        riskGrade: 'HIGH',
        paperReadinessStatus: 'BLOCKED',
        paperReadinessReasons: [],
      }),
    }));
  });

  it('returns repaired funnel plans so stale geometry contributes to BLOCKED, not paper-ready', async () => {
    const repository = new TradePlanRiskEngineRepository() as any;
    const latestGeneratedDate = new Date('2026-05-10T00:00:00.000Z');
    const findFirst = jest.fn().mockResolvedValue({ generatedDate: latestGeneratedDate });
    const findMany = jest.fn()
      .mockResolvedValueOnce([stalePowergridRecord()])
      .mockResolvedValueOnce([repairedPowergridRecord()]);
    const update = jest.fn().mockResolvedValue({});
    repository.db = { tradePlanResult: { findFirst, findMany, update } };

    const result = await repository.funnelPlans({ region: 'IN', assetType: 'STOCK' });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        planStatus: 'BLOCKED',
        riskGrade: 'HIGH',
        paperReadinessStatus: 'BLOCKED',
      }),
    }));
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({
      planStatus: 'BLOCKED',
      riskGrade: 'HIGH',
      paperReadinessStatus: 'BLOCKED',
      paperReadinessReasons: [],
    }));
  });

  it('repairs geometry idempotently without duplicating stop-loss rationale text', async () => {
    const repository = new TradePlanRiskEngineRepository() as any;
    const staleRecord = record({
      latestPrice: 310,
      marketDataSnapshot: { latestPrice: 310 },
      entryZone: {
        type: 'PULLBACK',
        referencePrice: 304.512001953125,
        preferredEntryMin: 298.4217619140625,
        preferredEntryMax: 310.6022419921875,
        quality: 'STRONG',
        rationale: 'Preferred entry near SMA50 pullback support.',
      },
      stopLoss: {
        price: 307.4940060424805,
        method: 'RECENT_SWING_LOW',
        quality: 'STRONG',
        rationale: 'Stop placed slightly below recent 10-day swing low.',
        percentBelowEntry: 2.056380287793535,
      },
      blockers: [],
      paperReadinessReasons: ['Trade plan status is VALID.'],
      paperReadinessBlockers: [],
      planStatus: 'VALID',
      riskGrade: 'LOW',
    });
    const repairedRecord = record({
      ...staleRecord,
      planStatus: 'BLOCKED',
      riskGrade: 'HIGH',
      blockers: ['Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.'],
      paperReadinessStatus: 'BLOCKED',
      paperReadinessReasons: [],
      paperReadinessBlockers: [
        'Plan status is BLOCKED; VALID is required.',
        'Trade plan has active blockers.',
        'Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.',
      ],
      stopLoss: {
        ...(staleRecord.stopLoss as any),
        quality: 'WEAK',
        percentBelowEntry: ((310 - 307.4940060424805) / 310) * 100,
        rationale: 'Stop placed slightly below recent 10-day swing low. Geometry blocked: stop must sit below the long entry-zone floor.',
      },
    });
    const findFirst = jest.fn()
      .mockResolvedValueOnce(staleRecord)
      .mockResolvedValueOnce(repairedRecord);
    const update = jest.fn().mockResolvedValue({});
    repository.db = { tradePlanResult: { findFirst, update } };

    const first = await repository.latestForInstrument('INST-1', undefined, undefined, { region: 'IN', assetType: 'STOCK' });
    const second = await repository.latestForInstrument('INST-1', undefined, undefined, { region: 'IN', assetType: 'STOCK' });

    expect(first?.stopLoss?.rationale.match(/Geometry blocked/g)).toHaveLength(1);
    expect(second?.stopLoss?.rationale.match(/Geometry blocked/g)).toHaveLength(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('collapses duplicate legacy geometry rationale text on read repair', async () => {
    const repository = new TradePlanRiskEngineRepository() as any;
    const findFirst = jest.fn().mockResolvedValue(record({
      latestPrice: 310,
      marketDataSnapshot: { latestPrice: 310 },
      entryZone: {
        type: 'PULLBACK',
        referencePrice: 304.512001953125,
        preferredEntryMin: 298.4217619140625,
        preferredEntryMax: 310.6022419921875,
        quality: 'STRONG',
        rationale: 'Preferred entry near SMA50 pullback support.',
      },
      stopLoss: {
        price: 307.4940060424805,
        method: 'RECENT_SWING_LOW',
        quality: 'WEAK',
        rationale: 'Stop placed slightly below recent 10-day swing low. Geometry blocked: stop must sit below the long entry-zone floor. Geometry blocked: stop must sit below the long entry-zone floor.',
        percentBelowEntry: ((310 - 307.4940060424805) / 310) * 100,
      },
      blockers: ['Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.'],
      paperReadinessStatus: 'BLOCKED',
      paperReadinessReasons: [],
      paperReadinessBlockers: [
        'Plan status is BLOCKED; VALID is required.',
        'Trade plan has active blockers.',
        'Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.',
      ],
      planStatus: 'BLOCKED',
      riskGrade: 'HIGH',
    }));
    const update = jest.fn().mockResolvedValue({});
    repository.db = { tradePlanResult: { findFirst, update } };

    const result = await repository.latestForInstrument('INST-1', undefined, undefined, { region: 'IN', assetType: 'STOCK' });

    expect(result?.stopLoss?.rationale.match(/Geometry blocked/g)).toHaveLength(1);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        stopLoss: expect.objectContaining({
          rationale: 'Stop placed slightly below recent 10-day swing low. Geometry blocked: stop must sit below the long entry-zone floor.',
        }),
      }),
    }));
  });

  it('uses the latest generated date for funnel diagnostics by default', async () => {
    const repository = new TradePlanRiskEngineRepository() as any;
    const latestGeneratedDate = new Date('2026-05-10T00:00:00.000Z');
    const findFirst = jest.fn().mockResolvedValue({ generatedDate: latestGeneratedDate });
    const findMany = jest.fn().mockResolvedValue([record({ generatedDate: latestGeneratedDate })]);
    repository.db = { tradePlanResult: { findFirst, findMany } };

    const result = await repository.funnelPlans({ region: 'IN', assetType: 'STOCK' });

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { region: 'IN', assetType: 'STOCK', strategyProofSnapshot: { path: ['frameworkBacked'], equals: true } },
      orderBy: { generatedDate: 'desc' },
      select: { generatedDate: true },
    }));
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { region: 'IN', assetType: 'STOCK', strategyProofSnapshot: { path: ['frameworkBacked'], equals: true }, generatedDate: latestGeneratedDate },
    }));
    expect(result).toHaveLength(1);
  });
});
