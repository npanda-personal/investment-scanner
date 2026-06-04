export type UniverseType = 'ALL' | 'INSTRUMENTS' | 'SYMBOLS' | 'WATCHLIST';
export type BacktestMode = 'REGISTERED_STRATEGY' | 'CUSTOM_RULES';
export type EntryRuleType = 'SIGNAL_SCORE_ABOVE' | 'SIGNAL_DIRECTION_BULLISH' | 'PRICE_ABOVE_SMA50' | 'SMA50_ABOVE_SMA200';
export type ExitRuleType = 'SIGNAL_SCORE_BELOW' | 'SIGNAL_DIRECTION_BEARISH' | 'PRICE_BELOW_SMA50' | 'FIXED_HOLDING_PERIOD';
export type PositionSizeType = 'EQUAL_WEIGHT' | 'FIXED_AMOUNT';
export type BacktestStatus = 'COMPLETED' | 'FAILED';
export type BacktestAvailabilityStatus = 'AVAILABLE' | 'PARTIAL' | 'INSUFFICIENT_HISTORY' | 'NOT_RUN' | 'ERROR';
export type StrategyReadinessLabel = 'RESEARCH_ONLY' | 'WATCHLIST_CANDIDATE' | 'PAPER_TEST_CANDIDATE' | 'NOT_AUTOMATION_READY';

/**
 * Walk-forward / out-of-sample validation options.
 * When set, the backtest splits the date range into an in-sample training
 * window and an out-of-sample test window, runs the strategy on both, and
 * reports metrics + an OVERFIT flag for the result.
 *
 * Exactly one of `splitDate` or `inSampleFraction` must be provided.
 *
 * Default behaviour (no option set) is unchanged: single full-period run.
 */
export interface WalkForwardOptions {
  /**
   * Explicit ISO date that splits the period: everything before this date is
   * in-sample, everything from this date onward is out-of-sample.
   * Takes precedence over `inSampleFraction` when both are given.
   */
  splitDate?: string;
  /**
   * Fraction of the total date range to use as in-sample (0 < f < 1).
   * E.g. 0.7 = first 70% in-sample, last 30% out-of-sample.
   * Default is 0.7 when neither `splitDate` nor `inSampleFraction` are given
   * but walk-forward is requested (object is present).
   */
  inSampleFraction?: number;
  /**
   * CAGR degradation threshold that triggers the OVERFIT flag.
   * If out-of-sample CAGR < in-sample CAGR - threshold, the result is
   * flagged as OVERFIT. Default: 0.10 (10 pp).
   */
  overfitCagrThreshold?: number;
}

/** Per-segment metrics emitted by walk-forward validation. */
export interface WalkForwardSegmentResult {
  label: 'IN_SAMPLE' | 'OUT_OF_SAMPLE';
  startDate: string;
  endDate: string;
  metrics: {
    totalReturn: number;
    cagr: number | null;
    maxDrawdown: number;
    sharpeRatio: number | null;
    winRate: number | null;
    numberOfTrades: number;
  };
}

/** Walk-forward validation result attached to BacktestMetrics. */
export interface WalkForwardResult {
  splitDate: string;
  inSampleFraction: number;
  inSample: WalkForwardSegmentResult;
  outOfSample: WalkForwardSegmentResult;
  /**
   * True when out-of-sample CAGR is materially worse than in-sample CAGR
   * (difference > overfitCagrThreshold, default 10 pp).
   */
  overfitFlag: boolean;
  /** CAGR difference: inSample.cagr − outOfSample.cagr (positive = degradation). */
  cagrDegradation: number | null;
}

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
  /**
   * When set, the simulation also runs walk-forward / out-of-sample
   * validation in addition to the full-period run.  Default behaviour is
   * unchanged when absent.
   */
  walkForwardOptions?: WalkForwardOptions;
}

export interface BacktestStrategyDto {
  id: string;
  name: string;
  description: string | null;
  config: BacktestStrategyConfig;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBacktestStrategyRequest {
  name: string;
  description?: string | null;
  config: BacktestStrategyConfig;
}

export interface UpdateBacktestStrategyRequest {
  name?: string;
  description?: string | null;
  config?: BacktestStrategyConfig;
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

export interface BacktestMetrics {
  totalReturn: number;
  cagr: number | null;
  maxDrawdown: number;
  volatility: number | null;
  sharpeRatio: number | null;
  winRate: number | null;
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
    benchmarkDataStatus: 'AVAILABLE' | 'NSE_NIFTY_50' | 'FALLBACK_EQUAL_WEIGHT' | 'UNAVAILABLE';
    dataGap?: string;
  };
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
  /**
   * Walk-forward / out-of-sample validation result.
   * Only present when `walkForwardOptions` was set on the config.
   */
  walkForward?: WalkForwardResult;
  /**
   * Universe cap summary surfaced at the top level for easy consumer access.
   * Mirrors the fields in `dataCoverage` but gives a single prominent flag.
   * Only present when the universe type is 'ALL'.
   */
  universeSummary?: {
    universeCapped: boolean;
    universeCap: number | undefined;
    universeRequested: number | undefined;
  };
}

export interface BacktestRunDto {
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

export interface BacktestRunListQuery {
  region?: string;
  assetType?: string;
  limit?: number;
  offset?: number;
}

export interface RunBacktestRequest {
  strategyId?: string | null;
  config?: BacktestStrategyConfig;
}

export interface HistoricalBar {
  date: string;
  close: number;
  volume?: number | null;
}
