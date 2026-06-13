import type {
  CatalogSource,
  ProviderSupportStatus,
  ProviderValidationClassification,
  UniverseTrustStatus,
} from './market-data-foundation.types.core';
import type { OfficialEodBulkSyncEvidence } from './market-data-foundation.types.scans';
import type {
  MarketDataUniverseHealth,
  MarketDataUniverseSignoff,
  UniverseReadinessBlockerSummary,
  ReviewReadinessSummary,
} from './market-data-foundation.types.universe';

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
  policy?: 'INCREMENTAL_LATEST_ONLY' | 'AUTO_DEEP_FOR_SHALLOW' | 'FORCE_DEEP';
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
  officialEodBulk?: OfficialEodBulkSyncEvidence | null;
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
