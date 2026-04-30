export type SignalDirection = 'BULLISH' | 'NEUTRAL' | 'BEARISH';
export type SignalConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type SignalCategory = 'TECHNICAL' | 'MOMENTUM' | 'FUNDAMENTAL';

export interface SignalItem {
  code: string;
  label: string;
  category: SignalCategory;
}

export interface SignalResult {
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
  source: string;
  data_status: string;
}

export interface SignalQuery {
  direction?: SignalDirection;
  minScore?: number;
  limit?: number;
  sector?: string;
  country?: string;
  signalType?: string;
  confidence?: SignalConfidence;
  search?: string;
}

export interface SignalRunRequest {
  instrumentId?: string;
  symbol?: string;
  limit?: number;
  direction?: SignalDirection;
  sector?: string;
  country?: string;
  useDataQualityFilter?: boolean;
  minSignalReadinessScore?: number;
  includeLimited?: boolean;
  missingQualityBehavior?: 'WARN_AND_PROCESS' | 'SKIP';
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
  results: SignalResult[];
  generated_at: string;
}
