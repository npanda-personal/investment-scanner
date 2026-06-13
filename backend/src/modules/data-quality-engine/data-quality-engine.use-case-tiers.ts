/**
 * Single source of truth for use-case tier derivation.
 *
 * The READY/LIMITED/BLOCKED decision tree for dailyReview / signal / backtest /
 * calibration / automation was previously implemented twice — once in the
 * service (from live booleans) and once in the repository (reconstructed from
 * persisted strings). The two could silently drift. This module owns the rules;
 * both callers feed it a structured input.
 *
 * Note: signal-history is intentionally NOT a calibration gate here. Signal
 * history is produced by a DOWNSTREAM module (signal-generation consumes data
 * quality, not the reverse), so gating calibration data-readiness on it was an
 * inverted dependency that, combined with the never-injected signal service,
 * left calibration permanently blocked. Calibration readiness is driven by
 * price-history depth via `eligibleForCalibration`.
 */
import type {
  CoverageStatus,
  DataQualityUseCaseTier,
  DataQualityUseCaseTiers,
  LiquidityStatus,
  SignalReadinessStatus,
} from './data-quality-engine.types';
import {
  PHASE0_AUTOMATION_NOT_AUTHORIZED,
  TIER_REASON_BACKTEST_LEGACY_INELIGIBLE,
  TIER_REASON_CALIBRATION_LEGACY_INELIGIBLE,
  TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING,
  TIER_REASON_SIGNAL_LEGACY_INELIGIBLE,
  TIER_REASON_SIGNAL_LIMITED,
  TIER_REASON_SIGNAL_NOT_READY,
  TIER_REASON_STALE_PRICE,
  TIER_REASON_THIN_LIQUIDITY,
  TIER_REASON_TRUST_CONTEXT_MISSING,
  TIER_REASON_TRUSTED_BASELINE_HISTORY_INCOMPLETE,
  TIER_REASON_UNUSABLE_COVERAGE,
} from './data-quality-engine.constants';

export interface UseCaseTierInput {
  stale: boolean;
  coverageStatus: CoverageStatus;
  signalReadinessStatus: SignalReadinessStatus;
  liquidityStatus: LiquidityStatus;
  eligibleForSignals: boolean;
  eligibleForBacktesting: boolean;
  eligibleForCalibration: boolean;
  requiredHistoryStatus: string | null;
  listingDateStatus: string | null;
}

const ready = (): DataQualityUseCaseTier => ({ status: 'READY', reasons: [] });

export function deriveUseCaseTiers(input: UseCaseTierInput): DataQualityUseCaseTiers {
  const trustContextMissing = !input.requiredHistoryStatus;
  const historyIncomplete = Boolean(input.requiredHistoryStatus && input.requiredHistoryStatus !== 'COMPLETE');
  const listingDateConfidenceMissing =
    !input.listingDateStatus || input.listingDateStatus === 'MISSING_USED_15_YEAR_TARGET';
  const thinOrIlliquid = input.liquidityStatus === 'THIN' || input.liquidityStatus === 'ILLIQUID';

  const trustReasons: string[] = [];
  if (trustContextMissing) trustReasons.push(TIER_REASON_TRUST_CONTEXT_MISSING);
  if (historyIncomplete) trustReasons.push(TIER_REASON_TRUSTED_BASELINE_HISTORY_INCOMPLETE);
  if (listingDateConfidenceMissing) trustReasons.push(TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING);

  // ── daily review ──────────────────────────────────────────────────────────
  const dailyReviewLimitedReasons = [...trustReasons];
  if (input.signalReadinessStatus === 'NOT_READY') dailyReviewLimitedReasons.push(TIER_REASON_SIGNAL_NOT_READY);
  if (input.signalReadinessStatus === 'LIMITED') dailyReviewLimitedReasons.push(TIER_REASON_SIGNAL_LIMITED);
  if (thinOrIlliquid) dailyReviewLimitedReasons.push(TIER_REASON_THIN_LIQUIDITY);

  const dailyReview: DataQualityUseCaseTier = input.stale
    ? { status: 'BLOCKED', reasons: [TIER_REASON_STALE_PRICE] }
    : input.coverageStatus === 'UNUSABLE'
      ? { status: 'BLOCKED', reasons: [TIER_REASON_UNUSABLE_COVERAGE] }
      : dailyReviewLimitedReasons.length > 0
        ? { status: 'LIMITED', reasons: dailyReviewLimitedReasons }
        : ready();

  // ── signal ────────────────────────────────────────────────────────────────
  const signalLimitedReasons = [...trustReasons];
  if (input.signalReadinessStatus === 'LIMITED') signalLimitedReasons.push(TIER_REASON_SIGNAL_LIMITED);
  if (!input.eligibleForSignals) signalLimitedReasons.push(TIER_REASON_SIGNAL_LEGACY_INELIGIBLE);
  if (thinOrIlliquid) signalLimitedReasons.push(TIER_REASON_THIN_LIQUIDITY);

  const signal: DataQualityUseCaseTier =
    input.stale || input.signalReadinessStatus === 'NOT_READY'
      ? { status: 'BLOCKED', reasons: [input.stale ? TIER_REASON_STALE_PRICE : TIER_REASON_SIGNAL_NOT_READY] }
      : signalLimitedReasons.length > 0
        ? { status: 'LIMITED', reasons: signalLimitedReasons }
        : ready();

  // ── backtest ──────────────────────────────────────────────────────────────
  const backtestBlockers = [...trustReasons];
  if (!input.eligibleForBacktesting) backtestBlockers.push(TIER_REASON_BACKTEST_LEGACY_INELIGIBLE);
  const backtest: DataQualityUseCaseTier =
    backtestBlockers.length > 0
      ? { status: 'BLOCKED', reasons: backtestBlockers }
      : signal.status === 'LIMITED' || input.liquidityStatus === 'THIN'
        ? { status: 'LIMITED', reasons: [signal.status === 'LIMITED' ? TIER_REASON_SIGNAL_LIMITED : TIER_REASON_THIN_LIQUIDITY] }
        : ready();

  // ── calibration ───────────────────────────────────────────────────────────
  const calibrationBlockers = [...trustReasons];
  if (!input.eligibleForCalibration) calibrationBlockers.push(TIER_REASON_CALIBRATION_LEGACY_INELIGIBLE);
  const calibration: DataQualityUseCaseTier =
    calibrationBlockers.length > 0
      ? { status: 'BLOCKED', reasons: calibrationBlockers }
      : signal.status === 'LIMITED'
        ? { status: 'LIMITED', reasons: [TIER_REASON_SIGNAL_LIMITED] }
        : ready();

  return {
    dailyReview,
    signal,
    backtest,
    calibration,
    automation: { status: 'BLOCKED', reasons: [PHASE0_AUTOMATION_NOT_AUTHORIZED] },
  };
}
