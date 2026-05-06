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
  warnings?: string[];
  strategyMatches?: SignalStrategyMatch[];
  blockedStrategies?: SignalBlockedStrategy[];
}

export interface SignalStrategyMatch {
  strategyCode: string;
  strategyName?: string;
  strategyVersion: string;
  decision: string;
  direction: string;
  score: number;
  confidence: SignalConfidence;
  reasons: string[];
  entryRulesPassed: string[];
  readinessLabel?: string | null;
  ratingGrade?: string | null;
}

export interface SignalBlockedStrategy {
  strategyCode: string;
  strategyName?: string;
  strategyVersion: string;
  blockers: string[];
  warnings: string[];
  dataGaps: string[];
  noiseFiltersTriggered: string[];
  reason: string;
}

export interface SignalQuery {
  direction?: SignalDirection;
  minScore?: number;
  limit?: number;
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
  strategyCode?: string;
  includeStrategyMatches?: boolean;
  onlyStrategyEligible?: boolean;
  excludeNoiseFiltered?: boolean;
  hasStrategyMatch?: boolean;
  hasBlockedStrategies?: boolean;
  frameworkBackedDecisionAvailable?: boolean;
}

export interface PaginatedSignalResponse {
  signals: SignalResult[];
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
  includeLimited?: boolean;
  missingQualityBehavior?: 'WARN_AND_PROCESS' | 'SKIP';
  strategyCode?: string;
  includeStrategyMatches?: boolean;
  onlyStrategyEligible?: boolean;
  excludeNoiseFiltered?: boolean;
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
