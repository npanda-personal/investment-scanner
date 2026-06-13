// India NSE/BSE daily price importers — CM official + BSE backup layer (mid).
//
// Extends the CM-UDiFF base with the official-archive CM importer
// (importNseCmOfficialDaily) and the BSE fill-only backup importer
// (importBseCmBackupDaily). Behaviour byte-identical to the pre-extraction inline
// implementation; see india-exchange-ingestion.cm-udiff.ts for the layering rationale.

import { createHash } from 'crypto';
import { type NseArchiveUrl, parseIndianExchangeEodCsv } from './market-data-foundation.exchange-eod-adapter';
import { IndiaExchangeIngestionCmUdiffBase } from './market-data-foundation.india-exchange-ingestion.cm-udiff';
import type { HistoricalPrice } from '../../market-data-foundation.types';
import type {
  ExchangeDailyImportSummary,
  IndiaExchangeHistoricalBulkStoreResult,
  IndiaExchangePriceRegionInfo,
} from './market-data-foundation.india-ingestion-host';

export class IndiaExchangeIngestionCmOfficialBase extends IndiaExchangeIngestionCmUdiffBase {

  async importNseCmOfficialDaily(input: {
    tradingDate: Date | string;
    force?: boolean;
    skipLatestPriceUpdate?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    const tradingDate = this.host.normalizeExchangeTradingDate(input.tradingDate);
    const tradingDateText = tradingDate.toISOString().slice(0, 10);
    const repository = this.host.repository as any;
    let archive: NseArchiveUrl | null = null;
    let parsed: ReturnType<typeof parseIndianExchangeEodCsv> | null = null;
    let csvText = '';
    let sourceWarnings: string[] = [];

    try {
      const loaded = await this.host.loadFirstAvailableNseOfficialEodCsv(tradingDate);
      archive = loaded.archive;
      parsed = loaded.parsed;
      csvText = loaded.csvText;
      sourceWarnings = loaded.warnings;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NSE official EOD download or parse failed';
      const failureHash = createHash('sha256')
        .update(JSON.stringify({
          source: 'NSE_OFFICIAL_EOD',
          tradingDate: tradingDateText,
          error: message,
        }))
        .digest('hex');
      const failedImport = typeof repository.upsertSourceFileImport === 'function'
        ? await repository.upsertSourceFileImport({
          source: 'NSE',
          segment: 'CM',
          tradingDate,
          fileName: `nse-official-eod-${tradingDateText}.csv`,
          fileUrl: null,
          fileHash: failureHash,
          fileSize: 0,
          status: 'FAILED',
          rowsRaw: 0,
          rowsAccepted: 0,
          rowsRejected: 0,
          parserVersion: 'nse-official-eod-v1',
          errorMessage: message,
        }).catch(() => null)
        : null;
      return {
        status: 'FAILED',
        source: 'NSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: 'NSE_OFFICIAL_EOD',
        fileName: `nse-official-eod-${tradingDateText}.csv`,
        fileUrl: null,
        sourceFileImportId: failedImport?.id ?? null,
        sourceFingerprint: `nse-official-eod-failed:${failureHash.slice(0, 16)}`,
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

    const fileHash = parsed.sourceIdentity.contentSha256;
    const fileSize = Buffer.byteLength(csvText, 'utf8');
    const fileName = archive.fileName;
    const fileUrl = archive.url;
    const parserVersion = this.nseOfficialEodParserVersion(archive.sourceName);

    const existingImport = typeof repository.findSourceFileImportByKey === 'function'
      ? await repository.findSourceFileImportByKey({
        source: 'NSE',
        segment: 'CM',
        tradingDate,
        fileHash,
      })
      : null;

    if (!input.force && existingImport?.status === 'COMPLETED') {
      const downstreamSymbols = this.parsedSymbolsFromPrices(parsed.prices);
      return {
        status: 'SKIPPED_DUPLICATE',
        source: 'NSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: parsed.sourceName,
        fileName,
        fileUrl,
        sourceFileImportId: existingImport.id ?? null,
        sourceFingerprint: parsed.sourceFingerprint,
        rowsRead: parsed.rowsRead,
        rowsParsed: parsed.rowsParsed,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: parsed.rowsSkipped,
        warningCount: sourceWarnings.length + parsed.warnings.length,
        warnings: [...sourceWarnings, ...parsed.warnings].slice(0, 10),
        errors: [],
        changedSymbols: [],
        downstreamSymbols,
      };
    }

    const pendingImport = await repository.upsertSourceFileImport({
      source: 'NSE',
      segment: 'CM',
      tradingDate,
      fileName,
      fileUrl,
      fileHash,
      fileSize,
      status: 'PENDING',
      rowsRaw: parsed.rowsRead,
      rowsAccepted: 0,
      rowsRejected: parsed.rowsSkipped,
      parserVersion,
      errorMessage: null,
    });

    try {
      const regionInfoBySymbol = new Map<string, IndiaExchangePriceRegionInfo>();
      parsed.prices.forEach((price) => {
        regionInfoBySymbol.set(price.symbol, { region: 'IN', exchange: 'NSE' });
      });
      const storeSummary = await this.host.storeHistoricalBulk(parsed.prices, regionInfoBySymbol, {
        sourceFileImportId: pendingImport?.id ?? null,
        ...(input.skipLatestPriceUpdate === true ? { skipLatestPriceUpdate: true } : {}),
      });
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

      const completedImport = await repository.upsertSourceFileImport({
        source: 'NSE',
        segment: 'CM',
        tradingDate,
        fileName,
        fileUrl,
        fileHash,
        fileSize,
        status: 'COMPLETED',
        rowsRaw: parsed.rowsRead,
        rowsAccepted: parsed.rowsParsed,
        rowsRejected: parsed.rowsSkipped,
        parserVersion,
        errorMessage: null,
      });

      const warnings = [...sourceWarnings, ...parsed.warnings, ...(storeSummary.warnings || [])].slice(0, 10);
      return {
        status: 'COMPLETED',
        source: 'NSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: parsed.sourceName,
        fileName,
        fileUrl,
        sourceFileImportId: completedImport?.id ?? pendingImport?.id ?? null,
        sourceFingerprint: parsed.sourceFingerprint,
        rowsRead: parsed.rowsRead,
        rowsParsed: parsed.rowsParsed,
        rowsInserted: storeSummary.rowsInserted || 0,
        rowsUpdated: storeSummary.rowsUpdated || 0,
        rowsNoOp: storeSummary.rowsNoOp || 0,
        rowsSkipped: (storeSummary.rowsSkipped || 0) + parsed.rowsSkipped,
        warningCount: (storeSummary.warningCount || 0) + sourceWarnings.length + parsed.warnings.length,
        warnings,
        errors: [],
        changedSymbols: changedSymbols.sort((a, b) => a.localeCompare(b)),
        downstreamSymbols: downstreamSymbols.sort((a, b) => a.localeCompare(b)),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NSE official EOD import failed';
      await repository.upsertSourceFileImport({
        source: 'NSE',
        segment: 'CM',
        tradingDate,
        fileName,
        fileUrl,
        fileHash,
        fileSize,
        status: 'FAILED',
        rowsRaw: parsed.rowsRead,
        rowsAccepted: 0,
        rowsRejected: parsed.rowsRead,
        parserVersion,
        errorMessage: message,
      }).catch(() => undefined);
      return {
        status: 'FAILED',
        source: 'NSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: parsed.sourceName,
        fileName,
        fileUrl,
        sourceFileImportId: pendingImport?.id ?? null,
        sourceFingerprint: parsed.sourceFingerprint,
        rowsRead: parsed.rowsRead,
        rowsParsed: parsed.rowsParsed,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: parsed.rowsRead,
        warningCount: sourceWarnings.length + parsed.warnings.length,
        warnings: [...sourceWarnings, ...parsed.warnings].slice(0, 10),
        errors: [message],
        changedSymbols: [],
        downstreamSymbols: [],
      };
    }
  }

  async importBseCmBackupDaily(input: {
    tradingDate: Date | string;
    csvText?: string;
    fileName?: string;
    fileUrl?: string | null;
    force?: boolean;
    skipLatestPriceUpdate?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    const tradingDate = this.host.normalizeExchangeTradingDate(input.tradingDate);
    const tradingDateText = tradingDate.toISOString().slice(0, 10);
    const fileName = input.fileName?.trim() || `BhavCopy_BSE_CM_${tradingDateText.replace(/-/g, '')}.csv`;
    const fileUrl = input.fileUrl ?? null;
    if (!input.csvText && !fileUrl) {
      throw new Error('csvText or fileUrl is required for BSE backup import.');
    }
    const csvText = input.csvText ?? await this.host.downloadOfficialExchangeText(fileUrl as string);
    const parsed = parseIndianExchangeEodCsv(csvText, {
      source: 'BSE_UDIFF_CM_BHAVCOPY',
      sourceName: 'BSE_UDIFF_CM_BHAVCOPY',
      sourceUrl: fileUrl,
      exchange: 'BSE',
      symbolSuffix: '',
      tradingDate,
    });
    const fileHash = parsed.sourceIdentity.contentSha256;
    const fileSize = Buffer.byteLength(csvText, 'utf8');
    const repository = this.host.repository as any;

    const existingImport = typeof repository.findSourceFileImportByKey === 'function'
      ? await repository.findSourceFileImportByKey({
        source: 'BSE',
        segment: 'CM',
        tradingDate,
        fileHash,
      })
      : null;
    if (!input.force && existingImport?.status === 'COMPLETED') {
      const downstreamSymbols = this.parsedSymbolsFromPrices(parsed.prices);
      return {
        status: 'SKIPPED_DUPLICATE',
        source: 'BSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: parsed.sourceName,
        fileName,
        fileUrl,
        sourceFileImportId: existingImport.id ?? null,
        sourceFingerprint: parsed.sourceFingerprint,
        rowsRead: parsed.rowsRead,
        rowsParsed: parsed.rowsParsed,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: parsed.rowsSkipped,
        warningCount: parsed.warnings.length,
        warnings: parsed.warnings.slice(0, 10),
        errors: [],
        changedSymbols: [],
        downstreamSymbols,
      };
    }

    const pendingImport = await repository.upsertSourceFileImport({
      source: 'BSE',
      segment: 'CM',
      tradingDate,
      fileName,
      fileUrl,
      fileHash,
      fileSize,
      status: 'PENDING',
      rowsRaw: parsed.rowsRead,
      rowsAccepted: 0,
      rowsRejected: parsed.rowsSkipped,
      parserVersion: 'bse-cm-udiff-fill-v1',
      errorMessage: null,
    });

    try {
      const parsedSymbols = [...new Set(parsed.prices.map((price) => price.symbol))];
      const identities = await repository.findExchangeIdentitiesForExchangeSymbols('BSE', parsedSymbols);
      const identityBySymbol = new Map<string, any>();
      identities.forEach((identity: any) => {
        [identity.exchangeSymbol, identity.securityCode, identity.securityId]
          .filter(Boolean)
          .forEach((value) => identityBySymbol.set(String(value).trim().toUpperCase(), identity));
      });
      const fallbackStocks = typeof repository.findStocksBySymbolsInScope === 'function'
        ? await repository.findStocksBySymbolsInScope(parsedSymbols, { region: 'IN', assetType: 'STOCK' })
        : [];
      const stockBySymbol = new Map<string, any>();
      fallbackStocks.forEach((stock: any) => {
        [stock.symbol, stock.sourceSymbol, stock.displaySymbol]
          .filter(Boolean)
          .forEach((value) => stockBySymbol.set(this.host.baseSymbolFromProviderSymbol(String(value)), stock));
      });

      const matchedPrices: HistoricalPrice[] = [];
      let unmatchedRows = 0;
      for (const price of parsed.prices) {
        const symbolKey = price.symbol.trim().toUpperCase();
        const identity = identityBySymbol.get(symbolKey);
        const fallbackStock = stockBySymbol.get(this.host.baseSymbolFromProviderSymbol(symbolKey));
        const stockSymbol = identity?.stock?.symbol || fallbackStock?.symbol;
        if (!stockSymbol) {
          unmatchedRows += 1;
          continue;
        }
        matchedPrices.push({
          ...price,
          symbol: stockSymbol,
          source: 'BSE_UDIFF_CM_BHAVCOPY',
        });
      }

      const fillPrices: HistoricalPrice[] = typeof repository.filterPricesMissingPrimaryExchangeCandles === 'function'
        ? await repository.filterPricesMissingPrimaryExchangeCandles(matchedPrices, 'NSE')
        : matchedPrices;
      const skippedForPrimary = Math.max(0, matchedPrices.length - fillPrices.length);
      const regionInfoBySymbol = new Map<string, IndiaExchangePriceRegionInfo>();
      fillPrices.forEach((price) => {
        regionInfoBySymbol.set(price.symbol, { region: 'IN', exchange: 'BSE' });
      });
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
      const storeSummary = fillPrices.length > 0
        ? await this.host.storeHistoricalBulk(fillPrices, regionInfoBySymbol, {
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

      const rowsSkipped = parsed.rowsSkipped + unmatchedRows + skippedForPrimary + (storeSummary.rowsSkipped || 0);
      const completedImport = await repository.upsertSourceFileImport({
        source: 'BSE',
        segment: 'CM',
        tradingDate,
        fileName,
        fileUrl,
        fileHash,
        fileSize,
        status: 'COMPLETED',
        rowsRaw: parsed.rowsRead,
        rowsAccepted: fillPrices.length,
        rowsRejected: rowsSkipped,
        parserVersion: 'bse-cm-udiff-fill-v1',
        errorMessage: null,
      });

      return {
        status: 'COMPLETED',
        source: 'BSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: parsed.sourceName,
        fileName,
        fileUrl,
        sourceFileImportId: completedImport?.id ?? pendingImport?.id ?? null,
        sourceFingerprint: parsed.sourceFingerprint,
        rowsRead: parsed.rowsRead,
        rowsParsed: parsed.rowsParsed,
        rowsInserted: storeSummary.rowsInserted || 0,
        rowsUpdated: storeSummary.rowsUpdated || 0,
        rowsNoOp: storeSummary.rowsNoOp || 0,
        rowsSkipped,
        warningCount: (storeSummary.warningCount || 0) + parsed.warnings.length,
        warnings: [...parsed.warnings, ...(storeSummary.warnings || [])].slice(0, 10),
        errors: [],
        changedSymbols: changedSymbols.sort((a, b) => a.localeCompare(b)),
        downstreamSymbols: downstreamSymbols.sort((a, b) => a.localeCompare(b)),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'BSE CM backup import failed';
      await repository.upsertSourceFileImport({
        source: 'BSE',
        segment: 'CM',
        tradingDate,
        fileName,
        fileUrl,
        fileHash,
        fileSize,
        status: 'FAILED',
        rowsRaw: parsed.rowsRead,
        rowsAccepted: 0,
        rowsRejected: parsed.rowsRead,
        parserVersion: 'bse-cm-udiff-fill-v1',
        errorMessage: message,
      }).catch(() => undefined);
      return {
        status: 'FAILED',
        source: 'BSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: parsed.sourceName,
        fileName,
        fileUrl,
        sourceFileImportId: pendingImport?.id ?? null,
        sourceFingerprint: parsed.sourceFingerprint,
        rowsRead: parsed.rowsRead,
        rowsParsed: parsed.rowsParsed,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: parsed.rowsRead,
        warningCount: parsed.warnings.length,
        warnings: parsed.warnings.slice(0, 10),
        errors: [message],
        changedSymbols: [],
        downstreamSymbols: [],
      };
    }
  }
}
