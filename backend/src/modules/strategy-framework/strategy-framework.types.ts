import type { BacktestStrategyConfig } from '../backtesting-strategy-lab';
import type { SignalConfidence, SignalDirection, SignalItem, SignalPricePoint, SignalResultDto } from '../signal-generation-engine';

export type StrategyStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'DEPRECATED';
export type StrategyAutomationStatus = 'NOT_ELIGIBLE' | 'WATCHLIST_ONLY' | 'PAPER_TRADING_ELIGIBLE' | 'LIVE_TRADING_ELIGIBLE_FUTURE';
export type StrategyReadinessLabel = 'RESEARCH_ONLY' | 'WATCHLIST_CANDIDATE' | 'PAPER_TEST_CANDIDATE' | 'NOT_AUTOMATION_READY';
export type StrategyRatingGrade = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'WEAK' | 'UNPROVEN';
export type StrategyDecision = 'SIGNAL' | 'ENTRY_CANDIDATE' | 'WAIT' | 'WATCH' | 'AVOID' | 'EXIT_CANDIDATE' | 'REDUCE_RISK' | 'HOLD' | 'INSUFFICIENT_DATA';
export type StrategyDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type StrategyTimeframe = '1Y' | '3Y' | '5Y' | '10Y' | '15Y';
export type StrategyCategory = 'ENTRY' | 'EXIT' | 'FILTER' | 'GATE';
export type StrategyRuleKind = 'REQUIRES' | 'BLOCKS' | 'SCORES' | 'WARNS';

export interface StrategyRuleDeclaration {
  code: string;
  label: string;
  kind: StrategyRuleKind;
  input: string;
  operator?: string;
  threshold?: number | string | boolean;
  weight?: number;
}

export interface StrategyDefinition {
  id?: string;
  code: string;
  name: string;
  description: string;
  category: StrategyCategory;
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
  examples: {
    triggers: string[];
    blocks: string[];
  };
}

export interface StrategyContext {
  instrumentId?: string;
  symbol?: string;
  companyName?: string | null;
  assetType?: string | null;
  region?: string | null;
  exchange?: string | null;
  sector?: string | null;
  industry?: string | null;
  country?: string | null;
  currency?: string | null;
  latestPrice?: number | null;
  previousClose?: number | null;
  prices?: SignalPricePoint[];
  bars?: Array<{ date: string; close: number; volume?: number | null }>;
  sma50?: number | null;
  sma200?: number | null;
  rsi?: number | null;
  return20d?: number | null;
  high52Week?: number | null;
  low52Week?: number | null;
  volatility?: number | null;
  averageVolume20?: number | null;
  rawSignal?: SignalResultDto | null;
  calibratedSignal?: {
    calibratedScore: number;
    calibratedDirection: SignalDirection;
    calibratedConfidence: SignalConfidence;
  } | null;
  reliability?: {
    status?: string | null;
    noiseLevel?: string | null;
    noisyIssueTypes?: string[];
  } | null;
  dataQuality?: {
    coverageStatus?: string | null;
    signalReadinessStatus?: string | null;
    liquidityStatus?: string | null;
    signalReadinessScore?: number | null;
    eligibleForSignals?: boolean | null;
    eligibleForBacktesting?: boolean | null;
  } | null;
  marketGate?: 'OPEN' | 'SELECTIVE' | 'CLOSED' | 'UNKNOWN' | string | null;
  marketRegime?: string | null;
  sectorLeadership?: string | null;
  sectorRelativeStrengthScore?: number | null;
  countryStrengthScore?: number | null;
  smartMoneyStatus?: string | null;
  smartMoneyScore?: number | null;
  holding?: {
    quantity?: number | null;
    unrealizedPnLPercent?: number | null;
    allocationPercent?: number | null;
  } | null;
  backtestDate?: string | null;
  executionAssumptions?: Record<string, unknown>;
}

export interface StrategySignalOutput {
  strategyCode: string;
  strategyVersion: string;
  instrumentId: string | null;
  symbol: string | null;
  decision: StrategyDecision;
  direction: StrategyDirection;
  score: number;
  confidence: SignalConfidence;
  reasons: string[];
  blockers: string[];
  warnings: string[];
  dataGaps: string[];
  entryRulesPassed: string[];
  exitRulesTriggered: string[];
  noiseFiltersTriggered: string[];
  marketGateStatus: string | null;
  eligibleForSignalGeneration: boolean;
  eligibleForBacktest: boolean;
  eligibleForAutomationFuture: boolean;
}

export interface StrategyEvaluator {
  evaluateSignalCandidate(context: StrategyContext): StrategySignalOutput;
  evaluateEntry(context: StrategyContext): StrategySignalOutput;
  evaluateExit(context: StrategyContext): StrategySignalOutput;
  getBacktestConfig(input: RegisteredBacktestInput): BacktestStrategyConfig;
}

export interface RegisteredBacktestInput {
  strategyCode: string;
  timeframe: StrategyTimeframe;
  region?: string;
  assetType?: string;
  universe?: {
    type: 'ALL' | 'INSTRUMENTS' | 'SYMBOLS' | 'WATCHLIST';
    instrumentIds?: string[];
    symbols?: string[];
    watchlistId?: string;
  };
  initialCapital?: number;
  maxPositions?: number;
  transactionCostPercent?: number;
  positionSizeType?: 'EQUAL_WEIGHT' | 'FIXED_AMOUNT';
  fixedAmountPerTrade?: number;
}

export interface StrategyPerformanceSummaryDto {
  id?: string;
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
  readinessLabel: StrategyReadinessLabel;
  ratingReasons?: string[];
  backtestRunId?: string | null;
  generatedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StrategyListQuery {
  status?: StrategyStatus;
  category?: StrategyCategory;
  style?: string;
  region?: string;
  assetType?: string;
}

export interface StrategyPerformanceQuery {
  timeframe?: StrategyTimeframe;
  region?: string;
  assetType?: string;
  universeKey?: string;
}

export interface StrategyRankingsQuery extends StrategyPerformanceQuery {
  minRating?: StrategyRatingGrade;
}

export interface StrategyEvaluateRequest {
  strategyCode?: string;
  instrumentId?: string;
  symbol?: string;
  region?: string;
  assetType?: string;
}

export interface StrategyEvaluateResponse {
  results: StrategySignalOutput[];
  matchedStrategies: StrategySignalOutput[];
  blockedStrategies: StrategySignalOutput[];
  warnings: string[];
}

export interface StrategyMatchSummary {
  strategyCode: string;
  strategyVersion: string;
  decision: StrategyDecision;
  direction: StrategyDirection;
  score: number;
  confidence: SignalConfidence;
  reasons: string[];
  blockers: string[];
  noiseFiltersTriggered: string[];
}

export interface StrategyBacktestRunResponse {
  run: unknown;
  performanceSummary: StrategyPerformanceSummaryDto;
  availability: {
    timeframe: StrategyTimeframe;
    requestedYears: number;
    status: 'AVAILABLE' | 'PARTIAL' | 'INSUFFICIENT_HISTORY' | 'NOT_RUN' | 'ERROR';
    message: string | null;
  };
}

export interface StrategyFrameworkHealth {
  configuredStrategiesCount: number;
  activeStrategiesCount: number;
  strategiesWithBacktestResults: number;
  missingPerformanceCount: number;
}

export interface StrategyModelResponse {
  statuses: StrategyStatus[];
  automationStatuses: StrategyAutomationStatus[];
  timeframes: StrategyTimeframe[];
  decisions: StrategyDecision[];
  ratingMethodology: string[];
  ruleModel: string[];
  disclaimer: string;
}

export type StrategySignalItem = SignalItem;
