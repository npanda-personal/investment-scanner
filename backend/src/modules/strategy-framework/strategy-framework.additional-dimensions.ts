import type { StrategyContext } from './strategy-framework.types';

interface MutableState {
  score: number;
  reasons: string[];
  blockers: string[];
  warnings: string[];
  dataGaps: string[];
  entryRulesPassed: string[];
  exitRulesTriggered: string[];
  invalidationRulesTriggered: string[];
  noiseFiltersTriggered: string[];
}

type AddFn = (state: MutableState, score: number, reason: string, rule: string, bucket: 'entry' | 'exit') => void;
type BlockFn = (state: MutableState, code: string, reason: string) => void;

export function scoreAdditionalExitDimensions(
  context: StrategyContext,
  state: MutableState,
  add: AddFn,
): void {
  if (typeof context.return20d === 'number' && context.return20d < -0.08) {
    add(state, 10, 'Negative 20-day momentum signals deteriorating trend.', 'NEGATIVE_MOMENTUM', 'exit');
  }
  if (
    typeof context.latestPrice === 'number' &&
    typeof context.low52Week === 'number' &&
    context.low52Week > 0 &&
    (context.latestPrice - context.low52Week) / context.low52Week < 0.05
  ) {
    add(state, 8, 'Price is near 52-week low.', 'NEAR_52W_LOW', 'exit');
  }
  if (typeof context.volatility === 'number' && context.volatility > 0.5) {
    add(state, 8, 'High volatility signals elevated risk.', 'HIGH_VOLATILITY_STRESS', 'exit');
  }
  if (
    typeof context.sma50 === 'number' &&
    typeof context.sma200 === 'number' &&
    context.sma50 < context.sma200
  ) {
    add(state, 12, 'Death cross: SMA50 is below SMA200.', 'DEATH_CROSS', 'exit');
  }
  if (typeof context.latestPrice === 'number' && typeof context.sma200 === 'number' && context.latestPrice < context.sma200) {
    add(state, 10, 'Price has breached SMA200 support.', 'SMA200_BREACH', 'exit');
  }
}

export function applyAdditionalEntryNoise(
  context: StrategyContext,
  state: MutableState,
  block: BlockFn,
  opts?: { skipRsi?: boolean },
): void {
  if (!opts?.skipRsi && typeof context.rsi === 'number' && context.rsi > 80) {
    block(state, 'RSI_OVERBOUGHT', 'RSI is above 80; overbought conditions block entry.');
  }
  if (typeof context.return20d === 'number' && context.return20d < -0.05) {
    block(state, 'NEGATIVE_RECENT_MOMENTUM', 'Negative 20-day momentum blocks entry.');
  }
  if (
    typeof context.latestPrice === 'number' &&
    typeof context.low52Week === 'number' &&
    context.low52Week > 0 &&
    (context.latestPrice - context.low52Week) / context.low52Week < 0.05
  ) {
    block(state, 'NEAR_52W_LOW_ENTRY', 'Price is near 52-week low; entry blocked.');
  }
  if (typeof context.volatility === 'number' && context.volatility > 0.5) {
    block(state, 'HIGH_VOLATILITY_REGIME', 'High-volatility regime blocks new entries.');
  }
  if (
    typeof context.sma50 !== 'number' ||
    typeof context.sma200 !== 'number' ||
    context.sma50 <= context.sma200
  ) {
    block(state, 'NO_GOLDEN_CROSS', 'SMA50 not above SMA200; trend structure unconfirmed.');
  }
  if (
    typeof context.latestPrice === 'number' &&
    typeof context.sma50 === 'number' &&
    context.sma50 > 0
  ) {
    const ext = (context.latestPrice - context.sma50) / context.sma50;
    if (ext > 0.12) {
      block(state, 'OVEREXTENDED', 'Price is overextended above SMA50; entry blocked.');
    }
  }
  const latestVolume = context.prices?.[0]?.volume ?? null;
  if (
    typeof latestVolume === 'number' &&
    typeof context.averageVolume20 === 'number' &&
    context.averageVolume20 > 0 &&
    latestVolume < context.averageVolume20 * 0.5
  ) {
    block(state, 'NO_VOLUME_CONVICTION', 'Volume is below 50% of 20-day average; entry blocked.');
  }
}
