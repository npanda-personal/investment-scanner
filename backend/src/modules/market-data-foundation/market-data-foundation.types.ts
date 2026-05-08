export interface HistoricalPrice {
  symbol: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose?: number | null;
  volume?: number;
}

export type MarketDataStatus = 'COMPLETE' | 'PARTIAL' | 'DELAYED' | 'MISSING' | 'ERROR';

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
  isDelisted?: boolean;
  ipoDate?: Date | null;
  isin?: string | null;
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
  exchange: string | null;
  country: string | null;
  region?: string | null;
  sector: string | null;
  industry: string | null;
  currency: string;
  market_cap: number | null;
  asset_type: string;
  instrument_segment: string;
  metadata_completeness_score?: number;
  missing_metadata_fields?: string[];
  is_active: boolean;
  is_delisted: boolean;
  ipo_date: string | null;
  isin: string | null;
  source: string;
  ingestion_timestamp: string;
  last_updated_timestamp: string;
  data_status: MarketDataStatus;
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
  search?: string;
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
  lastSuccessfulDataLoadTimestamp: Date | null;
}

export interface WorkerResult {
  symbol: string;
  success: boolean;
  message: string;
  timestamp: string;
  workerId: number;
}
