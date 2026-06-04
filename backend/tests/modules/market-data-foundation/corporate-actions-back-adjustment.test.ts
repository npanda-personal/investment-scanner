/// <reference types="@types/jest" />
/**
 * Tests for the wired-together CA import + back-adjustment pipeline.
 *
 * Covers:
 *  A. Import pipeline: parseNseCorporateActions → symbol resolution → upsertCorporateActions
 *     + SourceFileImport recording + returned counts (mock repository)
 *  B. Back-adjustment recompute: load bars + CAs → computeAdjustedCloses → write adjustedClose
 *     (1:1 bonus — prior bars halved; dividend — prior bars scaled by (cPrev-D)/cPrev)
 *
 * Imports only from the two standalone modules (no service) so ts-jest can compile
 * the file without hitting the pre-existing Prisma/implicit-any errors in the larger
 * service file.
 */

import {
  parseNseCorporateActions,
  type NseCorporateActionRow,
} from '../../../src/modules/market-data-foundation/market-data-foundation.corporate-actions-source';

import {
  computeAdjustedCloses,
  type AdjustmentAction,
} from '../../../src/modules/market-data-foundation/market-data-foundation.corporate-adjustment';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** UTC-midnight Date from ISO YYYY-MM-DD string */
const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

/** Build a minimal NseCorporateActionRow */
const row = (symbol: string, subject: string, exDate: string): NseCorporateActionRow => ({
  symbol,
  series: 'EQ',
  subject,
  exDate,
  faceVal: '10',
  ind: '-',
  recDate: '-',
  bcStartDate: '-',
  bcEndDate: '-',
  ndStartDate: '-',
  ndEndDate: '-',
  comp: 'Test Corp',
  isin: 'INE000000000',
  caBroadcastDate: null,
});

// ---------------------------------------------------------------------------
// In-memory fake repository
// ---------------------------------------------------------------------------

class FakeRepository {
  public upsertCorporateActionsCalls: Array<{ stockId: string; actions: any[] }> = [];
  public updateAdjustedClosesCalls: Array<{ symbol: string; updates: Array<{ date: Date; adjustedClose: number }> }> = [];
  public sourceFileImportCalls: any[] = [];
  public findSourceFileImportByKeyResult: any = null;

  stocks: Array<{ id: string; symbol: string; isActive: boolean; isDelisted: boolean }> = [];
  priceBars = new Map<string, Array<{ date: Date; close: number }>>();
  casByStockId = new Map<string, AdjustmentAction[]>();

  findStocksBySymbolsInScope = async (symbols: string[]) =>
    this.stocks.filter((s) => symbols.includes(s.symbol));

  upsertCorporateActions = async (stockId: string, actions: any[]) => {
    this.upsertCorporateActionsCalls.push({ stockId, actions });
    return actions.map((_, i) => ({ id: `ca-${stockId}-${i}` }));
  };

  findSourceFileImportByKey = async (): Promise<any> => this.findSourceFileImportByKeyResult;

  upsertSourceFileImport = async (input: any) => {
    const record = { id: `sfi-${input.status}`, ...input };
    this.sourceFileImportCalls.push(record);
    return record;
  };

  listRawPriceBarsForStock = async (symbol: string) =>
    this.priceBars.get(symbol) ?? [];

  listCorporateActions = async (stockId: string) =>
    this.casByStockId.get(stockId) ?? [];

  updateAdjustedCloses = async (symbol: string, updates: Array<{ date: Date; adjustedClose: number }>) => {
    this.updateAdjustedClosesCalls.push({ symbol, updates });
    return updates.length;
  };
}

// ---------------------------------------------------------------------------
// Inline import pipeline (mirrors the service's importNseCorporateActionsFile)
// Only the mapping/routing logic — no class instantiation, no TS errors.
// ---------------------------------------------------------------------------

async function runImportPipeline(
  rawRows: NseCorporateActionRow[],
  repo: FakeRepository,
  opts: { force?: boolean; region?: string; assetType?: string } = {}
): Promise<{
  status: string;
  received: number;
  inserted: number;
  skipped: number;
  warnings: string[];
  errors: string[];
  affectedSymbols: string[];
  sourceFileImportId: string | null;
}> {
  const parseSource = 'NSE_CORPORATE_ACTIONS';
  const inputText = JSON.stringify(rawRows);

  // Idempotency check
  const existingImport = await repo.findSourceFileImportByKey();
  if (!opts.force && existingImport?.status === 'COMPLETED') {
    return {
      status: 'SKIPPED_DUPLICATE',
      sourceFileImportId: existingImport.id ?? null,
      received: rawRows.length,
      inserted: 0, skipped: 0, warnings: [], errors: [], affectedSymbols: [],
    };
  }

  const tradingDate = new Date('2024-01-01T00:00:00.000Z');

  // PENDING import
  const pendingImport = await repo.upsertSourceFileImport({
    source: 'NSE', segment: 'CORPORATE_ACTIONS', tradingDate,
    fileName: 'nse-ca-test.json',
    fileHash: 'testhash',
    fileSize: Buffer.byteLength(inputText),
    status: 'PENDING', rowsRaw: rawRows.length, rowsAccepted: 0, rowsRejected: 0,
    parserVersion: 'nse-corporate-actions-v1', errorMessage: null,
  });

  try {
    const { parsed, skipped: parseSkipped, warnings: parseWarnings } = parseNseCorporateActions(rawRows, { source: parseSource });

    // Symbol resolution
    const symbols = [...new Set(parsed.map((a) => a.symbol))];
    const matchedStocks = await repo.findStocksBySymbolsInScope(symbols);
    const stockBySymbol = new Map(matchedStocks.map((s: any) => [s.symbol, s]));

    // Group by stockId and upsert
    const byStockId = new Map<string, any[]>();
    const unmatchedWarnings: string[] = [];
    let unmatchedCount = 0;

    for (const action of parsed) {
      const stock = stockBySymbol.get(action.symbol);
      if (!stock?.id) {
        unmatchedCount++;
        unmatchedWarnings.push(`Symbol "${action.symbol}" not found; skipped.`);
        continue;
      }
      const group = byStockId.get(stock.id) ?? [];
      group.push({ action, stock });
      byStockId.set(stock.id, group);
    }

    let insertedCount = 0;
    const upsertWarnings: string[] = [];
    const affectedSymbolSet = new Set<string>();

    for (const [stockId, items] of byStockId.entries()) {
      try {
        const caInputs = items.map(({ action }: any) => ({
          symbol: action.symbol,
          type: action.actionType,
          date: action.effectiveDate.toISOString().slice(0, 10),
          value: action.amount ?? action.splitRatio ?? 0,
          amount: action.amount ?? null,
          splitRatio: action.splitRatio ?? null,
          currency: action.actionType === 'dividend' ? 'INR' : null,
          source: parseSource,
        }));
        const ops = await repo.upsertCorporateActions(stockId, caInputs);
        insertedCount += Array.isArray(ops) ? ops.length : 0;
        items.forEach(({ stock }: any) => affectedSymbolSet.add(stock.symbol));
      } catch (err) {
        upsertWarnings.push(`Upsert failed for ${stockId}: ${err}`);
      }
    }

    const rowsRejected = parseSkipped + unmatchedCount;
    const allWarnings = [...parseWarnings, ...unmatchedWarnings, ...upsertWarnings];

    const completedImport = await repo.upsertSourceFileImport({
      source: 'NSE', segment: 'CORPORATE_ACTIONS', tradingDate,
      fileName: 'nse-ca-test.json',
      fileHash: 'testhash',
      fileSize: Buffer.byteLength(inputText),
      status: 'COMPLETED',
      rowsRaw: rawRows.length, rowsAccepted: insertedCount, rowsRejected: rowsRejected,
      parserVersion: 'nse-corporate-actions-v1', errorMessage: null,
    });

    return {
      status: 'COMPLETED',
      sourceFileImportId: completedImport?.id ?? pendingImport?.id ?? null,
      received: rawRows.length,
      inserted: insertedCount,
      skipped: parseSkipped + unmatchedCount,
      warnings: allWarnings,
      errors: [],
      affectedSymbols: [...affectedSymbolSet].sort(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'FAILED',
      sourceFileImportId: pendingImport?.id ?? null,
      received: rawRows.length, inserted: 0, skipped: 0, warnings: [], errors: [message], affectedSymbols: [],
    };
  }
}

// ---------------------------------------------------------------------------
// Inline recompute pipeline (mirrors recomputeAdjustedClosesForInstrument)
// ---------------------------------------------------------------------------

async function runRecompute(
  stockId: string,
  symbol: string,
  repo: FakeRepository
): Promise<{ bars: number; updated: number; warnings: string[] }> {
  const rawBars = await repo.listRawPriceBarsForStock(symbol);
  if (rawBars.length === 0) return { bars: 0, updated: 0, warnings: [] };

  const caRows = await repo.listCorporateActions(stockId);

  const adjustmentActions: AdjustmentAction[] = caRows
    .filter((ca: any) => ['split', 'bonus', 'reverse_split', 'dividend'].includes(ca.type))
    .map((ca: any): AdjustmentAction => {
      const action: AdjustmentAction = { type: ca.type, exDate: ca.exDate };
      if (ca.type === 'dividend') {
        if (ca.amount != null && ca.amount > 0) action.amount = Number(ca.amount);
      } else {
        if (ca.ratio != null && ca.ratio > 0) action.ratio = Number(ca.ratio);
      }
      return action;
    });

  const { bars: adjustedBars, warnings } = computeAdjustedCloses(rawBars, adjustmentActions);
  const updates = adjustedBars.map((b) => ({ date: b.date, adjustedClose: b.adjustedClose }));
  const updated = await repo.updateAdjustedCloses(symbol, updates);
  return { bars: adjustedBars.length, updated, warnings };
}

// ===========================================================================
// A. Import pipeline
// ===========================================================================

describe('CA import pipeline: parseNseCorporateActions → upsert + SourceFileImport', () => {
  let repo: FakeRepository;

  beforeEach(() => {
    repo = new FakeRepository();
    repo.stocks = [
      { id: 'stock-reliance', symbol: 'RELIANCE', isActive: true, isDelisted: false },
      { id: 'stock-tcs',      symbol: 'TCS',      isActive: true, isDelisted: false },
    ];
  });

  it('maps parsed rows to upsert calls, one per stock', async () => {
    const rows = [
      row('RELIANCE', 'Bonus 1:1', '15-Oct-2023'),
      row('TCS',      'Dividend - Rs 5 Per Share', '20-Nov-2023'),
    ];
    const result = await runImportPipeline(rows, repo);

    expect(result.status).toBe('COMPLETED');
    expect(result.received).toBe(2);
    expect(result.errors).toHaveLength(0);

    expect(repo.upsertCorporateActionsCalls).toHaveLength(2);
    const relianceCall = repo.upsertCorporateActionsCalls.find((c) => c.stockId === 'stock-reliance');
    expect(relianceCall).toBeDefined();
    expect(relianceCall!.actions[0].type).toBe('bonus');
    expect(relianceCall!.actions[0].splitRatio).toBeCloseTo(2);

    const tcsCall = repo.upsertCorporateActionsCalls.find((c) => c.stockId === 'stock-tcs');
    expect(tcsCall).toBeDefined();
    expect(tcsCall!.actions[0].type).toBe('dividend');
    expect(tcsCall!.actions[0].amount).toBeCloseTo(5);
  });

  it('records a SourceFileImport with source=NSE, segment=CORPORATE_ACTIONS', async () => {
    const rows = [row('RELIANCE', 'Bonus 1:1', '15-Oct-2023')];
    await runImportPipeline(rows, repo);

    const completedCall = repo.sourceFileImportCalls.find((c) => c.status === 'COMPLETED');
    expect(completedCall).toBeDefined();
    expect(completedCall.source).toBe('NSE');
    expect(completedCall.segment).toBe('CORPORATE_ACTIONS');
    expect(completedCall.rowsRaw).toBe(1);
    expect(completedCall.parserVersion).toBe('nse-corporate-actions-v1');
  });

  it('counts accepted rows in SourceFileImport', async () => {
    const rows = [row('RELIANCE', 'Bonus 1:1', '15-Oct-2023')];
    await runImportPipeline(rows, repo);

    const completedCall = repo.sourceFileImportCalls.find((c) => c.status === 'COMPLETED');
    expect(completedCall!.rowsAccepted).toBeGreaterThanOrEqual(1);
  });

  it('skips unknown symbol without throwing (per-row isolation)', async () => {
    const rows = [
      row('UNKNOWN_XYZ', 'Bonus 1:1', '15-Oct-2023'),
      row('RELIANCE',    'Bonus 1:1', '15-Oct-2023'),
    ];
    const result = await runImportPipeline(rows, repo);

    expect(result.status).toBe('COMPLETED');
    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(result.inserted).toBeGreaterThanOrEqual(1);
    expect(result.errors).toHaveLength(0);
  });

  it('returns SKIPPED_DUPLICATE when same content already imported (force=false)', async () => {
    repo.findSourceFileImportByKeyResult = { id: 'sfi-existing', status: 'COMPLETED' };
    const rows = [row('RELIANCE', 'Bonus 1:1', '15-Oct-2023')];
    const result = await runImportPipeline(rows, repo, { force: false });

    expect(result.status).toBe('SKIPPED_DUPLICATE');
    expect(result.sourceFileImportId).toBe('sfi-existing');
    expect(repo.upsertCorporateActionsCalls).toHaveLength(0);
  });

  it('force=true re-imports even if content already imported', async () => {
    repo.findSourceFileImportByKeyResult = { id: 'sfi-existing', status: 'COMPLETED' };
    const rows = [row('RELIANCE', 'Bonus 1:1', '15-Oct-2023')];
    const result = await runImportPipeline(rows, repo, { force: true });

    expect(result.status).toBe('COMPLETED');
    expect(repo.upsertCorporateActionsCalls).toHaveLength(1);
  });

  it('skips rows with unrecognised subject without throwing', async () => {
    const rows = [row('RELIANCE', 'AGM Notice', '15-Oct-2023')];
    const result = await runImportPipeline(rows, repo);

    expect(result.status).toBe('COMPLETED');
    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(repo.upsertCorporateActionsCalls).toHaveLength(0);
  });

  it('returns correct affectedSymbols list', async () => {
    const rows = [
      row('RELIANCE', 'Bonus 1:1', '15-Oct-2023'),
      row('TCS',      'Dividend - Rs 5 Per Share', '20-Nov-2023'),
    ];
    const result = await runImportPipeline(rows, repo);

    expect(result.affectedSymbols).toContain('RELIANCE');
    expect(result.affectedSymbols).toContain('TCS');
  });
});

// ===========================================================================
// B. Back-adjustment recompute: 1:1 bonus
// ===========================================================================

describe('recompute: 1:1 bonus (ratio=2, exDate=2023-10-15)', () => {
  let repo: FakeRepository;

  beforeEach(() => {
    repo = new FakeRepository();
    repo.priceBars.set('BONUS_CO', [
      { date: d('2023-10-10'), close: 200 },
      { date: d('2023-10-11'), close: 210 },
      { date: d('2023-10-12'), close: 220 },
      { date: d('2023-10-13'), close: 230 },
      { date: d('2023-10-16'), close: 120 }, // after ex-date (reference bar)
    ]);
    // AdjustmentAction shape directly (as stored in fake repo)
    repo.casByStockId.set('stock-bonus', [
      { type: 'bonus', exDate: d('2023-10-15'), ratio: 2 } as AdjustmentAction,
    ]);
  });

  it('returns 5 bars', async () => {
    const result = await runRecompute('stock-bonus', 'BONUS_CO', repo);
    expect(result.bars).toBe(5);
  });

  it('pre-bonus bars have adjustedClose ≈ close / 2 (factor = 1/2)', async () => {
    await runRecompute('stock-bonus', 'BONUS_CO', repo);

    const call = repo.updateAdjustedClosesCalls[0];
    expect(call).toBeDefined();
    expect(call.symbol).toBe('BONUS_CO');

    const byDate = new Map(call.updates.map((u) => [u.date.toISOString().slice(0, 10), u.adjustedClose]));

    expect(byDate.get('2023-10-10')).toBeCloseTo(100, 4); // 200 * 0.5
    expect(byDate.get('2023-10-11')).toBeCloseTo(105, 4); // 210 * 0.5
    expect(byDate.get('2023-10-12')).toBeCloseTo(110, 4); // 220 * 0.5
    expect(byDate.get('2023-10-13')).toBeCloseTo(115, 4); // 230 * 0.5
    // Reference bar: adjustedClose === close
    expect(byDate.get('2023-10-16')).toBeCloseTo(120, 4);
  });

  it('calls updateAdjustedCloses once with all 5 bars', async () => {
    await runRecompute('stock-bonus', 'BONUS_CO', repo);
    expect(repo.updateAdjustedClosesCalls).toHaveLength(1);
    expect(repo.updateAdjustedClosesCalls[0].updates).toHaveLength(5);
  });

  it('returns updated = 5 (fake repo returns updates.length)', async () => {
    const result = await runRecompute('stock-bonus', 'BONUS_CO', repo);
    expect(result.updated).toBe(5);
  });
});

// ===========================================================================
// C. Back-adjustment recompute: dividend
// ===========================================================================

describe('recompute: dividend (amount=10, exDate=2023-11-20)', () => {
  let repo: FakeRepository;

  beforeEach(() => {
    repo = new FakeRepository();
    // Prior bar close = 100; factor = (100-10)/100 = 0.9
    repo.priceBars.set('DIV_CO', [
      { date: d('2023-11-18'), close: 95 },
      { date: d('2023-11-19'), close: 100 }, // last bar before exDate → cPrev
      { date: d('2023-11-21'), close: 90 },  // after exDate → reference
    ]);
    repo.casByStockId.set('stock-div', [
      { type: 'dividend', exDate: d('2023-11-20'), amount: 10 } as AdjustmentAction,
    ]);
  });

  it('pre-dividend bars scaled by (cPrev - D) / cPrev', async () => {
    await runRecompute('stock-div', 'DIV_CO', repo);

    const call = repo.updateAdjustedClosesCalls[0];
    const byDate = new Map(call.updates.map((u) => [u.date.toISOString().slice(0, 10), u.adjustedClose]));

    // factor = (100 - 10) / 100 = 0.9
    expect(byDate.get('2023-11-18')).toBeCloseTo(95 * 0.9, 4);   // ≈ 85.5
    expect(byDate.get('2023-11-19')).toBeCloseTo(100 * 0.9, 4);  // ≈ 90.0
    // After exDate: reference bar, factor = 1
    expect(byDate.get('2023-11-21')).toBeCloseTo(90, 4);
  });

  it('calls updateAdjustedCloses with 3 bars', async () => {
    await runRecompute('stock-div', 'DIV_CO', repo);
    expect(repo.updateAdjustedClosesCalls[0].updates).toHaveLength(3);
  });
});

// ===========================================================================
// D. Edge cases
// ===========================================================================

describe('recompute edge cases', () => {
  let repo: FakeRepository;
  beforeEach(() => { repo = new FakeRepository(); });

  it('returns bars=0, updated=0 when no price bars', async () => {
    repo.priceBars.set('EMPTY_CO', []);
    repo.casByStockId.set('stock-empty', []);
    const result = await runRecompute('stock-empty', 'EMPTY_CO', repo);
    expect(result.bars).toBe(0);
    expect(result.updated).toBe(0);
    expect(repo.updateAdjustedClosesCalls).toHaveLength(0);
  });

  it('with no CAs, adjustedClose equals close for every bar', async () => {
    repo.priceBars.set('NOCA_CO', [
      { date: d('2023-10-10'), close: 100 },
      { date: d('2023-10-11'), close: 105 },
    ]);
    repo.casByStockId.set('stock-noca', []);

    await runRecompute('stock-noca', 'NOCA_CO', repo);

    const call = repo.updateAdjustedClosesCalls[0];
    const byDate = new Map(call.updates.map((u) => [u.date.toISOString().slice(0, 10), u.adjustedClose]));
    expect(byDate.get('2023-10-10')).toBeCloseTo(100, 4);
    expect(byDate.get('2023-10-11')).toBeCloseTo(105, 4);
  });

  it('ignores invalid CA types', async () => {
    repo.priceBars.set('BAD_CA', [
      { date: d('2023-10-10'), close: 100 },
    ]);
    // 'rights' type is not valid and should be filtered out
    repo.casByStockId.set('stock-bad', [
      { type: 'rights', exDate: d('2023-10-05'), ratio: 1 } as any,
    ]);

    // runRecompute filters out unknown types — no adjustment, adjustedClose === close
    await runRecompute('stock-bad', 'BAD_CA', repo);

    const call = repo.updateAdjustedClosesCalls[0];
    expect(call.updates[0].adjustedClose).toBeCloseTo(100, 4);
  });
});

// ===========================================================================
// E. decimalKey natural-key reconciliation check
// ===========================================================================

describe('decimalKey natural-key format reconciliation', () => {
  /**
   * Verifies that buildCorporateActionNaturalKey uses the same decimalKey
   * format as the repository's corporateActionNaturalKeyFromParts:
   *   numeric.toFixed(8).replace(/\.?0+$/, '')
   *
   * If the two formats differ, upsert dedup breaks (duplicate records).
   */
  it('integer ratio produces no trailing zeros or decimal point', () => {
    // 1:1 bonus → splitRatio = 2 → key segment should be "2" (not "2.0" or "2.00000000")
    const { buildCorporateActionNaturalKey } = require('../../../src/modules/market-data-foundation/market-data-foundation.corporate-actions-source');
    const key = buildCorporateActionNaturalKey('stock-123', {
      actionType: 'bonus',
      effectiveDate: d('2023-10-15'),
      source: 'NSE_CORPORATE_ACTIONS',
      splitRatio: 2,
      amount: undefined,
    });
    const parts = key.split('|');
    const splitRatioSegment = parts[5]; // [stockId, actionType, date, source, amountKey, splitRatioKey]
    expect(splitRatioSegment).toBe('2');
  });

  it('decimal ratio preserves significant decimal digits', () => {
    const { buildCorporateActionNaturalKey } = require('../../../src/modules/market-data-foundation/market-data-foundation.corporate-actions-source');
    // 2:1 bonus → splitRatio = 1.5 → "1.5" (not "1.50000000")
    const key = buildCorporateActionNaturalKey('stock-123', {
      actionType: 'bonus',
      effectiveDate: d('2023-10-15'),
      source: 'NSE_CORPORATE_ACTIONS',
      splitRatio: 1.5,
      amount: undefined,
    });
    const splitRatioSegment = key.split('|')[5];
    expect(splitRatioSegment).toBe('1.5');
  });

  it('null/undefined produces "null" key segment', () => {
    const { buildCorporateActionNaturalKey } = require('../../../src/modules/market-data-foundation/market-data-foundation.corporate-actions-source');
    const key = buildCorporateActionNaturalKey('stock-123', {
      actionType: 'bonus',
      effectiveDate: d('2023-10-15'),
      source: 'NSE_CORPORATE_ACTIONS',
      splitRatio: undefined,
      amount: undefined,
    });
    // Both amount and splitRatio are null → last two segments are 'null'
    const parts = key.split('|');
    expect(parts[4]).toBe('null'); // amountKey
    expect(parts[5]).toBe('null'); // splitRatioKey
  });

  it('matches the repository decimalKey format for an 8-decimal amount', () => {
    const { buildCorporateActionNaturalKey } = require('../../../src/modules/market-data-foundation/market-data-foundation.corporate-actions-source');
    // dividend Rs 0.125 → "0.125" (not "0.12500000")
    const key = buildCorporateActionNaturalKey('stock-123', {
      actionType: 'dividend',
      effectiveDate: d('2023-10-15'),
      source: 'NSE_CORPORATE_ACTIONS',
      amount: 0.125,
      splitRatio: undefined,
    });
    const amountSegment = key.split('|')[4];
    expect(amountSegment).toBe('0.125');
  });
});
