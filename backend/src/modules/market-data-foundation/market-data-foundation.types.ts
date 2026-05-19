export interface HistoricalPrice {
  symbol: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose?: number | null;
  volume?: number;
  source?: string;
}

export type MarketDataStatus = 'COMPLETE' | 'PARTIAL' | 'DELAYED' | 'MISSING' | 'ERROR';
export type UniverseState =
  | 'CATALOG_ONLY'
  | 'PROVIDER_SUPPORTED'
  | 'PRICE_READY'
  | 'CONTEXT_READY'
  | 'REVIEW_READY'
  | 'UNSUPPORTED'
  | 'STALE_OR_INCOMPLETE'
  | 'DELISTED_OR_INACTIVE';
export type UniverseTrustStatus = 'OK' | 'PARTIAL' | 'NOT_TRUSTWORTHY';
export type TrustedReviewUniverseStatus = 'READY' | 'LIMITED' | 'NOT_READY';
export type TrustedReviewUniverseMode = 'FULL_REVIEW' | 'LIMITED_REVIEW' | 'NO_REVIEW';
export type TrustedBaselineRequiredHistoryStatus = 'COMPLETE' | 'INCOMPLETE' | 'FALLBACK_REQUIRED';
export type TrustedBaselineListingDateStatus =
  | 'PRESENT_USED_LISTING_DATE'
  | 'PRESENT_OLDER_THAN_15Y_USED_15Y'
  | 'MISSING_USED_15_YEAR_TARGET';
export type TrustedBaselineProviderFallbackState =
  | 'PROVIDER_SUPPORTED'
  | 'PROVIDER_UNKNOWN'
  | 'PROVIDER_VALIDATION_FAILED'
  | 'RETRY_BLOCKED_PROVIDER_VALIDATION'
  | 'PROVIDER_UNSUPPORTED_OR_INACTIVE'
  | 'YAHOO_INSUFFICIENT_FALLBACK_REQUIRED'
  | 'FALLBACK_ATTEMPTED_STILL_INCOMPLETE';
export type TrustedBaselineResidualState =
  | 'REVIEW_READY'
  | 'REQUIRED_HISTORY_INCOMPLETE'
  | 'LISTING_DATE_MISSING_REQUIRED_15Y'
  | 'FALLBACK_REQUIRED_AFTER_YAHOO_ZERO_ROWS'
  | 'FALLBACK_ATTEMPTED_STILL_INCOMPLETE'
  | 'CATALOG_IDENTITY_REPAIR_REQUIRED'
  | 'RETRY_BLOCKED_PROVIDER_VALIDATION'
  | 'PROVIDER_VALIDATION_PENDING'
  | 'UNSUPPORTED_OR_INACTIVE_EXCLUDED';
export type ReviewReadinessUserDecision = 'WAIT' | 'REPAIR_DATA' | 'PROCEED_LIMITED' | 'READY_FOR_REVIEW';
export type ReviewReadinessBlockerCategory =
  | 'PROVIDER_VALIDATION'
  | 'CATALOG_IDENTITY'
  | 'BUSINESS_METADATA'
  | 'PRICE_BACKFILL'
  | 'STALE_EOD'
  | 'INSUFFICIENT_TRUSTED_UNIVERSE'
  | 'MARKET_CALENDAR_UNCERTAIN';
export type ReviewReadinessBlockerSeverity = 'HARD_BLOCKER' | 'LIMITED_REVIEW' | 'CONTEXT_GAP';
export type CatalogSource =
  | 'MANUAL'
  | 'LEGACY_NIFTY500'
  | 'LEGACY_DATABASE'
  | 'NSE_EQUITY_SECURITIES'
  | 'NSE_SME_EQUITY_SECURITIES'
  | 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS'
  | 'NSE_INDEX_SECURITIES'
  | 'BSE_INDEX_SECURITIES'
  | 'NSE_INDEX_SEED'
  | 'NSE_ETF_SECURITIES'
  | 'BSE_EQUITY_SECURITIES'
  | 'BROKER_SCRIP_MASTER'
  | 'UNKNOWN';

export type ProviderSupportStatus = 'SUPPORTED' | 'UNSUPPORTED' | 'UNKNOWN' | 'VALIDATION_FAILED';
export type ProviderValidationClassification =
  | 'SUPPORTED_WITH_CANDLES'
  | 'SUPPORTED_FROM_STORED_PRICES'
  | 'UNSUPPORTED_NO_PROVIDER_SYMBOL'
  | 'UNSUPPORTED_NO_CANDLES_WIDE_WINDOW'
  | 'FREE_FALLBACK_REQUIRED'
  | 'RETRYABLE_TIMEOUT'
  | 'RETRYABLE_PROVIDER_ERROR'
  | 'RETRYABLE_RATE_LIMITED'
  | 'MANUAL_SYMBOL_REPAIR_REQUIRED'
  | 'VALIDATION_SKIPPED_CALENDAR_UNCERTAIN';
export type InstrumentSegmentClass = 'CASH' | 'ETF' | 'INDEX' | 'FUTURES' | 'CURRENCY' | 'COMMODITY' | 'CRYPTO' | 'FUND' | 'OTHER' | 'UNKNOWN';
export type MarketDataRepairType =
  | 'PROVIDER_BUSINESS_METADATA'
  | 'CATALOG_IDENTITY'
  | 'PRICE_BACKFILL'
  | 'PROVIDER_VALIDATION'
  | 'MANUAL_METADATA_IMPORT';
export type MarketDataProviderBusinessRepairStatus =
  | 'SUCCESS'
  | 'PARTIAL_SUCCESS'
  | 'NO_PROVIDER_DATA'
  | 'NO_FIELDS_FILLED'
  | 'MANUAL_REQUIRED'
  | 'FAILED'
  | 'SKIPPED_RECENT_ATTEMPT';
export type MarketDataRepairStateStatus =
  | 'AUTO_REPAIRABLE'
  | 'MANUAL_REQUIRED'
  | 'RETRY_COOLDOWN'
  | 'RESOLVED'
  | 'FAILED_RETRYABLE';

export interface SyncSummary {
  rowsReceived: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsNoOp?: number;
  noNewData?: boolean;
  skippedBeforeFetchCount?: number;
  providerFetchSkippedCount?: number;
  skippedReasonCounts?: Record<string, number>;
  skippedReasons?: string[];
  lastCheckedAt?: string;
  nextEligibleSyncAt?: string;
  duplicateProviderRowsSkipped?: number;
  warningCount: number;
  warnings: string[];
}

export type MarketDataSyncScopeType = 'CATALOG' | 'INSTRUMENT';
export type MarketDataSyncStateStatus = 'PENDING' | 'SYNCED' | 'FINAL_CONFIRMED' | 'FAILED';

export type MarketDataSyncSkipReason =
  | 'RECENTLY_SYNCED'
  | 'MARKET_CLOSED_NO_NEW_DAILY_DATA'
  | 'BEFORE_MARKET_OPEN'
  | 'WEEKEND_OR_HOLIDAY'
  | 'FINAL_CANDLE_CONFIRMED';

export type MarketDataSchedulerReasonCode =
  | 'BEFORE_MARKET_OPEN'
  | 'MARKET_OPEN'
  | 'POST_CLOSE_FINALIZATION_WINDOW'
  | 'FINAL_CANDLE_CONFIRMED'
  | 'MARKET_CLOSED_NO_SYNC'
  | 'WEEKEND_OR_HOLIDAY'
  | 'UNKNOWN_SESSION'
  | 'MISSING_FINAL_CANDLE_RETRY';

export interface MarketDataSchedulerDecision {
  shouldRun: boolean;
  reasonCode: MarketDataSchedulerReasonCode;
  reason: string;
  sessionState: MarketDataSchedulerReasonCode;
  todayTradingDate: string | null;
  nextSuggestedRunAt?: string | null;
}

export interface LatestStoredCandleInfo {
  latestTradingDate?: string | null;
  finalConfirmed?: boolean;
}

export interface MarketDataSyncStateDto {
  region: string;
  assetType: string;
  scopeType: MarketDataSyncScopeType;
  scopeKey: string;
  timeframe: string;
  tradingDate: string;
  status: MarketDataSyncStateStatus;
  lastCheckedAt: string | null;
  lastProviderFetchAt: string | null;
  lastRunAt: string | null;
  lastInsertedCount: number;
  lastUpdatedCount: number;
  lastNoOpCount: number;
  lastSkippedCount: number;
  lastWarningCount: number;
  lastSummary?: unknown;
}

export interface ScheduledRegionSyncSummary {
  region: string;
  assetType: string;
  tradingDate: string;
  instrumentsProcessed: number;
  rowsReceived: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsNoOp: number;
  noNewData?: boolean;
  skippedBeforeFetchCount?: number;
  providerFetchSkippedCount?: number;
  skippedReasonCounts?: Record<string, number>;
  skippedReasons?: string[];
  lastCheckedAt?: string;
  nextEligibleSyncAt?: string;
  warningCount: number;
  warnings: string[];
  errors: string[];
}

export interface MarketDataSchedulerRegionStatus {
  region: string;
  assetType: string;
  sessionState: MarketDataSchedulerReasonCode;
  shouldRunNow: boolean;
  reason: string;
  todayTradingDate: string | null;
  latestCompletedTradingDate: string | null;
  latestStoredTradingDate: string | null;
  todayCandleStored: boolean;
  latestCompletedCandleStored: boolean;
  latestStoredCandleIsCurrent: boolean;
  candleSyncStatus: 'CURRENT' | 'MISSING_LATEST_COMPLETED' | 'NO_STORED_CANDLES' | 'TODAY_STORED_PENDING_FINAL_CONFIRMATION' | 'UNKNOWN_SESSION';
  finalConfirmed: boolean;
  nextSuggestedRunAt?: string | null;
  lastSummary?: unknown;
}

export interface MarketDataSchedulerStatus {
  enabled: boolean;
  intervalMinutes: number;
  regions: string[];
  assetType: string;
  activeRun: boolean;
  lastRunAt: string | null;
  nextSuggestedRunAt: string | null;
  regionStatuses: MarketDataSchedulerRegionStatus[];
}

export interface RegionInfo {
  region?: string;
  exchange?: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type?: string;
  exchange?: string;
  region?: string;
}

export interface ProviderValidationResult {
  supported: boolean;
  failed?: boolean;
  message?: string;
  classification: ProviderValidationClassification;
  provider?: string;
  providerSymbol?: string;
  candlesFound?: number;
  providerCallMs?: number;
  validationWindowStartDate?: string;
  validationWindowEndDate?: string;
  sourceName?: string;
  fallbackSourceAttempted?: string | null;
  freeFallbackRequired?: boolean;
}

export interface CompanyMasterData {
  symbol: string;
  companyName: string | null;
  exchange: string | null;
  country: string | null;
  sector: string | null;
  industry: string | null;
  currency: string | null;
  marketCap: number | null;
  assetType: string | null;
  isDelisted: boolean | null;
  ipoDate: Date | null;
  source: string;
  dataStatus: MarketDataStatus;
}

export interface CreateStockRequest {
  symbol: string;
  name: string;
  region: string;
  exchange?: string;
  country?: string | null;
  sector?: string | null;
  industry?: string | null;
  currency?: string | null;
  marketCap?: number | null;
  assetType?: string | null;
  instrumentSegment?: string | null;
  displaySymbol?: string | null;
  providerSymbol?: string | null;
  sourceSymbol?: string | null;
  catalogSource?: CatalogSource | string | null;
  providerSupportStatus?: ProviderSupportStatus | string | null;
  providerError?: string | null;
  derivativesEligible?: boolean;
  underlyingSymbol?: string | null;
  expiryDate?: Date | null;
  contractMonth?: string | null;
  lotSize?: number | null;
  contractStatus?: string | null;
  source?: string;
  dataStatus?: MarketDataStatus | string;
  isActive?: boolean;
  isDelisted?: boolean;
  ipoDate?: Date | null;
  isin?: string | null;
  sectorSource?: string | null;
  industrySource?: string | null;
  marketCapSource?: string | null;
  isinSource?: string | null;
  listingDateSource?: string | null;
  metadataUpdatedAt?: Date | null;
}

export interface V1CreateInstrumentRequest {
  symbol: string;
  company_name: string;
  exchange: string;
  currency: string;
  asset_type: string;
  isin?: string;
  country?: string;
  sector?: string;
  industry?: string;
  market_cap?: number;
  ipo_date?: string;
}

export interface V1Instrument {
  id: string;
  symbol: string;
  company_name: string;
  display_symbol?: string;
  provider_symbol?: string | null;
  source_symbol?: string | null;
  exchange: string | null;
  country: string | null;
  region?: string | null;
  sector: string | null;
  industry: string | null;
  currency: string;
  market_cap: number | null;
  asset_type: string;
  instrument_segment: string;
  derivatives_eligible?: boolean;
  provider_support_status?: ProviderSupportStatus | string | null;
  catalog_source?: CatalogSource | string | null;
  provider_error?: string | null;
  underlying_symbol?: string | null;
  expiry_date?: string | null;
  contract_month?: string | null;
  lot_size?: number | null;
  contract_status?: string | null;
  metadata_completeness_score?: number;
  missing_metadata_fields?: string[];
  universe_state?: UniverseState;
  price_history_bars?: number;
  latest_price_date?: string | null;
  expected_latest_trading_date?: string | null;
  has_recent_volume?: boolean;
  rolling_window_bars?: number;
  rolling_window_coverage_percent?: number;
  max_price_gap_days?: number | null;
  recent_volume_coverage_percent?: number;
  adjusted_close_coverage_percent?: number;
  uses_adjusted_close_fallback?: boolean;
  readiness_blockers?: string[];
  readiness_warnings?: string[];
  provider_readiness?: ProviderSupportStatus;
  price_readiness?: InstrumentUniverseReadiness['priceReadiness'];
  metadata_readiness?: InstrumentUniverseReadiness['metadataReadiness'];
  review_readiness?: InstrumentUniverseReadiness['reviewReadiness'];
  trusted_baseline_residual_state?: TrustedBaselineResidualState;
  trusted_baseline_blocker_codes?: string[];
  latest_completed_eod_date?: string | null;
  latest_completed_eod_present?: boolean;
  stored_data_through_date?: string | null;
  required_history_start_date?: string | null;
  required_history_end_date?: string | null;
  required_history_status?: TrustedBaselineRequiredHistoryStatus;
  listing_date_status?: TrustedBaselineListingDateStatus;
  provider_fallback_state?: TrustedBaselineProviderFallbackState;
  primary_source_attempted?: 'YAHOO' | null;
  fallback_sources_attempted?: string[];
  source_fallback_reason?: string | null;
  is_active: boolean;
  is_delisted: boolean;
  ipo_date: string | null;
  isin: string | null;
  source: string;
  ingestion_timestamp: string;
  last_updated_timestamp: string;
  data_status: MarketDataStatus;
}

export interface InstrumentUniverseReadiness {
  universeState: UniverseState;
  providerReadiness: ProviderSupportStatus;
  priceReadiness:
    | 'READY'
    | 'MISSING_LATEST_PRICE'
    | 'MARKET_CALENDAR_UNCERTAIN'
    | 'STALE_LATEST_PRICE'
    | 'INADEQUATE_HISTORY'
    | 'MISSING_RECENT_VOLUME';
  metadataReadiness: 'READY' | 'MISSING_REQUIRED_METADATA';
  reviewReadiness: 'REVIEW_READY' | 'NOT_REVIEW_READY';
  priceHistoryBars: number;
  latestPriceDate: string | null;
  expectedLatestTradingDate: string | null;
  hasRecentVolume: boolean;
  rollingWindowBars: number;
  rollingWindowCoveragePercent: number;
  maxPriceGapDays: number | null;
  recentVolumeCoveragePercent: number;
  adjustedCloseCoveragePercent: number;
  usesAdjustedCloseFallback: boolean;
  metadataCompletenessScore: number;
  readinessBlockers: string[];
  readinessWarnings: string[];
  isPriceReady: boolean;
  isContextReady: boolean;
  isReviewReady: boolean;
}

export interface UniverseStateCounts {
  CATALOG_ONLY: number;
  PROVIDER_SUPPORTED: number;
  PRICE_READY: number;
  CONTEXT_READY: number;
  REVIEW_READY: number;
  UNSUPPORTED: number;
  STALE_OR_INCOMPLETE: number;
  DELISTED_OR_INACTIVE: number;
}

export interface UniverseReadinessBlockerSummary {
  code: string;
  label: string;
  count: number;
  severity: 'warning' | 'critical';
}

export interface MarketDataUniverseSignoff {
  status: 'PASS' | 'FAIL';
  minReviewReadyRequired: number;
  reviewReadyActual: number;
  blockers: Array<{
    code: string;
    severity: 'warning' | 'critical';
    count: number;
    required: number | string;
    nextAction: MarketDataRepairRunAction | 'MANUAL_METADATA_IMPORT' | null;
  }>;
  nextAction: MarketDataRepairRunAction | 'MANUAL_METADATA_IMPORT' | null;
  downstreamAllowed: boolean;
}

export interface MarketDataUniverseHealth {
  scope: {
    region: string;
    assetType: string;
  };
  generatedAt: string;
  latestStoredEodDate: string | null;
  expectedLatestTradingDate: string | null;
  counts: UniverseStateCounts & {
    byUniverseState: UniverseStateCounts;
    readiness: {
      priceReady: number;
      contextReady: number;
      reviewReady: number;
    };
    totalCatalogInstruments: number;
    activeInstruments: number;
    inactiveOrDelistedInstruments: number;
    providerSupported: number;
    providerUnknown: number;
    providerUnknownValidationNeeded: number;
    providerRetryValidationNeeded: number;
    providerRetryBlocked?: number;
    providerManualRepairRequired?: number;
    nextProviderRetryAtMin?: string | null;
    historyCoverageIncomplete?: number;
    historyCoverageListingDateMissing?: number;
    historyCoverageFallbackRequired?: number;
    providerUnsupportedExcluded: number;
    providerValidationFailed: number;
    unsupported: number;
    unsupportedExcluded: number;
    supportedCatalogIdentityRepairNeeded: number;
    supportedBusinessMetadataRepairNeeded: number;
    supportedPriceBackfillNeeded: number;
    catalogOnly: number;
    priceReady: number;
    contextReady: number;
    reviewReady: number;
    staleOrIncomplete: number;
    missingLatestPrice: number;
    staleLatestPrice: number;
    missingOrInadequatePriceHistory: number;
    missingRecentVolume: number;
    missingSector: number;
    missingIndustry: number;
    missingCountry: number;
    missingCurrency: number;
    missingMarketCap: number;
    missingIsin: number;
    missingListingDate: number;
  };
  coverage: {
    priceCoveragePercentage: number;
    metadataCoveragePercentage: number;
    reviewReadyPercentage: number;
  };
  topBlockers: UniverseReadinessBlockerSummary[];
  warnings: string[];
  trustStatus: UniverseTrustStatus;
  trustReasons: string[];
  universeSignoff: MarketDataUniverseSignoff;
}

export type StockMissingDataIssueKind =
  | 'NULL'
  | 'BLANK'
  | 'NULL_EQUIVALENT'
  | 'INVALID'
  | 'EXPECTED_NULL'
  | 'UNEXPECTED_NON_NULL'
  | 'IDENTITY_MISMATCH';

export interface StockMissingDataSample {
  id: string;
  symbol: string;
  name?: string | null;
  exchange?: string | null;
  providerSymbol?: string | null;
  sourceSymbol?: string | null;
  displaySymbol?: string | null;
  column?: string;
  issue: StockMissingDataIssueKind;
  value?: string | null;
  expected?: string | null;
  reason: string;
  priceHistoryBars?: number;
  alternateSymbol?: string | null;
  alternatePriceHistoryBars?: number;
}

export interface StockColumnMissingDataDiagnostic {
  column: string;
  label: string;
  nullable: boolean;
  expectedNull: boolean;
  expectedNullReason?: string;
  totalRows: number;
  nullCount: number;
  blankCount: number;
  nullEquivalentCount: number;
  invalidCount: number;
  expectedNullCount: number;
  unexpectedNonNullCount: number;
  affectedCount: number;
  samples: StockMissingDataSample[];
}

export interface StockExpectedNullColumnDiagnostic {
  column: string;
  reason: string;
  expectedNullCount: number;
  unexpectedNonNullCount: number;
  samples: StockMissingDataSample[];
}

export interface StockIdentityMismatchDiagnostic {
  code: string;
  label: string;
  count: number;
  samples: StockMissingDataSample[];
}

export interface StockMissingDataDiagnosticsCountMap {
  activeStocks: number;
  providerUnknown: number;
  providerRetryValidationNeeded: number;
  providerValidationNeeded: number;
  missingProviderSymbol: number;
  missingSourceSymbol: number;
  missingDisplaySymbol: number;
  missingExchange: number;
  missingCurrency: number;
  missingIsin: number;
  missingListingDate: number;
  missingSector: number;
  missingIndustry: number;
  missingMarketCap: number;
  missingLatestPrice: number;
  missingOrInadequatePriceHistory: number;
  catalogIdentityRepairNeeded: number;
  supportedCatalogIdentityRepairNeeded: number;
  businessMetadataRepairNeeded: number;
  businessMetadataAutoRepairable: number;
  manualBusinessMetadataRequired: number;
  priceBackfillNeeded: number;
  supportedPriceBackfillNeeded: number;
  identityMismatches: number;
}

export interface StockMissingDataDiagnosticsActionCounts {
  providerValidationNeeded: number;
  catalogIdentityRepairNeeded: number;
  providerBusinessMetadataRepairNeeded: number;
  manualMetadataImportNeeded: number;
  priceBackfillNeeded: number;
}

export interface StockIdentityMismatchWarning {
  symbol: string;
  issue: string;
  severity: 'warning' | 'critical';
  providerSymbol?: string | null;
  expectedProviderSymbol?: string | null;
  sourceSymbol?: string | null;
  expectedSourceSymbol?: string | null;
  displaySymbol?: string | null;
  expectedDisplaySymbol?: string | null;
  exchange?: string | null;
  expectedExchange?: string | null;
  alternateSymbol?: string | null;
  alternatePriceHistoryBars?: number;
  priceHistoryBars?: number;
}

export interface StockMissingDataDiagnostics {
  scope: {
    region: string;
    assetType: string;
  };
  generatedAt: string;
  activeStockCount: number;
  sampleLimit: number;
  columns: StockColumnMissingDataDiagnostic[];
  expectedNullColumns: StockExpectedNullColumnDiagnostic[];
  identityMismatches: StockIdentityMismatchDiagnostic[];
  identityMismatchWarnings: StockIdentityMismatchWarning[];
  counts: StockMissingDataDiagnosticsCountMap;
  actionCounts: StockMissingDataDiagnosticsActionCounts;
  totals: {
    columnsAudited: number;
    columnsWithIssues: number;
    nullCount: number;
    blankCount: number;
    nullEquivalentCount: number;
    invalidCount: number;
    unexpectedNonNullCount: number;
    affectedColumnValues: number;
    identityMismatchRows: number;
  };
  warnings: string[];
}

export type MarketDataPriceIdentityRepairAction = 'DRY_RUN' | 'REPAIRED' | 'SKIPPED';

export interface MarketDataPriceIdentityRepairCandidate {
  stockId: string;
  symbol: string;
  providerSymbol: string | null;
  sourceSymbol: string | null;
  exchange: string | null;
  providerSupportStatus: string | null;
  canonicalPriceHistoryBars: number;
  providerPriceHistoryBars: number;
  action: MarketDataPriceIdentityRepairAction;
  skippedReasonCode?: string | null;
  skippedReason?: string | null;
  priceRowsMoved?: number;
  latestPricesMoved?: number;
}

export interface MarketDataPriceIdentityRepairSummary {
  scope: {
    region: string;
    assetType: string;
  };
  generatedAt: string;
  dryRun: boolean;
  totalCandidates: number;
  repaired: number;
  skipped: number;
  priceRowsMoved: number;
  latestPricesMoved: number;
  skipReasonCounts: Record<string, number>;
  samples: MarketDataPriceIdentityRepairCandidate[];
  warnings: string[];
}

export interface TrustedReviewUniverseExcludedCounts {
  providerUnknown: number;
  providerRetryFailed: number;
  providerUnsupported: number;
  inactiveOrDelisted: number;
  noLatestPrice: number;
  staleLatestPrice: number;
  requiredHistoryIncomplete: number;
  insufficientBarsUnder120: number;
  insufficientBarsUnder252: number;
  missingRecentVolume: number;
  corporateActionBlocked: number;
}

export interface TrustedReviewUniverseContextGapCounts {
  missingSector: number;
  missingIndustry: number;
  missingMarketCap: number;
  missingIsin: number;
  missingListingDate: number;
}

export interface TrustedReviewUniverseScanPolicy {
  scanLimit: number;
  scanComplete: boolean;
  scanOrdering: string;
}

export interface TrustedReviewUniverseHealth {
  scope: {
    region: string;
    assetType: string;
  };
  asOfDate: string;
  targetTradingDate: string | null;
  requiredDataThroughDate: string | null;
  storedDataThroughDate: string | null;
  catalogCount: number;
  providerSupportedCount: number;
  trustedCount: number;
  status: TrustedReviewUniverseStatus;
  mode: TrustedReviewUniverseMode;
  minLiteCount: number;
  minFullCount: number;
  dataThroughDate: string | null;
  scanPolicy: TrustedReviewUniverseScanPolicy;
  excludedCounts: TrustedReviewUniverseExcludedCounts;
  contextGapCounts: TrustedReviewUniverseContextGapCounts;
  warnings: string[];
}

export interface ReviewReadinessBlocker {
  category: ReviewReadinessBlockerCategory;
  severity: ReviewReadinessBlockerSeverity;
  affectedCount: number;
  explanation: string;
  nextActionCode: string;
  nextActionLabel: string;
  actionRoute?: string;
  boundedRequest?: {
    batchSize: number;
    region: string;
    assetType: string;
  };
}

export interface ReviewReadinessNextAction {
  code: string;
  label: string;
  actionRoute?: string;
  boundedRequest?: {
    batchSize: number;
    region: string;
    assetType: string;
  };
}

export interface ReviewReadinessSummary {
  scope: {
    region: string;
    assetType: string;
  };
  generatedAt: string;
  reviewMode: TrustedReviewUniverseMode;
  trustStatus: UniverseTrustStatus;
  userDecision: ReviewReadinessUserDecision;
  reviewUniverse: {
    catalogCount: number;
    providerSupportedCount: number;
    trustedCount: number;
    targetTradingDate: string | null;
    requiredDataThroughDate: string | null;
    storedDataThroughDate: string | null;
  };
  readinessCounts: {
    priceReady: number;
    contextReady: number;
    reviewReady: number;
    missingLatestPrice: number;
    staleLatestPrice: number;
    inadequateHistory: number;
    missingRecentVolume: number;
    providerUnknown: number;
    providerValidationFailedRetryable: number;
    unsupportedExcluded: number;
  };
  blockers: ReviewReadinessBlocker[];
  nextAction: ReviewReadinessNextAction | null;
  warnings: string[];
}

export interface TrustedReviewUniversePriceRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number | null;
  volume: number | null;
}

export interface TrustedReviewUniverseInstrument {
  id: string;
  symbol: string;
  companyName: string | null;
  region: string;
  assetType: string;
  exchange: string | null;
  providerSymbol: string | null;
  latestPriceDate: string | null;
  priceHistoryBars: number;
  rollingWindowBars: number;
  hasRecentVolume: boolean;
  latestClose: number | null;
  latestVolume: number | null;
  adjustedCloseAvailable: boolean;
  usesAdjustedCloseFallback: boolean;
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
  primarySourceAttempted: 'YAHOO' | null;
  fallbackSourcesAttempted: string[];
  sourceFallbackReason: string | null;
  contextGaps: string[];
  warnings: string[];
  priceHistory: TrustedReviewUniversePriceRow[];
}

export interface MarketDataRepairRequest {
  region?: string;
  assetType?: string;
  batchSize?: number;
  limit?: number;
  offset?: number;
  excludeStockIds?: string[];
  includeRetryFailed?: boolean;
  providerValidationQueue?: ProviderValidationQueue;
  force?: boolean;
  fullReload?: boolean;
  policy?: 'AUTO_DEEP_FOR_SHALLOW' | 'FORCE_DEEP';
  workerConcurrency?: number;
  csvText?: string;
  catalogSource?: CatalogSource | string;
  importMode?: 'MANUAL_CSV' | 'CONFIGURED_URL';
}

export type ProviderValidationQueue = 'UNKNOWN_FIRST' | 'RETRY_FAILED';

export type MarketDataRepairRunAction =
  | 'VALIDATE_PROVIDERS'
  | 'RETRY_FAILED_PROVIDERS'
  | 'CATALOG_IDENTITY_REPAIR'
  | 'PROVIDER_BUSINESS_METADATA_REPAIR'
  | 'MANUAL_METADATA_IMPORT'
  | 'BACKFILL_PRICES';

export type MarketDataRepairRunStatus = 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'PARTIAL_BLOCKED' | 'PARTIAL_MANUAL_REQUIRED' | 'FAILED';

export type MarketDataRepairLaneCode =
  | 'PROVIDER_VALIDATION'
  | 'PRICE_BACKFILL'
  | 'STALE_EOD'
  | 'CATALOG_IDENTITY'
  | 'PROVIDER_BUSINESS_METADATA'
  | 'MANUAL_METADATA_IMPORT'
  | 'INSUFFICIENT_TRUSTED_UNIVERSE';

export interface MarketDataRepairLane {
  code: MarketDataRepairLaneCode;
  label: string;
  scope: {
    region: 'IN';
    assetType: 'STOCK';
  };
  affectedCount: number;
  eligibleNowCount: number;
  retryableFailureCount: number;
  manualRequiredCount: number;
  skippedRecentAttemptCount: number;
  boundedBatchSize: number;
  expectedEffect: string;
  lastRun: {
    id: string;
    status: MarketDataRepairRunStatus;
    startedAt: string;
    completedAt: string | null;
    successCount: number;
    failureCount: number;
    skippedCount: number;
    warningCount: number;
  } | null;
  nextAction: {
    enabled: boolean;
    actionCode: string;
    method: 'POST';
    endpoint: string;
    request: {
      region: 'IN';
      assetType: 'STOCK';
      batchSize: number;
      offset?: number;
      queueMode?: string;
    };
    disabledReason?: string;
  };
}

export interface TrustedUniverseRepairWorkbench {
  scope: {
    region: 'IN';
    assetType: 'STOCK';
  };
  generatedAt: string;
  readinessSummary: ReviewReadinessSummary;
  repairRun: MarketDataRepairRunRecord | null;
  lanes: MarketDataRepairLane[];
  recommendedNextLane: MarketDataRepairLaneCode | null;
  warnings: string[];
}

export interface MarketDataRepairRunRequest extends MarketDataRepairRequest {
  maxBatchesPerAction?: number;
  actions?: MarketDataRepairRunAction[];
  dryRun?: boolean;
  mode?: 'DRAIN_UNTIL_BLOCKED';
}

export interface MarketDataRepairSourceIdentity {
  action?: MarketDataRepairRunAction;
  catalogSource?: string;
  importMode?: string;
  sourceKey?: string;
  sourceUrl?: string | null;
  urlSource?: string | null;
  rowCount?: number;
  contentSha256?: string;
  rowsSha256?: string;
}

export interface MarketDataRepairPlan {
  scope: {
    region: string;
    assetType: string;
  };
  generatedAt: string;
  totalCatalogInstruments: number;
  providerUnknownValidationNeeded: number;
  providerRetryValidationNeeded: number;
  providerUnsupportedExcluded: number;
  providerValidationFailed: number;
  providerValidationNeeded: number;
  retryFailedValidations: number;
  providerRetryBlocked?: number;
  providerManualRepairRequired?: number;
  nextProviderRetryAtMin?: string | null;
  historyCoverageIncomplete?: number;
  historyCoverageListingDateMissing?: number;
  historyCoverageFallbackRequired?: number;
  supportedCatalogIdentityRepairNeeded: number;
  supportedBusinessMetadataRepairNeeded: number;
  supportedPriceBackfillNeeded: number;
  unsupportedExcluded: number;
  catalogIdentityRepairNeeded: number;
  priceBackfillNeeded: number;
  businessMetadataRepairNeeded: number;
  businessMetadataAutoRepairable: number;
  businessMetadataManualRequired: number;
  businessMetadataRetryBlocked: number;
  businessMetadataRetryEligible: number;
  businessMetadataRecentlyAttempted: number;
  metadataEnrichmentNeeded: number;
  manualMetadataRequired: number;
  manualBusinessMetadataRequired: number;
  missingIsin: number;
  missingListingDate: number;
  missingSector: number;
  missingIndustry: number;
  missingMarketCap: number;
  businessMetadataBlockerDiagnostics?: {
    requiredFields: Array<'sector' | 'industry' | 'marketCap'>;
    unresolvedTotal: number;
    missingSector: number;
    missingIndustry: number;
    missingMarketCap: number;
    byMissingFieldSet: Record<string, number>;
  };
  manualSectorIndustryRequired: number;
  topActions: Array<{
    action:
      | 'VALIDATE_PROVIDERS'
      | 'RETRY_FAILED_PROVIDERS'
      | 'CATALOG_IDENTITY_REPAIR'
      | 'PROVIDER_BUSINESS_METADATA_REPAIR'
      | 'BACKFILL_PRICES'
      | 'MANUAL_METADATA_IMPORT';
    label: string;
    count: number;
  }>;
  warnings: string[];
  universeSignoff: MarketDataUniverseSignoff;
}

export interface MarketDataManualMetadataTemplateRow {
  symbol: string;
  providerSymbol: string | null;
  companyName: string | null;
  exchange: string | null;
  currentSector: string | null;
  currentIndustry: string | null;
  currentMarketCap: number | null;
  requiredFields: string[];
  suggestedSource: string;
  notes: string;
}

export interface MarketDataManualMetadataTemplate {
  scope: {
    region: string;
    assetType: string;
  };
  generatedAt: string;
  count: number;
  rows: MarketDataManualMetadataTemplateRow[];
  csvText: string;
}

export interface MarketDataRepairSummary {
  scope: {
    region: string;
    assetType: string;
  };
  processedCount: number;
  totalCount: number;
  batchSize: number;
  workerConcurrency?: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  updated: number;
  skipped: number;
  failed: number;
  noOp?: number;
  partialSuccess?: number;
  manualRequired?: number;
  providerNotFound?: number;
  skippedRecentAttempt?: number;
  remainingAutoRepairable?: number;
  remainingManualRequired?: number;
  catalogIdentityRepaired?: number;
  providerBusinessMetadataRepaired?: number;
  fieldsFilled?: Record<string, number>;
  warnings: string[];
  durationMs: number;
  providerValidationQueue?: ProviderValidationQueue;
  providerValidated?: number;
  providerSupported?: number;
  providerUnsupported?: number;
  validationFailed?: number;
  supportedFromStoredPrices?: number;
  unsupportedNoProviderSymbol?: number;
  unsupportedNoCandlesWideWindow?: number;
  retryableTimeout?: number;
  retryableProviderError?: number;
  retryableRateLimited?: number;
  manualSymbolRepairRequired?: number;
  retryCooldownSkipped?: number;
  manualRequiredSkipped?: number;
  providerCalls?: number;
  providerThrottleMs?: number;
  providerTimeouts?: number;
  providerRetryableFailures?: number;
  freeFallbackRequired?: number;
  fallbackSourceAttempted?: string | null;
  slowProviderCalls?: number;
  maxProviderCallMs?: number;
  p95ProviderCallMs?: number;
  validationWindowStartDate?: string | null;
  validationWindowEndDate?: string | null;
  requiredHistoryStartDate?: string | null;
  requiredHistoryCoverageStatus?: 'COMPLETE' | 'NEEDS_BACKFILL' | 'FALLBACK_REQUIRED' | string | null;
  listingDate?: string | null;
  listingDateMissing?: boolean;
  storedHistoryStartDate?: string | null;
  storedHistoryEndDate?: string | null;
  storedHistoryBars?: number;
  requiredHistoryMinimumBars?: number;
  storedHistoryCoveragePercent?: number;
  requiredHistoryComplete?: boolean;
  remainingUnknown?: number;
  remainingRetryEligible?: number;
  remainingRetryBlocked?: number;
  nextRetryAtMin?: string | null;
  sampleResults?: Array<{
    symbol: string;
    providerSymbol?: string | null;
    status: ProviderSupportStatus | string;
    classification: ProviderValidationClassification;
    candlesFound?: number;
    providerCallMs?: number;
    nextRetryAt?: string | null;
    message?: string | null;
    validationWindowStartDate?: string | null;
    validationWindowEndDate?: string | null;
    requiredHistoryStartDate?: string | null;
    listingDate?: string | null;
    listingDateMissing?: boolean;
    storedHistoryStartDate?: string | null;
    storedHistoryEndDate?: string | null;
    storedHistoryBars?: number;
    requiredHistoryMinimumBars?: number;
    storedHistoryCoveragePercent?: number;
    requiredHistoryComplete?: boolean;
    sourceName?: string | null;
  }>;
  metadataEnriched?: number;
  priceRowsReceived?: number;
  priceRowsInserted?: number;
  priceRowsUpdated?: number;
  priceRowsNoOp?: number;
  zeroRowProviderReturns?: number;
  deepReloaded?: number;
  incrementalCaughtUp?: number;
  stillUnder120?: number;
  stillUnder200?: number;
  stillUnder252?: number;
  historyCoverageIncomplete?: number;
  historyCoverageListingDateMissing?: number;
  historyCoverageFallbackRequired?: number;
  sampleCoverageResults?: Array<{
    symbol: string;
    requiredHistoryStartDate: string;
    requiredHistoryEndDate?: string | null;
    listingDate?: string | null;
    listingDateMissing?: boolean;
    storedHistoryStartDate?: string | null;
    storedHistoryEndDate?: string | null;
    storedHistoryBars?: number;
    requiredHistoryMinimumBars?: number;
    storedHistoryCoveragePercent?: number;
    requiredHistoryComplete?: boolean;
    coverageStatus?: string;
    sourceFallbackReason?: string | null;
  }>;
  latestCompletedEodDate?: string | null;
  targetEndDate?: string | null;
  remainingCandidates?: number;
  processedStockIds?: string[];
  fieldProvenance?: Array<{
    instrumentId: string;
    symbol: string;
    sectorSource?: string | null;
    industrySource?: string | null;
    marketCapSource?: string | null;
    isinSource?: string | null;
    listingDateSource?: string | null;
    metadataUpdatedAt: string;
  }>;
  catalogSource?: string;
  catalogRowsRead?: number;
  downloaded?: boolean;
  matchedExistingRows?: number;
  unmatchedCatalogRows?: number;
  sourceFingerprint?: string;
  sourceIdentity?: MarketDataRepairSourceIdentity;
}

export interface MarketDataRepairRunActionResult {
  action: MarketDataRepairRunAction;
  label: string;
  estimatedTotal: number;
  estimatedBatchCount: number;
  batchesPlanned: number;
  batchesExecuted: number;
  dryRun: boolean;
  hasMore: boolean;
  anotherRunNeeded: boolean;
  totals: {
    processedCount: number;
    updated: number;
    skipped: number;
    failed: number;
    noOp: number;
    manualRequired: number;
  };
  summaries: MarketDataRepairSummary[];
  warnings: string[];
  error?: string;
  sourceFingerprint?: string;
  sourceIdentity?: MarketDataRepairSourceIdentity;
  resumeOffset?: number;
}

export interface MarketDataRepairRunResponse {
  id: string | null;
  dryRun: boolean;
  scope: {
    region: string;
    assetType: string;
  };
  status: MarketDataRepairRunStatus;
  startedAt: string;
  completedAt: string | null;
  beforeHealth: MarketDataUniverseHealth;
  afterHealth: MarketDataUniverseHealth;
  beforeRepairPlan: MarketDataRepairPlan;
  afterRepairPlan: MarketDataRepairPlan;
  actions: MarketDataRepairRunActionResult[];
  summary: {
    actionsRequested: MarketDataRepairRunAction[];
    batchesExecuted: number;
    updated: number;
    skipped: number;
    failed: number;
    noOp: number;
    manualRequired: number;
  };
  warnings: string[];
  anotherRunNeeded: boolean;
  hardBlockersRemaining: UniverseReadinessBlockerSummary[];
  expectedNextAction: MarketDataRepairRunAction | null;
  afterTrustStatus: UniverseTrustStatus;
  universeSignoff: MarketDataUniverseSignoff;
  error?: string | null;
}

export interface MarketDataRepairRunRecord {
  id: string;
  scope: {
    region: string;
    assetType: string;
  };
  status: MarketDataRepairRunStatus;
  startedAt: string;
  completedAt: string | null;
  beforeHealth: MarketDataUniverseHealth | null;
  afterHealth: MarketDataUniverseHealth | null;
  beforeRepairPlan: MarketDataRepairPlan | null;
  afterRepairPlan: MarketDataRepairPlan | null;
  actions: MarketDataRepairRunActionResult[];
  summary: MarketDataRepairRunResponse['summary'] | null;
  warnings: string[];
  anotherRunNeeded: boolean;
  hardBlockersRemaining: UniverseReadinessBlockerSummary[];
  expectedNextAction: MarketDataRepairRunAction | null;
  afterTrustStatus: UniverseTrustStatus | null;
  universeSignoff: MarketDataUniverseSignoff | null;
  error?: string | null;
}

export interface V1IngestionRequest {
  symbol?: string;
  instrumentId?: string;
  region?: string;
  company_name?: string;
  exchange?: string;
  currency?: string;
  asset_type?: string;
  isin?: string;
  fullReload?: boolean;
  force?: boolean;
}

export interface V1SyncResult {
  success: boolean;
  instrument: V1Instrument | null;
  message: string;
  pricesStored?: boolean;
  fundamentalsAvailable?: boolean;
  corporateActionsAvailable?: boolean;
  syncSummary?: SyncSummary;
  errors?: string[];
  
  // Detailed Audit Counts
  instrumentsReceived?: number;
  instrumentsInserted?: number;
  instrumentsUpdated?: number;
  instrumentsSkipped?: number;

  priceRowsReceived?: number;
  priceRowsInserted?: number;
  priceRowsUpdated?: number;
  priceRowsSkipped?: number;

  fundamentalsReceived?: number;
  fundamentalsInserted?: number;
  fundamentalsUpdated?: number;
  fundamentalsSkipped?: number;

  corporateActionsReceived?: number;
  corporateActionsInserted?: number;
  corporateActionsUpdated?: number;
  corporateActionsSkipped?: number;

  fxRatesReceived?: number;
  fxRatesInserted?: number;
  fxRatesUpdated?: number;
  fxRatesSkipped?: number;

  warningCount?: number;
  warnings?: string[];
  durationMs?: number;
  duplicateProviderRowsSkipped?: number;
  malformedRowsSkipped?: number;
  noNewData?: boolean;
  skippedBeforeFetchCount?: number;
  providerFetchSkippedCount?: number;
  skippedReasonCounts?: Record<string, number>;
  skippedReasons?: string[];
  lastCheckedAt?: string;
  nextEligibleSyncAt?: string;
}

export interface UpdateStockRequest {
  name?: string;
  region?: string;
  exchange?: string;
  isActive?: boolean;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: 'symbol' | 'name' | 'marketCap' | 'country' | 'exchange' | 'sector' | 'industry' | 'currency' | 'assetType' | 'lastSuccessfulDataLoadTimestamp' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  region?: string;
  country?: string;
  exchange?: string;
  assetType?: string;
  instrumentSegment?: string;
  currency?: string;
  sector?: string;
  industry?: string;
  dataStatus?: string;
  catalogSource?: string;
  providerSupportStatus?: string;
  derivativesEligible?: boolean;
  search?: string;
}

export interface CatalogImportRequest {
  catalogSource: CatalogSource | string;
  importMode?: 'MANUAL_CSV' | 'CONFIGURED_URL' | 'INTERNAL_SEED';
  csvText?: string;
  validateProvider?: boolean;
  batchSize?: number;
  offset?: number;
}

export interface CatalogImportSummary {
  catalogSource: string;
  importMode?: 'MANUAL_CSV' | 'CONFIGURED_URL' | 'INTERNAL_SEED';
  downloaded?: boolean;
  downloadUrlName?: string;
  fileSizeBytes?: number;
  tempFileDeleted?: boolean;
  tempFileDeleteError?: string;
  processedCount?: number;
  totalCount?: number;
  batchSize?: number;
  offset?: number;
  nextOffset?: number | null;
  hasMore?: boolean;
  insertedCount?: number;
  updatedCount?: number;
  noOpCount?: number;
  invalidCount?: number;
  providerValidatedCount?: number;
  providerUnsupportedCount?: number;
  sourceRows: number;
  inserted: number;
  updated: number;
  noOp: number;
  skipped: number;
  invalid: number;
  providerValidated: number;
  providerUnsupported: number;
  underlyingsRead?: number;
  stockUnderlyingsMatched?: number;
  indexUnderlyingsMatched?: number;
  newInstrumentsCreated?: number;
  unmatchedUnderlyings?: number;
  warnings: string[];
  durationMs: number;
}

export interface CatalogBackfillRequest {
  region?: string;
  assetType?: string;
  catalogSource?: CatalogSource | string;
  batchSize?: number;
  limit?: number;
  offset?: number;
  validateProvider?: boolean;
  workerConcurrency?: number;
}

export interface CatalogBackfillSummary {
  catalogSource?: string;
  processedCount: number;
  totalCount: number;
  batchSize: number;
  workerConcurrency?: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  updated: number;
  noOp: number;
  skipped: number;
  validated: number;
  providerUnsupported: number;
  warnings: string[];
  durationMs: number;
}

export interface CoreFundamentals {
  symbol: string;
  revenue: number | null;
  eps: number | null;
  earnings: number | null;
  dividendYield: number | null;
  sharesOutstanding: number | null;
  marketCap: number | null;
  currency: string | null;
  periodType: string;
  ratios: {
    trailingPe: number | null;
    forwardPe: number | null;
    priceToBook: number | null;
    profitMargins: number | null;
    returnOnEquity: number | null;
    debtToEquity: number | null;
  };
  source: string;
  asOf: string;
}

export type CorporateActionType = 'dividend' | 'split';

export interface CorporateAction {
  symbol: string;
  type: CorporateActionType | 'reverse_split';
  date: string;
  value: number | string;
  declaredDate?: string | null;
  paymentDate?: string | null;
  amount?: number | null;
  splitRatio?: number | null;
  currency?: string | null;
  source: string;
}

export interface FxRateInput {
  pair: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  rateTimestamp: Date;
  source: string;
  dataStatus?: MarketDataStatus;
}

export interface ValidationResult<T> {
  valid: T[];
  invalid: Array<{
    item: unknown;
    errors: string[];
  }>;
}

export interface StockSyncTask {
  id: string;
  symbol: string;
  providerSymbol?: string | null;
  lastSuccessfulDataLoadTimestamp: Date | null;
  latestStoredTimestamp?: Date | null;
}

export interface WorkerResult {
  symbol: string;
  success: boolean;
  message: string;
  timestamp: string;
  workerId: number;
  rowsReceived?: number;
  rowsInserted?: number;
  rowsUpdated?: number;
  rowsSkipped?: number;
  rowsNoOp?: number;
  noNewData?: boolean;
  warningCount?: number;
  warnings?: string[];
}

export type CatalogSyncRunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PARTIAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED';

export interface CatalogSyncRunRequest {
  region?: string;
  assetType?: string;
  batchSize?: number;
  workerCount?: number;
  workerConcurrency?: number;
  delayBetweenBatchesMs?: number;
  force?: boolean;
  fullReload?: boolean;
  maxBatches?: number;
}

export interface CatalogSyncRunError {
  symbol?: string;
  message: string;
  timestamp: string;
}

export interface CatalogSyncRunStatusResponse {
  success: boolean;
  runId: string;
  status: CatalogSyncRunStatus;
  message: string;
  region: string;
  assetType: string;
  scopeType: 'CATALOG';
  batchSize: number;
  workerCount: number;
  workerConcurrency: number;
  delayBetweenBatchesMs: number;
  maxBatches: number;
  totalCount: number;
  processedCount: number;
  currentBatchNumber: number;
  batchesPlanned: number;
  batchesExecuted: number;
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
  noOpCount: number;
  rowsReceived: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  warningCount: number;
  warnings: string[];
  recentErrors: CatalogSyncRunError[];
  hasMore: boolean;
  percentComplete: number;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  statusUrl: string;
  alreadyRunning?: boolean;
  cancelRequested?: boolean;
}

export interface PriceBackfillRunError {
  symbol?: string;
  message: string;
  timestamp: string;
}

export interface PriceBackfillRunRequest extends MarketDataRepairRequest {
  maxBatches?: number;
  maxBatchesPerAction?: number;
}

export interface PriceBackfillRunStatusResponse {
  success: boolean;
  runId: string;
  status: CatalogSyncRunStatus;
  message: string;
  region: string;
  assetType: string;
  scopeType: 'PRICE_BACKFILL';
  batchSize: number;
  workerConcurrency: number;
  providerThrottleMs: number;
  maxBatches: number;
  totalCount: number;
  processedCount: number;
  currentBatchNumber: number;
  batchesPlanned: number;
  batchesExecuted: number;
  updated: number;
  skipped: number;
  failed: number;
  noOp: number;
  priceRowsReceived: number;
  priceRowsInserted: number;
  priceRowsUpdated: number;
  priceRowsNoOp: number;
  zeroRowProviderReturns: number;
  warningCount: number;
  warnings: string[];
  recentErrors: PriceBackfillRunError[];
  latestBatch: MarketDataRepairSummary | null;
  remainingCandidates: number;
  hasMore: boolean;
  percentComplete: number;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  statusUrl: string;
  alreadyRunning?: boolean;
  cancelRequested?: boolean;
}
