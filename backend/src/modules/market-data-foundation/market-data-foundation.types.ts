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
  warningCount: number;
  warnings: string[];
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
  data_status: MarketDataStatus;
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
  sortBy?: 'symbol' | 'name' | 'marketCap' | 'country' | 'exchange' | 'sector' | 'currency' | 'assetType' | 'lastSuccessfulDataLoadTimestamp' | 'createdAt';
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
