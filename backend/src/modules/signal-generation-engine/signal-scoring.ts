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
import { average, stddev } from './signal-math';
import {
  DEFAULT_SIGNAL_SCORING_CONFIG,
  type SignalScoringConfig,
} from './signal-scoring.config';
import { compositeV4, gradedStrength, DEFAULT_V4_EVIDENCE, type V4Components } from './signal-evidence';
import { extraTechnicalVotes } from './signal-extra-votes';
import { fundamentalGrowthVotes, fundamentalMarginTrendVotes, fundamentalPeHistoryVotes } from './signal-fundamental-growth';
export { peerAggregates, peerContextWarnings } from './signal-peer-aggregates';
export { attachRsPercentiles } from './signal-percentile';
export { filterFundamentalsAsOf, isStaleAsOf, stalenessAnchor } from './signal-asof';

export interface CategoryEvaluation {
  score: number;
  signals: SignalItem[];
  negativeSignals: SignalItem[];
}

export function signal(code: string, label: string, category: SignalItem['category'], strength?: number): SignalItem {
  return strength === undefined ? { code, label, category } : { code, label, category, strength };
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
  // #4 magnitude grades are a v4-only enrichment: the v3 (legacy count) path — which the
  // crypto lane still runs — must persist byte-identical signal objects, so `strength` is
  // attached only under v4 (mirrors the v4-gated fundamentals votes below at ~line 306).
  const isV4 = config.scoringEngineVersion === 'v4';
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

  // Mean Reversion is stronger in range-bound markets.
  // #4 magnitude grade: deeper oversold (rsiPrev further below 30) = stronger mean-reversion setup.
  if (rsiNow !== null && rsiPrev !== null && rsiPrev < 30 && rsiNow > rsiPrev) {
    const code = isRangeBound ? 'STRONG_RSI_RECOVERY' : 'RSI_RECOVERING';
    signals.push(signal(code, 'RSI is recovering from oversold levels', 'TECHNICAL', isV4 ? gradedStrength(code, (30 - rsiPrev) / 30) : undefined));
  }
  // Require a meaningful RSI drop (>2 points) to avoid voting bearish on single-bar noise in strong trends.
  // #4 magnitude grade: the higher rsiPrev sat above 70, the stronger the reversal.
  if (rsiNow !== null && rsiPrev !== null && rsiPrev > 70 && rsiNow < rsiPrev - 2) {
    const code = isRangeBound ? 'STRONG_RSI_REVERSAL' : 'RSI_OVERBOUGHT_REVERSAL';
    negativeSignals.push(signal(code, 'RSI is reversing from overbought levels', 'TECHNICAL', isV4 ? gradedStrength(code, (rsiPrev - 70) / 30) : undefined));
  }

  // Guard 1: Overbought RSI — demote over-extended names while RSI is still elevated.
  // #4 magnitude grade: within the 70–80 OVERBOUGHT band, strength scales with depth past
  // 70 (RSI 79 outweighs RSI 71).  RSI_EXTREME_OVERBOUGHT is already tiered at the 1.0
  // ceiling (>=80 is treated as saturated caution), so grading it is a bounded no-op.
  if (guards.overboughtRsiEnabled && rsiNow !== null) {
    if (rsiNow >= guards.rsiExtremeOverbought) {
      negativeSignals.push(signal('RSI_EXTREME_OVERBOUGHT', `RSI(14) is ${rsiNow.toFixed(1)} — extremely overbought (>=${guards.rsiExtremeOverbought}); mean-reversion risk is elevated`, 'TECHNICAL'));
    } else if (rsiNow >= guards.rsiOverbought) {
      const span = guards.rsiExtremeOverbought - guards.rsiOverbought;
      const mag = span > 0 ? (rsiNow - guards.rsiOverbought) / span : 0;
      negativeSignals.push(signal('RSI_OVERBOUGHT', `RSI(14) is ${rsiNow.toFixed(1)} — overbought (>=${guards.rsiOverbought}); upside momentum is stretched`, 'TECHNICAL', isV4 ? gradedStrength('RSI_OVERBOUGHT', mag) : undefined));
    }
  }

  // Guard 2: Extended above SMA50 — parabolic stretch from the medium-term trend.
  // #4 magnitude grade: strength scales with how far past the stretch threshold the price sits.
  if (guards.sma50StretchEnabled && latest && sma50 !== null && sma50 > 0) {
    const stretchPct = (latest.adjusted_close - sma50) / sma50;
    if (stretchPct >= guards.sma50StretchPct) {
      const mag = guards.sma50StretchPct > 0 ? (stretchPct - guards.sma50StretchPct) / guards.sma50StretchPct : 0;
      negativeSignals.push(signal('EXTENDED_ABOVE_SMA50', `price is ${(stretchPct * 100).toFixed(1)}% above SMA50 — over-extended from trend (threshold: ${(guards.sma50StretchPct * 100).toFixed(0)}%)`, 'TECHNICAL', isV4 ? gradedStrength('EXTENDED_ABOVE_SMA50', mag) : undefined));
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

  // MACD cross + Bollinger %B confirmation votes (reuse existing indicators; reinforce
  // technical evidence without inflating v4 family breadth — see signal-extra-votes.ts).
  const extra = extraTechnicalVotes(prices);
  signals.push(...extra.signals);
  negativeSignals.push(...extra.negativeSignals);

  return { score: categoryScore(signals.length, negativeSignals.length, config), signals, negativeSignals };
}

/** Reference daily return volatility (~1.5%) the momentum thresholds were tuned against. */
const REFERENCE_DAILY_VOL = 0.015;

/**
 * SG-3: scale factor for momentum thresholds based on the instrument's own trailing
 * daily-return volatility, clamped to [0.5, 2.5].  A 2x-vol stock needs ~2x the move
 * to vote bullish; a calm stock votes on a smaller move.  Falls back to 1 when there
 * is insufficient history (so behaviour matches the fixed thresholds).
 */
export function volatilityScale(prices: SignalPricePoint[], lookback = 63, refVol = REFERENCE_DAILY_VOL): number {
  const returns: number[] = [];
  const n = Math.min(prices.length - 1, lookback);
  for (let i = 0; i < n; i++) {
    const today = prices[i].adjusted_close;
    const prior = prices[i + 1].adjusted_close;
    if (prior > 0) returns.push((today - prior) / prior);
  }
  const vol = stddev(returns);
  if (vol === null || vol <= 0) return 1;
  return Math.min(2.5, Math.max(0.5, vol / refVol));
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

  // SG-3 (v4 only): volatility-normalize the momentum thresholds so a high-beta name
  // needs a proportionally larger move to vote bullish, and a low-vol name a smaller one
  // (the fixed 2%/5% cuts over-fire on volatile stocks).  scale=1 on the v3 path.
  // #4 magnitude grades are v4-only (see evaluateTechnical): keep the v3/crypto vote objects
  // byte-identical by attaching `strength` only under v4.
  const isV4 = config.scoringEngineVersion === 'v4';
  const vScale = isV4 ? volatilityScale(prices) : 1;
  pushReturnSignal(oneMonth, 'ONE_MONTH_MOMENTUM', '1M momentum is positive', '1M momentum is negative', signals, negativeSignals, m.bull1m * vScale, m.bear1m * vScale, isV4);
  pushReturnSignal(threeMonth, 'THREE_MONTH_MOMENTUM', '3M momentum is positive', '3M momentum is negative', signals, negativeSignals, m.bull3m * vScale, m.bear3m * vScale, isV4);

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
  fundamentalRecords?: any[] | null,
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

  // SG-5 (v4 only): net-margin quality vote.  net_income & revenue are the only extra
  // fundamentals actually ingested (ROE/debt/growth are not sourced yet — see module
  // docs data-source table), so this is the one data-backed enrichment beyond EPS sign.
  // Gated to v4 so the v3 vote set stays byte-identical for the crypto lane and legacy.
  if (config.scoringEngineVersion === 'v4') {
    const netIncome = numberOrNull(fundamental?.net_income);
    const revenue = numberOrNull(fundamental?.revenue);
    if (netIncome !== null && revenue !== null && revenue > 0) {
      const margin = netIncome / revenue;
      // #4 magnitude grade: a 30%+ margin outweighs a bare 10%; a deep loss outweighs a marginal one.
      if (margin >= 0.10) signals.push(signal('HEALTHY_NET_MARGIN', `net margin is ${(margin * 100).toFixed(1)}% (healthy profitability)`, 'FUNDAMENTAL', gradedStrength('HEALTHY_NET_MARGIN', (margin - 0.10) / 0.20)));
      else if (margin < 0) negativeSignals.push(signal('NEGATIVE_NET_MARGIN', 'net margin is negative (lossmaking)', 'FUNDAMENTAL', gradedStrength('NEGATIVE_NET_MARGIN', -margin / 0.20)));
    }
    if (Array.isArray(fundamentalRecords) && fundamentalRecords.length >= 2) {
      // Growth/margin votes anchor on the latest FISCAL period internally (TTM excluded — see signal-fundamental-growth); PE self-history uses the newest record (TTM carries the live peRatio).
      for (const v of [fundamentalGrowthVotes(fundamentalRecords), fundamentalMarginTrendVotes(fundamentalRecords), fundamentalPeHistoryVotes(fundamentalRecords[0], fundamentalRecords)]) {
        signals.push(...v.signals); negativeSignals.push(...v.negativeSignals);
      }
    }
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

export function directionForScore(score: number, config: SignalScoringConfig = DEFAULT_SIGNAL_SCORING_CONFIG): SignalDirection {
  // SG-8: region-pluggable cut-points (default 60/40 via DEFAULT config / shared constants).
  if (score >= config.directionThresholds.bullish) return 'BULLISH';
  if (score <= config.directionThresholds.bearish) return 'BEARISH';
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
  // #4 magnitude grade is a v4-only enrichment; default off so the v3 path (and any legacy
  // caller) emits byte-identical strength-less vote objects.
  gradeStrength = false,
): void {
  if (value === null) return;
  // #4 magnitude grade: how far the return ran past the crossed threshold, normalized by a
  // horizon-relative span (4x the threshold magnitude) so a +20% 1M move outweighs a +3% one
  // while saturating before any single return can dominate the category.
  if (value >= bullThreshold) {
    const span = Math.abs(bullThreshold) * 4;
    const mag = span > 0 ? (value - bullThreshold) / span : 0;
    signals.push(signal(code, positiveLabel, 'MOMENTUM', gradeStrength ? gradedStrength(code, mag) : undefined));
  } else if (value <= bearThreshold) {
    const negCode = `${code}_NEGATIVE`;
    const span = Math.abs(bearThreshold) * 4;
    const mag = span > 0 ? (bearThreshold - value) / span : 0;
    negativeSignals.push(signal(negCode, negativeLabel, 'MOMENTUM', gradeStrength ? gradedStrength(negCode, mag) : undefined));
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

// ── Version-agnostic scoring entry point ───────────────────────────────────────
// The single seam the generation path calls.  It runs the three category evaluators
// once, then routes the composite through v3 (legacy count-based) or v4 (evidence
// model) per `config.scoringEngineVersion`.  Returning the assembled signal lists +
// direction here lets the caller collapse ~18 lines of inline orchestration into one
// call (a step toward retiring the god-file service).

export interface ScoreInstrumentInput {
  prices: SignalPricePoint[];
  relativeToPeers: number | null;
  fundamental: unknown;
  fundamentalRecords?: any[] | null; // multi-period history (DESC) for v4 YoY growth votes
  peerAveragePe: number | null;
  peerAverageYield: number | null;
}

export interface ScoreInstrumentResult {
  score: number;
  direction: SignalDirection;
  triggeredSignals: SignalItem[];
  negativeSignals: SignalItem[];
  totalEvaluated: number;
  technicalScore: number;
  momentumScore: number;
  fundamentalScore: number;
  engineVersion: 'v3' | 'v4';
  /** v4 explainability breakdown (null on the v3 path). */
  components: V4Components | null;
}

export function scoreInstrument(
  input: ScoreInstrumentInput,
  config: SignalScoringConfig = DEFAULT_SIGNAL_SCORING_CONFIG,
): ScoreInstrumentResult {
  const technical = evaluateTechnical(input.prices, config);
  const momentum = evaluateMomentum(input.prices, input.relativeToPeers, config);
  const fundamentals = evaluateFundamentals(input.fundamental, input.peerAveragePe, input.peerAverageYield, config, input.fundamentalRecords);

  const triggeredSignals = [...technical.signals, ...momentum.signals, ...fundamentals.signals];
  const negativeSignals = [...technical.negativeSignals, ...momentum.negativeSignals, ...fundamentals.negativeSignals];
  const totalEvaluated = triggeredSignals.length + negativeSignals.length;

  const useV4 = config.scoringEngineVersion === 'v4';
  let score: number;
  let components: V4Components | null = null;
  if (useV4) {
    const result = compositeV4(technical, momentum, fundamentals, config, config.v4Evidence ?? DEFAULT_V4_EVIDENCE);
    score = result.score;
    components = result.components;
  } else {
    score = compositeScore(
      technical.score, momentum.score, fundamentals.score,
      technical.signals.length, technical.negativeSignals.length,
      momentum.signals.length, momentum.negativeSignals.length,
      fundamentals.signals.length, fundamentals.negativeSignals.length,
      config,
    );
  }

  return {
    score,
    direction: directionForScore(score, config),
    triggeredSignals,
    negativeSignals,
    totalEvaluated,
    technicalScore: technical.score,
    momentumScore: momentum.score,
    fundamentalScore: fundamentals.score,
    engineVersion: useV4 ? 'v4' : 'v3',
    components,
  };
}
