/// <reference types="@types/jest" />
import { SignalPositionLedgerService } from '../../../src/modules/signal-position-ledger';

const trustedSignal = {
  id: 'signal-1',
  instrument_id: 'stock-1',
  symbol: 'ABC',
  company_name: 'ABC Co',
  sector: 'Tech',
  country: 'IN',
  currentPrice: null,
  previousClose: null,
  dailyChange: null,
  dailyChangePercent: null,
  currency: null,
  priceTimestamp: null,
  score: 82,
  direction: 'BULLISH' as const,
  confidence: 'HIGH' as const,
  triggered_signals: [],
  negative_signals: [],
  explanation: 'Bullish.',
  generated_at: '2026-05-26T00:00:00.000Z',
  generatedDate: '2026-05-26T00:00:00.000Z',
  sourceDataDate: '2026-05-26T00:00:00.000Z',
  sourcePriceDate: '2026-05-26T00:00:00.000Z',
  modelVersion: 'signal-engine-v1',
  rulesetVersion: 'signal-engine-v1',
  scoringInputSummary: {},
  dataQualityEligibility: { filterApplied: true, eligible: true, signalReadinessStatus: 'READY' },
  auditStatus: 'CURRENT' as const,
  generationRunId: 'run-1',
  source: 'signal-generation-engine',
  data_status: 'COMPLETE' as const,
};

const sourceProvenTrigger = {
  contractVersion: 'TriggerObjectV1' as const,
  contractStatus: 'COMPLETE' as const,
  signal_id: 'signal-1',
  instrument_id: 'stock-1',
  symbol: 'ABC',
  asset_class: 'STOCK',
  region: 'IN',
  strategy_id: 'BREAKOUT_CONFIRMATION',
  strategy_version: '1.0.0',
  trigger_type: 'bullish_entry_trigger' as const,
  trigger_price: 100,
  trigger_timestamp: '2026-05-26T00:00:00.000Z',
  timeframe: 'DAILY',
  entry_rule_id: 'ENTRY_BREAKOUT',
  exit_rule_id: null,
  invalidation_rule_id: null,
  reason_summary: 'Breakout confirmation triggered.',
  passed_conditions: [],
  failed_conditions: [],
  data_quality_status: 'READY',
  lifecycle_status: null,
  created_at: '2026-05-26T00:00:00.000Z',
  updated_at: '2026-05-26T00:00:00.000Z',
  audit: {
    auditStatus: 'CURRENT' as const,
    generationRunId: 'run-1',
    modelVersion: 'signal-engine-v1',
    rulesetVersion: 'signal-engine-v1',
  },
  trigger_price_evidence: {
    status: 'SOURCE_PROVEN' as const,
    source_module: 'signal-generation-engine',
    source_field: 'strategyContext.prices[0].adjusted_close',
    source_timestamp: '2026-05-26T00:00:00.000Z',
    strategy_id: 'BREAKOUT_CONFIRMATION',
    strategy_version: '1.0.0',
    timeframe: 'DAILY',
    entry_rule_ids: ['ENTRY_BREAKOUT'],
    compatibility_only: true,
  },
  unavailable_fields: [],
  incomplete_reasons: [],
};

describe('SignalPositionLedgerService', () => {
  it('keeps only source-proven entry rows and computes current return when trust basis is usable', async () => {
    const repository = {
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [trustedSignal],
        totalCount: 1,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestPriceByInstrumentId: jest.fn().mockResolvedValue({
        date: new Date().toISOString(),
        close: 109,
        adjustedClose: 110,
        dataStatus: 'COMPLETE',
        source: 'database',
      }),
      latestDataQualityByInstrumentId: jest.fn().mockResolvedValue({
        signalReadinessStatus: 'READY',
        coverageStatus: 'GOOD',
        liquidityStatus: 'LIQUID',
        lastEvaluatedAt: new Date().toISOString(),
      }),
      latestExitDecisionByInstrumentId: jest.fn().mockResolvedValue({
        strategy: 'DEFENSIVE_EXIT',
        decision: 'EXIT_CANDIDATE',
        generatedAt: new Date().toISOString(),
      }),
    };
    const signalService = {
      enrichSignals: jest.fn().mockResolvedValue([{ ...trustedSignal, triggerContract: sourceProvenTrigger }]),
    };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);

    const result = await service.listActiveRows({ region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 });

    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      symbol: 'ABC',
      triggerType: 'bullish_entry_trigger',
      currentReturnPercent: 10,
      currentReturnStatus: 'CURRENT',
      healthState: 'EXIT_TRIGGERED',
      lifecycleEvidenceStatus: 'EXIT_COMPATIBILITY_ONLY',
      trustEvidenceStatus: 'SOURCE_PROVEN',
    });
  });

  it('keeps lifecycle evidence unavailable by default and downgrades stale/missing return basis', async () => {
    const staleSignal = { ...trustedSignal, id: 'signal-2', instrument_id: 'stock-2', symbol: 'XYZ', company_name: 'XYZ Co' };
    const repository = {
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [staleSignal],
        totalCount: 1,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestPriceByInstrumentId: jest.fn().mockResolvedValue({
        date: '2026-05-01T00:00:00.000Z',
        close: 95,
        adjustedClose: 95,
        dataStatus: 'COMPLETE',
        source: 'database',
      }),
      latestDataQualityByInstrumentId: jest.fn().mockResolvedValue({
        signalReadinessStatus: 'READY',
        coverageStatus: 'GOOD',
        liquidityStatus: 'LIQUID',
        lastEvaluatedAt: '2026-05-01T00:00:00.000Z',
      }),
      latestExitDecisionByInstrumentId: jest.fn().mockResolvedValue(null),
    };
    const signalService = {
      enrichSignals: jest.fn().mockResolvedValue([{
        ...staleSignal,
        triggerContract: {
          ...sourceProvenTrigger,
          signal_id: 'signal-2',
          instrument_id: 'stock-2',
          symbol: 'XYZ',
          trigger_price: 100,
          trigger_timestamp: '2026-05-01T00:00:00.000Z',
        },
      }]),
    };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);

    const result = await service.listActiveRows({ region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 });

    expect(result.items[0]).toMatchObject({
      currentReturnPercent: null,
      currentReturnStatus: 'STALE',
      healthState: null,
      lifecycleEvidenceStatus: 'UNAVAILABLE',
      trustEvidenceStatus: 'SOURCE_PROVEN_PRICE_STALE',
    });
  });

  it('keeps current data quality unavailable when latest persisted DQ is missing', async () => {
    const repository = {
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [trustedSignal],
        totalCount: 1,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestPriceByInstrumentId: jest.fn().mockResolvedValue({
        date: new Date().toISOString(),
        close: 105,
        adjustedClose: 105,
        dataStatus: 'COMPLETE',
        source: 'database',
      }),
      latestDataQualityByInstrumentId: jest.fn().mockResolvedValue(null),
      latestExitDecisionByInstrumentId: jest.fn().mockResolvedValue(null),
    };
    const signalService = {
      enrichSignals: jest.fn().mockResolvedValue([{ ...trustedSignal, triggerContract: sourceProvenTrigger }]),
    };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);

    const result = await service.listActiveRows({ region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 });

    expect(result.items[0]).toMatchObject({
      currentDataQualityStatus: null,
      currentReturnPercent: null,
      currentReturnStatus: 'UNAVAILABLE',
      trustEvidenceStatus: 'SOURCE_PROVEN_DQ_UNAVAILABLE',
    });
  });

  it('maps REDUCE_RISK decisions to risk warning state', async () => {
    const repository = {
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [trustedSignal],
        totalCount: 1,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestPriceByInstrumentId: jest.fn().mockResolvedValue({
        date: new Date().toISOString(),
        close: 101,
        adjustedClose: 101,
        dataStatus: 'COMPLETE',
        source: 'database',
      }),
      latestDataQualityByInstrumentId: jest.fn().mockResolvedValue({
        signalReadinessStatus: 'READY',
        coverageStatus: 'GOOD',
        liquidityStatus: 'LIQUID',
        lastEvaluatedAt: new Date().toISOString(),
      }),
      latestExitDecisionByInstrumentId: jest.fn().mockResolvedValue({
        strategy: 'DEFENSIVE_EXIT',
        decision: 'REDUCE_RISK',
        generatedAt: new Date().toISOString(),
      }),
    };
    const signalService = {
      enrichSignals: jest.fn().mockResolvedValue([{ ...trustedSignal, triggerContract: sourceProvenTrigger }]),
    };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);

    const result = await service.listActiveRows({ region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 });

    expect(result.items[0]).toMatchObject({
      healthState: 'RISK_WARNING',
      lifecycleEvidenceStatus: 'EXIT_COMPATIBILITY_ONLY',
    });
  });

  it('ignores unsupported decision values in lifecycle health mapping', async () => {
    const repository = {
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [trustedSignal],
        totalCount: 1,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestPriceByInstrumentId: jest.fn().mockResolvedValue({
        date: new Date().toISOString(),
        close: 102,
        adjustedClose: 102,
        dataStatus: 'COMPLETE',
        source: 'database',
      }),
      latestDataQualityByInstrumentId: jest.fn().mockResolvedValue({
        signalReadinessStatus: 'READY',
        coverageStatus: 'GOOD',
        liquidityStatus: 'LIQUID',
        lastEvaluatedAt: new Date().toISOString(),
      }),
      latestExitDecisionByInstrumentId: jest.fn().mockResolvedValue({
        strategy: 'DEFENSIVE_EXIT',
        decision: 'HOLD_POSITION',
        generatedAt: new Date().toISOString(),
      }),
    };
    const signalService = {
      enrichSignals: jest.fn().mockResolvedValue([{ ...trustedSignal, triggerContract: sourceProvenTrigger }]),
    };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);

    const result = await service.listActiveRows({ region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 });

    expect(result.items[0]).toMatchObject({
      healthState: null,
      lifecycleEvidenceStatus: 'UNAVAILABLE',
    });
  });

  it('excludes unsupported trigger rows and reports warning when no active rows remain', async () => {
    const repository = {
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [trustedSignal],
        totalCount: 1,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestPriceByInstrumentId: jest.fn(),
      latestDataQualityByInstrumentId: jest.fn(),
      latestExitDecisionByInstrumentId: jest.fn(),
    };
    const signalService = {
      enrichSignals: jest.fn().mockResolvedValue([{
        ...trustedSignal,
        triggerContract: {
          ...sourceProvenTrigger,
          trigger_type: 'risk_warning',
        },
      }]),
    };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);

    const result = await service.listActiveRows({ region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 });

    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('No active rows satisfied source-proven entry trigger evidence'),
    ]));
  });

  it('filters across source pages and paginates only active rows', async () => {
    const signalA = { ...trustedSignal, id: 'signal-a', instrument_id: 'stock-a', symbol: 'AAA', company_name: 'AAA Co' };
    const signalB = { ...trustedSignal, id: 'signal-b', instrument_id: 'stock-b', symbol: 'BBB', company_name: 'BBB Co' };
    const signalC = { ...trustedSignal, id: 'signal-c', instrument_id: 'stock-c', symbol: 'CCC', company_name: 'CCC Co', auditStatus: 'LEGACY_MISSING' as const };
    const signalD = { ...trustedSignal, id: 'signal-d', instrument_id: 'stock-d', symbol: 'DDD', company_name: 'DDD Co' };
    const repository = {
      listLatestSignals: jest
        .fn()
        .mockResolvedValueOnce({
          items: [signalA, signalB],
          totalCount: 4,
          limit: 100,
          offset: 0,
          nextOffset: 2,
          hasMore: true,
        })
        .mockResolvedValueOnce({
          items: [signalC, signalD],
          totalCount: 4,
          limit: 100,
          offset: 2,
          nextOffset: null,
          hasMore: false,
        }),
      latestPriceByInstrumentId: jest.fn().mockResolvedValue({
        date: new Date().toISOString(),
        close: 103,
        adjustedClose: 103,
        dataStatus: 'COMPLETE',
        source: 'database',
      }),
      latestDataQualityByInstrumentId: jest.fn().mockResolvedValue({
        signalReadinessStatus: 'READY',
        coverageStatus: 'GOOD',
        liquidityStatus: 'LIQUID',
        lastEvaluatedAt: new Date().toISOString(),
      }),
      latestExitDecisionByInstrumentId: jest.fn().mockResolvedValue(null),
    };
    const signalService = {
      enrichSignals: jest
        .fn()
        .mockResolvedValueOnce([
          { ...signalA, triggerContract: { ...sourceProvenTrigger, signal_id: 'signal-a', instrument_id: 'stock-a', symbol: 'AAA' } },
          { ...signalB, triggerContract: { ...sourceProvenTrigger, signal_id: 'signal-b', instrument_id: 'stock-b', symbol: 'BBB', trigger_type: 'risk_warning' } },
        ])
        .mockResolvedValueOnce([
          { ...signalD, triggerContract: { ...sourceProvenTrigger, signal_id: 'signal-d', instrument_id: 'stock-d', symbol: 'DDD', trigger_type: 'bearish_trigger' } },
        ]),
    };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);

    const result = await service.listActiveRows({ region: 'IN', assetType: 'STOCK', limit: 1, offset: 1 });

    expect(result.totalCount).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      symbol: 'DDD',
      triggerType: 'bearish_trigger',
    });
    expect(result.nextOffset).toBe(null);
    expect(result.hasMore).toBe(false);
    expect(signalService.enrichSignals).toHaveBeenNthCalledWith(1, [signalA, signalB], { includeStrategyMatches: true });
    expect(signalService.enrichSignals).toHaveBeenNthCalledWith(2, [signalD], { includeStrategyMatches: true });
  });
});

