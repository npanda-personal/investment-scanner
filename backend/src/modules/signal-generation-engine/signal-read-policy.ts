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

import { SIGNAL_ENGINE_MODEL_VERSION_V4 } from './signal-scoring.config';

/**
 * Collapse a same-date row set to one row per instrument, preferring the ACTIVE model
 * version.  After the v3→v4 modelVersion flip the persistence key is
 * instrumentId+modelVersion+generatedDate, so a date that carries BOTH a legacy v3 row
 * and a new v4 row for the same instrument would otherwise double-count it (and inflate
 * direction counts) in the fast read path, which has no `distinct`.  Display order is
 * preserved (first-seen position kept; the active-version row supersedes in place).
 */
export function dedupeTrustedRows<T extends { instrument_id: string; modelVersion?: string | null }>(
  rows: T[],
  activeModelVersion: string = SIGNAL_ENGINE_MODEL_VERSION_V4,
): T[] {
  const byInstrument = new Map<string, T>();
  for (const row of rows) {
    const existing = byInstrument.get(row.instrument_id);
    if (!existing) { byInstrument.set(row.instrument_id, row); continue; }
    if (existing.modelVersion !== activeModelVersion && row.modelVersion === activeModelVersion) {
      byInstrument.set(row.instrument_id, row); // active version supersedes the legacy row
    }
  }
  return [...byInstrument.values()];
}
