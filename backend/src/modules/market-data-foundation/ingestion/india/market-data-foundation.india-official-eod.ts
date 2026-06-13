// India official NSE EOD bulk sync (Phase 4c extraction).
//
// IndiaOfficialEodService owns the official-NSE-EOD bulk-latest-candle sync path and its
// helpers, previously inline on MarketDataFoundationService:
//   - tryOfficialNseEodBulkLatestCandle (entry: matches stale tasks against the official
//     EOD CSV, stores matched rows in bulk)
//   - loadFirstAvailableNseOfficialEodCsv (first available official archive for a date)
//   - nseOfficialArchiveAppliesToDate / canUseOfficialNseEodForTask / officialNseEodBulkEnabled
//
// tryOfficialNseEodBulkLatestCandle is called by the SHARED syncScheduledRegion sync
// path (and applyOfficialEodBulkForCatalogRun); the service keeps a byte-identical
// delegator so those callers are unaffected. loadFirstAvailableNseOfficialEodCsv is also
// consumed by the Phase-4b IndiaExchangeIngestionHost; the service delegator forwards to
// this module so that host member stays satisfied.
//
// The sync-lane shared collaborators (storeHistoricalBulk, updateStockLoadTimestampsForSymbols,
// taskSymbolAliases, symbolAliasCandidates, taskPriceRegionInfo, instrumentIdsForImportedSymbols,
// startOfUtcDay, downloadOfficialExchangeText, exchangeDateKey, isNseLikeExchange,
// hasExplicitExchangeSuffix, trimmedUpper) STAY on the service (non-India sync code uses
// them too) and are reached through `this.host.X`. Pure sibling-module functions
// (buildNseOfficialArchiveUrls, parseIndianExchangeEodCsv) are imported directly.
// Behaviour is byte-identical to the pre-extraction inline implementation.

import {
  buildNseOfficialArchiveUrls,
  parseIndianExchangeEodCsv,
  type NseArchiveUrl,
} from './market-data-foundation.exchange-eod-adapter';
import type { HistoricalPrice } from '../../market-data-foundation.types';
import type {
  IndiaOfficialEodHost,
  OfficialNseEodBulkSyncResult,
  OfficialNseEodPriceRegionInfo,
} from './market-data-foundation.india-ingestion-host';
import type { OfficialEodBulkSyncEvidence } from '../../types/market-data-foundation.types.scans';
import type { StockSyncTask } from '../../types/market-data-foundation.types.instrument';

export class IndiaOfficialEodService {
  constructor(private readonly host: IndiaOfficialEodHost) {}

  async tryOfficialNseEodBulkLatestCandle(input: {
    region: string;
    assetType: string;
    targetTradingDate: string;
    tasks: StockSyncTask[];
  }): Promise<OfficialNseEodBulkSyncResult> {
    const evidence: OfficialEodBulkSyncEvidence = {
      enabled: this.officialNseEodBulkEnabled(),
      attempted: false,
      sourceName: null,
      sourceUrl: null,
      sourceFileName: null,
      targetTradingDate: input.targetTradingDate || null,
      sourceFingerprint: null,
      rowsRead: 0,
      rowsParsed: 0,
      matchedInstruments: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsNoOp: 0,
      fallbackReason: null,
      warnings: [],
    };
    const result: OfficialNseEodBulkSyncResult = {
      evidence,
      matchedTaskIds: new Set<string>(),
      summaryByTaskId: new Map(),
    };

    if (!evidence.enabled) {
      evidence.fallbackReason = 'OFFICIAL_EOD_DISABLED';
      return result;
    }
    if (input.region !== 'IN' || input.assetType !== 'STOCK') {
      evidence.fallbackReason = 'OFFICIAL_EOD_SCOPE_UNSUPPORTED';
      return result;
    }
    if (input.tasks.length === 0) {
      evidence.fallbackReason = 'OFFICIAL_EOD_NO_TASKS';
      return result;
    }

    const tradingDate = new Date(`${input.targetTradingDate}T00:00:00.000Z`);
    if (Number.isNaN(tradingDate.getTime())) {
      evidence.fallbackReason = 'OFFICIAL_EOD_INVALID_TRADING_DATE';
      return result;
    }

    evidence.attempted = true;

    try {
      const officialSource = await this.loadFirstAvailableNseOfficialEodCsv(tradingDate);
      const { archive, parsed } = officialSource;
      evidence.sourceName = archive.sourceName;
      evidence.sourceUrl = archive.url;
      evidence.sourceFileName = archive.fileName;
      evidence.sourceFingerprint = parsed.sourceFingerprint;
      evidence.rowsRead = parsed.rowsRead;
      evidence.rowsParsed = parsed.rowsParsed;
      evidence.warnings = [...officialSource.warnings, ...parsed.warnings].slice(0, 10);

      const priceByAlias = new Map<string, HistoricalPrice>();
      for (const price of parsed.prices) {
        for (const alias of this.host.symbolAliasCandidates(price.symbol)) {
          if (!priceByAlias.has(alias)) {
            priceByAlias.set(alias, price);
          }
        }
      }

      const matchedRows: Array<{ task: StockSyncTask; price: HistoricalPrice }> = [];
      const regionInfoBySymbol = new Map<string, OfficialNseEodPriceRegionInfo>();
      for (const task of input.tasks) {
        if (!this.canUseOfficialNseEodForTask(task)) continue;

        let matched: HistoricalPrice | null = null;
        for (const alias of this.host.taskSymbolAliases(task)) {
          const candidate = priceByAlias.get(alias);
          if (candidate) {
            matched = candidate;
            break;
          }
        }
        if (!matched) continue;

        matchedRows.push({
          task,
          price: {
            ...matched,
            symbol: task.symbol,
            date: this.host.startOfUtcDay(matched.date),
          },
        });
        regionInfoBySymbol.set(task.symbol, this.host.taskPriceRegionInfo(input.region, task));
      }

      if (matchedRows.length > 0) {
        try {
          const bulkSummary = await this.host.storeHistoricalBulk(
            matchedRows.map((row) => row.price),
            regionInfoBySymbol
          );
          const matchedSymbols: string[] = [];
          for (const row of matchedRows) {
            const taskSummary = bulkSummary.summaryBySymbol.get(row.task.symbol);
            if (!taskSummary) {
              evidence.warnings.push(`${row.task.symbol}: official EOD row matched but no storage summary was returned.`);
              continue;
            }
            result.matchedTaskIds.add(row.task.id);
            result.summaryByTaskId.set(row.task.id, taskSummary);
            evidence.matchedInstruments += 1;
            evidence.rowsInserted += taskSummary.rowsInserted || 0;
            evidence.rowsUpdated += taskSummary.rowsUpdated || 0;
            evidence.rowsNoOp += taskSummary.rowsNoOp || 0;
            matchedSymbols.push(row.task.symbol);
          }
          await this.host.updateStockLoadTimestampsForSymbols(matchedSymbols);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown storage error';
          evidence.warnings.push(`Official EOD bulk store failed for ${matchedRows.length} matched rows (${message}).`);
        }
      }

      if (evidence.matchedInstruments <= 0) {
        evidence.fallbackReason = 'OFFICIAL_EOD_NO_MATCHED_ROWS';
      } else if (evidence.matchedInstruments < input.tasks.length) {
        evidence.fallbackReason = `OFFICIAL_EOD_PARTIAL_MATCH:${input.tasks.length - evidence.matchedInstruments}_UNMATCHED`;
      }
      evidence.warnings = evidence.warnings.slice(0, 10);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'download or parse failed';
      evidence.fallbackReason = 'OFFICIAL_EOD_UNAVAILABLE';
      evidence.warnings = [message];
    }

    return result;
  }

  async loadFirstAvailableNseOfficialEodCsv(tradingDate: Date): Promise<{
    archive: NseArchiveUrl;
    parsed: ReturnType<typeof parseIndianExchangeEodCsv>;
    csvText: string;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    for (const archive of buildNseOfficialArchiveUrls(tradingDate).filter((candidate) => this.nseOfficialArchiveAppliesToDate(candidate, tradingDate))) {
      try {
        const csvText = await this.host.downloadOfficialExchangeText(archive.url);
        const parsed = parseIndianExchangeEodCsv(csvText, {
          source: archive.sourceName,
          sourceName: archive.sourceName,
          sourceUrl: archive.url,
          exchange: 'NSE',
          includeSeries: ['EQ', 'BE'],
          tradingDate,
        });
        if (parsed.rowsParsed > 0) {
          return { archive, parsed, csvText, warnings };
        }
        warnings.push(`${archive.sourceName} ${archive.fileName}: parsed zero usable rows.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'download or parse failed';
        warnings.push(`${archive.sourceName} ${archive.fileName}: ${message}`);
      }
    }
    throw new Error(warnings.length > 0 ? warnings.join(' | ') : 'No official NSE EOD source was available.');
  }

  // nseOfficialArchiveAppliesToDate: loadFirstAvailableNseOfficialEodCsv (above) is its
  // only caller; both stay together in this module.
  private nseOfficialArchiveAppliesToDate(archive: NseArchiveUrl, tradingDate: Date): boolean {
    const tradingDateKey = this.host.exchangeDateKey(tradingDate);
    if (archive.activeFrom && tradingDateKey < archive.activeFrom) return false;
    if (archive.discontinuedFrom && tradingDateKey >= archive.discontinuedFrom) return false;
    return true;
  }

  officialNseEodBulkEnabled(): boolean {
    const value = process.env.MARKET_DATA_NSE_OFFICIAL_EOD_BULK_ENABLED;
    if (value !== undefined) return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
    return process.env.NODE_ENV !== 'test';
  }

  private canUseOfficialNseEodForTask(task: StockSyncTask): boolean {
    const exchange = this.host.trimmedUpper(task.exchange);
    const identifiers = [task.symbol, task.providerSymbol, task.sourceSymbol, task.displaySymbol];
    const hasNsEvidence = identifiers.some((value) => this.host.hasExplicitExchangeSuffix(value, '.NS'));
    const hasBoEvidence = identifiers.some((value) => this.host.hasExplicitExchangeSuffix(value, '.BO'));

    if (hasBoEvidence) return false;
    if (exchange) return this.host.isNseLikeExchange(exchange);
    return hasNsEvidence;
  }
}
