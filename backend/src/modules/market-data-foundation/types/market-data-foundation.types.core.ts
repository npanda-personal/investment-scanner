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

export interface RegionInfo {
  region?: string;
  exchange?: string;
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

export interface ValidationResult<T> {
  valid: T[];
  invalid: Array<{
    item: unknown;
    errors: string[];
  }>;
}
