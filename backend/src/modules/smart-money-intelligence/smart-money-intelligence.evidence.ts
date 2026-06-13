import type {
  SmartMoneyDataStatus,
  SmartMoneyDataThroughBasis,
  SmartMoneyEvidence,
  SmartMoneyEvidenceReasonCode,
  SmartMoneyEvidenceSource,
  SmartMoneyEvidenceStatus,
  SmartMoneyFreshnessStatus,
  SmartMoneyRange,
} from './smart-money-intelligence.types';

/**
 * Shared evidence-envelope assembly + date helpers. The on-the-fly path (service)
 * and the persisted-read path (repository) each compute their own source-specific
 * status and reason codes, then call {@link buildEvidenceEnvelope} so the envelope
 * SHAPE and the freshness/summary wording live in exactly one place.
 */

/** Parse an arbitrary value to a `YYYY-MM-DD` string, or null if unparseable. */
export function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

/** Parse an arbitrary value to a valid Date, or null. */
export function validDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

/** UTC-midnight boundary Date for a `YYYY-MM-DD` snapshot date (the "as of" boundary). */
export function snapshotBoundary(snapshotDate: string | null): Date | null {
  if (!snapshotDate) return null;
  const date = new Date(`${snapshotDate}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** A snapshot is STALE if it was computed strictly before its own data boundary. */
export function computeFreshnessStatus(updatedAt: Date | null, boundary: Date | null): SmartMoneyFreshnessStatus {
  if (!boundary || !updatedAt) return 'UNKNOWN';
  return updatedAt.getTime() + 1 < boundary.getTime() ? 'STALE' : 'CURRENT';
}

/** Reason code that matches a freshness status (or null for UNKNOWN). */
export function freshnessReasonCode(status: SmartMoneyFreshnessStatus): SmartMoneyEvidenceReasonCode | null {
  if (status === 'STALE') return 'SNAPSHOT_STALE';
  if (status === 'CURRENT') return 'SNAPSHOT_CURRENT';
  return null;
}

export interface EvidenceEnvelopeInput {
  source: SmartMoneyEvidenceSource;
  downstreamSafe: boolean;
  persistedAvailableAtRequestStart: boolean;
  requestedRange: SmartMoneyRange;
  snapshotDate: string | null;
  dataThroughDate: string | null;
  dataThroughBasis: SmartMoneyDataThroughBasis;
  freshnessStatus: SmartMoneyFreshnessStatus;
  ownershipDataStatus: SmartMoneyDataStatus;
  evidenceStatus: SmartMoneyEvidenceStatus;
  reasonCodes: SmartMoneyEvidenceReasonCode[];
}

export function buildEvidenceEnvelope(input: EvidenceEnvelopeInput): SmartMoneyEvidence {
  const ownershipMissing = input.ownershipDataStatus === 'MISSING';
  const provenanceSummary = input.source === 'PERSISTED_SNAPSHOT'
    ? 'Persisted smart-money snapshot was used.'
    : 'On-demand derived smart-money context was calculated for detail inspection and is not downstream-safe.';
  const ownershipSummary = ownershipMissing
    ? 'Insider and institutional ownership evidence is unavailable; treat this as partial price-volume evidence.'
    : 'Ownership evidence is present.';
  return {
    evidenceStatus: input.evidenceStatus,
    freshnessStatus: input.freshnessStatus,
    provenance: {
      source: input.source,
      persistedSnapshotAvailableAtRequestStart: input.persistedAvailableAtRequestStart,
      downstreamSafe: input.downstreamSafe,
      reasonSummary: provenanceSummary,
    },
    coverage: {
      requestedRange: input.requestedRange,
      snapshotDate: input.snapshotDate,
      dataThroughDate: input.dataThroughDate,
      dataThroughBasis: input.dataThroughBasis,
      rangeLabel: `${input.requestedRange} price-volume window`,
    },
    ownershipTrust: {
      status: ownershipMissing ? 'PARTIAL_OWNERSHIP_GAP' : 'COMPLETE',
      ownershipDataStatus: input.ownershipDataStatus,
      reasonSummary: ownershipSummary,
    },
    reasonCodes: [...new Set(input.reasonCodes)],
    reasonSummary: `${provenanceSummary} ${ownershipSummary}`,
  };
}
