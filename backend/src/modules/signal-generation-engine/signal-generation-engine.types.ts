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
  triggerContract?: SignalTriggerContractDto;
}

export type SignalWriteStatus = 'CREATED' | 'UPDATED' | 'NO_OP';

export type SignalTriggerContractStatus = 'COMPLETE' | 'CONTRACT_INCOMPLETE' | 'LEGACY_INCOMPLETE';
export type SignalTriggerType = 'bullish_entry_trigger' | 'bearish_trigger' | 'risk_warning';
export type SignalTriggerPriceEvidenceStatus = 'SOURCE_PROVEN' | 'UNAVAILABLE';

export interface SignalTriggerPriceEvidence {
  status: SignalTriggerPriceEvidenceStatus;
  triggerPrice: number | null;
  triggerTimestamp: string | null;
  sourceModule: 'signal-generation-engine';
  sourceField: string | null;
  strategyCode: string | null;
  strategyVersion: string | null;
  timeframe: string | null;
  entryRuleIds: string[];
  compatibilityOnly: boolean;
  unavailableReason?: string;
}

export interface SignalTriggerConditionEvidence {
  code: string;
  label: string;
  category: SignalCategory;
}

export interface SignalTriggerContractDto {
  contractVersion: 'TriggerObjectV1';
  contractStatus: SignalTriggerContractStatus;
  signal_id: string | null;
  instrument_id: string;
  symbol: string;
  asset_class: string | null;
  region: string | null;
  strategy_id: string | null;
  strategy_version: string | null;
  trigger_type: SignalTriggerType;
  trigger_price: number | null;
  trigger_timestamp: string | null;
  timeframe: string | null;
  entry_rule_id: string | null;
  exit_rule_id: string | null;
  invalidation_rule_id: string | null;
  reason_summary: string;
  passed_conditions: SignalTriggerConditionEvidence[];
  failed_conditions: SignalTriggerConditionEvidence[];
  data_quality_status: string | null;
  lifecycle_status: null;
  created_at: string | null;
  updated_at: string | null;
  audit: {
    auditStatus: SignalResultDto['auditStatus'];
    generationRunId: string | null;
    modelVersion: string | null;
    rulesetVersion: string | null;
  };
  trigger_price_evidence: {
    status: SignalTriggerPriceEvidenceStatus;
    source_module: string | null;
    source_field: string | null;
    source_timestamp: string | null;
    strategy_id: string | null;
    strategy_version: string | null;
    timeframe: string | null;
    entry_rule_ids: string[];
    compatibility_only: boolean;
    unavailable_reason?: string;
  };
  unavailable_fields: string[];
  incomplete_reasons: string[];
}

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
  timeframe?: string | null;
  triggerPriceEvidence?: SignalTriggerPriceEvidence | null;
  readinessLabel?: StrategyReadinessLabel | null;
  ratingGrade?: StrategyRatingGrade | null;
}

export interface SignalBlockedStrategySummary {
  strategyCode: string;
  strategyName?: string;
  strategyVersion: string;
  timeframe?: string | null;
  category?: string | null;
  blockers: string[];
  warnings: string[];
  dataGaps: string[];
  noiseFiltersTriggered: string[];
  reason: string;
  triggerPriceEvidence?: SignalTriggerPriceEvidence | null;
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
  instrumentIds?: string[];
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
