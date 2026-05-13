import axios from 'axios';
import type { MarketGate, MarketCondition, AllowedAction, StrategyDecisionDto } from '@/features/strategy-decision-engine';

export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

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
  availabilityStatus: string;
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

export interface ResearchWhatChanged {
  newTradeCandidates: string[];
  downgradedCandidates: string[];
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

export const fetchResearchOverview = async (params: { region?: string; assetType?: string } = {}): Promise<ResearchOverview> => {
  const response = await axios.get<ResearchOverview>('/api/v1/research/overview', { params });
  return response.data;
};
