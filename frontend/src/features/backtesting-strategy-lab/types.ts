export type UniverseType = 'ALL' | 'INSTRUMENTS' | 'SYMBOLS' | 'WATCHLIST';
export type BacktestMode = 'REGISTERED_STRATEGY' | 'CUSTOM_RULES';
export type EntryRuleType = 'SIGNAL_SCORE_ABOVE' | 'SIGNAL_DIRECTION_BULLISH' | 'PRICE_ABOVE_SMA50' | 'SMA50_ABOVE_SMA200';
export type ExitRuleType = 'SIGNAL_SCORE_BELOW' | 'SIGNAL_DIRECTION_BEARISH' | 'PRICE_BELOW_SMA50' | 'FIXED_HOLDING_PERIOD';
export type PositionSizeType = 'EQUAL_WEIGHT' | 'FIXED_AMOUNT';
export type BacktestStatus = 'COMPLETED' | 'FAILED';
export type BacktestAvailabilityStatus = 'AVAILABLE' | 'PARTIAL' | 'INSUFFICIENT_HISTORY' | 'NOT_RUN' | 'ERROR';
export type StrategyReadinessLabel = 'RESEARCH_ONLY' | 'WATCHLIST_CANDIDATE' | 'PAPER_TEST_CANDIDATE' | 'NOT_AUTOMATION_READY';

export interface StrategyRule<T extends string> {
  type: T;
  threshold?: number;
  holdingDays?: number;
}

export interface BacktestStrategyConfig {
  mode?: BacktestMode;
  strategyCode?: string;
  strategyVersion?: string;
  timeframe?: '1Y' | '3Y' | '5Y' | '10Y' | '15Y';
  region?: string;
  assetType?: string;
  universe: {
    type: UniverseType;
    instrumentIds?: string[];
    symbols?: string[];
    watchlistId?: string;
    region?: string;
    assetType?: string;
  };
  entryRule: StrategyRule<EntryRuleType>;
  exitRule: StrategyRule<ExitRuleType>;
  startDate: string;
  endDate: string;
  initialCapital: number;
  positionSizeType: PositionSizeType;
  fixedAmountPerTrade?: number;
  maxPositions: number;
  transactionCostPercent: number;
  slippagePercent?: number;
  maxHoldingDays?: number;
  stopLossPercent?: number;
  trailingStopPercent?: number;
  takeProfitPercent?: number;
  useDataQualityFilter?: boolean;
  minSignalReadinessScore?: number;
  excludeNotReady?: boolean;
  excludeIlliquid?: boolean;
  excludeMissingQuality?: boolean;
}

export interface BacktestStrategy {
  id: string;
  name: string;
  description: string | null;
  config: BacktestStrategyConfig;
  createdAt: string;
  updatedAt: string;
}

/** NR-33: Wilson score 95% confidence interval on the win rate. */
export interface WilsonCI {
  lower: number;
  upper: number;
  n: number;
  /** True when n < 30 (low-sample flag). */
  lowSample: boolean;
}

/** NR-32: One cell in the monthly return grid. */
export interface MonthlyReturnCell {
  year: number;
  /** 1-based month (1=Jan … 12=Dec). */
  month: number;
  returnPercent: number | null;
}

/** NR-32: Per-regime performance breakdown. */
export interface RegimePerformanceRow {
  regime: string;
  cagr: number | null;
  winRate: number | null;
  numberOfTrades: number;
  activeMonths: number;
}

export interface BacktestMetrics {
  totalReturn: number;
  cagr: number | null;
  maxDrawdown: number;
  volatility: number | null;
  sharpeRatio: number | null;
  /** NR-32: Calmar ratio: CAGR / |maxDrawdown|. */
  calmarRatio?: number | null;
  /** NR-32: Sortino ratio (excess return / downside deviation). */
  sortinoRatio?: number | null;
  winRate: number | null;
  /** NR-33: Wilson 95% CI on win rate. Present whenever numberOfTrades > 0. */
  winRateCI?: WilsonCI;
  averageWin: number | null;
  averageLoss: number | null;
  profitFactor: number | null;
  numberOfTrades: number;
  averageHoldingDays: number | null;
  medianHoldingDays?: number | null;
  longestHoldingDays?: number | null;
  bestTrade: number | null;
  worstTrade: number | null;
  exitDiagnostics?: {
    endOfTestExitCount: number;
    endOfTestExitPercent: number;
    stopLossExitCount: number;
    trailingStopExitCount: number;
    takeProfitExitCount: number;
    strategyExitCount: number;
    maxHoldExitCount: number;
    averageHoldingDays: number | null;
    medianHoldingDays: number | null;
    longestHoldingDays: number | null;
  };
  dataCoveragePercent?: number;
  benchmarkComparison?: {
    benchmarkName: string | null;
    benchmarkTotalReturn: number | null;
    benchmarkCagr: number | null;
    excessReturn: number | null;
    excessCagr: number | null;
    benchmarkDataStatus: 'AVAILABLE' | 'FALLBACK_EQUAL_WEIGHT' | 'UNAVAILABLE';
    dataGap?: string;
  };
  /** NR-32: Month-by-month return grid derived from the equity curve. */
  monthlyReturns?: MonthlyReturnCell[];
  /** NR-32: Per-regime breakdown (CAGR + win rate split by regime). */
  regimePerformance?: RegimePerformanceRow[];
  /** NR-33: True when stops were configured but generated zero stop exits. */
  zeroExitAnomaly?: boolean;
  realismWarnings?: string[];
  dataQualityMetadata?: {
    universeBeforeDataQualityFilter: number;
    universeAfterDataQualityFilter: number;
    excludedForDataQuality: number;
    missingQualityEvaluationCount: number;
  };
  availabilityStatus?: BacktestAvailabilityStatus;
  frameworkStrategyName?: string | null;
  frameworkRating?: {
    ratingScore: number;
    ratingGrade: string;
    readinessLabel: StrategyReadinessLabel;
    ratingReasons: string[];
    ratingWarnings?: string[];
    ratingCapsApplied?: string[];
    performanceSummaryId?: string;
  } | null;
  dataCoverage?: {
    instrumentsConsidered: number;
    universeTotalAvailable?: number;
    universeCapped?: boolean;
    universeCap?: number;
    instrumentsWithEnoughHistory: number;
    instrumentsExcludedForHistory: number;
    instrumentsExcludedForDataQuality: number;
    missingPriceHistoryCount: number;
    insufficientHistoryCount: number;
    warnings: string[];
  };
  calculationAudit?: {
    tradeReturnFormula: 'NET_PNL_OVER_COMMITTED_ENTRY_CAPITAL';
    repairedTradeReturnCount: number;
    aggregateStatus: 'OK' | 'LEGACY_INVALID';
    warnings: string[];
  };
}

export interface BacktestTrade {
  instrumentId: string;
  symbol: string;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  quantity: number;
  grossPnL: number;
  netPnL: number;
  returnPercent: number;
  holdingDays: number;
  exitReason: string;
  entryReason?: string;
  entryReasons?: string[];
  exitReasons?: string[];
  committedCapital?: number;
  calculationStatus?: 'PERSISTED' | 'REPAIRED_FROM_PNL';
}

export interface EquityCurvePoint {
  date: string;
  equity: number;
  cash: number;
  investedValue: number;
  drawdownPercent: number;
}

export interface BacktestRun {
  id: string;
  strategyId: string | null;
  config: BacktestStrategyConfig;
  status: BacktestStatus;
  startedAt: string;
  completedAt: string | null;
  metrics: BacktestMetrics | null;
  equityCurve: EquityCurvePoint[];
  trades: BacktestTrade[];
  error: string | null;
}
