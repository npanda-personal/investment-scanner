export type ResearchRange = '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'MAX';

export interface ResearchPricePoint {
  date: string;
  close: number;
  adjusted_close: number;
  volume: number | null;
}

export interface ResearchWorkbenchResponse {
  overview: {
    instrument_id: string;
    company_name: string;
    symbol: string;
    exchange: string | null;
    country: string | null;
    sector: string | null;
    industry: string | null;
    currency: string;
    market_cap: number | null;
    latest_price: number | null;
    daily_change: number | null;
    daily_change_percent: number | null;
    last_updated_timestamp: string | null;
    source: string;
    data_status: string;
  };
  chart: {
    range: ResearchRange;
    prices: ResearchPricePoint[];
    adjusted_close_fallback: boolean;
    source: string;
    last_updated_timestamp: string | null;
    data_status: string;
  };
  performance: Record<string, number | null>;
  fundamentals: Record<string, any> | null;
  valuation: Record<string, any>;
  peers: Array<Record<string, any>>;
  relative_strength: Record<string, any>;
  corporate_actions: Array<Record<string, any>>;
  trust: {
    source: string;
    last_updated_timestamp: string | null;
    data_status: string;
  };
}
