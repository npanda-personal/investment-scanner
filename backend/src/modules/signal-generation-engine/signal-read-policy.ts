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
 *   4. its signal-readiness status is READY or LIMITED.
 *
 * On (4): the READY band starts at score 75 and LIMITED spans 50-74
 * (data-quality-engine.config: readinessStatus.ready=75 / limited=50). But signal
 * ELIGIBILITY independently requires readinessScore >= 70
 * (ELIGIBILITY_POLICY.signal.minReadinessScore), so an *eligible* signal is always READY
 * (>=75) or LIMITED-at-70-to-74 — never lower (a 50-69 signal is LIMITED but ineligible,
 * caught by the eligible===true clause). Requiring READY-only was therefore STRICTER than
 * eligibility itself and silently 404'd eligible-but-LIMITED signals on the research tab.
 * We trust both READY and LIMITED: eligibility is the authority for "serveable", and the
 * READY/LIMITED distinction is surfaced to the user via reliabilityTier / confidence, not
 * by hiding the signal. (Signals whose snapshot predates persisted readiness status carry
 * no signalReadinessStatus and remain untrusted until regenerated — a separate concern.)
 */

const TRUSTED_READINESS_STATUSES = new Set(['READY', 'LIMITED']);

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
    && TRUSTED_READINESS_STATUSES.has(dataQuality.signalReadinessStatus ?? '');
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
