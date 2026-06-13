import type {
  UniverseTrustStatus,
  TrustedReviewUniverseStatus,
  TrustedReviewUniverseMode,
  ReviewReadinessBlockerCategory,
  ReviewReadinessBlockerSeverity,
  ReviewReadinessUserDecision,
  TrustedBaselineResidualState,
  TrustedBaselineRequiredHistoryStatus,
  TrustedBaselineListingDateStatus,
  TrustedBaselineProviderFallbackState,
} from './market-data-foundation.types.core';
import type { MarketDataRepairRunAction } from './market-data-foundation.types.repair';

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
  /** Adjustment factor = adjustedClose / close when close > 0, else 1.
   *  Applied compute-on-read; no schema change required. */
  adjustmentFactor: number;
  /** Raw open * adjustmentFactor. Falls back to raw open when factor cannot be computed. */
  adjustedOpen: number;
  /** Raw high * adjustmentFactor. Falls back to raw high when factor cannot be computed. */
  adjustedHigh: number;
  /** Raw low * adjustmentFactor. Falls back to raw low when factor cannot be computed. */
  adjustedLow: number;
  /** Raw volume / adjustmentFactor. Falls back to raw volume when factor cannot be computed. */
  adjustedVolume: number | null;
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
  primarySourceAttempted: 'NSE_BSE_EXCHANGE_EOD' | 'YAHOO' | 'YAHOO_EOD' | null;
  fallbackSourcesAttempted: string[];
  sourceFallbackReason: string | null;
  contextGaps: string[];
  warnings: string[];
  priceHistory: TrustedReviewUniversePriceRow[];
  /** Whether this instrument is eligible for F&O / derivatives trading on NSE/BSE.
   *  Null means the flag was not available (treat as non-F&O for short-review gating). */
  derivativesEligible: boolean | null;
  /** Stock's sector from catalog metadata. Null when absent (sector will appear in contextGaps). */
  sector: string | null;
}
