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
  currency: string;
  asset_type: string;
  isin: string | null;
  source: string;
  ingestion_timestamp: string;
  last_updated_timestamp: string;
  data_status: 'COMPLETE' | 'PARTIAL' | 'DELAYED';
}

export interface V1CreateInstrumentRequest {
  symbol: string;
  company_name: string;
  exchange: string;
  currency: string;
  asset_type: string;
  isin?: string;
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
  data_status: string;
}

export interface V1PricesResponse {
  instrument_id: string;
  symbol: string;
  adjustment_strategy: string;
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
  net_income: number | null;
  pe_ratio: number | null;
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
  records: V1FundamentalRecord[];
}

export interface V1CorporateActionRecord {
  action_type: 'dividend' | 'split';
  effective_date: string;
  value: number | string;
  ratio: number | string | null;
  amount: number | string | null;
  source: string;
  ingestion_timestamp: string;
  last_updated_timestamp: string;
  data_status: string;
}

export interface V1CorporateActionsResponse {
  instrument_id: string;
  symbol: string;
  actions: V1CorporateActionRecord[];
}

export interface V1SyncRequest {
  symbol?: string;
  instrumentId?: string;
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
  errors?: string[];
}

export interface MarketDataHealth {
  status: string;
  module: string;
  instrumentCount: number;
  latestDataTimestamp: string | null;
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
  workerCount?: number;
  workerConcurrency?: number;
  errors?: Array<{ symbol: string; success: boolean; message: string; timestamp: string; workerId?: number }>;
  timestamp?: string;
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
