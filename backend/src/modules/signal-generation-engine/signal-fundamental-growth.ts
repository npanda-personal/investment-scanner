/**
 * signal-fundamental-growth.ts
 *
 * Phase 1 fundamental GROWTH votes (year-over-year), derived PURELY from the existing
 * multi-period Fundamental history already loaded by the generation path.  No new
 * columns, no new ingestion: revenue / eps are read off the same Fundamental records.
 *
 * CORRECTNESS — YoY, not QoQ: `records` is DESC by period_end_date, so records[1] is the
 * immediately-prior period.  For QUARTERLY data that prior period is the previous
 * quarter (seasonally noisy) — NOT a year-over-year comparable.  `yoyComparable` finds
 * the same-period_type record closest to one year before `latest` within a tolerance
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
 * The year-over-year comparable for `latest`: the record with the SAME period_type whose
 * period_end_date is closest to (latest.period_end_date − 365d) within [300, 430] days
 * before latest.  Returns null when nothing falls in the window (graceful no-vote).
 *
 * Pure: scans the array, never mutates it.  Skips `latest` itself by identity AND by
 * an end-date that is not actually before latest's.
 *
 * Field names are snake_case to match the runtime shape from formatFundamentalsResponse
 * (period_type, period_end_date as ISO string).
 */
export function yoyComparable<T extends { period_type?: unknown; period_end_date?: unknown }>(
  records: T[],
  latest: T,
): T | null {
  if (!Array.isArray(records) || !latest) return null;
  const latestEnd = toEpochMs(latest.period_end_date);
  if (latestEnd === null) return null;
  const targetMs = latestEnd - YOY_TARGET_DAYS * MS_PER_DAY;

  let best: T | null = null;
  let bestDelta = Infinity;
  for (const rec of records) {
    if (rec === latest) continue;
    if (rec.period_type !== latest.period_type) continue;
    const end = toEpochMs(rec.period_end_date);
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

// ── Phase 2: margin trend + PE self-history votes ──────────────────────────────
const MARGIN_EXPANSION_THRESHOLD = 0.03;
const PE_BELOW_OWN_HISTORY_RATIO = 0.20;
const PE_ABOVE_OWN_HISTORY_RATIO = 0.40;

export function fundamentalMarginTrendVotes(
  latest: any,
  records: any[],
): { signals: SignalItem[]; negativeSignals: SignalItem[] } {
  const signals: SignalItem[] = [];
  const negativeSignals: SignalItem[] = [];
  if (!latest || !Array.isArray(records)) return { signals, negativeSignals };

  const prior = yoyComparable(records, latest);
  if (!prior) return { signals, negativeSignals };

  const rev = num(latest.revenue);
  const ni = num(latest.net_income);
  const priorRev = num(prior.revenue);
  const priorNi = num(prior.net_income);
  if (rev === null || ni === null || priorRev === null || priorNi === null) return { signals, negativeSignals };
  if (rev <= 0 || priorRev <= 0) return { signals, negativeSignals };

  const margin = ni / rev;
  const priorMargin = priorNi / priorRev;
  const delta = margin - priorMargin;

  if (delta >= MARGIN_EXPANSION_THRESHOLD) {
    signals.push({ code: 'MARGIN_EXPANSION_YOY', label: `net margin expanded ${(delta * 100).toFixed(1)}pp YoY`, category: 'FUNDAMENTAL' });
  } else if (delta <= -MARGIN_EXPANSION_THRESHOLD) {
    negativeSignals.push({ code: 'MARGIN_CONTRACTION_YOY', label: `net margin contracted ${(Math.abs(delta) * 100).toFixed(1)}pp YoY`, category: 'FUNDAMENTAL' });
  }
  return { signals, negativeSignals };
}

export function fundamentalPeHistoryVotes(
  latest: any,
  records: any[],
): { signals: SignalItem[]; negativeSignals: SignalItem[] } {
  const signals: SignalItem[] = [];
  const negativeSignals: SignalItem[] = [];
  if (!latest || !Array.isArray(records)) return { signals, negativeSignals };

  const currentPe = num(latest.pe_ratio);
  if (currentPe === null || currentPe <= 0) return { signals, negativeSignals };

  const validPes = records.map((r) => num(r.pe_ratio)).filter((p): p is number => p !== null && p > 0);
  if (validPes.length < 3) return { signals, negativeSignals };

  validPes.sort((a, b) => a - b);
  const mid = Math.floor(validPes.length / 2);
  const median = validPes.length % 2 === 0 ? (validPes[mid - 1] + validPes[mid]) / 2 : validPes[mid];
  if (median <= 0) return { signals, negativeSignals };

  const ratio = (currentPe - median) / median;
  if (ratio <= -PE_BELOW_OWN_HISTORY_RATIO) {
    signals.push({ code: 'PE_BELOW_OWN_HISTORY', label: `P/E ${currentPe.toFixed(1)} is ${(Math.abs(ratio) * 100).toFixed(0)}% below own median (${median.toFixed(1)})`, category: 'FUNDAMENTAL' });
  } else if (ratio >= PE_ABOVE_OWN_HISTORY_RATIO) {
    negativeSignals.push({ code: 'PE_ABOVE_OWN_HISTORY', label: `P/E ${currentPe.toFixed(1)} is ${(ratio * 100).toFixed(0)}% above own median (${median.toFixed(1)})`, category: 'FUNDAMENTAL' });
  }
  return { signals, negativeSignals };
}
