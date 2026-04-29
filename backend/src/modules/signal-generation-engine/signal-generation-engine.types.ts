import type { MarketDataStatus } from '../market-data-foundation';

export type SignalDirection = 'BULLISH' | 'NEUTRAL' | 'BEARISH';
export type SignalConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type SignalCategory = 'TECHNICAL' | 'MOMENTUM' | 'FUNDAMENTAL';

export interface SignalItem {
  code: string;
  label: string;
  category: SignalCategory;
}

export interface SignalResultDto {
  id?: string;
  instrument_id: string;
  symbol: string;
  company_name: string | null;
  sector: string | null;
  country: string | null;
  currentPrice: number | null;
  previousClose: number | null;
  dailyChange: number | null;
  dailyChangePercent: number | null;
  currency: string | null;
  priceTimestamp: string | null;
  score: number;
  direction: SignalDirection;
  confidence: SignalConfidence;
  triggered_signals: SignalItem[];
  negative_signals: SignalItem[];
  explanation: string;
  generated_at: string;
  modelVersion?: string | null;
  source: string;
  data_status: MarketDataStatus;
}

export interface SignalRunRequest {
  instrumentId?: string;
  symbol?: string;
  limit?: number;
  direction?: SignalDirection;
  sector?: string;
  country?: string;
}

export interface SignalQuery {
  direction?: SignalDirection;
  minScore?: number;
  limit: number;
  offset?: number;
  sector?: string;
  country?: string;
  signalType?: string;
}

export interface SignalHistoryQuery extends SignalQuery {
  instrumentId?: string;
  from?: string;
  to?: string;
}

export interface SignalRunResponse {
  generated: number;
  skipped: number;
  errors: string[];
  results: SignalResultDto[];
  generated_at: string;
}

export interface SignalPricePoint {
  date: string;
  close: number;
  adjusted_close: number;
  volume: number | null;
}
