import type { MarketDataStatus } from '../market-data-foundation';

export type ResearchRange = '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'MAX';

export interface ResearchPricePoint {
  date: string;
  close: number;
  adjusted_close: number;
  volume: number | null;
}

export interface ResearchPerformanceMetrics {
  return_1d: number | null;
  return_1w: number | null;
  return_1m: number | null;
  return_ytd: number | null;
  return_1y: number | null;
  cagr_3y: number | null;
  max_drawdown: number | null;
  volatility: number | null;
}

export interface ResearchWorkbenchResponse {
  overview: Record<string, unknown>;
  chart: {
    range: ResearchRange;
    prices: ResearchPricePoint[];
    adjusted_close_fallback: boolean;
    source: string;
    last_updated_timestamp: string | null;
    data_status: MarketDataStatus;
  };
  performance: ResearchPerformanceMetrics;
  fundamentals: Record<string, unknown> | null;
  valuation: Record<string, unknown>;
  peers: Array<Record<string, unknown>>;
  relative_strength: Record<string, unknown>;
  corporate_actions: Array<Record<string, unknown>>;
  trust: {
    source: string;
    last_updated_timestamp: string | null;
    data_status: MarketDataStatus;
  };
}
