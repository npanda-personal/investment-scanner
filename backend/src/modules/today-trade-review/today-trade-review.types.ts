import type { DataQualityEvaluationDto } from '../data-quality-engine';
import type { MarketContextSummary } from '../market-context-intelligence';
import type { ReviewReadinessSummary, TrustedReviewUniverseHealth, TrustedReviewUniverseInstrument } from '../market-data-foundation';
import type { SignalCalibrationResultDto } from '../signal-calibration-engine';
import type { SignalResultDto } from '../signal-generation-engine';
import type { SmartMoneyStockSummary } from '../smart-money-intelligence';
import type { StrategyDecisionDto } from '../strategy-decision-engine';
import type { TradePlanResultDto } from '../trade-plan-risk-engine';

export type TodayReviewRunStatus = 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
export type TodayReviewCandidateState =
  | 'LONG_REVIEW'
  | 'SHORT_REVIEW'
  | 'EXIT_RISK_REVIEW'
  | 'WATCH_ONLY'
  | 'BLOCKED'
  | 'AVOID'
  | 'INSUFFICIENT_DATA'
  | 'UNPROVEN';
export type TodayReviewDirection = 'LONG' | 'SHORT' | 'EXIT_RISK' | 'WATCH' | 'BLOCKED' | 'AVOID';
export type TodayReviewGrade = 'A' | 'B' | 'C' | 'D' | 'UNPROVEN';
export type TodayReviewTrustStatus = 'OK' | 'PARTIAL' | 'STALE' | 'FAILED';
export type TodayReviewUniverseMode = 'FULL_REVIEW' | 'LIMITED_REVIEW' | 'NO_REVIEW';
export type TodayReviewTrustedLoadStatus = 'COMPLETE' | 'CONFIGURED_PARTIAL' | 'LOAD_FAILED';
export type TodayReviewReasonCategory =
  | 'READINESS'
  | 'DATA_QUALITY'
  | 'SIGNAL_MATURITY'
  | 'CALIBRATION'
  | 'STRATEGY_PROOF'
  | 'STRATEGY_DECISION'
  | 'TRADE_PLAN_PROOF_CHAIN'
  | 'MARKET_GATE'
  | 'OUTSIDE_SCOPE'
  | 'NO_SETUP';
export type TodayReviewReasonSeverity = 'INFO' | 'WATCH' | 'BLOCKER';

export interface TodayReviewRunRequest {
  region?: string;
  assetType?: string;
}

export interface TodayReviewQuery {
  region?: string;
  assetType?: string;
  limit?: number;
  offset?: number;
}

export interface TodayReviewSourceSnapshot {
  marketData?: Record<string, unknown> | null;
  reviewReadiness?: ReviewReadinessSummary | null;
  reviewUniverse?: TrustedReviewUniverseHealth | null;
  scanFunnel?: TodayReviewScanFunnel | null;
  marketGate?: Record<string, unknown> | null;
  marketContext?: MarketContextSummary | null;
  rawSignalUniverse?: Record<string, unknown> | null;
  explainability?: TodayReviewExplainability | null;
  generatedAt: string;
}

export interface TodayReviewScanFunnel {
  trustedUniverseCount: number;
  trustedInstrumentsScanned: number;
  trustedInstrumentsSkipped: number;
  scanLimit: number;
  scanComplete: boolean;
  scanOrdering: string;
  trustedLoadStatus: TodayReviewTrustedLoadStatus;
  membershipLoadFailureReason: string | null;
  strategyCandidatesSeen: number;
  strategyCandidatesEligible: number;
  strategyCandidatesExcluded: number;
  outsideTrustedUniverse: number;
  setupsDetected: number;
  promotedCandidates: number;
  watchOnly: number;
  unproven: number;
  blocked: number;
  noSetup: number;
  topNoPromotionReasons: Record<string, number>;
}

export interface TodayReviewCandidateDto {
  id?: string;
  runId?: string;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  direction: TodayReviewDirection;
  state: TodayReviewCandidateState;
  setupType: string | null;
  strategyCode: string;
  strategyVersion: string | null;
  rank: number;
  grade: TodayReviewGrade;
  confidenceScore: number;
  reasonSummary: string;
  blockers: string[];
  watchReasons: string[];
  dataQualitySnapshot: DataQualityEvaluationDto | Record<string, unknown> | null;
  marketContextSnapshot: Record<string, unknown> | null;
  strategyProofSnapshot: Record<string, unknown> | null;
  tradePlanSnapshot: TradePlanResultDto | Record<string, unknown> | null;
  sourceSignalSnapshot: Record<string, unknown> | null;
  explainability?: TodayReviewCandidateExplainability;
  createdAt?: string;
  updatedAt?: string;
}

export interface TodayReviewCandidateReason {
  category: TodayReviewReasonCategory;
  code: string;
  label: string;
  severity: TodayReviewReasonSeverity;
  sourceModule: string;
  evidenceDate?: string | null;
  targetRoute?: string;
}

export interface TodayReviewCandidateExplainability {
  candidateId: string;
  state: TodayReviewCandidateState;
  rankingComponents: {
    strategyProof: number;
    tradePlan: number;
    marketRegime: number;
    sectorAlignment: number;
    signalCalibration: number;
    dataQuality: number;
    smartMoney: number;
    hardBlockerOverride: boolean;
  };
  promotionReasons: TodayReviewCandidateReason[];
  watchReasons: TodayReviewCandidateReason[];
  blockers: TodayReviewCandidateReason[];
  upstreamEvidence: {
    readiness?: unknown;
    signalEvidence?: unknown;
    calibrationReadiness?: unknown;
    strategyProof?: unknown;
    tradePlanProofChain?: unknown;
  };
}

export interface ExclusionReasonSummary {
  category: TodayReviewReasonCategory;
  code: string;
  label: string;
  count: number;
  blocking: boolean;
  sourceModule: string;
  targetRoute?: string;
}

export interface TodayReviewExcludedExample {
  instrumentId: string;
  symbol: string;
  companyName?: string | null;
  primaryReasonCode: string;
  primaryReasonLabel: string;
  reasonCategories: TodayReviewReasonCategory[];
  promoted: false;
}

export interface TodayReviewExplainability {
  runId: string;
  scope: { region: string; assetType: string };
  reviewMode: TodayReviewUniverseMode;
  trustedUniverseCount: number;
  scannedCount: number;
  promotedCount: number;
  watchCount: number;
  blockedCount: number;
  unprovenCount: number;
  insufficientDataCount: number;
  excludedCount: number;
  exclusionSummaries: ExclusionReasonSummary[];
  inspectableExcludedExamples: TodayReviewExcludedExample[];
}

export interface TodayReviewRunDto {
  id: string;
  runDate: string;
  region: string;
  assetType: string;
  status: TodayReviewRunStatus;
  trustStatus: TodayReviewTrustStatus;
  dataThroughDate: string | null;
  startedAt: string;
  finishedAt: string | null;
  warnings: string[];
  candidateCounts: Record<string, number>;
  sourceSnapshot: TodayReviewSourceSnapshot | Record<string, unknown>;
  reviewUniverseMode?: TodayReviewUniverseMode;
  trustedUniverseCount?: number;
  catalogCount?: number;
  coverageWarnings?: string[];
  scanFunnel?: TodayReviewScanFunnel | null;
  explainability?: TodayReviewExplainability;
  createdAt: string;
  updatedAt: string;
  candidates: TodayReviewCandidateDto[];
}

export interface TodayReviewGroupedCandidates {
  longReview: TodayReviewCandidateDto[];
  shortReview: TodayReviewCandidateDto[];
  exitRiskReview: TodayReviewCandidateDto[];
  watchOnly: TodayReviewCandidateDto[];
  blocked: TodayReviewCandidateDto[];
  avoid: TodayReviewCandidateDto[];
  insufficientData: TodayReviewCandidateDto[];
  unproven: TodayReviewCandidateDto[];
}

export interface TodayReviewRunResponse {
  run: TodayReviewRunDto | null;
  groups: TodayReviewGroupedCandidates;
  scope: {
    region: string;
    assetType: string;
  };
}

export interface TodayReviewRunHistoryResponse {
  items: TodayReviewRunDto[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
  };
}

export interface TodayReviewRepository {
  markRunStarted(input: {
    runDate: Date;
    region: string;
    assetType: string;
    startedAt: Date;
    warnings: string[];
    sourceSnapshot: TodayReviewSourceSnapshot | Record<string, unknown>;
  }): Promise<TodayReviewRunDto>;
  completeRun(input: {
    runId: string;
    status: TodayReviewRunStatus;
    dataThroughDate: Date | null;
    finishedAt: Date;
    warnings: string[];
    candidateCounts: Record<string, number>;
    sourceSnapshot: TodayReviewSourceSnapshot | Record<string, unknown>;
    candidates: TodayReviewCandidateDto[];
  }): Promise<TodayReviewRunDto>;
  latest(region: string, assetType: string): Promise<TodayReviewRunDto | null>;
  getRun(id: string): Promise<TodayReviewRunDto | null>;
  listRuns(query: Required<Pick<TodayReviewQuery, 'region' | 'assetType' | 'limit' | 'offset'>>): Promise<{ items: TodayReviewRunDto[]; total: number }>;
  getCandidate(id: string): Promise<TodayReviewCandidateDto | null>;
}

export interface TodayReviewUpstreamServices {
  strategyDecisionService: {
    marketGate(region?: string): Promise<any>;
    candidates(query: any): Promise<{ results: StrategyDecisionDto[]; total: number }>;
    exits(portfolioId?: string, region?: string, assetType?: string): Promise<StrategyDecisionDto[]>;
  };
  tradePlanService: {
    latestForInstrument(instrumentId: string, strategy?: string, portfolioId?: string, scope?: { region?: string; assetType?: string }): Promise<TradePlanResultDto | null>;
    generatePlan(request: { instrumentId: string; symbol: string; strategyDecisionId?: string; region?: string; assetType?: string }): Promise<TradePlanResultDto>;
  };
  marketDataService: {
    latestStoredCandleInfo(region: string, assetType?: string, now?: Date): Promise<Record<string, unknown>>;
    reviewReadinessSummary?(options: { region?: string; assetType?: string }): Promise<ReviewReadinessSummary>;
    trustedReviewUniverseHealth?(options: { region?: string; assetType?: string }): Promise<TrustedReviewUniverseHealth>;
    listTrustedReviewUniverseInstruments?(options: { region?: string; assetType?: string; limit?: number; offset?: number }): Promise<TrustedReviewUniverseInstrument[]>;
  };
  dataQualityService: {
    getLatestEvaluationForInstrument(instrumentId: string): Promise<DataQualityEvaluationDto | null>;
    getEvaluationsForInstruments(instrumentIds: string[]): Promise<DataQualityEvaluationDto[]>;
  };
  marketContextService: {
    latestPersistedSummary(region?: string): Promise<MarketContextSummary | null>;
  };
  signalService: {
    latestForInstrument(instrumentId: string): Promise<SignalResultDto | null>;
    latestSignalUniverse(query: any): Promise<SignalResultDto[]>;
  };
  calibrationService: {
    latestPersistedForInstrument(instrumentId: string): Promise<SignalCalibrationResultDto | null>;
  };
  smartMoneyService: {
    latestPersistedStock(instrumentId: string, range?: '1M' | '3M' | '6M'): Promise<SmartMoneyStockSummary | null>;
  };
}

export interface TodayReviewCandidateSource {
  decision: StrategyDecisionDto;
  dataQuality: DataQualityEvaluationDto | null;
  marketContext: MarketContextSummary | null;
  marketGate: Record<string, unknown> | null;
  tradePlan: TradePlanResultDto | null;
  rawSignal: SignalResultDto | null;
  calibration: SignalCalibrationResultDto | null;
  smartMoney: SmartMoneyStockSummary | null;
  sourceKind: 'ENTRY' | 'EXIT';
}
