import axios from 'axios';

/**
 * Crypto board / detail FE API service (persisted-reads only).
 *
 * Every value rendered from these responses is computed by the CRYPTO_DAILY_METRICS
 * pipeline stage and stored; the FE only fetches and displays — no computation or
 * derivation. Mirrors the bare-axios convention used across market-data-foundation
 * (the global interceptor injects region/assetType from the active market scope).
 */

const API_BASE = '/api/v1/market-data/crypto';

export type CryptoBoardDirection = 'BULLISH' | 'NEUTRAL' | 'BEARISH';
export type CryptoBoardConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type CryptoBoardSortBy =
  | 'marketCap'
  | 'rank'
  | 'signalScore'
  | 'pctChange1d'
  | 'pctChange7d'
  | 'volumeSpike'
  | 'rsi14'
  | 'distanceFromAthPct'
  | 'quoteVolume24h'
  | 'openInterestUsd'
  | 'fundingRatePct'
  | 'rsVsBtcPct'
  | 'pctChange30d'
  | 'stakingApyPct';

/** One persisted board row (snake_case as served by the backend). */
export interface CryptoBoardRow {
  instrument_id: string;
  symbol: string;
  name: string | null;
  price: number | null;
  market_cap: number | null;
  rank: number | null;
  signal_score: number | null;
  signal_direction: CryptoBoardDirection | null;
  signal_confidence: CryptoBoardConfidence | null;
  volume_spike: boolean | null;
  pct_change_1d: number | null;
  pct_change_7d: number | null;
  pct_change_30d: number | null;
  distance_from_ath_pct: number | null;
  near_52w_high: boolean | null;
  near_52w_low: boolean | null;
  rsi14: number | null;
  macd: number | null;
  bb_percent_b: number | null;
  sma50: number | null;
  sma200: number | null;
  cross_state: string | null;
  rs_vs_btc_pct: number | null;
  tvl_usd: number | null;
  funding_rate_pct: number | null;
  open_interest_usd: number | null;
  quote_volume_24h: number | null;
  staking_apy_pct: number | null;
}

export interface CryptoBoardResponse {
  snapshot_date: string | null;
  count: number;
  rows: CryptoBoardRow[];
}

export interface CryptoBoardParams {
  sortBy?: CryptoBoardSortBy;
  sortOrder?: 'asc' | 'desc';
  direction?: CryptoBoardDirection;
  minScore?: number;
  minConfidence?: CryptoBoardConfidence;
  volumeSpikeOnly?: boolean;
  near52wHigh?: boolean;
  near52wLow?: boolean;
  goldenCrossOnly?: boolean;
  deathCrossOnly?: boolean;
  limit?: number;
}

export async function fetchCryptoBoard(params: CryptoBoardParams = {}): Promise<CryptoBoardResponse> {
  const query: Record<string, string | number | boolean> = {};
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  if (params.direction) query.direction = params.direction;
  if (params.minScore != null) query.minScore = params.minScore;
  if (params.minConfidence) query.minConfidence = params.minConfidence;
  if (params.volumeSpikeOnly) query.volumeSpikeOnly = true;
  if (params.near52wHigh) query.near52wHigh = true;
  if (params.near52wLow) query.near52wLow = true;
  if (params.goldenCrossOnly) query.goldenCrossOnly = true;
  if (params.deathCrossOnly) query.deathCrossOnly = true;
  if (params.limit != null) query.limit = params.limit;

  const response = await axios.get<CryptoBoardResponse>(`${API_BASE}/board`, { params: query });
  return response.data;
}

// ---------------------------------------------------------------------------
// Single-asset joined detail
// ---------------------------------------------------------------------------

export interface CryptoAssetCatalog {
  instrument_id: string;
  symbol: string;
  display_symbol: string | null;
  name: string | null;
  rank: number | null;
  market_cap: number | null;
  circulating_supply: number | null;
  max_supply: number | null;
  fully_diluted_valuation: number | null;
  ath_price: number | null;
  ath_date: string | null;
  atl_price: number | null;
  atl_date: string | null;
  category_tags: string[] | null;
  logo_url: string | null;
  website_url: string | null;
}

export interface CryptoAssetFundamental {
  snapshot_date: string;
  defillama_slug: string | null;
  category: string | null;
  chains: string[] | null;
  tvl_usd: number | null;
  tvl_change_1d_pct: number | null;
  tvl_change_7d_pct: number | null;
  fees_24h_usd: number | null;
  fees_7d_usd: number | null;
  revenue_24h_usd: number | null;
  revenue_30d_usd: number | null;
  annualized_revenue_usd: number | null;
  staking_apy_pct: number | null;
  coverage_status: string | null;
}

export interface CryptoAssetFutures {
  snapshot_date: string;
  funding_rate_pct: number | null;
  open_interest_usd: number | null;
  long_short_ratio_global: number | null;
  long_account_pct: number | null;
  short_account_pct: number | null;
  top_trader_long_short_ratio: number | null;
  top_trader_position_ratio: number | null;
  taker_buy_sell_ratio: number | null;
}

/** A signal-evidence entry is either a plain string or a {code,label,category} object. */
export type SignalEvidence = string | { code?: string; label?: string; category?: string };

export interface CryptoAssetSignal {
  score: number | null;
  direction: CryptoBoardDirection | null;
  confidence: CryptoBoardConfidence | null;
  triggered_signals: SignalEvidence[] | null;
  negative_signals: SignalEvidence[] | null;
  explanation: string | null;
  generated_at: string | null;
}

/** Render-safe label for a signal-evidence entry (handles string or object shape). */
export function signalEvidenceLabel(s: SignalEvidence): string {
  if (typeof s === 'string') return s;
  return s.label || s.code || '';
}

export interface CryptoAssetDetail {
  catalog: CryptoAssetCatalog;
  metrics: CryptoBoardRow | null;
  fundamental: CryptoAssetFundamental | null;
  futures: CryptoAssetFutures | null;
  signal: CryptoAssetSignal | null;
}

export async function fetchCryptoAssetDetail(instrumentId: string): Promise<CryptoAssetDetail> {
  const response = await axios.get<CryptoAssetDetail>(`${API_BASE}/assets/${instrumentId}/detail`);
  return response.data;
}
