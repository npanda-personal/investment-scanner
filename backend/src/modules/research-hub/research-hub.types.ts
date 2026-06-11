import type { StrategyDecisionDto, MarketGate, MarketCondition, AllowedAction } from '../strategy-decision-engine/strategy-decision-engine.types';
import type { SignalConfidence } from '../../shared/types/signal.types';

export type PriorityLevel = SignalConfidence;

export interface NextAction {
  label: string;
  priority: PriorityLevel;
  targetRoute: string;
}

export type ActionabilityStatus = 'READY' | 'LIMITED' | 'BLOCKED' | 'UNPROVEN' | 'INSUFFICIENT_DATA';

export interface ActionabilityDimension {
  status: ActionabilityStatus;
  label: string;
  sourceModule: string;
  blocking: boolean;
  count?: number;
  evidenceDate?: string | null;
  message: string;
}

export interface ResearchActionability {
  overallStatus: ActionabilityStatus;
  canReviewActionableSetups: boolean;
  headline: string;
  researchSupportOnly: true;
  dimensions: {
    marketEnvironment: ActionabilityDimension;
    dataReadiness: ActionabilityDimension;
    signalEvidence: ActionabilityDimension;
    calibrationReadiness: ActionabilityDimension;
    strategyProof: ActionabilityDimension;
    todayReviewReadiness: ActionabilityDimension;
    tradePlanReadiness: ActionabilityDimension;
  };
  nextBestAction: {
    label: string;
    targetRoute: string;
    sourceModule: string;
    priority: PriorityLevel;
  } | null;
  blockers: Array<{ sourceModule: string; category: string; count?: number; message: string }>;
}

export interface MarketReadiness {
  marketGate: MarketGate;
  marketCondition: MarketCondition;
  headline: string;
  allowedActions: AllowedAction[];
  reasons: string[];
  blockers: string[];
  dataStatus: string;
}

export interface ResearchPriorities {
  tradeCandidates: ResearchPriorityCandidate[];
  watchCandidates: ResearchPriorityCandidate[];
  avoidCandidates: ResearchPriorityCandidate[];
  exitCandidates: ResearchPriorityCandidate[];
  /**
   * Short-review candidates: bearish F&O/derivatives-eligible setups from short-entry strategies.
   * Research-support framing — never buy/sell language; uses entry/stop/cover language.
   * Gated to derivativesEligible instruments only.
   */
  shortReviewCandidates: ResearchPriorityCandidate[];
}

export interface ResearchBacktestSummary {
  timeframe: string;
  cagr: number | null;
  maxDrawdown: number | null;
  sharpe: number | null;
  winRate: number | null;
  profitFactor: number | null;
  tradeCount: number;
  ratingGrade: string;
  availabilityStatus: 'AVAILABLE' | 'PARTIAL' | 'INSUFFICIENT_HISTORY' | 'NOT_RUN' | 'ERROR';
  generatedAt: string;
}

export interface ResearchPriorityCandidate extends StrategyDecisionDto {
  companyName?: string | null;
  strategyCode?: string;
  backtestSummary?: ResearchBacktestSummary | null;
  primaryNextAction: string;
  targetRoute: string;
  strategyRoute: string;
  backtestRoute?: string | null;
  stockRoute?: string | null;
  proofWarnings: string[];
}

export interface StrategyProofSummary {
  strategiesProducingCandidates: Array<{
    strategy: string;
    strategyVersion?: string;
    candidateCount: number;
    bestRating: string;
    readinessLabel: string;
    topCandidateSymbol?: string;
  }>;
  provenCandidateCount: number;
  unprovenCandidateCount: number;
  blockedByMarketGateCount: number;
  missingBacktestCount: number;
  notes: string[];
}

export interface ConfirmationSummary {
  signalSummary: {
    topBullishCount: number;
    topBearishCount: number;
    reliabilityAvailable: boolean;
    notes: string[];
  };
  smartMoneySummary: {
    accumulationCount: number;
    distributionCount: number;
    topConfirmations: string[];
    topContradictions: string[];
  };
  marketContextSummary: {
    leadingSectors: string[];
    weakSectors: string[];
    breadthStatus: string;
    notes: string[];
  };
}

export interface ResearchWhatChangedDelta {
  symbol: string;
  /** Score in the current snapshot */
  currentScore: number;
  /** Score in the prior snapshot */
  priorScore: number;
  /** Positive = score went up; negative = score went down */
  scoreDelta: number;
  /** Whether readiness rank improved (promoted) or worsened (demoted) */
  readinessChange: 'PROMOTED' | 'DEMOTED' | 'UNCHANGED';
}

export interface ResearchWhatChanged {
  /** Candidates that newly appeared in the current snapshot (not in prior) */
  newTradeCandidates: string[];
  /** Candidates that dropped out of the current snapshot (were in prior, not in current) */
  droppedCandidates: string[];
  /**
   * @deprecated Use droppedCandidates + scoreDeltaCandidates instead.
   * Kept for backwards compatibility (legacy: dropped OR score-fell candidates).
   */
  downgradedCandidates: string[];
  /** Candidates still present in both snapshots whose score/readiness improved */
  upgradedCandidates: ResearchWhatChangedDelta[];
  /** Candidates still present in both snapshots whose score/readiness worsened */
  demotedCandidates: ResearchWhatChangedDelta[];
  marketGateChange: { from: MarketGate; to: MarketGate } | null;
  warnings: string[];
}

export interface ResearchOverview {
  actionability: ResearchActionability;
  marketReadiness: MarketReadiness;
  researchPriorities: ResearchPriorities;
  strategyProofSummary: StrategyProofSummary;
  confirmationSummary: ConfirmationSummary;
  whatChanged: ResearchWhatChanged;
  nextActions: NextAction[];
  generatedAt: string;
  dataGaps: string[];
}
