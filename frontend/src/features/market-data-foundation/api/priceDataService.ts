import axios from 'axios';
import type {
  CorporateActionsResponse,
  CoreFundamentals,
  IngestResponse,
  PricesResponse,
} from '../types';

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
export async function ingestSymbol(symbol: string): Promise<IngestResponse> {
  const response = await axios.post<IngestResponse>(`${API_BASE}/market-data-foundation/data/ingest`, { symbol });
  return response.data;
}

/**
 * Fetch historical prices for a symbol
 */
export async function fetchPrices(symbol: string, limit = 100): Promise<PricesResponse> {
  const response = await axios.get<PricesResponse>(`${API_BASE}/market-data-foundation/data/prices/${symbol}`, {
    params: { limit },
  });
  return response.data;
}

export async function fetchCoreFundamentals(symbol: string): Promise<CoreFundamentals> {
  const response = await axios.get<CoreFundamentals>(
    `${API_BASE}/market-data-foundation/data/fundamentals/${symbol}`
  );
  return response.data;
}

export async function fetchCorporateActions(symbol: string): Promise<CorporateActionsResponse> {
  const response = await axios.get<CorporateActionsResponse>(
    `${API_BASE}/market-data-foundation/data/corporate-actions/${symbol}`
  );
  return response.data;
}
