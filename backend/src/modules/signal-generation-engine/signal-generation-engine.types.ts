import type { MarketDataStatus } from '../market-data-foundation';
import type { StrategyDecision, StrategyDirection, StrategyRatingGrade, StrategyReadinessLabel } from '../strategy-framework';

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
  rulesetVersion?: string | null;
  generatedDate?: string | null;
  sourceDataDate?: string | null;
  sourcePriceDate?: string | null;
  scoringInputSummary?: SignalScoringInputSummary | null;
  dataQualityEligibility?: SignalDataQualityEligibility | null;
  auditStatus?: 'CURRENT' | 'LEGACY_MISSING';
  generationRunId?: string | null;
  source: string;
  data_status: MarketDataStatus;
  warnings?: string[];
  strategyMatches?: SignalStrategyMatchSummary[];
  blockedStrategies?: SignalBlockedStrategySummary[];
  writeStatus?: SignalWriteStatus;
}

export type SignalWriteStatus = 'CREATED' | 'UPDATED' | 'NO_OP';

export interface SignalScoringInputSummary {
  priceBarsUsed: number;
  latestCloseDate: string | null;
  hasSma50: boolean;
  hasSma200: boolean;
  hasVolume: boolean;
  fundamentalsAvailable: boolean;
  strategyContextLoaded: boolean;
}

export interface SignalDataQualityEligibility {
  filterApplied: boolean;
  eligible: boolean | null;
  coverageStatus?: string;
  signalReadinessStatus?: string;
  liquidityStatus?: string;
  excludedReason?: string;
}

export type SignalGenerationRunStatus = 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';

export interface SignalGenerationRunAudit {
  id: string;
  scope: { region: string; assetType: string };
  requestedByUserId: string;
  status: SignalGenerationRunStatus;
  modelVersion: string;
  rulesetVersion: string;
  sourceDataDate: string | null;
  generatedDate: string;
  batchSize: number;
  offset: number;
  totalCount: number;
  processedCount: number;
  generatedCount: number;
  updatedCount: number;
  noOpCount: number;
  duplicateOrIdempotentCount: number;
  skippedCount: number;
  failedCount: number;
  excludedByDataQuality: number;
  missingQualityEvaluationCount: number;
  durationMs: number;
  startedAt: string;
  completedAt: string | null;
  warnings: string[];
}

export interface SignalWriteResult {
  result: SignalResultDto;
  status: SignalWriteStatus;
}

export interface SignalStrategyMatchSummary {
  strategyCode: string;
  strategyName?: string;
  strategyVersion: string;
  decision: StrategyDecision;
  direction: StrategyDirection;
  score: number;
  confidence: SignalConfidence;
  reasons: string[];
  entryRulesPassed: string[];
  readinessLabel?: StrategyReadinessLabel | null;
  ratingGrade?: StrategyRatingGrade | null;
}

export interface SignalBlockedStrategySummary {
  strategyCode: string;
  strategyName?: string;
  strategyVersion: string;
  blockers: string[];
  warnings: string[];
  dataGaps: string[];
  noiseFiltersTriggered: string[];
  reason: string;
}

export interface PaginatedSignalResponse {
  signals: SignalResultDto[];
  items?: SignalResultDto[];
  total: number;
  totalCount?: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
  filtersApplied?: Record<string, unknown>;
  scope?: {
    region: string;
    assetType: string;
  };
  directionCounts?: Record<SignalDirection, number>;
  warnings?: string[];
}

export interface SignalRunRequest {
  instrumentId?: string;
  symbol?: string;
  researchContextMode?: 'FULL' | 'LIGHTWEIGHT';
  limit?: number;
  batchSize?: number;
  offset?: number;
  maxConcurrency?: number;
  providerThrottleMs?: number;
  direction?: SignalDirection;
  sector?: string;
  country?: string;
  region?: string;
  assetType?: string;
  modelVersion?: string;
  rulesetVersion?: string;
  requestedByUserId?: string;
  useDataQualityFilter?: boolean;
  minSignalReadinessScore?: number;
  allowedReadinessStatuses?: Array<'READY' | 'LIMITED' | 'NOT_READY'>;
  includeLimited?: boolean;
  skipUnusable?: boolean;
  missingQualityBehavior?: 'WARN_AND_PROCESS' | 'SKIP';
  strategyCode?: string;
  includeStrategyMatches?: boolean;
  onlyStrategyEligible?: boolean;
  excludeNoiseFiltered?: boolean;
  force?: boolean;
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
  modelVersion?: string;
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
    eligibleInstrumentCount?: number;
    attemptedGenerationCount?: number;
  };
  results: SignalResultDto[];
  runAudit?: SignalGenerationRunAudit;
  generated_at: string;
  processedCount?: number;
  totalCount?: number;
  batchSize?: number;
  maxConcurrency?: number;
  providerThrottleMs?: number;
  offset?: number;
  nextOffset?: number | null;
  hasMore?: boolean;
  generatedCount?: number;
  updatedCount?: number;
  noOpCount?: number;
  skippedCount?: number;
  failedCount?: number;
  strategyMatchedCount?: number;
  strategyBlockedCount?: number;
  outOfScopeSkipped?: number;
  directionCountsGenerated?: Record<SignalDirection, number>;
  scope?: {
    region: string;
    assetType: string;
  };
  latestGeneratedAt?: string | null;
  durationMs?: number;
  eligibleInstrumentCount?: number;
  attemptedGenerationCount?: number;
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
