/**
 * Read-path shaping + normalization helpers for Earnings Intelligence.
 *
 * All functions are pure — no class state, no I/O.  The response-assembly,
 * provenance summary, freshness roll-up, refresh-status, and scope/batch
 * normalization helpers all live here so the service class stays focused on
 * orchestration.
 *
 * `normalizeScope` takes the region-config resolver as an explicit parameter
 * (instead of reaching into `this.regionConfig`) so it lives here with the
 * other normalization helpers.
 */
import type {
  EarningsFreshness,
  EarningsIntelligenceQuery,
  EarningsIntelligenceRefreshResult,
  EarningsProvenanceSummary,
  EarningsSnapshotDto,
} from './earnings-intelligence.types';
import {
  DEFAULT_EARNINGS_REGION,
  normalizeRegionCode,
  type EarningsRegionConfigResolver,
} from './earnings-intelligence.region-config';

// ── Display-row collection ────────────────────────────────────────────────────

/**
 * Unique set (by object reference) of the rows actually returned to the client:
 * the `items` list plus every category bucket.  Used to bound the signal join to
 * the page rather than the full fetched row set.
 */
export function collectDisplayRows(
  items: EarningsSnapshotDto[],
  categories: Record<string, EarningsSnapshotDto[]>,
): EarningsSnapshotDto[] {
  const seen = new Set<EarningsSnapshotDto>(items);
  for (const bucket of Object.values(categories)) {
    for (const row of bucket) seen.add(row);
  }
  return [...seen];
}

// ── Signal summary mapping ────────────────────────────────────────────────────

import type { SignalResultDto } from '../signal-generation-engine';
import type { EarningsSignalSummary } from './earnings-intelligence.types';

export function toSignalSummary(signal: SignalResultDto): EarningsSignalSummary {
  return {
    direction: signal.direction,
    // Prefer the calibrated score (the trusted-read score) when present.
    score: signal.calibratedScore ?? signal.score,
    confidence: signal.confidence,
    lifecycleState: signal.lifecycleState ?? null,
    triggerPrice: signal.triggerPrice ?? null,
    generatedDate: signal.generatedDate ?? signal.generated_at ?? null,
  };
}

// ── Response warnings + provenance ───────────────────────────────────────────

export function responseWarnings(rows: EarningsSnapshotDto[], truncated: boolean): string[] {
  const warnings: string[] = [];
  const summary = provenanceSummary(rows);
  if (truncated) warnings.push('Snapshot read was truncated at the backend safety limit.');
  if (summary.rowCount > 0 && summary.officialCalendarRows === 0) {
    warnings.push('OFFICIAL_CALENDAR_NOT_AVAILABLE');
  }
  if (summary.tbaDatesRows > 0) {
    warnings.push(
      `${summary.tbaDatesRows} instrument(s) do not yet have an official result date announcement (Date TBA).`,
    );
  }
  if (summary.resultDateSourceCounts.PERIOD_END_DATE_FALLBACK > 0) {
    warnings.push(
      'Some result dates use the fiscal period end as a fallback and are not earnings announcement dates.',
    );
  }
  if (summary.resultDateSourceCounts.VALIDATED_AT_FALLBACK > 0) {
    warnings.push(
      'Some result dates use validation timestamps as a fallback and are not earnings announcement dates.',
    );
  }
  if (summary.warningCounts.RESULT_REACTION_REQUIRES_OFFICIAL_RESULT_DATE > 0) {
    warnings.push(
      'Result reaction history requires official earnings dates and is limited for fallback-date rows.',
    );
  }
  return [...new Set(warnings)];
}

export function provenanceSummary(rows: EarningsSnapshotDto[]): EarningsProvenanceSummary {
  const resultDateSourceCounts: Record<string, number> = {};
  const warningCounts: Record<string, number> = {};
  for (const row of rows) {
    resultDateSourceCounts[row.resultDateSource || 'UNKNOWN'] =
      (resultDateSourceCounts[row.resultDateSource || 'UNKNOWN'] || 0) + 1;
    for (const warning of row.warnings || []) {
      warningCounts[warning] = (warningCounts[warning] || 0) + 1;
    }
  }
  return {
    rowCount: rows.length,
    resultDateSourceCounts,
    warningCounts,
    officialCalendarRows: resultDateSourceCounts.OFFICIAL_CALENDAR || 0,
    // tbaDatesRows counts both new DATE_TBA rows and legacy
    // ESTIMATED_FROM_PERIOD_CADENCE rows not yet re-materialised.
    tbaDatesRows:
      (resultDateSourceCounts.DATE_TBA || 0) +
      (resultDateSourceCounts.ESTIMATED_FROM_PERIOD_CADENCE || 0),
    estimatedRows: resultDateSourceCounts.ESTIMATED_FROM_PERIOD_CADENCE || 0,
    fallbackRows:
      (resultDateSourceCounts.PERIOD_END_DATE_FALLBACK || 0) +
      (resultDateSourceCounts.VALIDATED_AT_FALLBACK || 0),
    unknownRows: resultDateSourceCounts.UNKNOWN || 0,
  };
}

export function responseFreshness(rows: EarningsSnapshotDto[]): EarningsFreshness {
  if (rows.some((row) => row.freshness === 'FRESH')) return 'FRESH';
  if (rows.some((row) => row.freshness === 'PARTIAL')) return 'PARTIAL';
  if (rows.some((row) => row.freshness === 'STALE')) return 'STALE';
  return 'MISSING';
}

export function refreshStatus(
  totalCount: number,
  processedCount: number,
  succeededCount: number,
  failedCount: number,
  skippedCount: number,
): EarningsIntelligenceRefreshResult['status'] {
  if (totalCount === 0 || processedCount === 0) return 'SKIPPED';
  if (failedCount > 0 && succeededCount === 0) return 'FAILED';
  if (failedCount > 0 || skippedCount > 0 || processedCount < totalCount) return 'PARTIAL';
  return 'COMPLETED';
}

// ── Normalization helpers ─────────────────────────────────────────────────────

export function normalizeBatchSize(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 25;
  return Math.max(1, Math.min(parsed, 100));
}

export function normalizeLimit(value: number): number {
  return Math.max(1, Math.min(Math.floor(Number(value) || 25), 100));
}

export function normalizeText(value: unknown, fallback: string): string {
  const text = String(value ?? fallback).trim();
  return text.length > 0 ? text : fallback;
}

export function normalizeIds(values: string[] | undefined): string[] | undefined {
  const ids = [
    ...new Set(
      (values || [])
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  ];
  return ids.length > 0 ? ids : undefined;
}

export function normalizeScope(
  query: EarningsIntelligenceQuery,
  regionConfig: EarningsRegionConfigResolver,
): EarningsIntelligenceQuery {
  const region = normalizeRegionCode(query.region ?? DEFAULT_EARNINGS_REGION);
  const assetType = normalizeText(query.assetType, regionConfig(region).defaultAssetType).toUpperCase();
  return {
    region,
    assetType,
    limit: normalizeLimit(query.limit),
    ...(query.category ? { category: query.category } : {}),
  };
}
