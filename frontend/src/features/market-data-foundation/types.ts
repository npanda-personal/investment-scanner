export interface Stock {
  id: string;
  symbol: string;
  name: string;
  region: string;
  exchange: string;
  isActive: boolean;
  lastSuccessfulDataLoadTimestamp: string | null;
  createdAt: string;
  updatedAt: string;
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
  provider_support_status?: string | null;
  catalog_source?: string | null;
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
  provider_readiness?: string;
  price_readiness?: 'READY' | 'MISSING_LATEST_PRICE' | 'MARKET_CALENDAR_UNCERTAIN' | 'STALE_LATEST_PRICE' | 'INADEQUATE_HISTORY' | 'MISSING_RECENT_VOLUME';
  metadata_readiness?: 'READY' | 'MISSING_REQUIRED_METADATA';
  review_readiness?: 'REVIEW_READY' | 'NOT_REVIEW_READY';
  trusted_baseline_residual_state?: string;
  trusted_baseline_blocker_codes?: string[];
  latest_completed_eod_date?: string | null;
  latest_completed_eod_present?: boolean;
  stored_data_through_date?: string | null;
  required_history_start_date?: string | null;
  required_history_end_date?: string | null;
  required_history_status?: string;
  listing_date_status?: string;
  provider_fallback_state?: string;
  primary_source_attempted?: string | null;
  fallback_sources_attempted?: string[];
  source_fallback_reason?: string | null;
  is_active: boolean;
  is_delisted: boolean;
  ipo_date: string | null;
  isin: string | null;
  source: string;
  ingestion_timestamp: string;
  last_updated_timestamp: string;
  data_status: 'COMPLETE' | 'PARTIAL' | 'DELAYED' | 'MISSING' | 'ERROR';
}

export type UniverseState =
  | 'CATALOG_ONLY'
  | 'PROVIDER_SUPPORTED'
  | 'PRICE_READY'
  | 'CONTEXT_READY'
  | 'REVIEW_READY'
  | 'UNSUPPORTED'
  | 'STALE_OR_INCOMPLETE'
  | 'DELISTED_OR_INACTIVE';

export type MarketDataRepairRunAction =
  | 'VALIDATE_PROVIDERS'
  | 'RETRY_FAILED_PROVIDERS'
  | 'CATALOG_IDENTITY_REPAIR'
  | 'PROVIDER_BUSINESS_METADATA_REPAIR'
  | 'MANUAL_METADATA_IMPORT'
  | 'BACKFILL_PRICES';

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
  counts: Record<UniverseState, number> & {
    byUniverseState: Record<UniverseState, number>;
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
  topBlockers: Array<{
    code: string;
    label: string;
    count: number;
    severity: 'warning' | 'critical';
  }>;
  warnings: string[];
  trustStatus: 'OK' | 'PARTIAL' | 'NOT_TRUSTWORTHY';
  trustReasons: string[];
  universeSignoff: MarketDataUniverseSignoff;
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
  status: 'READY' | 'LIMITED' | 'NOT_READY';
  mode: 'FULL_REVIEW' | 'LIMITED_REVIEW' | 'NO_REVIEW';
  minLiteCount: number;
  minFullCount: number;
  dataThroughDate: string | null;
  scanPolicy?: {
    scanLimit: number;
    scanComplete: boolean;
    scanOrdering: string;
  };
  excludedCounts: {
    providerUnknown: number;
    providerRetryFailed: number;
    providerUnsupported: number;
    inactiveOrDelisted: number;
    noLatestPrice: number;
    staleLatestPrice: number;
    requiredHistoryIncomplete?: number;
    insufficientBarsUnder120: number;
    insufficientBarsUnder200?: number;
    insufficientBarsUnder252: number;
    missingRecentVolume: number;
    corporateActionBlocked: number;
  };
  contextGapCounts: {
    missingSector: number;
    missingIndustry: number;
    missingMarketCap: number;
    missingIsin: number;
    missingListingDate: number;
  };
  warnings: string[];
}

export interface MarketDataStockMissingDataDiagnosticsCountMap {
  totalStocks?: number;
  activeStocks?: number;
  inactiveStocks?: number;
  providerUnknown?: number;
  providerUnknownValidationNeeded?: number;
  providerRetryValidationNeeded?: number;
  providerValidationNeeded?: number;
  missingProviderSymbol?: number;
  providerSymbolMismatch?: number;
  missingSourceSymbol?: number;
  sourceSymbolMismatch?: number;
  missingDisplaySymbol?: number;
  displaySymbolMismatch?: number;
  missingExchange?: number;
  exchangeMismatch?: number;
  missingCurrency?: number;
  currencyMismatch?: number;
  missingIsin?: number;
  missingListingDate?: number;
  missingSector?: number;
  missingIndustry?: number;
  missingMarketCap?: number;
  missingLatestPrice?: number;
  staleLatestPrice?: number;
  missingOrInadequatePriceHistory?: number;
  missingRecentVolume?: number;
  catalogIdentityRepairNeeded?: number;
  supportedCatalogIdentityRepairNeeded?: number;
  businessMetadataRepairNeeded?: number;
  businessMetadataAutoRepairable?: number;
  manualBusinessMetadataRequired?: number;
  manualMetadataRequired?: number;
  priceBackfillNeeded?: number;
  supportedPriceBackfillNeeded?: number;
  identityMismatches?: number;
  identityMismatchWarnings?: number;
  [key: string]: number | undefined;
}

export interface MarketDataStockMissingDataDiagnosticsActionCounts {
  providerValidation?: number;
  providerValidationNeeded?: number;
  catalogIdentityRepair?: number;
  catalogIdentityRepairNeeded?: number;
  providerBusinessMetadataRepair?: number;
  providerBusinessMetadataRepairNeeded?: number;
  manualMetadataImport?: number;
  manualMetadataImportNeeded?: number;
  priceBackfill?: number;
  priceBackfillNeeded?: number;
  [key: string]: number | undefined;
}

export interface MarketDataStockIdentityMismatchWarning {
  symbol: string;
  issue?: string;
  severity?: 'info' | 'warning' | 'critical';
  providerSymbol?: string | null;
  expectedProviderSymbol?: string | null;
  sourceSymbol?: string | null;
  expectedSourceSymbol?: string | null;
  displaySymbol?: string | null;
  expectedDisplaySymbol?: string | null;
  exchange?: string | null;
  expectedExchange?: string | null;
  isin?: string | null;
  expectedIsin?: string | null;
  alternateSymbol?: string | null;
  alternatePriceHistoryBars?: number;
  priceHistoryBars?: number;
}

export interface MarketDataStockMissingDataSample {
  id: string;
  symbol: string;
  name?: string | null;
  exchange?: string | null;
  providerSymbol?: string | null;
  sourceSymbol?: string | null;
  displaySymbol?: string | null;
  column?: string;
  issue: string;
  value?: string | null;
  expected?: string | null;
  reason: string;
  priceHistoryBars?: number;
  alternateSymbol?: string | null;
  alternatePriceHistoryBars?: number;
}

export interface MarketDataStockColumnMissingDataDiagnostic {
  column: string;
  label: string;
  totalRows: number;
  affectedCount: number;
  nullCount: number;
  blankCount: number;
  nullEquivalentCount: number;
  invalidCount: number;
  expectedNullCount: number;
  unexpectedNonNullCount: number;
  samples: MarketDataStockMissingDataSample[];
}

export interface MarketDataStockIdentityMismatchDiagnostic {
  code: string;
  label: string;
  count: number;
  samples: MarketDataStockMissingDataSample[];
}

export interface MarketDataStockMissingDataDiagnostics {
  scope: {
    region: string;
    assetType: string;
  };
  generatedAt?: string;
  activeStockCount?: number;
  sampleLimit?: number;
  columns?: MarketDataStockColumnMissingDataDiagnostic[];
  counts?: MarketDataStockMissingDataDiagnosticsCountMap;
  actionCounts?: MarketDataStockMissingDataDiagnosticsActionCounts;
  identityMismatchWarnings?: MarketDataStockIdentityMismatchWarning[];
  identityMismatches?: MarketDataStockIdentityMismatchDiagnostic[];
  warnings?: string[];
}

export interface ReviewReadinessBlocker {
  category:
    | 'PROVIDER_VALIDATION'
    | 'CATALOG_IDENTITY'
    | 'BUSINESS_METADATA'
    | 'PRICE_BACKFILL'
    | 'STALE_EOD'
    | 'INSUFFICIENT_TRUSTED_UNIVERSE'
    | 'MARKET_CALENDAR_UNCERTAIN';
  severity: 'HARD_BLOCKER' | 'LIMITED_REVIEW' | 'CONTEXT_GAP';
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

export interface ReviewReadinessSummary {
  scope: {
    region: string;
    assetType: string;
  };
  generatedAt: string;
  reviewMode: 'FULL_REVIEW' | 'LIMITED_REVIEW' | 'NO_REVIEW';
  trustStatus: 'OK' | 'PARTIAL' | 'NOT_TRUSTWORTHY';
  userDecision: 'WAIT' | 'REPAIR_DATA' | 'PROCEED_LIMITED' | 'READY_FOR_REVIEW';
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
  nextAction: {
    code: string;
    label: string;
    actionRoute?: string;
    boundedRequest?: {
      batchSize: number;
      region: string;
      assetType: string;
    };
  } | null;
  warnings: string[];
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
  providerRetryBlocked?: number;
  providerManualRepairRequired?: number;
  nextProviderRetryAtMin?: string | null;
  historyCoverageIncomplete?: number;
  historyCoverageListingDateMissing?: number;
  historyCoverageFallbackRequired?: number;
  sampleCoverageResults?: MarketDataCoverageSample[];
  providerUnsupportedExcluded: number;
  providerValidationFailed: number;
  providerValidationNeeded: number;
  retryFailedValidations: number;
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

export interface MarketDataRepairRequest {
  region?: string;
  assetType?: string;
  batchSize?: number;
  offset?: number;
  maxBatchesPerAction?: number;
  workerConcurrency?: number;
  includeRetryFailed?: boolean;
  providerValidationQueue?: 'UNKNOWN_FIRST' | 'RETRY_FAILED';
  force?: boolean;
  fullReload?: boolean;
  policy?: 'INCREMENTAL_LATEST_ONLY' | 'AUTO_DEEP_FOR_SHALLOW' | 'FORCE_DEEP';
  csvText?: string;
  catalogSource?: string;
  importMode?: 'MANUAL_CSV' | 'CONFIGURED_URL';
  actions?: MarketDataRepairRunAction[];
  dryRun?: boolean;
  mode?: 'DRAIN_UNTIL_BLOCKED';
}

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

export interface MarketDataManualMetadataTemplate {
  scope: {
    region: string;
    assetType: string;
  };
  generatedAt: string;
  count: number;
  csvText: string;
  rows: Array<{
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
  }>;
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

export interface MarketDataCoverageSample {
  symbol: string;
  requiredHistoryStartDate: string;
  requiredHistoryEndDate?: string | null;
  listingDate?: string | null;
  listingDateMissing?: boolean;
  storedHistoryStartDate?: string | null;
  storedHistoryEndDate?: string | null;
  storedHistoryBars?: number;
  requiredHistoryComplete?: boolean;
  coverageStatus?: string | null;
  sourceFallbackReason?: string | null;
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
  providerValidationQueue?: 'UNKNOWN_FIRST' | 'RETRY_FAILED';
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
  remainingUnknown?: number;
  remainingRetryEligible?: number;
  remainingRetryBlocked?: number;
  nextRetryAtMin?: string | null;
  sampleResults?: Array<{
    symbol: string;
    providerSymbol?: string | null;
    status?: string | null;
    classification?: string | null;
    candlesFound?: number | null;
    providerCallMs?: number | null;
    nextRetryAt?: string | null;
    message?: string | null;
  }>;
  metadataEnriched?: number;
  priceRowsReceived?: number;
  priceRowsInserted?: number;
  priceRowsUpdated?: number;
  priceRowsNoOp?: number;
  officialEodBulk?: OfficialEodBulkSyncEvidence | null;
  zeroRowProviderReturns?: number;
  deepReloaded?: number;
  incrementalCaughtUp?: number;
  remainingCandidates?: number;
  latestCompletedEodDate?: string | null;
  targetEndDate?: string | null;
  stillUnder120?: number;
  stillUnder200?: number;
  stillUnder252?: number;
  historyCoverageIncomplete?: number;
  historyCoverageListingDateMissing?: number;
  historyCoverageFallbackRequired?: number;
  sampleCoverageResults?: MarketDataCoverageSample[];
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

export interface OfficialEodBulkSyncEvidence {
  enabled: boolean;
  attempted: boolean;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceFileName: string | null;
  targetTradingDate: string | null;
  sourceFingerprint: string | null;
  rowsRead: number;
  rowsParsed: number;
  matchedInstruments: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsNoOp: number;
  fallbackReason?: string | null;
  warnings: string[];
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
  hardBlockersRemaining: MarketDataUniverseHealth['topBlockers'];
  expectedNextAction: MarketDataRepairRunAction | null;
  afterTrustStatus: MarketDataUniverseHealth['trustStatus'];
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
  hardBlockersRemaining: MarketDataUniverseHealth['topBlockers'];
  expectedNextAction: MarketDataRepairRunAction | null;
  afterTrustStatus: MarketDataUniverseHealth['trustStatus'] | null;
  universeSignoff: MarketDataUniverseSignoff | null;
  error?: string | null;
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

export interface V1InstrumentsResponse {
  instruments: V1Instrument[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface V1PriceRecord {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  adjusted_close: number;
  volume: number | null;
  source: string;
  ingestion_timestamp: string;
  last_updated_timestamp: string;
  data_status: string;
}

export interface V1PricesResponse {
  instrument_id: string;
  symbol: string;
  adjustment_strategy: string;
  source: string;
  ingestion_timestamp: string | null;
  last_updated_timestamp: string | null;
  data_status: string;
  prices: V1PriceRecord[];
}

export interface V1LatestPriceResponse {
  instrument_id: string;
  symbol: string;
  latest: (V1PriceRecord & { last_updated_timestamp: string }) | null;
  data_status: string;
}

export interface V1FundamentalRecord {
  revenue: number | null;
  eps: number | null;
  net_income: number | null;
  pe_ratio: number | null;
  dividend_yield: number | null;
  shares_outstanding: number | null;
  market_cap: number | null;
  currency: string | null;
  period_type: string;
  period_end_date: string;
  source: string;
  ingestion_timestamp: string;
  last_updated_timestamp: string;
  data_status: string;
}

export interface V1FundamentalsResponse {
  instrument_id: string;
  symbol: string;
  source: string;
  ingestion_timestamp: string | null;
  last_updated_timestamp: string | null;
  data_status: string;
  records: V1FundamentalRecord[];
}

export interface V1CorporateActionRecord {
  action_type: 'dividend' | 'split' | 'reverse_split';
  effective_date: string;
  declared_date: string | null;
  payment_date: string | null;
  value: number | string;
  ratio: number | string | null;
  amount: number | string | null;
  currency: string | null;
  source: string;
  ingestion_timestamp: string;
  last_updated_timestamp: string;
  data_status: string;
}

export interface V1CorporateActionsResponse {
  instrument_id: string;
  symbol: string;
  source: string;
  ingestion_timestamp: string | null;
  last_updated_timestamp: string | null;
  data_status: string;
  actions: V1CorporateActionRecord[];
}

export interface V1FxRate {
  pair: string;
  base_currency: string;
  quote_currency: string;
  rate: number;
  rate_timestamp: string;
  source: string;
  ingestion_timestamp: string;
  last_updated_timestamp: string;
  data_status: string;
}

export interface V1FxRatesResponse {
  source: string;
  ingestion_timestamp: string | null;
  last_updated_timestamp: string | null;
  data_status: string;
  rates: V1FxRate[];
}

export interface V1SyncRequest {
  symbol?: string;
  instrumentId?: string;
  region?: string;
  company_name?: string;
  exchange?: string;
  currency?: string;
  asset_type?: string;
  isin?: string;
}

export interface V1SyncResponse {
  success: boolean;
  instrument: V1Instrument | null;
  message: string;
  pricesStored?: boolean;
  fundamentalsAvailable?: boolean;
  corporateActionsAvailable?: boolean;
  syncSummary?: {
    rowsReceived: number;
    rowsInserted: number;
    rowsUpdated: number;
    rowsSkipped: number;
    warningCount: number;
    warnings: string[];
  };
  errors?: string[];
}

export interface MarketDataHealth {
  status: string;
  module: string;
  instrumentCount: number;
  latestDataTimestamp: string | null;
  source: string;
  ingestion_timestamp: string;
  last_updated_timestamp: string | null;
  data_status: string;
  timestamp: string;
  region?: string;
  assetType?: string;
}

export interface CreateStockRequest {
  symbol: string;
  name: string;
  region: string;
  exchange: string;
}

export interface UpdateStockRequest {
  symbol?: string;
  name?: string;
  region?: string;
  exchange?: string;
  isActive?: boolean;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
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
  catalogSource: string;
  importMode?: 'MANUAL_CSV' | 'CONFIGURED_URL' | 'INTERNAL_SEED';
  csvText?: string;
  batchSize?: number;
  offset?: number;
}

export interface CatalogImportResponse {
  success: boolean;
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
  message?: string;
}

export interface CatalogSourceInfo {
  catalogSource: string;
  displayName: string;
  enabled: boolean;
  region: string;
  assetType?: string;
  segmentClass?: string;
  fileType: string;
  parserType: string;
  importModes: string[];
  urlConfigured: boolean;
  urlSource: 'DEFAULT' | 'ENV' | 'NONE' | 'INTERNAL_SEED';
  setupHint?: string;
  supportsManualCsv: boolean;
  supportsConfiguredUrl: boolean;
  supportsInternalSeed: boolean;
  lastImportedAt: string | null;
}

export interface CatalogBackfillRequest {
  region?: string;
  assetType?: string;
  catalogSource?: string;
  batchSize?: number;
  offset?: number;
  workerConcurrency?: number;
}

export interface CatalogBackfillResponse {
  success: boolean;
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
  message?: string;
}

export interface PaginatedResponse {
  stocks: Stock[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BackendPaginatedResponse {
  stocks: Stock[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface HistoricalPrice {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  region: string;
  exchange: string;
}

export interface IngestResponse {
  success: boolean;
  message: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
}

export interface BulkSyncResponse {
  success: boolean;
  message: string;
  totalStocks?: number;
  succeeded?: number;
  failed?: number;
  noNewData?: boolean;
  skippedBeforeFetchCount?: number;
  providerFetchSkippedCount?: number;
  skippedReasonCounts?: Record<string, number>;
  skippedReasons?: string[];
  lastCheckedAt?: string;
  nextEligibleSyncAt?: string;
  workerCount?: number;
  workerConcurrency?: number;
  errors?: Array<{ symbol: string; success: boolean; message: string; timestamp: string; workerId?: number }>;
  timestamp?: string;
}

export type MarketDataCatalogSyncRunStatus = 'PENDING' | 'RUNNING' | 'PARTIAL' | 'COMPLETED' | 'FAILED' | 'CANCELED';

export interface MarketDataCatalogSyncRunRequest {
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

export interface MarketDataCatalogSyncRunRecentError {
  symbol?: string;
  message: string;
  timestamp?: string;
}

export interface MarketDataCatalogSyncRunResponse {
  success: boolean;
  runId: string;
  status: MarketDataCatalogSyncRunStatus;
  message?: string;
  region: string;
  assetType: string;
  scopeType?: 'CATALOG' | string;
  batchSize?: number;
  workerCount?: number;
  workerConcurrency?: number;
  delayBetweenBatchesMs?: number;
  maxBatches?: number;
  totalCount?: number;
  processedCount?: number;
  currentBatchNumber?: number;
  batchesPlanned?: number;
  batchesExecuted?: number;
  succeededCount?: number;
  failedCount?: number;
  skippedCount?: number;
  noOpCount?: number;
  rowsReceived?: number;
  rowsInserted?: number;
  rowsUpdated?: number;
  rowsSkipped?: number;
  warningCount?: number;
  warnings?: string[];
  recentErrors?: MarketDataCatalogSyncRunRecentError[];
  hasMore?: boolean;
  percentComplete?: number;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  statusUrl?: string;
  alreadyRunning?: boolean;
}

export interface MarketDataCatalogSyncRunNotFoundResponse {
  success: false;
  code: 'RUN_NOT_FOUND' | string;
  message: string;
}

export interface MarketDataPriceBackfillRunRequest extends MarketDataRepairRequest {
  maxBatches?: number;
}

export interface MarketDataPriceBackfillRunResponse {
  success: boolean;
  runId: string;
  status: MarketDataCatalogSyncRunStatus;
  message?: string;
  region: string;
  assetType: string;
  scopeType?: 'PRICE_BACKFILL' | string;
  batchSize?: number;
  workerConcurrency?: number;
  providerThrottleMs?: number;
  maxBatches?: number;
  totalCount?: number;
  processedCount?: number;
  currentBatchNumber?: number;
  batchesPlanned?: number;
  batchesExecuted?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
  noOp?: number;
  priceRowsReceived?: number;
  priceRowsInserted?: number;
  priceRowsUpdated?: number;
  priceRowsNoOp?: number;
  zeroRowProviderReturns?: number;
  warningCount?: number;
  warnings?: string[];
  recentErrors?: MarketDataCatalogSyncRunRecentError[];
  latestBatch?: MarketDataRepairSummary | null;
  remainingCandidates?: number;
  hasMore?: boolean;
  percentComplete?: number;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  statusUrl?: string;
  alreadyRunning?: boolean;
  cancelRequested?: boolean;
}

export interface MarketDataSourceFileImportRecord {
  id: string;
  source: string;
  segment: string;
  tradingDate: string | null;
  fileName: string;
  fileUrl: string | null;
  fileHash: string;
  fileSize: number | null;
  status: string;
  rowsRaw: number;
  rowsAccepted: number;
  rowsRejected: number;
  parserVersion: string;
  importedAt: string | null;
  errorMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MarketDataSourceFileImportsResponse {
  count: number;
  imports: MarketDataSourceFileImportRecord[];
}

export interface ExchangeHistoricalBackfillRequest {
  region?: string;
  assetType?: string;
  startDate: string;
  endDate: string;
  maxDates?: number;
  workerCount?: number;
  maxRetries?: number;
  includeBseFill?: boolean;
}

export type ExchangeHistoricalBackfillRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'CANCELLED' | 'BLOCKED';
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

export interface ExchangeHistoricalBackfillJobRecord {
  id: string;
  tradingDate: string;
  dateRange: string;
  status: ExchangeHistoricalBackfillJobStatus;
  source: 'NSE' | 'NSE+BSE';
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
}

export interface ExchangeHistoricalBackfillResponse {
  runId: string;
  status: ExchangeHistoricalBackfillRunStatus;
  source: 'NSE';
  segment: 'CM';
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
  datesAttempted?: number;
  datesSkippedAlreadyImported?: number;
  queuedInstrumentCount?: number;
  hasMore?: boolean;
  nextStartDate?: string | null;
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
}

export interface ManualVerifiedFundamentalImportRequest {
  stockId: string;
  region?: string;
  assetType?: string;
  periodType: string;
  periodEndDate: string;
  revenue?: number | null;
  eps?: number | null;
  netIncome?: number | null;
  peRatio?: number | null;
  marketCap?: number | null;
  sourceNote?: string | null;
  sourceUrl?: string | null;
  validatedBy?: string | null;
  validatedAt?: string | null;
  currency?: string | null;
}

export interface MarketDataSchedulerRegionStatus {
  region: string;
  assetType: string;
  sessionState: string;
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

export interface PricesResponse {
  symbol: string;
  prices: HistoricalPrice[];
}

export interface CoreFundamentals {
  symbol: string;
  revenue: number | null;
  earnings: number | null;
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

export interface CorporateAction {
  symbol: string;
  type: 'dividend' | 'split';
  date: string;
  value: number | string;
  source: string;
}

export interface CorporateActionsResponse {
  symbol: string;
  actions: CorporateAction[];
}

// ---------------------------------------------------------------------------
// Multi-Factor Screener
// ---------------------------------------------------------------------------

export type ScreenerCapBand = 'LARGE' | 'MID' | 'SMALL';
export type ScreenerSignalDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface ScreenerFilters {
  signalDirection?: ScreenerSignalDirection;
  minScore?: number;
  minRsPercentile?: number;
  sector?: string;
  capBand?: ScreenerCapBand;
  minDeliveryPct?: number;
  min52wPositionPct?: number;
  excludeFnoBan?: boolean;
  limit?: number;
}

export interface ScreenerRow {
  instrumentId: string;
  symbol: string;
  companyName: string;
  price: number | null;
  signalDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;
  signalScore: number | null;
  rsPercentile: number | null;
  sector: string | null;
  capBand: ScreenerCapBand | null;
  deliveryPct: number | null;
  range52wPositionPct: number | null;
  inFnoBan: boolean;
}

export interface ScreenerResult {
  generatedAt: string;
  count: number;
  results: ScreenerRow[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Market Scans
// ---------------------------------------------------------------------------

export interface MarketScanRow52w {
  instrumentId: string;
  symbol: string;
  companyName: string;
  sector: string | null;
  latestDate: string;
  currentPrice: number;
  high52w: number;
  low52w: number;
  pctFromHigh: number;
  pctFromLow: number;
  priceBasis: 'ADJUSTED_CLOSE' | 'CLOSE_FALLBACK';
  signalDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;
  signalScore: number | null;
}

export interface MarketScanSummary52w {
  scanType: '52w-high' | '52w-low';
  scope: { region: string; assetType: string };
  generatedAt: string;
  proximityPct: number;
  results: MarketScanRow52w[];
  warnings: string[];
}

export interface MarketScanRowDeliverySpike {
  instrumentId: string;
  symbol: string;
  companyName: string;
  sector: string | null;
  tradingDate: string;
  deliveryPct: number;
  avgDeliveryPct: number;
  spikeRatio: number;
  lookbackBars: number;
  signalDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;
  signalScore: number | null;
}

export interface MarketScanSummaryDeliverySpike {
  scanType: 'delivery-spike';
  scope: { region: string; assetType: string };
  generatedAt: string;
  minSpikeRatio: number;
  results: MarketScanRowDeliverySpike[];
  warnings: string[];
}

export interface MarketScanRowVolumeSpike {
  instrumentId: string;
  symbol: string;
  companyName: string;
  sector: string | null;
  latestDate: string;
  latestVolume: number;
  avgVolume: number;
  spikeRatio: number;
  lookbackBars: number;
  signalDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;
  signalScore: number | null;
}

export interface MarketScanSummaryVolumeSpike {
  scanType: 'volume-spike';
  scope: { region: string; assetType: string };
  generatedAt: string;
  minSpikeRatio: number;
  results: MarketScanRowVolumeSpike[];
  warnings: string[];
}
