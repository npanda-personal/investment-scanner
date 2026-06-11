export const ELIGIBILITY_POLICY_VERSION = 'elig-v1';

// v1 preserves legacy semantics:
//   signal  — legacy DQE eligibleForSignals (signalReadinessScore >= 70 && !stale)
//             + legacy SGE mainboard-fundamentals gate folded in (requiresFundamentalsForBoards)
//   review  — MDF trusted-universe Lite subset hard cut (120 bars + fresh price + recent volume)
//   backtest — DQE eligibleForBacktesting (252 bars + fresh price)
//   calibration — DQE eligibleForCalibration (60 bars)
//   readiness  — DQE readinessStatus tiers (READY >= 75, LIMITED >= 50)
export const ELIGIBILITY_POLICY = {
  signal: {
    minReadinessScore: 70,
    maxStaleSessions: 3,
    requiresFundamentalsForBoards: ['MAINBOARD'] as const,
  },
  review: {
    minPriceBars: 120,
    requiresFreshPrice: true,
    requiresRecentVolume: true,
  },
  backtest: {
    minPriceBars: 252,
    requiresFreshPrice: true,
  },
  calibration: {
    minPriceBars: 60,
  },
  readiness: {
    readyMinScore: 75,
    limitedMinScore: 50,
  },
} as const;

export type EligibilityReasonCode =
  | 'INSUFFICIENT_BARS'
  | 'STALE_PRICE'
  | 'MISSING_FUNDAMENTALS'
  | 'MISSING_SECTOR'
  | 'MISSING_METADATA'
  | 'NO_RECENT_VOLUME'
  | 'LOW_VOLUME_COVERAGE'
  | 'ILLIQUID'
  | 'COVERAGE_UNUSABLE'
  | 'SCORE_BELOW_THRESHOLD'
  | 'NO_LATEST_PRICE';

export const ELIGIBILITY_REASON_CODES: EligibilityReasonCode[] = [
  'INSUFFICIENT_BARS',
  'STALE_PRICE',
  'MISSING_FUNDAMENTALS',
  'MISSING_SECTOR',
  'MISSING_METADATA',
  'NO_RECENT_VOLUME',
  'LOW_VOLUME_COVERAGE',
  'ILLIQUID',
  'COVERAGE_UNUSABLE',
  'SCORE_BELOW_THRESHOLD',
  'NO_LATEST_PRICE',
];

export interface EligibilityVerdicts {
  signalEligible: boolean;
  reviewEligible: boolean;
  backtestEligible: boolean;
  calibrationEligible: boolean;
  signalReasons: EligibilityReasonCode[];
  reviewReasons: EligibilityReasonCode[];
  backtestReasons: EligibilityReasonCode[];
  calibrationReasons: EligibilityReasonCode[];
}

// EligibilityFacts — per-instrument measured facts (§4.1 instrument_eligibility table)
export interface EligibilityFacts {
  priceBars: number;
  lastPriceDate: string | null;
  staleSessions: number;
  volumeCoveragePct: number;
  maxGapDays: number;
  liquidityScore: number;
  hasFundamentals: boolean;
  hasSector: boolean;
  hasIndustry: boolean;
  hasCountry: boolean;
}
