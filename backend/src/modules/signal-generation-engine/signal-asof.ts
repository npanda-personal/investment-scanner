/**
 * signal-asof.ts
 *
 * SG-7: single seam for point-in-time (as-of) read correctness.  Previously the as-of
 * rules were scattered across the service as `Fix #2/#3/#6` patches — the fundamentals
 * public-availability filter, the staleness anchor, and the staleness comparison each
 * re-derived their own dates inline.  Centralising them here makes the point-in-time
 * contract one tested unit (so a look-ahead leak can't reappear in just one call site)
 * and keeps the rules identical across generation, confidence, and warnings.
 *
 * Pure / dependency-free.  Live runs pass asOf=undefined and are unaffected.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_STALENESS_DAYS = 5;

/**
 * Fundamentals public-availability filter for as-of / backfill runs (Fix #2).
 * A result is visible at `asOf` only when it was actually public by then:
 *   1. prefer the explicit official_result_date (board-meeting announcement date);
 *   2. otherwise period_end_date + a conservative per-market filing lag.
 * Records with neither a valid official date nor period-end are excluded (fail-closed).
 *
 * Field names are snake_case to match the runtime shape from formatFundamentalsResponse.
 * Note: official_result_date is mapped from Fundamental.officialResultDate but is not
 * currently emitted by formatFundamentalsResponse — the preference path is a no-op until
 * that formatter is updated (tracked separately in market-data-foundation).
 */
export function filterFundamentalsAsOf<T extends { official_result_date?: unknown; period_end_date?: unknown }>(
  records: T[],
  asOf: Date,
  publicLagDays: number,
): T[] {
  const asOfMs = asOf.getTime();
  const lagMs = publicLagDays * DAY_MS;
  return records.filter((record) => {
    if (record.official_result_date) {
      const officialDate = new Date(record.official_result_date as any);
      if (Number.isFinite(officialDate.getTime())) return officialDate.getTime() <= asOfMs;
    }
    const periodEndDate = record.period_end_date ? new Date(record.period_end_date as any) : null;
    if (periodEndDate === null || !Number.isFinite(periodEndDate.getTime())) return false;
    return periodEndDate.getTime() + lagMs <= asOfMs;
  });
}

/**
 * Staleness/measurement anchor: the as-of date for backfill runs, otherwise now.
 * Returns a fresh Date so callers can mutate it without corrupting the passed asOf.
 */
export function stalenessAnchor(asOf?: Date | null): Date {
  return asOf ? new Date(asOf.getTime()) : new Date();
}

/**
 * True when the latest available bar is older than `days` calendar days relative to the
 * as-of anchor (or now).  A null latest bar is treated as stale (Fix #6).  Never mutates
 * the passed asOf (stalenessAnchor returns a copy).
 */
export function isStaleAsOf(latestDate: Date | null, asOf?: Date | null, days: number = DEFAULT_STALENESS_DAYS): boolean {
  if (!latestDate) return true;
  const cutoff = stalenessAnchor(asOf);
  cutoff.setDate(cutoff.getDate() - days);
  return latestDate < cutoff;
}
