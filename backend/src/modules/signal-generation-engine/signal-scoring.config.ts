/**
 * signal-scoring.config.ts
 *
 * Per-market scoring configuration for the signal-generation engine.
 *
 * WHY THIS EXISTS
 * ===============
 * The v3 scoring constants (category weights, evidence factors, over-extension
 * guards, momentum thresholds, the NSE fundamentals-filing lag, the delivery%
 * capability and the regime-gate policy) used to be hardcoded module-level
 * `const`s inside the service.  That baked India/NSE assumptions into every
 * region: a US scope still ran the NSE 45-day filing lag and the NSE delivery%
 * annotation, and there was no seam to tune guards per market.
 *
 * This module turns those knobs into a resolved, injectable `SignalScoringConfig`
 * derived from the shared `MarketProfile` (the single source of truth for
 * per-asset-class / per-region capabilities).  Domain code branches on the
 * config's capability-derived fields instead of `assetType === 'CRYPTO'` /
 * `region === 'IN'` string checks.
 *
 * BACKWARD COMPATIBILITY
 * ======================
 * `resolveSignalScoringConfig({ region: 'IN', assetType: 'STOCK' })` (and the
 * `DEFAULT_SIGNAL_SCORING_CONFIG` used when no scope is supplied) returns values
 * byte-identical to the prior hardcoded constants, so existing India-equity
 * scoring is unchanged.  Only non-IN / non-equity scopes see market-appropriate
 * behaviour (e.g. crypto redistributes the unused fundamental weight; non-NSE
 * markets disable the delivery annotation).
 */
import { resolveMarketProfile } from '../../shared/utils/market-profile';
import { DIRECTION_BULLISH_THRESHOLD, DIRECTION_BEARISH_THRESHOLD } from '../../shared/types/signal.types';

export const SIGNAL_ENGINE_MODEL_VERSION = 'signal-engine-v3';

/**
 * v4 model version (evidence-model overhaul: per-instrument weight redistribution,
 * magnitude-aware graded votes, decorrelated factor families, region cohorts).
 *
 * Introduced behind `scoringEngineVersion` so v3 and v4 coexist: v3 stays the live,
 * byte-identical decode path until the v4 engine (SG-2) lands and flips the default.
 * Persistence is keyed by modelVersion, so the bump forces a clean regenerate rather
 * than mutating existing v3 rows in place.
 */
export const SIGNAL_ENGINE_MODEL_VERSION_V4 = 'signal-engine-v4';

export type ScoringEngineVersion = 'v3' | 'v4';

/**
 * Which scoring engine a resolved config drives.  Defaults to 'v3' for every scope
 * until SG-2 implements signal-evidence.ts and flips the default to 'v4'.  Kept on the
 * config (not a module global) so a caller/test can pin a version per scope.
 */
export const DEFAULT_SCORING_ENGINE_VERSION: ScoringEngineVersion = 'v3';

/** Number of trailing price bars loaded for signal generation. */
export const SIGNAL_GENERATION_PRICE_WINDOW = 520;

export interface SignalCategoryWeights {
  technical: number;
  momentum: number;
  fundamental: number;
}

export interface SignalMomentumThresholds {
  /** Minimum 1-month return to vote bullish (fractional). */
  bull1m: number;
  /** Maximum 1-month return to vote bearish (fractional, negative). */
  bear1m: number;
  /** Minimum 3-month return to vote bullish (fractional). */
  bull3m: number;
  /** Maximum 3-month return to vote bearish (fractional, negative). */
  bear3m: number;
  /** Minimum relative-to-peer outperformance to cast a bullish peer vote. */
  outperformingPeersMinRelative: number;
}

export interface SignalOverextensionGuards {
  overboughtRsiEnabled: boolean;
  rsiOverbought: number;
  rsiExtremeOverbought: number;
  sma50StretchEnabled: boolean;
  sma50StretchPct: number;
  parabolicRunupEnabled: boolean;
  parabolicRunupPct: number;
}

export interface SignalEvidenceConfig {
  /** Laplace add-smoothing for per-category Bayesian fraction. */
  categoryScoreAlpha: number;
  /** Amplifier applied after evidence scaling (conviction spread). */
  scoreSpreadGain: number;
  /** Total aligning signals at which the count component saturates. */
  evidenceSaturationCount: number;
  /** Weight of cross-category agreement in evidenceFactor. */
  evidenceAgreementWeight: number;
  /** Weight of raw aligning-signal count in evidenceFactor. */
  evidenceCountWeight: number;
  /** Minimum agreement contribution when categories conflict. */
  evidenceMixedFloor: number;
}

export interface SignalScoringConfig {
  modelVersion: string;
  /** Which scoring engine drives this config: 'v3' (legacy count-based) or 'v4' (evidence model). */
  scoringEngineVersion: ScoringEngineVersion;
  priceWindow: number;
  /** Category weights — sum to 1.0; fundamental weight is redistributed when the market has no fundamentals. */
  weights: SignalCategoryWeights;
  evidence: SignalEvidenceConfig;
  momentum: SignalMomentumThresholds;
  guards: SignalOverextensionGuards;
  /** Conservative filing-date lag (days) before a quarterly result is treated as public in as-of runs. */
  fundamentalPublicLagDays: number;
  /** Whether this market exposes exchange delivery% (NSE) — gates the delivery annotation. */
  hasDelivery: boolean;
  /** Whether this market has fundamental statements (EPS/PE/yield). */
  hasFundamentals: boolean;
  /** Whether a market-regime read is computed for this market (gates the short regime-gate). */
  hasRegime: boolean;
  /** Whether bearish/short signals are gated by the current market regime. */
  regimeGateShortsEnabled: boolean;
  /**
   * SG-8: direction cut-points (composite >= bullish → BULLISH, <= bearish → BEARISH).
   * Region-pluggable seam.  Defaults to the global 60/40 cuts for every region today;
   * backtest-fitted per-cohort values plug in here once mature outcome data exists
   * (the fitting itself is gated on historical signal-outcome data, not on this seam).
   */
  directionThresholds: { bullish: number; bearish: number };
}

/**
 * Per-region direction cut-points.  Identical to the global 60/40 default for now —
 * the seam exists so SG-8 can drop in cohort-fitted values without touching callers.
 */
function directionThresholdsForRegion(_region: string): { bullish: number; bearish: number } {
  return { bullish: DIRECTION_BULLISH_THRESHOLD, bearish: DIRECTION_BEARISH_THRESHOLD };
}

// ── Canonical India-equity scoring parameters (byte-identical to the prior consts) ──
const IN_EQUITY_WEIGHTS: SignalCategoryWeights = { technical: 0.4, momentum: 0.35, fundamental: 0.25 };

const DEFAULT_EVIDENCE: SignalEvidenceConfig = {
  categoryScoreAlpha: 1,
  scoreSpreadGain: 1.8,
  evidenceSaturationCount: 7,
  evidenceAgreementWeight: 0.45,
  evidenceCountWeight: 0.55,
  evidenceMixedFloor: 0,
};

const DEFAULT_MOMENTUM: SignalMomentumThresholds = {
  bull1m: 0.02,
  bear1m: -0.03,
  bull3m: 0.05,
  bear3m: -0.07,
  outperformingPeersMinRelative: 0.02,
};

const DEFAULT_GUARDS: SignalOverextensionGuards = {
  overboughtRsiEnabled: true,
  rsiOverbought: 70,
  rsiExtremeOverbought: 80,
  sma50StretchEnabled: true,
  sma50StretchPct: 0.15,
  parabolicRunupEnabled: true,
  parabolicRunupPct: 0.20,
};

/**
 * NSE companies file within 45 days of quarter-end (60 for annual).  Used as the
 * conservative public-availability floor for as-of/backfill runs so historical
 * signal generation never look-aheads into a not-yet-filed result.  Other markets
 * override this from their own filing regime (US 10-Q ≈ 40 days, etc.).
 */
const FUNDAMENTAL_PUBLIC_LAG_DAYS_IN = 45;
const FUNDAMENTAL_PUBLIC_LAG_DAYS_US = 40;
const FUNDAMENTAL_PUBLIC_LAG_DAYS_DEFAULT = 45;

function fundamentalPublicLagDaysForRegion(region: string): number {
  switch (region) {
    case 'IN': return FUNDAMENTAL_PUBLIC_LAG_DAYS_IN;
    case 'US': return FUNDAMENTAL_PUBLIC_LAG_DAYS_US;
    default: return FUNDAMENTAL_PUBLIC_LAG_DAYS_DEFAULT;
  }
}

/**
 * Redistribute the category weights when a market lacks a category entirely.
 *
 * Crypto has no fundamentals: leaving FUNDAMENTAL_WEIGHT (0.25) pinned to a neutral
 * 0.5 contribution structurally caps crypto scores (25% of the lean can never leave
 * 50).  Instead we zero the fundamental weight and spread it across technical /
 * momentum proportionally, so a fully-aligned crypto setup can use the full range.
 */
function weightsForCapabilities(base: SignalCategoryWeights, hasFundamentals: boolean): SignalCategoryWeights {
  if (hasFundamentals) return base;
  const retained = base.technical + base.momentum;
  if (retained <= 0) return base;
  return {
    technical: base.technical / retained,
    momentum: base.momentum / retained,
    fundamental: 0,
  };
}

/**
 * Resolve the scoring config for a market scope.  Pulls capability flags and the
 * region from the shared MarketProfile; IN-equity is byte-identical to the legacy
 * hardcoded behaviour.
 */
export function resolveSignalScoringConfig(scope: { region?: string | null; assetType?: string | null; engineVersion?: ScoringEngineVersion } = {}): SignalScoringConfig {
  const profile = resolveMarketProfile({ region: scope.region, assetType: scope.assetType });
  const caps = profile.capabilities;
  const engineVersion = scope.engineVersion ?? DEFAULT_SCORING_ENGINE_VERSION;
  return {
    modelVersion: engineVersion === 'v4' ? SIGNAL_ENGINE_MODEL_VERSION_V4 : SIGNAL_ENGINE_MODEL_VERSION,
    scoringEngineVersion: engineVersion,
    priceWindow: SIGNAL_GENERATION_PRICE_WINDOW,
    weights: weightsForCapabilities(IN_EQUITY_WEIGHTS, caps.hasFundamentals),
    evidence: DEFAULT_EVIDENCE,
    momentum: DEFAULT_MOMENTUM,
    guards: DEFAULT_GUARDS,
    fundamentalPublicLagDays: fundamentalPublicLagDaysForRegion(profile.region),
    hasDelivery: caps.hasDelivery,
    hasFundamentals: caps.hasFundamentals,
    hasRegime: caps.hasRegime,
    // Regime gate stays ON wherever a regime is actually computed; markets without a
    // regime read can never gate (the provider would return null anyway).
    regimeGateShortsEnabled: caps.hasRegime,
    directionThresholds: directionThresholdsForRegion(profile.region),
  };
}

/** The canonical India-equity scoring config (default when no scope is supplied). */
export const DEFAULT_SIGNAL_SCORING_CONFIG: SignalScoringConfig = resolveSignalScoringConfig({ region: 'IN', assetType: 'STOCK' });
