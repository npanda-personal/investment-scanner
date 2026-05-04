import type { StrategyDecisionDto, MarketGate, MarketCondition, AllowedAction } from '../strategy-decision-engine/strategy-decision-engine.types';

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
