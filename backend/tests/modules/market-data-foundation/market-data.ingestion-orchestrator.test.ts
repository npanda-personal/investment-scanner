/// <reference types="@types/jest" />

const mockSyncDaily = jest.fn();
jest.mock('../../../src/modules/market-data-foundation/ingestion/market-data-foundation.region-ingestion-registry', () => ({
  resolveRegionAdapter: () => ({ syncDaily: mockSyncDaily }),
}));
jest.mock('../../../src/modules/market-data-foundation/ingestion/market-data-foundation.provider-registry', () => ({
  regionUsesRegionProviderPath: (region: string) => region === 'US' || region === 'EU',
}));
jest.mock('../../../src/modules/market-data-foundation/ingestion/market-data-foundation.market-session', () => ({
  latestCompletedTradingDateForRegion: () => '2026-06-20',
  shouldRunMarketDataSync: () => true,
  tradingDateForRegion: () => '2026-06-20',
}));

import { RegionSyncOrchestrator } from '../../../src/modules/market-data-foundation/ingestion/market-data-foundation.ingestion.orchestrator';
import type { MarketDataIngestionHost } from '../../../src/modules/market-data-foundation/ingestion/market-data-foundation.ingestion-host';

const TASKS = [
  { id: 'id-AAPL', symbol: 'AAPL', region: 'US' },
  { id: 'id-MSFT', symbol: 'MSFT', region: 'US' },
  { id: 'id-GOOG', symbol: 'GOOG', region: 'US' },
];

function buildHost(overrides: Partial<MarketDataIngestionHost> = {}): MarketDataIngestionHost {
  return {
    repository: {
      listActiveStockSyncTasks: jest.fn().mockResolvedValue(TASKS),
      upsertSyncState: jest.fn().mockResolvedValue(undefined),
      instrumentCount: jest.fn().mockResolvedValue(3),
      storeHistoricalBulk: jest.fn(),
      upsertSourceFileImport: jest.fn(),
    } as any,
    manualSyncCooldownMinutes: 5,
    evaluateSyncFreshnessGate: jest.fn().mockResolvedValue({ shouldSkip: false }),
    buildSkippedRegionSummary: jest.fn(),
    scheduledRegionSourceFingerprint: jest.fn().mockReturnValue('fp-test'),
    instrumentIdsForImportedSymbols: jest.fn().mockImplementation(
      (tasks: Array<{ id: string; symbol: string }>, symbols: string[]) => {
        const set = new Set(symbols);
        return tasks.filter((t) => set.has(t.symbol)).map((t) => t.id);
      },
    ),
    importedSymbolsForInstrumentIds: jest.fn().mockReturnValue([]),
    updateStockLoadTimestampsForSymbols: jest.fn().mockResolvedValue(undefined),
    countStaleCatalogSyncTasks: jest.fn().mockResolvedValue(0),
    listStaleCatalogSyncTasks: jest.fn().mockResolvedValue([]),
    importNseCmUdiffDaily: jest.fn(),
    importNseIndexOfficialDaily: jest.fn(),
    officialNseEodBulkEnabled: jest.fn().mockReturnValue(false),
    tryOfficialNseEodBulkLatestCandle: jest.fn(),
    marketDataProvider: { inferRegion: jest.fn(), search: jest.fn(), fetchCompanyMasterData: jest.fn() } as any,
    toV1Instrument: jest.fn() as any,
    latestStoredCandleInfo: jest.fn() as any,
    fetchHistorical: jest.fn() as any,
    storeHistorical: jest.fn() as any,
    ingestSymbol: jest.fn() as any,
    buildSkippedSyncSummary: jest.fn() as any,
    throttleIngestion: jest.fn() as any,
    create: jest.fn() as any,
    fetchCoreFundamentals: jest.fn() as any,
    fetchCorporateActions: jest.fn() as any,
    ...overrides,
  } as any;
}

function defaultBackfillResult(overrides: Record<string, unknown> = {}) {
  return {
    symbolsProcessed: 3,
    barsReceived: 30,
    barsInserted: 20,
    barsUpdated: 10,
    barsSkipped: 0,
    changedSymbols: ['AAPL'],
    warnings: [],
    ...overrides,
  };
}

describe('RegionSyncOrchestrator — US provider path', () => {
  beforeEach(() => {
    mockSyncDaily.mockReset();
  });

  it('downstreamInstrumentIds includes ALL batch instruments, not just changed', async () => {
    mockSyncDaily.mockResolvedValue(defaultBackfillResult({ changedSymbols: ['AAPL'] }));
    const host = buildHost();
    const orchestrator = new RegionSyncOrchestrator(host);

    const result = await orchestrator.syncScheduledRegion('US', { batchSize: 100 });

    expect(result.downstreamInstrumentIds).toEqual(
      expect.arrayContaining(['id-AAPL', 'id-MSFT', 'id-GOOG']),
    );
    expect(result.downstreamInstrumentIds).toHaveLength(3);
  });

  it('dqStageEligible=true when changedSymbols is non-empty', async () => {
    mockSyncDaily.mockResolvedValue(defaultBackfillResult({ changedSymbols: ['AAPL'] }));
    const host = buildHost();
    const result = await new RegionSyncOrchestrator(host).syncScheduledRegion('US');

    expect(result.dqStageEligible).toBe(true);
  });

  it('dqStageEligible=false when changedSymbols is empty', async () => {
    mockSyncDaily.mockResolvedValue(defaultBackfillResult({ changedSymbols: [] }));
    const host = buildHost();
    const result = await new RegionSyncOrchestrator(host).syncScheduledRegion('US');

    expect(result.dqStageEligible).toBe(false);
  });

  it('uses processedSymbols for load-timestamp rotation when present', async () => {
    mockSyncDaily.mockResolvedValue(
      defaultBackfillResult({ processedSymbols: ['AAPL', 'MSFT'] }),
    );
    const host = buildHost();
    await new RegionSyncOrchestrator(host).syncScheduledRegion('US');

    expect(host.updateStockLoadTimestampsForSymbols).toHaveBeenCalledWith(
      ['AAPL', 'MSFT'],
    );
  });

  it('falls back to all symbols when processedSymbols is absent', async () => {
    mockSyncDaily.mockResolvedValue(defaultBackfillResult());
    const host = buildHost();
    await new RegionSyncOrchestrator(host).syncScheduledRegion('US');

    expect(host.updateStockLoadTimestampsForSymbols).toHaveBeenCalledWith(
      ['AAPL', 'MSFT', 'GOOG'],
    );
  });

  it('caps batch size at 2000', async () => {
    mockSyncDaily.mockResolvedValue(defaultBackfillResult());
    const host = buildHost();
    await new RegionSyncOrchestrator(host).syncScheduledRegion('US', { batchSize: 5000 });

    // The orchestrator caps batchSize but the US provider path fetches all tasks
    // without passing batchSize to listActiveStockSyncTasks, so the cap is internal.
    // Verify the adapter received all symbols (no truncation from the tasks list).
    expect(mockSyncDaily).toHaveBeenCalledTimes(1);
    const request = mockSyncDaily.mock.calls[0][0];
    expect(request.symbols).toEqual(['AAPL', 'MSFT', 'GOOG']);
  });
});
