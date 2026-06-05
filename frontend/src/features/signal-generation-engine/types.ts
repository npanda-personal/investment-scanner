export type SignalDirection = 'BULLISH' | 'NEUTRAL' | 'BEARISH';
export type SignalConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type SignalCategory = 'TECHNICAL' | 'MOMENTUM' | 'FUNDAMENTAL';

export interface SignalItem {
  code: string;
  label: string;
  category: SignalCategory;
}

export type ReliabilityTier = 'FULL' | 'PARTIAL';
export type CalibrationStatus = 'CALIBRATED' | 'PARTIAL' | 'PENDING' | 'UNAVAILABLE';
export type LifecycleState = 'ACTIVE' | 'WEAKENING' | 'STALE' | 'EXITED' | 'UNKNOWN';

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
  generatedDate?: string | null;
  modelVersion?: string | null;
  rulesetVersion?: string | null;
  sourceDataDate?: string | null;
  sourcePriceDate?: string | null;
  scoringInputSummary?: SignalScoringInputSummary | null;
  dataQualityEligibility?: SignalDataQualityEligibility | null;
  auditStatus?: 'CURRENT' | 'LEGACY_MISSING';
  generationRunId?: string | null;
  writeStatus?: 'CREATED' | 'UPDATED' | 'NO_OP';
  source: string;
  data_status: string;
  warnings?: string[];
  strategyMatches?: SignalStrategyMatch[];
  blockedStrategies?: SignalBlockedStrategy[];
  // Calibration fields (v3+)
  calibratedScore?: number | null;
  reliabilityTier?: ReliabilityTier | null;
  calibrationStatus?: CalibrationStatus | null;
  calibrationHorizon?: string | null;
  calibrationSampleSize?: number | null;
  lifecycleState?: LifecycleState | null;
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

export interface SignalGenerationRunAudit {
  id: string;
  scope: { region: string; assetType: string };
  requestedByUserId: string;
  status: 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
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
  reliabilityTier?: ReliabilityTier;
}

export interface PaginatedSignalResponse {
  signals: SignalResult[];
  items?: SignalResult[];
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
  useDataQualityFilter?: boolean;
  minSignalReadinessScore?: number;
  includeLimited?: boolean;
  missingQualityBehavior?: 'WARN_AND_PROCESS' | 'SKIP';
  strategyCode?: string;
  includeStrategyMatches?: boolean;
  onlyStrategyEligible?: boolean;
  excludeNoiseFiltered?: boolean;
  force?: boolean;
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
  results: SignalResult[];
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
