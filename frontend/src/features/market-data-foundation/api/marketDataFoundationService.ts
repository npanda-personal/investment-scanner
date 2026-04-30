import axios from 'axios';
import type {
  BackendPaginatedResponse,
  CreateStockRequest,
  BulkSyncResponse,
  MarketDataHealth,
  PaginatedResponse,
  PaginationOptions,
  SyncResponse,
  Stock,
  UpdateStockRequest,
  V1CorporateActionsResponse,
  V1CreateInstrumentRequest,
  V1FundamentalsResponse,
  V1FxRate,
  V1FxRatesResponse,
  V1Instrument,
  V1InstrumentsResponse,
  V1LatestPriceResponse,
  V1PricesResponse,
  V1SyncRequest,
  V1SyncResponse,
} from '../types';

const API_BASE = '/api';

export type {
  CreateStockRequest,
  BulkSyncResponse,
  MarketDataHealth,
  PaginatedResponse,
  PaginationOptions,
  SyncResponse,
  Stock,
  UpdateStockRequest,
  V1CorporateActionsResponse,
  V1CreateInstrumentRequest,
  V1FundamentalsResponse,
  V1FxRate,
  V1FxRatesResponse,
  V1Instrument,
  V1InstrumentsResponse,
  V1LatestPriceResponse,
  V1PricesResponse,
  V1SyncRequest,
  V1SyncResponse,
} from '../types';

/**
 * Fetch stocks with pagination and filtering.
 */
export async function fetchStocks(options: PaginationOptions = {}): Promise<PaginatedResponse> {
  const params = new URLSearchParams();
  if (options.page !== undefined) params.append('page', options.page.toString());
  if (options.pageSize !== undefined) params.append('pageSize', options.pageSize.toString());
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortOrder) params.append('sortOrder', options.sortOrder);
  if (options.region) params.append('region', options.region);
  if (options.country) params.append('country', options.country);
  if (options.exchange) params.append('exchange', options.exchange);
  if (options.assetType) params.append('assetType', options.assetType);
  if (options.currency) params.append('currency', options.currency);
  if (options.sector) params.append('sector', options.sector);
  if (options.industry) params.append('industry', options.industry);
  if (options.search) params.append('search', options.search);

  const response = await axios.get<BackendPaginatedResponse>(`${API_BASE}/market-data-foundation/stocks?${params.toString()}`);
  return {
    stocks: response.data.stocks,
    total: response.data.pagination.total,
    page: response.data.pagination.page,
    pageSize: response.data.pagination.pageSize,
    totalPages: response.data.pagination.totalPages,
  };
}

/**
 * Fetch a single stock by ID.
 */
export async function fetchStock(id: string): Promise<Stock> {
  const response = await axios.get<Stock>(`${API_BASE}/market-data-foundation/stocks/${id}`);
  return response.data;
}

/**
 * Create a new stock.
 */
export async function createStock(data: CreateStockRequest): Promise<Stock> {
  const response = await axios.post<Stock>(`${API_BASE}/market-data-foundation/stocks`, data);
  return response.data;
}

/**
 * Update a stock.
 */
export async function updateStock(id: string, data: UpdateStockRequest): Promise<Stock> {
  const response = await axios.patch<Stock>(`${API_BASE}/market-data-foundation/stocks/${id}`, data);
  return response.data;
}

/**
 * Delete a stock.
 */
export async function deleteStock(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/market-data-foundation/stocks/${id}`);
}

/**
 * Toggle active status of a stock.
 */
export async function toggleStockActive(id: string): Promise<Stock> {
  const response = await axios.post<Stock>(`${API_BASE}/market-data-foundation/stocks/${id}/toggle-active`);
  return response.data;
}

/**
 * Trigger a manual data sync for a stock.
 */
export async function syncStockData(id: string): Promise<SyncResponse> {
  const response = await axios.post<SyncResponse>(`${API_BASE}/market-data-foundation/stocks/${id}/sync`);
  return response.data;
}

/**
 * Trigger bulk sync for all active stocks.
 */
export async function syncAllStocks(workerCount?: number, workerConcurrency?: number, delayBetweenBatchesMs?: number): Promise<BulkSyncResponse> {
  const params = new URLSearchParams();
  if (workerCount !== undefined) params.append('workerCount', workerCount.toString());
  if (workerConcurrency !== undefined) params.append('workerConcurrency', workerConcurrency.toString());
  if (delayBetweenBatchesMs !== undefined) params.append('delayBetweenBatchesMs', delayBetweenBatchesMs.toString());
  
  const url = `${API_BASE}/market-data-foundation/stocks/sync-all${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await axios.post<BulkSyncResponse>(url);
  return response.data;
}

/**
 * Search for stocks using external API (Yahoo Finance).
 */
export async function externalSearch(query: string): Promise<any[]> {
  const response = await axios.get(`${API_BASE}/market-data-foundation/data/search?q=${encodeURIComponent(query)}`);
  return response.data;
}

/**
 * Search Yahoo Finance directly without auto-creating stocks.
 * Used by the global search bar in the Stock Manager.
 * Returns results with region information.
 */
export async function yahooSearch(query: string): Promise<any[]> {
  const response = await axios.get(`${API_BASE}/market-data-foundation/stocks/yahoo-search?q=${encodeURIComponent(query)}`);
  return response.data;
}

export async function fetchMarketDataHealth(): Promise<MarketDataHealth> {
  const response = await axios.get<MarketDataHealth>(`${API_BASE}/v1/market-data/health`);
  return response.data;
}

export async function fetchInstruments(options: PaginationOptions | string = {}): Promise<V1InstrumentsResponse> {
  const resolvedOptions = typeof options === 'string' ? { search: options } : options;
  const response = await axios.get<V1InstrumentsResponse>(`${API_BASE}/v1/instruments`, {
    params: resolvedOptions,
  });
  return response.data;
}

export async function createInstrument(data: V1CreateInstrumentRequest): Promise<V1Instrument> {
  const response = await axios.post<V1Instrument>(`${API_BASE}/v1/instruments`, data);
  return response.data;
}

export async function fetchInstrument(id: string): Promise<V1Instrument> {
  const response = await axios.get<V1Instrument>(`${API_BASE}/v1/instruments/${id}`);
  return response.data;
}

export async function fetchInstrumentPrices(id: string, limit = 250): Promise<V1PricesResponse> {
  const response = await axios.get<V1PricesResponse>(`${API_BASE}/v1/prices/${id}`, {
    params: { limit },
  });
  return response.data;
}

export async function fetchInstrumentLatestPrice(id: string): Promise<V1LatestPriceResponse> {
  const response = await axios.get<V1LatestPriceResponse>(`${API_BASE}/v1/prices/${id}/latest`);
  return response.data;
}

export async function fetchInstrumentFundamentals(id: string): Promise<V1FundamentalsResponse> {
  const response = await axios.get<V1FundamentalsResponse>(`${API_BASE}/v1/fundamentals/${id}`);
  return response.data;
}

export async function fetchInstrumentCorporateActions(id: string): Promise<V1CorporateActionsResponse> {
  const response = await axios.get<V1CorporateActionsResponse>(`${API_BASE}/v1/corporate-actions/${id}`);
  return response.data;
}

export async function syncMarketData(data: V1SyncRequest): Promise<V1SyncResponse> {
  const response = await axios.post<V1SyncResponse>(`${API_BASE}/v1/ingestion/sync`, data);
  return response.data;
}

export async function fetchFxRates(): Promise<V1FxRatesResponse> {
  const response = await axios.get<V1FxRatesResponse>(`${API_BASE}/v1/fx-rates`);
  return response.data;
}

export async function fetchFxRate(pair: string): Promise<V1FxRate> {
  const response = await axios.get<V1FxRate>(`${API_BASE}/v1/fx-rates/${encodeURIComponent(pair)}`);
  return response.data;
}
