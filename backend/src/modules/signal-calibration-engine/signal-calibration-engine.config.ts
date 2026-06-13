import type { QualityHorizon } from '../signal-quality-lab';

/**
 * Signal-Calibration runtime configuration.
 *
 * Everything tunable about the calibration engine lives here as a single
 * injectable {@link CalibrationPolicy} object instead of scattered module-level
 * `const`s. This makes the engine:
 *   - testable     — a synthetic policy can be passed in unit tests;
 *   - configurable — per-region / per-asset-type policies can be resolved at
 *                    runtime (e.g. crypto vs IN-equity vs US-equity have very
 *                    different liquidity/volatility, so identical sample
 *                    minimums and adjustment deltas would mis-calibrate them);
 *   - future-proof — new markets become DATA (a policy override entry) rather
 *                    than edits to the scoring code.
 *
 * The DEFAULT policy below reproduces the engine's historical behaviour exactly,
 * so existing callers and the test corpus are unaffected until an override is
 * registered for a specific scope.
 */

/** Minimum sample thresholds that gate a confidence tier. */
export interface SampleThreshold {
  overall: number;
  group: number;
}

/** Win-rate / forward-return cut-points + deltas for a quality-metric adjuster. */
export interface QualityCutoff {
  /** winRate at or above this (with positive forward return) earns a boost. */
  boostWinRate: number;
  /** winRate at or below this (or negative forward return) earns a penalty. */
  penaltyWinRate: number;
  boostDelta: number;
  penaltyDelta: number;
}

/** Directional context adjustment deltas (regime / sector / smart-money). */
export interface ContextDeltas {
  regime: {
    bullishAligned: number;   // bullish + RISK_ON
    bullishConflict: number;  // bullish + RISK_OFF
    bearishAligned: number;   // bearish + RISK_OFF
    bearishConflict: number;  // bearish + RISK_ON
  };
  sectorLeadership: {
    bullishAligned: number;   // bullish + LEADING/IMPROVING
    bullishConflict: number;  // bullish + LAGGING/WEAKENING
    bearishAligned: number;   // bearish + LAGGING
  };
  smartMoney: {
    bullishAligned: number;   // bullish + ACCUMULATION
    bullishConflict: number;  // bullish + DISTRIBUTION
    bearishAligned: number;   // bearish + DISTRIBUTION
    bearishConflict: number;  // bearish + ACCUMULATION
  };
  dataQuality: {
    missingLatestPrice: number;
    insufficientHistory: number;
    missingFundamentals: number;
  };
  persistedDataQuality: {
    coverageUnusable: number;
    coveragePoor: number;
    readinessNotReady: number;
    readinessLimited: number;
    liquidityIlliquid: number;
    liquidityUnknown: number;
  };
  noise: {
    failed: number;   // issue type includes "FAILED"
    other: number;
  };
}

export interface CalibrationPolicy {
  /** Calibration model identity (persisted + surfaced via /model). */
  calibrationModelVersion: string;
  /**
   * Which signal-generation model version's outcomes calibration reads.
   * Scopes quality/outcome metrics so v1/v2/v3 corpus rows are never blended.
   * Must stay in sync with the signal-generation-engine model version.
   */
  signalModelVersion: string;

  horizons: {
    supported: QualityHorizon[];
    default: QualityHorizon;
  };

  samples: {
    /** Minimum overall evaluated samples before calibration is trusted. */
    minOverall: number;
    /** Minimum per-group samples before a group adjustment may fire. */
    minGroup: number;
    /**
     * Minimum mature persisted signal_outcomes rows before the persisted path
     * is preferred over on-demand recomputation. Set comfortably above
     * minOverall so persisted data is statistically meaningful when trusted.
     */
    minPersisted: number;
  };

  /** Sample thresholds per confidence tier. */
  confidenceThresholds: {
    HIGH: SampleThreshold;
    MEDIUM: SampleThreshold;
    LOW: SampleThreshold;
  };

  /** Maximum per-adjustment delta allowed at each confidence tier. */
  adjustmentCaps: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    INSUFFICIENT_SAMPLE: number;
  };

  /** Absolute cap on the summed score delta from all adjustments. */
  totalDeltaCap: number;

  /** Max concurrent per-signal calibrations within a batch run. */
  runConcurrency: number;

  /** Quality-metric cut-points + deltas. */
  qualityCutoffs: {
    /** Per-triggered-signal-type metric. */
    signalType: QualityCutoff;
    /** Score-bucket and sector metrics (share the same cut-points). */
    group: QualityCutoff;
  };

  /** Directional / data-quality / noise context deltas. */
  contextDeltas: ContextDeltas;
}

/**
 * DEFAULT policy — reproduces historical engine behaviour EXACTLY.
 * Do not change these numbers to alter behaviour for a single market; register
 * a scoped override in {@link CALIBRATION_POLICY_OVERRIDES} instead.
 */
export const DEFAULT_CALIBRATION_POLICY: CalibrationPolicy = {
  calibrationModelVersion: 'signal-calibration-v2',
  signalModelVersion: 'signal-engine-v3',
  horizons: {
    supported: ['1D', '5D', '10D', '20D', '60D'],
    default: '20D',
  },
  samples: {
    minOverall: 50,
    minGroup: 20,
    minPersisted: 200,
  },
  confidenceThresholds: {
    HIGH: { overall: 200, group: 50 },
    MEDIUM: { overall: 100, group: 30 },
    LOW: { overall: 50, group: 20 },
  },
  adjustmentCaps: {
    HIGH: 10,
    MEDIUM: 6,
    LOW: 3,
    INSUFFICIENT_SAMPLE: 1,
  },
  totalDeltaCap: 25,
  runConcurrency: 4,
  qualityCutoffs: {
    signalType: { boostWinRate: 0.58, penaltyWinRate: 0.45, boostDelta: 4, penaltyDelta: -5 },
    group: { boostWinRate: 0.6, penaltyWinRate: 0.45, boostDelta: 3, penaltyDelta: -4 },
  },
  contextDeltas: {
    regime: { bullishAligned: 3, bullishConflict: -5, bearishAligned: 3, bearishConflict: -4 },
    sectorLeadership: { bullishAligned: 3, bullishConflict: -4, bearishAligned: 3 },
    smartMoney: { bullishAligned: 4, bullishConflict: -6, bearishAligned: 4, bearishConflict: -5 },
    dataQuality: { missingLatestPrice: -5, insufficientHistory: -4, missingFundamentals: -4 },
    persistedDataQuality: {
      coverageUnusable: -10,
      coveragePoor: -6,
      readinessNotReady: -10,
      readinessLimited: -4,
      liquidityIlliquid: -6,
      liquidityUnknown: -3,
    },
    noise: { failed: -6, other: -3 },
  },
};

/** Scope used to resolve a per-market policy. */
export interface CalibrationScope {
  region?: string;
  assetType?: string;
}

/**
 * Per-scope policy overrides, keyed by `${REGION}:${ASSET_TYPE}` (uppercased).
 * Empty by default — every scope resolves to {@link DEFAULT_CALIBRATION_POLICY}.
 * Add entries here (or load them from config/env at boot) to tune calibration
 * for a specific market without touching scoring code. Example:
 *
 *   'GLOBAL:CRYPTO': { samples: { minPersisted: 400 }, ... }
 *
 * Overrides are shallow-merged onto the default at the top level and one level
 * deep for nested groups, so a partial override only changes the keys it names.
 */
export const CALIBRATION_POLICY_OVERRIDES: Record<string, DeepPartial<CalibrationPolicy>> = {};

/** Default market scope when a request omits region / asset type. */
export const DEFAULT_REGION = 'IN';
export const DEFAULT_ASSET_TYPE = 'STOCK';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function scopeKey(scope: CalibrationScope): string {
  const region = String(scope.region || '').trim().toUpperCase() || 'GLOBAL';
  const assetType = String(scope.assetType || '').trim().toUpperCase() || 'ALL';
  return `${region}:${assetType}`;
}

/** Two-level shallow merge of a partial override onto a base policy. */
function mergePolicy(base: CalibrationPolicy, override: DeepPartial<CalibrationPolicy>): CalibrationPolicy {
  const merged: any = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = { ...(base as any)[key], ...value };
    } else if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged as CalibrationPolicy;
}

/**
 * Resolve the calibration policy for a market scope. Returns the default policy
 * when no override is registered for the scope. This is the single injection
 * point used by the engine; swap/extend {@link CALIBRATION_POLICY_OVERRIDES} to
 * configure per-market behaviour at runtime.
 */
export function resolveCalibrationPolicy(scope: CalibrationScope = {}): CalibrationPolicy {
  const override = CALIBRATION_POLICY_OVERRIDES[scopeKey(scope)]
    ?? CALIBRATION_POLICY_OVERRIDES[`${String(scope.region || '').trim().toUpperCase() || 'GLOBAL'}:ALL`];
  return override ? mergePolicy(DEFAULT_CALIBRATION_POLICY, override) : DEFAULT_CALIBRATION_POLICY;
}
