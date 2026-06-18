/**
 * signal-fundamental-growth.ts
 *
 * Phase 1 fundamental GROWTH votes (year-over-year), derived PURELY from the existing
 * multi-period Fundamental history already loaded by the generation path.  No new
 * columns, no new ingestion: revenue / eps are read off the same Fundamental records.
 *
 * CORRECTNESS — YoY, not QoQ: `records` is DESC by periodEndDate, so records[1] is the
 * immediately-prior period.  For QUARTERLY data that prior period is the previous
 * quarter (seasonally noisy) — NOT a year-over-year comparable.  `yoyComparable` finds
 * the same-periodType record closest to one year before `latest` within a tolerance
 * window, so ANNUAL compares to the prior ANNUAL and QUARTERLY compares to the same
 * fiscal quarter a year earlier.
 *
 * PURE: no I/O, no cross-module imports — depends only on the SignalItem type.  All
 * thresholds are named constants.  Labels use research-support wording and include the
 * computed %.  ROE / debt growth are Phase 2 (require new ingestion) and are out of scope.
 */
import type { SignalItem } from './signal-generation-engine.types';

// ── Tunable thresholds (named so the algorithm hard-codes nothing) ──────────────
/** Revenue grew ≥ this fraction YoY → bullish growth vote. */
const REVENUE_GROWTH_THRESHOLD = 0.10;
/** Revenue fell ≤ −this fraction YoY → bearish decline vote. */
const REVENUE_DECLINE_THRESHOLD = -0.10;
/** EPS grew ≥ this fraction YoY → bullish growth vote. */
const EPS_GROWTH_THRESHOLD = 0.15;
/** EPS fell ≤ −this fraction YoY → bearish decline vote. */
const EPS_DECLINE_THRESHOLD = -0.20;

// ── YoY comparable matcher tolerance (days before `latest`) ─────────────────────
/** Target gap: same period one year earlier. */
const YOY_TARGET_DAYS = 365;
/** Earliest accepted gap (a record this far back still counts as ~1yr prior). */
const YOY_MIN_DAYS = 300;
/** Latest accepted gap (older than this is not the same-period comparable). */
const YOY_MAX_DAYS = 430;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Coerce a Decimal/Date/number/string into epoch-ms, or null when unusable. */
function toEpochMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value as any).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Coerce a Decimal/number/string into a finite number, or null. */
function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * The year-over-year comparable for `latest`: the record with the SAME periodType whose
 * periodEndDate is closest to (latest.periodEndDate − 365d) within [300, 430] days
 * before latest.  Returns null when nothing falls in the window (graceful no-vote).
 *
 * Pure: scans the array, never mutates it.  Skips `latest` itself by identity AND by
 * an end-date that is not actually before latest's.
 */
export function yoyComparable<T extends { periodType?: unknown; periodEndDate?: unknown }>(
  records: T[],
  latest: T,
): T | null {
  if (!Array.isArray(records) || !latest) return null;
  const latestEnd = toEpochMs(latest.periodEndDate);
  if (latestEnd === null) return null;
  const targetMs = latestEnd - YOY_TARGET_DAYS * MS_PER_DAY;

  let best: T | null = null;
  let bestDelta = Infinity;
  for (const rec of records) {
    if (rec === latest) continue;
    if (rec.periodType !== latest.periodType) continue;
    const end = toEpochMs(rec.periodEndDate);
    if (end === null) continue;
    const gapDays = (latestEnd - end) / MS_PER_DAY;
    if (gapDays < YOY_MIN_DAYS || gapDays > YOY_MAX_DAYS) continue;
    const delta = Math.abs(end - targetMs);
    if (delta < bestDelta) {
      best = rec;
      bestDelta = delta;
    }
  }
  return best;
}

/**
 * Year-over-year revenue & EPS growth votes (category FUNDAMENTAL).  Compares `latest`
 * against its YoY comparable (per `yoyComparable`).  Growth ratios are only computed
 * when the prior value is a meaningful positive base:
 *   - revenueGrowth = (rev − priorRev) / priorRev   when priorRev > 0
 *   - epsGrowth     = (eps − priorEps) / priorEps    when priorEps > 0
 *     (priorEps ≤ 0 → skip EPS growth: the ratio is sign-meaningless)
 * Missing revenue/eps on either side is handled gracefully (that metric is skipped).
 */
export function fundamentalGrowthVotes(
  latest: any,
  records: any[],
): { signals: SignalItem[]; negativeSignals: SignalItem[] } {
  const signals: SignalItem[] = [];
  const negativeSignals: SignalItem[] = [];
  if (!latest || !Array.isArray(records)) return { signals, negativeSignals };

  const prior = yoyComparable(records, latest);
  if (!prior) return { signals, negativeSignals };

  // Revenue YoY.
  const rev = num(latest.revenue);
  const priorRev = num(prior.revenue);
  if (rev !== null && priorRev !== null && priorRev > 0) {
    const growth = (rev - priorRev) / priorRev;
    if (growth >= REVENUE_GROWTH_THRESHOLD) {
      signals.push({ code: 'REVENUE_GROWTH_YOY', label: `revenue grew ${(growth * 100).toFixed(1)}% YoY`, category: 'FUNDAMENTAL' });
    } else if (growth <= REVENUE_DECLINE_THRESHOLD) {
      negativeSignals.push({ code: 'REVENUE_DECLINE_YOY', label: `revenue fell ${(Math.abs(growth) * 100).toFixed(1)}% YoY`, category: 'FUNDAMENTAL' });
    }
  }

  // EPS YoY — only meaningful when the prior EPS base is positive.
  const eps = num(latest.eps);
  const priorEps = num(prior.eps);
  if (eps !== null && priorEps !== null && priorEps > 0) {
    const growth = (eps - priorEps) / priorEps;
    if (growth >= EPS_GROWTH_THRESHOLD) {
      signals.push({ code: 'EPS_GROWTH_YOY', label: `EPS grew ${(growth * 100).toFixed(1)}% YoY`, category: 'FUNDAMENTAL' });
    } else if (growth <= EPS_DECLINE_THRESHOLD) {
      negativeSignals.push({ code: 'EPS_DECLINE_YOY', label: `EPS fell ${(Math.abs(growth) * 100).toFixed(1)}% YoY`, category: 'FUNDAMENTAL' });
    }
  }

  return { signals, negativeSignals };
}
