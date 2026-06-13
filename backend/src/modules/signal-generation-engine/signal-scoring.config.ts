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

export const SIGNAL_ENGINE_MODEL_VERSION = 'signal-engine-v3';

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
export function resolveSignalScoringConfig(scope: { region?: string | null; assetType?: string | null } = {}): SignalScoringConfig {
  const profile = resolveMarketProfile({ region: scope.region, assetType: scope.assetType });
  const caps = profile.capabilities;
  return {
    modelVersion: SIGNAL_ENGINE_MODEL_VERSION,
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
  };
}

/** The canonical India-equity scoring config (default when no scope is supplied). */
export const DEFAULT_SIGNAL_SCORING_CONFIG: SignalScoringConfig = resolveSignalScoringConfig({ region: 'IN', assetType: 'STOCK' });
