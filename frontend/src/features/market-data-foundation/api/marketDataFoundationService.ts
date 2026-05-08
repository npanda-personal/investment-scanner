import axios from 'axios';
import type {
  BackendPaginatedResponse,
  CreateStockRequest,
  BulkSyncResponse,
  MarketDataHealth,
  MarketDataSchedulerStatus,
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
import { logMarketDataApi, normalizeAssetTypeForMarketDataApi, normalizeMarketForApi } from './marketScopeApi';

const API_BASE = '/api';

export type {
  CreateStockRequest,
  BulkSyncResponse,
  MarketDataHealth,
  MarketDataSchedulerStatus,
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
export type { MarketDataSchedulerRegionStatus } from '../types';

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
  if (options.instrumentSegment) params.append('instrumentSegment', options.instrumentSegment);
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
export async function syncAllStocks(workerCount?: number, workerConcurrency?: number, delayBetweenBatchesMs?: number, options: MarketScopedApiOptions = {}): Promise<BulkSyncResponse> {
  const params = new URLSearchParams();
  if (workerCount !== undefined) params.append('workerCount', workerCount.toString());
  if (workerConcurrency !== undefined) params.append('workerConcurrency', workerConcurrency.toString());
  if (delayBetweenBatchesMs !== undefined) params.append('delayBetweenBatchesMs', delayBetweenBatchesMs.toString());
  const region = normalizeMarketForApi(options.region);
  const assetType = normalizeAssetTypeForMarketDataApi(options.assetType);
  if (region) params.append('region', region);
  if (assetType) params.append('assetType', assetType);
  
  const url = `${API_BASE}/market-data-foundation/stocks/sync-all${params.toString() ? `?${params.toString()}` : ''}`;
  logMarketDataApi(options.region || 'GLOBAL', region, Object.fromEntries(params.entries()), url);
  const response = await axios.post<BulkSyncResponse>(url);
  return response.data;
}

export interface MarketScopedApiOptions {
  region?: string;
  assetType?: string;
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

export async function fetchMarketDataHealth(options: MarketScopedApiOptions = {}): Promise<MarketDataHealth> {
  const params = {
    region: normalizeMarketForApi(options.region),
    assetType: normalizeAssetTypeForMarketDataApi(options.assetType),
  };
  logMarketDataApi(options.region || 'GLOBAL', params.region, params, 'health');
  const response = await axios.get<MarketDataHealth>(`${API_BASE}/v1/market-data/health`, { params });
  return response.data;
}

export async function fetchMarketDataSchedulerStatus(): Promise<MarketDataSchedulerStatus> {
  const response = await axios.get<MarketDataSchedulerStatus>(`${API_BASE}/v1/market-data/scheduler/status`);
  return response.data;
}

export async function fetchInstruments(options: PaginationOptions | string = {}): Promise<V1InstrumentsResponse> {
  const resolvedOptions = typeof options === 'string' ? { search: options } : options;
  const params = {
    ...resolvedOptions,
    region: normalizeMarketForApi(resolvedOptions.region),
    assetType: normalizeAssetTypeForMarketDataApi(resolvedOptions.assetType),
  };
  logMarketDataApi(String(resolvedOptions.region || 'GLOBAL'), params.region, params, 'instruments');
  const response = await axios.get<V1InstrumentsResponse>(`${API_BASE}/v1/instruments`, {
    params,
  });
  return response.data;
}

export async function createInstrument(data: V1CreateInstrumentRequest): Promise<V1Instrument> {
  const response = await axios.post<V1Instrument>(`${API_BASE}/v1/instruments`, data);
  return response.data;
}

export async function fetchInstrument(id: string, options: MarketScopedApiOptions = {}): Promise<V1Instrument> {
  const params = {
    region: normalizeMarketForApi(options.region),
    assetType: normalizeAssetTypeForMarketDataApi(options.assetType),
  };
  const response = await axios.get<V1Instrument>(`${API_BASE}/v1/instruments/${id}`, { params });
  return response.data;
}

export async function fetchInstrumentPrices(id: string, limit = 250, options: MarketScopedApiOptions = {}): Promise<V1PricesResponse> {
  const params = {
    limit,
    region: normalizeMarketForApi(options.region),
    assetType: normalizeAssetTypeForMarketDataApi(options.assetType),
  };
  logMarketDataApi(options.region || 'GLOBAL', params.region, params, 'prices');
  const response = await axios.get<V1PricesResponse>(`${API_BASE}/v1/prices/${id}`, {
    params,
  });
  return response.data;
}

export async function fetchInstrumentLatestPrice(id: string, options: MarketScopedApiOptions = {}): Promise<V1LatestPriceResponse> {
  const params = {
    region: normalizeMarketForApi(options.region),
    assetType: normalizeAssetTypeForMarketDataApi(options.assetType),
  };
  logMarketDataApi(options.region || 'GLOBAL', params.region, params, 'latest-price');
  const response = await axios.get<V1LatestPriceResponse>(`${API_BASE}/v1/prices/${id}/latest`, { params });
  return response.data;
}

export async function fetchInstrumentFundamentals(id: string, options: MarketScopedApiOptions = {}): Promise<V1FundamentalsResponse> {
  const params = {
    region: normalizeMarketForApi(options.region),
    assetType: normalizeAssetTypeForMarketDataApi(options.assetType),
  };
  logMarketDataApi(options.region || 'GLOBAL', params.region, params, 'fundamentals');
  const response = await axios.get<V1FundamentalsResponse>(`${API_BASE}/v1/fundamentals/${id}`, { params });
  return response.data;
}

export async function fetchInstrumentCorporateActions(id: string, options: MarketScopedApiOptions = {}): Promise<V1CorporateActionsResponse> {
  const params = {
    region: normalizeMarketForApi(options.region),
    assetType: normalizeAssetTypeForMarketDataApi(options.assetType),
  };
  logMarketDataApi(options.region || 'GLOBAL', params.region, params, 'corporate-actions');
  const response = await axios.get<V1CorporateActionsResponse>(`${API_BASE}/v1/corporate-actions/${id}`, { params });
  return response.data;
}

export async function syncMarketData(data: V1SyncRequest): Promise<V1SyncResponse> {
  const payload = {
    ...data,
    region: normalizeMarketForApi((data as any).region),
    asset_type: normalizeAssetTypeForMarketDataApi(data.asset_type),
  };
  logMarketDataApi((data as any).region || 'GLOBAL', payload.region, payload, 'manual-sync');
  const response = await axios.post<V1SyncResponse>(`${API_BASE}/v1/ingestion/sync`, payload);
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
