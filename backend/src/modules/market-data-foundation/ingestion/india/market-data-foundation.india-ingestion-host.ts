// India exchange historical-backfill: shared types + host collaboration contract.
//
// Phase 4a of the market-data-foundation decomposition extracts the India
// historical-backfill RUNNER out of MarketDataFoundationService into a dedicated
// collaborator class (see market-data-foundation.india-historical-backfill.ts).
// The runner reaches the shared service collaborators it still needs (Prisma
// ledger handle, repository, per-date importers, transient-DB retry, date/normalize
// helpers, etc.) through the IndiaHistoricalBackfillHost interface defined here.
// The service implements this interface; behaviour is byte-identical to the
// pre-extraction inline implementation.
//
// The backfill-specific result/input/status types below were moved verbatim from
// market-data-foundation.service.ts so the runner and the service can both import
// them from one home. ExchangeDailyImportSummary remains used by the daily
// importers that stay on the service (Phase 4b extracts those).
//
// Phase 4b additionally extracts the India NSE/BSE DAILY PRICE IMPORTERS into
// IndiaExchangeIngestionService (see market-data-foundation.india-exchange-ingestion*.ts).
// Those importers reach the shared service collaborators they still need (Prisma
// repository, the bulk price writer, the catalog importer, the official-EOD CSV
// loader, the CSV/number/date/symbol/index-name leaf helpers, etc.) through the
// IndiaExchangeIngestionHost interface defined at the bottom of this file. The
// service implements it; behaviour is byte-identical to the pre-extraction inline
// implementation.

import type {
  CatalogImportRequest,
  CatalogImportSummary,
  HistoricalPrice,
  SyncSummary,
} from '../../market-data-foundation.types';
import type { NseArchiveUrl, parseIndianExchangeEodCsv } from './market-data-foundation.exchange-eod-adapter';
import type { OfficialEodBulkSyncEvidence } from '../../types/market-data-foundation.types.scans';
import type { StockSyncTask } from '../../types/market-data-foundation.types.instrument';

// Shared price-store shapes re-declared here (structurally identical to the
// service-local aliases) so the extracted ingestion files and the host contract
// share one home for them without importing service-private types.
export type IndiaExchangePriceRegionInfo = {
  region: string;
  exchange?: string | null;
};
export type IndiaExchangeHistoricalStoreOptions = {
  sourceFileImportId?: string | null;
  skipLatestPriceUpdate?: boolean;
};
export type IndiaExchangeHistoricalBulkStoreResult = SyncSummary & {
  summaryBySymbol: Map<string, SyncSummary>;
};

export type ExchangeDailyImportSummary = {
  status: 'COMPLETED' | 'SKIPPED_DUPLICATE' | 'FAILED' | 'NOT_AVAILABLE';
  source: 'NSE' | 'BSE';
  segment: string;
  tradingDate: string;
  sourceName: string;
  fileName: string;
  fileUrl: string | null;
  sourceFileImportId: string | null;
  sourceFingerprint: string | null;
  rowsRead: number;
  rowsParsed: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsNoOp: number;
  rowsSkipped: number;
  warningCount: number;
  warnings: string[];
  errors: string[];
  changedSymbols?: string[];
  downstreamSymbols?: string[];
};
export type ExchangeHistoricalBackfillJobStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'SKIPPED_ALREADY_IMPORTED'
  | 'SKIPPED_NON_TRADING'
  | 'FAILED'
  | 'NOT_AVAILABLE'
  | 'STALE_RETRYABLE'
  | 'CANCELLED';
export type ExchangeHistoricalBackfillRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'CANCELLED' | 'BLOCKED';
export type ExchangeHistoricalBackfillJobRecord = {
  id: string;
  tradingDate: string;
  dateRange: string;
  status: ExchangeHistoricalBackfillJobStatus;
  source: 'NSE' | 'NSE+BSE' | 'NSE_INDEX';
  rowsImported: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsNoOp: number;
  rowsSkipped: number;
  bseFills: number;
  error: string | null;
  retryCount: number;
  startedAt: string | null;
  completedAt: string | null;
  sourceFileImportId: string | null;
};
export type ExchangeHistoricalBackfillRunResponse = {
  runId: string;
  status: ExchangeHistoricalBackfillRunStatus;
  source: 'NSE';
  segment: string;
  region: string;
  assetType: string;
  startDate: string;
  endDate: string;
  maxDates: number | null;
  workerCount: number;
  maxWorkers: number;
  maxRetries: number;
  totalDates: number;
  pending: number;
  running: number;
  completed: number;
  skipped: number;
  failed: number;
  notAvailable: number;
  retryCount: number;
  currentWorkers: number;
  rowsRead: number;
  rowsParsed: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsNoOp: number;
  rowsSkipped: number;
  bseFills: number;
  progressPercent: number;
  estimatedRemainingMs: number | null;
  startedAt: string | null;
  completedAt: string | null;
  warnings: string[];
  errors: string[];
  jobs: ExchangeHistoricalBackfillJobRecord[];
};
export type ExchangeHistoricalBackfillRunInput = {
  region?: string;
  assetType?: string;
  startDate: Date | string;
  endDate: Date | string;
  maxDates?: number;
  includeBseFill?: boolean;
  workerCount?: number;
  maxRetries?: number;
  downloadDelayMs?: number;
  jitterMs?: number;
  staleJobTimeoutMs?: number;
  autoStart?: boolean;
  mode?: 'ALL' | 'RESUME_INCOMPLETE' | 'RETRY_FAILED';
};
export type ExchangeHistoricalBackfillDatabasePause = {
  pausedAt: string;
  message: string;
};
export type NseDeliveryHistoricalBackfillInput = {
  region?: string;
  assetType?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  sessions?: number;
  batchSize?: number;
  offset?: number;
  force?: boolean;
  downloadDelayMs?: number;
  jitterMs?: number;
};
export type NseDeliveryHistoricalBackfillDateResult = {
  tradingDate: string;
  status: ExchangeDailyImportSummary['status'] | 'NOT_AVAILABLE';
  sourceFileImportId: string | null;
  rowsRead: number;
  rowsParsed: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsNoOp: number;
  rowsSkipped: number;
  symbolsCovered: number;
  warnings: string[];
  errors: string[];
};
export type NseDeliveryHistoricalBackfillResponse = {
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  source: 'NSE';
  segment: 'DELIVERY';
  region: string;
  assetType: string;
  startDate: string;
  endDate: string;
  targetSessions: number | null;
  totalDates: number;
  processedCount: number;
  batchSize: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  completed: number;
  skippedDuplicates: number;
  failed: number;
  notAvailable: number;
  symbolsCovered: number;
  oldestDate: string | null;
  newestDate: string | null;
  rowsRead: number;
  rowsParsed: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsNoOp: number;
  rowsSkipped: number;
  sourceFileImportIds: string[];
  warnings: string[];
  errors: string[];
  dates: NseDeliveryHistoricalBackfillDateResult[];
};

/**
 * Collaboration surface the India historical-backfill runner needs from its host
 * (MarketDataFoundationService). Every member here is an EXISTING service method or
 * helper the runner already called as `this.X` before extraction; it is now reached
 * as `this.host.X`. These collaborators stay on the service because non-India code
 * uses them too. Pure sibling-module functions (market-session, endpoints,
 * exchange-eod-adapter) are imported directly by the runner and are NOT routed here.
 */
export interface IndiaHistoricalBackfillHost {
  // Prisma access: the per-concern repository and the pipeline-ledger Prisma handle.
  readonly repository: any;
  marketDataDb(): any;

  // Background worker kick-off. Routed through the host (rather than called directly on
  // the runner) so that callers/tests can intercept the async worker start at the
  // service boundary exactly as they did before the Phase 4a extraction. The service
  // delegates this back to the runner's real implementation.
  startHistoricalBackfillWorkers(runId: string): void;

  // Per-date importers the runner orchestrates (Phase 4b extracts these).
  importNseCmOfficialDaily(input: {
    tradingDate: Date | string;
    force?: boolean;
    skipLatestPriceUpdate?: boolean;
  }): Promise<ExchangeDailyImportSummary>;
  importBseCmBackupDaily(input: {
    tradingDate: Date | string;
    csvText?: string;
    fileName?: string;
    fileUrl?: string | null;
    force?: boolean;
    skipLatestPriceUpdate?: boolean;
  }): Promise<ExchangeDailyImportSummary>;
  importNseIndexOfficialDaily(input: {
    tradingDate: Date | string;
    force?: boolean;
    skipLatestPriceUpdate?: boolean;
  }): Promise<ExchangeDailyImportSummary>;
  importNseDeliveryOfficialDaily(input: {
    tradingDate: Date | string;
    force?: boolean;
  }): Promise<ExchangeDailyImportSummary>;

  // Transient-database resilience + metadata/array leaf helpers.
  withTransientDatabaseRetry<T>(operation: () => Promise<T>, label: string): Promise<T>;
  isTransientDatabaseError(error: unknown): boolean;
  transientDatabaseMessage(error: unknown): string;
  errorMessage(error: unknown, fallback: string): string;
  objectMetadata(value: unknown): Record<string, any>;
  stringArray(value: unknown): string[];
  iso(value: unknown): string | null;
  sleep(ms: number): Promise<void>;
  currentMemoryUtilizationPercent(): number;

  // Not-available classification for daily import summaries.
  isHistoricalBackfillNotAvailable(summary: ExchangeDailyImportSummary): boolean;
  isNotAvailableErrorMessage(message: string): boolean;

  // Numeric/worker clamps.
  clampNumber(value: unknown, min: number, max: number, fallback: number): number;
  clampHistoricalBackfillWorkers(value: unknown): number;
  clampHistoricalBackfillMaxRetries(value: unknown): number;

  // Exchange date/normalize/calendar helpers.
  exchangeDateKey(date: Date): string;
  exchangeBackfillDates(startDate: Date, endDate: Date): Date[];
  normalizeExchangeTradingDate(value: Date | string): Date;
  latestCompletedExchangeTradingDateOrThrow(region: string): Date;
  addUtcDays(date: Date, days: number): Date;
  isWeekdayTradingCandidate(date: Date): boolean;
  nseCmTradingHolidayDatesForRange(startDate: Date, endDate: Date): Promise<Map<string, string>>;
}

/**
 * Collaboration surface the India NSE/BSE daily price importers need from their host
 * (MarketDataFoundationService). Every member is an EXISTING service method/helper the
 * importer bodies already called as `this.X` before the Phase 4b extraction; they are
 * now reached as `this.host.X`. These collaborators stay on the service because
 * catalog/serving/sync code uses them too. Pure sibling-module functions
 * (exchange-eod-adapter, endpoints) are imported directly by the ingestion files and
 * are NOT routed here.
 *
 * The four importer members below stay routed through the host (rather than called as
 * intra-class `this.X`) so that the service's thin delegators — and any test that
 * `jest.spyOn(service, ...)` them — stay in the interception path exactly as before the
 * extraction. (`refreshNseDeliveryDaily` -> `importNseDeliveryOfficialDaily` and
 * `runNseIndexAndDeliveryCatchUp` -> index/delivery importers are the seams this
 * preserves.)
 */
export interface IndiaExchangeIngestionHost {
  // Prisma access (the per-concern repository, reached via `this.repository` in bodies).
  readonly repository: any;

  // Importers re-routed through the host to preserve the service-delegator spy seam.
  importNseIndexOfficialDaily(input: {
    tradingDate: Date | string;
    force?: boolean;
    skipLatestPriceUpdate?: boolean;
  }): Promise<ExchangeDailyImportSummary>;
  importNseDeliveryOfficialDaily(input: {
    tradingDate: Date | string;
    force?: boolean;
  }): Promise<ExchangeDailyImportSummary>;

  // Bulk price writer + catalog importer (shared with catalog/sync code paths).
  storeHistoricalBulk(
    prices: HistoricalPrice[],
    regionInfoBySymbol?: Map<string, IndiaExchangePriceRegionInfo>,
    options?: IndiaExchangeHistoricalStoreOptions
  ): Promise<IndiaExchangeHistoricalBulkStoreResult>;
  importCatalog(request: CatalogImportRequest): Promise<CatalogImportSummary>;

  // Official-EOD CSV loader (stays on the service; Phase 4c owns it). Reads the first
  // available official NSE EOD archive for a date and returns the parsed CSV.
  loadFirstAvailableNseOfficialEodCsv(tradingDate: Date): Promise<{
    archive: NseArchiveUrl;
    parsed: ReturnType<typeof parseIndianExchangeEodCsv>;
    csvText: string;
    warnings: string[];
  }>;

  // Adjusted-close recompute hook (stays on the service; Phase 4c owns it).
  recomputeAdjustedClosesForInstrument(instrumentId: string): Promise<{
    instrumentId: string;
    symbol: string | null;
    bars: number;
    updated: number;
    warnings: string[];
  }>;

  // Shared download / hashing / CSV-leaf / parsing / symbol+index-name helpers.
  downloadOfficialExchangeText(url: string): Promise<string>;
  sha256(value: string): string;
  startOfUtcDay(date: Date): Date;
  parseCsv(csvText: string): Record<string, string>[];
  parseCatalogDate(value: string): Date | null;
  parseMarketDataNumber(value: string): number | null;
  readObjectString(record: Record<string, unknown>, keys: string[]): string;
  baseSymbolFromProviderSymbol(symbol: string): string;
  cleanIndexName(value: string): string;
  indexPriceSourceForName(name: string): 'NSE_INDEX_EOD' | 'NIFTY_SECTOR_INDEX';

  // Exchange date/normalize + not-available classification (also used by the importers).
  normalizeExchangeTradingDate(value: Date | string): Date;
  latestCompletedExchangeTradingDateOrThrow(region: string): Date;
  exchangeDateKey(date: Date): string;
  isNotAvailableErrorMessage(message: string): boolean;
}

// ───────────────────────────────────────────────────────────────────────────
// Phase 4c — India trading-calendar / corporate-actions / official-EOD extraction.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Collaboration surface the India NSE trading-calendar / holiday cache
 * (IndiaTradingCalendar) needs from its host (MarketDataFoundationService). Each member
 * is an EXISTING service helper the moved holiday bodies already called as `this.X`; they
 * stay on the service (config/leaf helpers shared with non-India code) and are now reached
 * as `this.host.X`. The NSE holiday-master URL builder is a pure sibling-module function
 * imported directly by the calendar and is NOT routed here. The holiday cache itself moved
 * onto the calendar class.
 */
export interface IndiaTradingCalendarHost {
  clampNumber(value: unknown, min: number, max: number, fallback: number): number;
  readPositiveNumber(value: string | undefined, fallback: number): number;
  downloadOfficialExchangeJson(url: string): Promise<any>;
}

/**
 * Collaboration surface the India NSE corporate-actions importer + adjusted-close
 * recompute (IndiaCorporateActionsService) needs from its host
 * (MarketDataFoundationService). Each member is an EXISTING service collaborator the moved
 * bodies already called as `this.X`; they stay on the service and are now reached as
 * `this.host.X`. Crucially `invalidateSignalOutcomes` (and its constructor wiring) stays on
 * the service — only its invocation is routed here. Pure sibling-module functions
 * (parseNseCorporateActions, computeAdjustedCloses) are imported directly and NOT routed.
 */
export interface IndiaCorporateActionsHost {
  readonly repository: any;
  parseCsv(csvText: string): Record<string, string>[];
  readObjectString(record: Record<string, unknown>, keys: string[]): string;
  sha256(value: string): string;
  normalizeExchangeTradingDate(value: Date | string): Date;
  baseSymbolFromProviderSymbol(symbol: string): string;
  invalidateSignalOutcomes(instrumentIds: string[], fromDate?: Date): Promise<number>;
}

// Structurally identical to the service-local PriceRegionInfo; re-declared here so the
// extracted official-EOD file and the host contract share one home without importing a
// service-private type.
export type OfficialNseEodPriceRegionInfo = {
  region: string;
  exchange?: string | null;
};

// Result shape of tryOfficialNseEodBulkLatestCandle — moved verbatim from the
// service-local alias so the extracted official-EOD file, the host contract, and the
// service delegator share one home for it.
export type OfficialNseEodBulkSyncResult = {
  evidence: OfficialEodBulkSyncEvidence;
  matchedTaskIds: Set<string>;
  summaryByTaskId: Map<string, SyncSummary>;
};

export type OfficialNseEodHistoricalBulkStoreResult = SyncSummary & {
  summaryBySymbol: Map<string, SyncSummary>;
};

/**
 * Collaboration surface the India official-NSE-EOD bulk sync (IndiaOfficialEodService)
 * needs from its host (MarketDataFoundationService). Each member is an EXISTING service
 * collaborator the moved bodies already called as `this.X`; they stay on the service
 * (sync-lane shared with non-India sync code) and are now reached as `this.host.X`. Pure
 * sibling-module functions (buildNseOfficialArchiveUrls, parseIndianExchangeEodCsv) are
 * imported directly and NOT routed here.
 */
export interface IndiaOfficialEodHost {
  // Bulk price writer (shared with catalog/sync code paths).
  storeHistoricalBulk(
    prices: HistoricalPrice[],
    regionInfoBySymbol?: Map<string, OfficialNseEodPriceRegionInfo>,
    options?: IndiaExchangeHistoricalStoreOptions
  ): Promise<OfficialNseEodHistoricalBulkStoreResult>;

  // Sync-lane symbol/region + timestamp helpers (stay on the service).
  symbolAliasCandidates(symbol: string | null | undefined): string[];
  taskSymbolAliases(task: StockSyncTask): string[];
  taskPriceRegionInfo(defaultRegion: string, task: StockSyncTask): OfficialNseEodPriceRegionInfo;
  updateStockLoadTimestampsForSymbols(symbols: string[]): Promise<void>;

  // Download + date/exchange leaf helpers (stay on the service).
  downloadOfficialExchangeText(url: string): Promise<string>;
  startOfUtcDay(date: Date): Date;
  exchangeDateKey(date: Date): string;
  trimmedUpper(value: unknown): string;
  isNseLikeExchange(exchange: string): boolean;
  hasExplicitExchangeSuffix(symbol: string | null | undefined, suffix: '.NS' | '.BO'): boolean;
}
