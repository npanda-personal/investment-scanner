export type PlanStatus = 'VALID' | 'WATCH' | 'BLOCKED' | 'INSUFFICIENT_DATA';
export type RiskGrade = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNDEFINED';
export type Quality = 'STRONG' | 'ACCEPTABLE' | 'WEAK' | 'FALLBACK' | 'UNKNOWN';
export type PaperReadinessStatus = 'READY_FOR_PAPER_REVIEW' | 'WATCH_ONLY' | 'BLOCKED' | 'INSUFFICIENT_DATA';

export interface BacktestSummarySnapshot {
  timeframe: string | null;
  cagr: number | null;
  maxDrawdown: number | null;
  sharpe: number | null;
  winRate: number | null;
  profitFactor: number | null;
  tradeCount: number;
  ratingGrade: string;
  availabilityStatus: string;
  generatedAt: string | null;
}

export interface StrategyProofSnapshot {
  strategyCode: string;
  strategyVersion: string;
  strategyRating: string | null;
  readinessLabel: string | null;
  frameworkBacked: boolean;
  backtestTimeframe: string | null;
  backtestSummary: BacktestSummarySnapshot | null;
  proofStatus: string;
  proofWarnings: string[];
}

export interface StrategyDecisionSnapshot {
  strategyDecisionId: string | null;
  decision: string | null;
  action: string | null;
  decisionScore: number | null;
  confidence: string | null;
  marketGate: string | null;
  marketCondition: string | null;
  frameworkBacked: boolean | null;
  reasons: string[];
  blockers: string[];
  warnings: string[];
  dataGaps: string[];
  generatedAt: string | null;
}

export interface MarketDataSnapshot {
  instrumentId: string;
  symbol: string;
  latestPrice: number | null;
  latestPriceTimestamp: string | null;
  latestCompletedTradingDate: string | null;
  latestStoredTradingDate: string | null;
  currency: string | null;
  exchange: string | null;
  region: string | null;
  assetType: string | null;
  dataStatus: string | null;
  source?: string | null;
}

export interface DataQualitySnapshot {
  status?: string;
  coverageStatus?: string | null;
  signalReadinessStatus?: string | null;
  liquidityStatus?: string | null;
  coverageScore?: number | null;
  signalReadinessScore?: number | null;
  liquidityScore?: number | null;
  eligibleForSignals?: boolean | null;
  warnings: string[];
  blockers: string[];
  generatedAt: string | null;
}

export interface EntryZone {
  type: string;
  referencePrice: number;
  preferredEntryMin: number;
  preferredEntryMax: number;
  quality?: Quality;
  rationale: string;
}

export interface StopLoss {
  price: number;
  percentBelowEntry: number;
  method: string;
  quality?: Quality;
  rationale: string;
}

export interface Target {
  price: number;
  expectedReturnPercent: number;
  method: string;
  quality?: Quality;
  rationale: string;
}

export interface PositionSizing {
  portfolioId: string | null;
  capitalBase: number;
  riskPercent: number;
  maxRiskAmount: number;
  suggestedQuantity: number;
  estimatedPositionValue: number;
  positionValuePercent: number;
  notes: string[];
}

export interface PortfolioImpact {
  sectorExposureAfterTrade: number | null;
  singlePositionExposureAfterTrade: number | null;
  warnings: string[];
}

export interface TradePlanResultDto {
  id?: string;
  instrumentId: string;
  symbol: string;
  strategy: string;
  strategyVersion: string;
  strategyDecisionId?: string | null;
  portfolioId?: string | null;
  region?: string | null;
  assetType?: string | null;
  strategyRating?: string | null;
  readinessLabel?: string | null;
  backtestTimeframe?: string | null;
  backtestSummary?: BacktestSummarySnapshot | null;
  strategyProofSnapshot?: StrategyProofSnapshot | null;
  strategyDecisionSnapshot?: StrategyDecisionSnapshot | null;
  latestPrice?: number | null;
  latestPriceTimestamp?: string | null;
  marketDataSnapshot?: MarketDataSnapshot | null;
  dataQualitySnapshot?: DataQualitySnapshot | null;
  planStatus: PlanStatus;
  riskGrade: RiskGrade;
  entryZone: EntryZone | null;
  stopLoss: StopLoss | null;
  target: Target | null;
  rewardRiskRatio: number;
  positionSizing: PositionSizing | null;
  portfolioImpact: PortfolioImpact | null;
  invalidationRules: string[];
  warnings: string[];
  blockers: string[];
  dataGaps: string[];
  paperReadinessStatus?: PaperReadinessStatus;
  paperReadinessReasons?: string[];
  paperReadinessBlockers?: string[];
  proofGeneratedAt?: string | null;
  snapshotVersion?: string | null;
  generatedAt: string;
  modelVersion: string;
}

export interface GenerateTradePlanRequest {
  instrumentId: string;
  symbol: string;
  strategyDecisionId?: string;
  portfolioId?: string;
  region?: string;
  assetType?: string;
  backtestTimeframe?: string;
  riskPercent?: number;
  capitalBase?: number;
  targetRewardRisk?: number;
}

export interface BatchGenerateTradePlanRequest {
  batchSize?: number;
  offset?: number;
  region?: string;
  assetType?: string;
  strategyCode?: string;
  backtestTimeframe?: string;
}

export interface BatchGenerateFailure {
  strategyDecisionId?: string;
  instrumentId?: string;
  symbol?: string;
  reason: string;
}

export interface BatchGenerateTradePlanResponse {
  count: number;
  generatedCount: number;
  failedCount: number;
  candidateCount: number;
  rawCandidateCount?: number;
  eligibleCandidateCount?: number;
  skippedCount?: number;
  skipReasonCounts?: Record<string, number>;
  paperReadinessSummary?: Record<string, number>;
  topBlockers?: Array<{ reason: string; count: number }>;
  backtestTimeframe?: string | null;
  totalCount: number;
  batchSize: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  plans: TradePlanResultDto[];
  failures: BatchGenerateFailure[];
}

export interface CountItem {
  reason: string;
  count: number;
}

export interface TradePlanFunnelDiagnostics {
  region: string;
  assetType: string;
  generatedAt: string;
  rawSignals: {
    total: number;
    bullish: number;
    bearish: number;
    neutral: number;
    byDirection: Record<string, number>;
  };
  strategyMatches: {
    totalWithMatch: number;
    totalWithoutMatch: number;
    byStrategy: CountItem[];
  };
  strategyDecisions: {
    total: number;
    tradeCandidates: number;
    watch: number;
    avoid: number;
    exitCandidates: number;
    reduceRisk: number;
    hold: number;
    insufficientData: number;
    frameworkBacked: number;
    notFrameworkBacked: number;
  };
  tradePlanCandidateDiscovery: {
    discoveredCandidates: number;
    eligibleForPlanGeneration: number;
    skippedBeforeGeneration: number;
    skipReasonCounts: Record<string, number>;
    skipReasons: CountItem[];
  };
  generatedPlans: {
    total: number;
    valid: number;
    watch: number;
    blocked: number;
    insufficientData: number;
    byStrategy: CountItem[];
    byRiskGrade: CountItem[];
    byPlanStatus: CountItem[];
  };
  paperReadiness: {
    readyForPaperReview: number;
    watchOnly: number;
    blocked: number;
    insufficientData: number;
    blockerCounts: CountItem[];
    topBlockers: CountItem[];
    reasonCounts: CountItem[];
  };
  proof: {
    byBacktestTimeframe: CountItem[];
    byStrategyRating: CountItem[];
    missingBacktestSummaryCount: number;
    weakOrUnprovenRatingCount: number;
  };
  dataQuality: {
    missingSnapshotCount: number;
    unusableCount: number;
    illiquidCount: number;
    unknownLiquidityCount: number;
  };
  recommendations: string[];
}
