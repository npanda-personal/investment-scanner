import axios from 'axios';

const API_BASE = '/api';

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

interface BackendPaginatedResponse {
  stocks: Stock[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

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
export async function syncStockData(id: string): Promise<Stock> {
  const response = await axios.post<Stock>(`${API_BASE}/market-data-foundation/stocks/${id}/sync`);
  return response.data;
}

/**
 * Trigger bulk sync for all active stocks.
 */
export async function syncAllStocks(batchSize?: number, delayBetweenBatchesMs?: number): Promise<any> {
  const params = new URLSearchParams();
  if (batchSize !== undefined) params.append('batchSize', batchSize.toString());
  if (delayBetweenBatchesMs !== undefined) params.append('delayBetweenBatchesMs', delayBetweenBatchesMs.toString());
  
  const url = `${API_BASE}/market-data-foundation/stocks/sync-all${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await axios.post(url);
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
