/// <reference types="@types/jest" />
import { SignalPositionLedgerRepository } from '../../../src/modules/signal-position-ledger';

describe('SignalPositionLedgerRepository', () => {
  it('lists latest scoped signal rows with pagination metadata', async () => {
    const findMany = jest.fn().mockResolvedValueOnce([
      {
        id: 'signal-1',
        instrumentId: 'stock-1',
        symbol: 'ABC',
        companyName: 'ABC Co',
        sector: 'Tech',
        country: 'IN',
        score: 80,
        direction: 'BULLISH',
        confidence: 'HIGH',
        triggeredSignals: [],
        negativeSignals: [],
        explanation: 'Bullish.',
        generatedAt: new Date('2026-05-26T00:00:00.000Z'),
        generatedDate: new Date('2026-05-26T00:00:00.000Z'),
        modelVersion: 'signal-engine-v1',
        rulesetVersion: 'signal-engine-v1',
        sourceDataDate: new Date('2026-05-26T00:00:00.000Z'),
        sourcePriceDate: new Date('2026-05-26T00:00:00.000Z'),
        scoringInputSummary: {},
        dataQualityEligibilitySnapshot: { filterApplied: true, eligible: true, signalReadinessStatus: 'READY' },
        generationRunId: 'run-1',
        source: 'signal-generation-engine',
        dataStatus: 'COMPLETE',
      },
      {
        id: 'signal-2',
        instrumentId: 'stock-2',
        symbol: 'XYZ',
        companyName: 'XYZ Co',
        sector: 'Tech',
        country: 'IN',
        score: 70,
        direction: 'BULLISH',
        confidence: 'MEDIUM',
        triggeredSignals: [],
        negativeSignals: [],
        explanation: 'Bullish.',
        generatedAt: new Date('2026-05-26T00:00:00.000Z'),
        generatedDate: new Date('2026-05-26T00:00:00.000Z'),
        modelVersion: 'signal-engine-v1',
        rulesetVersion: 'signal-engine-v1',
        sourceDataDate: new Date('2026-05-26T00:00:00.000Z'),
        sourcePriceDate: new Date('2026-05-26T00:00:00.000Z'),
        scoringInputSummary: {},
        dataQualityEligibilitySnapshot: { filterApplied: true, eligible: true, signalReadinessStatus: 'READY' },
        generationRunId: 'run-1',
        source: 'signal-generation-engine',
        dataStatus: 'COMPLETE',
      },
    ]);
    const repository = new SignalPositionLedgerRepository({ signalResult: { findMany } } as any);

    const page = await repository.listLatestSignals({ region: 'IN', assetType: 'STOCK', limit: 1, offset: 0 });

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2, skip: 0 }));
    expect(page.totalCount).toBe(2);
    expect(page.hasMore).toBe(true);
    expect(page.nextOffset).toBe(1);
    expect(page.items[0]).toMatchObject({
      id: 'signal-1',
      instrument_id: 'stock-1',
      symbol: 'ABC',
      auditStatus: 'CURRENT',
    });
  });

  it('reads latest price, quality, and defensive-exit decision snapshots', async () => {
    const repository = new SignalPositionLedgerRepository({
      stock: {
        findFirst: jest.fn().mockResolvedValue({ symbol: 'ABC' }),
      },
      priceTick: {
        findFirst: jest.fn().mockResolvedValue({
          timestamp: new Date('2026-05-26T00:00:00.000Z'),
          close: 105,
          adjustedClose: 106,
          dataStatus: 'COMPLETE',
          source: 'database',
        }),
      },
      dataQualityEvaluation: {
        findFirst: jest.fn().mockResolvedValue({
          signalReadinessStatus: 'READY',
          coverageStatus: 'GOOD',
          liquidityStatus: 'LIQUID',
          evaluatedAt: new Date('2026-05-26T01:00:00.000Z'),
        }),
      },
      strategyDecisionResult: {
        findFirst: jest.fn().mockResolvedValue({
          strategy: 'DEFENSIVE_EXIT',
          decision: 'EXIT_CANDIDATE',
          generatedAt: new Date('2026-05-26T02:00:00.000Z'),
        }),
      },
    } as any);

    await expect(repository.latestPriceByInstrumentId('stock-1', { region: 'IN', assetType: 'STOCK' })).resolves.toMatchObject({
      close: 105,
      adjustedClose: 106,
      dataStatus: 'COMPLETE',
    });
    await expect(repository.latestDataQualityByInstrumentId('stock-1')).resolves.toMatchObject({
      signalReadinessStatus: 'READY',
      coverageStatus: 'GOOD',
    });
    await expect(repository.latestExitDecisionByInstrumentId('stock-1')).resolves.toMatchObject({
      strategy: 'DEFENSIVE_EXIT',
      decision: 'EXIT_CANDIDATE',
    });
  });

  it('ignores stale materialized snapshots from older ledger versions', async () => {
    const repository = new SignalPositionLedgerRepository({
      pipelineRun: {
        findFirst: jest.fn().mockResolvedValue({
          idempotencyKey: 'signal-position-ledger:old-run',
          status: 'COMPLETED',
          totalCount: 100,
          processedCount: 100,
          succeededCount: 0,
          failedCount: 0,
          skippedCount: 100,
          warnings: [],
          errors: [],
          startedAt: new Date('2026-05-26T00:00:00.000Z'),
          completedAt: new Date('2026-05-26T00:01:00.000Z'),
          updatedAt: new Date('2026-05-26T00:01:00.000Z'),
          metadata: {
            version: 'signal-position-ledger-materialized-v1',
            rows: [],
          },
        }),
      },
    } as any);

    await expect(repository.loadLatestMaterializedSnapshot({ region: 'IN', assetType: 'STOCK' })).resolves.toBeNull();
  });

  it('sorts active ledger rows before pagination with unavailable returns last', async () => {
    const findMany = jest.fn().mockResolvedValue([
      ledgerEntryRow({ ledgerKey: 'row-low', instrumentId: 'stock-low', symbol: 'LOW', entryTriggerTimestamp: '2026-05-24T00:00:00.000Z', currentReturnPercent: -2 }),
      ledgerEntryRow({ ledgerKey: 'row-missing', instrumentId: 'stock-missing', symbol: 'MISS', entryTriggerTimestamp: '2026-05-25T00:00:00.000Z', currentReturnPercent: null, currentReturnStatus: 'UNAVAILABLE' }),
      ledgerEntryRow({ ledgerKey: 'row-high', instrumentId: 'stock-high', symbol: 'HIGH', entryTriggerTimestamp: '2026-05-23T00:00:00.000Z', currentReturnPercent: 9 }),
    ]);
    const repository = new SignalPositionLedgerRepository({
      signalPositionLedgerEntry: { findMany },
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    } as any);

    const page = await repository.listLedgerRows({
      region: 'IN',
      assetType: 'STOCK',
      status: 'ACTIVE',
      limit: 2,
      offset: 0,
      sortBy: 'currentReturnPercent',
      sortDirection: 'desc',
    });

    expect(page.items.map((row) => row.symbol)).toEqual(['HIGH', 'LOW']);
    expect(page.totalCount).toBe(3);
    expect(page.hasMore).toBe(true);
    expect(page.nextOffset).toBe(2);
  });

  it('enriches active rows with the latest signal score and sorts by it globally', async () => {
    const findMany = jest.fn().mockResolvedValue([
      ledgerEntryRow({ ledgerKey: 'row-a', instrumentId: 'stock-a', symbol: 'AAA', entryTriggerTimestamp: '2026-05-24T00:00:00.000Z', currentReturnPercent: 1 }),
      ledgerEntryRow({ ledgerKey: 'row-b', instrumentId: 'stock-b', symbol: 'BBB', entryTriggerTimestamp: '2026-05-25T00:00:00.000Z', currentReturnPercent: 2 }),
      ledgerEntryRow({ ledgerKey: 'row-c', instrumentId: 'stock-c', symbol: 'CCC', entryTriggerTimestamp: '2026-05-23T00:00:00.000Z', currentReturnPercent: 3 }),
    ]);
    // Latest-score-per-instrument join: C highest, A mid, B has no score row.
    const queryRawUnsafe = jest.fn().mockResolvedValue([
      { instrumentId: 'stock-a', score: 72, confidence: 'MEDIUM', direction: 'BULLISH', generatedAt: new Date('2026-05-30T00:00:00.000Z') },
      { instrumentId: 'stock-c', score: 95, confidence: 'HIGH', direction: 'BULLISH', generatedAt: new Date('2026-05-31T00:00:00.000Z') },
    ]);
    const repository = new SignalPositionLedgerRepository({
      signalPositionLedgerEntry: { findMany },
      $queryRawUnsafe: queryRawUnsafe,
    } as any);

    const page = await repository.listLedgerRows({
      region: 'IN',
      assetType: 'STOCK',
      status: 'ACTIVE',
      limit: 10,
      offset: 0,
      sortBy: 'latestSignalScore',
      sortDirection: 'desc',
    });

    // Descending score; the instrument with no signal row (BBB) sorts last.
    expect(page.items.map((row) => row.symbol)).toEqual(['CCC', 'AAA', 'BBB']);
    const ccc = page.items.find((row) => row.symbol === 'CCC');
    expect(ccc).toMatchObject({ latestSignalScore: 95, latestSignalConfidence: 'HIGH', latestSignalDirection: 'BULLISH' });
    expect(ccc?.latestSignalScoreDate).toBe('2026-05-31T00:00:00.000Z');
    expect(page.items.find((row) => row.symbol === 'BBB')?.latestSignalScore).toBeNull();
    // The join is bounded to the distinct instrument ids on the page.
    expect(queryRawUnsafe).toHaveBeenCalledTimes(1);
    expect(queryRawUnsafe.mock.calls[0][1]).toEqual(expect.arrayContaining(['stock-a', 'stock-b', 'stock-c']));

    // Ascending: lowest score first, and the no-score row (BBB) still sorts LAST.
    const ascPage = await repository.listLedgerRows({
      region: 'IN',
      assetType: 'STOCK',
      status: 'ACTIVE',
      limit: 10,
      offset: 0,
      sortBy: 'latestSignalScore',
      sortDirection: 'asc',
    });
    expect(ascPage.items.map((row) => row.symbol)).toEqual(['AAA', 'CCC', 'BBB']);
  });

  it('persists active risk-warning lifecycle evidence without clearing the active slot', async () => {
    const upsert = jest.fn().mockResolvedValue(null);
    const repository = new SignalPositionLedgerRepository({
      signalPositionLedgerEntry: { upsert },
    } as any);
    const row = ledgerActiveRow({
      status: 'RISK_WARNING',
      healthState: 'RISK_WARNING',
      lifecycleEvidenceStatus: 'RISK_WARNING',
      exitStrategyId: 'DEFENSIVE_EXIT',
      exitStrategyVersion: '1.2.0',
      exitSourceDecisionId: 'decision-risk-1',
      exitRuleIds: ['RELATIVE_STRENGTH_DECAY_EXIT'],
      exitDecision: 'REDUCE_RISK',
    });

    await repository.upsertActiveLedgerRow(row as any);
    const payload = upsert.mock.calls[0][0];

    expect(payload.create).toMatchObject({
      status: 'RISK_WARNING',
      activeSlot: 'ABC',
      lifecycleEvidenceStatus: 'RISK_WARNING',
      exitStrategyId: 'DEFENSIVE_EXIT',
      exitStrategyVersion: '1.2.0',
      exitSourceDecisionId: 'decision-risk-1',
      exitRuleIds: ['RELATIVE_STRENGTH_DECAY_EXIT'],
      exitDecision: 'REDUCE_RISK',
      closePriceStatus: 'UNAVAILABLE',
    });
    expect(payload.update).toMatchObject({
      status: 'RISK_WARNING',
      activeSlot: 'ABC',
      lifecycleEvidenceStatus: 'RISK_WARNING',
      exitRuleIds: ['RELATIVE_STRENGTH_DECAY_EXIT'],
    });
  });

  it('persists exit-triggered evidence as active-like until close price is source-proven', async () => {
    const upsert = jest.fn().mockResolvedValue(null);
    const repository = new SignalPositionLedgerRepository({
      signalPositionLedgerEntry: { upsert },
    } as any);
    const row = ledgerActiveRow({
      status: 'EXIT_TRIGGERED',
      healthState: 'EXIT_TRIGGERED',
      lifecycleEvidenceStatus: 'EXIT_TRIGGERED',
      exitStrategyId: 'DEFENSIVE_EXIT',
      exitStrategyVersion: '1.2.0',
      exitSourceDecisionId: 'decision-exit-1',
      exitTriggerTimestamp: '2026-05-27T00:00:00.000Z',
      exitRuleId: 'PRICE_BELOW_SMA50',
      exitRuleIds: ['PRICE_BELOW_SMA50'],
      exitDecision: 'EXIT_CANDIDATE',
      closePriceStatus: 'UNAVAILABLE',
    });

    await repository.upsertActiveLedgerRow(row as any);
    const payload = upsert.mock.calls[0][0];

    expect(payload.create).toMatchObject({
      status: 'EXIT_TRIGGERED',
      activeSlot: 'ABC',
      lifecycleEvidenceStatus: 'EXIT_TRIGGERED',
      exitSourceDecisionId: 'decision-exit-1',
      exitRuleIds: ['PRICE_BELOW_SMA50'],
      exitTriggerPrice: null,
      closePriceStatus: 'UNAVAILABLE',
      closedAt: null,
    });
  });

  it('persists closed lifecycle rows with source decision and close evidence while clearing active slot', async () => {
    const update = jest.fn().mockResolvedValue(null);
    const repository = new SignalPositionLedgerRepository({
      signalPositionLedgerEntry: { update },
    } as any);
    const row = ledgerActiveRow({
      status: 'CLOSED',
      lifecycleEvidenceStatus: 'CLOSED',
      exitStrategyId: 'DEFENSIVE_EXIT',
      exitStrategyVersion: '1.2.0',
      exitSourceDecisionId: 'decision-close-1',
      exitTriggerTimestamp: '2026-05-27T00:00:00.000Z',
      exitTriggerPrice: 108,
      closePriceStatus: 'SOURCE_PROVEN',
      exitReasonSummary: 'Price closed below SMA50.',
      exitRuleId: 'PRICE_BELOW_SMA50',
      exitRuleIds: ['PRICE_BELOW_SMA50'],
      exitDecision: 'EXIT_CANDIDATE',
      closedAt: '2026-05-27T00:05:00.000Z',
    });

    await repository.closeLedgerRow(row as any);
    const payload = update.mock.calls[0][0];

    expect(payload.where).toEqual({ ledgerKey: row.ledgerKey });
    expect(payload.data).toMatchObject({
      status: 'CLOSED',
      activeSlot: null,
      lifecycleEvidenceStatus: 'CLOSED',
      exitStrategyId: 'DEFENSIVE_EXIT',
      exitStrategyVersion: '1.2.0',
      exitSourceDecisionId: 'decision-close-1',
      exitTriggerPrice: 108,
      closePriceStatus: 'SOURCE_PROVEN',
      exitRuleIds: ['PRICE_BELOW_SMA50'],
      exitDecision: 'EXIT_CANDIDATE',
      closedAt: new Date('2026-05-27T00:05:00.000Z'),
    });
  });

  it('persists invalidated lifecycle rows separately from closed history while clearing active slot', async () => {
    const update = jest.fn().mockResolvedValue(null);
    const repository = new SignalPositionLedgerRepository({
      signalPositionLedgerEntry: { update },
    } as any);
    const row = ledgerActiveRow({
      status: 'INVALIDATED',
      lifecycleEvidenceStatus: 'INVALIDATED',
      exitStrategyId: 'DEFENSIVE_EXIT',
      exitStrategyVersion: '1.2.0',
      exitSourceDecisionId: 'decision-invalidated-1',
      closePriceStatus: 'UNAVAILABLE',
      invalidationSourceDecisionId: 'decision-invalidated-1',
      invalidationRuleIds: ['SUPPORT_INVALIDATED'],
      invalidationTimestamp: '2026-05-27T00:00:00.000Z',
      closedAt: null,
    });

    await repository.closeLedgerRow(row as any);
    const payload = update.mock.calls[0][0];

    expect(payload.where).toEqual({ ledgerKey: row.ledgerKey });
    expect(payload.data).toMatchObject({
      status: 'INVALIDATED',
      activeSlot: null,
      lifecycleEvidenceStatus: 'INVALIDATED',
      closePriceStatus: 'UNAVAILABLE',
      invalidationSourceDecisionId: 'decision-invalidated-1',
      invalidationRuleIds: ['SUPPORT_INVALIDATED'],
      invalidationTimestamp: new Date('2026-05-27T00:00:00.000Z'),
      closedAt: null,
    });
  });
});

function ledgerEntryRow(overrides: Record<string, unknown>) {
  return {
    ledgerKey: 'row-1',
    status: 'ACTIVE',
    entrySignalId: 'signal-1',
    instrumentId: 'stock-1',
    symbol: 'ABC',
    companyName: 'ABC Co',
    scopeRegion: 'IN',
    scopeAssetType: 'STOCK',
    entryTriggerType: 'bullish_entry_trigger',
    entryTriggerTimestamp: new Date('2026-05-26T00:00:00.000Z'),
    entryTriggerPrice: 100,
    entryReasonSummary: 'Entry trigger reason.',
    strategyId: 'BREAKOUT',
    strategyVersion: '1.0.0',
    strategyDecision: 'ENTRY_CANDIDATE',
    strategyReadinessLabel: 'READY',
    strategyRatingGrade: 'A',
    entryRuleId: 'ENTRY_RULE',
    latestTrustedPriceDate: new Date('2026-05-27T00:00:00.000Z'),
    latestTrustedPrice: 110,
    currentReturnPercent: 10,
    currentReturnStatus: 'CURRENT',
    currentDataQualityStatus: 'READY',
    trustEvidenceStatus: 'SOURCE_PROVEN',
    calibrationEvidenceStatus: 'AVAILABLE',
    displayWarnings: [],
    exitSignalId: null,
    exitTriggerTimestamp: null,
    exitTriggerPrice: null,
    exitReasonSummary: null,
    exitRuleId: null,
    exitDecision: null,
    closedAt: null,
    createdAt: new Date('2026-05-26T00:00:00.000Z'),
    updatedAt: new Date('2026-05-26T00:00:00.000Z'),
    ...overrides,
  };
}

function ledgerActiveRow(overrides: Record<string, unknown> = {}) {
  return {
    ledgerKey: 'IN:STOCK:stock-1:bullish_entry_trigger:2026-05-26T00:00:00.000Z',
    status: 'ACTIVE',
    signalId: 'signal-1',
    instrumentId: 'stock-1',
    symbol: 'ABC.NS',
    companyName: 'ABC Co',
    region: 'IN',
    assetType: 'STOCK',
    triggerType: 'bullish_entry_trigger',
    entryTriggerTimestamp: '2026-05-26T00:00:00.000Z',
    entryTriggerPrice: 100,
    entryReasonSummary: 'Entry trigger reason.',
    strategyId: 'BREAKOUT',
    strategyVersion: '1.0.0',
    strategyDecision: 'ENTRY_CANDIDATE',
    strategyReadinessLabel: 'READY',
    strategyRatingGrade: 'A',
    entryRuleId: 'ENTRY_RULE',
    latestTrustedPriceDate: null,
    latestTrustedPrice: null,
    currentReturnPercent: null,
    currentReturnStatus: 'UNAVAILABLE',
    currentDataQualityStatus: 'READY',
    healthState: null,
    lifecycleEvidenceStatus: 'ACTIVE_ENTRY',
    trustEvidenceStatus: 'SOURCE_PROVEN_PRICE_UNAVAILABLE',
    calibrationEvidenceStatus: 'AVAILABLE',
    displayWarnings: [],
    exitSignalId: null,
    exitStrategyId: null,
    exitStrategyVersion: null,
    exitSourceDecisionId: null,
    exitTriggerTimestamp: null,
    exitTriggerPrice: null,
    closePriceStatus: 'UNAVAILABLE',
    exitReasonSummary: null,
    exitRuleId: null,
    exitRuleIds: [],
    exitDecision: null,
    invalidationSourceDecisionId: null,
    invalidationRuleIds: [],
    invalidationTimestamp: null,
    closedAt: null,
    ...overrides,
  };
}

