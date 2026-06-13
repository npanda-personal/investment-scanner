import type {
  MarketDataStatus,
  ProviderSupportStatus,
  CatalogSource,
  UniverseState,
  ProviderValidationClassification,
  TrustedBaselineResidualState,
  TrustedBaselineRequiredHistoryStatus,
  TrustedBaselineListingDateStatus,
  TrustedBaselineProviderFallbackState,
} from './market-data-foundation.types.core';

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
  primary_source_attempted?: 'NSE_BSE_EXCHANGE_EOD' | 'YAHOO' | 'YAHOO_EOD' | null;
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

export interface UpdateStockRequest {
  name?: string;
  region?: string;
  exchange?: string;
  isActive?: boolean;
}

export interface StockSyncTask {
  id: string;
  symbol: string;
  exchange?: string | null;
  providerSymbol?: string | null;
  sourceSymbol?: string | null;
  displaySymbol?: string | null;
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
