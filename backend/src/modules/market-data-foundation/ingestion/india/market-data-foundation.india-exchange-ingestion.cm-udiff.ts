// India NSE/BSE daily price importers — base layer (CM UDiFF + small CM leaf helpers).
//
// Phase 4b of the market-data-foundation decomposition extracts the India daily price
// IMPORTERS out of MarketDataFoundationService into IndiaExchangeIngestionService. The
// service keeps a thin delegator for each public importer and stays the
// IndiaExchangeIngestionHost; behaviour is byte-identical to the pre-extraction inline
// implementation (each body was moved verbatim, rewriting `this.<sharedHelper>` to
// `this.host.<sharedHelper>` for collaborators that remain on the service, and importing
// pure sibling-module functions directly).
//
// Layering: IndiaExchangeIngestionCmUdiffBase (this) <- ...CmOfficialBase <-
// ...IndexBase <- IndiaExchangeIngestionService. Files are split only to respect the
// 500-line source backstop; cross-layer calls go downward only (subclass -> base).

import { createHash } from 'crypto';
import {
  buildNseUdiffCmBhavcopyArchiveUrl,
  parseIndianExchangeEodCsv,
} from './market-data-foundation.exchange-eod-adapter';
import type { HistoricalPrice } from '../../market-data-foundation.types';
import type {
  ExchangeDailyImportSummary,
  IndiaExchangeIngestionHost,
  IndiaExchangePriceRegionInfo,
} from './market-data-foundation.india-ingestion-host';

export class IndiaExchangeIngestionCmUdiffBase {
  constructor(protected readonly host: IndiaExchangeIngestionHost) {}

  protected parsedSymbolsFromPrices(prices: Array<Pick<HistoricalPrice, 'symbol'>>): string[] {
    return [...new Set(prices.map((price) => String(price.symbol || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }

  protected nseOfficialEodParserVersion(sourceName: string): string {
    if (sourceName === 'NSE_UDIFF_CM_BHAVCOPY') return 'nse-cm-udiff-v1';
    if (sourceName === 'NSE_SECURITY_BHAVDATA') return 'nse-security-bhavdata-v1';
    if (sourceName === 'NSE_LEGACY_CM_BHAVCOPY') return 'nse-legacy-cm-bhavcopy-v1';
    return 'nse-official-eod-v1';
  }

  async importNseCmUdiffDaily(input: {
    tradingDate: Date | string;
    csvText?: string;
    fileName?: string;
    fileUrl?: string | null;
    force?: boolean;
    skipLatestPriceUpdate?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    const tradingDate = this.host.normalizeExchangeTradingDate(input.tradingDate);
    const tradingDateText = tradingDate.toISOString().slice(0, 10);
    const archive = buildNseUdiffCmBhavcopyArchiveUrl(tradingDate);
    const fileName = input.fileName?.trim() || archive.fileName;
    const fileUrl = input.fileUrl === undefined ? archive.url : input.fileUrl;
    const repository = this.host.repository as any;
    let csvText: string;
    let parsed: ReturnType<typeof parseIndianExchangeEodCsv>;
    try {
      csvText = input.csvText ?? await this.host.downloadOfficialExchangeText(fileUrl || archive.url);
      parsed = parseIndianExchangeEodCsv(csvText, {
        source: 'NSE_UDIFF_CM_BHAVCOPY',
        sourceName: 'NSE_UDIFF_CM_BHAVCOPY',
        sourceUrl: fileUrl || null,
        exchange: 'NSE',
        symbolSuffix: '',
        includeSeries: ['EQ', 'BE'],
        tradingDate,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NSE CM UDiFF download or parse failed';
      const notAvailable = this.host.isNotAvailableErrorMessage(message);
      const warning = `NSE CM UDiFF file ${fileName} for ${tradingDateText} is not available yet (${message}).`;
      const failureHash = createHash('sha256')
        .update(JSON.stringify({
          source: 'NSE_UDIFF_CM_BHAVCOPY',
          tradingDate: tradingDateText,
          fileName,
          fileUrl: fileUrl || null,
          error: message,
        }))
        .digest('hex');
      const failedImport = typeof repository.upsertSourceFileImport === 'function'
        ? await repository.upsertSourceFileImport({
          source: 'NSE',
          segment: 'CM',
          tradingDate,
          fileName,
          fileUrl: fileUrl || null,
          fileHash: failureHash,
          fileSize: 0,
          status: notAvailable ? 'NOT_AVAILABLE' : 'FAILED',
          rowsRaw: 0,
          rowsAccepted: 0,
          rowsRejected: 0,
          parserVersion: 'nse-cm-udiff-v1',
          errorMessage: message,
        }).catch(() => null)
        : null;
      return {
        status: notAvailable ? 'NOT_AVAILABLE' : 'FAILED',
        source: 'NSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: 'NSE_UDIFF_CM_BHAVCOPY',
        fileName,
        fileUrl: fileUrl || null,
        sourceFileImportId: failedImport?.id ?? null,
        sourceFingerprint: notAvailable ? null : `nse-cm-udiff-failed:${failureHash.slice(0, 16)}`,
        rowsRead: 0,
        rowsParsed: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: 0,
        warningCount: notAvailable ? 1 : 0,
        warnings: notAvailable ? [warning] : [],
        errors: notAvailable ? [] : [message],
        changedSymbols: [],
        downstreamSymbols: [],
      };
    }
    const fileHash = parsed.sourceIdentity.contentSha256;
    const fileSize = Buffer.byteLength(csvText, 'utf8');

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
        fileUrl: fileUrl || null,
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
      source: 'NSE',
      segment: 'CM',
      tradingDate,
      fileName,
      fileUrl: fileUrl || null,
      fileHash,
      fileSize,
      status: 'PENDING',
      rowsRaw: parsed.rowsRead,
      rowsAccepted: 0,
      rowsRejected: parsed.rowsSkipped,
      parserVersion: 'nse-cm-udiff-v1',
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
        fileUrl: fileUrl || null,
        fileHash,
        fileSize,
        status: 'COMPLETED',
        rowsRaw: parsed.rowsRead,
        rowsAccepted: parsed.rowsParsed,
        rowsRejected: parsed.rowsSkipped,
        parserVersion: 'nse-cm-udiff-v1',
        errorMessage: null,
      });

      // ── Refresh adjusted closes for changed stocks that have corporate actions ──
      // No-op in the common zero-CA case (COALESCE(adjustedClose, close) covers those);
      // keeps adjustedClose correct for split/bonus/dividend stocks after each daily bar.
      if (changedSymbols.length > 0) {
        try {
          const caStocks = await repository.listStocksWithCorporateActionsBySymbols(changedSymbols);
          for (const caStock of caStocks) {
            try {
              await this.host.recomputeAdjustedClosesForInstrument(caStock.id);
            } catch {
              // best-effort; never fail the price import on a recompute error
            }
          }
        } catch {
          // best-effort; never fail the price import on a recompute error
        }
      }

      return {
        status: 'COMPLETED',
        source: 'NSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: parsed.sourceName,
        fileName,
        fileUrl: fileUrl || null,
        sourceFileImportId: completedImport?.id ?? pendingImport?.id ?? null,
        sourceFingerprint: parsed.sourceFingerprint,
        rowsRead: parsed.rowsRead,
        rowsParsed: parsed.rowsParsed,
        rowsInserted: storeSummary.rowsInserted || 0,
        rowsUpdated: storeSummary.rowsUpdated || 0,
        rowsNoOp: storeSummary.rowsNoOp || 0,
        rowsSkipped: (storeSummary.rowsSkipped || 0) + parsed.rowsSkipped,
        warningCount: (storeSummary.warningCount || 0) + parsed.warnings.length,
        warnings: [...parsed.warnings, ...(storeSummary.warnings || [])].slice(0, 10),
        errors: [],
        changedSymbols: changedSymbols.sort((a, b) => a.localeCompare(b)),
        downstreamSymbols: downstreamSymbols.sort((a, b) => a.localeCompare(b)),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NSE CM UDiFF import failed';
      await repository.upsertSourceFileImport({
        source: 'NSE',
        segment: 'CM',
        tradingDate,
        fileName,
        fileUrl: fileUrl || null,
        fileHash,
        fileSize,
        status: 'FAILED',
        rowsRaw: parsed.rowsRead,
        rowsAccepted: 0,
        rowsRejected: parsed.rowsRead,
        parserVersion: 'nse-cm-udiff-v1',
        errorMessage: message,
      }).catch(() => undefined);
      return {
        status: 'FAILED',
        source: 'NSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: parsed.sourceName,
        fileName,
        fileUrl: fileUrl || null,
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
      };
    }
  }
}
