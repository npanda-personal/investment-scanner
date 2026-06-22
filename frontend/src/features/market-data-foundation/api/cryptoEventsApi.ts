import axios from 'axios';

/**
 * Crypto Events FE API — persisted-read of crypto_events (CoinMarketCal schema).
 * Data is empty until CRYPTO_COINMARKETCAL_API_KEY is configured and the ingestion
 * pipeline runs. The backend signals this with api_key_required=true so the UI can
 * render an informative empty state.
 */

const API_BASE = '/api/v1/market-data/crypto';

export interface CryptoEventRow {
  id: string;
  symbol: string | null;
  source: string;
  title: string;
  description: string | null;
  category: string | null;
  eventDate: string; // ISO date string
  dateConfidence: string | null;
  isHot: boolean;
  percentageChange: number | null;
  votes: number | null;
  proofUrl: string | null;
  sourceUrl: string | null;
}

export interface CryptoEventsResponse {
  count: number;
  upcoming_only: boolean;
  api_key_required: boolean;
  rows: CryptoEventRow[];
}

export interface CryptoEventsParams {
  symbol?: string;
  category?: string;
  upcoming?: boolean;
  limit?: number;
}

export async function fetchCryptoEvents(
  params: CryptoEventsParams = {},
): Promise<CryptoEventsResponse> {
  const query: Record<string, string | number | boolean> = {};
  if (params.symbol) query.symbol = params.symbol;
  if (params.category) query.category = params.category;
  if (params.upcoming != null) query.upcoming = params.upcoming;
  if (params.limit != null) query.limit = params.limit;
  const response = await axios.get<CryptoEventsResponse>(`${API_BASE}/events`, {
    params: query,
  });
  return response.data;
}
