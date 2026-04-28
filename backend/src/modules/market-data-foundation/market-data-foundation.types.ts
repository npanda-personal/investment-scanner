export interface HistoricalPrice {
  symbol: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
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

export interface CreateStockRequest {
  symbol: string;
  name: string;
  region: string;
  exchange?: string;
}

export interface V1CreateInstrumentRequest {
  symbol: string;
  company_name: string;
  exchange: string;
  currency: string;
  asset_type: string;
  isin?: string;
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

export interface V1IngestionRequest {
  symbol?: string;
  instrumentId?: string;
  company_name?: string;
  exchange?: string;
  currency?: string;
  asset_type?: string;
  isin?: string;
}

export interface V1SyncResult {
  success: boolean;
  instrument: V1Instrument | null;
  message: string;
  pricesStored?: boolean;
  fundamentalsAvailable?: boolean;
  corporateActionsAvailable?: boolean;
  errors?: string[];
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
  sortBy?: 'symbol' | 'name' | 'lastSuccessfulDataLoadTimestamp' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  region?: string;
  search?: string;
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

export type CorporateActionType = 'dividend' | 'split';

export interface CorporateAction {
  symbol: string;
  type: CorporateActionType;
  date: string;
  value: number | string;
  source: string;
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
