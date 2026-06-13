/**
 * signal-read-policy.ts
 *
 * Single source of truth for the "trusted read" predicate — the rule that decides
 * whether a persisted signal is eligible to be served to traders.  Previously this
 * was copy-pasted byte-for-byte in both the service and the repository, so a change
 * to "what counts as trusted" had to be made in two places or silently diverge.
 *
 * A signal is trusted only when:
 *   1. its audit status is CURRENT (full provenance: ruleset + scoring + DQ snapshot), and
 *   2. the data-quality filter was applied, and
 *   3. it was found eligible, and
 *   4. its signal-readiness status is READY.
 */

export interface TrustedReadCandidate {
  auditStatus?: 'CURRENT' | 'LEGACY_MISSING';
  dataQualityEligibility?: {
    filterApplied?: boolean;
    eligible?: boolean | null;
    signalReadinessStatus?: string;
  } | null;
}

export function isTrustedReadSignal(signal: TrustedReadCandidate): boolean {
  const dataQuality = signal.dataQualityEligibility;
  return signal.auditStatus === 'CURRENT'
    && dataQuality?.filterApplied === true
    && dataQuality.eligible === true
    && dataQuality.signalReadinessStatus === 'READY';
}
