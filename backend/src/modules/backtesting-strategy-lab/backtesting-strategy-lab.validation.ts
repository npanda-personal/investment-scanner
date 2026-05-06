import type { BacktestStrategyConfig, CreateBacktestStrategyRequest, UpdateBacktestStrategyRequest } from './backtesting-strategy-lab.types';

const ENTRY_RULES = ['SIGNAL_SCORE_ABOVE', 'SIGNAL_DIRECTION_BULLISH', 'PRICE_ABOVE_SMA50', 'SMA50_ABOVE_SMA200'];
const EXIT_RULES = ['SIGNAL_SCORE_BELOW', 'SIGNAL_DIRECTION_BEARISH', 'PRICE_BELOW_SMA50', 'FIXED_HOLDING_PERIOD'];
const POSITION_SIZES = ['EQUAL_WEIGHT', 'FIXED_AMOUNT'];
const UNIVERSES = ['ALL', 'INSTRUMENTS', 'SYMBOLS', 'WATCHLIST'];
const MODES = ['REGISTERED_STRATEGY', 'CUSTOM_RULES'];
const TIMEFRAMES = ['1Y', '3Y', '5Y', '10Y', '15Y'];

export function validateStrategyInput(input: CreateBacktestStrategyRequest | UpdateBacktestStrategyRequest, partial = false): string[] {
  const errors: string[] = [];
  if (!partial || input.name !== undefined) {
    if (!input.name || input.name.trim().length === 0) errors.push('strategy name is required');
  }
  if (!partial || input.config !== undefined) errors.push(...validateConfig(input.config as BacktestStrategyConfig));
  return errors;
}

export function validateConfig(config?: BacktestStrategyConfig): string[] {
  const errors: string[] = [];
  if (!config) return ['strategy config is required'];
  const mode = config.mode || (config.strategyCode ? 'REGISTERED_STRATEGY' : 'CUSTOM_RULES');
  if (!MODES.includes(mode)) errors.push('backtest mode is invalid');
  if (mode === 'REGISTERED_STRATEGY') {
    if (!config.strategyCode || typeof config.strategyCode !== 'string') errors.push('registered strategy code is required');
    if (!config.timeframe || !TIMEFRAMES.includes(config.timeframe)) errors.push('registered strategy timeframe is required');
  }
  const start = new Date(config.startDate);
  const end = new Date(config.endDate);
  if (!config.startDate || !config.endDate || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) errors.push('date range is required');
  else if (start >= end) errors.push('start date must be before end date');
  if (!config.universe || !UNIVERSES.includes(config.universe.type)) errors.push('universe is invalid');
  if (config.universe?.type === 'INSTRUMENTS' && (!Array.isArray(config.universe.instrumentIds) || config.universe.instrumentIds.length === 0)) errors.push('instrument universe requires instrument ids');
  if (config.universe?.type === 'SYMBOLS' && (!Array.isArray(config.universe.symbols) || config.universe.symbols.length === 0)) errors.push('symbol universe requires at least one symbol');
  if (config.universe?.type === 'WATCHLIST' && !config.universe.watchlistId) errors.push('watchlist universe requires watchlist id');
  if (!config.entryRule || !ENTRY_RULES.includes(config.entryRule.type)) errors.push('entry rule is required');
  if (!config.exitRule || !EXIT_RULES.includes(config.exitRule.type)) errors.push('exit rule is required');
  if (!Number.isFinite(config.initialCapital) || config.initialCapital <= 0) errors.push('initial capital must be greater than 0');
  if (!Number.isFinite(config.maxPositions) || config.maxPositions <= 0 || config.maxPositions > 100) errors.push('max positions must be 1-100');
  if (!Number.isFinite(config.transactionCostPercent) || config.transactionCostPercent < 0 || config.transactionCostPercent > 0.1) errors.push('transaction cost must be 0-10%');
  if (config.slippagePercent !== undefined && (!Number.isFinite(config.slippagePercent) || config.slippagePercent < 0 || config.slippagePercent > 0.05)) errors.push('slippage must be 0-5%');
  if (config.maxHoldingDays !== undefined && (!Number.isFinite(config.maxHoldingDays) || config.maxHoldingDays <= 0 || config.maxHoldingDays > 5000)) errors.push('max holding days must be 1-5000');
  if (config.stopLossPercent !== undefined && (!Number.isFinite(config.stopLossPercent) || config.stopLossPercent <= 0 || config.stopLossPercent > 0.95)) errors.push('stop loss must be greater than 0 and at most 95%');
  if (config.trailingStopPercent !== undefined && (!Number.isFinite(config.trailingStopPercent) || config.trailingStopPercent <= 0 || config.trailingStopPercent > 0.95)) errors.push('trailing stop must be greater than 0 and at most 95%');
  if (config.takeProfitPercent !== undefined && (!Number.isFinite(config.takeProfitPercent) || config.takeProfitPercent <= 0 || config.takeProfitPercent > 10)) errors.push('take profit must be greater than 0 and at most 1000%');
  if (config.minSignalReadinessScore !== undefined && (!Number.isFinite(config.minSignalReadinessScore) || config.minSignalReadinessScore < 0 || config.minSignalReadinessScore > 100)) errors.push('minimum signal readiness score must be 0-100');
  if (!POSITION_SIZES.includes(config.positionSizeType)) errors.push('position sizing is invalid');
  if (config.positionSizeType === 'FIXED_AMOUNT' && (!Number.isFinite(config.fixedAmountPerTrade) || Number(config.fixedAmountPerTrade) <= 0)) errors.push('fixed amount per trade must be greater than 0');
  if (config.entryRule?.type === 'SIGNAL_SCORE_ABOVE' && !Number.isFinite(config.entryRule.threshold)) errors.push('entry signal threshold is required');
  if (config.exitRule?.type === 'SIGNAL_SCORE_BELOW' && !Number.isFinite(config.exitRule.threshold)) errors.push('exit signal threshold is required');
  if (config.exitRule?.type === 'FIXED_HOLDING_PERIOD' && (!Number.isFinite(config.exitRule.holdingDays) || Number(config.exitRule.holdingDays) <= 0)) errors.push('fixed holding days must be greater than 0');
  return errors;
}

export function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || '';
}
