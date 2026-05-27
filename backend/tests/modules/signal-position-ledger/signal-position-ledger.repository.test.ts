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
});

