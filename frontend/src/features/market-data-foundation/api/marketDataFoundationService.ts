import axios from 'axios';
import type {
  BackendPaginatedResponse,
  CatalogBackfillRequest,
  CatalogBackfillResponse,
  CatalogImportRequest,
  CatalogImportResponse,
  CatalogSourceInfo,
  CreateStockRequest,
  MarketDataCatalogSyncRunRequest,
  MarketDataCatalogSyncRunResponse,
  MarketDataHealth,
  MarketDataRepairPlan,
  MarketDataRepairRequest,
  MarketDataRepairRunRecord,
  MarketDataRepairRunResponse,
  MarketDataRepairSummary,
  MarketDataSourceFileImportsResponse,
  MarketDataManualMetadataTemplate,
  ExchangeHistoricalBackfillRequest,
  ExchangeHistoricalBackfillResponse,
  ManualVerifiedFundamentalImportRequest,
  MarketDataStockMissingDataDiagnostics,
  MarketDataUniverseHealth,
  TrustedUniverseRepairWorkbench,
  MarketDataSchedulerStatus,
  ReviewReadinessSummary,
  TrustedReviewUniverseHealth,
  PaginatedResponse,
  PaginationOptions,
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
} from '../types';
import { logMarketDataApi, normalizeAssetTypeForMarketDataApi, normalizeMarketForApi } from './marketScopeApi';

const API_BASE = '/api';

export type {
  CreateStockRequest,
  CatalogSourceInfo,
  CatalogImportRequest,
  CatalogImportResponse,
  BulkSyncResponse,
  MarketDataCatalogSyncRunRequest,
  MarketDataCatalogSyncRunResponse,
  MarketDataCatalogSyncRunStatus,
  MarketDataHealth,
  MarketDataRepairPlan,
  MarketDataRepairLane,
  MarketDataRepairRequest,
  MarketDataRepairRunAction,
  MarketDataRepairRunRecord,
  MarketDataRepairRunResponse,
  MarketDataRepairRunStatus,
  MarketDataRepairSummary,
  MarketDataPriceBackfillRunRequest,
  MarketDataPriceBackfillRunResponse,
  MarketDataSourceFileImportRecord,
  MarketDataSourceFileImportsResponse,
  MarketDataManualMetadataTemplate,
  ExchangeHistoricalBackfillRequest,
  ExchangeHistoricalBackfillResponse,
  ExchangeHistoricalBackfillJobRecord,
  ExchangeHistoricalBackfillJobStatus,
  ExchangeHistoricalBackfillRunStatus,
  ManualVerifiedFundamentalImportRequest,
  MarketDataStockMissingDataDiagnostics,
  MarketDataUniverseHealth,
  TrustedUniverseRepairWorkbench,
  MarketDataSchedulerStatus,
  ReviewReadinessSummary,
  TrustedReviewUniverseHealth,
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
  if (options.dataStatus) params.append('dataStatus', options.dataStatus);
  if (options.catalogSource) params.append('catalogSource', options.catalogSource);
  if (options.providerSupportStatus) params.append('providerSupportStatus', options.providerSupportStatus);
  if (options.derivativesEligible !== undefined) params.append('derivativesEligible', String(options.derivativesEligible));
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

export interface MarketScopedApiOptions {
  region?: string;
  assetType?: string;
}

function scopedCatalogSyncPayload(data: MarketDataCatalogSyncRunRequest): MarketDataCatalogSyncRunRequest {
  return {
    ...data,
    region: normalizeMarketForApi(data.region) || 'GLOBAL',
    assetType: normalizeAssetTypeForMarketDataApi(data.assetType) || 'STOCK',
  };
}

export async function startCatalogSyncRun(data: MarketDataCatalogSyncRunRequest): Promise<MarketDataCatalogSyncRunResponse> {
  const payload = scopedCatalogSyncPayload(data);
  logMarketDataApi(payload.region || 'GLOBAL', payload.region, { ...payload }, 'catalog-sync-run-start');
  const response = await axios.post<MarketDataCatalogSyncRunResponse>(
    `${API_BASE}/market-data-foundation/stocks/sync-runs`,
    payload
  );
  return response.data;
}

export async function fetchCatalogSyncRunStatus(runId: string): Promise<MarketDataCatalogSyncRunResponse> {
  const response = await axios.get<MarketDataCatalogSyncRunResponse>(
    `${API_BASE}/market-data-foundation/stocks/sync-runs/${encodeURIComponent(runId)}`
  );
  return response.data;
}

export async function cancelCatalogSyncRun(runId: string): Promise<MarketDataCatalogSyncRunResponse> {
  const response = await axios.post<MarketDataCatalogSyncRunResponse>(
    `${API_BASE}/market-data-foundation/stocks/sync-runs/${encodeURIComponent(runId)}/cancel`
  );
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

export async function fetchMarketDataUniverseHealth(options: MarketScopedApiOptions = {}): Promise<MarketDataUniverseHealth> {
  const params = {
    region: normalizeMarketForApi(options.region) || 'IN',
    assetType: normalizeAssetTypeForMarketDataApi(options.assetType) || 'STOCK',
  };
  logMarketDataApi(options.region || 'IN', params.region, params, 'universe-health');
  const response = await axios.get<MarketDataUniverseHealth>(`${API_BASE}/v1/market-data/universe/health`, { params });
  return response.data;
}

export async function fetchTrustedReviewUniverseHealth(options: MarketScopedApiOptions = {}): Promise<TrustedReviewUniverseHealth> {
  const params = {
    region: normalizeMarketForApi(options.region) || 'IN',
    assetType: normalizeAssetTypeForMarketDataApi(options.assetType) || 'STOCK',
  };
  const response = await axios.get<TrustedReviewUniverseHealth>(`${API_BASE}/v1/market-data/review-universe`, { params });
  return response.data;
}

export async function fetchReviewReadinessSummary(options: MarketScopedApiOptions = {}): Promise<ReviewReadinessSummary> {
  const params = {
    region: normalizeMarketForApi(options.region) || 'IN',
    assetType: normalizeAssetTypeForMarketDataApi(options.assetType) || 'STOCK',
  };
  const response = await axios.get<ReviewReadinessSummary>(`${API_BASE}/v1/market-data/review-readiness-summary`, { params });
  return response.data;
}

export async function fetchMarketDataRepairPlan(options: MarketScopedApiOptions = {}): Promise<MarketDataRepairPlan> {
  const params = {
    region: normalizeMarketForApi(options.region) || 'IN',
    assetType: normalizeAssetTypeForMarketDataApi(options.assetType) || 'STOCK',
  };
  const response = await axios.get<MarketDataRepairPlan>(`${API_BASE}/v1/market-data/universe/repair-plan`, { params });
  return response.data;
}

export async function fetchMarketDataStockMissingDataDiagnostics(options: MarketScopedApiOptions = {}): Promise<MarketDataStockMissingDataDiagnostics> {
  const params = {
    region: normalizeMarketForApi(options.region) || 'IN',
    assetType: normalizeAssetTypeForMarketDataApi(options.assetType) || 'STOCK',
  };
  const response = await axios.get<MarketDataStockMissingDataDiagnostics>(`${API_BASE}/v1/market-data/stocks/missing-data-diagnostics`, { params });
  return response.data;
}

export async function fetchTrustedUniverseRepairWorkbench(_options: MarketScopedApiOptions = {}): Promise<TrustedUniverseRepairWorkbench> {
  const params = {
    region: 'IN',
    assetType: 'STOCK',
  };
  const response = await axios.get<TrustedUniverseRepairWorkbench>(`${API_BASE}/v1/market-data/universe/repair-workbench`, { params });
  return response.data;
}

export async function fetchLatestMarketDataRepairRun(options: MarketScopedApiOptions = {}): Promise<MarketDataRepairRunRecord | null> {
  const params = {
    region: normalizeMarketForApi(options.region) || 'IN',
    assetType: normalizeAssetTypeForMarketDataApi(options.assetType) || 'STOCK',
  };
  const response = await axios.get<MarketDataRepairRunRecord | null>(`${API_BASE}/v1/market-data/universe/repair-runs/latest`, { params });
  return response.data;
}

export async function fetchManualMetadataTemplate(options: MarketScopedApiOptions = {}): Promise<MarketDataManualMetadataTemplate> {
  const params = {
    region: normalizeMarketForApi(options.region) || 'IN',
    assetType: normalizeAssetTypeForMarketDataApi(options.assetType) || 'STOCK',
  };
  const response = await axios.get<MarketDataManualMetadataTemplate>(`${API_BASE}/v1/market-data/metadata/manual-template`, { params });
  return response.data;
}

export async function fetchSourceFileImports(options: {
  source?: string;
  segment?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  sortBy?: 'importedAt' | 'tradingDate';
  sortDirection?: 'asc' | 'desc';
} = {}): Promise<MarketDataSourceFileImportsResponse> {
  const response = await axios.get<MarketDataSourceFileImportsResponse>(
    `${API_BASE}/v1/market-data/source-file-imports`,
    { params: options }
  );
  return response.data;
}

export async function runExchangeHistoricalBackfill(data: ExchangeHistoricalBackfillRequest): Promise<ExchangeHistoricalBackfillResponse> {
  const response = await axios.post<ExchangeHistoricalBackfillResponse>(
    `${API_BASE}/v1/market-data/exchange-files/historical-backfill/runs`,
    {
      ...data,
      region: normalizeMarketForApi(data.region) || 'IN',
      assetType: normalizeAssetTypeForMarketDataApi(data.assetType) || 'STOCK',
    }
  );
  return response.data;
}

export async function startExchangeHistoricalBackfillRun(data: ExchangeHistoricalBackfillRequest): Promise<ExchangeHistoricalBackfillResponse> {
  const response = await axios.post<ExchangeHistoricalBackfillResponse>(
    `${API_BASE}/v1/market-data/exchange-files/historical-backfill/runs`,
    {
      ...data,
      region: normalizeMarketForApi(data.region) || 'IN',
      assetType: normalizeAssetTypeForMarketDataApi(data.assetType) || 'STOCK',
    }
  );
  return response.data;
}

export async function fetchExchangeHistoricalBackfillRun(runId: string): Promise<ExchangeHistoricalBackfillResponse> {
  const response = await axios.get<ExchangeHistoricalBackfillResponse>(
    `${API_BASE}/v1/market-data/exchange-files/historical-backfill/runs/${encodeURIComponent(runId)}`
  );
  return response.data;
}

export async function resumeExchangeHistoricalBackfillRun(runId: string): Promise<ExchangeHistoricalBackfillResponse> {
  const response = await axios.post<ExchangeHistoricalBackfillResponse>(
    `${API_BASE}/v1/market-data/exchange-files/historical-backfill/runs/${encodeURIComponent(runId)}/resume`
  );
  return response.data;
}

export async function retryFailedExchangeHistoricalBackfillRun(runId: string, maxRetries?: number): Promise<ExchangeHistoricalBackfillResponse> {
  const response = await axios.post<ExchangeHistoricalBackfillResponse>(
    `${API_BASE}/v1/market-data/exchange-files/historical-backfill/runs/${encodeURIComponent(runId)}/retry-failed`,
    maxRetries === undefined ? {} : { maxRetries }
  );
  return response.data;
}

export async function cancelExchangeHistoricalBackfillRun(runId: string): Promise<ExchangeHistoricalBackfillResponse> {
  const response = await axios.post<ExchangeHistoricalBackfillResponse>(
    `${API_BASE}/v1/market-data/exchange-files/historical-backfill/runs/${encodeURIComponent(runId)}/cancel`
  );
  return response.data;
}

export async function importManualVerifiedFundamental(data: ManualVerifiedFundamentalImportRequest): Promise<unknown> {
  const response = await axios.post(
    `${API_BASE}/v1/market-data/fundamentals/manual-verified-import`,
    {
      ...data,
      region: normalizeMarketForApi(data.region) || 'IN',
      assetType: normalizeAssetTypeForMarketDataApi(data.assetType) || 'STOCK',
    }
  );
  return response.data;
}

function scopedRepairPayload(data: MarketDataRepairRequest): MarketDataRepairRequest {
  return {
    ...data,
    region: normalizeMarketForApi(data.region) || 'IN',
    assetType: normalizeAssetTypeForMarketDataApi(data.assetType) || 'STOCK',
  };
}

export async function runMarketDataUniverseRepair(data: MarketDataRepairRequest): Promise<MarketDataRepairRunResponse> {
  const response = await axios.post<MarketDataRepairRunResponse>(
    `${API_BASE}/v1/market-data/universe/repair-run`,
    scopedRepairPayload(data)
  );
  return response.data;
}

export async function repairMarketDataCatalogIdentity(data: MarketDataRepairRequest): Promise<MarketDataRepairSummary> {
  const response = await axios.post<MarketDataRepairSummary>(
    `${API_BASE}/v1/market-data/catalog/identity-repair`,
    scopedRepairPayload(data)
  );
  return response.data;
}

export async function importMarketDataManualMetadata(data: MarketDataRepairRequest): Promise<MarketDataRepairSummary> {
  const response = await axios.post<MarketDataRepairSummary>(
    `${API_BASE}/v1/market-data/metadata/manual-import`,
    scopedRepairPayload(data)
  );
  return response.data;
}

export async function enrichMarketDataMetadata(data: MarketDataRepairRequest): Promise<MarketDataRepairSummary> {
  const response = await axios.post<MarketDataRepairSummary>(
    `${API_BASE}/v1/market-data/metadata/enrich`,
    scopedRepairPayload(data)
  );
  return response.data;
}

export async function fetchMarketDataSchedulerStatus(): Promise<MarketDataSchedulerStatus> {
  const response = await axios.get<MarketDataSchedulerStatus>(`${API_BASE}/v1/market-data/scheduler/status`);
  return response.data;
}

export async function importCatalog(data: CatalogImportRequest): Promise<CatalogImportResponse> {
  const response = await axios.post<CatalogImportResponse>(`${API_BASE}/v1/market-data/catalog/import`, data);
  return response.data;
}

export async function fetchCatalogSources(): Promise<{ sources: CatalogSourceInfo[] }> {
  const response = await axios.get<{ sources: CatalogSourceInfo[] }>(`${API_BASE}/v1/market-data/catalog/sources`);
  return response.data;
}

export async function backfillCatalogMetadata(data: CatalogBackfillRequest): Promise<CatalogBackfillResponse> {
  const response = await axios.post<CatalogBackfillResponse>(`${API_BASE}/v1/market-data/catalog/backfill-metadata`, data);
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

export async function fetchFxRates(): Promise<V1FxRatesResponse> {
  const response = await axios.get<V1FxRatesResponse>(`${API_BASE}/v1/fx-rates`);
  return response.data;
}

export async function fetchFxRate(pair: string): Promise<V1FxRate> {
  const response = await axios.get<V1FxRate>(`${API_BASE}/v1/fx-rates/${encodeURIComponent(pair)}`);
  return response.data;
}
