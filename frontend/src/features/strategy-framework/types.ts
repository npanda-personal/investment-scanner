export type StrategyStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'DEPRECATED';
export type StrategyAutomationStatus = 'NOT_ELIGIBLE' | 'WATCHLIST_ONLY' | 'PAPER_TRADING_ELIGIBLE' | 'LIVE_TRADING_ELIGIBLE_FUTURE';
export type StrategyRatingGrade = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'WEAK' | 'UNPROVEN';
export type StrategyTimeframe = '1Y' | '3Y' | '5Y' | '10Y' | '15Y';

export interface StrategyRuleDeclaration {
  code: string;
  label: string;
  kind: string;
  input: string;
  threshold?: number | string | boolean;
  weight?: number;
}

export interface StrategyPerformanceSummary {
  strategyCode: string;
  strategyVersion: string;
  timeframe: StrategyTimeframe;
  region: string;
  assetType: string;
  universeKey: string;
  startingCapital: number;
  endingCapital: number;
  totalReturn: number;
  cagr: number | null;
  maxDrawdown: number;
  volatility: number | null;
  sharpe: number | null;
  winRate: number | null;
  profitFactor: number | null;
  tradeCount: number;
  averageHoldingDays: number | null;
  exposurePercent: number | null;
  ratingScore: number;
  ratingGrade: StrategyRatingGrade;
  automationEligibility: StrategyAutomationStatus;
  generatedAt: string;
}

export interface StrategyDefinition {
  code: string;
  name: string;
  description: string;
  category: string;
  style: string;
  timeframe: string;
  assetTypes: string[];
  supportedRegions: string[];
  version: string;
  status: StrategyStatus;
  requiredInputs: string[];
  entryRules: StrategyRuleDeclaration[];
  exitRules: StrategyRuleDeclaration[];
  noiseFilters: StrategyRuleDeclaration[];
  riskRules: StrategyRuleDeclaration[];
  marketGateRules: StrategyRuleDeclaration[];
  parameters: Record<string, unknown>;
  explanationTemplate: string;
  examples: { triggers: string[]; blocks: string[] };
  latestPerformance?: StrategyPerformanceSummary | null;
  latestPerformanceSummaries?: StrategyPerformanceSummary[];
}

export interface StrategyEvaluationResult {
  strategyCode: string;
  strategyVersion: string;
  instrumentId: string | null;
  symbol: string | null;
  decision: string;
  direction: string;
  score: number;
  confidence: string;
  reasons: string[];
  blockers: string[];
  warnings: string[];
  dataGaps: string[];
  entryRulesPassed: string[];
  exitRulesTriggered: string[];
  noiseFiltersTriggered: string[];
  marketGateStatus: string | null;
}

export interface StrategyEvaluateResponse {
  results: StrategyEvaluationResult[];
  matchedStrategies: StrategyEvaluationResult[];
  blockedStrategies: StrategyEvaluationResult[];
  warnings: string[];
}

export interface StrategyBacktestResponse {
  run: unknown;
  performanceSummary: StrategyPerformanceSummary;
  availability: {
    timeframe: StrategyTimeframe;
    requestedYears: number;
    status: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
    message: string | null;
  };
}
