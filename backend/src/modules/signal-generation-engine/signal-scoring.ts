/**
 * signal-scoring.ts
 *
 * Pure v3 scoring engine: category evaluation (technical / momentum / fundamental),
 * the evidence-scaled conviction-gradient composite, direction cut-points and the
 * human-readable explanation.  No I/O, no cross-module service imports — depends
 * only on the pure indicator layer, the price-point type and an injected
 * SignalScoringConfig.  Reusable verbatim by the equity engine and the crypto lane.
 *
 * Every constant the algorithm used to hardcode now arrives via SignalScoringConfig
 * (see signal-scoring.config.ts).  The DEFAULT config reproduces the prior India
 * equity behaviour byte-for-byte.
 */
import type { SignalItem, SignalPricePoint, SignalDirection } from './signal-generation-engine.types';
import {
  DIRECTION_BULLISH_THRESHOLD,
  DIRECTION_BEARISH_THRESHOLD,
} from '../../shared/types/signal.types';
import {
  sma,
  rsi,
  atr,
  adx,
  closePosition,
  periodHigh,
  periodLow,
  returnAtOffset,
  isObvTrendingUp,
  isObvTrendingDown,
} from './signal-indicators';
import { average } from './signal-math';
import {
  DEFAULT_SIGNAL_SCORING_CONFIG,
  type SignalScoringConfig,
} from './signal-scoring.config';

export interface CategoryEvaluation {
  score: number;
  signals: SignalItem[];
  negativeSignals: SignalItem[];
}

export function signal(code: string, label: string, category: SignalItem['category']): SignalItem {
  return { code, label, category };
}

/**
 * Laplace-smoothed per-category Bayesian fraction.
 * total=0 → 0.5 (no evidence).  Examples (alpha=1): 1/0 → 0.75, 5/0 → 0.917, 0/5 → 0.083.
 */
export function categoryScore(
  positive: number,
  negative: number,
  config: SignalScoringConfig = DEFAULT_SIGNAL_SCORING_CONFIG,
): number {
  const total = positive + negative;
  if (total === 0) return 0.5;
  const alpha = config.evidence.categoryScoreAlpha;
  return (positive + alpha * 0.5) / (total + alpha);
}

export function evaluateTechnical(
  prices: SignalPricePoint[],
  config: SignalScoringConfig = DEFAULT_SIGNAL_SCORING_CONFIG,
): CategoryEvaluation {
  const guards = config.guards;
  const signals: SignalItem[] = [];
  const negativeSignals: SignalItem[] = [];
  const latest = prices[0];
  const previous = prices[1];
  const sma50 = sma(prices, 50);
  const sma200 = sma(prices, 200);
  const high52 = periodHigh(prices, 252);
  const low52 = periodLow(prices, 252);
  const rsiNow = rsi(prices, 14);
  const rsiPrev = rsi(prices.slice(1), 14);
  const currentAtr = atr(prices, 14);
  const currentClosePos = closePosition(latest);
  const currentAdx = adx(prices, 14);
  const obvTrendingUp = isObvTrendingUp(prices, 10);
  const obvTrendingDown = isObvTrendingDown(prices, 10);

  const isRangeBound = currentAdx !== null && currentAdx < 20;

  if (latest && sma50 !== null) {
    if (isRangeBound) {
      // Mute SMA signals in range-bound markets (noise)
    } else {
      (latest.adjusted_close >= sma50 ? signals : negativeSignals).push(signal(
        latest.adjusted_close >= sma50 ? 'PRICE_ABOVE_SMA50' : 'PRICE_BELOW_SMA50',
        latest.adjusted_close >= sma50 ? 'price is above SMA50' : 'price is below SMA50',
        'TECHNICAL'
      ));
    }
  }
  if (sma50 !== null && sma200 !== null) {
    if (isRangeBound) {
      // Mute SMA crossover signals in range-bound markets
    } else {
      (sma50 >= sma200 ? signals : negativeSignals).push(signal(
        sma50 >= sma200 ? 'SMA50_ABOVE_SMA200' : 'SMA50_BELOW_SMA200',
        sma50 >= sma200 ? 'SMA50 is above SMA200' : 'SMA50 is below SMA200',
        'TECHNICAL'
      ));
    }
  }

  // Candlestick Rejection & Breakouts
  if (latest && high52 !== null && latest.adjusted_close >= high52 * 0.97) {
    if (currentClosePos !== null && currentClosePos < 0.3) {
      negativeSignals.push(signal('FALSE_BREAKOUT_REJECTION', 'price tagged 52-week high but closed in the bottom 30% of the daily range (Trap)', 'TECHNICAL'));
    } else {
      signals.push(signal('NEAR_52_WEEK_HIGH', 'price is near a 52-week high', 'TECHNICAL'));
    }
  }
  if (latest && low52 !== null && latest.adjusted_close <= low52 * 1.03) {
    if (currentClosePos !== null && currentClosePos > 0.7) {
      signals.push(signal('FALSE_BREAKDOWN_REJECTION', 'price tagged 52-week low but closed in the top 30% of the daily range (Trap)', 'TECHNICAL'));
    }
    // NEAR_52_WEEK_LOW removed: proximity to 52w-low is mean-reverting on NSE — anti-predictive as a bearish vote
  }

  // Mean Reversion is stronger in range-bound markets
  if (rsiNow !== null && rsiPrev !== null && rsiPrev < 30 && rsiNow > rsiPrev) {
    signals.push(signal(isRangeBound ? 'STRONG_RSI_RECOVERY' : 'RSI_RECOVERING', 'RSI is recovering from oversold levels', 'TECHNICAL'));
  }
  // Require a meaningful RSI drop (>2 points) to avoid voting bearish on single-bar noise in strong trends
  if (rsiNow !== null && rsiPrev !== null && rsiPrev > 70 && rsiNow < rsiPrev - 2) {
    negativeSignals.push(signal(isRangeBound ? 'STRONG_RSI_REVERSAL' : 'RSI_OVERBOUGHT_REVERSAL', 'RSI is reversing from overbought levels', 'TECHNICAL'));
  }

  // Guard 1: Overbought RSI — demote over-extended names while RSI is still elevated.
  if (guards.overboughtRsiEnabled && rsiNow !== null) {
    if (rsiNow >= guards.rsiExtremeOverbought) {
      negativeSignals.push(signal('RSI_EXTREME_OVERBOUGHT', `RSI(14) is ${rsiNow.toFixed(1)} — extremely overbought (>=${guards.rsiExtremeOverbought}); mean-reversion risk is elevated`, 'TECHNICAL'));
    } else if (rsiNow >= guards.rsiOverbought) {
      negativeSignals.push(signal('RSI_OVERBOUGHT', `RSI(14) is ${rsiNow.toFixed(1)} — overbought (>=${guards.rsiOverbought}); upside momentum is stretched`, 'TECHNICAL'));
    }
  }

  // Guard 2: Extended above SMA50 — parabolic stretch from the medium-term trend.
  if (guards.sma50StretchEnabled && latest && sma50 !== null && sma50 > 0) {
    const stretchPct = (latest.adjusted_close - sma50) / sma50;
    if (stretchPct >= guards.sma50StretchPct) {
      negativeSignals.push(signal('EXTENDED_ABOVE_SMA50', `price is ${(stretchPct * 100).toFixed(1)}% above SMA50 — over-extended from trend (threshold: ${(guards.sma50StretchPct * 100).toFixed(0)}%)`, 'TECHNICAL'));
    }
  }

  // Volatility-Adjusted Volume Breakout with Institutional Footprint (OBV)
  const averageVolume = average(prices.slice(1, 21).map((price) => price.volume).filter((value): value is number => typeof value === 'number'));
  if (latest?.volume && averageVolume && latest.volume >= averageVolume * 1.5) {
    const priceMove = previous ? Math.abs(latest.adjusted_close - previous.adjusted_close) : 0;

    if (currentAtr !== null && priceMove > (currentAtr * 1.5)) {
      if (previous && latest.adjusted_close < previous.adjusted_close) {
        if (obvTrendingDown) {
          negativeSignals.push(signal('CONFIRMED_DOWN_VOLUME_SELLOFF', 'heavy selloff exceeding 1.5x ATR with institutional distribution (OBV)', 'TECHNICAL'));
        } else {
          negativeSignals.push(signal('DOWN_VOLUME_SELLOFF', 'heavy down-volume selloff exceeding 1.5x ATR', 'TECHNICAL'));
        }
      } else {
        if (obvTrendingUp) {
          signals.push(signal('CONFIRMED_VOLUME_BREAKOUT', 'volume breakout exceeding 1.5x ATR with institutional accumulation (OBV)', 'TECHNICAL'));
        } else {
          signals.push(signal('VOLUME_BREAKOUT', 'volume breakout confirms the move exceeding 1.5x ATR', 'TECHNICAL'));
        }
      }
    } else if (currentAtr === null) {
      // Fallback if ATR is not available
      (previous && latest.adjusted_close < previous.adjusted_close ? negativeSignals : signals).push(signal(
        previous && latest.adjusted_close < previous.adjusted_close ? 'DOWN_VOLUME_SELLOFF' : 'VOLUME_BREAKOUT',
        previous && latest.adjusted_close < previous.adjusted_close ? 'heavy down-volume selloff' : 'volume breakout confirms the move',
        'TECHNICAL'
      ));
    }
  }

  return { score: categoryScore(signals.length, negativeSignals.length, config), signals, negativeSignals };
}

export function evaluateMomentum(
  prices: SignalPricePoint[],
  relativeToPeers: number | null,
  config: SignalScoringConfig = DEFAULT_SIGNAL_SCORING_CONFIG,
): CategoryEvaluation {
  const m = config.momentum;
  const guards = config.guards;
  const signals: SignalItem[] = [];
  const negativeSignals: SignalItem[] = [];
  const oneMonth = returnAtOffset(prices, 21);
  const threeMonth = returnAtOffset(prices, 63);
  const sixMonth = returnAtOffset(prices, 126);

  pushReturnSignal(oneMonth, 'ONE_MONTH_MOMENTUM', '1M momentum is positive', '1M momentum is negative', signals, negativeSignals, m.bull1m, m.bear1m);
  pushReturnSignal(threeMonth, 'THREE_MONTH_MOMENTUM', '3M momentum is positive', '3M momentum is negative', signals, negativeSignals, m.bull3m, m.bear3m);

  // Guard 3: Parabolic short-term run-up — require BOTH 10-day and 5-day returns to
  // clear the threshold so a single-day post-earnings gap that then consolidates is
  // not penalised; true parabolic runs sustain over the 5-day window.
  if (guards.parabolicRunupEnabled) {
    const tenDay = returnAtOffset(prices, 10);
    const fiveDay = returnAtOffset(prices, 5);
    if (tenDay !== null && fiveDay !== null && tenDay >= guards.parabolicRunupPct && fiveDay >= guards.parabolicRunupPct) {
      negativeSignals.push(signal('PARABOLIC_RUNUP', `10-day return is ${(tenDay * 100).toFixed(1)}% and 5-day return is ${(fiveDay * 100).toFixed(1)}% — sustained parabolic spike (threshold: ${(guards.parabolicRunupPct * 100).toFixed(0)}%); short-term mean-reversion risk`, 'MOMENTUM'));
    }
  }
  // SIX_MONTH_ACCELERATION: emit only when both 1M and 3M already cleared their
  // bullish thresholds (acceleration implies 1M+3M bullish), using the geometric
  // monthly-equivalent comparison.  Emit the acceleration in place of the two
  // individual month signals to avoid triple-counting the same trend.
  if (oneMonth !== null && threeMonth !== null && sixMonth !== null
      && oneMonth >= m.bull1m && threeMonth >= m.bull3m
      && oneMonth > Math.pow(1 + threeMonth, 1 / 3) - 1 && threeMonth > sixMonth / 2) {
    const withoutMonthlyVotes = signals.filter((s) => s.code !== 'ONE_MONTH_MOMENTUM' && s.code !== 'THREE_MONTH_MOMENTUM');
    withoutMonthlyVotes.push(signal('SIX_MONTH_ACCELERATION', '6M trend is accelerating', 'MOMENTUM'));
    signals.length = 0;
    signals.push(...withoutMonthlyVotes);
  }
  // Require >= outperformingPeersMinRelative outperformance to vote bullish — merely
  // keeping pace with peers does not deserve a bullish vote.
  if (relativeToPeers !== null) {
    if (relativeToPeers >= m.outperformingPeersMinRelative) {
      signals.push(signal('OUTPERFORMING_PEERS', `stock is outperforming peer average by ${(relativeToPeers * 100).toFixed(1)}%`, 'MOMENTUM'));
    } else if (relativeToPeers < 0) {
      negativeSignals.push(signal('UNDERPERFORMING_PEERS', 'stock is underperforming peer average', 'MOMENTUM'));
    }
    // 0 <= relativeToPeers < threshold: neutral band — no vote
  }

  return { score: categoryScore(signals.length, negativeSignals.length, config), signals, negativeSignals };
}

export function evaluateFundamentals(
  fundamental: any,
  peerAveragePe: number | null,
  peerAverageYield: number | null,
  config: SignalScoringConfig = DEFAULT_SIGNAL_SCORING_CONFIG,
): CategoryEvaluation {
  const signals: SignalItem[] = [];
  const negativeSignals: SignalItem[] = [];
  const eps = numberOrNull(fundamental?.eps);
  const peRatio = numberOrNull(fundamental?.pe_ratio);
  const dividendYield = numberOrNull(fundamental?.dividend_yield);

  // EPS is the canonical profitability vote; net income is the same fact — dropped to avoid double-counting.
  if (eps !== null) (eps > 0 ? signals : negativeSignals).push(signal(eps > 0 ? 'POSITIVE_EPS' : 'NEGATIVE_EPS', eps > 0 ? 'EPS is positive' : 'EPS is negative', 'FUNDAMENTAL'));
  if (peRatio !== null && peerAveragePe !== null && peRatio > 0) {
    // PE_ABOVE_PEERS is anti-predictive for growth names; only vote bullish (below peers).
    if (peRatio <= peerAveragePe) signals.push(signal('PE_BELOW_PEERS', 'P/E is below peer average', 'FUNDAMENTAL'));
  }
  if (dividendYield !== null && peerAverageYield !== null) {
    // YIELD_BELOW_PEERS is anti-predictive; only vote bullish (above peers).
    if (dividendYield >= peerAverageYield) signals.push(signal('YIELD_ABOVE_PEERS', 'dividend yield is above peer average', 'FUNDAMENTAL'));
  }

  return { score: categoryScore(signals.length, negativeSignals.length, config), signals, negativeSignals };
}

/**
 * v3 Evidence-Scaled Conviction Gradient.
 *
 *   rawLean        = weighted average of category scores in [0,1]
 *   displacement   = rawLean - 0.5
 *   evidenceFactor = countWeight * (1 - exp(-aligning / saturation))
 *                  + agreementWeight * agreementFraction
 *   score          = clamp(round(50 + displacement * 100 * spreadGain * evidenceFactor), 0, 100)
 */
export function compositeScore(
  technical: number, momentum: number, fundamentals: number,
  techPos = 0, techNeg = 0,
  momPos = 0, momNeg = 0,
  fundPos = 0, fundNeg = 0,
  config: SignalScoringConfig = DEFAULT_SIGNAL_SCORING_CONFIG,
): number {
  const w = config.weights;
  const e = config.evidence;

  // Step 1: raw weighted lean in [0,1]
  const rawLean = technical * w.technical + momentum * w.momentum + fundamentals * w.fundamental;
  const displacement = rawLean - 0.5;

  // Step 2: dominant direction + aligning-signal count
  const bullish = displacement >= 0;
  const techAlign = bullish ? techPos : techNeg;
  const momAlign  = bullish ? momPos  : momNeg;
  const fundAlign = bullish ? fundPos : fundNeg;
  const totalAligning = techAlign + momAlign + fundAlign;

  const countComponent = 1 - Math.exp(-totalAligning / e.evidenceSaturationCount);

  // Agreement component: fraction of categories leaning the dominant direction.
  const techLeans = bullish ? technical    > 0.5 : technical    < 0.5;
  const momLeans  = bullish ? momentum     > 0.5 : momentum     < 0.5;
  const fundLeans = bullish ? fundamentals > 0.5 : fundamentals < 0.5;
  const agreeing  = (techLeans ? 1 : 0) + (momLeans ? 1 : 0) + (fundLeans ? 1 : 0);
  const rawAgreement = agreeing / 3;
  const agreementFraction = Math.max(e.evidenceMixedFloor, rawAgreement);

  const evidenceFactor =
    e.evidenceCountWeight * countComponent +
    e.evidenceAgreementWeight * agreementFraction;

  // Step 3: scale displacement and add back to 50
  const raw = 50 + displacement * 100 * e.scoreSpreadGain * evidenceFactor;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function directionForScore(score: number): SignalDirection {
  if (score >= DIRECTION_BULLISH_THRESHOLD) return 'BULLISH';
  if (score <= DIRECTION_BEARISH_THRESHOLD) return 'BEARISH';
  return 'NEUTRAL';
}

export function explain(
  direction: SignalDirection,
  triggeredSignals: SignalItem[],
  negativeSignals: SignalItem[],
  deliveryEvidence?: string | null,
): string {
  const primary = direction === 'BEARISH' ? negativeSignals : triggeredSignals;
  const fallback = direction === 'BEARISH' ? triggeredSignals : negativeSignals;
  const reasons = (primary.length > 0 ? primary : fallback).slice(0, 4).map((s) => s.label);
  const base = reasons.length === 0
    ? `${direction} because there is not enough market data for a strong signal.`
    : `${direction.charAt(0)}${direction.slice(1).toLowerCase()} because ${joinReasons(reasons)}.`;
  if (deliveryEvidence) return `${base} ${deliveryEvidence}`;
  return base;
}

/**
 * Short delivery% evidence phrase (NSE-sourced).  Returns null when delivery data
 * is absent (never fabricated).  Callers gate this on config.hasDelivery so non-NSE
 * markets never surface a delivery annotation.
 */
export function buildDeliveryEvidence(deliveryPercent: number | null): string | null {
  if (deliveryPercent === null || deliveryPercent === undefined) return null;
  const pct = Math.round(deliveryPercent);
  if (pct >= 60) return `Delivery ${pct}% (high conviction).`;
  if (pct >= 40) return `Delivery ${pct}% (above-average delivery).`;
  if (pct < 20) return `Delivery ${pct}% (intraday churn, lower conviction).`;
  return null; // 20–39%: moderate, skip annotation
}

export function pushReturnSignal(
  value: number | null,
  code: string,
  positiveLabel: string,
  negativeLabel: string,
  signals: SignalItem[],
  negativeSignals: SignalItem[],
  bullThreshold: number,
  bearThreshold: number,
): void {
  if (value === null) return;
  if (value >= bullThreshold) {
    signals.push(signal(code, positiveLabel, 'MOMENTUM'));
  } else if (value <= bearThreshold) {
    negativeSignals.push(signal(`${code}_NEGATIVE`, negativeLabel, 'MOMENTUM'));
  }
  // values in the neutral band produce no signal
}

export function joinReasons(reasons: string[]): string {
  if (reasons.length === 1) return reasons[0];
  return `${reasons.slice(0, -1).join(', ')}, and ${reasons[reasons.length - 1]}`;
}

function numberOrNull(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
