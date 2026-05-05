import axios from 'axios';
import type {
  CorporateActionsResponse,
  CoreFundamentals,
  IngestResponse,
  PricesResponse,
} from '../types';
import { logMarketDataApi, normalizeMarketForApi } from './marketScopeApi';

const API_BASE = '/api'; // proxy to backend

export type {
  CorporateAction,
  CorporateActionsResponse,
  CoreFundamentals,
  HistoricalPrice,
  IngestResponse,
  PricesResponse,
} from '../types';

/**
 * Trigger ingestion for a given symbol
 */
export async function ingestSymbol(symbol: string, region?: string): Promise<IngestResponse> {
  const normalizedRegion = normalizeMarketForApi(region);
  logMarketDataApi(region || 'GLOBAL', normalizedRegion, { symbol, region: normalizedRegion }, 'legacy-ingest');
  const response = await axios.post<IngestResponse>(`${API_BASE}/market-data-foundation/data/ingest`, { symbol, region: normalizedRegion });
  return response.data;
}

/**
 * Fetch historical prices for a symbol
 */
export async function fetchPrices(symbol: string, limit = 100, region?: string): Promise<PricesResponse> {
  const normalizedRegion = normalizeMarketForApi(region);
  const params = { limit, region: normalizedRegion };
  logMarketDataApi(region || 'GLOBAL', normalizedRegion, params, 'legacy-prices');
  const response = await axios.get<PricesResponse>(`${API_BASE}/market-data-foundation/data/prices/${symbol}`, {
    params,
  });
  return response.data;
}

export async function fetchCoreFundamentals(symbol: string, region?: string): Promise<CoreFundamentals> {
  const normalizedRegion = normalizeMarketForApi(region);
  logMarketDataApi(region || 'GLOBAL', normalizedRegion, { region: normalizedRegion }, 'legacy-fundamentals');
  const response = await axios.get<CoreFundamentals>(
    `${API_BASE}/market-data-foundation/data/fundamentals/${symbol}`,
    { params: { region: normalizedRegion } }
  );
  return response.data;
}

export async function fetchCorporateActions(symbol: string, region?: string): Promise<CorporateActionsResponse> {
  const normalizedRegion = normalizeMarketForApi(region);
  logMarketDataApi(region || 'GLOBAL', normalizedRegion, { region: normalizedRegion }, 'legacy-corporate-actions');
  const response = await axios.get<CorporateActionsResponse>(
    `${API_BASE}/market-data-foundation/data/corporate-actions/${symbol}`,
    { params: { region: normalizedRegion } }
  );
  return response.data;
}
