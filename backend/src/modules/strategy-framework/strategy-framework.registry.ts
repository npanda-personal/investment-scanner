import type { StrategyDefinition, StrategyTimeframe } from './strategy-framework.types';

export const STRATEGY_TIMEFRAMES: StrategyTimeframe[] = ['1Y', '3Y', '5Y', '10Y', '15Y'];

const commonAssetTypes = ['STOCK'];
const commonRegions = ['IN'];
/** Instruments eligible for F&O/derivatives — short-entry strategies are restricted to this set. */
const derivativesEligibleOnly = ['STOCK'];  // gated at runtime by derivativesEligible flag on the decision

const rule = (code: string, label: string, input: string, kind: 'REQUIRES' | 'BLOCKS' | 'SCORES' | 'WARNS' = 'REQUIRES', threshold?: number | string | boolean, weight?: number) => ({
  code,
  label,
  input,
  kind,
  threshold,
  weight,
});

export const COMMON_LONG_EXIT_RULES = [
  rule('DQ_FAIL_EXIT', 'Exit review if data quality becomes unusable or not ready.', 'dataQuality', 'BLOCKS'),
  rule('MARKET_RISK_OFF_EXIT', 'Exit review if the market gate closes or regime turns risk-off.', 'marketGate/marketRegime', 'WARNS'),
  rule('STRUCTURAL_BREAK_EXIT', 'Exit review after a close below strategy support.', 'latestPrice/sma50', 'WARNS'),
  rule('RELATIVE_STRENGTH_DECAY_EXIT', 'Exit review when sector/relative strength decays.', 'sectorLeadership/sectorRelativeStrengthScore', 'WARNS'),
  rule('DISTRIBUTION_WARNING_EXIT', 'Exit review when price-volume distribution appears.', 'smartMoneyStatus', 'WARNS'),
  rule('SIGNAL_DECAY_EXIT', 'Exit review when signal score or confidence decays.', 'signal.score', 'WARNS'),
];

/** Short-entry cover rules — research-support framing; no buy/sell language. */
export const COMMON_SHORT_COVER_RULES = [
  rule('DQ_FAIL_COVER', 'Cover review if data quality becomes unusable or not ready.', 'dataQuality', 'BLOCKS'),
  rule('BREAKDOWN_REVERSAL_COVER', 'Cover review if price reclaims breakdown level — setup is invalidated.', 'latestPrice/sma50', 'WARNS'),
  rule('MARKET_REGIME_SHIFT_COVER', 'Cover review if market regime shifts from risk-off to risk-on.', 'marketRegime', 'WARNS'),
  rule('BEARISH_SIGNAL_DECAY_COVER', 'Cover review when bearish signal score or direction weakens.', 'signal.score', 'WARNS'),
  rule('DISTRIBUTION_ENDS_COVER', 'Cover review when price-volume distribution ends.', 'smartMoneyStatus', 'WARNS'),
];

export const COMMON_LONG_INVALIDATION_RULES = [
  rule('DQ_EVIDENCE_INVALIDATED', 'Invalidate entry evidence when data quality is missing, unusable, or not ready.', 'dataQuality', 'BLOCKS'),
  rule('SUPPORT_INVALIDATED', 'Invalidate the setup when price loses rule support.', 'latestPrice/sma50', 'BLOCKS'),
  rule('MARKET_GATE_INVALIDATED', 'Invalidate new long-entry review when market gate closes.', 'marketGate', 'BLOCKS'),
];

/**
 * Short-entry invalidation rules — bearish setup is voided when breakdown reverses.
 * Only applies to derivativesEligible instruments.
 */
export const COMMON_SHORT_INVALIDATION_RULES = [
  rule('DQ_EVIDENCE_INVALIDATED', 'Invalidate short evidence when data quality is missing, unusable, or not ready.', 'dataQuality', 'BLOCKS'),
  rule('BREAKDOWN_RECLAIM_INVALIDATED', 'Invalidate short setup when price reclaims the breakdown support level.', 'latestPrice/sma50', 'BLOCKS'),
  rule('REGIME_SHIFT_INVALIDATED', 'Invalidate short entry when market regime shifts to risk-on.', 'marketRegime', 'BLOCKS'),
];

export const REGISTERED_STRATEGIES: StrategyDefinition[] = [
  {
    code: 'TREND_MOMENTUM',
    name: 'Trend Momentum',
    description: 'Dual momentum leader setup where absolute trend, relative strength, market gate, and DQ/liquidity evidence align.',
    category: 'ENTRY',
    style: 'MOMENTUM',
    timeframe: 'DAILY_SWING',
    assetTypes: commonAssetTypes,
    supportedRegions: commonRegions,
    version: '1.2.0',
    status: 'ACTIVE',
    requiredInputs: ['latestPrice', 'sma50', 'sma200', 'rawSignal', 'dataQuality', 'marketGate', 'marketRegime', 'sectorLeadership', 'sectorRelativeStrengthScore', 'smartMoneyStatus', 'reliability'],
    entryRules: [
      rule('PRICE_ABOVE_SMA50', 'Price is above SMA50.', 'latestPrice/sma50', 'SCORES', true, 15),
      rule('PRICE_ABOVE_SMA200', 'Price is above SMA200.', 'latestPrice/sma200', 'SCORES', true, 15),
      rule('BULLISH_SIGNAL', 'Raw or calibrated signal is bullish.', 'signal.direction', 'SCORES', 'BULLISH', 20),
      rule('SIGNAL_STRENGTH', 'Signal score is strong enough for review.', 'signal.score', 'SCORES', 70, 10),
      rule('SECTOR_NOT_WEAK', 'Sector is not lagging or weakening.', 'sectorLeadership', 'REQUIRES', true, 10),
      rule('SMART_MONEY_NOT_DISTRIBUTION', 'Smart money is not distribution.', 'smartMoneyStatus', 'REQUIRES', true, 10),
    ],
    exitRules: COMMON_LONG_EXIT_RULES,
    invalidationRules: COMMON_LONG_INVALIDATION_RULES,
    noiseFilters: [
      rule('DATA_NOT_READY', 'Data quality is not ready.', 'dataQuality.signalReadinessStatus', 'BLOCKS', 'NOT_READY'),
      rule('MARKET_CLOSED', 'Market gate is closed.', 'marketGate', 'BLOCKS', 'CLOSED'),
      rule('LOW_RELIABILITY', 'Signal reliability is low or noisy.', 'reliability.status', 'BLOCKS', 'LOW'),
      rule('SMART_MONEY_DISTRIBUTION', 'Smart money distribution contradicts long entry.', 'smartMoneyStatus', 'BLOCKS', 'DISTRIBUTION'),
    ],
    riskRules: [rule('MAX_POSITIONS', 'Use bounded position count in backtests.', 'maxPositions', 'REQUIRES', 10), rule('DEFAULT_MAX_HOLDING', 'Default max holding period is 180 trading days.', 'maxHoldingDays', 'REQUIRES', 180), rule('DEFAULT_TRAILING_STOP', 'Default trailing stop is conservative and optional.', 'trailingStopPercent', 'WARNS', 0.12)],
    marketGateRules: [rule('OPEN_OR_SELECTIVE', 'Market gate should be open or selective.', 'marketGate', 'REQUIRES', 'OPEN|SELECTIVE')],
    parameters: { minScore: 75, backtestEntryRule: 'SMA50_ABOVE_SMA200', backtestExitRule: 'PRICE_BELOW_SMA50', maxHoldingDays: 180, trailingStopPercent: 0.12 },
    explanationTemplate: 'Triggered when bullish trend, signal strength, and context align.',
    examples: {
      triggers: ['Price above SMA50/SMA200 with bullish signal and supportive market gate.'],
      blocks: ['Market gate closed or smart-money distribution is present.'],
    },
  },
  {
    code: 'PULLBACK_IN_UPTREND',
    name: 'Pullback in Uptrend',
    description: 'Long-term uptrend with a controlled pullback, reclaim/bounce evidence, and no market gate block.',
    category: 'ENTRY',
    style: 'PULLBACK',
    timeframe: 'DAILY_SWING',
    assetTypes: commonAssetTypes,
    supportedRegions: commonRegions,
    version: '1.2.0',
    status: 'ACTIVE',
    requiredInputs: ['latestPrice', 'previousClose', 'sma50', 'sma200', 'rsi', 'rawSignal', 'dataQuality', 'marketGate', 'marketRegime', 'sectorLeadership', 'sectorRelativeStrengthScore', 'smartMoneyStatus'],
    entryRules: [
      rule('SMA50_ABOVE_SMA200', 'SMA50 is above SMA200.', 'sma50/sma200', 'REQUIRES', true, 25),
      rule('NEAR_SMA50', 'Price is within 5% of SMA50.', 'latestPrice/sma50', 'SCORES', 0.05, 20),
      rule('RECLAIM_SMA50', 'Close reclaims or holds above SMA50 after pullback.', 'latestPrice/sma50', 'REQUIRES', true, 15),
      rule('BOUNCE_CONFIRMATION', 'Latest close confirms a bounce versus previous close.', 'latestPrice/previousClose', 'SCORES', true, 10),
      rule('RSI_RECOVERY', 'RSI recovers above 40 and remains below overheated levels.', 'rsi', 'SCORES', '40-65', 15),
    ],
    exitRules: COMMON_LONG_EXIT_RULES,
    invalidationRules: [...COMMON_LONG_INVALIDATION_RULES, rule('RECLAIM_FAILED', 'Invalidate pullback if price fails to reclaim SMA50.', 'latestPrice/sma50', 'BLOCKS')],
    noiseFilters: [rule('OVEREXTENDED', 'Reject when price is too far above SMA50.', 'latestPrice/sma50', 'BLOCKS', 0.12), rule('MARKET_CLOSED', 'Market gate is closed.', 'marketGate', 'BLOCKS', 'CLOSED')],
    riskRules: [rule('WAIT_FOR_PULLBACK', 'Avoid chasing extended entries.', 'latestPrice/sma50', 'REQUIRES'), rule('DEFAULT_STOP_LOSS', 'Default percent stop approximates a failed pullback low.', 'stopLossPercent', 'WARNS', 0.08), rule('DEFAULT_MAX_HOLDING', 'Default max holding period is 90 trading days.', 'maxHoldingDays', 'REQUIRES', 90)],
    marketGateRules: [rule('MARKET_HEALTHY', 'Market gate should not be closed.', 'marketGate', 'REQUIRES')],
    parameters: { minScore: 75, nearSmaPercent: 0.05, maxExtensionPercent: 0.12, backtestEntryRule: 'PRICE_ABOVE_SMA50', backtestExitRule: 'PRICE_BELOW_SMA50', stopLossPercent: 0.08, maxHoldingDays: 90 },
    explanationTemplate: 'Triggered when an uptrend pulls back into a healthier entry zone.',
    examples: { triggers: ['SMA50>SMA200, price near SMA50, RSI cooled.'], blocks: ['Price is extended far above SMA50.'] },
  },
  {
    code: 'BREAKOUT_CONFIRMATION',
    name: 'Breakout Confirmation',
    description: 'Volatility-contraction breakout review after a base, resistance close, and volume expansion.',
    category: 'ENTRY',
    style: 'BREAKOUT',
    timeframe: 'DAILY_SWING',
    assetTypes: commonAssetTypes,
    supportedRegions: commonRegions,
    version: '1.2.0',
    status: 'ACTIVE',
    requiredInputs: ['latestPrice', 'high52Week', 'volume', 'averageVolume20', 'rawSignal', 'marketGate', 'marketRegime', 'dataQuality', 'bars', 'sma50', 'sectorLeadership', 'sectorRelativeStrengthScore', 'smartMoneyStatus'],
    entryRules: [rule('BASE_DURATION_CONFIRMED', 'A multi-week base exists before breakout.', 'bars', 'SCORES', 20, 15), rule('VOLATILITY_CONTRACTION', 'Recent range has contracted before breakout.', 'bars', 'SCORES', true, 15), rule('RESISTANCE_CLOSE', 'Close clears prior resistance/high.', 'latestPrice/high52Week', 'REQUIRES', true, 20), rule('VOLUME_BREAKOUT', 'Volume is at least 1.5x the 20-day average.', 'volume/averageVolume20', 'SCORES', 1.5, 25), rule('BULLISH_SIGNAL', 'Signal direction is bullish.', 'signal.direction', 'REQUIRES', 'BULLISH', 20)],
    exitRules: COMMON_LONG_EXIT_RULES,
    invalidationRules: [...COMMON_LONG_INVALIDATION_RULES, rule('FAILED_BREAKOUT', 'Invalidate breakout if price loses breakout support.', 'latestPrice/sma50', 'BLOCKS')],
    noiseFilters: [rule('OVEREXTENDED', 'Reject if price is more than 18% above SMA50.', 'latestPrice/sma50', 'BLOCKS', 0.18), rule('MARKET_CLOSED', 'Market gate is closed.', 'marketGate', 'BLOCKS', 'CLOSED')],
    riskRules: [rule('CONFIRM_VOLUME', 'Volume confirmation is required for stronger breakout rating.', 'averageVolume20', 'REQUIRES'), rule('DEFAULT_STOP_LOSS', 'Default stop loss limits failed breakouts.', 'stopLossPercent', 'REQUIRES', 0.07), rule('DEFAULT_TRAILING_STOP', 'Default trailing stop protects gains after breakout.', 'trailingStopPercent', 'WARNS', 0.1)],
    marketGateRules: [rule('SUPPORTIVE_MARKET', 'Market should be open or selective.', 'marketGate', 'REQUIRES')],
    parameters: { minScore: 75, maxExtensionPercent: 0.18, backtestEntryRule: 'SIGNAL_DIRECTION_BULLISH', backtestExitRule: 'PRICE_BELOW_SMA50', stopLossPercent: 0.07, trailingStopPercent: 0.1, maxHoldingDays: 120 },
    explanationTemplate: 'Triggered when breakout price action is confirmed by volume.',
    examples: { triggers: ['New high with high volume and bullish signal.'], blocks: ['Breakout is too extended above SMA50.'] },
  },
  {
    code: 'QUALITY_TREND',
    name: 'Quality Trend',
    description: 'Bullish trend that avoids weak fundamentals and poor data quality.',
    category: 'ENTRY',
    style: 'QUALITY_MOMENTUM',
    timeframe: 'DAILY_SWING',
    assetTypes: commonAssetTypes,
    supportedRegions: commonRegions,
    version: '1.2.0',
    status: 'DRAFT',
    requiredInputs: ['latestPrice', 'sma50', 'sma200', 'rawSignal', 'fundamentals', 'dataQuality', 'marketGate', 'marketRegime', 'sectorLeadership', 'sectorRelativeStrengthScore', 'smartMoneyStatus'],
    entryRules: [rule('TREND_UP', 'Price is above SMA50/SMA200.', 'latestPrice/sma', 'SCORES', true, 30), rule('FUNDAMENTALS_AVAILABLE', 'Fundamentals are available and not weak.', 'fundamentals', 'SCORES', true, 20)],
    exitRules: COMMON_LONG_EXIT_RULES,
    invalidationRules: [...COMMON_LONG_INVALIDATION_RULES, rule('QUALITY_DETERIORATION', 'Invalidate quality setup if quality evidence deteriorates.', 'dataQuality', 'BLOCKS')],
    noiseFilters: [rule('POOR_DATA_QUALITY', 'Avoid poor coverage/readiness.', 'dataQuality', 'BLOCKS')],
    riskRules: [rule('QUALITY_REQUIRED', 'Requires fundamentals where available.', 'fundamentals', 'REQUIRES')],
    marketGateRules: [rule('MARKET_NOT_CLOSED', 'Market gate should not be closed.', 'marketGate', 'REQUIRES')],
    parameters: { minScore: 68, backtestEntryRule: 'SMA50_ABOVE_SMA200', backtestExitRule: 'PRICE_BELOW_SMA50' },
    explanationTemplate: 'Partial MVP because fundamental quality scoring is still basic.',
    examples: { triggers: ['Trend plus available positive fundamentals.'], blocks: ['Data quality not ready.'] },
  },
  {
    code: 'SMART_MONEY_ACCUMULATION',
    name: 'Smart Money Accumulation',
    description: 'Accumulation confirms a bullish price-volume setup while avoiding distribution.',
    category: 'ENTRY',
    style: 'PRICE_VOLUME',
    timeframe: 'DAILY_SWING',
    assetTypes: commonAssetTypes,
    supportedRegions: commonRegions,
    version: '1.2.0',
    status: 'ACTIVE',
    requiredInputs: ['smartMoneyStatus', 'smartMoneyScore', 'latestPrice', 'sma50', 'averageVolume20', 'rawSignal', 'dataQuality', 'marketGate', 'marketRegime', 'sectorLeadership', 'sectorRelativeStrengthScore'],
    entryRules: [rule('ACCUMULATION', 'Smart-money status is accumulation.', 'smartMoneyStatus', 'REQUIRES', 'ACCUMULATION', 30), rule('SMART_MONEY_SCORE_READY', 'Price-volume accumulation score is strong enough.', 'smartMoneyScore', 'REQUIRES', 70, 20), rule('PRICE_CONFIRMATION', 'Price is above SMA50 or moving higher.', 'latestPrice/sma50', 'SCORES', true, 20), rule('VOLUME_CONTEXT_READY', 'Recent volume context is available.', 'averageVolume20', 'REQUIRES', true, 10)],
    exitRules: COMMON_LONG_EXIT_RULES,
    invalidationRules: [...COMMON_LONG_INVALIDATION_RULES, rule('DISTRIBUTION_EXIT', 'Invalidate accumulation setup if smart money turns distribution.', 'smartMoneyStatus', 'BLOCKS', 'DISTRIBUTION')],
    noiseFilters: [rule('DISTRIBUTION', 'Distribution blocks bullish entry.', 'smartMoneyStatus', 'BLOCKS', 'DISTRIBUTION'), rule('INSUFFICIENT_SMART_MONEY_DATA', 'Smart-money data is insufficient.', 'smartMoneyStatus', 'BLOCKS', 'INSUFFICIENT_DATA')],
    riskRules: [rule('PRICE_VOLUME_ONLY', 'Insider/institutional placeholders are not treated as real proof.', 'smartMoneyDataStatus', 'WARNS'), rule('UNPROVEN_EXTERNAL_SMART_MONEY', 'Institutional/insider inputs are unavailable; price-volume only.', 'missingInputs', 'WARNS')],
    marketGateRules: [rule('MARKET_NOT_CLOSED', 'Market gate should not be closed.', 'marketGate', 'REQUIRES')],
    parameters: { minScore: 75, backtestEntryRule: 'SIGNAL_DIRECTION_BULLISH', backtestExitRule: 'SIGNAL_DIRECTION_BEARISH', maxHoldingDays: 120, stopLossPercent: 0.1 },
    explanationTemplate: 'Triggered when local price-volume accumulation supports a bullish setup.',
    examples: { triggers: ['Accumulation with price confirmation.'], blocks: ['Distribution or insufficient price-volume data.'] },
  },
  {
    code: 'SECTOR_LEADER_MOMENTUM',
    name: 'Relative Strength Continuation',
    description: 'Stock trend continuation confirmed by sector leadership, relative strength, DQ, and liquidity evidence.',
    category: 'ENTRY',
    style: 'RELATIVE_STRENGTH',
    timeframe: 'DAILY_SWING',
    assetTypes: commonAssetTypes,
    supportedRegions: commonRegions,
    version: '1.2.0',
    status: 'ACTIVE',
    requiredInputs: ['latestPrice', 'sma50', 'sma200', 'rawSignal', 'sectorLeadership', 'sectorRelativeStrengthScore', 'smartMoneyStatus', 'dataQuality', 'marketGate', 'marketRegime'],
    entryRules: [rule('BULLISH_SIGNAL', 'Stock signal is bullish.', 'signal.direction', 'REQUIRES', 'BULLISH', 25), rule('PRICE_ABOVE_SMA50', 'Price is above SMA50.', 'latestPrice/sma50', 'SCORES', true, 15), rule('PRICE_ABOVE_SMA200', 'Price is above SMA200.', 'latestPrice/sma200', 'SCORES', true, 15), rule('SECTOR_LEADING', 'Sector is leading or improving.', 'sectorLeadership', 'SCORES', 'LEADING|IMPROVING', 25), rule('RELATIVE_STRENGTH', 'Sector relative strength is strong enough.', 'sectorRelativeStrengthScore', 'SCORES', 60, 15)],
    exitRules: COMMON_LONG_EXIT_RULES,
    invalidationRules: [...COMMON_LONG_INVALIDATION_RULES, rule('SECTOR_WEAKENING', 'Invalidate relative-strength setup if sector turns lagging.', 'sectorLeadership', 'BLOCKS', 'WEAKENING')],
    noiseFilters: [rule('SECTOR_LAGGING', 'Lagging sector blocks entry.', 'sectorLeadership', 'BLOCKS', 'LAGGING')],
    riskRules: [rule('RELATIVE_STRENGTH_REQUIRED', 'Requires sector context.', 'sectorLeadership', 'REQUIRES')],
    marketGateRules: [rule('MARKET_NOT_CLOSED', 'Market gate should not be closed.', 'marketGate', 'REQUIRES')],
    parameters: { minScore: 75, backtestEntryRule: 'SMA50_ABOVE_SMA200', backtestExitRule: 'PRICE_BELOW_SMA50' },
    explanationTemplate: 'Triggered when stock momentum aligns with sector leadership.',
    examples: { triggers: ['Bullish stock inside leading sector.'], blocks: ['Sector lagging.'] },
  },
  {
    /**
     * SHORT_ENTRY strategy: Breakdown Momentum
     *
     * Mirrors the structure of TREND_MOMENTUM (long) but for bearish setups.
     * Entry rules: bearish signal + price below SMA50/SMA200 + distribution context.
     * Stop: swing-high based (above entry).  Cover target: computed at 2R below entry.
     * RESTRICTED to derivativesEligible instruments — enforced at trade-plan generation.
     * Language: review / entry / stop / target / cover (no buy/sell).
     */
    code: 'BREAKDOWN_MOMENTUM',
    name: 'Breakdown Momentum (Short Review)',
    description: 'Bearish momentum breakdown review where absolute downtrend, bearish signal, market regime, and DQ/liquidity evidence align. Applicable ONLY to F&O/derivatives-eligible instruments.',
    category: 'ENTRY',
    style: 'SHORT_MOMENTUM',
    timeframe: 'DAILY_SWING',
    assetTypes: derivativesEligibleOnly,
    supportedRegions: commonRegions,
    version: '1.0.0',
    status: 'DRAFT',
    requiredInputs: ['latestPrice', 'sma50', 'sma200', 'rawSignal', 'dataQuality', 'marketGate', 'marketRegime', 'sectorLeadership', 'sectorRelativeStrengthScore', 'smartMoneyStatus', 'reliability', 'derivativesEligible'],
    entryRules: [
      rule('PRICE_BELOW_SMA50', 'Price is below SMA50 — downtrend evidence.', 'latestPrice/sma50', 'SCORES', true, 15),
      rule('PRICE_BELOW_SMA200', 'Price is below SMA200 — long-term downtrend confirmation.', 'latestPrice/sma200', 'SCORES', true, 15),
      rule('BEARISH_SIGNAL', 'Raw or calibrated signal is bearish.', 'signal.direction', 'SCORES', 'BEARISH', 20),
      rule('SIGNAL_STRENGTH', 'Signal score is strong enough for short-review.', 'signal.score', 'SCORES', 70, 10),
      rule('SECTOR_NOT_LEADING', 'Sector is lagging or weakening — supports bearish setup.', 'sectorLeadership', 'SCORES', true, 10),
      rule('SMART_MONEY_DISTRIBUTION', 'Smart money distribution supports bearish setup.', 'smartMoneyStatus', 'SCORES', 'DISTRIBUTION', 10),
      rule('DERIVATIVES_ELIGIBLE', 'Instrument must be F&O/derivatives eligible for short-review plans.', 'derivativesEligible', 'REQUIRES', true, 0),
    ],
    exitRules: COMMON_SHORT_COVER_RULES,
    invalidationRules: COMMON_SHORT_INVALIDATION_RULES,
    noiseFilters: [
      rule('DATA_NOT_READY', 'Data quality is not ready — short-review requires clean data.', 'dataQuality.signalReadinessStatus', 'BLOCKS', 'NOT_READY'),
      rule('MARKET_RISK_ON', 'Risk-on regime blocks new short-review entries.', 'marketRegime', 'BLOCKS', 'RISK_ON'),
      rule('LOW_RELIABILITY', 'Signal reliability is low or noisy.', 'reliability.status', 'BLOCKS', 'LOW'),
      rule('ACCUMULATION', 'Smart money accumulation contradicts short-entry.', 'smartMoneyStatus', 'BLOCKS', 'ACCUMULATION'),
      rule('NOT_DERIVATIVES_ELIGIBLE', 'Cash-only instruments are excluded from short-review plans.', 'derivativesEligible', 'BLOCKS', false),
    ],
    riskRules: [
      rule('MAX_POSITIONS', 'Use bounded position count in backtests.', 'maxPositions', 'REQUIRES', 10),
      rule('DEFAULT_MAX_HOLDING', 'Default max holding period for short-review is 90 trading days.', 'maxHoldingDays', 'REQUIRES', 90),
      rule('DEFAULT_TRAILING_STOP', 'Short-review trailing stop (stop above entry) is conservative.', 'trailingStopPercent', 'WARNS', 0.1),
      rule('FOO_GATE', 'Requires derivativesEligible=true; cash-only instruments cannot be short-reviewed.', 'derivativesEligible', 'REQUIRES', true),
    ],
    marketGateRules: [rule('RISK_OFF_OR_SELECTIVE', 'Market gate should be selective or closed (short-review is counter-trend; blocked in strong risk-on).', 'marketRegime', 'REQUIRES', 'RISK_OFF|SELECTIVE')],
    parameters: { minScore: 70, backtestEntryRule: 'SIGNAL_DIRECTION_BEARISH', backtestExitRule: 'PRICE_ABOVE_SMA50', maxHoldingDays: 90, trailingStopPercent: 0.1, requiresDerivativesEligible: true },
    explanationTemplate: 'Triggered when bearish trend, signal strength, and F&O eligibility align for a short-review setup.',
    examples: {
      triggers: ['Price below SMA50/SMA200 with bearish signal and derivatives-eligible instrument.'],
      blocks: ['Cash-only (non-derivatives-eligible) instrument; accumulation pattern; risk-on regime; data not ready.'],
    },
  },
  {
    code: 'DEFENSIVE_EXIT',
    name: 'Defensive Exit Review',
    description: 'Identifies holdings that should be reviewed for exit or risk reduction.',
    category: 'EXIT',
    style: 'DEFENSIVE',
    timeframe: 'DAILY_SWING',
    assetTypes: commonAssetTypes,
    supportedRegions: commonRegions,
    version: '1.2.0',
    status: 'ACTIVE',
    requiredInputs: ['rawSignal', 'latestPrice', 'sma50', 'dataQuality', 'marketGate', 'marketRegime', 'sectorLeadership', 'sectorRelativeStrengthScore', 'smartMoneyStatus', 'holding'],
    entryRules: [],
    exitRules: [rule('BEARISH_SIGNAL', 'Bearish signal is present.', 'signal.direction', 'SCORES', 'BEARISH', 30), rule('PRICE_BELOW_SMA50', 'Price is below SMA50.', 'latestPrice/sma50', 'SCORES', true, 25), rule('MARKET_WEAK', 'Market gate is closed/selective.', 'marketGate', 'SCORES', 'CLOSED|SELECTIVE', 20), ...COMMON_LONG_EXIT_RULES],
    invalidationRules: COMMON_LONG_INVALIDATION_RULES,
    noiseFilters: [rule('NO_HOLDING_CONTEXT', 'Holding context is missing for portfolio-specific action.', 'holding', 'WARNS')],
    riskRules: [rule('REVIEW_ONLY', 'Outputs consider review, never direct financial advice.', 'language', 'REQUIRES')],
    marketGateRules: [rule('WEAK_MARKET_ADDS_RISK', 'Weak market increases review score.', 'marketGate', 'SCORES')],
    parameters: { minScore: 60, backtestEntryRule: 'SIGNAL_DIRECTION_BEARISH', backtestExitRule: 'FIXED_HOLDING_PERIOD', maxHoldingDays: 45 },
    explanationTemplate: 'Triggered when bearish signal and trend breakdown raise holding risk.',
    examples: { triggers: ['Bearish signal plus price below SMA50.'], blocks: ['Insufficient holding/price context lowers confidence.'] },
  },
  {
    code: 'RISK_OFF_AVOIDANCE',
    name: 'Risk-Off Avoidance',
    description: 'Global gate that blocks new long entries in poor market conditions.',
    category: 'GATE',
    style: 'MARKET_GATE',
    timeframe: 'DAILY',
    assetTypes: commonAssetTypes,
    supportedRegions: commonRegions,
    version: '1.2.0',
    status: 'ACTIVE',
    requiredInputs: ['marketGate', 'marketRegime'],
    entryRules: [],
    exitRules: [],
    invalidationRules: [],
    noiseFilters: [rule('MARKET_CLOSED', 'Market gate closed blocks new long entries.', 'marketGate', 'BLOCKS', 'CLOSED'), rule('RISK_OFF_REGIME', 'Risk-off regime blocks new long entries.', 'marketRegime', 'BLOCKS', 'RISK_OFF')],
    riskRules: [rule('MANAGE_EXISTING_ONLY', 'Manage existing positions only.', 'allowedActions', 'REQUIRES')],
    marketGateRules: [rule('GLOBAL_GATE', 'Applies before long-entry strategies.', 'marketGate', 'REQUIRES')],
    parameters: { minScore: 1, backtestEntryRule: 'SIGNAL_DIRECTION_BULLISH', backtestExitRule: 'SIGNAL_DIRECTION_BEARISH', maxHoldingDays: 60 },
    explanationTemplate: 'Blocks entries when market conditions are not supportive.',
    examples: { triggers: ['Closed market gate returns AVOID.'], blocks: ['This is itself a blocking gate, not a trade entry.'] },
  },
  {
    code: 'MEAN_REVERSION_PULLBACK',
    name: 'Mean Reversion Pullback',
    description: 'Draft strategy for oversold recovery only inside non-broken trend context.',
    category: 'ENTRY',
    style: 'MEAN_REVERSION',
    timeframe: 'DAILY_SWING',
    assetTypes: commonAssetTypes,
    supportedRegions: commonRegions,
    version: '1.2.0',
    status: 'DRAFT',
    requiredInputs: ['rsi', 'sma50', 'sma200', 'rawSignal', 'latestPrice', 'dataQuality', 'marketGate', 'marketRegime', 'sectorLeadership', 'sectorRelativeStrengthScore', 'smartMoneyStatus'],
    entryRules: [rule('RSI_RECOVERY', 'RSI is recovering from oversold.', 'rsi', 'SCORES', '30-45', 25), rule('NOT_BROKEN_TREND', 'Price remains above SMA200.', 'latestPrice/sma200', 'REQUIRES', true, 20)],
    exitRules: COMMON_LONG_EXIT_RULES,
    invalidationRules: [...COMMON_LONG_INVALIDATION_RULES, rule('FALLING_KNIFE_INVALIDATED', 'Invalidate mean-reversion setup when long-term trend breaks.', 'latestPrice/sma200', 'BLOCKS')],
    noiseFilters: [rule('FALLING_KNIFE', 'Avoid if price is below SMA200 or market gate is closed.', 'latestPrice/sma200', 'BLOCKS')],
    riskRules: [rule('DRAFT_ONLY', 'Draft until falling-knife handling is proven.', 'status', 'WARNS')],
    marketGateRules: [rule('MARKET_NOT_CLOSED', 'Market gate should not be closed.', 'marketGate', 'REQUIRES')],
    parameters: { minScore: 70, backtestEntryRule: 'PRICE_ABOVE_SMA50', backtestExitRule: 'FIXED_HOLDING_PERIOD' },
    explanationTemplate: 'Draft only; avoids confused falling-knife setups.',
    examples: { triggers: ['RSI recovery while long-term trend remains intact.'], blocks: ['Below SMA200 or closed market gate.'] },
  },
  {
    code: 'LOW_QUALITY_DATA_REJECTION',
    name: 'Low Quality Data Rejection',
    description: 'Reusable filter that excludes poor-quality, unusable, or illiquid instruments.',
    category: 'FILTER',
    style: 'DATA_QUALITY',
    timeframe: 'DAILY',
    assetTypes: commonAssetTypes,
    supportedRegions: commonRegions,
    version: '1.2.0',
    status: 'ACTIVE',
    requiredInputs: ['dataQuality'],
    entryRules: [],
    exitRules: [],
    invalidationRules: [],
    noiseFilters: [rule('COVERAGE_UNUSABLE', 'Coverage is unusable.', 'dataQuality.coverageStatus', 'BLOCKS', 'UNUSABLE'), rule('READINESS_NOT_READY', 'Signal readiness is not ready.', 'dataQuality.signalReadinessStatus', 'BLOCKS', 'NOT_READY'), rule('ILLIQUID', 'Liquidity is illiquid.', 'dataQuality.liquidityStatus', 'BLOCKS', 'ILLIQUID')],
    riskRules: [rule('LOCAL_FIRST_DATA_CHECK', 'Uses local data quality evaluation only.', 'dataQuality', 'REQUIRES')],
    marketGateRules: [],
    parameters: { minScore: 1, backtestEntryRule: 'SIGNAL_DIRECTION_BULLISH', backtestExitRule: 'SIGNAL_DIRECTION_BEARISH' },
    explanationTemplate: 'Blocks downstream strategies when local data is not trustworthy.',
    examples: { triggers: ['Ready and liquid instruments pass.'], blocks: ['NOT_READY, UNUSABLE, or ILLIQUID.'] },
  },
];

export class StrategyFrameworkRegistry {
  list(): StrategyDefinition[] {
    return REGISTERED_STRATEGIES;
  }

  get(code: string): StrategyDefinition | null {
    return REGISTERED_STRATEGIES.find((strategy) => strategy.code === code.toUpperCase()) ?? null;
  }

  active(): StrategyDefinition[] {
    return REGISTERED_STRATEGIES.filter((strategy) => strategy.status === 'ACTIVE');
  }
}
