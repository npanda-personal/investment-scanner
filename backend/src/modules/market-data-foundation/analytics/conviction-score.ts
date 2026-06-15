/**
 * Conviction bar — the fixed product definition of a "high-conviction" candidate.
 *
 * A stock qualifies only when the signal engine AND smart-money accumulation agree
 * strongly across EVERY tracked horizon:
 *   - latest signal score >= 70, AND
 *   - latest smart-money score > 70 in all three ranges (1M, 3M, 6M).
 *
 * Note: the smart-money engine needs >= 21 bars of price/volume history to infer
 * accumulation, so a sub-month "1W" horizon is not computable (it returns
 * INSUFFICIENT_DATA for every stock) — the horizons are 1M/3M/6M by design.
 *
 * These thresholds are intentionally NOT request parameters: the tab is defined by
 * the bar, so relaxing it would change what the feature means. The repository SQL
 * gates on these same constants (single source of truth); the serving layer applies
 * `passesConvictionBar` as a final defensive filter so any future SQL drift cannot
 * silently leak a below-bar row.
 */
export const CONVICTION_MIN_SIGNAL_SCORE = 70;
export const CONVICTION_MIN_SMART_MONEY_SCORE = 70;

/** Top-N cap on the candidate list. */
export const CONVICTION_RESULT_LIMIT = 20;

export interface ConvictionScoreInput {
  signalScore: number | null;
  sm1m: number | null;
  sm3m: number | null;
  sm6m: number | null;
}

/** True only when signal >= 70 AND every smart-money range is present and > 70. */
export function passesConvictionBar(row: ConvictionScoreInput): boolean {
  if (row.signalScore == null || row.signalScore < CONVICTION_MIN_SIGNAL_SCORE) return false;
  const ranges = [row.sm1m, row.sm3m, row.sm6m];
  return ranges.every((score) => score != null && score > CONVICTION_MIN_SMART_MONEY_SCORE);
}
