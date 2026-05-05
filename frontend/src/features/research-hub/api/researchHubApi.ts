import axios from 'axios';
import type { MarketGate, MarketCondition, AllowedAction, StrategyDecisionDto } from '@/features/strategy-decision-engine';

export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface NextAction {
  label: string;
  priority: PriorityLevel;
  targetRoute: string;
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
  tradeCandidates: StrategyDecisionDto[];
  watchCandidates: StrategyDecisionDto[];
  avoidCandidates: StrategyDecisionDto[];
  exitCandidates: StrategyDecisionDto[];
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
  marketReadiness: MarketReadiness;
  researchPriorities: ResearchPriorities;
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
