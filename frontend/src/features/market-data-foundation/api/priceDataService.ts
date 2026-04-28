import axios from 'axios';

const API_BASE = '/api'; // proxy to backend

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
