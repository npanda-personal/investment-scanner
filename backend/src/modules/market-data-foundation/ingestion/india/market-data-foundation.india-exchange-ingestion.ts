// India NSE daily price importers — top layer (public surface: F&O + delivery).
//
// IndiaExchangeIngestionService is the concrete class MarketDataFoundationService
// constructs (once, passing itself as the IndiaExchangeIngestionHost). The service keeps
// a thin delegator for each public importer; their implementations live here and on the
// CM/index base layers. Behaviour is byte-identical to the pre-extraction inline
// implementation.
//
// Layering: IndiaExchangeIngestionCmUdiffBase <- ...CmOfficialBase <- ...IndexBase <-
// IndiaExchangeIngestionService (this). Files are split solely to respect the 500-line
// source backstop; cross-layer calls go downward only.
//
// Seam note: refreshNseDeliveryDaily reaches importNseDeliveryOfficialDaily through
// `this.host.X` (the service delegator) so `jest.spyOn(service, 'importNseDeliveryOfficialDaily')`
// keeps intercepting it exactly as before the extraction. importNseDeliveryOfficialDaily
// wraps importNseDeliveryDaily as an intra-class call (no test spies the inner while the
// wrapper runs).

import { buildNseSecurityBhavdataArchiveUrl } from './market-data-foundation.exchange-eod-adapter';
import { IndiaExchangeIngestionIndexBase } from './market-data-foundation.india-exchange-ingestion.index';
import type { ExchangeDailyImportSummary } from './market-data-foundation.india-ingestion-host';

export class IndiaExchangeIngestionService extends IndiaExchangeIngestionIndexBase {

  async importNseFoUdiffDaily(input: {
    tradingDate: Date | string;
    csvText?: string;
    fileName?: string;
    fileUrl?: string | null;
    force?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    const tradingDate = this.host.normalizeExchangeTradingDate(input.tradingDate);
    const tradingDateText = tradingDate.toISOString().slice(0, 10);
    const fileName = input.fileName?.trim() || `nse-fo-udiff-${tradingDateText}.csv`;
    const fileUrl = input.fileUrl ?? null;
    if (!input.csvText && !fileUrl) {
      throw new Error('csvText or fileUrl is required for NSE F&O UDiFF import.');
    }
    const csvText = input.csvText ?? await this.host.downloadOfficialExchangeText(fileUrl as string);
    const fileHash = this.host.sha256(csvText);
    const fileSize = Buffer.byteLength(csvText, 'utf8');
    const rows = this.host.parseCsv(csvText);
    const repository = this.host.repository as any;
    const existingImport = typeof repository.findSourceFileImportByKey === 'function'
      ? await repository.findSourceFileImportByKey({
        source: 'NSE',
        segment: 'FO',
        tradingDate,
        fileHash,
      })
      : null;

    if (!input.force && existingImport?.status === 'COMPLETED') {
      return {
        status: 'SKIPPED_DUPLICATE',
        source: 'NSE',
        segment: 'FO',
        tradingDate: tradingDateText,
        sourceName: 'NSE_FO_UDIFF',
        fileName,
        fileUrl,
        sourceFileImportId: existingImport.id ?? null,
        sourceFingerprint: `nse-fo-udiff:${fileHash}`,
        rowsRead: rows.length,
        rowsParsed: rows.length,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: 0,
        warningCount: 0,
        warnings: [],
        errors: [],
        changedSymbols: [],
        downstreamSymbols: [],
      };
    }

    const pendingImport = await repository.upsertSourceFileImport({
      source: 'NSE',
      segment: 'FO',
      tradingDate,
      fileName,
      fileUrl,
      fileHash,
      fileSize,
      status: 'PENDING',
      rowsRaw: rows.length,
      rowsAccepted: 0,
      rowsRejected: 0,
      parserVersion: 'nse-fo-udiff-underlying-v1',
      errorMessage: null,
    });

    try {
      const catalogSummary = await this.host.importCatalog({
        catalogSource: 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
        importMode: 'MANUAL_CSV',
        csvText,
        validateProvider: false,
      });
      const rowsAccepted = catalogSummary.underlyingsRead ?? catalogSummary.processedCount ?? catalogSummary.sourceRows;
      const rowsRejected = (catalogSummary.invalid || 0) + (catalogSummary.skipped || 0) + (catalogSummary.unmatchedUnderlyings || 0);
      const completedImport = await repository.upsertSourceFileImport({
        source: 'NSE',
        segment: 'FO',
        tradingDate,
        fileName,
        fileUrl,
        fileHash,
        fileSize,
        status: 'COMPLETED',
        rowsRaw: catalogSummary.sourceRows,
        rowsAccepted,
        rowsRejected,
        parserVersion: 'nse-fo-udiff-underlying-v1',
        errorMessage: null,
      });

      return {
        status: 'COMPLETED',
        source: 'NSE',
        segment: 'FO',
        tradingDate: tradingDateText,
        sourceName: 'NSE_FO_UDIFF',
        fileName,
        fileUrl,
        sourceFileImportId: completedImport?.id ?? pendingImport?.id ?? null,
        sourceFingerprint: `nse-fo-udiff:${fileHash}`,
        rowsRead: catalogSummary.sourceRows,
        rowsParsed: rowsAccepted,
        rowsInserted: catalogSummary.inserted || 0,
        rowsUpdated: catalogSummary.updated || 0,
        rowsNoOp: catalogSummary.noOp || 0,
        rowsSkipped: rowsRejected,
        warningCount: catalogSummary.warnings.length,
        warnings: catalogSummary.warnings.slice(0, 10),
        errors: [],
        changedSymbols: [],
        downstreamSymbols: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NSE F&O UDiFF import failed';
      await repository.upsertSourceFileImport({
        source: 'NSE',
        segment: 'FO',
        tradingDate,
        fileName,
        fileUrl,
        fileHash,
        fileSize,
        status: 'FAILED',
        rowsRaw: rows.length,
        rowsAccepted: 0,
        rowsRejected: rows.length,
        parserVersion: 'nse-fo-udiff-underlying-v1',
        errorMessage: message,
      }).catch(() => undefined);
      return {
        status: 'FAILED',
        source: 'NSE',
        segment: 'FO',
        tradingDate: tradingDateText,
        sourceName: 'NSE_FO_UDIFF',
        fileName,
        fileUrl,
        sourceFileImportId: pendingImport?.id ?? null,
        sourceFingerprint: `nse-fo-udiff:${fileHash}`,
        rowsRead: rows.length,
        rowsParsed: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: rows.length,
        warningCount: 0,
        warnings: [],
        errors: [message],
        changedSymbols: [],
        downstreamSymbols: [],
      };
    }
  }

  async importNseDeliveryDaily(input: {
    tradingDate: Date | string;
    csvText?: string;
    fileName?: string;
    fileUrl?: string | null;
    force?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    const tradingDate = this.host.normalizeExchangeTradingDate(input.tradingDate);
    const tradingDateText = tradingDate.toISOString().slice(0, 10);
    const fileName = input.fileName?.trim() || `nse-delivery-${tradingDateText}.csv`;
    const fileUrl = input.fileUrl ?? null;
    if (!input.csvText && !fileUrl) {
      throw new Error('csvText or fileUrl is required for NSE delivery import.');
    }
    const repository = this.host.repository as any;
    let csvText = '';
    try {
      csvText = input.csvText ?? await this.host.downloadOfficialExchangeText(fileUrl as string);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NSE delivery file download failed';
      const failureHash = this.host.sha256(JSON.stringify({
        source: 'NSE_DELIVERY',
        tradingDate: tradingDateText,
        fileName,
        fileUrl,
        error: message,
      }));
      const failedImport = typeof repository.upsertSourceFileImport === 'function'
        ? await repository.upsertSourceFileImport({
          source: 'NSE',
          segment: 'DELIVERY',
          tradingDate,
          fileName,
          fileUrl,
          fileHash: failureHash,
          fileSize: 0,
          status: 'FAILED',
          rowsRaw: 0,
          rowsAccepted: 0,
          rowsRejected: 0,
          parserVersion: 'nse-delivery-v1',
          errorMessage: message,
        }).catch(() => null)
        : null;
      return {
        status: 'FAILED',
        source: 'NSE',
        segment: 'DELIVERY',
        tradingDate: tradingDateText,
        sourceName: 'NSE_DELIVERY',
        fileName,
        fileUrl,
        sourceFileImportId: failedImport?.id ?? null,
        sourceFingerprint: `nse-delivery-failed:${failureHash.slice(0, 16)}`,
        rowsRead: 0,
        rowsParsed: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: 0,
        warningCount: 0,
        warnings: [],
        errors: [message],
        changedSymbols: [],
        downstreamSymbols: [],
      };
    }
    const fileHash = this.host.sha256(csvText);
    const fileSize = Buffer.byteLength(csvText, 'utf8');
    const rows = this.host.parseCsv(csvText);
    const existingImport = typeof repository.findSourceFileImportByKey === 'function'
      ? await repository.findSourceFileImportByKey({
        source: 'NSE',
        segment: 'DELIVERY',
        tradingDate,
        fileHash,
      })
      : null;

    if (!input.force && existingImport?.status === 'COMPLETED') {
      return {
        status: 'SKIPPED_DUPLICATE',
        source: 'NSE',
        segment: 'DELIVERY',
        tradingDate: tradingDateText,
        sourceName: 'NSE_DELIVERY',
        fileName,
        fileUrl,
        sourceFileImportId: existingImport.id ?? null,
        sourceFingerprint: `nse-delivery:${fileHash}`,
        rowsRead: rows.length,
        rowsParsed: rows.length,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: 0,
        warningCount: 0,
        warnings: [],
        errors: [],
        changedSymbols: [],
        downstreamSymbols: [],
      };
    }

    const parsedRows: Array<{
      symbol: string;
      tradingDate: Date;
      tradedQuantity: number | null;
      deliverableQuantity: number | null;
      deliveryPercent: number | null;
    }> = [];
    const warnings: string[] = [];
    let malformedRows = 0;
    rows.forEach((row, index) => {
      const series = this.host.readObjectString(row, ['SERIES', 'SctySrs', 'SECURITY SERIES']).toUpperCase();
      if (series && !['EQ', 'BE'].includes(series)) {
        malformedRows += 1;
        return;
      }
      const symbol = this.host.baseSymbolFromProviderSymbol(this.host.readObjectString(row, ['SYMBOL', 'TckrSymb', 'TICKER_SYMBOL', 'SECURITY SYMBOL']));
      const date = this.host.parseCatalogDate(this.host.readObjectString(row, ['DATE1', 'TradDt', 'BizDt', 'DATE', 'TRADING DATE'])) || tradingDate;
      const tradedQuantity = this.host.parseMarketDataNumber(this.host.readObjectString(row, ['TTL_TRD_QNTY', 'TtlTradgVol', 'TOTTRDQTY', 'QUANTITY TRADED', 'TOTAL TRADED QUANTITY']));
      const deliverableQuantity = this.host.parseMarketDataNumber(this.host.readObjectString(row, ['DELIV_QTY', 'DELIVERABLE QUANTITY', 'DELIVERABLE QUANTITY(GROSS ACROSS CLIENT LEVEL)', 'DELIVERABLE QUANTITY GROSS ACROSS CLIENT LEVEL']));
      const deliveryPercent = this.host.parseMarketDataNumber(this.host.readObjectString(row, ['DELIV_PER', 'DELIVERY PERCENT', 'DELIVERY %', '% OF DELIVERABLE QUANTITY TO TRADED QUANTITY']));
      if (!symbol || !date || deliverableQuantity === null) {
        malformedRows += 1;
        warnings.push(`Row ${index + 1}: missing symbol/date/deliverable quantity; skipped.`);
        return;
      }
      parsedRows.push({
        symbol,
        tradingDate: this.host.startOfUtcDay(date),
        tradedQuantity,
        deliverableQuantity,
        deliveryPercent,
      });
    });

    const pendingImport = await repository.upsertSourceFileImport({
      source: 'NSE',
      segment: 'DELIVERY',
      tradingDate,
      fileName,
      fileUrl,
      fileHash,
      fileSize,
      status: 'PENDING',
      rowsRaw: rows.length,
      rowsAccepted: 0,
      rowsRejected: malformedRows,
      parserVersion: 'nse-delivery-v1',
      errorMessage: null,
    });

    try {
      const symbols = [...new Set(parsedRows.map((row) => row.symbol))];
      const stocks = typeof repository.findStocksBySymbolsInScope === 'function'
        ? await repository.findStocksBySymbolsInScope(symbols, { region: 'IN', assetType: 'STOCK' })
        : [];
      const stockBySymbol = new Map<string, any>();
      stocks.forEach((stock: any) => {
        if (stock?.isActive === false || stock?.isDelisted === true) return;
        [stock.symbol, stock.sourceSymbol, stock.displaySymbol]
          .filter(Boolean)
          .forEach((value) => stockBySymbol.set(this.host.baseSymbolFromProviderSymbol(String(value)), stock));
      });

      const snapshots: any[] = [];
      let unmatchedRows = 0;
      parsedRows.forEach((row) => {
        const stock = stockBySymbol.get(row.symbol);
        if (!stock?.id) {
          unmatchedRows += 1;
          return;
        }
        snapshots.push({
          stockId: stock.id,
          symbol: stock.symbol,
          exchange: 'NSE',
          tradingDate: row.tradingDate,
          tradedQuantity: row.tradedQuantity,
          deliverableQuantity: row.deliverableQuantity,
          deliveryPercent: row.deliveryPercent,
          source: 'NSE_DELIVERY',
          sourceFileImportId: pendingImport?.id ?? null,
        });
      });

      const writeSummary = snapshots.length > 0 && typeof repository.upsertDeliverySnapshots === 'function'
        ? await repository.upsertDeliverySnapshots(snapshots)
        : { insertedOrUpdated: 0 };
      const rowsRejected = malformedRows + unmatchedRows;
      const completedImport = await repository.upsertSourceFileImport({
        source: 'NSE',
        segment: 'DELIVERY',
        tradingDate,
        fileName,
        fileUrl,
        fileHash,
        fileSize,
        status: 'COMPLETED',
        rowsRaw: rows.length,
        rowsAccepted: snapshots.length,
        rowsRejected,
        parserVersion: 'nse-delivery-v1',
        errorMessage: null,
      });

      return {
        status: 'COMPLETED',
        source: 'NSE',
        segment: 'DELIVERY',
        tradingDate: tradingDateText,
        sourceName: 'NSE_DELIVERY',
        fileName,
        fileUrl,
        sourceFileImportId: completedImport?.id ?? pendingImport?.id ?? null,
        sourceFingerprint: `nse-delivery:${fileHash}`,
        rowsRead: rows.length,
        rowsParsed: parsedRows.length,
        rowsInserted: writeSummary.insertedOrUpdated || 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: rowsRejected,
        warningCount: warnings.length,
        warnings: warnings.slice(0, 10),
        errors: [],
        changedSymbols: snapshots.map((snapshot) => snapshot.symbol).sort((a, b) => a.localeCompare(b)),
        downstreamSymbols: snapshots.map((snapshot) => snapshot.symbol).sort((a, b) => a.localeCompare(b)),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NSE delivery import failed';
      await repository.upsertSourceFileImport({
        source: 'NSE',
        segment: 'DELIVERY',
        tradingDate,
        fileName,
        fileUrl,
        fileHash,
        fileSize,
        status: 'FAILED',
        rowsRaw: rows.length,
        rowsAccepted: 0,
        rowsRejected: rows.length,
        parserVersion: 'nse-delivery-v1',
        errorMessage: message,
      }).catch(() => undefined);
      return {
        status: 'FAILED',
        source: 'NSE',
        segment: 'DELIVERY',
        tradingDate: tradingDateText,
        sourceName: 'NSE_DELIVERY',
        fileName,
        fileUrl,
        sourceFileImportId: pendingImport?.id ?? null,
        sourceFingerprint: `nse-delivery:${fileHash}`,
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

  async refreshNseDeliveryDaily(input: {
    tradingDate?: Date | string;
    force?: boolean;
  } = {}): Promise<ExchangeDailyImportSummary> {
    const targetDate = input.tradingDate
      ? this.host.normalizeExchangeTradingDate(input.tradingDate)
      : this.host.latestCompletedExchangeTradingDateOrThrow('IN');
    return this.host.importNseDeliveryOfficialDaily({
      tradingDate: targetDate,
      force: input.force === true,
    });
  }

  async importNseDeliveryOfficialDaily(input: {
    tradingDate: Date | string;
    force?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    const tradingDate = this.host.normalizeExchangeTradingDate(input.tradingDate);
    const archive = buildNseSecurityBhavdataArchiveUrl(tradingDate);
    return this.importNseDeliveryDaily({
      tradingDate,
      fileName: archive.fileName,
      fileUrl: archive.url,
      force: input.force === true,
    });
  }
}
