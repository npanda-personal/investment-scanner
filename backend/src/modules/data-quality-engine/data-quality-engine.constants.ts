/**
 * Shared constant vocabulary for the Data Quality Engine.
 *
 * These tier-reason codes and the automation marker were previously duplicated
 * verbatim across `data-quality-engine.service.ts` (live evaluation) and
 * `data-quality-engine.repository.ts` (persisted-read reconstruction).  They now
 * live here as the single source of truth so the two derivation paths can never
 * drift apart.
 */

export const PHASE0_AUTOMATION_NOT_AUTHORIZED = 'PHASE0_AUTOMATION_NOT_AUTHORIZED';

// ── Tier reason codes ────────────────────────────────────────────────────────
export const TIER_REASON_STALE_PRICE = 'STALE_PRICE_DATA';
export const TIER_REASON_UNUSABLE_COVERAGE = 'UNUSABLE_COVERAGE';
export const TIER_REASON_SIGNAL_NOT_READY = 'SIGNAL_NOT_READY';
export const TIER_REASON_SIGNAL_LIMITED = 'SIGNAL_LIMITED';
export const TIER_REASON_THIN_LIQUIDITY = 'THIN_OR_ILLIQUID_LIQUIDITY';
export const TIER_REASON_SIGNAL_LEGACY_INELIGIBLE = 'LEGACY_SIGNAL_EVIDENCE_INELIGIBLE';
export const TIER_REASON_TRUST_CONTEXT_MISSING = 'TRUST_CONTEXT_MISSING';
export const TIER_REASON_TRUSTED_BASELINE_HISTORY_INCOMPLETE = 'TRUSTED_BASELINE_HISTORY_INCOMPLETE';
export const TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING = 'LISTING_DATE_CONFIDENCE_MISSING';
export const TIER_REASON_BACKTEST_LEGACY_INELIGIBLE = 'LEGACY_BACKTEST_EVIDENCE_INELIGIBLE';
export const TIER_REASON_CALIBRATION_LEGACY_INELIGIBLE = 'LEGACY_CALIBRATION_EVIDENCE_INELIGIBLE';
export const TIER_REASON_CALIBRATION_SIGNAL_HISTORY_MISSING = 'CALIBRATION_SIGNAL_HISTORY_MISSING';
