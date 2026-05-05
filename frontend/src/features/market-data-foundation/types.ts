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
  exchange: string | null;
  country: string | null;
  sector: string | null;
  industry: string | null;
  currency: string;
  market_cap: number | null;
  asset_type: string;
  is_active: boolean;
  is_delisted: boolean;
  ipo_date: string | null;
  isin: string | null;
  source: string;
  ingestion_timestamp: string;
  last_updated_timestamp: string;
  data_status: 'COMPLETE' | 'PARTIAL' | 'DELAYED' | 'MISSING' | 'ERROR';
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
  currency?: string;
  sector?: string;
  industry?: string;
  search?: string;
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
