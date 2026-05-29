export type MarketCondition = 'HEALTHY' | 'MIXED' | 'BAD' | 'UNKNOWN';
export type MarketGate = 'OPEN' | 'SELECTIVE' | 'CLOSED' | 'UNKNOWN';
export type AllowedAction =
  | 'NEW_LONG_TRADES_ALLOWED'
  | 'ONLY_HIGH_QUALITY_SETUPS'
  | 'NO_NEW_LONG_TRADES'
  | 'MANAGE_EXISTING_POSITIONS_ONLY';

export interface MarketGateResponse {
  marketCondition: MarketCondition;
  marketGate: MarketGate;
  allowedActions: AllowedAction[];
  marketScore: number;
  reasons: string[];
  blockers: string[];
  dataStatus: string;
  updatedAt: string;
}

export type StrategyName = string;

export type StrategyDecision =
  | 'TRADE_CANDIDATE'
  | 'WATCH'
  | 'WAIT'
  | 'AVOID'
  | 'EXIT_CANDIDATE'
  | 'REDUCE_RISK'
  | 'HOLD'
  | 'INSUFFICIENT_DATA';

export type DecisionAction =
  | 'CONSIDER_ENTRY'
  | 'WAIT_FOR_PULLBACK'
  | 'WAIT_FOR_CONFIRMATION'
  | 'AVOID_NEW_ENTRY'
  | 'REVIEW_EXIT'
  | 'REDUCE_EXPOSURE'
  | 'HOLD_POSITION'
  | 'NO_ACTION';

export type DecisionConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type EntryZoneType = 'BREAKOUT' | 'PULLBACK' | 'REVERSAL' | 'UNKNOWN';

export interface EntryZonePreview {
  type: EntryZoneType;
  referencePrice: number;
  preferredEntryMin: number;
  preferredEntryMax: number;
  rationale: string;
}

export interface ScoreBreakdown {
  marketContext: number;
  signalStrength: number;
  trendTechnical: number;
  dataQuality: number;
  sectorSmartMoney: number;
  pullbackQuality?: number;
  portfolioRisk?: number;
  total: number;
}

export interface StrategyDecisionDto {
  id?: string;
  instrumentId?: string;
  portfolioId?: string;
  holdingId?: string;
  symbol?: string;
  country?: string;
  exchange?: string;
  strategy: StrategyName;
  decision: StrategyDecision;
  action: DecisionAction;
  decisionScore: number;
  scoreBreakdown?: ScoreBreakdown;
  confidence: DecisionConfidence;
  marketCondition: MarketCondition;
  marketGate: MarketGate;
  entryZone?: EntryZonePreview;
  riskPlan?: {
    stopLoss: string;
    targetPrice: string | null;
    rewardRiskRatio: number | null;
    targetPriceCompatibilityNote?: string;
    riskReviewLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    maxRiskNote?: string;
    rationale: string;
    reasonSummary?: string;
    invalidationRules: string[];
    exitRules: string[];
  };
  reasons: string[];
  blockers: string[];
  warnings: string[];
  dataGaps: string[];
  modelVersion: string;
  generatedAt: string;
  strategyVersion?: string;
  frameworkBacked?: boolean;
  frameworkDecision?: string;
  frameworkAction?: string;
  entryRulesPassed?: string[];
  exitRulesTriggered?: string[];
  invalidationRulesTriggered?: string[];
  noiseFiltersTriggered?: string[];
  strategyRating?: {
    ratingScore: number;
    ratingGrade: string;
    readinessLabel?: string;
  } | null;
  readinessLabel?: string | null;
}

export interface StrategyModel {
  modelVersion: string;
  strategies: {
    code: string;
    name: string;
    description: string;
    category?: string;
    style?: string;
    status?: string;
    version?: string;
    evaluationSupported?: boolean;
    thresholds: Record<string, number>;
    weights: Record<string, number>;
  }[];
  marketGateRules: Record<string, string>;
  languageSafetyRules: string[];
}

export interface StrategyEvaluateRequest {
  strategy: StrategyName | 'ALL';
  instrumentId?: string;
  symbol?: string;
  portfolioId?: string;
  watchlistId?: string;
  region?: string;
  assetType?: string;
  batchSize?: number;
  offset?: number;
}

export interface StrategyEvaluateResponse {
  processedCount: number;
  totalCount: number;
  batchSize: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  generatedCount: number;
  skippedCount: number;
  failedCount: number;
  warnings: string[];
  durationMs: number;
  results: StrategyDecisionDto[];
}

export interface StrategyQuery {
  strategy?: StrategyName;
  decision?: StrategyDecision;
  minScore?: number;
  confidence?: DecisionConfidence;
  frameworkBacked?: boolean;
  includeLegacy?: boolean;
  includeHistory?: boolean;
  strategyRatingGrades?: string;
  readinessLabels?: string;
  sector?: string;
  country?: string;
  region?: string;
  assetType?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface StrategyCandidatesResponse {
  results: StrategyDecisionDto[];
  total: number;
}
