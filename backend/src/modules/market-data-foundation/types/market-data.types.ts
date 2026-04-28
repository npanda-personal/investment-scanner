export interface HistoricalPrice {
  symbol: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface RegionInfo {
  region?: string;
  exchange?: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type?: string;
  exchange?: string;
  region?: string;
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

export type CorporateActionType = 'dividend' | 'split';

export interface CorporateAction {
  symbol: string;
  type: CorporateActionType;
  date: string;
  value: number | string;
  source: string;
}

export interface ValidationResult<T> {
  valid: T[];
  invalid: Array<{
    item: unknown;
    errors: string[];
  }>;
}
