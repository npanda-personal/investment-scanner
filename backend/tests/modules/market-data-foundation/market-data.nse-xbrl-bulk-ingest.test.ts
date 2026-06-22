/// <reference types="@types/jest" />
/**
 * Tests for importNseXbrlFundamentalsForUniverse.
 *
 * All NSE HTTP calls and DB operations are fully mocked — no real fetches,
 * no real database.
 */
import { MarketDataFoundationService } from '../../../src/modules/market-data-foundation/market-data-foundation.service';
import { toManualVerifiedFundamentalsCsv } from '../../../src/modules/market-data-foundation/ingestion/india/market-data-foundation.nse-xbrl-fundamentals-exporter';
import type { ManualVerifiedFundamentalsCsvRow } from '../../../src/modules/market-data-foundation/ingestion/india/market-data-foundation.nse-xbrl-fundamentals-exporter';

// ---------------------------------------------------------------------------
// Helpers to build canned rows / CSV
// ---------------------------------------------------------------------------

const makeRow = (overrides: Partial<ManualVerifiedFundamentalsCsvRow> = {}): ManualVerifiedFundamentalsCsvRow => ({
  symbol: 'RELIANCE',
  periodType: 'QUARTERLY',
  periodEndDate: '2024-03-31',
  revenue: '1000000',
  netIncome: '200000',
  eps: '5.00',
  source: 'MANUAL_VERIFIED',
  sourceUrl: 'https://nsearchives.nseindia.com/xbrl/test.xml',
  validatedBy: 'NSE_XBRL_AUTO',
  validatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Fake repository
// ---------------------------------------------------------------------------

type FakeStock = { id: string; symbol: string };

class FakeRepository {
  stocks: FakeStock[];
  fundamentalRowsByStockId: Map<string, Array<{ periodType: string; periodEndDate: string }>>;
  upsertSourceFileImportCalls: any[] = [];
  findStocksBySymbolsInScopeCalls: any[] = [];

  constructor(stocks: FakeStock[] = [], fundamentalRowsByStockId: Map<string, any[]> = new Map()) {
    this.stocks = stocks;
    this.fundamentalRowsByStockId = fundamentalRowsByStockId;
  }

  async listStocksForFundamentalsIngestion(opts: { region: string; assetType: string; batchSize: number; offset: number }) {
    const slice = this.stocks.slice(opts.offset, opts.offset + opts.batchSize);
    return { stocks: slice, total: this.stocks.length };
  }

  async listExistingFundamentalPeriods(stockId: string): Promise<Set<string>> {
    const rows = this.fundamentalRowsByStockId.get(stockId) ?? [];
    return new Set<string>(rows.map((r) => `${r.periodType}|${r.periodEndDate}`));
  }

  async findStocksBySymbolsInScope(symbols: string[], _opts: any) {
    this.findStocksBySymbolsInScopeCalls.push(symbols);
    return this.stocks.filter((s) => symbols.map((x) => x.toUpperCase()).includes(s.symbol.toUpperCase()));
  }

  async upsertSourceFileImport(data: any) {
    this.upsertSourceFileImportCalls.push(data);
    return { id: `sfid-${this.upsertSourceFileImportCalls.length}`, ...data };
  }

  async upsertManualVerifiedFundamental(stockId: string, input: any) {
    return { id: `fund-${stockId}-${input.periodType}-${input.periodEndDate?.toISOString?.()?.slice(0, 10)}` };
  }
}

// ---------------------------------------------------------------------------
// Fake exporter
// ---------------------------------------------------------------------------

class FakeExporter {
  calls: Array<{ symbols: string[]; validatedBy: string }> = [];
  rowsToReturn: ManualVerifiedFundamentalsCsvRow[];
  shouldThrow: boolean;

  constructor(rows: ManualVerifiedFundamentalsCsvRow[] = [], shouldThrow = false) {
    this.rowsToReturn = rows;
    this.shouldThrow = shouldThrow;
  }

  async exportSymbols(opts: { symbols: string[]; validatedBy: string; [key: string]: any }) {
    this.calls.push({ symbols: opts.symbols, validatedBy: opts.validatedBy });
    if (this.shouldThrow) throw new Error('NSE fetch failed (simulated)');
    const rows = this.rowsToReturn.filter((r) =>
      opts.symbols.map((s) => s.toUpperCase()).includes(r.symbol.toUpperCase())
    );
    return {
      rows,
      csvText: toManualVerifiedFundamentalsCsv(rows),
      report: { warnings: [] },
    };
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('importNseXbrlFundamentalsForUniverse', () => {
  it('processes all stocks in batches and passes validatedBy=NSE_XBRL_AUTO to the exporter', async () => {
    const stocks: FakeStock[] = [
      { id: 'id-rel', symbol: 'RELIANCE' },
      { id: 'id-infy', symbol: 'INFY' },
      { id: 'id-tcs', symbol: 'TCS' },
    ];
    const rows: ManualVerifiedFundamentalsCsvRow[] = [
      makeRow({ symbol: 'RELIANCE', periodEndDate: '2024-03-31' }),
      makeRow({ symbol: 'INFY', periodEndDate: '2024-03-31' }),
      makeRow({ symbol: 'TCS', periodEndDate: '2024-03-31' }),
    ];
    const repo = new FakeRepository(stocks);
    const exporter = new FakeExporter(rows);
    const service = new MarketDataFoundationService(repo as any);

    const result = await service.importNseXbrlFundamentalsForUniverse({
      symbolBatchSize: 2,
      maxQuarterlyPeriods: 2,
      maxAnnualPeriods: 1,
      delayBetweenBatchesMs: 0,
      _exporter: exporter,
    });

    // 3 stocks with batchSize=2 => batches 1 (RELIANCE, INFY) + batch 2 (TCS)
    expect(result.batches).toBe(2);
    expect(result.symbolsProcessed).toBe(3);
    expect(result.errors).toHaveLength(0);

    // Exporter must always receive validatedBy='NSE_XBRL_AUTO'
    for (const call of exporter.calls) {
      expect(call.validatedBy).toBe('NSE_XBRL_AUTO');
    }
  });

  it('skips periods that already exist in the DB (D5 dedup protection)', async () => {
    const stocks: FakeStock[] = [{ id: 'id-rel', symbol: 'RELIANCE' }];

    // RELIANCE already has QUARTERLY|2024-03-31 stored
    const existingPeriods = new Map([
      ['id-rel', [{ periodType: 'QUARTERLY', periodEndDate: '2024-03-31' }]],
    ]);
    const repo = new FakeRepository(stocks, existingPeriods);

    const rows: ManualVerifiedFundamentalsCsvRow[] = [
      makeRow({ symbol: 'RELIANCE', periodType: 'QUARTERLY', periodEndDate: '2024-03-31' }), // already exists
      makeRow({ symbol: 'RELIANCE', periodType: 'QUARTERLY', periodEndDate: '2023-12-31' }), // new
    ];
    const exporter = new FakeExporter(rows);
    const service = new MarketDataFoundationService(repo as any);

    const result = await service.importNseXbrlFundamentalsForUniverse({
      symbolBatchSize: 25,
      delayBetweenBatchesMs: 0,
      _exporter: exporter,
    });

    // 1 period was skipped because it already existed
    expect(result.rowsSkippedExisting).toBe(1);
    // 1 new row was imported (2023-12-31)
    expect(result.rowsImported).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('isolates per-batch errors so a failing batch does not abort the run', async () => {
    const stocks: FakeStock[] = [
      { id: 'id-rel', symbol: 'RELIANCE' },
      { id: 'id-infy', symbol: 'INFY' },
    ];
    const repo = new FakeRepository(stocks);

    // Exporter throws unconditionally
    const throwingExporter = new FakeExporter([], /* shouldThrow */ true);
    const service = new MarketDataFoundationService(repo as any);

    const result = await service.importNseXbrlFundamentalsForUniverse({
      symbolBatchSize: 1,
      delayBetweenBatchesMs: 0,
      _exporter: throwingExporter,
    });

    // Both batches failed but the run completed (2 errors, not an exception)
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.symbolsProcessed).toBeGreaterThan(0);
  });

  it('respects maxSymbols limit', async () => {
    const stocks: FakeStock[] = [
      { id: 'id-rel', symbol: 'RELIANCE' },
      { id: 'id-infy', symbol: 'INFY' },
      { id: 'id-tcs', symbol: 'TCS' },
    ];
    const rows = stocks.map((s) => makeRow({ symbol: s.symbol }));
    const repo = new FakeRepository(stocks);
    const exporter = new FakeExporter(rows);
    const service = new MarketDataFoundationService(repo as any);

    const result = await service.importNseXbrlFundamentalsForUniverse({
      symbolBatchSize: 10,
      maxSymbols: 2,
      delayBetweenBatchesMs: 0,
      _exporter: exporter,
    });

    expect(result.symbolsProcessed).toBeLessThanOrEqual(2);
  });

  it('returns zero counts when universe is empty', async () => {
    const repo = new FakeRepository([]);
    const exporter = new FakeExporter([]);
    const service = new MarketDataFoundationService(repo as any);

    const result = await service.importNseXbrlFundamentalsForUniverse({
      delayBetweenBatchesMs: 0,
      _exporter: exporter,
    });

    expect(result.symbolsProcessed).toBe(0);
    expect(result.batches).toBe(0);
    expect(result.rowsImported).toBe(0);
    expect(result.rowsSkippedExisting).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('accumulates exporter warnings in the result', async () => {
    const stocks: FakeStock[] = [{ id: 'id-rel', symbol: 'RELIANCE' }];
    const repo = new FakeRepository(stocks);

    const exporterWithWarnings = {
      async exportSymbols(_opts: any) {
        return {
          rows: [],
          csvText: '',
          report: { warnings: ['RELIANCE QUARTERLY: no XBRL data found.'] },
        };
      },
    };
    const service = new MarketDataFoundationService(repo as any);

    const result = await service.importNseXbrlFundamentalsForUniverse({
      delayBetweenBatchesMs: 0,
      _exporter: exporterWithWarnings,
    });

    expect(result.warnings).toContain('RELIANCE QUARTERLY: no XBRL data found.');
  });
});
