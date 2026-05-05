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
  warnings?: string[];
}

export interface PaginatedSignalResponse {
  signals: SignalResultDto[];
  total: number;
  limit: number;
  offset: number;
  warnings?: string[];
}

export interface SignalRunRequest {
  instrumentId?: string;
  symbol?: string;
  limit?: number;
  direction?: SignalDirection;
  sector?: string;
  country?: string;
  region?: string;
  assetType?: string;
  useDataQualityFilter?: boolean;
  minSignalReadinessScore?: number;
  allowedReadinessStatuses?: Array<'READY' | 'LIMITED' | 'NOT_READY'>;
  includeLimited?: boolean;
  skipUnusable?: boolean;
  missingQualityBehavior?: 'WARN_AND_PROCESS' | 'SKIP';
}

export interface SignalQuery {
  direction?: SignalDirection;
  minScore?: number;
  limit: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  sector?: string;
  country?: string;
  region?: string;
  assetType?: string;
  signalType?: string;
  confidence?: SignalConfidence;
  search?: string;
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
  warnings: string[];
  dataQuality?: {
    filterApplied: boolean;
    beforeFilter: number;
    afterFilter: number;
    excludedByDataQuality: number;
    missingQualityEvaluationCount: number;
  };
  results: SignalResultDto[];
  generated_at: string;
}

export interface SignalPricePoint {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  adjusted_close: number;
  volume: number | null;
}
