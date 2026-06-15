import { MarketDataFoundationRepository } from './market-data-foundation.repository';
import type { MarketDataReadApi } from './analytics/market-data-read.api';
import type { MarketDataServingHost } from './analytics/market-data-foundation.serving-host';
import { CryptoReadsService } from './analytics/market-data-foundation.serving.crypto-reads';
import { PriceReadsService } from './analytics/market-data-foundation.serving.price-reads';
import { FundamentalsReadsService } from './analytics/market-data-foundation.serving.fundamentals-reads';
import { ScanReadsService } from './analytics/market-data-foundation.serving.scan-reads';
import { CatalogReadsService } from './analytics/market-data-foundation.serving.catalog-reads';
import { UniverseReadinessService } from './quality/market-data-foundation.universe-readiness';
import { UniverseSignoffService } from './quality/market-data-foundation.universe-readiness.signoff';
import { UniverseReviewPolicyService } from './quality/market-data-foundation.universe-readiness.review-policy';
import { UniverseHealthService } from './quality/market-data-foundation.universe-readiness.health';
import { UniverseReviewService } from './quality/market-data-foundation.universe-readiness.review';
import { UniverseRepairWorkbenchService } from './quality/market-data-foundation.universe-readiness.workbench';
import { UniverseInstrumentsService } from './quality/market-data-foundation.universe-readiness.instruments';
import { StockMissingDataColumnService } from './quality/market-data-foundation.universe-readiness.diagnostics-columns';
import {
  toV1Instrument as toV1InstrumentMapper,
  baseSymbolFromProviderSymbol as baseSymbolFromProviderSymbolMapper,
  providerSymbolForExchange as providerSymbolForExchangeMapper,
  normalizeCatalogSymbol as normalizeCatalogSymbolMapper,
} from './analytics/market-data-foundation.instrument-mapper';
import { MarketDataFoundationCryptoRepository, marketDataFoundationCryptoRepository } from './ingestion/crypto/market-data-foundation.crypto-repository';
import type {
  CreateStockRequest, CompanyMasterData, CorporateAction, CoreFundamentals,
  DailyRefreshEligibilityResult, FxRateInput, HistoricalPrice,
  MarketDataRepairPlan, MarketDataRepairRequest,
  MarketDataRepairRunAction, MarketDataRepairRunActionResult, MarketDataRepairRunRecord,
  MarketDataRepairRunRequest, MarketDataRepairRunResponse,
  MarketDataRepairSourceIdentity, MarketDataRepairSummary, MarketDataUniverseSignoff,
  MarketDataManualMetadataTemplate,
  MarketDataPriceIdentityRepairSummary,
  MarketDataRepairStateStatus, MarketDataUniverseHealth, MarketMapSummary,
  StockColumnMissingDataDiagnostic,
  StockMissingDataDiagnostics,
  StockMissingDataIssueKind,
  StockMissingDataSample,
  ProviderValidationResult,
  ReviewReadinessBlocker,
  ReviewReadinessNextAction,
  ReviewReadinessSummary,
  MarketDataSyncSkipReason,
  MarketMoversSummary,
  MarketScanSummary52w,
  MarketScanSummaryDeliverySpike,
  MarketScanSummaryVolumeSpike,
  InstrumentUniverseReadiness,
  TrustedReviewUniverseHealth,
  TrustedReviewUniverseInstrument,
  TrustedUniverseRepairWorkbench,
  TrustedReviewUniverseMode,
  TrustedBaselineListingDateStatus,
  TrustedBaselineProviderFallbackState,
  TrustedBaselineRequiredHistoryStatus,
  TrustedBaselineResidualState,
  UniverseTrustStatus,
  ScheduledRegionSyncSummary,
  PaginationOptions,
  CatalogBackfillRequest,
  CatalogBackfillSummary,
  CatalogImportRequest,
  CatalogImportSummary,
  CatalogSource,
  CatalogSyncRunRequest,
  CatalogSyncRunStatus,
  CatalogSyncRunStatusResponse,
  PriceBackfillRunRequest,
  PriceBackfillRunStatusResponse,
  SearchResult,
  StockSyncTask,
  SyncSummary,
  UpdateStockRequest,
  V1CreateInstrumentRequest,
  V1IngestionRequest,
  V1Instrument,
  V1SyncResult,
} from './market-data-foundation.types';
import { registerNseHolidayProvider } from './ingestion/market-data-foundation.market-session';
import {
  type NseArchiveUrl,
  parseIndianExchangeEodCsv,
} from './ingestion/india/market-data-foundation.exchange-eod-adapter';
import {
  type NseCorporateActionRow,
} from './ingestion/india/market-data-foundation.corporate-actions-source';
import {
  type ManualVerifiedFundamentalsCsvRow,
} from './ingestion/india/market-data-foundation.nse-xbrl-fundamentals-exporter';
import { IndiaHistoricalBackfillRunner } from './ingestion/india/market-data-foundation.india-historical-backfill';
import { IndiaExchangeIngestionService } from './ingestion/india/market-data-foundation.india-exchange-ingestion';
import { IndiaTradingCalendar } from './ingestion/india/market-data-foundation.india-trading-calendar';
import { IndiaCorporateActionsService } from './ingestion/india/market-data-foundation.india-corporate-actions';
import { IndiaOfficialEodService } from './ingestion/india/market-data-foundation.india-official-eod';
import type {
  OfficialNseEodBulkSyncResult,
} from './ingestion/india/market-data-foundation.india-ingestion-host';
import type {
  IndiaHistoricalBackfillHost,
  IndiaExchangeIngestionHost,
  ExchangeDailyImportSummary,
  ExchangeHistoricalBackfillJobStatus,
  ExchangeHistoricalBackfillRunResponse,
  ExchangeHistoricalBackfillRunInput,
  NseDeliveryHistoricalBackfillInput,
  NseDeliveryHistoricalBackfillResponse,
} from './ingestion/india/market-data-foundation.india-ingestion-host';
import {
  parseCsv as parseCsvUtil,
  readObjectString as readObjectStringUtil,
} from './util/market-data-foundation.util.csv';
import {
  parseCatalogDate as parseCatalogDateUtil,
  parseMarketDataNumber as parseMarketDataNumberUtil,
  startOfUtcDay as startOfUtcDayUtil,
  normalizeExchangeTradingDate as normalizeExchangeTradingDateUtil,
  latestCompletedExchangeTradingDateOrThrow as latestCompletedExchangeTradingDateOrThrowUtil,
  exchangeDateKey as exchangeDateKeyUtil,
  addUtcDays as addUtcDaysUtil,
  exchangeBackfillDates as exchangeBackfillDatesUtil,
  isWeekdayTradingCandidate as isWeekdayTradingCandidateUtil,
  endOfTradingDateUtc as endOfTradingDateUtcUtil,
  sha256 as sha256Util,
} from './util/market-data-foundation.util.dates';
import {
  downloadOfficialExchangeText as downloadOfficialExchangeTextUtil,
  downloadOfficialExchangeJson as downloadOfficialExchangeJsonUtil,
  readPositiveNumber as readPositiveNumberUtil,
} from './util/market-data-foundation.util.download';
import {
  sleep as sleepUtil,
  currentMemoryUtilizationPercent as currentMemoryUtilizationPercentUtil,
  throttleIngestion as throttleIngestionUtil,
} from './util/market-data-foundation.util.concurrency';
import {
  withTransientDatabaseRetry as withTransientDatabaseRetryUtil,
  isTransientDatabaseError as isTransientDatabaseErrorUtil,
  transientDatabaseMessage as transientDatabaseMessageUtil,
} from './util/market-data-foundation.util.transient-db';
import {
  errorMessage as errorMessageUtil,
  objectMetadata as objectMetadataUtil,
  stringArray as stringArrayUtil,
  iso as isoUtil,
  clampNumber as clampNumberUtil,
  clampHistoricalBackfillWorkers as clampHistoricalBackfillWorkersUtil,
  clampHistoricalBackfillMaxRetries as clampHistoricalBackfillMaxRetriesUtil,
  isHistoricalBackfillNotAvailable as isHistoricalBackfillNotAvailableUtil,
  isNotAvailableErrorMessage as isNotAvailableErrorMessageUtil,
  trimmedUpper as trimmedUpperUtil,
} from './util/market-data-foundation.util.misc';
import {
  cleanIndexName as cleanIndexNameUtil,
  indexPriceSourceForName as indexPriceSourceForNameUtil,
} from './util/market-data-foundation.util.index-names';
import {
  defaultCountryForInstrument as defaultCountryForInstrumentUtil,
  defaultCurrencyForInstrument as defaultCurrencyForInstrumentUtil,
  normalizeInstrumentAssetType as normalizeInstrumentAssetTypeUtil,
  deriveInstrumentSegment as deriveInstrumentSegmentUtil,
  missingMetadataFields as missingMetadataFieldsUtil,
  metadataCompletenessScore as metadataCompletenessScoreUtil,
  isKnownNseDerivativesEligibleStock as isKnownNseDerivativesEligibleStockUtil,
  hasValidMetadataValue as hasValidMetadataValueUtil,
  hasValidMarketCap as hasValidMarketCapUtil,
  isBlank as isBlankUtil,
} from './util/market-data-foundation.util.instrument-metadata';
// Repair/remediation engine (Phase 5c). The service constructs RepairService once with `this` as
// the MarketDataRepairHost and keeps thin byte-identical delegators for the controller-facing repair
// surface; cross-engine collaborators are re-exposed by those delegators.
import { RepairService } from './repair/market-data-foundation.repair.service';
import type { MarketDataRepairHost } from './repair/market-data-foundation.repair-host';
import type { MarketDataIngestionHost } from './ingestion/market-data-foundation.ingestion-host';
import { CatalogIngestionService } from './ingestion/market-data-foundation.ingestion.catalog';
import { SyncGateService } from './ingestion/market-data-foundation.ingestion.sync-gate';
import { SymbolIngestionService } from './ingestion/market-data-foundation.ingestion.symbol';
import { CatalogSyncEngine } from './ingestion/market-data-foundation.ingestion.catalog-sync.engine';
import { V1IngestionService } from './ingestion/market-data-foundation.ingestion.v1';
import { RegionSyncOrchestrator } from './ingestion/market-data-foundation.ingestion.orchestrator';
import { ScanSnapshotWriterService } from './ingestion/market-data-foundation.ingestion.scan-snapshots';
import type {
  MarketDataPipelineRecorder,
  CatalogIdentityRowsSnapshot,
  RepairRunSourceSnapshot,
} from './repair/market-data-foundation.repair.types';

const NSE_BSE_ONLY_PROVIDER_DISABLED_CODE = 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY';
const NSE_BSE_ONLY_PROVIDER_DISABLED_MESSAGE =
  'External Yahoo/yfinance and Angel One provider paths are disabled. Use NSE/BSE exchange-file imports or manual verified evidence only.';
// Manual-verified-fundamentals consts/types moved to repair/ (Phase 5c).

type LegacyMarketDataProviderPort = {
  inferRegion(symbol: string): { region: string; exchange?: string | null };
  search(query: string): Promise<SearchResult[]>;
  validateProviderSymbol(symbol: string, options?: Record<string, unknown>): Promise<ProviderValidationResult>;
  fetchCompanyMasterData(symbol: string): Promise<CompanyMasterData | null>;
  fetchCoreFundamentals(symbol: string): Promise<CoreFundamentals | null>;
  fetchCorporateActions(symbol: string): Promise<CorporateAction[]>;
  fetchHistorical(symbol: string, startDate?: Date, endDate?: Date): Promise<HistoricalPrice[]>;
  fetchFxRate(pair: string): Promise<FxRateInput | null>;
};

type LegacyAngelProviderPort = {
  canHandleHistorical(symbol: string, options?: Record<string, unknown>): boolean;
  validateProviderSymbol(symbol: string, options?: Record<string, unknown>): Promise<ProviderValidationResult>;
  shouldFailClosed(): boolean;
  fetchHistorical(symbol: string, startDate?: Date, endDate?: Date): Promise<HistoricalPrice[]>;
};

const providerDisabledError = (operation: string) => {
  const error = new Error(`${operation} disabled: ${NSE_BSE_ONLY_PROVIDER_DISABLED_MESSAGE}`);
  (error as any).code = NSE_BSE_ONLY_PROVIDER_DISABLED_CODE;
  return error;
};

const inferExchangeOnlyRegion = (symbol: string): { region: string; exchange?: string | null } => {
  const normalized = String(symbol || '').trim().toUpperCase();
  if (normalized.endsWith('.NS')) return { region: 'IN', exchange: 'NSE' };
  if (normalized.endsWith('.BO') || normalized.endsWith('.BS')) return { region: 'IN', exchange: 'BSE' };
  return { region: 'GLOBAL', exchange: null };
};

const disabledMarketDataProvider: LegacyMarketDataProviderPort = {
  inferRegion: inferExchangeOnlyRegion,
  search: async () => { throw providerDisabledError('external provider search'); },
  validateProviderSymbol: async () => { throw providerDisabledError('provider validation'); },
  fetchCompanyMasterData: async () => { throw providerDisabledError('provider company master fetch'); },
  fetchCoreFundamentals: async () => { throw providerDisabledError('provider fundamentals fetch'); },
  fetchCorporateActions: async () => { throw providerDisabledError('provider corporate actions fetch'); },
  fetchHistorical: async () => { throw providerDisabledError('provider historical candle fetch'); },
  fetchFxRate: async () => { throw providerDisabledError('provider FX fetch'); },
};

const disabledAngelProvider: LegacyAngelProviderPort = {
  canHandleHistorical: () => false,
  validateProviderSymbol: async () => { throw providerDisabledError('Angel One provider validation'); },
  shouldFailClosed: () => true,
  fetchHistorical: async () => { throw providerDisabledError('Angel One historical candle fetch'); },
};

type TrustedReviewUniverseOptions = Pick<PaginationOptions, 'region' | 'assetType'> & { now?: Date; recompute?: boolean };
type UniverseComputationSnapshot = {
  scope: { region: string; assetType: string };
  stocks: any[];
  readinessBySymbol: Map<string, InstrumentUniverseReadiness>;
  statsBySymbol: Map<string, any>;
  validationWindow: ReturnType<MarketDataFoundationService['providerValidationWindow']>;
  priceBackfillBlockedStockIds: Set<string>;
  repairStatesByStockId?: Map<string, any[]>;
};
type HistoricalStoreOptions = {
  sourceFileImportId?: string | null;
  skipLatestPriceUpdate?: boolean;
};
// (India historical-backfill types moved to market-data-foundation.india-ingestion-host.ts)
type StockMissingDataColumnConfig = {
  column: string;
  label: string;
  nullable: boolean;
  value: (stock: any) => unknown;
  expectedNull?: (stock: any) => boolean;
  expectedNullReason?: string;
  expected?: (stock: any) => string | null;
  invalid?: (stock: any, value: unknown, priceStatsBySymbol: Map<string, any>) => string | null;
};


// Repair-engine local types (PriceBackfillRunRecord / CatalogIdentity* / RepairRunSourceSnapshot /
// PriceBackfillCandidate) moved to repair/market-data-foundation.repair.types.ts (Phase 5c). The
// two the kept repair delegators still reference are imported from there.

type TrustedBaselineSnapshot = {
  trustedBaselineResidualState: TrustedBaselineResidualState;
  trustedBaselineBlockerCodes: string[];
  latestCompletedEodDate: string | null;
  latestCompletedEodPresent: boolean;
  storedDataThroughDate: string | null;
  requiredHistoryStartDate: string | null;
  requiredHistoryEndDate: string | null;
  requiredHistoryStatus: TrustedBaselineRequiredHistoryStatus;
  listingDate: string | null;
  listingDateStatus: TrustedBaselineListingDateStatus;
  providerFallbackState: TrustedBaselineProviderFallbackState;
  primarySourceAttempted: 'NSE_BSE_EXCHANGE_EOD' | 'YAHOO' | null;
  fallbackSourcesAttempted: string[];
  sourceFallbackReason: string | null;
};


type HistoricalBulkStoreResult = SyncSummary & {
  summaryBySymbol: Map<string, SyncSummary>;
};

type PriceRegionInfo = {
  region: string;
  exchange?: string | null;
};

// MarketDataPipelineRecorder / MarketDataPipelineSnapshotInput moved to repair/ (Phase 5c); the
// service imports MarketDataPipelineRecorder for the constructor's pipelineRecorder DI slot.
/**
 * Minimal port for invalidating persisted signal-quality outcomes when
 * adjustedClose prices change. Implemented by SignalQualityLabRepository;
 * declared structurally here to avoid importing that module (which depends on
 * this one) and creating a circular dependency.
 *
 * Two variants:
 *  - markStaleByInstrumentIds      — invalidates ALL complete rows for the instruments
 *    (safe fallback when the earliest-changed date is unknown)
 *  - markStaleByInstrumentsFromDate — window-intersection variant; only rows
 *    whose [signalDate, signalDate+60d] window overlaps [fromDate, ∞)
 *    (preferred; avoids over-invalidation of historically-distant outcomes)
 */
export interface SignalOutcomeStalenessInvalidator {
  markStaleByInstrumentIds(instrumentIds: string[]): Promise<number>;
  markStaleByInstrumentsFromDate?(instrumentIds: string[], fromDate: Date): Promise<number>;
}

export class MarketDataFoundationService implements MarketDataReadApi, IndiaHistoricalBackfillHost, IndiaExchangeIngestionHost, MarketDataServingHost, MarketDataRepairHost, MarketDataIngestionHost {
  // Catalog-sync process-wide run state moved to CatalogSyncEngineBase (ingestion-extraction phase).
  // Aliased here so legacy/test access (MarketDataFoundationService.catalogSyncRuns /
  // ...activeCatalogSyncRuns — the service.test.ts beforeEach calls `.clear()` on them) still
  // references the SAME Maps the engine uses (static inheritance resolves to the base-class instances).
  protected static readonly catalogSyncRuns = CatalogSyncEngine.catalogSyncRuns;
  protected static readonly activeCatalogSyncRuns = CatalogSyncEngine.activeCatalogSyncRuns;
  // Price-backfill process-wide run state moved to RepairPriceBackfillRunEngine (Phase 5c).
  // Aliases of the historical-backfill concurrency-control state, which physically lives
  // on the runner base class (IndiaHistoricalBackfillJobsBase) after the Phase 4a extraction.
  // Re-exposed here so `MarketDataFoundationService.activeHistoricalBackfillRuns` /
  // `...historicalBackfillDatabasePauses` still reference the SAME Set/Map the runner uses
  // (static inheritance: these resolve to the base-class instances). Preserves test/legacy access.
  protected static readonly activeHistoricalBackfillRuns = IndiaHistoricalBackfillRunner.activeHistoricalBackfillRuns;
  protected static readonly historicalBackfillDatabasePauses = IndiaHistoricalBackfillRunner.historicalBackfillDatabasePauses;
  // Widened private->public for the ingestion-extraction phase: SymbolIngestionService reads this
  // manual-sync cooldown through the MarketDataIngestionHost (it stays on the service).
  public readonly manualSyncCooldownMinutes = this.readPositiveNumber(
    process.env.MARKET_DATA_MANUAL_SYNC_COOLDOWN_MINUTES,
    15
  );
  // Universe snapshot cache (TTL field + Map) moved to UniverseReadinessService (Phase 5b) so the
  // single instance is shared by serving reads (populate/read) and repair (invalidate via the
  // invalidateUniverseComputationSnapshot delegator). Cache coherence is preserved.

  // India NSE trading-calendar / holiday cache (Phase 4c). Constructed before the
  // constructor body runs so the registerNseHolidayProvider closure below can read its
  // owned nseTradingHolidayCache; the public delegator forwards to it.
  private readonly indiaTradingCalendar = new IndiaTradingCalendar(this);

  constructor(
    public readonly repository = new MarketDataFoundationRepository(),
    // Widened private->public for Phase 5c: the repair engine reads these injected collaborators
    // through the MarketDataRepairHost (marketDataProvider for provider business-metadata repair;
    // pipelineRecorder for price-backfill pipeline snapshots).
    public readonly marketDataProvider: LegacyMarketDataProviderPort = disabledMarketDataProvider,
    private readonly angelOneMarketDataProvider: LegacyAngelProviderPort = disabledAngelProvider,
    public readonly pipelineRecorder?: MarketDataPipelineRecorder,
    // Optional hook used to invalidate persisted signal-quality outcomes when
    // adjustedClose prices change. Defaults (lazily, in invalidateSignalOutcomes)
    // to SignalQualityLabRepository — the repository file is imported directly to
    // avoid a circular module dependency (signal-quality-lab depends on this module).
    private signalOutcomeInvalidator?: SignalOutcomeStalenessInvalidator
  ) {
    void this.angelOneMarketDataProvider; // retained DI slot; legacy provider validation disabled (NSE/BSE-only)
    // so that shouldRunMarketDataSync / latestCompletedTradingDateForRegion can
    // resolve NSE holidays without an async call.  Before the cache is warm
    // (first scheduler tick on a cold start), the static fallback list in
    // market-data-foundation.nse-holidays.ts is used automatically.
    registerNseHolidayProvider((year: number) => {
      const entry = this.indiaTradingCalendar.nseTradingHolidayCache.get(year);
      if (!entry || entry.expiresAt <= Date.now()) return null;
      return [...entry.holidays.keys()];
    });
  }

  // India ingestion collaborators (Phase 4a–4c). Each constructed once with `this` as its
  // host; the public methods on this service delegate to them. Byte-identical behaviour.
  private readonly historicalBackfillRunner = new IndiaHistoricalBackfillRunner(this);
  private readonly indiaExchangeIngestion = new IndiaExchangeIngestionService(this);
  private readonly indiaCorporateActions = new IndiaCorporateActionsService(this);
  private readonly indiaOfficialEod = new IndiaOfficialEodService(this);

  // Serving-read collaborators (Phase 5a). Each constructed once with `this` as the
  // MarketDataServingHost; the public read methods on this service delegate to them.
  public readonly cryptoReads: CryptoReadsService = new CryptoReadsService(this);
  private readonly priceReads: PriceReadsService = new PriceReadsService(this);
  private readonly fundamentalsReads: FundamentalsReadsService = new FundamentalsReadsService(this);
  private readonly scanReads: ScanReadsService = new ScanReadsService(this);
  private readonly catalogReads: CatalogReadsService = new CatalogReadsService(this);

  // Universe-readiness collaborators (Phase 5b). Each constructed once with `this` as the
  // MarketDataUniverseReadinessHost; the public read methods + substrate helpers on this service
  // delegate to them. The substrate instance owns the shared universe snapshot cache. Behaviour
  // is byte-identical to the pre-extraction inline implementation.
  private readonly universeReadiness: UniverseReadinessService = new UniverseReadinessService(this);
  private readonly universeSignoffCompute: UniverseSignoffService = new UniverseSignoffService(this);
  private readonly universeReviewPolicy: UniverseReviewPolicyService = new UniverseReviewPolicyService(this);
  private readonly universeHealthReads: UniverseHealthService = new UniverseHealthService(this);
  private readonly universeReviewReads: UniverseReviewService = new UniverseReviewService(this);
  private readonly universeRepairWorkbench: UniverseRepairWorkbenchService = new UniverseRepairWorkbenchService(this);
  private readonly universeInstruments: UniverseInstrumentsService = new UniverseInstrumentsService(this);
  private readonly stockMissingDataColumns: StockMissingDataColumnService = new StockMissingDataColumnService(this);

  // Repair/remediation engine (Phase 5c). Constructed once with `this` as the MarketDataRepairHost;
  // the controller-facing repair methods on this service delegate to it (and to its sub-engines).
  // Behaviour is byte-identical to the pre-extraction inline implementation.
  private readonly repairEngine: RepairService = new RepairService(this);

  // Ingestion-orchestration collaborators (ingestion-extraction phase). Each constructed once with
  // `this` as the MarketDataIngestionHost; the public ingestion methods on this service delegate to
  // them. Behaviour is byte-identical to the pre-extraction inline implementation.
  private readonly catalogIngestion: CatalogIngestionService = new CatalogIngestionService(this);
  private readonly syncGate: SyncGateService = new SyncGateService(this);
  private readonly symbolIngestion: SymbolIngestionService = new SymbolIngestionService(this);
  private readonly catalogSyncEngine: CatalogSyncEngine = new CatalogSyncEngine(this);
  private readonly v1Ingestion: V1IngestionService = new V1IngestionService(this);
  private readonly regionOrchestrator: RegionSyncOrchestrator = new RegionSyncOrchestrator(this);
  private readonly scanSnapshotWriter: ScanSnapshotWriterService = new ScanSnapshotWriterService(this);

  /**
   * Best-effort invalidation of persisted signal_outcomes for instruments whose
   * adjustedClose prices just changed. Never throws — a stale-outcome failure
   * must not fail a price recompute. Returns the number of rows invalidated.
   *
   * When `fromDate` is supplied the window-intersection variant is used:
   * only outcomes whose [signalDate, signalDate+60d] window overlaps
   * [fromDate, ∞) are invalidated. This avoids over-invalidation of
   * historically-distant outcomes that were computed from prices that
   * pre-date the corporate action.
   */
  // Widened private->public for Phase 4c: IndiaCorporateActionsService reaches this
  // shared signal-outcome invalidation hook through the IndiaCorporateActionsHost (the
  // helper and its constructor wiring stay on the service).
  public async invalidateSignalOutcomes(instrumentIds: string[], fromDate?: Date): Promise<number> {
    const ids = [...new Set(instrumentIds.map((id) => String(id || '').trim()).filter(Boolean))];
    if (ids.length === 0) return 0;
    try {
      if (!this.signalOutcomeInvalidator) {
        // Lazy require avoids a static circular import at module load time.
        const { SignalQualityLabRepository } = require('../signal-quality-lab/signal-quality-lab.repository');
        this.signalOutcomeInvalidator = new SignalQualityLabRepository();
      }
      // Prefer the window-intersection variant when an earliest-changed date is available.
      if (fromDate && typeof this.signalOutcomeInvalidator!.markStaleByInstrumentsFromDate === 'function') {
        return await this.signalOutcomeInvalidator!.markStaleByInstrumentsFromDate!(ids, fromDate);
      }
      return await this.signalOutcomeInvalidator!.markStaleByInstrumentIds(ids);
    } catch {
      // best-effort; stale outcomes will be caught by the next maturity sweep / recalculate
      return 0;
    }
  }

  list(options: PaginationOptions) {
    return this.catalogReads.list(options);
  }

  // ── Crypto reads (isolated crypto_* plane) ──────────────────────────────────
  // Public surface so downstream modules consume crypto market data through this
  // service (never the crypto repository directly), preserving module boundaries.
  public readonly cryptoRepository: MarketDataFoundationCryptoRepository = marketDataFoundationCryptoRepository;

  /** List crypto assets from crypto_assets (ranked by market cap). */
  listCryptoAssets(options: { activeOnly?: boolean; limit?: number; offset?: number } = {}) {
    return this.cryptoReads.listCryptoAssets(options);
  }

  /** Fetch a single crypto asset (crypto_assets) by id. */
  getCryptoAssetById(id: string) {
    return this.cryptoReads.getCryptoAssetById(id);
  }

  /** Fetch a single crypto asset (crypto_assets) by canonical symbol (e.g. BTCUSDT). */
  getCryptoAssetBySymbol(symbol: string) {
    return this.cryptoReads.getCryptoAssetBySymbol(symbol);
  }

  /** Ascending crypto price history (crypto_price_ticks) for a symbol. */
  listCryptoPriceHistory(symbol: string, limit?: number) {
    return this.cryptoReads.listCryptoPriceHistory(symbol, limit);
  }

  /** Crypto prices response (same shape as listPricesByInstrumentId; newest-first; delivery N/A). */
  // Phase 5a seam: kept on the service (public via MarketDataServingHost) because PriceReads
  // dispatches its crypto branch back through the host to this owner.
  listCryptoPricesByInstrumentId(instrumentId: string, limit = 250) {
    return this.cryptoReads.listCryptoPricesByInstrumentId(instrumentId, limit);
  }

  providerDataCleanupReport() {
    return this.catalogReads.providerDataCleanupReport();
  }

  executeProviderDataCleanup() {
    return this.repository.executeProviderDataCleanup();
  }

  async listSourceFileImports(input: {
    region?: string;
    source?: string;
    segment?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    sortBy?: string;
    sortDirection?: string;
  } = {}) {
    return this.catalogReads.listSourceFileImports(input);
  }

  async health(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.catalogReads.health(options);
  }

  // ---------------------------------------------------------------------------
  // Market Scan Snapshots — precompute + persist, then serve from snapshot
  // ---------------------------------------------------------------------------

  /**
   * MARKET_SCAN_REFRESH: compute all 6 scan families for the given scope and
   * replace today's snapshot rows (delete-old-for-date + bulk insert).
   * Called once per day by the pipeline after MARKET_DATA sync.
   */
  async refreshMarketScanSnapshots(options: {
    region?: string;
    assetType?: string;
    now?: Date;
  } = {}): Promise<{
    tradingDate: string;
    totalInserted: number;
    scanTypes: string[];
    warnings: string[];
    errors: string[];
  }> {
    return this.scanSnapshotWriter.refreshMarketScanSnapshots(options);
  }

  /** Read the latest snapshot rows for a given scanType+scanRange+scope. Returns null if no snapshot. */
  async marketMovers(options: Pick<PaginationOptions, 'region' | 'assetType'> & { limit?: number; range?: string } = {}): Promise<MarketMoversSummary> {
    return this.scanReads.marketMovers(options);
  }

  async marketMap(options: Pick<PaginationOptions, 'region' | 'assetType'> & { limit?: number; range?: string } = {}): Promise<MarketMapSummary> {
    return this.scanReads.marketMap(options);
  }

  async stockMissingDataDiagnostics(options: Pick<PaginationOptions, 'region' | 'assetType'> & { sampleLimit?: number } = {}): Promise<StockMissingDataDiagnostics> {
    return this.universeInstruments.stockMissingDataDiagnostics(options);
  }

  async repairPriceIdentity(options: MarketDataRepairRequest & { dryRun?: boolean } = {}): Promise<MarketDataPriceIdentityRepairSummary> {
    return this.repairEngine.priceIdentity.repairPriceIdentity(options);
  }
  public async universeHealth(
    options: Pick<PaginationOptions, 'region' | 'assetType'> = {},
    snapshot?: UniverseComputationSnapshot
  ): Promise<MarketDataUniverseHealth> {
    return this.universeHealthReads.universeHealth(options, snapshot);
  }

  /** Crypto plane health: counts + freshness from crypto_* tables (no equity readiness model). */
  // Phase 5a seam: kept on the service (forwards to CryptoReads) because `health` (via the
  // MarketDataServingHost) and `universeHealth` (which STAYS on the service) still call them.
  public async cryptoHealth() {
    return this.cryptoReads.cryptoHealth();
  }

  /** Reduced crypto universe-health: active count + price coverage; reuses trust/signoff helpers. */
  public async cryptoUniverseHealth(): Promise<MarketDataUniverseHealth> {
    return this.cryptoReads.cryptoUniverseHealth();
  }

  async trustedReviewUniverseHealth(options: TrustedReviewUniverseOptions = {}): Promise<TrustedReviewUniverseHealth> {
    return this.universeReviewReads.trustedReviewUniverseHealth(options);
  }

  /**
   * Trader/operator-facing review-readiness read. **PERSISTED-READ by default**: it serves the
   * last computed snapshot from the persisted store and NEVER triggers the heavy live
   * universe-health computation (which scans the full catalog for tens of seconds AND issues a
   * provider-support DB write) on a plain GET. The live compute runs only when `recompute` is
   * set — an explicit operator opt-in (`?recompute=true`) or the data pipeline — and that path
   * also refreshes the persisted snapshot. If nothing has been computed yet for the scope, an
   * honest "pending" summary is returned rather than computing on the read path. This keeps the
   * GET fast and honours the trader-pages-are-persisted-reads-only constraint.
   */
  async reviewReadinessSummary(options: TrustedReviewUniverseOptions = {}): Promise<ReviewReadinessSummary> {
    return this.universeReviewReads.reviewReadinessSummary(options);
  }


  async trustedUniverseRepairWorkbench(options: TrustedReviewUniverseOptions = {}): Promise<TrustedUniverseRepairWorkbench> {
    return this.universeRepairWorkbench.trustedUniverseRepairWorkbench(options);
  }

  async listTrustedReviewUniverseInstruments(
    options: TrustedReviewUniverseOptions & { limit?: number; offset?: number } = {}
  ): Promise<TrustedReviewUniverseInstrument[]> {
    return this.universeReviewReads.listTrustedReviewUniverseInstruments(options);
  }


  public async repairPlan(
    options: Pick<PaginationOptions, 'region' | 'assetType'> = {},
    snapshot?: UniverseComputationSnapshot
  ): Promise<MarketDataRepairPlan> {
    return this.universeHealthReads.repairPlan(options, snapshot);
  }

  async manualMetadataTemplate(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}): Promise<MarketDataManualMetadataTemplate> {
    return this.repairEngine.manualMetadataTemplate(options);
  }
  async repairRun(request: MarketDataRepairRunRequest = {}): Promise<MarketDataRepairRunResponse> {
    return this.repairEngine.repairRun(request);
  }
  async latestRepairRun(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}): Promise<MarketDataRepairRunRecord | null> {
    return this.repairEngine.latestRepairRun(options);
  }
  public async validateProviders(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    return this.providerDisabledRepairSummary(request, 'Provider validation is disabled for NSE/BSE-only market data.');
  }

  async repairCatalogIdentity(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    return this.repairEngine.catalogIdentity.repairCatalogIdentity(request);
  }
  public async repairCatalogIdentityFromRows(
    request: MarketDataRepairRequest,
    catalog: CatalogIdentityRowsSnapshot,
    options: { actionableOnly?: boolean } = {}
  ): Promise<MarketDataRepairSummary> {
    return this.repairEngine.catalogIdentity.repairCatalogIdentityFromRows(request, catalog, options);
  }
  async repairProviderBusinessMetadata(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    return this.repairEngine.businessMetadata.repairProviderBusinessMetadata(request);
  }
  async enrichMetadata(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    return this.repairEngine.metadataEnrichment.enrichMetadata(request);
  }
  public async importManualMetadata(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    return this.repairEngine.metadataEnrichment.importManualMetadata(request);
  }
  public async backfillPrices(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    return this.repairEngine.priceBackfill.backfillPrices(request);
  }
  async startPriceBackfillRun(request: PriceBackfillRunRequest = {}): Promise<PriceBackfillRunStatusResponse> {
    return this.repairEngine.priceBackfillRun.startPriceBackfillRun(request);
  }
  getPriceBackfillRun(runId: string): PriceBackfillRunStatusResponse | null {
    return this.repairEngine.priceBackfillRun.getPriceBackfillRun(runId);
  }
  activePriceBackfillRun(request: Pick<MarketDataRepairRequest, 'region' | 'assetType'> = {}): PriceBackfillRunStatusResponse | null {
    return this.repairEngine.priceBackfillRun.activePriceBackfillRun(request);
  }
  cancelPriceBackfillRun(runId: string): PriceBackfillRunStatusResponse | null {
    return this.repairEngine.priceBackfillRun.cancelPriceBackfillRun(runId);
  }
  get(id: string) {
    return this.catalogReads.get(id);
  }

  // Phase 5a: symbol-normalization cluster moved to the shared instrument-mapper as pure free
  // functions. These thin delegators preserve every existing `this.X` call site (serving reads,
  // ingestion host interfaces, repair, createInstrument) byte-identically.
  baseSymbolFromProviderSymbol(symbol: string): string {
    return baseSymbolFromProviderSymbolMapper(symbol);
  }

  providerSymbolForExchange(sourceSymbol: string, exchange?: string | null): string {
    return providerSymbolForExchangeMapper(sourceSymbol, exchange);
  }

  normalizeCatalogSymbol(row: { symbol?: string | null; sourceSymbol?: string | null; providerSymbol?: string | null; displaySymbol?: string | null; exchange?: string | null }, source?: string) {
    return normalizeCatalogSymbolMapper(row, source);
  }

  async create(data: CreateStockRequest, triggerIngestion = false) {
    return this.catalogIngestion.create(data, triggerIngestion);
  }

  async listInstruments(options: Partial<PaginationOptions> = {}) {
    return this.universeInstruments.listInstruments(options);
  }

  async getInstrument(id: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.universeInstruments.getInstrument(id, options);
  }

  async importCatalog(request: CatalogImportRequest): Promise<CatalogImportSummary> {
    return this.catalogIngestion.importCatalog(request);
  }

  listCatalogSources() {
    return this.catalogReads.listCatalogSources();
  }

  async backfillCatalogMetadata(request: CatalogBackfillRequest = {}): Promise<CatalogBackfillSummary> {
    return this.catalogIngestion.backfillCatalogMetadata(request);
  }

  async getInstrumentsByIds(ids: string[]) {
    return this.universeInstruments.getInstrumentsByIds(ids);
  }

  async getLatestPricesBySymbols(symbols: string[]) {
    return this.priceReads.getLatestPricesBySymbols(symbols);
  }

  async listRecentPriceWindowsByInstrumentIds(
    instrumentIds: string[],
    limit = 500,
    _options: Pick<PaginationOptions, 'region' | 'assetType'> = {},
    endDate?: Date
  ) {
    return this.priceReads.listRecentPriceWindowsByInstrumentIds(instrumentIds, limit, _options, endDate);
  }

  async storedFundamentalsByInstrumentIds(instrumentIds: string[], _options: Pick<PaginationOptions, 'region' | 'assetType'> = {}, asOf?: Date) {
    return this.fundamentalsReads.storedFundamentalsByInstrumentIds(instrumentIds, _options, asOf);
  }

  async createInstrument(data: V1CreateInstrumentRequest) {
    return this.catalogIngestion.createInstrument(data);
  }

  update(id: string, data: UpdateStockRequest) {
    return this.catalogIngestion.update(id, data);
  }

  delete(id: string) {
    return this.catalogIngestion.delete(id);
  }

  toggleActive(id: string) {
    return this.catalogIngestion.toggleActive(id);
  }

  async syncData(id: string) {
    return this.symbolIngestion.syncData(id);
  }

  async searchAssets(query: string, options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {}): Promise<any[]> {
    return this.catalogReads.searchAssets(query, options);
  }

  async yahooSearch(query: string): Promise<any[]> {
    void query;
    throw providerDisabledError('Yahoo Finance search');
  }

  async searchProvider(query: string): Promise<SearchResult[]> {
    void query;
    throw providerDisabledError('external provider search');
  }

  async fetchCoreFundamentals(symbol: string): Promise<CoreFundamentals> {
    void symbol;
    throw providerDisabledError('provider fundamentals fetch');
  }

  async fetchCorporateActions(symbol: string): Promise<CorporateAction[]> {
    void symbol;
    throw providerDisabledError('provider corporate actions fetch');
  }

  listPrices(symbol: string, limit: number, startDate?: Date, endDate?: Date) {
    return this.priceReads.listPrices(symbol, limit, startDate, endDate);
  }

  async listForwardPriceWindowsByInstrumentIds(instrumentIds: string[], startDate: Date, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.priceReads.listForwardPriceWindowsByInstrumentIds(instrumentIds, startDate, options);
  }

  async listPricesByInstrumentId(instrumentId: string, limit = 250, startDate?: Date, endDate?: Date, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.priceReads.listPricesByInstrumentId(instrumentId, limit, startDate, endDate, options);
  }

  /**
   * Returns the latest delivery% snapshot for a stock identified by its internal symbol.
   * Passes through directly to the repository (persisted-read, null-safe).
   * Signal generation and other consumers use this for evidence annotation.
   */
  getRecentDeliveryBySymbol(
    symbol: string,
    limit = 5,
    endDate?: Date,
  ) {
    return this.priceReads.getRecentDeliveryBySymbol(symbol, limit, endDate);
  }

  async latestPriceByInstrumentId(instrumentId: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.priceReads.latestPriceByInstrumentId(instrumentId, options);
  }

  async fundamentalsByInstrumentId(instrumentId: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.fundamentalsReads.fundamentalsByInstrumentId(instrumentId, options);
  }

  async storedFundamentalsByInstrumentId(instrumentId: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.fundamentalsReads.storedFundamentalsByInstrumentId(instrumentId, options);
  }

  async importManualVerifiedFundamental(input: {
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
    return this.repairEngine.fundamentalsImport.importManualVerifiedFundamental(input);
  }
  async importBulkManualVerifiedFundamentals(input: {
    fileName?: string;
    csvText: string;
    region?: string;
    assetType?: string;
    sourceUrl?: string | null;
    evidenceDate?: Date | string | null;
  }) {
    return this.repairEngine.fundamentalsImport.importBulkManualVerifiedFundamentals(input);
  }
  async importNseXbrlFundamentalsForUniverse(options: {
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
    return this.repairEngine.fundamentalsImport.importNseXbrlFundamentalsForUniverse(options);
  }
  async corporateActionsByInstrumentId(instrumentId: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.fundamentalsReads.corporateActionsByInstrumentId(instrumentId, options);
  }

  async storedCorporateActionsByInstrumentId(instrumentId: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.fundamentalsReads.storedCorporateActionsByInstrumentId(instrumentId, options);
  }

  async fetchHistorical(symbol: string, startDate?: Date, endDate?: Date, options: { region?: string; assetType?: string; exchange?: string | null } = {}): Promise<HistoricalPrice[]> {
    void symbol;
    void startDate;
    void endDate;
    void options;
    throw providerDisabledError('provider historical candle fetch');
  }

  async storeHistorical(prices: HistoricalPrice[]): Promise<SyncSummary> {
    return this.symbolIngestion.storeHistorical(prices);
  }

  async storeHistoricalBulk(
    prices: HistoricalPrice[],
    regionInfoBySymbol: Map<string, PriceRegionInfo> = new Map(),
    options: HistoricalStoreOptions = {}
  ): Promise<HistoricalBulkStoreResult> {
    return this.symbolIngestion.storeHistoricalBulk(prices, regionInfoBySymbol, options);
  }

  async latestStoredCandleInfo(region: string, assetType = 'STOCK', now = new Date()) {
    return this.priceReads.latestStoredCandleInfo(region, assetType, now);
  }

  async listDailyRefreshEligibleInstrumentIds(input: {
    region: string;
    assetType: string;
    dataThroughDate: string;
    limit?: number;
  }): Promise<DailyRefreshEligibilityResult> {
    return this.v1Ingestion.listDailyRefreshEligibleInstrumentIds(input);
  }

  async shouldRunScheduledSync(region: string, assetType = 'STOCK', now = new Date(), options: {
    syncDuringMarketHours?: boolean;
    postCloseSyncWindowMinutes?: number;
    finalizationGraceMinutes?: number;
    skipWeekends?: boolean;
  } = {}) {
    return this.syncGate.shouldRunScheduledSync(region, assetType, now, options);
  }

  // ── India NSE/BSE daily price importers (delegated to IndiaExchangeIngestionService) ──
  // Phase 4b extraction: the importer implementations live in
  // market-data-foundation.india-exchange-ingestion*.ts. This service stays the
  // IndiaExchangeIngestionHost and keeps a thin delegator for each public importer.
  // Signatures are byte-compatible with the pre-extraction surface; the delegators keep
  // `jest.spyOn(service, ...)` seams intact because the ingestion class reaches these
  // importers back through the host.
  importNseCmUdiffDaily(input: {
    tradingDate: Date | string;
    csvText?: string;
    fileName?: string;
    fileUrl?: string | null;
    force?: boolean;
    skipLatestPriceUpdate?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    return this.indiaExchangeIngestion.importNseCmUdiffDaily(input);
  }

  importNseCmOfficialDaily(input: {
    tradingDate: Date | string;
    force?: boolean;
    skipLatestPriceUpdate?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    return this.indiaExchangeIngestion.importNseCmOfficialDaily(input);
  }

  importBseCmBackupDaily(input: {
    tradingDate: Date | string;
    csvText?: string;
    fileName?: string;
    fileUrl?: string | null;
    force?: boolean;
    skipLatestPriceUpdate?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    return this.indiaExchangeIngestion.importBseCmBackupDaily(input);
  }

  importNseIndexOfficialDaily(input: {
    tradingDate: Date | string;
    force?: boolean;
    skipLatestPriceUpdate?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    return this.indiaExchangeIngestion.importNseIndexOfficialDaily(input);
  }

  runNseIndexAndDeliveryCatchUp(input: { maxLookbackDays?: number } = {}): Promise<{
    index: Array<{ tradingDate: string; status: string }>;
    delivery: Array<{ tradingDate: string; status: string }>;
  }> {
    return this.indiaExchangeIngestion.runNseIndexAndDeliveryCatchUp(input);
  }

  importNseIndexEodDaily(input: {
    tradingDate: Date | string;
    csvText?: string;
    fileName?: string;
    fileUrl?: string | null;
    force?: boolean;
    segment?: 'INDEX' | 'SECTOR_INDEX';
    skipLatestPriceUpdate?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    return this.indiaExchangeIngestion.importNseIndexEodDaily(input);
  }

  importNseFoUdiffDaily(input: {
    tradingDate: Date | string;
    csvText?: string;
    fileName?: string;
    fileUrl?: string | null;
    force?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    return this.indiaExchangeIngestion.importNseFoUdiffDaily(input);
  }

  importNseDeliveryDaily(input: {
    tradingDate: Date | string;
    csvText?: string;
    fileName?: string;
    fileUrl?: string | null;
    force?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    return this.indiaExchangeIngestion.importNseDeliveryDaily(input);
  }

  refreshNseDeliveryDaily(input: {
    tradingDate?: Date | string;
    force?: boolean;
  } = {}): Promise<ExchangeDailyImportSummary> {
    return this.indiaExchangeIngestion.refreshNseDeliveryDaily(input);
  }

  importNseDeliveryOfficialDaily(input: {
    tradingDate: Date | string;
    force?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    return this.indiaExchangeIngestion.importNseDeliveryOfficialDaily(input);
  }

  // ── India exchange historical-backfill (delegated to IndiaHistoricalBackfillRunner) ──
  // Phase 4a extraction: the runner implementation lives in
  // market-data-foundation.india-historical-backfill*.ts. This service stays the
  // IndiaHistoricalBackfillHost and keeps a thin delegator for each controller-facing
  // public method. Signatures are byte-compatible with the pre-extraction surface.
  runNseDeliveryHistoricalBackfill(input: NseDeliveryHistoricalBackfillInput = {}): Promise<NseDeliveryHistoricalBackfillResponse> {
    return this.historicalBackfillRunner.runNseDeliveryHistoricalBackfill(input);
  }

  runExchangeHistoricalBackfill(input: ExchangeHistoricalBackfillRunInput): Promise<ExchangeHistoricalBackfillRunResponse> {
    return this.historicalBackfillRunner.runExchangeHistoricalBackfill(input);
  }

  startExchangeHistoricalBackfillRun(input: ExchangeHistoricalBackfillRunInput): Promise<ExchangeHistoricalBackfillRunResponse> {
    return this.historicalBackfillRunner.startExchangeHistoricalBackfillRun(input);
  }

  getExchangeHistoricalBackfillRun(runId: string): Promise<ExchangeHistoricalBackfillRunResponse> {
    return this.historicalBackfillRunner.getExchangeHistoricalBackfillRun(runId);
  }

  resumeExchangeHistoricalBackfillRun(runId: string): Promise<ExchangeHistoricalBackfillRunResponse> {
    return this.historicalBackfillRunner.resumeExchangeHistoricalBackfillRun(runId);
  }

  retryFailedExchangeHistoricalBackfillRun(runId: string, options: { maxRetries?: number } = {}): Promise<ExchangeHistoricalBackfillRunResponse> {
    return this.historicalBackfillRunner.retryFailedExchangeHistoricalBackfillRun(runId, options);
  }

  cancelExchangeHistoricalBackfillRun(runId: string): Promise<ExchangeHistoricalBackfillRunResponse> {
    return this.historicalBackfillRunner.cancelExchangeHistoricalBackfillRun(runId);
  }

  // Internal historical-backfill worker entrypoints kept as thin service-level seams so
  // existing tests (and any in-process callers) that reached these as `this.X` before the
  // Phase 4a extraction keep working. They forward to the runner; behaviour is unchanged.
  protected processExchangeHistoricalBackfillRun(runId: string): Promise<void> {
    return (this.historicalBackfillRunner as any).processExchangeHistoricalBackfillRun(runId);
  }

  protected completeHistoricalBackfillJob(stage: any, input: {
    status: string;
    jobStatus: ExchangeHistoricalBackfillJobStatus;
    rowsRead: number;
    rowsParsed: number;
    rowsInserted: number;
    rowsUpdated: number;
    rowsNoOp: number;
    rowsSkipped: number;
    bseFills: number;
    sourceFileImportId: string | null;
    warnings: string[];
    errors: string[];
    startedAt: Date;
    leaseOwner: string;
  }): Promise<void> {
    return (this.historicalBackfillRunner as any).completeHistoricalBackfillJob(stage, input);
  }

  // IndiaHistoricalBackfillHost member: forwards the runner's background worker kick-off
  // through the service boundary so it stays interceptable (see host interface comment).
  startHistoricalBackfillWorkers(runId: string): void {
    (this.historicalBackfillRunner as any).startHistoricalBackfillWorkers(runId);
  }

  public marketDataDb(): any {
    const db = (this.repository as any).prisma;
    if (!db?.pipelineRun || !db?.pipelineStageRun) {
      throw new Error('Historical exchange backfill requires Prisma pipeline ledger access.');
    }
    return db;
  }

  public objectMetadata(value: unknown): Record<string, any> {
    return objectMetadataUtil(value);
  }

  public stringArray(value: unknown): string[] {
    return stringArrayUtil(value);
  }

  public errorMessage(error: unknown, fallback: string): string {
    return errorMessageUtil(error, fallback);
  }

  public transientDatabaseMessage(error: unknown): string {
    return transientDatabaseMessageUtil(error);
  }


  public iso(value: unknown): string | null {
    return isoUtil(value);
  }

  public clampHistoricalBackfillWorkers(value: unknown): number {
    return clampHistoricalBackfillWorkersUtil(value);
  }

  public clampHistoricalBackfillMaxRetries(value: unknown): number {
    return clampHistoricalBackfillMaxRetriesUtil(value);
  }

  public clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    return clampNumberUtil(value, min, max, fallback);
  }

  public currentMemoryUtilizationPercent(): number {
    return currentMemoryUtilizationPercentUtil();
  }

  public sleep(ms: number): Promise<void> {
    return sleepUtil(ms);
  }

  public async withTransientDatabaseRetry<T>(operation: () => Promise<T>, label: string): Promise<T> {
    return withTransientDatabaseRetryUtil(operation, label);
  }

  public isTransientDatabaseError(error: unknown): boolean {
    return isTransientDatabaseErrorUtil(error);
  }

  public isHistoricalBackfillNotAvailable(summary: ExchangeDailyImportSummary): boolean {
    return isHistoricalBackfillNotAvailableUtil(summary);
  }

  public isNotAvailableErrorMessage(message: string): boolean {
    return isNotAvailableErrorMessageUtil(message);
  }

  // Delegates to IndiaTradingCalendar (Phase 4c). This stays the service-level seam so the
  // IndiaHistoricalBackfillHost member and `jest.spyOn(service, 'nseCmTradingHolidayDatesForRange')`
  // keep intercepting at the service boundary exactly as before the extraction.
  // nseCmTradingHolidayDatesForYear / fetchOfficialNseTradingHolidayDatesForYear /
  // parseNseHolidayDate moved into IndiaTradingCalendar (only this range method had
  // external callers).
  public async nseCmTradingHolidayDatesForRange(startDate: Date, endDate: Date): Promise<Map<string, string>> {
    return this.indiaTradingCalendar.nseCmTradingHolidayDatesForRange(startDate, endDate);
  }

  // Forwarding seam (Phase 4c): preserves the existing test that reaches
  // `(service as any).fetchOfficialNseTradingHolidayDatesForYear(...)` directly. The moved
  // body still downloads through the service's downloadOfficialExchangeJson (host-routed),
  // so the test's spy on that method keeps intercepting. Public (not private) so the
  // unused-private check doesn't trip — the only caller is the as-any test.
  public async fetchOfficialNseTradingHolidayDatesForYear(year: number, sourceUrl?: string): Promise<Map<string, string>> {
    return this.indiaTradingCalendar.fetchOfficialNseTradingHolidayDatesForYear(year, sourceUrl);
  }

  async syncScheduledRegion(region: string, options: {
    assetType?: string;
    batchSize?: number;
    lookbackTradingDays?: number;
    now?: Date;
    syncDuringMarketHours?: boolean;
    postCloseSyncWindowMinutes?: number;
    finalizationGraceMinutes?: number;
    skipWeekends?: boolean;
  } = {}): Promise<ScheduledRegionSyncSummary> {
    return this.regionOrchestrator.syncScheduledRegion(region, options);
  }

  // Delegates to IndiaOfficialEodService (Phase 4c). Kept as a byte-identical service
  // delegator so the SHARED syncScheduledRegion / applyOfficialEodBulkForCatalogRun callers
  // are unaffected. canUseOfficialNseEodForTask / nseOfficialArchiveAppliesToDate moved with
  // it; officialNseEodBulkEnabled moved too (delegator below preserves the catalog-run caller).
  public async tryOfficialNseEodBulkLatestCandle(input: {
    region: string;
    assetType: string;
    targetTradingDate: string;
    tasks: StockSyncTask[];
  }): Promise<OfficialNseEodBulkSyncResult> {
    return this.indiaOfficialEod.tryOfficialNseEodBulkLatestCandle(input);
  }

  // Delegates to IndiaOfficialEodService (Phase 4c). Kept as a service delegator so the
  // Phase-4b IndiaExchangeIngestionHost member (loadFirstAvailableNseOfficialEodCsv) stays
  // satisfied — the ingestion importers reach it as `this.host.loadFirstAvailableNseOfficialEodCsv`.
  public async loadFirstAvailableNseOfficialEodCsv(tradingDate: Date): Promise<{
    archive: NseArchiveUrl;
    parsed: ReturnType<typeof parseIndianExchangeEodCsv>;
    csvText: string;
    warnings: string[];
  }> {
    return this.indiaOfficialEod.loadFirstAvailableNseOfficialEodCsv(tradingDate);
  }

  // Delegates to IndiaOfficialEodService (Phase 4c). Widened private->public for the
  // ingestion-extraction phase: CatalogSyncEngine + the region orchestrator reach this gate through
  // the MarketDataIngestionHost (it stays a thin delegator on the service).
  public officialNseEodBulkEnabled(): boolean {
    return this.indiaOfficialEod.officialNseEodBulkEnabled();
  }

  // Widened private->public for Phase 4c: IndiaOfficialEodService reaches this sync-lane
  // region helper through the IndiaOfficialEodHost (it stays on the service).
  public taskPriceRegionInfo(defaultRegion: string, task: StockSyncTask): PriceRegionInfo {
    return this.syncGate.taskPriceRegionInfo(defaultRegion, task);
  }


  // parsedSymbolsFromPrices moved into IndiaExchangeIngestionService (Phase 4b).

  // Widened private->public for the ingestion-extraction phase: RegionSyncOrchestrator reaches these
  // sync-lane task helpers through the MarketDataIngestionHost (they delegate to SyncGateService).
  public instrumentIdsForImportedSymbols(tasks: StockSyncTask[], symbols: string[]): string[] {
    return this.syncGate.instrumentIdsForImportedSymbols(tasks, symbols);
  }

  public importedSymbolsForInstrumentIds(tasks: StockSyncTask[], instrumentIds: string[]): string[] {
    return this.syncGate.importedSymbolsForInstrumentIds(tasks, instrumentIds);
  }

  // Widened private->public for Phase 4c: IndiaOfficialEodService reaches this sync-lane
  // timestamp helper through the IndiaOfficialEodHost (it stays on the service).
  public async updateStockLoadTimestampsForSymbols(symbols: string[]): Promise<void> {
    return this.syncGate.updateStockLoadTimestampsForSymbols(symbols);
  }

  // officialNseEodBulkEnabled / canUseOfficialNseEodForTask moved into
  // IndiaOfficialEodService (Phase 4c). The service keeps a delegator for
  // officialNseEodBulkEnabled (above) since applyOfficialEodBulkForCatalogRun still calls
  // it; canUseOfficialNseEodForTask had no caller outside the moved bulk method.
  // Widened private->public for Phase 4c: IndiaOfficialEodService reaches these sync-lane
  // exchange/symbol leaf helpers through the IndiaOfficialEodHost (they stay on the service).
  public isNseLikeExchange(exchange: string): boolean {
    return this.syncGate.isNseLikeExchange(exchange);
  }

  public hasExplicitExchangeSuffix(symbol: string | null | undefined, suffix: '.NS' | '.BO'): boolean {
    return this.syncGate.hasExplicitExchangeSuffix(symbol, suffix);
  }

  public taskSymbolAliases(task: StockSyncTask): string[] {
    return this.syncGate.taskSymbolAliases(task);
  }

  public symbolAliasCandidates(symbol: string | null | undefined): string[] {
    return this.syncGate.symbolAliasCandidates(symbol);
  }

  public async ingestSymbol(symbol: string, startDate?: Date, endDate?: Date, fullReload = false, options: {
    force?: boolean;
    region?: string;
    assetType?: string;
    skipFreshnessGate?: boolean;
    preserveProviderSupportOnZeroRows?: boolean;
  } = {}): Promise<SyncSummary> {
    return this.symbolIngestion.ingestSymbol(symbol, startDate, endDate, fullReload, options);
  }


  // Widened private->public for Phase 4b (IndiaExchangeIngestionHost collaborator).
  public async downloadOfficialExchangeText(url: string): Promise<string> {
    return downloadOfficialExchangeTextUtil(url);
  }

  // Widened private->public for Phase 4c: IndiaTradingCalendar reaches this shared
  // official-JSON downloader through the IndiaTradingCalendarHost (it stays on the service).
  public async downloadOfficialExchangeJson(url: string): Promise<any> {
    return downloadOfficialExchangeJsonUtil(url);
  }



  // Widened private->public for Phase 4b (IndiaExchangeIngestionHost collaborator).
  public startOfUtcDay(date: Date): Date {
    return startOfUtcDayUtil(date);
  }

  public normalizeExchangeTradingDate(value: Date | string): Date {
    return normalizeExchangeTradingDateUtil(value);
  }

  public latestCompletedExchangeTradingDateOrThrow(region: string): Date {
    return latestCompletedExchangeTradingDateOrThrowUtil(region);
  }

  public exchangeDateKey(date: Date): string {
    return exchangeDateKeyUtil(date);
  }

  public addUtcDays(date: Date, days: number): Date {
    return addUtcDaysUtil(date, days);
  }

  public exchangeBackfillDates(startDate: Date, endDate: Date): Date[] {
    return exchangeBackfillDatesUtil(startDate, endDate);
  }

  public isWeekdayTradingCandidate(date: Date): boolean {
    return isWeekdayTradingCandidateUtil(date);
  }

  async syncV1(request: V1IngestionRequest): Promise<V1SyncResult> {
    return this.v1Ingestion.syncV1(request);
  }

  async ingestSymbols(symbols: string[], startDate?: Date, endDate?: Date): Promise<void> {
    return this.symbolIngestion.ingestSymbols(symbols, startDate, endDate);
  }

  // ── Catalog-sync run engine (ingestion-extraction phase). The run engine + its static run
  //    registries live in CatalogSyncEngine/CatalogSyncEngineBase; the service keeps thin
  //    byte-identical delegators for the public surface, the (service as any).processCatalogSyncRun
  //    test seam, the repair-host seams (clampCatalogSyncNumber / isCatalogSyncTerminal), and the
  //    stale-task helpers the region orchestrator still reaches via this.X. ──────────────────────
  async startCatalogSyncRun(request: CatalogSyncRunRequest = {}): Promise<CatalogSyncRunStatusResponse> {
    return this.catalogSyncEngine.startCatalogSyncRun(request);
  }

  getCatalogSyncRun(runId: string): CatalogSyncRunStatusResponse | null {
    return this.catalogSyncEngine.getCatalogSyncRun(runId);
  }

  cancelCatalogSyncRun(runId: string): CatalogSyncRunStatusResponse | null {
    return this.catalogSyncEngine.cancelCatalogSyncRun(runId);
  }

  // Kept as a service method (protected to satisfy noUnusedLocals) so the
  // (service as any).processCatalogSyncRun(runId) test seam routes through the same engine instance.
  protected processCatalogSyncRun(runId: string): Promise<void> {
    return this.catalogSyncEngine.processCatalogSyncRun(runId);
  }

  public clampCatalogSyncNumber(
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
    field: string,
    warnings: string[]
  ): number {
    return this.catalogSyncEngine.clampCatalogSyncNumber(value, fallback, min, max, field, warnings);
  }

  public isCatalogSyncTerminal(status: CatalogSyncRunStatus): boolean {
    return this.catalogSyncEngine.isCatalogSyncTerminal(status);
  }

  // Widened private->public for the ingestion-extraction phase: RegionSyncOrchestrator reaches these
  // stale-task helpers through the MarketDataIngestionHost (they delegate to CatalogSyncEngine).
  public countStaleCatalogSyncTasks(
    options: Pick<PaginationOptions, 'region' | 'assetType'>,
    targetTradingDate: string
  ): Promise<number> {
    return this.catalogSyncEngine.countStaleCatalogSyncTasks(options, targetTradingDate);
  }

  public listStaleCatalogSyncTasks(
    options: Pick<PaginationOptions, 'region' | 'assetType'>,
    targetTradingDate: string,
    batchSize?: number,
    excludeIds: string[] = []
  ): Promise<StockSyncTask[]> {
    return this.catalogSyncEngine.listStaleCatalogSyncTasks(options, targetTradingDate, batchSize, excludeIds);
  }

  async syncAll(
    workerCount: number = 4,
    workerConcurrency: number = 4,
    delayBetweenBatchesMs: number = 3000,
    options: Pick<PaginationOptions, 'region' | 'assetType'> & { force?: boolean; fullReload?: boolean } = {}
  ) {
    return this.v1Ingestion.syncAll(workerCount, workerConcurrency, delayBetweenBatchesMs, options);
  }

  async syncFxRates(pairs = ['USD/EUR', 'USD/GBP', 'USD/INR', 'EUR/GBP']) {
    return this.v1Ingestion.syncFxRates(pairs);
  }

  async listFxRates() {
    return this.catalogReads.listFxRates();
  }

  async getFxRate(pair: string) {
    return this.catalogReads.getFxRate(pair);
  }

  disconnect() {
    return this.repository.prisma.$disconnect();
  }

  public universeReadinessAndStatsForStocks(
    stocks: any[],
    options: Pick<PaginationOptions, 'region' | 'assetType'> & { now?: Date } = {}
  ): Promise<{ readinessBySymbol: Map<string, InstrumentUniverseReadiness>; statsBySymbol: Map<string, any> }> {
    return this.universeReadiness.universeReadinessAndStatsForStocks(stocks, options);
  }

  public trustedBaselineByStockId(
    stocks: any[],
    readinessBySymbol: Map<string, InstrumentUniverseReadiness>,
    statsBySymbol: Map<string, any>,
    options: Pick<PaginationOptions, 'region' | 'assetType'> = {}
  ): Promise<Map<string, TrustedBaselineSnapshot>> {
    return this.universeReadiness.trustedBaselineByStockId(stocks, readinessBySymbol, statsBySymbol, options);
  }


  public emptyUniverseCounts(): MarketDataUniverseHealth['counts'] {
    return this.universeSignoffCompute.emptyUniverseCounts();
  }

  public emptyTrustedReviewExcludedCounts() {
    return this.universeReviewPolicy.emptyTrustedReviewExcludedCounts();
  }

  public emptyTrustedReviewContextGapCounts() {
    return this.universeReviewPolicy.emptyTrustedReviewContextGapCounts();
  }

  public trustedReviewDatePolicy(region: string, now: Date) {
    return this.universeReviewPolicy.trustedReviewDatePolicy(region, now);
  }

  public reviewDataThroughDatePolicy(
    scope: { region: string; assetType: string },
    stocks: any[],
    statsBySymbol: Map<string, any>,
    latestCompletedDataThroughDate: string | null
  ) {
    return this.universeReviewPolicy.reviewDataThroughDatePolicy(scope, stocks, statsBySymbol, latestCompletedDataThroughDate);
  }


  public trustedReviewSupportEvidence(stock: any, stats: any, providerStatus: string) {
    return this.universeReviewPolicy.trustedReviewSupportEvidence(stock, stats, providerStatus);
  }


  public trustedReviewContextGaps(stock: any): string[] {
    return this.universeReviewPolicy.trustedReviewContextGaps(stock);
  }

  public reviewReadinessBlockers(
    scope: { region: string; assetType: string },
    health: MarketDataUniverseHealth,
    reviewUniverse: TrustedReviewUniverseHealth,
    repairPlan: MarketDataRepairPlan
  ): ReviewReadinessBlocker[] {
    return this.universeReviewPolicy.reviewReadinessBlockers(scope, health, reviewUniverse, repairPlan);
  }

  public reviewReadinessNextAction(blockers: ReviewReadinessBlocker[]): ReviewReadinessNextAction | null {
    return this.universeReviewPolicy.reviewReadinessNextAction(blockers);
  }

  public reviewReadinessUserDecision(
    mode: TrustedReviewUniverseMode,
    trustStatus: UniverseTrustStatus,
    blockers: ReviewReadinessBlocker[],
    nextAction: ReviewReadinessNextAction | null
  ): ReviewReadinessSummary['userDecision'] {
    return this.universeReviewPolicy.reviewReadinessUserDecision(mode, trustStatus, blockers, nextAction);
  }

  public stockMissingDataColumnConfigs(scope: { region: string; assetType: string }): StockMissingDataColumnConfig[] {
    return this.stockMissingDataColumns.stockMissingDataColumnConfigs(scope);
  }

  public stockColumnMissingDataDiagnostic(
    config: StockMissingDataColumnConfig,
    stocks: any[],
    priceStatsBySymbol: Map<string, any>,
    sampleLimit: number
  ): StockColumnMissingDataDiagnostic {
    return this.stockMissingDataColumns.stockColumnMissingDataDiagnostic(config, stocks, priceStatsBySymbol, sampleLimit);
  }


  public stockMissingDataSample(
    stock: any,
    details: {
      issue: StockMissingDataIssueKind;
      reason: string;
      column?: string;
      value?: unknown;
      expected?: string | null;
      priceHistoryBars?: number;
      alternateSymbol?: string | null;
      alternatePriceHistoryBars?: number;
    }
  ): StockMissingDataSample {
    return this.stockMissingDataColumns.stockMissingDataSample(stock, details);
  }


  // Widened private->public for Phase 4c: IndiaOfficialEodService reaches this string
  // helper through the IndiaOfficialEodHost (it stays on the service).
  public trimmedUpper(value: unknown): string {
    return trimmedUpperUtil(value);
  }


  public priceBarsForSymbol(priceStatsBySymbol: Map<string, any>, symbol: unknown): number {
    if (typeof symbol !== 'string' || !symbol.trim()) return 0;
    return Number(priceStatsBySymbol.get(symbol)?.priceHistoryBars || 0);
  }

  public priceStatsForStock(priceStatsBySymbol: Map<string, any>, stock: any): any | null {
    const candidates = [stock?.symbol, stock?.sourceSymbol, stock?.providerSymbol, stock?.displaySymbol]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    for (const value of candidates) {
      const direct = priceStatsBySymbol.get(value);
      if (direct) return direct;
      const base = this.baseSymbolFromProviderSymbol(value);
      const baseStats = priceStatsBySymbol.get(base);
      if (baseStats) return baseStats;
    }
    return null;
  }

  public expectedProviderSuffixForStock(stock: any): '.NS' | '.BO' | null {
    const exchange = String(stock.exchange || '').trim().toUpperCase();
    if (exchange === 'NSE') return '.NS';
    if (exchange === 'BSE') return '.BO';
    return null;
  }

  public isDerivativeLikeInstrument(stock: any): boolean {
    return this.universeReadiness.isDerivativeLikeInstrument(stock);
  }


  public numericOrNull(value: unknown): number | null {
    return this.universeReadiness.numericOrNull(value);
  }

  public providerValidationWindow(scope: { region: string; assetType: string }, now = new Date()) {
    return this.universeReadiness.providerValidationWindow(scope, now);
  }

  public requiredHistoryDiagnostics(stock: any, validationWindow: ReturnType<MarketDataFoundationService['providerValidationWindow']>, storedStats?: any) {
    const listingDate = stock.ipoDate ? new Date(stock.ipoDate).toISOString().slice(0, 10) : null;
    const requiredHistoryStartDate = listingDate && listingDate > validationWindow.defaultRequiredHistoryStartDateIso
      ? listingDate
      : validationWindow.defaultRequiredHistoryStartDateIso;
    const storedHistoryStartDate = storedStats?.firstPriceDate ?? null;
    const storedHistoryEndDate = storedStats?.latestPriceDate ?? null;
    const storedHistoryBars = Number(storedStats?.priceHistoryBars || 0);
    const requiredHistoryMinimumBars = this.requiredHistoryMinimumBars(requiredHistoryStartDate, validationWindow.latestCompletedEodDate);
    const storedHistoryCoveragePercent = requiredHistoryMinimumBars > 0
      ? Number(Math.min((storedHistoryBars / requiredHistoryMinimumBars) * 100, 100).toFixed(1))
      : 100;
    const requiredHistoryComplete = Boolean(
      storedHistoryStartDate
      && storedHistoryEndDate
      && this.storedHistoryStartCoversRequiredWindow(storedHistoryStartDate, requiredHistoryStartDate)
      && (!validationWindow.latestCompletedEodDate || storedHistoryEndDate >= validationWindow.latestCompletedEodDate)
      && storedHistoryBars >= requiredHistoryMinimumBars
    );
    return {
      requiredHistoryStartDate,
      listingDate,
      listingDateMissing: !listingDate,
      latestCompletedEodDate: validationWindow.latestCompletedEodDate,
      storedHistoryStartDate,
      storedHistoryEndDate,
      storedHistoryBars,
      requiredHistoryMinimumBars,
      storedHistoryCoveragePercent,
      requiredHistoryComplete,
    };
  }

  private requiredHistoryMinimumBars(requiredStartDate: string, latestCompletedEodDate: string | null): number {
    if (!latestCompletedEodDate) return 1;
    const start = new Date(`${requiredStartDate}T00:00:00.000Z`);
    const end = new Date(`${latestCompletedEodDate}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 1;
    const calendarDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const expectedTradingDays = Math.floor((calendarDays / 365.25) * 252);
    return Math.max(1, Math.floor(expectedTradingDays * 0.9));
  }

  private storedHistoryStartCoversRequiredWindow(storedHistoryStartDate: string, requiredHistoryStartDate: string): boolean {
    if (storedHistoryStartDate <= requiredHistoryStartDate) return true;
    const stored = new Date(`${storedHistoryStartDate}T00:00:00.000Z`);
    const required = new Date(`${requiredHistoryStartDate}T00:00:00.000Z`);
    if (Number.isNaN(stored.getTime()) || Number.isNaN(required.getTime())) return false;
    const deltaDays = Math.floor((stored.getTime() - required.getTime()) / 86_400_000);
    return deltaDays <= 7;
  }

  public async assignProviderValidationQueueCounts(
    counts: MarketDataUniverseHealth['counts'],
    scope: { region: string; assetType: string },
    snapshot?: UniverseComputationSnapshot | null
  ) {
    if (snapshot?.repairStatesByStockId) {
      const snapshotCounts = this.repairPlanCountsFromSnapshot(snapshot);
      counts.providerRetryValidationNeeded = snapshotCounts.providerRetryValidationNeeded(counts.providerValidationFailed || 0);
      counts.providerRetryBlocked = snapshotCounts.providerRetryBlocked;
      counts.providerManualRepairRequired = snapshotCounts.providerManualRepairRequired;
      counts.nextProviderRetryAtMin = snapshotCounts.nextProviderRetryAtMin;
      return;
    }
    const repositoryAny = this.repository as any;
    if (typeof repositoryAny.countProviderValidationRepairStates !== 'function') return;
    const [retryEligible, retryBlocked, manualRequired, nextRetryAt] = await Promise.all([
      repositoryAny.countProviderValidationRepairStates({ ...scope, status: 'eligible' }),
      repositoryAny.countProviderValidationRepairStates({ ...scope, status: 'blocked' }),
      repositoryAny.countProviderValidationRepairStates({ ...scope, status: 'manual' }),
      typeof repositoryAny.nextProviderValidationRetryAt === 'function'
        ? repositoryAny.nextProviderValidationRetryAt(scope)
        : Promise.resolve(null),
    ]);
    const knownStateTotal = retryEligible + retryBlocked + manualRequired;
    const retryWithoutState = Math.max((counts.providerValidationFailed || 0) - knownStateTotal, 0);
    counts.providerRetryValidationNeeded = retryEligible + retryWithoutState;
    counts.providerRetryBlocked = retryBlocked;
    counts.providerManualRepairRequired = manualRequired;
    counts.nextProviderRetryAtMin = nextRetryAt ? nextRetryAt.toISOString() : null;
  }


  public latestDateFromReadiness(readinessBySymbol: Map<string, InstrumentUniverseReadiness>): string | null {
    return this.universeSignoffCompute.latestDateFromReadiness(readinessBySymbol);
  }

  public percent(value: number, denominator: number): number {
    return this.universeSignoffCompute.percent(value, denominator);
  }


  public universeSignoffFromHealth(health: Omit<MarketDataUniverseHealth, 'universeSignoff'>): MarketDataUniverseSignoff {
    return this.universeSignoffCompute.universeSignoffFromHealth(health);
  }

  public universeSignoffFromRepairPlan(
    plan: Parameters<UniverseSignoffService['universeSignoffFromRepairPlan']>[0],
    evidence: Parameters<UniverseSignoffService['universeSignoffFromRepairPlan']>[1]
  ): MarketDataUniverseSignoff {
    return this.universeSignoffCompute.universeSignoffFromRepairPlan(plan, evidence);
  }


  public topUniverseBlockers(blockerCounts: Map<string, number>): MarketDataUniverseHealth['topBlockers'] {
    return this.universeSignoffCompute.topUniverseBlockers(blockerCounts);
  }

  public universeTrustStatus(
    counts: MarketDataUniverseHealth['counts'],
    coverage: MarketDataUniverseHealth['coverage']
  ): MarketDataUniverseHealth['trustStatus'] {
    return this.universeSignoffCompute.universeTrustStatus(counts, coverage);
  }

  public universeTrustReasons(
    counts: MarketDataUniverseHealth['counts'],
    coverage: MarketDataUniverseHealth['coverage']
  ): string[] {
    return this.universeSignoffCompute.universeTrustReasons(counts, coverage);
  }

  public normalizeRepairRunActions(actions?: MarketDataRepairRunAction[], mode?: MarketDataRepairRunRequest['mode'], csvText?: string): MarketDataRepairRunAction[] {
    return this.repairEngine.runEngine.normalizeRepairRunActions(actions, mode, csvText);
  }
  public onlyManualMetadataRemains(plan: MarketDataRepairPlan): boolean {
    return this.repairEngine.runEngine.onlyManualMetadataRemains(plan);
  }
  public repairRunActionLabel(action: MarketDataRepairRunAction): string {
    return this.repairEngine.runEngine.repairRunActionLabel(action);
  }
  public repairRunActionCount(action: MarketDataRepairRunAction, plan: MarketDataRepairPlan): number {
    return this.repairEngine.runEngine.repairRunActionCount(action, plan);
  }
  public createRepairRunActionResult(
    action: MarketDataRepairRunAction,
    plan: MarketDataRepairPlan,
    batchSize: number,
    maxBatchesPerAction: number,
    dryRun: boolean
  ): MarketDataRepairRunActionResult {
    return this.repairEngine.runEngine.createRepairRunActionResult(action, plan, batchSize, maxBatchesPerAction, dryRun);
  }
  public async executeRepairRunAction(
    action: MarketDataRepairRunAction,
    request: MarketDataRepairRunRequest,
    scope: { region: string; assetType: string },
    batchSize: number,
    maxBatchesPerAction: number,
    result: MarketDataRepairRunActionResult,
    startOffset = 0,
    sourceSnapshot?: RepairRunSourceSnapshot
  ) {
    return this.repairEngine.runEngine.executeRepairRunAction(action, request, scope, batchSize, maxBatchesPerAction, result, startOffset, sourceSnapshot);
  }
  public async repairRunSourceFingerprints(
    request: MarketDataRepairRunRequest,
    scope: { region: string; assetType: string },
    actions: MarketDataRepairRunAction[]
  ): Promise<Partial<Record<MarketDataRepairRunAction, RepairRunSourceSnapshot>>> {
    return this.repairEngine.runEngine.repairRunSourceFingerprints(request, scope, actions);
  }
  public invalidateUniverseComputationSnapshot(scope?: { region: string; assetType: string }) {
    return this.universeReadiness.invalidateUniverseComputationSnapshot(scope);
  }


  public tryUniverseComputationSnapshot(
    scope: { region: string; assetType: string },
    now?: Date
  ): Promise<UniverseComputationSnapshot | null> {
    return this.universeReadiness.tryUniverseComputationSnapshot(scope, now);
  }

  public repairRunSourceFingerprintMetadata(
    sourceFingerprints: Partial<Record<MarketDataRepairRunAction, RepairRunSourceSnapshot>>
  ) {
    return this.repairEngine.runEngine.repairRunSourceFingerprintMetadata(sourceFingerprints);
  }
  public async repairRunStartOffsets(
    scope: { region: string; assetType: string },
    actions: MarketDataRepairRunAction[],
    sourceFingerprints: Partial<Record<MarketDataRepairRunAction, RepairRunSourceSnapshot>>
  ): Promise<{
    offsets: Partial<Record<MarketDataRepairRunAction, number>>;
    warningsByAction: Partial<Record<MarketDataRepairRunAction, string[]>>;
  }> {
    return this.repairEngine.runEngine.repairRunStartOffsets(scope, actions, sourceFingerprints);
  }
  public repairRunTotals(
    actions: MarketDataRepairRunActionResult[],
    actionsRequested: MarketDataRepairRunAction[]
  ): MarketDataRepairRunResponse['summary'] {
    return this.repairEngine.runEngine.repairRunTotals(actions, actionsRequested);
  }
  public repairRunWarnings(
    health: MarketDataUniverseHealth,
    plan: MarketDataRepairPlan,
    actions: MarketDataRepairRunActionResult[],
    dryRun: boolean
  ): string[] {
    return this.repairEngine.runEngine.repairRunWarnings(health, plan, actions, dryRun);
  }
  public expectedNextRepairRunAction(
    plan: MarketDataRepairPlan,
    actions: MarketDataRepairRunAction[]
  ): MarketDataRepairRunAction | null {
    return this.repairEngine.runEngine.expectedNextRepairRunAction(plan, actions);
  }
  public hardBlockersFromHealth(health: MarketDataUniverseHealth): MarketDataUniverseHealth['topBlockers'] {
    return this.repairEngine.runEngine.hardBlockersFromHealth(health);
  }
  public jsonSnapshot<T>(value: T): T {
    return this.repairEngine.runEngine.jsonSnapshot(value);
  }
  public repairScope(request: Pick<MarketDataRepairRequest, 'region' | 'assetType'>) {
    return this.repairEngine.runEngine.repairScope(request);
  }
  public mutatingRepairBatch(request: Pick<MarketDataRepairRequest, 'batchSize' | 'limit'>) {
    return this.repairEngine.runEngine.mutatingRepairBatch(request);
  }
  public providerBusinessMetadataRepairConcurrency(request: Pick<MarketDataRepairRequest, 'workerConcurrency'>) {
    return this.repairEngine.runEngine.providerBusinessMetadataRepairConcurrency(request);
  }
  public priceBackfillConcurrency(request: Pick<MarketDataRepairRequest, 'workerConcurrency'>) {
    return this.repairEngine.runEngine.priceBackfillConcurrency(request);
  }
  public priceBackfillProviderThrottleMs() {
    return this.repairEngine.runEngine.priceBackfillProviderThrottleMs();
  }
  public isYahooRateLimitError(message: string): boolean {
    return this.repairEngine.runEngine.isYahooRateLimitError(message);
  }
  public isAngelOneTokenNotFoundError(message: string): boolean {
    return this.repairEngine.runEngine.isAngelOneTokenNotFoundError(message);
  }
  public stableSourceRepairBatch(request: Pick<MarketDataRepairRequest, 'batchSize' | 'limit' | 'offset'>) {
    return this.repairEngine.runEngine.stableSourceRepairBatch(request);
  }
  public defaultCatalogIdentitySource(scope: { region: string; assetType: string }): CatalogSource {
    return this.repairEngine.runEngine.defaultCatalogIdentitySource(scope);
  }
  public repairSourceIdentity(input: {
    action: MarketDataRepairRunAction;
    catalogSource?: string;
    importMode?: string;
    sourceKey?: string;
    sourceUrl?: string | null;
    urlSource?: string | null;
    rawText: string;
    rows?: unknown[];
  }): { fingerprint: string; identity: MarketDataRepairSourceIdentity } {
    return this.repairEngine.runEngine.repairSourceIdentity(input);
  }
  public sha256(value: string): string {
    return sha256Util(value);
  }

  // ---------------------------------------------------------------------------
  // NSE Corporate-Actions import
  // ---------------------------------------------------------------------------

  /**
   * Parse and persist NSE corporate-action rows from uploaded CSV/JSON text
   * (or a pre-parsed row array).  Records a SourceFileImport and returns counts.
   *
   * NOTE: Live NSE endpoint is bot-protected — this method does NOT fetch from
   * the network.  The caller supplies the text or rows (uploaded file pattern,
   * same as manual fundamentals import).
   */
  // Delegates to IndiaCorporateActionsService (Phase 4c). Kept as a byte-identical service
  // delegator (controller surface).
  async importNseCorporateActionsFile(input: {
    csvOrJsonText?: string;
    rows?: NseCorporateActionRow[];
    region?: string;
    assetType?: string;
    source?: string;
    force?: boolean;
  }): Promise<{
    status: 'COMPLETED' | 'SKIPPED_DUPLICATE' | 'FAILED';
    sourceFileImportId: string | null;
    received: number;
    inserted: number;
    updated: number;
    skipped: number;
    rejected: number;
    warnings: string[];
    errors: string[];
    affectedSymbols: string[];
  }> {
    return this.indiaCorporateActions.importNseCorporateActionsFile(input);
  }

  // ---------------------------------------------------------------------------
  // Back-adjustment recompute (delegated to IndiaCorporateActionsService, Phase 4c)
  // ---------------------------------------------------------------------------

  // Kept as byte-identical service delegators (controller surface +
  // signal-outcome-staleness.test.ts calls service.recomputeAdjustedClosesForInstrument
  // directly). invalidateSignalOutcomes stays on the service and is reached by the moved
  // body via the IndiaCorporateActionsHost.
  async recomputeAdjustedClosesForInstrument(instrumentId: string): Promise<{
    instrumentId: string;
    symbol: string | null;
    bars: number;
    updated: number;
    warnings: string[];
  }> {
    return this.indiaCorporateActions.recomputeAdjustedClosesForInstrument(instrumentId);
  }

  async recomputeAdjustedClosesBatch(input: {
    region?: string;
    assetType?: string;
    batchSize?: number;
    offset?: number;
  }): Promise<{
    processed: number;
    total: number;
    nextOffset: number;
    hasMore: boolean;
    updated: number;
    warnings: string[];
    errors: string[];
  }> {
    return this.indiaCorporateActions.recomputeAdjustedClosesBatch(input);
  }

  public async loadCatalogIdentityRows(catalogSource: CatalogSource, csvText?: string, importMode?: MarketDataRepairRequest['importMode']): Promise<{
    rows: CreateStockRequest[];
    warnings: string[];
    downloaded: boolean;
    sourceFingerprint: string;
    sourceIdentity: MarketDataRepairSourceIdentity;
  }> {
    return this.repairEngine.catalogIdentity.loadCatalogIdentityRows(catalogSource, csvText, importMode);
  }
  public stocksByIdentityKey(stocks: any[]) {
    return this.repairEngine.catalogIdentity.stocksByIdentityKey(stocks);
  }
  public findStockForCatalogIdentityRow(row: CreateStockRequest, stocksByKey: Map<string, any[]>) {
    return this.repairEngine.catalogIdentity.findStockForCatalogIdentityRow(row, stocksByKey);
  }
  public needsCatalogIdentityRepair(stock: any): boolean {
    return this.repairEngine.catalogIdentity.needsCatalogIdentityRepair(stock);
  }
  public emptyRepairSummary(
    scope: { region: string; assetType: string },
    batch: { batchSize: number; offset: number },
    totalCount: number,
    stableMutatingQueue = false
  ): MarketDataRepairSummary {
    return this.repairEngine.businessMetadata.emptyRepairSummary(scope, batch, totalCount, stableMutatingQueue);
  }
  public providerDisabledRepairSummary(request: MarketDataRepairRequest, message: string): MarketDataRepairSummary {
    return this.repairEngine.businessMetadata.providerDisabledRepairSummary(request, message);
  }
  public finishRepairSummary(summary: MarketDataRepairSummary, started: number) {
    return this.repairEngine.businessMetadata.finishRepairSummary(summary, started);
  }
  public needsMetadataEnrichment(stock: any): boolean {
    return this.repairEngine.businessMetadata.needsMetadataEnrichment(stock);
  }
  public needsBusinessMetadataRepair(stock: any): boolean {
    return this.repairEngine.businessMetadata.needsBusinessMetadataRepair(stock);
  }
  public missingBusinessMetadataFields(stock: any): string[] {
    return this.repairEngine.businessMetadata.missingBusinessMetadataFields(stock);
  }
  public businessMetadataBlockerDiagnostics(stocks: any[]): NonNullable<MarketDataRepairPlan['businessMetadataBlockerDiagnostics']> {
    return this.repairEngine.businessMetadata.businessMetadataBlockerDiagnostics(stocks);
  }
  public async recordPriceBackfillRepairAttempt(
    stock: any,
    scope: { region: string; assetType: string },
    status: string,
    fieldsFilled: Record<string, number>,
    error?: string | null,
    manualRequiredReason?: string | null,
    stateStatus: MarketDataRepairStateStatus = 'FAILED_RETRYABLE'
  ) {
    return this.repairEngine.businessMetadata.recordPriceBackfillRepairAttempt(stock, scope, status, fieldsFilled, error, manualRequiredReason, stateStatus);
  }
  public async countPriceBackfillRunCandidates(
    scope: { region: string; assetType: string },
    request: PriceBackfillRunRequest
  ): Promise<number> {
    return this.repairEngine.priceBackfill.countPriceBackfillRunCandidates(scope, request);
  }
  public async repairStatesByStockId(
    scope: { region: string; assetType: string },
    stocks: any[]
  ): Promise<Map<string, any[]> | undefined> {
    return this.repairEngine.priceBackfill.repairStatesByStockId(scope, stocks);
  }
  public blockedPriceBackfillStockIdsFromStates(
    repairStatesByStockId: Map<string, any[]> | undefined,
    now = new Date()
  ): Set<string> | null {
    return this.repairEngine.priceBackfill.blockedPriceBackfillStockIdsFromStates(repairStatesByStockId, now);
  }
  public priceBackfillBlockReason(
    repairStatesByStockId: Map<string, any[]> | undefined,
    stockId: string,
    blockedWithoutState: boolean
  ): 'manual' | 'retry' | null {
    return this.repairEngine.priceBackfill.priceBackfillBlockReason(repairStatesByStockId, stockId, blockedWithoutState);
  }
  public repairPlanCountsFromSnapshot(snapshot: UniverseComputationSnapshot) {
    return this.repairEngine.priceBackfill.repairPlanCountsFromSnapshot(snapshot);
  }
  public async blockedPriceBackfillStockIds(
    scope: { region: string; assetType: string },
    includeRetryableBlocked = false
  ): Promise<Set<string>> {
    return this.repairEngine.priceBackfill.blockedPriceBackfillStockIds(scope, includeRetryableBlocked);
  }
  public endOfTradingDateUtc(tradingDate: string | null): Date {
    return endOfTradingDateUtcUtil(tradingDate);
  }

  public isBlank(value: unknown): boolean {
    return isBlankUtil(value);
  }

  public hasValidMetadataValue(value: unknown): value is string {
    return hasValidMetadataValueUtil(value);
  }

  public hasValidMarketCap(value: unknown): boolean {
    return hasValidMarketCapUtil(value);
  }

  // Phase 5a: the V1 instrument shaper moved to the shared instrument-mapper as a pure free
  // function. This thin delegator injects the metadata helpers that stay on the service
  // (they have many non-mapper call sites) so all existing this.toV1Instrument call sites stay
  // byte-identical.
  public toV1Instrument(stock: any, overrides?: Partial<V1CreateInstrumentRequest>): V1Instrument {
    return toV1InstrumentMapper(
      {
        normalizeInstrumentAssetType: (value, symbol, name) => this.normalizeInstrumentAssetType(value, symbol, name),
        deriveInstrumentSegment: (assetType, symbol) => this.deriveInstrumentSegment(assetType, symbol),
        defaultCurrencyForInstrument: (symbol, exchange, region) => this.defaultCurrencyForInstrument(symbol, exchange, region),
        defaultCountryForInstrument: (symbol, exchange, region) => this.defaultCountryForInstrument(symbol, exchange, region),
        isKnownNseDerivativesEligibleStock: (symbol) => this.isKnownNseDerivativesEligibleStock(symbol),
        missingMetadataFields: (input) => this.missingMetadataFields(input),
        metadataCompletenessScore: (missingFields) => this.metadataCompletenessScore(missingFields),
      },
      stock,
      overrides,
    );
  }

  public defaultCountryForInstrument(symbol?: string | null, exchange?: string | null, region?: string | null): string | null {
    return defaultCountryForInstrumentUtil(symbol, exchange, region);
  }

  public defaultCurrencyForInstrument(symbol?: string | null, exchange?: string | null, region?: string | null): string {
    return defaultCurrencyForInstrumentUtil(symbol, exchange, region);
  }

  public normalizeInstrumentAssetType(value?: string | null, symbol?: string | null, _name?: string | null): string {
    return normalizeInstrumentAssetTypeUtil(value, symbol, _name);
  }

  private deriveInstrumentSegment(assetType: string, symbol?: string | null): string {
    return deriveInstrumentSegmentUtil(assetType, symbol);
  }

  private missingMetadataFields(input: Record<string, unknown>): string[] {
    return missingMetadataFieldsUtil(input);
  }

  private metadataCompletenessScore(missingFields: string[]): number {
    return metadataCompletenessScoreUtil(missingFields);
  }

  // Catalog download/validate/row-mapping helpers extracted to the catalog ingestion cluster
  // (ingestion/market-data-foundation.ingestion.catalog.ts). Kept as PUBLIC byte-identical facade
  // delegators because the repair host reaches them as host.downloadConfiguredCatalogCsv /
  // host.cleanupCatalogTempFile / host.validateCsvColumns / host.catalogRowsForSource.
  public async downloadConfiguredCatalogCsv(catalogSource: string) {
    return this.catalogIngestion.downloadConfiguredCatalogCsv(catalogSource);
  }

  public async cleanupCatalogTempFile(downloadInfo: { tempFilePath: string; keepTempFiles: boolean; tempFileDeleted: boolean; tempFileDeleteError?: string }) {
    return this.catalogIngestion.cleanupCatalogTempFile(downloadInfo);
  }

  public validateCsvColumns(source: string, csvText: string) {
    return this.catalogIngestion.validateCsvColumns(source, csvText);
  }

  public catalogRowsForSource(source: string, csvText: string, warnings: string[]): CreateStockRequest[] {
    return this.catalogIngestion.catalogRowsForSource(source, csvText, warnings);
  }

  // Widened private->public for Phase 4b (IndiaExchangeIngestionHost collaborator).
  public readObjectString(record: Record<string, unknown>, keys: string[]): string {
    return readObjectStringUtil(record, keys);
  }

  // Widened private->public for Phase 4b (IndiaExchangeIngestionHost collaborator).
  public cleanIndexName(value: string): string {
    return cleanIndexNameUtil(value);
  }

  // Widened private->public for Phase 4b (IndiaExchangeIngestionHost collaborator).
  public indexPriceSourceForName(name: string): 'NSE_INDEX_EOD' | 'NIFTY_SECTOR_INDEX' {
    return indexPriceSourceForNameUtil(name);
  }

  // Widened private->public for Phase 4b (IndiaExchangeIngestionHost collaborator).
  public parseMarketDataNumber(value: string): number | null {
    return parseMarketDataNumberUtil(value);
  }

  private isKnownNseDerivativesEligibleStock(symbol?: string | null): boolean {
    return isKnownNseDerivativesEligibleStockUtil(symbol);
  }

  public parseCsv(csvText: string): Record<string, string>[] {
    return parseCsvUtil(csvText);
  }

  // Widened private->public for Phase 4b (IndiaExchangeIngestionHost collaborator).
  public parseCatalogDate(value: string): Date | null {
    return parseCatalogDateUtil(value);
  }


  // Widened private->public for Phase 5c: the repair price-backfill engine throttles provider
  // calls through the host so the existing test seam (spyOn(service,'throttleIngestion')) holds.
  public async throttleIngestion(minDelayMs = 1000) {
    return throttleIngestionUtil(minDelayMs);
  }

  // Widened private->public for the ingestion-extraction phase: SymbolIngestionService reaches this
  // freshness gate through the MarketDataIngestionHost (it delegates to SyncGateService and keeps the
  // jest.spyOn(service,'evaluateSyncFreshnessGate') seam intact).
  public evaluateSyncFreshnessGate(input: {
    region: string;
    assetType: string;
    scopeType: 'CATALOG' | 'INSTRUMENT';
    scopeKey: string;
    tradingDate: string;
    now: Date;
    force: boolean;
    cooldownMinutes: number;
    syncDuringMarketHours?: boolean;
    postCloseSyncWindowMinutes?: number;
    finalizationGraceMinutes?: number;
    skipWeekends?: boolean;
  }): Promise<{
    shouldSkip: boolean;
    reason: MarketDataSyncSkipReason;
    message: string;
    nextEligibleSyncAt?: string;
    providerEndDate?: Date;
  }> {
    return this.syncGate.evaluateSyncFreshnessGate(input);
  }

  // Widened private->public for the ingestion-extraction phase: SymbolIngestionService reaches this
  // skipped-summary builder through the MarketDataIngestionHost (it delegates to SyncGateService).
  public buildSkippedSyncSummary(
    skippedCount: number,
    reason: MarketDataSyncSkipReason,
    message: string,
    checkedAt: Date,
    nextEligibleSyncAt?: string
  ): SyncSummary {
    return this.syncGate.buildSkippedSyncSummary(skippedCount, reason, message, checkedAt, nextEligibleSyncAt);
  }

  // Widened private->public for the ingestion-extraction phase: RegionSyncOrchestrator reaches these
  // skipped-summary / fingerprint builders through the MarketDataIngestionHost (they delegate to
  // SyncGateService).
  public buildSkippedRegionSummary(
    region: string,
    assetType: string,
    tradingDate: string,
    skippedCount: number,
    reason: MarketDataSyncSkipReason,
    message: string,
    checkedAt: Date,
    nextEligibleSyncAt?: string
  ): ScheduledRegionSyncSummary {
    return this.syncGate.buildSkippedRegionSummary(region, assetType, tradingDate, skippedCount, reason, message, checkedAt, nextEligibleSyncAt);
  }

  public scheduledRegionSourceFingerprint(input: {
    region: string;
    assetType: string;
    dataThroughDate: string;
    rowsInserted: number;
    rowsUpdated: number;
    changedInstrumentIds: string[];
    downstreamInstrumentIds?: string[];
  }): string {
    return this.syncGate.scheduledRegionSourceFingerprint(input);
  }


  // Widened private->public for Phase 4c: IndiaTradingCalendar reaches this env-number
  // reader through the IndiaTradingCalendarHost (it stays on the service).
  public readPositiveNumber(value: string | undefined, fallback: number): number {
    return readPositiveNumberUtil(value, fallback);
  }

  // ---------------------------------------------------------------------------
  // Market Scans
  // ---------------------------------------------------------------------------

  async marketScan52w(
    options: Pick<PaginationOptions, 'region' | 'assetType'> & {
      scanType: '52w-high' | '52w-low';
      proximityPct?: number;
      limit?: number;
    } = { scanType: '52w-high' },
  ): Promise<MarketScanSummary52w> {
    return this.scanReads.marketScan52w(options);
  }

  async marketScanDeliverySpike(
    options: Pick<PaginationOptions, 'region' | 'assetType'> & {
      lookbackBars?: number;
      minSpikeRatio?: number;
      limit?: number;
    } = {},
  ): Promise<MarketScanSummaryDeliverySpike> {
    return this.scanReads.marketScanDeliverySpike(options);
  }

  async marketScanVolumeSpike(
    options: Pick<PaginationOptions, 'region' | 'assetType'> & {
      lookbackBars?: number;
      minSpikeRatio?: number;
      limit?: number;
    } = {},
  ): Promise<MarketScanSummaryVolumeSpike> {
    return this.scanReads.marketScanVolumeSpike(options);
  }

  // ---------------------------------------------------------------------------
  // Multi-Factor Screener
  // ---------------------------------------------------------------------------

  async screener(options: {
    region?: string;
    assetType?: string;
    signalDirection?: string;
    minScore?: number;
    minRsPercentile?: number;
    sector?: string;
    capBand?: 'LARGE' | 'MID' | 'SMALL';
    minDeliveryPct?: number;
    min52wPositionPct?: number;
    excludeFnoBan?: boolean;
    onlyDerivativesEligible?: boolean;
    limit?: number;
  } = {}): Promise<{
    generatedAt: string;
    count: number;
    results: Array<{
      instrumentId: string;
      symbol: string;
      companyName: string;
      price: number | null;
      signalDirection: string | null;
      signalScore: number | null;
      rsPercentile: number | null;
      sector: string | null;
      capBand: string | null;
      deliveryPct: number | null;
      range52wPositionPct: number | null;
      inFnoBan: boolean;
      buildupLabel: string | null;
      oiChangePct: number | null;
      pcrOi: number | null;
      fnoReadinessScore: number | null;
      fnoGrade: string | null;
      fnoComponents: {
        signal: number;
        relativeStrength: number;
        derivativesPositioning: number;
        delivery: number;
        trend: number;
      } | null;
      currency: string;
      region?: string;
    }>;
    warnings: string[];
  }> {
    return this.scanReads.screener(options);
  }
}
