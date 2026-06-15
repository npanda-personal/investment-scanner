/**
 * F&O Readiness Score — research-support composite for F&O-eligible stocks.
 *
 * Blends the already-persisted base signal score with persisted F&O / technical
 * factors into a single 0–100 "how well-positioned is this F&O candidate right
 * now" number, plus a transparent component breakdown and an A/B/C grade.
 *
 * Pure function, DB-only inputs (no new ingestion). Computed at read-time in the
 * screener service, beside the existing rsPercentile pass.
 *
 * Semantics are long-candidate-quality, matching the app's research-support
 * framing (signal score is 0–100 where 50 = neutral and higher = more bullish;
 * see signal-generation-engine `compositeScore`). This is descriptive signal
 * quality, NEVER trade advice.
 *
 * Weighting (tunable in one place):
 *   50% base signal score
 *   15% relative strength (RS percentile)
 *   15% derivatives positioning (OI build-up label, PCR sanity)
 *   10% delivery % (accumulation / conviction — the best India "fundamental" proxy persisted)
 *   10% 52-week trend position
 *   Gate: in the F&O ban list → readiness halved (OI restricted = not cleanly tradable).
 */

export type FnoGrade = 'A' | 'B' | 'C';

export interface FnoReadinessComponents {
  /** 0–100 base signal score contribution (pre-weight). */
  signal: number;
  /** 0–100 relative-strength percentile contribution. */
  relativeStrength: number;
  /** 0–100 derivatives-positioning contribution (OI build-up + PCR). */
  derivativesPositioning: number;
  /** 0–100 delivery-% contribution. */
  delivery: number;
  /** 0–100 52-week trend-position contribution. */
  trend: number;
}

export interface FnoReadinessInput {
  signalScore: number | null;        // 0–100 (50 = neutral; higher = more bullish, encodes direction)
  rsPercentile: number | null;       // 0–100
  range52wPositionPct: number | null; // 0–100
  deliveryPct: number | null;        // 0–100
  buildupLabel: string | null;       // LONG_BUILDUP | SHORT_BUILDUP | SHORT_COVERING | LONG_UNWINDING | NEUTRAL
  pcrOi: number | null;              // put/call OI ratio
  inFnoBan: boolean;
}

export interface FnoReadinessResult {
  score: number;                     // 0–100
  grade: FnoGrade;
  components: FnoReadinessComponents;
}

export const FNO_READINESS_WEIGHTS = {
  signal: 0.5,
  relativeStrength: 0.15,
  derivativesPositioning: 0.15,
  delivery: 0.1,
  trend: 0.1,
} as const;

/** In-ban tradability penalty: OI is restricted, so the candidate is demoted. */
export const FNO_BAN_PENALTY_FACTOR = 0.5;

const NEUTRAL = 50;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/** Absent input = neutral midpoint (we don't penalize a data gap as if it were bad). */
function orNeutral(value: number | null | undefined): number {
  return value == null || !Number.isFinite(value) ? NEUTRAL : clamp(value, 0, 100);
}

/**
 * Derivatives positioning as a bullish-confirmation sub-score (0–100).
 * Fresh longs / short covering confirm a long candidate; fresh shorts / long
 * unwinding contradict it. Extreme PCR (very put- or call-heavy) trims the score
 * as a caution flag.
 */
function derivativesPositioningScore(buildupLabel: string | null, pcrOi: number | null): number {
  let base: number;
  switch ((buildupLabel ?? '').toUpperCase()) {
    case 'LONG_BUILDUP': base = 100; break;   // price up + OI up → fresh longs
    case 'SHORT_COVERING': base = 80; break;  // price up + OI down → shorts exiting
    case 'NEUTRAL': base = 50; break;
    case 'LONG_UNWINDING': base = 35; break;  // price down + OI down → longs exiting
    case 'SHORT_BUILDUP': base = 15; break;   // price down + OI up → fresh shorts
    default: base = NEUTRAL; break;           // no data → neutral
  }
  // PCR sanity: penalize extremes (crowded positioning) by up to 10 points.
  if (pcrOi != null && Number.isFinite(pcrOi)) {
    if (pcrOi > 1.5 || pcrOi < 0.4) base = clamp(base - 10, 0, 100);
  }
  return base;
}

/**
 * Compute the F&O readiness composite for one stock from persisted inputs.
 */
export function computeFnoReadiness(input: FnoReadinessInput): FnoReadinessResult {
  const components: FnoReadinessComponents = {
    signal: orNeutral(input.signalScore),
    relativeStrength: orNeutral(input.rsPercentile),
    derivativesPositioning: derivativesPositioningScore(input.buildupLabel, input.pcrOi),
    delivery: orNeutral(input.deliveryPct),
    trend: orNeutral(input.range52wPositionPct),
  };

  let score =
    components.signal * FNO_READINESS_WEIGHTS.signal +
    components.relativeStrength * FNO_READINESS_WEIGHTS.relativeStrength +
    components.derivativesPositioning * FNO_READINESS_WEIGHTS.derivativesPositioning +
    components.delivery * FNO_READINESS_WEIGHTS.delivery +
    components.trend * FNO_READINESS_WEIGHTS.trend;

  if (input.inFnoBan) score *= FNO_BAN_PENALTY_FACTOR;

  score = clamp(Math.round(score), 0, 100);

  const grade: FnoGrade = score >= 70 ? 'A' : score >= 50 ? 'B' : 'C';

  return { score, grade, components };
}
