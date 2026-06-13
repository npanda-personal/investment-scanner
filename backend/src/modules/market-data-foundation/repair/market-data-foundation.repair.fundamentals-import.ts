// Auto-extracted repair sibling (Phase 5c). Bodies are byte-identical to the pre-extraction inline
// implementation in market-data-foundation.service.ts, except that stays-on-service / cross-engine
// collaborators are reached through the host (this.X -> this.host.X) and pure util/mapper helpers
// are imported directly. The service constructs this once and keeps byte-identical public delegators
// for the controller-facing repair surface.

import os from 'os';
import path from 'path';
import type { MarketDataRepairHost } from './market-data-foundation.repair-host';
import type {
  ParsedManualVerifiedFundamentalRow,
  RejectedManualVerifiedFundamentalRow,
} from './market-data-foundation.repair.types';
import {
  MANUAL_VERIFIED_FUNDAMENTALS_PARSER_VERSION,
  MANUAL_VERIFIED_FUNDAMENTALS_SEGMENT,
  MANUAL_VERIFIED_FUNDAMENTALS_SOURCE,
} from './market-data-foundation.repair.types';
import {
  assertManualVerifiedFundamentalsHeaders as assertManualVerifiedFundamentalsHeadersFn,
  parseManualVerifiedFundamentalsRow as parseManualVerifiedFundamentalsRowFn,
  manualVerifiedFundamentalsEvidenceDate as manualVerifiedFundamentalsEvidenceDateFn,
  manualFundamentalsStocksBySymbol as manualFundamentalsStocksBySymbolFn,
} from './market-data-foundation.repair.fundamentals-import.parsers';
import {
  parseCsv as parseCsvUtil,
} from '../util/market-data-foundation.util.csv';
import {
  normalizeExchangeTradingDate as normalizeExchangeTradingDateUtil,
} from '../util/market-data-foundation.util.dates';
import { createHash } from 'crypto';
import {
  NseXbrlFundamentalsCsvExporter,
  toManualVerifiedFundamentalsCsv,
  type ManualVerifiedFundamentalsCsvRow,
} from '../ingestion/india/market-data-foundation.nse-xbrl-fundamentals-exporter';

export class RepairFundamentalsImportService {
  constructor(private readonly host: MarketDataRepairHost) {}

  public async importManualVerifiedFundamental(input: {
    stockId: string;
    region?: string;
    assetType?: string;
    periodType: string;
    periodEndDate: Date | string;
    revenue?: number | null;
    eps?: number | null;
    netIncome?: number | null;
    peRatio?: number | null;
    marketCap?: number | null;
    sourceNote?: string | null;
    sourceUrl?: string | null;
    validatedBy?: string | null;
    validatedAt?: Date | string | null;
    currency?: string | null;
  }) {
    const stockId = input.stockId?.trim();
    if (!stockId) throw new Error('stockId is required.');
    const periodType = input.periodType?.trim().toUpperCase();
    if (!periodType) throw new Error('periodType is required.');
    const periodEndDate = normalizeExchangeTradingDateUtil(input.periodEndDate);
    const validatedAt = input.validatedAt ? new Date(input.validatedAt) : new Date();
    if (Number.isNaN(validatedAt.getTime())) throw new Error('validatedAt must be a valid date.');

    const stock = await this.host.repository.findStockByIdInScope(stockId, {
      region: input.region,
      assetType: input.assetType,
    });
    if (!stock) throw new Error('Instrument not found for manual verified fundamental import.');

    const row = await (this.host.repository as any).upsertManualVerifiedFundamental(stock.id, {
      periodType,
      periodEndDate,
      revenue: input.revenue ?? null,
      eps: input.eps ?? null,
      netIncome: input.netIncome ?? null,
      peRatio: input.peRatio ?? null,
      marketCap: input.marketCap ?? null,
      sourceNote: input.sourceNote ?? null,
      sourceUrl: input.sourceUrl ?? null,
      validatedBy: input.validatedBy ?? null,
      validatedAt,
      currency: input.currency ?? stock.currency ?? 'INR',
    });

    return {
      status: 'IMPORTED',
      stockId: stock.id,
      symbol: stock.symbol,
      source: 'MANUAL_VERIFIED',
      periodType,
      periodEndDate: periodEndDate.toISOString(),
      validatedAt: validatedAt.toISOString(),
      id: row?.id ?? null,
    };
  }


  public async importBulkManualVerifiedFundamentals(input: {
    fileName?: string;
    csvText: string;
    region?: string;
    assetType?: string;
    sourceUrl?: string | null;
    evidenceDate?: Date | string | null;
  }) {
    const started = Date.now();
    const csvText = input.csvText || '';
    if (!csvText.trim()) throw new Error('Bulk manual verified fundamentals import requires CSV text.');
    assertManualVerifiedFundamentalsHeadersFn(csvText);

    const rows = parseCsvUtil(csvText);
    if (rows.length === 0) {
      throw new Error('Bulk manual verified fundamentals import requires at least one data row.');
    }

    const fileName = path.basename((input.fileName || 'manual-verified-fundamentals.csv').trim() || 'manual-verified-fundamentals.csv');
    const region = input.region?.trim().toUpperCase() || 'IN';
    const assetType = input.assetType?.trim().toUpperCase() || 'STOCK';
    const fileHash = createHash('sha256').update(csvText.replace(/\r\n/g, '\n').trim()).digest('hex');
    const fileSize = Buffer.byteLength(csvText, 'utf8');
    const parsedRows: ParsedManualVerifiedFundamentalRow[] = [];
    const rejectedRows: RejectedManualVerifiedFundamentalRow[] = [];

    rows.forEach((row, index) => {
      const parsed = parseManualVerifiedFundamentalsRowFn(row, index + 2, input.sourceUrl ?? null);
      if (parsed.valid) {
        parsedRows.push(parsed.row);
      } else {
        rejectedRows.push(parsed.rejection);
      }
    });

    const evidenceDate = input.evidenceDate
      ? normalizeExchangeTradingDateUtil(input.evidenceDate)
      : manualVerifiedFundamentalsEvidenceDateFn(parsedRows);
    const repository = this.host.repository as any;
    if (typeof repository.upsertSourceFileImport !== 'function') {
      throw new Error('SourceFileImport evidence persistence is required for bulk manual verified fundamentals import.');
    }

    const pendingImport = await repository.upsertSourceFileImport({
      source: MANUAL_VERIFIED_FUNDAMENTALS_SOURCE,
      segment: MANUAL_VERIFIED_FUNDAMENTALS_SEGMENT,
      tradingDate: evidenceDate,
      fileName,
      fileUrl: input.sourceUrl ?? null,
      fileHash,
      fileSize,
      status: 'PENDING',
      rowsRaw: rows.length,
      rowsAccepted: 0,
      rowsRejected: 0,
      parserVersion: MANUAL_VERIFIED_FUNDAMENTALS_PARSER_VERSION,
      errorMessage: null,
    });

    const symbols = [...new Set(parsedRows.map((row) => row.symbol))];
    const scopedStocks = typeof repository.findStocksBySymbolsInScope === 'function'
      ? await repository.findStocksBySymbolsInScope(symbols, { region, assetType })
      : [];
    const stocksBySymbol = manualFundamentalsStocksBySymbolFn(scopedStocks);
    const importedRecords: any[] = [];
    const seenNaturalKeys = new Set<string>();

    for (const row of parsedRows) {
      const candidates = stocksBySymbol.get(row.symbol) || [];
      const uniqueCandidates = [...new Map(candidates.map((stock: any) => [stock.id, stock])).values()];
      if (uniqueCandidates.length === 0) {
        rejectedRows.push({
          rowNumber: row.rowNumber,
          symbol: row.symbol,
          reason: 'Instrument not found in scoped review universe.',
          errors: [`${row.symbol} was not found for ${region}/${assetType}.`],
        });
        continue;
      }
      if (uniqueCandidates.length > 1) {
        rejectedRows.push({
          rowNumber: row.rowNumber,
          symbol: row.symbol,
          reason: 'Ambiguous instrument in scoped review universe.',
          errors: [`${row.symbol} matched multiple instruments for ${region}/${assetType}.`],
        });
        continue;
      }

      const stock = uniqueCandidates[0] as any;
      const naturalKey = `${stock.id}|${row.periodType}|${row.periodEndDate.toISOString().slice(0, 10)}`;
      if (seenNaturalKeys.has(naturalKey)) {
        rejectedRows.push({
          rowNumber: row.rowNumber,
          symbol: row.symbol,
          reason: 'Duplicate fundamental period in import file.',
          errors: [`Duplicate ${row.periodType} period ${row.periodEndDate.toISOString().slice(0, 10)} for ${row.symbol}.`],
        });
        continue;
      }
      seenNaturalKeys.add(naturalKey);

      try {
        const saved = await repository.upsertManualVerifiedFundamental(stock.id, {
          periodType: row.periodType,
          periodEndDate: row.periodEndDate,
          revenue: row.revenue,
          eps: row.eps,
          netIncome: row.netIncome,
          peRatio: row.peRatio,
          marketCap: row.marketCap,
          sourceNote: row.sourceNote,
          sourceUrl: row.sourceUrl,
          validatedBy: row.validatedBy,
          validatedAt: row.validatedAt,
          currency: row.currency ?? stock.currency ?? 'INR',
        });
        importedRecords.push({
          id: saved?.id ?? null,
          stockId: stock.id,
          symbol: stock.symbol || row.symbol,
          periodType: row.periodType,
          periodEndDate: row.periodEndDate.toISOString().slice(0, 10),
          revenue: row.revenue,
          netIncome: row.netIncome,
          eps: row.eps,
          source: MANUAL_VERIFIED_FUNDAMENTALS_SOURCE,
          sourceUrl: row.sourceUrl,
          validatedBy: row.validatedBy,
          validatedAt: row.validatedAt.toISOString(),
        });
      } catch (error) {
        rejectedRows.push({
          rowNumber: row.rowNumber,
          symbol: row.symbol,
          reason: 'Fundamental row persistence failed.',
          errors: [error instanceof Error ? error.message : 'Unknown persistence error.'],
        });
      }
    }

    const finalStatus = importedRecords.length > 0 ? 'COMPLETED' : 'FAILED';
    const completedImport = await repository.upsertSourceFileImport({
      source: MANUAL_VERIFIED_FUNDAMENTALS_SOURCE,
      segment: MANUAL_VERIFIED_FUNDAMENTALS_SEGMENT,
      tradingDate: evidenceDate,
      fileName,
      fileUrl: input.sourceUrl ?? null,
      fileHash,
      fileSize,
      status: finalStatus,
      rowsRaw: rows.length,
      rowsAccepted: importedRecords.length,
      rowsRejected: rejectedRows.length,
      parserVersion: MANUAL_VERIFIED_FUNDAMENTALS_PARSER_VERSION,
      errorMessage: finalStatus === 'FAILED' ? 'No valid manual verified fundamental rows were imported.' : null,
    });

    const quarterlyRecords = importedRecords.filter((record) => record.periodType === 'QUARTERLY');
    const annualRecords = importedRecords.filter((record) => record.periodType === 'ANNUAL');
    const buildCoverage = (recordsForPeriod: any[]) => ({
      rowsImported: recordsForPeriod.length,
      symbolsCovered: new Set(recordsForPeriod.map((record) => record.symbol)).size,
      periodsCovered: new Set(recordsForPeriod.map((record) => record.periodEndDate)).size,
      symbols: [...new Set(recordsForPeriod.map((record) => record.symbol))].sort(),
      latestPeriodEndDate: recordsForPeriod
        .map((record) => record.periodEndDate)
        .sort()
        .at(-1) ?? null,
    });

    return {
      status: finalStatus,
      source: MANUAL_VERIFIED_FUNDAMENTALS_SOURCE,
      segment: MANUAL_VERIFIED_FUNDAMENTALS_SEGMENT,
      region,
      assetType,
      fileName,
      rowsRead: rows.length,
      rowsImported: importedRecords.length,
      rowsRejected: rejectedRows.length,
      symbolsCovered: new Set(importedRecords.map((record) => record.symbol)).size,
      quarterlyCoverage: buildCoverage(quarterlyRecords),
      annualCoverage: buildCoverage(annualRecords),
      sampleRecords: importedRecords.slice(0, 5),
      rejectedRows: rejectedRows.slice(0, 25),
      sourceFileImport: {
        id: completedImport?.id ?? pendingImport?.id ?? null,
        source: MANUAL_VERIFIED_FUNDAMENTALS_SOURCE,
        segment: MANUAL_VERIFIED_FUNDAMENTALS_SEGMENT,
        evidenceDate: evidenceDate.toISOString().slice(0, 10),
        fileName,
        fileHash,
        fileSize,
        status: finalStatus,
        rowsRaw: rows.length,
        rowsAccepted: importedRecords.length,
        rowsRejected: rejectedRows.length,
        parserVersion: MANUAL_VERIFIED_FUNDAMENTALS_PARSER_VERSION,
      },
      durationMs: Date.now() - started,
    };
  }

  /**
   * Bulk-ingest NSE XBRL fundamentals for the full active IN/STOCK universe.
   *
   * Stocks are loaded in priority order (fewest existing Fundamental rows first).
   * For each batch the exporter fetches live NSE filings; periods that already
   * exist in the DB (source='MANUAL_VERIFIED') are filtered out before upsert
   * so curated data is never overwritten (D5 dedup protection).
   *
   * NOTE: the exporter makes real NSE HTTP calls — only invoke on-demand; never
   * trigger at module load time.
   */

  public async importNseXbrlFundamentalsForUniverse(options: {
    region?: string;
    assetType?: string;
    symbolBatchSize?: number;
    maxSymbols?: number;
    maxQuarterlyPeriods?: number;
    maxAnnualPeriods?: number;
    delayBetweenBatchesMs?: number;
    /** Injected for tests only; defaults to a real NseXbrlFundamentalsCsvExporter */
    _exporter?: { exportSymbols: (opts: any) => Promise<{ rows: ManualVerifiedFundamentalsCsvRow[]; csvText: string; report: any }> };
  } = {}): Promise<{
    symbolsProcessed: number;
    rowsImported: number;
    rowsSkippedExisting: number;
    batches: number;
    warnings: string[];
    errors: string[];
  }> {
    const region = options.region?.trim().toUpperCase() || 'IN';
    const assetType = options.assetType?.trim().toUpperCase() || 'STOCK';
    const symbolBatchSize = Math.max(1, Math.min(options.symbolBatchSize ?? 25, 100));
    const maxQuarterlyPeriods = options.maxQuarterlyPeriods ?? 4;
    const maxAnnualPeriods = options.maxAnnualPeriods ?? 2;
    const delayBetweenBatchesMs = options.delayBetweenBatchesMs ?? 1500;
    const maxSymbols = options.maxSymbols ?? Number.MAX_SAFE_INTEGER;
    const exporter = options._exporter ?? new NseXbrlFundamentalsCsvExporter();

    const repository = this.host.repository as any;
    const outputDir = path.join(os.tmpdir(), 'nse-xbrl-bulk-ingest');

    let symbolsProcessed = 0;
    let rowsImported = 0;
    let rowsSkippedExisting = 0;
    let batches = 0;
    const warnings: string[] = [];
    const errors: string[] = [];

    let offset = 0;
    let hasMore = true;

    while (hasMore && symbolsProcessed < maxSymbols) {
      const remaining = maxSymbols - symbolsProcessed;
      const take = Math.min(symbolBatchSize, remaining);

      const { stocks, total } = await repository.listStocksForFundamentalsIngestion({
        region,
        assetType,
        batchSize: take,
        offset,
      });

      if (stocks.length === 0) {
        hasMore = false;
        break;
      }

      // Paginate by advancing offset by batch size; stop once we exhaust the universe
      offset += stocks.length;
      if (offset >= total) hasMore = false;

      const symbols: string[] = stocks.map((s: { symbol: string }) => s.symbol);
      const stockBySymbol = new Map<string, { id: string; symbol: string }>(
        stocks.map((s: { id: string; symbol: string }) => [s.symbol.toUpperCase(), s])
      );

      batches += 1;

      try {
        const exportResult = await exporter.exportSymbols({
          symbols,
          outputDir,
          maxQuarterlyPeriods,
          maxAnnualPeriods,
          validatedBy: 'NSE_XBRL_AUTO',
        });

        if (exportResult.report?.warnings?.length) {
          warnings.push(...exportResult.report.warnings);
        }

        // D5 dedup: gather existing periods per stock and filter out already-stored ones
        const existingPeriodsByStock = new Map<string, Set<string>>();
        for (const stock of stocks) {
          const existing = await repository.listExistingFundamentalPeriods(stock.id);
          existingPeriodsByStock.set(stock.id, existing);
        }

        const newRows: ManualVerifiedFundamentalsCsvRow[] = [];
        for (const row of exportResult.rows) {
          const stock = stockBySymbol.get(row.symbol.toUpperCase());
          if (!stock) {
            warnings.push(`NSE_XBRL_AUTO: symbol ${row.symbol} not found in batch stock map — skipped.`);
            continue;
          }
          const dedupeKey = `${row.periodType}|${row.periodEndDate}`;
          if (existingPeriodsByStock.get(stock.id)?.has(dedupeKey)) {
            rowsSkippedExisting += 1;
            continue;
          }
          newRows.push(row);
        }

        if (newRows.length > 0) {
          const filteredCsvText = toManualVerifiedFundamentalsCsv(newRows);
          try {
            const importResult = await this.importBulkManualVerifiedFundamentals({
              csvText: filteredCsvText,
              region,
              assetType,
              fileName: `nse-xbrl-auto-batch-${batches}.csv`,
            });
            rowsImported += importResult.rowsImported ?? 0;
            if (importResult.rejectedRows?.length) {
              for (const rejected of importResult.rejectedRows) {
                warnings.push(`NSE_XBRL_AUTO batch ${batches}: row ${rejected.rowNumber} rejected — ${rejected.reason}`);
              }
            }
          } catch (importError) {
            const msg = importError instanceof Error ? importError.message : String(importError);
            errors.push(`NSE_XBRL_AUTO batch ${batches} import failed: ${msg}`);
          }
        }
      } catch (batchError) {
        const msg = batchError instanceof Error ? batchError.message : String(batchError);
        errors.push(`NSE_XBRL_AUTO batch ${batches} (symbols: ${symbols.join(',')}) failed: ${msg}`);
      }

      symbolsProcessed += symbols.length;

      if (hasMore && symbolsProcessed < maxSymbols && delayBetweenBatchesMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatchesMs));
      }
    }

    return { symbolsProcessed, rowsImported, rowsSkippedExisting, batches, warnings, errors };
  }
}
