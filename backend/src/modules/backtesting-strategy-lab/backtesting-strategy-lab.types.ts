export type UniverseType = 'ALL' | 'INSTRUMENTS' | 'SYMBOLS' | 'WATCHLIST';
export type EntryRuleType = 'SIGNAL_SCORE_ABOVE' | 'SIGNAL_DIRECTION_BULLISH' | 'PRICE_ABOVE_SMA50' | 'SMA50_ABOVE_SMA200';
export type ExitRuleType = 'SIGNAL_SCORE_BELOW' | 'SIGNAL_DIRECTION_BEARISH' | 'PRICE_BELOW_SMA50' | 'FIXED_HOLDING_PERIOD';
export type PositionSizeType = 'EQUAL_WEIGHT' | 'FIXED_AMOUNT';
export type BacktestStatus = 'COMPLETED' | 'FAILED';

export interface StrategyRule<T extends string> {
  type: T;
  threshold?: number;
  holdingDays?: number;
}

export interface BacktestStrategyConfig {
  universe: {
    type: UniverseType;
    instrumentIds?: string[];
    symbols?: string[];
    watchlistId?: string;
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
  bestTrade: number | null;
  worstTrade: number | null;
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

export interface RunBacktestRequest {
  strategyId?: string | null;
  config?: BacktestStrategyConfig;
}

export interface HistoricalBar {
  date: string;
  close: number;
}
