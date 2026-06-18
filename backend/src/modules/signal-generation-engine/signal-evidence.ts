/**
 * signal-evidence.ts
 *
 * v4 "evidence model" composite — the pure aggregation layer that fixes the
 * structural gaps in the v3 count-based composite:
 *
 *   #2  No-data vs neutral conflation — a category with NO evidence for THIS
 *       instrument has its weight dropped and the remaining categories renormalized,
 *       instead of being pinned at a neutral 0.5 that drags the score toward NEUTRAL.
 *   #3  Correlated double-counting — conviction is driven by the number of distinct
 *       FACTOR FAMILIES that fired (trend / momentum / volume / valuation …), not by
 *       the raw count of collinear signals.  Seven signals from one uptrend count as
 *       a few independent families, not seven confirmations.
 *   #4  Binary votes — each factor contributes a graded strength (proxied per factor
 *       code today; full magnitude grading is a later refinement, see STRENGTH_BY_CODE).
 *   #7  Monotonicity — the COMPOSITE layer performs no vote-removal: adding a
 *       same-direction factor can only raise (never lower) the composite score.
 *       (Note: evaluateMomentum still collapses 1M/3M into SIX_MONTH_ACCELERATION
 *       upstream of here; fully removing that mutation is a follow-up in the
 *       evaluator layer.  compositeV4 itself never drops a vote.)
 *
 * This module is PURE: it takes the three category evaluations (score + signal lists,
 * the shape produced by signal-scoring.ts) plus the resolved SignalScoringConfig and
 * returns a composite score in [0,100] with an explainable component breakdown.  It
 * imports only types — no I/O, no cross-module dependency, no dependency on
 * signal-scoring.ts (so there is no import cycle).
 */
import type { SignalItem } from './signal-generation-engine.types';
import type { SignalScoringConfig } from './signal-scoring.config';

/**
 * Independent factor families.  Decorrelation groups collinear signals so that the
 * evidence count reflects genuinely independent confirmation, not trend echoes.
 */
export type FactorFamily =
  | 'TREND'
  | 'BREAKOUT_LEVEL'
  | 'MEAN_REVERSION'
  | 'OVEREXTENSION'
  | 'VOLUME'
  | 'MOMENTUM'
  | 'RELATIVE_STRENGTH'
  | 'PROFITABILITY'
  | 'VALUATION'
  | 'INCOME'
  | 'GROWTH'
  | 'OTHER';

/** Map a factor code to its independent family.  Handles the `_NEGATIVE` suffix. */
const FAMILY_BY_CODE: Readonly<Record<string, FactorFamily>> = {
  PRICE_ABOVE_SMA50: 'TREND',
  PRICE_BELOW_SMA50: 'TREND',
  SMA50_ABOVE_SMA200: 'TREND',
  SMA50_BELOW_SMA200: 'TREND',
  NEAR_52_WEEK_HIGH: 'BREAKOUT_LEVEL',
  FALSE_BREAKOUT_REJECTION: 'BREAKOUT_LEVEL',
  FALSE_BREAKDOWN_REJECTION: 'BREAKOUT_LEVEL',
  RSI_RECOVERING: 'MEAN_REVERSION',
  STRONG_RSI_RECOVERY: 'MEAN_REVERSION',
  RSI_OVERBOUGHT_REVERSAL: 'MEAN_REVERSION',
  STRONG_RSI_REVERSAL: 'MEAN_REVERSION',
  RSI_OVERBOUGHT: 'OVEREXTENSION',
  RSI_EXTREME_OVERBOUGHT: 'OVEREXTENSION',
  EXTENDED_ABOVE_SMA50: 'OVEREXTENSION',
  PARABOLIC_RUNUP: 'OVEREXTENSION',
  VOLUME_BREAKOUT: 'VOLUME',
  CONFIRMED_VOLUME_BREAKOUT: 'VOLUME',
  DOWN_VOLUME_SELLOFF: 'VOLUME',
  CONFIRMED_DOWN_VOLUME_SELLOFF: 'VOLUME',
  ONE_MONTH_MOMENTUM: 'MOMENTUM',
  THREE_MONTH_MOMENTUM: 'MOMENTUM',
  SIX_MONTH_ACCELERATION: 'MOMENTUM',
  MACD_BULLISH_CROSS: 'MOMENTUM',
  MACD_BEARISH_CROSS: 'MOMENTUM',
  BOLLINGER_OVERSOLD: 'MEAN_REVERSION',
  BOLLINGER_OVERBOUGHT: 'OVEREXTENSION',
  OUTPERFORMING_PEERS: 'RELATIVE_STRENGTH',
  UNDERPERFORMING_PEERS: 'RELATIVE_STRENGTH',
  POSITIVE_EPS: 'PROFITABILITY',
  NEGATIVE_EPS: 'PROFITABILITY',
  HEALTHY_NET_MARGIN: 'PROFITABILITY',
  NEGATIVE_NET_MARGIN: 'PROFITABILITY',
  PE_BELOW_PEERS: 'VALUATION',
  YIELD_ABOVE_PEERS: 'INCOME',
  // Phase 1 YoY growth votes — an INDEPENDENT family from PROFITABILITY/VALUATION so
  // growth adds genuine evidence breadth (not a collinear echo of the EPS-sign vote).
  REVENUE_GROWTH_YOY: 'GROWTH',
  REVENUE_DECLINE_YOY: 'GROWTH',
  EPS_GROWTH_YOY: 'GROWTH',
  EPS_DECLINE_YOY: 'GROWTH',
};

export function familyForCode(code: string): FactorFamily {
  const base = code.endsWith('_NEGATIVE') ? code.slice(0, -'_NEGATIVE'.length) : code;
  return FAMILY_BY_CODE[base] ?? FAMILY_BY_CODE[code] ?? 'OTHER';
}

/**
 * Per-factor base strength in (0,1].  This is the graded-vote proxy (#4): confirmed /
 * extreme factors carry more weight than their bare counterparts.  A full
 * magnitude-aware grade (scaling by how far past threshold the raw value sits) is a
 * follow-up; the values here already break the pure 1-vote-each behaviour of v3.
 */
const STRENGTH_BY_CODE: Readonly<Record<string, number>> = {
  CONFIRMED_VOLUME_BREAKOUT: 1.0,
  CONFIRMED_DOWN_VOLUME_SELLOFF: 1.0,
  VOLUME_BREAKOUT: 0.8,
  DOWN_VOLUME_SELLOFF: 0.8,
  RSI_EXTREME_OVERBOUGHT: 1.0,
  STRONG_RSI_RECOVERY: 1.0,
  STRONG_RSI_REVERSAL: 1.0,
  PARABOLIC_RUNUP: 1.0,
  EXTENDED_ABOVE_SMA50: 0.9,
  SIX_MONTH_ACCELERATION: 1.0,
  NEAR_52_WEEK_HIGH: 0.7,
  FALSE_BREAKOUT_REJECTION: 0.9,
  FALSE_BREAKDOWN_REJECTION: 0.9,
  // Fresh MACD signal-line cross is a confirmed momentum event; Bollinger band touch is a standard vote.
  MACD_BULLISH_CROSS: 0.9,
  MACD_BEARISH_CROSS: 0.9,
};

const DEFAULT_FACTOR_STRENGTH = 0.8;

export function strengthForCode(code: string): number {
  const base = code.endsWith('_NEGATIVE') ? code.slice(0, -'_NEGATIVE'.length) : code;
  return STRENGTH_BY_CODE[base] ?? STRENGTH_BY_CODE[code] ?? DEFAULT_FACTOR_STRENGTH;
}

/** Tunable knobs for the v4 evidence factor.  Defaults are deliberately conservative. */
export interface V4EvidenceConfig {
  /** Laplace add-smoothing for the strength-weighted per-category Bayesian fraction. */
  categoryScoreAlpha: number;
  /** Conviction spread amplifier applied after evidence scaling. */
  spreadGain: number;
  /** Distinct aligning families at which the count component saturates. */
  familySaturation: number;
  /** Weight of the family-count component in the evidence factor. */
  countWeight: number;
  /** Weight of the cross-category agreement component in the evidence factor. */
  agreementWeight: number;
  /** Floor for the agreement contribution when categories conflict. */
  mixedFloor: number;
  /**
   * Evidence-breadth gate (anti thin-evidence inflation): a BULLISH/BEARISH call requires
   * evidence from at least this many analysis CATEGORIES (technical / momentum /
   * fundamental).  When fewer categories carry evidence, the score is capped into the
   * NEUTRAL deadband so a single dimension can never produce a directional call.  Category
   * breadth — not intra-category factor-family count — is the independence unit, so a lone
   * category cannot bypass the gate by firing several collinear families.
   */
  minBreadthCategories: number;
}

export const DEFAULT_V4_EVIDENCE: V4EvidenceConfig = {
  categoryScoreAlpha: 1,
  spreadGain: 1.8,
  familySaturation: 4,
  countWeight: 0.55,
  agreementWeight: 0.45,
  mixedFloor: 0,
  minBreadthCategories: 2,
};

/** The minimal shape of a category evaluation this module needs (matches signal-scoring's CategoryEvaluation). */
export interface CategoryEvaluationLike {
  score: number;
  signals: SignalItem[];
  negativeSignals: SignalItem[];
}

/** Explainable breakdown persisted alongside the score (no schema change — rides in JSON). */
export interface V4Components {
  engineVersion: 'v4';
  rawLean: number;
  displacement: number;
  evidenceFactor: number;
  alignedFamilies: number;
  effectiveWeights: { technical: number; momentum: number; fundamental: number };
  categoryHasEvidence: { technical: boolean; momentum: boolean; fundamental: boolean };
  categoryScores: { technical: number; momentum: number; fundamental: number };
  /** Number of categories that carried evidence for this instrument (the breadth measure). */
  evidencedCategories: number;
  /** True when the evidence-breadth gate capped a directional score into the NEUTRAL band. */
  breadthDamped: boolean;
  /** The conviction the gated score reflects (== displacement unless the gate capped it). */
  effectiveDisplacement: number;
}

interface WeightedCategory {
  score: number;
  hasEvidence: boolean;
}

/** Strength-weighted Bayesian fraction for one category; flags whether it had any evidence. */
function weightedCategoryScore(ev: CategoryEvaluationLike, alpha: number): WeightedCategory {
  const positive = ev.signals.reduce((sum, f) => sum + strengthForCode(f.code), 0);
  const negative = ev.negativeSignals.reduce((sum, f) => sum + strengthForCode(f.code), 0);
  const total = positive + negative;
  if (total === 0) return { score: 0.5, hasEvidence: false };
  return { score: (positive + alpha * 0.5) / (total + alpha), hasEvidence: true };
}

/**
 * v4 composite score.
 *
 *   effWeights     = base category weights with no-evidence categories zeroed + renormalized (#2)
 *   rawLean        = Σ categoryScore · effWeight        (strength-weighted, #4)
 *   displacement   = rawLean − 0.5
 *   countComponent = 1 − exp(−alignedFamilies / saturation)   (decorrelated, #3)
 *   agreement      = (evidenced categories leaning dominant) / (evidenced categories)
 *   evidenceFactor = countWeight·countComponent + agreementWeight·agreement
 *   score          = clamp(round(50 + displacement·100·spreadGain·evidenceFactor), 0, 100)
 */
export function compositeV4(
  technical: CategoryEvaluationLike,
  momentum: CategoryEvaluationLike,
  fundamentals: CategoryEvaluationLike,
  config: SignalScoringConfig,
  v4: V4EvidenceConfig = DEFAULT_V4_EVIDENCE,
): { score: number; components: V4Components } {
  const base = config.weights;
  const t = weightedCategoryScore(technical, v4.categoryScoreAlpha);
  const m = weightedCategoryScore(momentum, v4.categoryScoreAlpha);
  const f = weightedCategoryScore(fundamentals, v4.categoryScoreAlpha);

  // #2 per-instrument redistribution: a category with no evidence contributes no weight.
  const wT = t.hasEvidence ? base.technical : 0;
  const wM = m.hasEvidence ? base.momentum : 0;
  const wF = f.hasEvidence ? base.fundamental : 0;
  const wSum = wT + wM + wF;
  const eff = wSum > 0
    ? { technical: wT / wSum, momentum: wM / wSum, fundamental: wF / wSum }
    : { technical: 0, momentum: 0, fundamental: 0 };

  const rawLean = wSum > 0
    ? t.score * eff.technical + m.score * eff.momentum + f.score * eff.fundamental
    : 0.5; // no evidence anywhere → exactly neutral
  const displacement = rawLean - 0.5;
  const bullish = displacement >= 0;

  // #3 decorrelation: count DISTINCT families aligned with the dominant direction.
  const alignedFamilies = new Set<FactorFamily>();
  for (const ev of [technical, momentum, fundamentals]) {
    for (const factor of bullish ? ev.signals : ev.negativeSignals) {
      alignedFamilies.add(familyForCode(factor.code));
    }
  }
  const familyCount = alignedFamilies.size;
  const countComponent = 1 - Math.exp(-familyCount / v4.familySaturation);

  // Agreement over EVIDENCED categories only (a no-evidence category neither agrees nor disagrees).
  const cats = [
    { score: t.score, has: t.hasEvidence },
    { score: m.score, has: m.hasEvidence },
    { score: f.score, has: f.hasEvidence },
  ].filter((c) => c.has);
  const agreeing = cats.filter((c) => (bullish ? c.score > 0.5 : c.score < 0.5)).length;
  const agreement = Math.max(v4.mixedFloor, cats.length > 0 ? agreeing / cats.length : 0);

  const evidenceFactor = v4.countWeight * countComponent + v4.agreementWeight * agreement;
  const raw = 50 + displacement * 100 * v4.spreadGain * evidenceFactor;
  let score = Math.min(100, Math.max(0, Math.round(raw)));

  // Evidence-breadth gate (anti thin-evidence inflation): v4's per-instrument weight
  // redistribution (fix #2) plus agreement-over-evidenced-categories means a SINGLE
  // evidenced category yields a renormalized weight of 1.0 AND agreement = 1.0 — so one
  // dimension (e.g. a lone moving-average vote, or several collinear technical families)
  // could reach a confident directional score that the v3 path keeps NEUTRAL.  A directional
  // call must be confirmed across >= minBreadthCategories categories; otherwise cap the score
  // into the NEUTRAL deadband (so a single dimension can never call BULLISH/BEARISH) and
  // reduce the reported conviction proportionally.  Symmetric for longs and shorts.
  const evidencedCategories = cats.length;
  let effectiveDisplacement = displacement;
  let breadthDamped = false;
  if (evidencedCategories < v4.minBreadthCategories
      && (score >= config.directionThresholds.bullish || score <= config.directionThresholds.bearish)) {
    const capped = score >= config.directionThresholds.bullish
      ? config.directionThresholds.bullish - 1
      : config.directionThresholds.bearish + 1;
    // raw !== 50 here (the score was directional), so the ratio is finite and same-signed.
    effectiveDisplacement = displacement * ((capped - 50) / (raw - 50));
    score = capped;
    breadthDamped = true;
  }

  return {
    score,
    components: {
      engineVersion: 'v4',
      rawLean,
      displacement,
      evidenceFactor,
      alignedFamilies: familyCount,
      effectiveWeights: eff,
      categoryHasEvidence: { technical: t.hasEvidence, momentum: m.hasEvidence, fundamental: f.hasEvidence },
      categoryScores: { technical: t.score, momentum: m.score, fundamental: f.score },
      evidencedCategories,
      breadthDamped,
      effectiveDisplacement,
    },
  };
}
