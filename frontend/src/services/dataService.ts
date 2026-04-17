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

/**
 * Trigger ingestion for a given symbol
 */
export async function ingestSymbol(symbol: string): Promise<IngestResponse> {
  const response = await axios.post<IngestResponse>(`${API_BASE}/data/ingest`, { symbol });
  return response.data;
}

/**
 * Fetch historical prices for a symbol
 */
export async function fetchPrices(symbol: string, limit = 100): Promise<PricesResponse> {
  const response = await axios.get<PricesResponse>(`${API_BASE}/data/prices/${symbol}`, {
    params: { limit },
  });
  return response.data;
}