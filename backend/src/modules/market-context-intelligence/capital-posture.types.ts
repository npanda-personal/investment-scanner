import type { MarketRegime } from './market-context-intelligence.types';

// ─── Posture labels ────────────────────────────────────────────────────────

export type PostureLabel = 'RISK_ON' | 'NEUTRAL' | 'RISK_OFF';
export type PostureAction = 'DEPLOY' | 'HOLD' | 'RAISE_CASH' | 'STAY_OUT';

// ─── Exposure thresholds (named constants) ────────────────────────────────

/**
 * Minimum-equity-exposure percentages by posture.
 *
 * Mapping rationale
 * -----------------
 * RISK_OFF  (regimeScore ≤ 40 OR marketHealthScore < 40):
 *   Band 0–25 %  — capital preservation mode.
 *   Action: RAISE_CASH (trim / don't add) or STAY_OUT (no health score at all).
 *
 * NEUTRAL   (regimeScore 41–64 AND marketHealthScore 40–59):
 *   Band 40–75 % — selective deployment, avoid weak sectors.
 *   Action: HOLD (maintain current, no aggressive addition).
 *
 * RISK_ON   (regimeScore ≥ 65 AND marketHealthScore ≥ 60):
 *   Band 75–100 % — environment supports broad deployment.
 *   Action: DEPLOY (add to high-conviction positions, respect risk limits).
 *
 * Breadth modifier (applied on top of regime gate):
 *   If percentAbove50Dma < BREADTH_WEAK_THRESHOLD AND posture would be RISK_ON → downgrade to NEUTRAL.
 *   If percentAbove50Dma < BREADTH_VERY_WEAK_THRESHOLD AND posture would be NEUTRAL → downgrade to RISK_OFF.
 */
export const EXPOSURE_BANDS: Record<PostureLabel, { minPct: number; maxPct: number }> = {
  RISK_OFF: { minPct: 0, maxPct: 25 },
  NEUTRAL:  { minPct: 40, maxPct: 75 },
  RISK_ON:  { minPct: 75, maxPct: 100 },
};

// Regime score thresholds (from MarketContextIntelligenceService.regimeFromScore)
export const REGIME_SCORE_RISK_ON_MIN  = 65;   // score >= 65 → RISK_ON
export const REGIME_SCORE_RISK_OFF_MAX = 40;   // score <= 40 → RISK_OFF

// MarketHealthScore thresholds (from MarketPulseSnapshotService.marketHealthLabelForScore)
export const HEALTH_SCORE_STRONG_MIN   = 60;   // HEALTHY / TRADABLE_BUT_SELECTIVE threshold
export const HEALTH_SCORE_FRAGILE_MAX  = 39;   // below 40 → RISKY

// Breadth modifier thresholds (fraction, 0–1)
export const BREADTH_WEAK_THRESHOLD       = 0.40; // < 40 % above 50-DMA weakens RISK_ON → NEUTRAL
export const BREADTH_VERY_WEAK_THRESHOLD  = 0.25; // < 25 % above 50-DMA weakens NEUTRAL → RISK_OFF

// ─── Regime gate ──────────────────────────────────────────────────────────

/**
 * Result of `regimeGate()`.
 *
 * Downstream signal/strategy layers can import this to suppress or annotate signals
 * without any circular dependency on capital-posture business logic.
 *
 * Convention:
 *  - longsDiscouraged = true  → do not initiate new long entries
 *  - contextualShortsOnly = true → short/hedge context is valid, but only selectively
 */
export interface RegimeGateResult {
  /** Whether the current regime actively discourages new long entries. */
  longsDiscouraged: boolean;
  /**
   * Whether short/hedge activity is contextually sensible
   * (only meaningful in RISK_OFF or weak-breadth NEUTRAL).
   */
  contextualShortsOnly: boolean;
  /** The posture that produced this gate. */
  posture: PostureLabel;
  /** Breadth level used for the gate decision, if available. */
  breadthAbove50Pct: number | null;
  /** Human-readable note for logging / audit trails. */
  note: string;
}

// ─── Evidence block ───────────────────────────────────────────────────────

export interface CapitalPostureEvidence {
  /** Regime from the latest persisted MarketContextSnapshot. */
  regime: MarketRegime | null;
  /** Numeric regime score (0–100) from the persisted snapshot. */
  regimeScore: number | null;
  /** MarketHealthScore (0–100) from the latest persisted MarketPulseSnapshot. */
  marketHealthScore: number | null;
  /** MarketHealthLabel from the latest persisted MarketPulseSnapshot. */
  marketHealthLabel: string | null;
  /** % of stocks above their 50-DMA, with sample count. Null if unavailable. */
  breadthAbove50Dma: {
    value: number | null;
    sampleCount: number;
    denominator: number;
  } | null;
  /** % of stocks above their 200-DMA, with sample count. Null if unavailable. */
  breadthAbove200Dma: {
    value: number | null;
    sampleCount: number;
    denominator: number;
  } | null;
  /** Direction of major indices (from persisted top-indices in MarketPulseSnapshot). */
  indexTrend: {
    score: number | null;
    topIndicesSummary: string | null;
  };
  /** Delivery participation context from the persisted MarketPulseSnapshot. */
  deliveryParticipation: {
    score: number | null;
    summaryText: string | null;
  };
  /** Date of the MarketContextSnapshot used. ISO date string or null. */
  contextSnapshotDate: string | null;
  /** Data-through date of the MarketContextSnapshot. ISO date string or null. */
  contextDataThroughDate: string | null;
  /** Date of the MarketPulseSnapshot used. ISO date string or null. */
  pulseSnapshotDate: string | null;
  /** Data-through date of the MarketPulseSnapshot. ISO date string or null. */
  pulseDataThroughDate: string | null;
  /** Any gaps or caveats the caller should surface. */
  gaps: string[];
}

// ─── Capital Posture DTO ──────────────────────────────────────────────────

export interface CapitalPostureDto {
  /** Whether a valid posture was derived from persisted snapshots. */
  availability: 'READY' | 'UNAVAILABLE';
  scope: { region: string };
  /**
   * Overall posture: RISK_ON | NEUTRAL | RISK_OFF.
   * Null when availability = 'UNAVAILABLE'.
   */
  postureLabel: PostureLabel | null;
  /**
   * Suggested equity exposure band.
   * Null when availability = 'UNAVAILABLE'.
   */
  suggestedExposureBand: { minPct: number; maxPct: number } | null;
  /**
   * Recommended action using research-support vocabulary only.
   * DEPLOY | HOLD | RAISE_CASH | STAY_OUT
   * Null when availability = 'UNAVAILABLE'.
   */
  action: PostureAction | null;
  /** Detailed evidence sourced entirely from persisted snapshots. */
  evidence: CapitalPostureEvidence;
  /** Regime gate for downstream use. Null when availability = 'UNAVAILABLE'. */
  regimeGate: RegimeGateResult | null;
  /** ISO timestamp when this response was assembled (wall-clock only; not a new calculation). */
  assembledAt: string;
  /** Human-readable message. */
  message: string;
}
