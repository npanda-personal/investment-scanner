import type { BacktestStrategyConfig } from '../backtesting-strategy-lab';
import type { SignalConfidence, SignalDirection, SignalItem, SignalPricePoint, SignalResultDto } from '../signal-generation-engine';

export type StrategyStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'DEPRECATED';
export type StrategyAutomationStatus = 'NOT_ELIGIBLE' | 'WATCHLIST_ONLY' | 'PAPER_TEST_CANDIDATE';
export type StrategyReadinessLabel = 'RESEARCH_ONLY' | 'WATCHLIST_CANDIDATE' | 'PAPER_TEST_CANDIDATE' | 'NOT_AUTOMATION_READY';
export type StrategyRatingGrade = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'WEAK' | 'UNPROVEN';
export type StrategyDecision = 'SIGNAL' | 'ENTRY_CANDIDATE' | 'WAIT' | 'WATCH' | 'AVOID' | 'EXIT_CANDIDATE' | 'REDUCE_RISK' | 'HOLD' | 'INSUFFICIENT_DATA';
export type StrategyDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type StrategyTimeframe = '1Y' | '3Y' | '5Y' | '10Y' | '15Y';
export type StrategyCategory = 'ENTRY' | 'EXIT' | 'FILTER' | 'GATE' | 'RISK' | 'CALIBRATION' | 'DIAGNOSTIC';
export type StrategyRuleKind = 'REQUIRES' | 'BLOCKS' | 'SCORES' | 'WARNS';
export type StrategyProofStatus = 'PROVEN' | 'LIMITED' | 'UNPROVEN' | 'BLOCKED' | 'MISSING';
export type StrategySampleSufficiency = 'SUFFICIENT' | 'LOW_SAMPLE' | 'INSUFFICIENT' | 'NOT_APPLICABLE';
export type StrategyDefinitionSource = 'PERSISTED' | 'REGISTRY_FALLBACK';
export type StrategyDefinitionProviderSource = 'PERSISTED' | 'MIXED' | 'REGISTRY_FALLBACK';
export type StrategyDefinitionDriftType =
  | 'MISSING_PERSISTED_DEFINITION'
  | 'PERSISTED_VERSION_DIFFERS_FROM_REGISTRY'
  | 'CHECKSUM_MISMATCH'
  | 'PERSISTED_DEFINITION_NOT_IN_REGISTRY'
  | 'PERSISTENCE_READ_FAILED';
export type StrategyDefinitionDriftSeverity = 'INFO' | 'WARN';

export interface StrategyDefinitionDrift {
  type: StrategyDefinitionDriftType;
  severity: StrategyDefinitionDriftSeverity;
  strategyCode: string;
  persistedVersion?: string;
  registryVersion?: string;
  persistedChecksum?: string;
  registryChecksum?: string;
  message: string;
}

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
  invalidationRules: StrategyRuleDeclaration[];
  noiseFilters: StrategyRuleDeclaration[];
  riskRules: StrategyRuleDeclaration[];
  marketGateRules: StrategyRuleDeclaration[];
  parameters: Record<string, unknown>;
  strategyRating?: Record<string, unknown> | null;
  readinessLabel?: StrategyReadinessLabel;
  checksum?: string;
  effectiveAt?: string;
  definitionSource?: StrategyDefinitionSource;
  definitionDrift?: StrategyDefinitionDrift[];
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
    calibratedConfidence: SignalConfidence | 'INSUFFICIENT_SAMPLE';
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
  /**
   * Whether the instrument is eligible for F&O / derivatives (required for short-entry strategies).
   * Populated by toStrategyFrameworkContext from ctx.instrument.derivativesEligible or
   * ctx.instrument.derivatives_eligible.  null means eligibility was not available in the
   * instrument record; false means explicitly cash-only.
   */
  derivativesEligible?: boolean | null;
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
  invalidationRulesTriggered: string[];
  noiseFiltersTriggered: string[];
  marketGateStatus: string | null;
  eligibleForSignalGeneration: boolean;
  eligibleForBacktest: boolean;
  eligibleForAutomationFuture: boolean;
}

export interface StrategyFrameworkContextEvaluation {
  definition: StrategyDefinition;
  result: StrategySignalOutput;
  definitionSource?: StrategyDefinitionSource;
  definitionDrift: StrategyDefinitionDrift[];
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
  slippagePercent?: number;
  maxHoldingDays?: number;
  stopLossPercent?: number;
  trailingStopPercent?: number;
  takeProfitPercent?: number;
  positionSizeType?: 'EQUAL_WEIGHT' | 'FIXED_AMOUNT';
  fixedAmountPerTrade?: number;
  /**
   * Fix #9: optional explicit end date (YYYY-MM-DD).  When omitted, today's
   * wall-clock date is used.  Providing this anchors historical re-evaluations
   * so the rating is not affected by an ever-expanding future window.
   */
  endDate?: string;
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
  medianHoldingDays?: number | null;
  longestHoldingDays?: number | null;
  exposurePercent: number | null;
  benchmarkTotalReturn?: number | null;
  benchmarkCagr?: number | null;
  excessReturn?: number | null;
  excessCagr?: number | null;
  endOfTestExitPercent?: number | null;
  dataCoveragePercent?: number | null;
  ratingScore: number;
  ratingGrade: StrategyRatingGrade;
  automationEligibility: StrategyAutomationStatus;
  readinessLabel: StrategyReadinessLabel;
  ratingReasons?: string[];
  ratingWarnings?: string[];
  ratingCapsApplied?: string[];
  backtestRunId?: string | null;
  generatedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StrategyProofRegistryRow {
  strategyCode: string;
  strategyVersion: string;
  strategyName: string;
  category: StrategyCategory | 'DRAFT';
  status: StrategyProofStatus;
  scope: {
    region: string;
    assetType: string;
    universeKey: string;
  };
  selectedTimeframe: StrategyTimeframe;
  latestEvaluationDate: string | null;
  sample: {
    tradeCount: number;
    requiredTradeCount: number;
    sampleSufficiency: StrategySampleSufficiency;
  };
  performance: {
    cagr: number | null;
    maxDrawdown: number | null;
    sharpe: number | null;
    winRate: number | null;
    profitFactor: number | null;
    dataCoveragePercent: number | null;
    benchmarkCagr: number | null;
    excessCagr: number | null;
  };
  rating: {
    ratingGrade: StrategyRatingGrade | null;
    readinessLabel: StrategyReadinessLabel | null;
    reasons: string[];
    warnings: string[];
    capsApplied: string[];
  };
  missingEvidenceReason: string | null;
  nextAction: {
    label: string;
    targetRoute: string;
    sourceModule: 'backtesting-strategy-lab' | 'strategy-framework';
  } | null;
}

export interface StrategyProofRegistryResponse {
  rows: StrategyProofRegistryRow[];
  statusCounts: Record<StrategyProofStatus, number>;
  scope: {
    region: string;
    assetType: string;
    universeKey: string;
  };
  selectedTimeframe: StrategyTimeframe;
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
  definitionSource: StrategyDefinitionProviderSource;
  persistedDefinitionsCount: number;
  registryDefinitionsCount: number;
  fallbackDefinitionsCount: number;
  definitionDriftStatus: 'OK' | 'DRIFT_DETECTED' | 'PERSISTENCE_UNAVAILABLE';
  definitionDrift: StrategyDefinitionDrift[];
  definitionWarnings: string[];
  persistenceReadFailed: boolean;
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

export interface StrategyDefinitionProviderResult {
  definitions: StrategyDefinition[];
  source: StrategyDefinitionProviderSource;
  drift: StrategyDefinitionDrift[];
  registryDefinitionsCount: number;
  persistedDefinitionsCount: number;
  fallbackDefinitionsCount: number;
  persistenceReadFailed: boolean;
  persistenceFailureReason?: string;
  warnings: string[];
}

export type StrategySignalItem = SignalItem;
