/**
 * signal-lifecycle.ts
 *
 * Pure, side-effect-free lifecycle classification for signal candidates.
 *
 * EXIT THRESHOLD RATIONALE
 * ========================
 * EXIT_SCORE_THRESHOLD = 45
 *   The engine emits BULLISH at score >= 70, NEUTRAL at >= 40, BEARISH below 40.
 *   45 sits 5 points above the BEARISH boundary — it's the "wobble band" where
 *   a previously-strong BULLISH signal has shed meaningful strength but hasn't
 *   yet crossed into unambiguous BEARISH territory.  Anything at or below 45
 *   on a previously-active long should be flagged for review.
 *
 * EXIT_SCORE_DELTA_THRESHOLD = 15
 *   A drop of 15+ composite points on a 0-100 scale (roughly 3 category-level
 *   signal flips) represents meaningful deterioration worth reviewing.
 *
 * SHORT-vs-AVOID DISTINCTION
 * ==========================
 * A BEARISH signal on a cash-only stock (derivativesEligible !== true) is
 * NEVER a tradable exit-short — it is a risk_warning / avoid signal.
 * The classifyLifecycle helper does NOT itself produce short recommendations;
 * it only classifies lifecycle states.  The `triggerTypeFor` method in the
 * service enforces the tradable-short gate separately (service.ts line ~863).
 * This module never references "buy" or "sell".
 */

export type SignalLifecycleState = 'ENTRY' | 'ACTIVE' | 'EXIT' | 'EXPIRED';

export interface LifecycleThresholds {
  /**
   * A persisted signal is classified EXIT (weakened) when the current score
   * is at or below this value.  Default: 45.
   */
  exitScoreThreshold: number;
  /**
   * A persisted signal is classified EXIT (deteriorated) when the score has
   * dropped by at least this many points since the prior run.  Default: 15.
   */
  exitScoreDelta: number;
}

export const DEFAULT_LIFECYCLE_THRESHOLDS: LifecycleThresholds = {
  exitScoreThreshold: 45,
  exitScoreDelta: 15,
};

export interface LifecyclePriorSignal {
  /** Composite score from the most-recent prior persisted run (0-100). */
  priorScore: number;
  /** Direction from the most-recent prior persisted run. */
  priorDirection: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
}

export interface LifecycleCurrentSignal {
  /** Composite score from the current run (0-100). */
  score: number;
  /** Direction from the current run. */
  direction: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
}

/**
 * classifyLifecycle
 *
 * Pure function; has no I/O side-effects and is trivially unit-testable.
 *
 * EXIT applies only to signals that were previously BULLISH (long positions).
 * A BEARISH or NEUTRAL prior is not a long position and cannot have an
 * EXIT-long event — only direction-consistent weakening applies there.
 *
 * Rules (evaluated in order — first match wins):
 *  1. No prior signal                           → ENTRY
 *  2. No current signal                         → EXPIRED
 *  3. Prior BULLISH + current not BULLISH       → EXIT  (long position weakened/flipped)
 *  4. Prior BULLISH + current score ≤ exitScoreThreshold
 *                                               → EXIT  (score fell below safe floor)
 *  5. Prior BULLISH + score dropped ≥ exitScoreDelta
 *                                               → EXIT  (meaningful deterioration)
 *  6. Otherwise                                 → ACTIVE
 *
 * Rules 3–5 are deliberately restricted to prior=BULLISH because:
 *  - A BEARISH risk_warning that stays BEARISH is ACTIVE (the warning is still valid).
 *  - A bearish signal on a cash-only stock is NEVER a tradable short EXIT.
 *    The `triggerTypeFor` method in the service enforces the derivativesEligible
 *    gate separately (see signal-generation-engine.service.ts ~line 863).
 */
export function classifyLifecycle(
  prior: LifecyclePriorSignal | null,
  current: LifecycleCurrentSignal | null,
  thresholds: LifecycleThresholds = DEFAULT_LIFECYCLE_THRESHOLDS,
): SignalLifecycleState {
  if (!prior) return 'ENTRY';
  if (!current) return 'EXPIRED';

  // Only evaluate EXIT conditions when the prior signal was a BULLISH (long) candidate.
  if (prior.priorDirection === 'BULLISH') {
    if (current.direction !== 'BULLISH') return 'EXIT';
    if (current.score <= thresholds.exitScoreThreshold) return 'EXIT';
    if (prior.priorScore - current.score >= thresholds.exitScoreDelta) return 'EXIT';
  }

  return 'ACTIVE';
}
