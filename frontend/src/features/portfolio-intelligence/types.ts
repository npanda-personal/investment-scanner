export type PortfolioHealthStatus = 'HEALTHY' | 'WATCH' | 'AT_RISK';
export type HoldingDecisionLabel = 'GOOD' | 'WATCH' | 'REVIEW' | 'HIGH_RISK';
export type HoldingActionSuggestion = 'HOLD' | 'REVIEW' | 'REDUCE_RISK';
export type RedFlagSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ScoreBreakdown {
  concentration: number;
  pnlHealth: number;
  signalQuality: number;
  dataCompleteness: number;
  sectorConcentration: number;
}

export interface HoldingIntelligence {
  holdingId: string;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  allocationPercent: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number | null;
  dailyChangePercent: number | null;
  latestSignal: { score: number; direction: string; confidence: string; generatedAt: string } | null;
  decisionLabel: HoldingDecisionLabel;
  actionSuggestion: HoldingActionSuggestion;
  reasons: string[];
}

export interface RedFlag {
  severity: RedFlagSeverity;
  category: string;
  title: string;
  description: string;
  affectedHoldings?: Array<{ holdingId: string; instrumentId: string; symbol: string }>;
}

export interface ReviewItem {
  holdingId: string;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  decisionLabel: HoldingDecisionLabel;
  actionSuggestion: HoldingActionSuggestion;
  allocationPercent: number;
  unrealizedPnLPercent: number | null;
  signalDirection: string | null;
  reasons: string[];
}

export interface GroupedHoldingSummary {
  holdingId: string;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  reasons: string[];
}

export interface SignalOverlaySummary {
  bullishCount: number;
  neutralCount: number;
  bearishCount: number;
  missingSignalCount: number;
  weightedAverageSignalScore: number | null;
  bullishMarketValuePercent: number;
  bearishMarketValuePercent: number;
}

export interface PortfolioIntelligenceResponse {
  portfolioId: string;
  generatedAt: string;
  healthScore: number;
  status: PortfolioHealthStatus;
  explanation: string;
  scoreBreakdown: ScoreBreakdown;
  holdings: HoldingIntelligence[];
  redFlags: RedFlag[];
  reviewRanking: ReviewItem[];
  groupedSummary: {
    strongHoldings: GroupedHoldingSummary[];
    weakHoldings: GroupedHoldingSummary[];
    needsReview: GroupedHoldingSummary[];
    dataIssues: GroupedHoldingSummary[];
  };
  signalOverlay: SignalOverlaySummary;
  source: string;
  dataStatus: string;
}
