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
  strategyMatches: [{
    strategyCode: 'BREAKOUT_CONFIRMATION',
    strategyVersion: '1.0.0',
    decision: 'ENTRY_CANDIDATE' as const,
    direction: 'BULLISH' as const,
    score: 82,
    confidence: 'HIGH' as const,
    reasons: ['Breakout confirmation triggered.'],
    entryRulesPassed: ['ENTRY_BREAKOUT'],
    timeframe: 'DAILY',
    readinessLabel: 'READY' as const,
    ratingGrade: 'A' as const,
  }],
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

const activeLedgerRow = (overrides: Partial<any> = {}) => ({
  ledgerKey: overrides.ledgerKey || `IN:STOCK:${overrides.instrumentId || 'stock-1'}:bullish_entry_trigger:2026-05-20T00:00:00.000Z`,
  status: 'ACTIVE' as const,
  signalId: overrides.signalId || 'signal-existing',
  instrumentId: overrides.instrumentId || 'stock-1',
  symbol: overrides.symbol || 'ABC',
  companyName: overrides.companyName || 'ABC Co',
  region: 'IN',
  assetType: 'STOCK',
  triggerType: 'bullish_entry_trigger' as const,
  entryTriggerTimestamp: overrides.entryTriggerTimestamp || '2026-05-20T00:00:00.000Z',
  entryTriggerPrice: overrides.entryTriggerPrice ?? 100,
  entryReasonSummary: overrides.entryReasonSummary || 'Original entry trigger.',
  strategyId: 'BREAKOUT_CONFIRMATION',
  strategyVersion: '1.0.0',
  strategyDecision: 'ENTRY_CANDIDATE',
  strategyReadinessLabel: 'READY',
  strategyRatingGrade: 'A',
  entryRuleId: 'ENTRY_BREAKOUT',
  latestTrustedPriceDate: null,
  latestTrustedPrice: null,
  currentReturnPercent: null,
  currentReturnStatus: 'UNAVAILABLE' as const,
  currentDataQualityStatus: 'READY',
  healthState: null,
  lifecycleEvidenceStatus: 'ACTIVE_ENTRY' as const,
  trustEvidenceStatus: 'SOURCE_PROVEN_PRICE_UNAVAILABLE' as const,
  calibrationEvidenceStatus: 'AVAILABLE' as const,
  displayWarnings: [],
  closePriceStatus: 'UNAVAILABLE' as const,
  exitRuleIds: [],
  invalidationRuleIds: [],
});

describe('SignalPositionLedgerService', () => {
  it('listPersistedActiveRows reads only persisted ACTIVE ledger rows and does not refresh or materialize when empty', async () => {
    const repository = {
      listLedgerRows: jest.fn().mockResolvedValue({
        items: [],
        totalCount: 0,
        hasMore: false,
        nextOffset: null,
      }),
      loadLatestMaterializedSnapshot: jest.fn(),
      listLatestSignals: jest.fn(),
      saveMaterializedSnapshot: jest.fn(),
      upsertActiveLedgerRow: jest.fn(),
      closeLedgerRow: jest.fn(),
      listAllLedgerRows: jest.fn(),
    };
    const signalService = {
      enrichSignals: jest.fn(),
    };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);
    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };

    const result = await (service as any).listPersistedActiveRows(query);

    expect(repository.listLedgerRows).toHaveBeenCalledTimes(1);
    expect(repository.listLedgerRows).toHaveBeenCalledWith({ ...query, status: 'ACTIVE' });
    expect(result).toMatchObject({
      items: [],
      totalCount: 0,
      limit: 25,
      offset: 0,
      nextOffset: null,
      hasMore: false,
      scope: { region: 'IN', assetType: 'STOCK' },
    });
    expect(repository.loadLatestMaterializedSnapshot).not.toHaveBeenCalled();
    expect(repository.listLatestSignals).not.toHaveBeenCalled();
    expect(signalService.enrichSignals).not.toHaveBeenCalled();
    expect(repository.saveMaterializedSnapshot).not.toHaveBeenCalled();
    expect(repository.upsertActiveLedgerRow).not.toHaveBeenCalled();
    expect(repository.closeLedgerRow).not.toHaveBeenCalled();
    expect(repository.listAllLedgerRows).not.toHaveBeenCalled();
  });

  it('listPersistedClosedRows reads only persisted CLOSED ledger rows without refresh or materialization', async () => {
    const closedRow = {
      ...activeLedgerRow({ instrumentId: 'stock-closed', symbol: 'DONE' }),
      status: 'CLOSED' as const,
      healthState: 'EXIT_TRIGGERED' as const,
      lifecycleEvidenceStatus: 'EXIT_TRIGGERED' as const,
      exitTriggerTimestamp: '2026-05-27T09:15:00.000Z',
      exitTriggerPrice: 104,
      exitReasonSummary: 'Exit trigger generated by strategy exit rules.',
      exitRuleId: 'PRICE_BELOW_SMA50',
      exitDecision: 'EXIT_CANDIDATE',
      closedAt: '2026-05-27T09:20:00.000Z',
    };
    const repository = {
      listLedgerRows: jest.fn().mockResolvedValue({
        items: [closedRow],
        totalCount: 1,
        hasMore: false,
        nextOffset: null,
      }),
      loadLatestMaterializedSnapshot: jest.fn(),
      listLatestSignals: jest.fn(),
      saveMaterializedSnapshot: jest.fn(),
      upsertActiveLedgerRow: jest.fn(),
      closeLedgerRow: jest.fn(),
      listAllLedgerRows: jest.fn(),
    };
    const signalService = {
      enrichSignals: jest.fn(),
    };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);
    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };

    const result = await (service as any).listPersistedClosedRows(query);

    expect(repository.listLedgerRows).toHaveBeenCalledTimes(1);
    expect(repository.listLedgerRows).toHaveBeenCalledWith({ ...query, status: 'CLOSED' });
    expect(result.items).toEqual([closedRow]);
    expect(result.totalCount).toBe(1);
    expect(result.scope).toEqual({ region: 'IN', assetType: 'STOCK' });
    expect(repository.loadLatestMaterializedSnapshot).not.toHaveBeenCalled();
    expect(repository.listLatestSignals).not.toHaveBeenCalled();
    expect(signalService.enrichSignals).not.toHaveBeenCalled();
    expect(repository.saveMaterializedSnapshot).not.toHaveBeenCalled();
    expect(repository.upsertActiveLedgerRow).not.toHaveBeenCalled();
    expect(repository.closeLedgerRow).not.toHaveBeenCalled();
    expect(repository.listAllLedgerRows).not.toHaveBeenCalled();
  });

  it('keeps only source-proven entry rows and computes current return when trust basis is usable', async () => {
    const persistedSignal = {
      ...trustedSignal,
      strategyMatches: undefined,
      blockedStrategies: undefined,
    };
    const repository = {
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [persistedSignal],
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
      latestExitDecisionByInstrumentId: jest.fn().mockResolvedValue(null),
    };
    const signalService = {
      enrichSignals: jest.fn().mockResolvedValue([{ ...trustedSignal, triggerContract: sourceProvenTrigger }]),
    };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);

    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };
    await service.refreshActiveRows(query, { force: true, wait: true });
    const result = await service.listActiveRows(query);

    expect(result.totalCount).toBe(1);
    expect(signalService.enrichSignals).toHaveBeenCalledWith([persistedSignal], { includeStrategyMatches: true });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      symbol: 'ABC',
      triggerType: 'bullish_entry_trigger',
      currentReturnPercent: 10,
      currentReturnStatus: 'CURRENT',
      healthState: null,
      lifecycleEvidenceStatus: 'ACTIVE_ENTRY',
      trustEvidenceStatus: 'SOURCE_PROVEN',
      strategyDecision: 'ENTRY_CANDIDATE',
      calibrationEvidenceStatus: 'AVAILABLE',
    });
  });

  it('does not drop existing active entries when the latest scan contains fewer current candidates', async () => {
    const existingA = activeLedgerRow({ instrumentId: 'stock-a', symbol: 'AAA' });
    const existingB = activeLedgerRow({ instrumentId: 'stock-b', symbol: 'BBB', ledgerKey: 'IN:STOCK:stock-b:bullish_entry_trigger:2026-05-20T00:00:00.000Z' });
    const signalA = { ...trustedSignal, id: 'signal-a-new', instrument_id: 'stock-a', symbol: 'AAA', company_name: 'AAA Co' };
    const repository = {
      listAllLedgerRows: jest.fn()
        .mockResolvedValueOnce([existingA, existingB])
        .mockResolvedValueOnce([]),
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [signalA],
        totalCount: 1,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestSnapshotsByInstrumentIds: jest.fn().mockResolvedValue(new Map([
        ['stock-a', {
          latestPrice: { date: new Date().toISOString(), close: 105, adjustedClose: 105, dataStatus: 'COMPLETE', source: 'database' },
          quality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', lastEvaluatedAt: new Date().toISOString() },
          exitDecision: null,
        }],
        ['stock-b', {
          latestPrice: { date: new Date().toISOString(), close: 110, adjustedClose: 110, dataStatus: 'COMPLETE', source: 'database' },
          quality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', lastEvaluatedAt: new Date().toISOString() },
          exitDecision: null,
        }],
      ])),
      upsertActiveLedgerRow: jest.fn(),
      closeLedgerRow: jest.fn(),
    };
    const signalService = {
      enrichSignals: jest.fn().mockResolvedValue([{
        ...signalA,
        triggerContract: {
          ...sourceProvenTrigger,
          signal_id: 'signal-a-new',
          instrument_id: 'stock-a',
          symbol: 'AAA',
          trigger_timestamp: '2026-05-26T00:00:00.000Z',
        },
      }]),
    };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);
    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };

    await service.refreshActiveRows(query, { force: true, wait: true });
    const result = await service.listActiveRows(query);

    expect(result.totalCount).toBe(2);
    expect(result.items.map((row) => row.symbol).sort()).toEqual(['AAA', 'BBB']);
    expect(result.items.find((row) => row.symbol === 'AAA')?.entryTriggerTimestamp).toBe('2026-05-20T00:00:00.000Z');
    const writtenLedgerKeys = repository.upsertActiveLedgerRow.mock.calls.map(([row]) => row.ledgerKey);
    expect(writtenLedgerKeys).toContain(existingA.ledgerKey);
    expect(writtenLedgerKeys).not.toContain('IN:STOCK:stock-a:bullish_entry_trigger:2026-05-26T00:00:00.000Z');
    expect(repository.closeLedgerRow).not.toHaveBeenCalled();
  });

  it('closes an existing active entry only when an exit trigger is present', async () => {
    const existing = activeLedgerRow({ instrumentId: 'stock-1', symbol: 'ABC' });
    const repository = {
      listAllLedgerRows: jest.fn()
        .mockResolvedValueOnce([existing])
        .mockResolvedValueOnce([]),
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [],
        totalCount: 0,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestSnapshotsByInstrumentIds: jest.fn().mockResolvedValue(new Map([
        ['stock-1', {
          latestPrice: { date: '2026-05-27T00:00:00.000Z', close: 112, adjustedClose: 112, dataStatus: 'COMPLETE', source: 'database' },
          quality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', lastEvaluatedAt: '2026-05-27T00:00:00.000Z' },
          exitDecision: {
            id: 'decision-exit-1',
            strategy: 'DEFENSIVE_EXIT',
            strategyVersion: '1.2.0',
            decision: 'EXIT_CANDIDATE',
            generatedAt: '2026-05-27T00:00:00.000Z',
            reasons: ['Price closed below SMA50.'],
            exitRulesTriggered: ['PRICE_BELOW_SMA50'],
            invalidationRulesTriggered: [],
          },
        }],
      ])),
      priceAtOrBeforeInstrumentId: jest.fn().mockResolvedValue({
        date: '2026-05-27T00:00:00.000Z',
        close: 112,
        adjustedClose: 112,
        dataStatus: 'COMPLETE',
        source: 'database',
      }),
      upsertActiveLedgerRow: jest.fn(),
      closeLedgerRow: jest.fn(),
    };
    const signalService = { enrichSignals: jest.fn() };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);
    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };

    await service.refreshActiveRows(query, { force: true, wait: true });
    const active = await service.listActiveRows(query);
    const closed = await service.listClosedRows(query);

    expect(active.totalCount).toBe(0);
    expect(closed.totalCount).toBe(1);
    expect(closed.items[0]).toMatchObject({
      status: 'CLOSED',
      symbol: 'ABC',
      exitTriggerTimestamp: '2026-05-27T00:00:00.000Z',
      exitTriggerPrice: 112,
      closePriceStatus: 'SOURCE_PROVEN',
      exitReasonSummary: 'Price closed below SMA50.',
      exitRuleId: 'PRICE_BELOW_SMA50',
      exitRuleIds: ['PRICE_BELOW_SMA50'],
      exitStrategyId: 'DEFENSIVE_EXIT',
      exitStrategyVersion: '1.2.0',
      exitSourceDecisionId: 'decision-exit-1',
      lifecycleEvidenceStatus: 'CLOSED',
    });
    expect(repository.closeLedgerRow).toHaveBeenCalledWith(expect.objectContaining({ status: 'CLOSED' }));
  });

  it('keeps an active row exit-triggered when close price evidence is missing', async () => {
    const existing = activeLedgerRow({ instrumentId: 'stock-1', symbol: 'ABC' });
    const repository = {
      listAllLedgerRows: jest.fn()
        .mockResolvedValueOnce([existing])
        .mockResolvedValueOnce([]),
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [],
        totalCount: 0,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestSnapshotsByInstrumentIds: jest.fn().mockResolvedValue(new Map([
        ['stock-1', {
          latestPrice: { date: '2026-05-27T00:00:00.000Z', close: 112, adjustedClose: 112, dataStatus: 'COMPLETE', source: 'database' },
          quality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', lastEvaluatedAt: '2026-05-27T00:00:00.000Z' },
          exitDecision: {
            id: 'decision-exit-missing-price',
            strategy: 'DEFENSIVE_EXIT',
            strategyVersion: '1.2.0',
            decision: 'EXIT_CANDIDATE',
            generatedAt: '2026-05-27T00:00:00.000Z',
            reasons: ['Price closed below SMA50.'],
            exitRulesTriggered: ['PRICE_BELOW_SMA50'],
            invalidationRulesTriggered: [],
          },
        }],
      ])),
      priceAtOrBeforeInstrumentId: jest.fn().mockResolvedValue(null),
      upsertActiveLedgerRow: jest.fn(),
      closeLedgerRow: jest.fn(),
    };
    const signalService = { enrichSignals: jest.fn() };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);
    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };

    await service.refreshActiveRows(query, { force: true, wait: true });
    const active = await service.listActiveRows(query);
    const closed = await service.listClosedRows(query);

    expect(active.totalCount).toBe(1);
    expect(closed.totalCount).toBe(0);
    expect(active.items[0]).toMatchObject({
      status: 'EXIT_TRIGGERED',
      healthState: 'EXIT_TRIGGERED',
      lifecycleEvidenceStatus: 'EXIT_TRIGGERED',
      exitSourceDecisionId: 'decision-exit-missing-price',
      exitRuleIds: ['PRICE_BELOW_SMA50'],
      exitTriggerTimestamp: '2026-05-27T00:00:00.000Z',
      exitTriggerPrice: null,
      closePriceStatus: 'UNAVAILABLE',
      closedAt: null,
    });
    expect(repository.upsertActiveLedgerRow).toHaveBeenCalledWith(expect.objectContaining({ status: 'EXIT_TRIGGERED' }));
    expect(repository.closeLedgerRow).not.toHaveBeenCalled();
  });

  it('keeps exit-triggered pending when close price evidence is not source-proven', async () => {
    const existing = activeLedgerRow({ instrumentId: 'stock-1', symbol: 'ABC' });
    const repository = {
      listAllLedgerRows: jest.fn()
        .mockResolvedValueOnce([existing])
        .mockResolvedValueOnce([]),
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [],
        totalCount: 0,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestSnapshotsByInstrumentIds: jest.fn().mockResolvedValue(new Map([
        ['stock-1', {
          latestPrice: { date: '2026-05-27T00:00:00.000Z', close: 112, adjustedClose: 112, dataStatus: 'COMPLETE', source: 'database' },
          quality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', lastEvaluatedAt: '2026-05-27T00:00:00.000Z' },
          exitDecision: {
            id: 'decision-exit-partial-price',
            strategy: 'DEFENSIVE_EXIT',
            strategyVersion: '1.2.0',
            decision: 'EXIT_CANDIDATE',
            generatedAt: '2026-05-27T00:00:00.000Z',
            reasons: ['Price closed below SMA50.'],
            exitRulesTriggered: ['PRICE_BELOW_SMA50'],
            invalidationRulesTriggered: [],
          },
        }],
      ])),
      priceAtOrBeforeInstrumentId: jest.fn().mockResolvedValue({
        date: '2026-05-27T00:00:00.000Z',
        close: 112,
        adjustedClose: 112,
        dataStatus: 'PARTIAL',
        source: 'database',
      }),
      upsertActiveLedgerRow: jest.fn(),
      closeLedgerRow: jest.fn(),
    };
    const signalService = { enrichSignals: jest.fn() };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);
    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };

    await service.refreshActiveRows(query, { force: true, wait: true });
    const active = await service.listActiveRows(query);
    const closed = await service.listClosedRows(query);

    expect(active.totalCount).toBe(1);
    expect(closed.totalCount).toBe(0);
    expect(active.items[0]).toMatchObject({
      status: 'EXIT_TRIGGERED',
      lifecycleEvidenceStatus: 'EXIT_TRIGGERED',
      exitSourceDecisionId: 'decision-exit-partial-price',
      exitRuleIds: ['PRICE_BELOW_SMA50'],
      exitTriggerPrice: null,
      closePriceStatus: 'UNAVAILABLE',
      closedAt: null,
    });
    expect(repository.closeLedgerRow).not.toHaveBeenCalled();
  });

  it('persists terminal invalidation evidence separately from closed history', async () => {
    const existing = activeLedgerRow({ instrumentId: 'stock-1', symbol: 'ABC' });
    const repository = {
      listAllLedgerRows: jest.fn()
        .mockResolvedValueOnce([existing])
        .mockResolvedValueOnce([]),
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [],
        totalCount: 0,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestSnapshotsByInstrumentIds: jest.fn().mockResolvedValue(new Map([
        ['stock-1', {
          latestPrice: { date: '2026-05-27T00:00:00.000Z', close: 95, adjustedClose: 95, dataStatus: 'COMPLETE', source: 'database' },
          quality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', lastEvaluatedAt: '2026-05-27T00:00:00.000Z' },
          exitDecision: {
            id: 'decision-invalidated-1',
            strategy: 'DEFENSIVE_EXIT',
            strategyVersion: '1.2.0',
            decision: 'HOLD',
            generatedAt: '2026-05-27T00:00:00.000Z',
            reasons: ['Two-bar support loss invalidates the active long setup.'],
            exitRulesTriggered: [],
            invalidationRulesTriggered: ['SUPPORT_INVALIDATED'],
          },
        }],
      ])),
      upsertActiveLedgerRow: jest.fn(),
      closeLedgerRow: jest.fn(),
    };
    const signalService = { enrichSignals: jest.fn() };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);
    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };

    await service.refreshActiveRows(query, { force: true, wait: true });
    const active = await service.listActiveRows(query);
    const closed = await service.listClosedRows(query);

    expect(active.totalCount).toBe(0);
    expect(closed.totalCount).toBe(0);
    expect(repository.closeLedgerRow).toHaveBeenCalledWith(expect.objectContaining({
      status: 'INVALIDATED',
      lifecycleEvidenceStatus: 'INVALIDATED',
      invalidationSourceDecisionId: 'decision-invalidated-1',
      invalidationRuleIds: ['SUPPORT_INVALIDATED'],
      invalidationTimestamp: '2026-05-27T00:00:00.000Z',
      closedAt: null,
    }));
  });

  it('prioritizes terminal invalidation over exit candidate close evidence', async () => {
    const existing = activeLedgerRow({ instrumentId: 'stock-1', symbol: 'ABC' });
    const repository = {
      listAllLedgerRows: jest.fn()
        .mockResolvedValueOnce([existing])
        .mockResolvedValueOnce([]),
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [],
        totalCount: 0,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestSnapshotsByInstrumentIds: jest.fn().mockResolvedValue(new Map([
        ['stock-1', {
          latestPrice: { date: '2026-05-27T00:00:00.000Z', close: 92, adjustedClose: 92, dataStatus: 'COMPLETE', source: 'database' },
          quality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', lastEvaluatedAt: '2026-05-27T00:00:00.000Z' },
          exitDecision: {
            id: 'decision-invalidated-exit-1',
            strategy: 'DEFENSIVE_EXIT',
            strategyVersion: '1.2.0',
            decision: 'EXIT_CANDIDATE',
            generatedAt: '2026-05-27T00:00:00.000Z',
            reasons: ['Support loss invalidates the active setup.'],
            exitRulesTriggered: ['PRICE_BELOW_SMA50'],
            invalidationRulesTriggered: ['SUPPORT_INVALIDATED'],
          },
        }],
      ])),
      priceAtOrBeforeInstrumentId: jest.fn().mockResolvedValue({
        date: '2026-05-27T00:00:00.000Z',
        close: 92,
        adjustedClose: 92,
        dataStatus: 'COMPLETE',
        source: 'database',
      }),
      upsertActiveLedgerRow: jest.fn(),
      closeLedgerRow: jest.fn(),
    };
    const signalService = { enrichSignals: jest.fn() };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);
    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };

    await service.refreshActiveRows(query, { force: true, wait: true });
    const active = await service.listActiveRows(query);
    const closed = await service.listClosedRows(query);

    expect(active.totalCount).toBe(0);
    expect(closed.totalCount).toBe(0);
    expect(repository.priceAtOrBeforeInstrumentId).not.toHaveBeenCalled();
    expect(repository.closeLedgerRow).toHaveBeenCalledWith(expect.objectContaining({
      status: 'INVALIDATED',
      lifecycleEvidenceStatus: 'INVALIDATED',
      invalidationSourceDecisionId: 'decision-invalidated-exit-1',
      invalidationRuleIds: ['SUPPORT_INVALIDATED'],
      closePriceStatus: 'UNAVAILABLE',
      exitTriggerPrice: null,
      closedAt: null,
    }));
  });

  it('does not invalidate without persisted invalidation rule evidence', async () => {
    const existing = activeLedgerRow({ instrumentId: 'stock-1', symbol: 'ABC' });
    const repository = {
      listAllLedgerRows: jest.fn()
        .mockResolvedValueOnce([existing])
        .mockResolvedValueOnce([]),
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [],
        totalCount: 0,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestSnapshotsByInstrumentIds: jest.fn().mockResolvedValue(new Map([
        ['stock-1', {
          latestPrice: { date: '2026-05-27T00:00:00.000Z', close: 101, adjustedClose: 101, dataStatus: 'COMPLETE', source: 'database' },
          quality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', lastEvaluatedAt: '2026-05-27T00:00:00.000Z' },
          exitDecision: {
            id: 'decision-no-invalidation-rules',
            strategy: 'DEFENSIVE_EXIT',
            strategyVersion: '1.2.0',
            decision: 'HOLD',
            generatedAt: '2026-05-27T00:00:00.000Z',
            reasons: ['Narrative mentions invalidation review, but no rule fired.'],
            exitRulesTriggered: [],
            invalidationRulesTriggered: [],
          },
        }],
      ])),
      upsertActiveLedgerRow: jest.fn(),
      closeLedgerRow: jest.fn(),
    };
    const signalService = { enrichSignals: jest.fn() };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);
    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };

    await service.refreshActiveRows(query, { force: true, wait: true });
    const active = await service.listActiveRows(query);
    const closed = await service.listClosedRows(query);

    expect(active.totalCount).toBe(1);
    expect(closed.totalCount).toBe(0);
    expect(active.items[0]).toMatchObject({
      status: 'ACTIVE',
      lifecycleEvidenceStatus: 'ACTIVE_ENTRY',
      invalidationRuleIds: [],
    });
    expect(active.items[0].invalidationSourceDecisionId ?? null).toBeNull();
    expect(repository.upsertActiveLedgerRow).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACTIVE' }));
    expect(repository.closeLedgerRow).not.toHaveBeenCalled();
  });

  it('maps weak non-terminal exit rule evidence to risk warning', async () => {
    const existing = activeLedgerRow({ instrumentId: 'stock-1', symbol: 'ABC' });
    const repository = {
      listAllLedgerRows: jest.fn()
        .mockResolvedValueOnce([existing])
        .mockResolvedValueOnce([]),
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [],
        totalCount: 0,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestSnapshotsByInstrumentIds: jest.fn().mockResolvedValue(new Map([
        ['stock-1', {
          latestPrice: { date: '2026-05-27T00:00:00.000Z', close: 101, adjustedClose: 101, dataStatus: 'COMPLETE', source: 'database' },
          quality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', lastEvaluatedAt: '2026-05-27T00:00:00.000Z' },
          exitDecision: {
            id: 'decision-weak-exit-1',
            strategy: 'DEFENSIVE_EXIT',
            strategyVersion: '1.2.0',
            decision: 'WATCH',
            generatedAt: '2026-05-27T00:00:00.000Z',
            reasons: ['Relative strength is weakening.'],
            exitRulesTriggered: ['RELATIVE_STRENGTH_DECAY_EXIT'],
            invalidationRulesTriggered: [],
          },
        }],
      ])),
      upsertActiveLedgerRow: jest.fn(),
      closeLedgerRow: jest.fn(),
    };
    const signalService = { enrichSignals: jest.fn() };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);
    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };

    await service.refreshActiveRows(query, { force: true, wait: true });
    const active = await service.listActiveRows(query);
    const closed = await service.listClosedRows(query);

    expect(active.totalCount).toBe(1);
    expect(closed.totalCount).toBe(0);
    expect(active.items[0]).toMatchObject({
      status: 'RISK_WARNING',
      healthState: 'RISK_WARNING',
      lifecycleEvidenceStatus: 'RISK_WARNING',
      exitRuleIds: ['RELATIVE_STRENGTH_DECAY_EXIT'],
      exitSourceDecisionId: 'decision-weak-exit-1',
      closePriceStatus: 'UNAVAILABLE',
      closedAt: null,
    });
    expect(repository.closeLedgerRow).not.toHaveBeenCalled();
  });

  it('replays risk-warning transitions idempotently without duplicate lifecycle rows', async () => {
    const existing = activeLedgerRow({ instrumentId: 'stock-1', symbol: 'ABC' });
    const activeRows = new Map<string, any>([[existing.ledgerKey, existing]]);
    const repository = {
      listAllLedgerRows: jest.fn(async (_query: any, status: 'ACTIVE' | 'CLOSED') => (
        status === 'ACTIVE' ? [...activeRows.values()] : []
      )),
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [],
        totalCount: 0,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestSnapshotsByInstrumentIds: jest.fn().mockResolvedValue(new Map([
        ['stock-1', {
          latestPrice: { date: '2026-05-27T00:00:00.000Z', close: 101, adjustedClose: 101, dataStatus: 'COMPLETE', source: 'database' },
          quality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', lastEvaluatedAt: '2026-05-27T00:00:00.000Z' },
          exitDecision: {
            id: 'decision-risk-replay-1',
            strategy: 'DEFENSIVE_EXIT',
            strategyVersion: '1.2.0',
            decision: 'REDUCE_RISK',
            generatedAt: '2026-05-27T00:00:00.000Z',
            reasons: ['Risk evidence weakened.'],
            exitRulesTriggered: ['RELATIVE_STRENGTH_DECAY_EXIT'],
            invalidationRulesTriggered: [],
          },
        }],
      ])),
      upsertActiveLedgerRow: jest.fn(async (row: any) => activeRows.set(row.ledgerKey, row)),
      closeLedgerRow: jest.fn(),
    };
    const signalService = { enrichSignals: jest.fn() };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);
    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };

    await service.refreshActiveRows(query, { force: true, wait: true });
    await service.refreshActiveRows(query, { force: true, wait: true });
    const active = await service.listActiveRows(query);

    const writtenLedgerKeys = repository.upsertActiveLedgerRow.mock.calls.map(([row]) => row.ledgerKey);
    expect(new Set(writtenLedgerKeys)).toEqual(new Set([existing.ledgerKey]));
    expect(activeRows.size).toBe(1);
    expect(active.totalCount).toBe(1);
    expect(active.items[0]).toMatchObject({
      ledgerKey: existing.ledgerKey,
      status: 'RISK_WARNING',
      lifecycleEvidenceStatus: 'RISK_WARNING',
    });
    expect(repository.closeLedgerRow).not.toHaveBeenCalled();
  });

  it('keeps active entry trigger rows visible when current price is stale', async () => {
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

    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };
    await service.refreshActiveRows(query, { force: true, wait: true });
    const result = await service.listActiveRows(query);

    expect(result.totalCount).toBe(1);
    expect(result.items[0]).toMatchObject({
      symbol: 'XYZ',
      currentReturnStatus: 'STALE',
      lifecycleEvidenceStatus: 'ACTIVE_ENTRY',
    });
  });

  it('excludes rows when current data-quality evidence is missing', async () => {
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

    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };
    await service.refreshActiveRows(query, { force: true, wait: true });
    const result = await service.listActiveRows(query);

    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it('excludes WATCH rows because only entry triggers open active lifecycle rows', async () => {
    const watchSignal = {
      ...trustedSignal,
      id: 'signal-watch',
      instrument_id: 'stock-watch',
      symbol: 'WATCHME',
      company_name: 'Watch Me Co',
    };
    const watchTrigger = {
      ...sourceProvenTrigger,
      signal_id: 'signal-watch',
      instrument_id: 'stock-watch',
      symbol: 'WATCHME',
      trigger_price: 88,
      entry_rule_id: 'PRICE_ABOVE_SMA50',
    };
    const repository = {
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [{ ...watchSignal, strategyMatches: undefined }],
        totalCount: 1,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestPriceByInstrumentId: jest.fn().mockResolvedValue({
        date: new Date().toISOString(),
        close: 92,
        adjustedClose: 92,
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
      enrichSignals: jest.fn().mockResolvedValue([{
        ...watchSignal,
        strategyMatches: [{
          ...trustedSignal.strategyMatches![0],
          decision: 'WATCH' as const,
          direction: 'BULLISH' as const,
          readinessLabel: 'NOT_AUTOMATION_READY' as const,
          ratingGrade: 'WEAK' as const,
        }],
        triggerContract: watchTrigger,
      }]),
    };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);

    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };
    await service.refreshActiveRows(query, { force: true, wait: true });
    const result = await service.listActiveRows(query);

    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it('keeps active entry rows on risk warning because only exit triggers close them', async () => {
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

    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };
    await service.refreshActiveRows(query, { force: true, wait: true });
    const result = await service.listActiveRows(query);

    expect(result.totalCount).toBe(1);
    expect(result.items[0]).toMatchObject({
      symbol: 'ABC',
      healthState: 'RISK_WARNING',
      status: 'RISK_WARNING',
      lifecycleEvidenceStatus: 'RISK_WARNING',
      closePriceStatus: 'UNAVAILABLE',
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

    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };
    await service.refreshActiveRows(query, { force: true, wait: true });
    const result = await service.listActiveRows(query);

    expect(result.items[0]).toMatchObject({
      healthState: null,
      lifecycleEvidenceStatus: 'ACTIVE_ENTRY',
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

    const query = { region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 };
    await service.refreshActiveRows(query, { force: true, wait: true });
    const result = await service.listActiveRows(query);

    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('No active rows satisfied source-proven entry trigger evidence'),
    ]));
  });

  it('orders active rows by trigger timestamp before pagination', async () => {
    const oldSignal = { ...trustedSignal, id: 'signal-old', instrument_id: 'stock-old', symbol: 'OLD', company_name: 'Old Co' };
    const newSignal = { ...trustedSignal, id: 'signal-new', instrument_id: 'stock-new', symbol: 'NEW', company_name: 'New Co' };
    const midSignal = { ...trustedSignal, id: 'signal-mid', instrument_id: 'stock-mid', symbol: 'MID', company_name: 'Mid Co' };
    const repository = {
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [oldSignal, newSignal, midSignal],
        totalCount: 3,
        limit: 100,
        offset: 0,
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
      enrichSignals: jest.fn().mockResolvedValue([
        {
          ...oldSignal,
          triggerContract: {
            ...sourceProvenTrigger,
            signal_id: 'signal-old',
            instrument_id: 'stock-old',
            symbol: 'OLD',
            trigger_timestamp: '2026-05-24T00:00:00.000Z',
          },
        },
        {
          ...newSignal,
          triggerContract: {
            ...sourceProvenTrigger,
            signal_id: 'signal-new',
            instrument_id: 'stock-new',
            symbol: 'NEW',
            trigger_timestamp: '2026-05-26T00:00:00.000Z',
          },
        },
        {
          ...midSignal,
          triggerContract: {
            ...sourceProvenTrigger,
            signal_id: 'signal-mid',
            instrument_id: 'stock-mid',
            symbol: 'MID',
            trigger_timestamp: '2026-05-25T00:00:00.000Z',
          },
        },
      ]),
    };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);

    const query = { region: 'IN', assetType: 'STOCK', limit: 1, offset: 0, sortBy: 'entryTriggerTimestamp' as const, sortDirection: 'desc' as const };
    await service.refreshActiveRows(query, { force: true, wait: true });
    const result = await service.listActiveRows(query);

    expect(result.totalCount).toBe(3);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      symbol: 'NEW',
      entryTriggerTimestamp: '2026-05-26T00:00:00.000Z',
    });
    expect(result.nextOffset).toBe(1);
    expect(result.hasMore).toBe(true);
  });

  it('orders refreshed active rows by current return before pagination', async () => {
    const lowSignal = { ...trustedSignal, id: 'signal-low', instrument_id: 'stock-low', symbol: 'LOW', company_name: 'Low Co' };
    const highSignal = { ...trustedSignal, id: 'signal-high', instrument_id: 'stock-high', symbol: 'HIGH', company_name: 'High Co' };
    const repository = {
      listLatestSignals: jest.fn().mockResolvedValue({
        items: [lowSignal, highSignal],
        totalCount: 2,
        limit: 100,
        offset: 0,
        nextOffset: null,
        hasMore: false,
      }),
      latestPriceByInstrumentId: jest.fn().mockResolvedValue({
        date: new Date().toISOString(),
        close: 110,
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
      latestExitDecisionByInstrumentId: jest.fn().mockResolvedValue(null),
    };
    const signalService = {
      enrichSignals: jest.fn().mockResolvedValue([
        {
          ...lowSignal,
          triggerContract: {
            ...sourceProvenTrigger,
            signal_id: 'signal-low',
            instrument_id: 'stock-low',
            symbol: 'LOW',
            trigger_price: 120,
            trigger_timestamp: '2026-05-24T00:00:00.000Z',
          },
        },
        {
          ...highSignal,
          triggerContract: {
            ...sourceProvenTrigger,
            signal_id: 'signal-high',
            instrument_id: 'stock-high',
            symbol: 'HIGH',
            trigger_price: 80,
            trigger_timestamp: '2026-05-23T00:00:00.000Z',
          },
        },
      ]),
    };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);

    const query = { region: 'IN', assetType: 'STOCK', limit: 1, offset: 0, sortBy: 'currentReturnPercent' as const, sortDirection: 'desc' as const };
    await service.refreshActiveRows(query, { force: true, wait: true });
    const result = await service.listActiveRows(query);

    expect(result.totalCount).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      symbol: 'HIGH',
      currentReturnPercent: 37.5,
    });
    expect(result.nextOffset).toBe(1);
    expect(result.hasMore).toBe(true);
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
          { ...signalD, triggerContract: { ...sourceProvenTrigger, signal_id: 'signal-d', instrument_id: 'stock-d', symbol: 'DDD' } },
        ]),
    };
    const service = new SignalPositionLedgerService(repository as any, signalService as any);

    const query = { region: 'IN', assetType: 'STOCK', limit: 1, offset: 1 };
    await service.refreshActiveRows(query, { force: true, wait: true });
    const result = await service.listActiveRows(query);

    expect(result.totalCount).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      symbol: 'DDD',
      triggerType: 'bullish_entry_trigger',
    });
    expect(result.nextOffset).toBe(null);
    expect(result.hasMore).toBe(false);
    expect(signalService.enrichSignals).toHaveBeenNthCalledWith(1, [signalA, signalB], { includeStrategyMatches: true });
    expect(signalService.enrichSignals).toHaveBeenNthCalledWith(2, [signalD], { includeStrategyMatches: true });
  });
});

