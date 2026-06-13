// India NSE daily price importers — index layer (mid).
//
// Extends the CM-official base with the NSE index-EOD importers
// (importNseIndexOfficialDaily / importNseIndexEodDaily), the index/delivery catch-up
// runner (runNseIndexAndDeliveryCatchUp), and the index-only leaf helpers
// (sector-evidence upsert, matched-row count, archive-url builder). Behaviour is
// byte-identical to the pre-extraction inline implementation.
//
// Seam note: runNseIndexAndDeliveryCatchUp reaches the index/delivery official
// importers through `this.host.X` (the service delegators) rather than as intra-class
// calls, preserving the `jest.spyOn(service, ...)` interception used by tests. The
// index-EOD leaf importer (importNseIndexEodDaily) and archive-url builder are
// intra-class because no test spies them while a wrapper runs.

import { IndiaExchangeIngestionCmOfficialBase } from './market-data-foundation.india-exchange-ingestion.cm-official';
import { nseIndexCloseAllArchiveUrl } from '../market-data-foundation.endpoints';
import type { HistoricalPrice } from '../../market-data-foundation.types';
import type {
  ExchangeDailyImportSummary,
  IndiaExchangeHistoricalBulkStoreResult,
  IndiaExchangePriceRegionInfo,
} from './market-data-foundation.india-ingestion-host';

export class IndiaExchangeIngestionIndexBase extends IndiaExchangeIngestionCmOfficialBase {

  protected buildNseIndexEodArchiveUrl(tradingDate: Date): { sourceName: 'NSE_INDEX_EOD'; fileName: string; url: string } {
    const [yyyy, mm, dd] = this.host.exchangeDateKey(tradingDate).split('-');
    const fileName = `ind_close_all_${dd}${mm}${yyyy}.csv`;
    return {
      sourceName: 'NSE_INDEX_EOD',
      fileName,
      url: nseIndexCloseAllArchiveUrl(fileName),
    };
  }

  async importNseIndexOfficialDaily(input: {
    tradingDate: Date | string;
    force?: boolean;
    skipLatestPriceUpdate?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    const tradingDate = this.host.normalizeExchangeTradingDate(input.tradingDate);
    const archive = this.buildNseIndexEodArchiveUrl(tradingDate);
    return this.importNseIndexEodDaily({
      tradingDate,
      fileName: archive.fileName,
      fileUrl: archive.url,
      force: input.force,
      segment: 'INDEX',
      skipLatestPriceUpdate: input.skipLatestPriceUpdate,
    });
  }

  /**
   * Catch-up ingest for the NSE INDEX EOD file (which also carries the
   * SECTOR_INDEX and VIX rows) and the DELIVERY bhavdata. The stock-lane
   * scheduler only syncs the CM segment, so these lagged silently until run
   * by hand. Called from the scheduler on every IN/STOCK tick; idempotent —
   * already-COMPLETED trading dates are skipped before any download happens.
   */
  async runNseIndexAndDeliveryCatchUp(input: { maxLookbackDays?: number } = {}): Promise<{
    index: Array<{ tradingDate: string; status: string }>;
    delivery: Array<{ tradingDate: string; status: string }>;
  }> {
    const maxLookbackDays = Math.max(1, Math.min(input.maxLookbackDays ?? 10, 31));
    const endDate = this.host.latestCompletedExchangeTradingDateOrThrow('IN');
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - maxLookbackDays);

    const candidateDates: Date[] = [];
    for (const cursor = new Date(startDate); cursor <= endDate; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const dow = cursor.getUTCDay();
      if (dow !== 0 && dow !== 6) candidateDates.push(new Date(cursor));
    }

    const repository = this.host.repository as any;
    const results: { index: Array<{ tradingDate: string; status: string }>; delivery: Array<{ tradingDate: string; status: string }> } = {
      index: [],
      delivery: [],
    };

    for (const lane of [
      { segment: 'INDEX', run: (tradingDate: Date) => this.host.importNseIndexOfficialDaily({ tradingDate }) , bucket: results.index },
      { segment: 'DELIVERY', run: (tradingDate: Date) => this.host.importNseDeliveryOfficialDaily({ tradingDate }), bucket: results.delivery },
    ] as const) {
      const completed: Date[] = typeof repository.listCompletedSourceFileImportDates === 'function'
        ? await repository.listCompletedSourceFileImportDates({ source: 'NSE', segment: lane.segment, startDate, endDate })
        : [];
      const completedKeys = new Set(completed.map((d) => d.toISOString().slice(0, 10)));
      const missing = candidateDates.filter((d) => !completedKeys.has(d.toISOString().slice(0, 10)));
      for (const tradingDate of missing) {
        const dateText = tradingDate.toISOString().slice(0, 10);
        try {
          const summary = await lane.run(tradingDate);
          lane.bucket.push({ tradingDate: dateText, status: String(summary.status) });
        } catch (error) {
          // Holidays produce download failures — log and continue.
          lane.bucket.push({ tradingDate: dateText, status: 'FAILED' });
          console.warn(`[MarketDataFoundation] ${lane.segment} catch-up failed for ${dateText}`, {
            error: error instanceof Error ? error.message : 'unknown error',
          });
        }
      }
    }
    return results;
  }

  async importNseIndexEodDaily(input: {
    tradingDate: Date | string;
    csvText?: string;
    fileName?: string;
    fileUrl?: string | null;
    force?: boolean;
    segment?: 'INDEX' | 'SECTOR_INDEX';
    skipLatestPriceUpdate?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    const tradingDate = this.host.normalizeExchangeTradingDate(input.tradingDate);
    const tradingDateText = tradingDate.toISOString().slice(0, 10);
    const segment = input.segment || 'INDEX';
    const fileName = input.fileName?.trim() || `nse-index-eod-${tradingDateText}.csv`;
    const fileUrl = input.fileUrl ?? null;
    if (!input.csvText && !fileUrl) {
      throw new Error('csvText or fileUrl is required for NSE index EOD import.');
    }
    const csvText = input.csvText ?? await this.host.downloadOfficialExchangeText(fileUrl as string);
    const fileHash = this.host.sha256(csvText);
    const fileSize = Buffer.byteLength(csvText, 'utf8');
    const rows = this.host.parseCsv(csvText);
    const parsedRows: Array<{
      officialName: string;
      date: Date;
      open: number;
      high: number;
      low: number;
      close: number;
    }> = [];
    const warnings: string[] = [];

    rows.forEach((row, index) => {
      const officialName = this.host.cleanIndexName(this.host.readObjectString(row, ['INDEX NAME', 'INDEX', 'INDEX_NAME', 'NAME']));
      const date = this.host.parseCatalogDate(this.host.readObjectString(row, ['INDEX DATE', 'INDEX_DATE', 'DATE', 'TIMESTAMP'])) || tradingDate;
      const open = this.host.parseMarketDataNumber(this.host.readObjectString(row, ['OPEN INDEX VALUE', 'OPEN', 'OPEN_INDEX_VALUE']));
      const high = this.host.parseMarketDataNumber(this.host.readObjectString(row, ['HIGH INDEX VALUE', 'HIGH', 'HIGH_INDEX_VALUE']));
      const low = this.host.parseMarketDataNumber(this.host.readObjectString(row, ['LOW INDEX VALUE', 'LOW', 'LOW_INDEX_VALUE']));
      const close = this.host.parseMarketDataNumber(this.host.readObjectString(row, ['CLOSING INDEX VALUE', 'CLOSE', 'CLOSING_INDEX_VALUE', 'CLOSE INDEX VALUE']));
      if (!officialName || !date || open === null || high === null || low === null || close === null) {
        warnings.push(`Row ${index + 1}: missing or invalid index EOD fields; skipped.`);
        return;
      }
      parsedRows.push({ officialName, date: this.host.startOfUtcDay(date), open, high, low, close });
    });
    const sectorParsedRows = parsedRows.filter((row) => this.host.indexPriceSourceForName(row.officialName) === 'NIFTY_SECTOR_INDEX');

    const repository = this.host.repository as any;
    const existingImport = typeof repository.findSourceFileImportByKey === 'function'
      ? await repository.findSourceFileImportByKey({
        source: 'NSE',
        segment,
        tradingDate,
        fileHash,
      })
      : null;
    if (!input.force && existingImport?.status === 'COMPLETED') {
      if (segment === 'INDEX') {
        const sectorAcceptedRows = await this.countMatchedNseIndexRows(repository, sectorParsedRows);
        await this.upsertNseIndexSectorSourceEvidence(repository, {
          tradingDate,
          fileName,
          fileUrl,
          fileHash,
          fileSize,
          rowsRaw: sectorParsedRows.length,
          rowsAccepted: sectorAcceptedRows,
          status: 'COMPLETED',
          errorMessage: null,
        });
      }
      return {
        status: 'SKIPPED_DUPLICATE',
        source: 'NSE',
        segment,
        tradingDate: tradingDateText,
        sourceName: segment === 'SECTOR_INDEX' ? 'NIFTY_SECTOR_INDEX' : 'NSE_INDEX_EOD',
        fileName,
        fileUrl,
        sourceFileImportId: existingImport.id ?? null,
        sourceFingerprint: `nse-index-eod:${fileHash}`,
        rowsRead: rows.length,
        rowsParsed: parsedRows.length,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: rows.length - parsedRows.length,
        warningCount: warnings.length,
        warnings: warnings.slice(0, 10),
        errors: [],
        changedSymbols: [],
        downstreamSymbols: [],
      };
    }

    const pendingImport = await repository.upsertSourceFileImport({
      source: 'NSE',
      segment,
      tradingDate,
      fileName,
      fileUrl,
      fileHash,
      fileSize,
      status: 'PENDING',
      rowsRaw: rows.length,
      rowsAccepted: 0,
      rowsRejected: rows.length - parsedRows.length,
      parserVersion: 'nse-index-eod-v1',
      errorMessage: null,
    });

    try {
      const officialNames = [...new Set(parsedRows.map((row) => row.officialName))];
      const indexStocks = await repository.findIndexStocksBySourceSymbols(officialNames);
      const stockByName = new Map<string, any>();
      indexStocks.forEach((stock: any) => {
        [stock.sourceSymbol, stock.displaySymbol, stock.name]
          .filter(Boolean)
          .forEach((value) => stockByName.set(this.host.cleanIndexName(String(value)).toUpperCase(), stock));
      });

      const prices: HistoricalPrice[] = [];
      let unmatchedRows = 0;
      parsedRows.forEach((row) => {
        const stock = stockByName.get(row.officialName.toUpperCase());
        if (!stock?.symbol) {
          unmatchedRows += 1;
          return;
        }
        const source = this.host.indexPriceSourceForName(row.officialName);
        prices.push({
          symbol: stock.symbol,
          date: row.date,
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          adjustedClose: null,
          source,
        });
      });

      const regionInfoBySymbol = new Map<string, IndiaExchangePriceRegionInfo>();
      prices.forEach((price) => regionInfoBySymbol.set(price.symbol, { region: 'IN', exchange: 'NSE_INDEX' }));
      const emptyStoreSummary: IndiaExchangeHistoricalBulkStoreResult = {
        rowsReceived: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        warningCount: 0,
        warnings: [],
        summaryBySymbol: new Map(),
      };
      const storeSummary = prices.length > 0
        ? await this.host.storeHistoricalBulk(prices, regionInfoBySymbol, {
          sourceFileImportId: pendingImport?.id ?? null,
          ...(input.skipLatestPriceUpdate === true ? { skipLatestPriceUpdate: true } : {}),
        })
        : emptyStoreSummary;
      const changedSymbols: string[] = [];
      const downstreamSymbols: string[] = [];
      storeSummary.summaryBySymbol.forEach((summary, symbol) => {
        if ((summary.rowsReceived || 0) > 0 || (summary.rowsInserted || 0) > 0 || (summary.rowsUpdated || 0) > 0 || (summary.rowsNoOp || 0) > 0) {
          downstreamSymbols.push(symbol);
        }
        if ((summary.rowsInserted || 0) > 0 || (summary.rowsUpdated || 0) > 0) {
          changedSymbols.push(symbol);
        }
      });
      const rowsSkipped = (rows.length - parsedRows.length) + unmatchedRows + (storeSummary.rowsSkipped || 0);
      const completedImport = await repository.upsertSourceFileImport({
        source: 'NSE',
        segment,
        tradingDate,
        fileName,
        fileUrl,
        fileHash,
        fileSize,
        status: 'COMPLETED',
        rowsRaw: rows.length,
        rowsAccepted: prices.length,
        rowsRejected: rowsSkipped,
        parserVersion: 'nse-index-eod-v1',
        errorMessage: null,
      });
      if (segment === 'INDEX') {
        const sectorAcceptedRows = prices.filter((price) => price.source === 'NIFTY_SECTOR_INDEX').length;
        await this.upsertNseIndexSectorSourceEvidence(repository, {
          tradingDate,
          fileName,
          fileUrl,
          fileHash,
          fileSize,
          rowsRaw: sectorParsedRows.length,
          rowsAccepted: sectorAcceptedRows,
          status: 'COMPLETED',
          errorMessage: null,
        });
      }

      return {
        status: 'COMPLETED',
        source: 'NSE',
        segment,
        tradingDate: tradingDateText,
        sourceName: segment === 'SECTOR_INDEX' ? 'NIFTY_SECTOR_INDEX' : 'NSE_INDEX_EOD',
        fileName,
        fileUrl,
        sourceFileImportId: completedImport?.id ?? pendingImport?.id ?? null,
        sourceFingerprint: `nse-index-eod:${fileHash}`,
        rowsRead: rows.length,
        rowsParsed: parsedRows.length,
        rowsInserted: storeSummary.rowsInserted || 0,
        rowsUpdated: storeSummary.rowsUpdated || 0,
        rowsNoOp: storeSummary.rowsNoOp || 0,
        rowsSkipped,
        warningCount: (storeSummary.warningCount || 0) + warnings.length,
        warnings: [...warnings, ...(storeSummary.warnings || [])].slice(0, 10),
        errors: [],
        changedSymbols: changedSymbols.sort((a, b) => a.localeCompare(b)),
        downstreamSymbols: downstreamSymbols.sort((a, b) => a.localeCompare(b)),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NSE index EOD import failed';
      await repository.upsertSourceFileImport({
        source: 'NSE',
        segment,
        tradingDate,
        fileName,
        fileUrl,
        fileHash,
        fileSize,
        status: 'FAILED',
        rowsRaw: rows.length,
        rowsAccepted: 0,
        rowsRejected: rows.length,
        parserVersion: 'nse-index-eod-v1',
        errorMessage: message,
      }).catch(() => undefined);
      return {
        status: 'FAILED',
        source: 'NSE',
        segment,
        tradingDate: tradingDateText,
        sourceName: segment === 'SECTOR_INDEX' ? 'NIFTY_SECTOR_INDEX' : 'NSE_INDEX_EOD',
        fileName,
        fileUrl,
        sourceFileImportId: pendingImport?.id ?? null,
        sourceFingerprint: `nse-index-eod:${fileHash}`,
        rowsRead: rows.length,
        rowsParsed: parsedRows.length,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: rows.length,
        warningCount: warnings.length,
        warnings: warnings.slice(0, 10),
        errors: [message],
        changedSymbols: [],
        downstreamSymbols: [],
      };
    }
  }

  protected async upsertNseIndexSectorSourceEvidence(
    repository: any,
    input: {
      tradingDate: Date;
      fileName: string;
      fileUrl: string | null;
      fileHash: string;
      fileSize: number;
      rowsRaw: number;
      rowsAccepted: number;
      status: string;
      errorMessage: string | null;
    }
  ) {
    if (input.rowsRaw <= 0 || input.rowsAccepted <= 0 || typeof repository.upsertSourceFileImport !== 'function') return null;
    return repository.upsertSourceFileImport({
      source: 'NSE',
      segment: 'SECTOR_INDEX',
      tradingDate: input.tradingDate,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      fileHash: input.fileHash,
      fileSize: input.fileSize,
      status: input.status,
      rowsRaw: input.rowsRaw,
      rowsAccepted: input.rowsAccepted,
      rowsRejected: Math.max(0, input.rowsRaw - input.rowsAccepted),
      parserVersion: 'nse-index-eod-v1',
      errorMessage: input.errorMessage,
    });
  }

  protected async countMatchedNseIndexRows(
    repository: any,
    rows: Array<{ officialName: string }>
  ): Promise<number> {
    if (rows.length === 0 || typeof repository.findIndexStocksBySourceSymbols !== 'function') return 0;
    const officialNames = [...new Set(rows.map((row) => row.officialName))];
    const indexStocks = await repository.findIndexStocksBySourceSymbols(officialNames);
    const stockByName = new Map<string, any>();
    indexStocks.forEach((stock: any) => {
      [stock.sourceSymbol, stock.displaySymbol, stock.name]
        .filter(Boolean)
        .forEach((value) => stockByName.set(this.host.cleanIndexName(String(value)).toUpperCase(), stock));
    });
    return rows.filter((row) => Boolean(stockByName.get(row.officialName.toUpperCase())?.symbol)).length;
  }
}
