/**
 * Cross-period fundamentals scale-anomaly detector.
 *
 * WHY THIS EXISTS
 * ---------------
 * Some source filings carry a single fundamental fact at the wrong units/scale.
 * The canonical case (TNTELE, NSE XBRL): its QUARTERLY 2025-12-31
 * `ProfitLossForPeriod` is faithfully parsed as ~-34.6B (~-₹3,463 cr) straight
 * from the filing — but every other quarter is ~-36M, the year-to-date value is
 * ~-112B and the annual loss only ~-148M. So the -34.6B is a ~1000x SOURCE-DATA
 * error in one filing, NOT a parser bug: the XBRL fact has `decimals="-5"`, no
 * `scale` attribute, and absolute-rupee values, so `applyXbrlScale` correctly
 * leaves it unchanged.
 *
 * A per-filing magnitude threshold cannot catch this without false-positiving
 * legitimate high-share-count companies (TNTELE's implied shares ~45.6B sit below
 * real mega-caps). The robust signal is RELATIVE: compare a period's magnitude
 * against the SAME company's OTHER periods of the same periodType. A value that
 * is orders-of-magnitude out of line with its own neighbours is the fingerprint
 * of a one-filing scale error.
 *
 * NON-DESTRUCTIVE: this detector only describes findings. It never mutates or
 * nulls the stored value — callers surface the finding as a DQE warning (see
 * `formatScaleAnomalyWarning`) consistent with how the engine records other
 * data-quality observations. Research-support wording only.
 *
 * UNIT-AGNOSTIC: the test is a ratio against a robust central tendency (the
 * leave-one-out median of comparable periods), so it works in INR, USD or any
 * currency without per-region tuning.
 *
 * SCOPE / KNOWN LIMITS (deliberate, to preserve the unit-agnostic property):
 *   - UPWARD-ONLY. It fires only when a period is much LARGER than its peers
 *     (the TNTELE shape). A value mis-scaled DOWNWARD (reported in thousands
 *     while peers are in units) is not flagged, because a genuinely tiny period
 *     (a near-breakeven quarter) is common and would false-positive a symmetric
 *     test. Downward units errors are out of scope here.
 *   - NEAR-ZERO BASELINES. A real value among tiny placeholder peers (e.g. a
 *     newly-listed name whose early stored quarters are ~0 but non-zero) can
 *     read as an anomaly. Adding an absolute floor would require per-currency
 *     thresholds and break unit-agnosticism, so it is left out: the finding is a
 *     non-destructive warning, and placeholder-grade fundamentals are themselves
 *     a legitimate data-quality concern worth surfacing for research.
 */

import { REASON_FUNDAMENTAL_SCALE_ANOMALY } from './data-quality-engine.constants';

export type ScaleAnomalyField = 'revenue' | 'netIncome' | 'eps';

export interface ScaleAnomalyConfig {
  /** Which fundamental fields to scan. */
  fields: ScaleAnomalyField[];
  /**
   * Magnitude ratio of a period against the median magnitude of its comparable
   * periods that triggers a finding. Default 100 = two orders of magnitude.
   */
  ratioThreshold: number;
  /**
   * Minimum number of OTHER comparable periods (same periodType) required before
   * a baseline is considered robust enough to judge a period against. Below this,
   * the field/period is left unjudged so shallow coverage never false-positives.
   */
  minPeerPeriods: number;
}

export const DEFAULT_SCALE_ANOMALY_CONFIG: ScaleAnomalyConfig = {
  fields: ['revenue', 'netIncome', 'eps'],
  ratioThreshold: 100,
  minPeerPeriods: 3,
};

/** A single non-destructive cross-period scale-anomaly finding. */
export interface FundamentalScaleAnomaly {
  field: ScaleAnomalyField;
  /** periodType the period was compared within (e.g. 'QUARTERLY'). */
  periodType: string;
  /** Period end date, normalized to YYYY-MM-DD. */
  periodEndDate: string;
  /** The raw stored (signed) value — retained unchanged. */
  value: number;
  /** |value| — the magnitude actually compared. */
  magnitude: number;
  /** Number of comparable periods the baseline was built from. */
  peerCount: number;
  /** Median magnitude of the comparable periods (the robust baseline). */
  peerMedianMagnitude: number;
  /** magnitude / peerMedianMagnitude. */
  ratio: number;
  /**
   * MAD-based robust z-score of the magnitude within its comparable group.
   * Infinity when peer dispersion is zero (every neighbour identical). Surfaced
   * as supporting evidence; the trigger is the ratio test.
   */
  robustZ: number;
  /** Source of the flagged record, when known. */
  source: string | null;
  /** Stable machine code — see constants `REASON_FUNDAMENTAL_SCALE_ANOMALY`. */
  reasonCode: typeof REASON_FUNDAMENTAL_SCALE_ANOMALY;
}

const REASON_CODE = REASON_FUNDAMENTAL_SCALE_ANOMALY;

// Field → candidate record keys, accepting both the snake_case shape DQE sees
// from the serving formatter (`net_income`) and a camelCase fallback.
const FIELD_KEYS: Record<ScaleAnomalyField, string[]> = {
  revenue: ['revenue'],
  netIncome: ['net_income', 'netIncome'],
  eps: ['eps'],
};

function readNumber(record: any, keys: string[]): number | null {
  for (const key of keys) {
    const raw = record?.[key];
    if (raw === null || raw === undefined) continue;
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function readPeriodType(record: any): string {
  const raw = record?.period_type ?? record?.periodType;
  return String(raw ?? '').trim().toUpperCase();
}

function readPeriodEndDate(record: any): string | null {
  const raw = record?.period_end_date ?? record?.periodEndDate;
  if (raw == null) return null;
  const iso = raw instanceof Date ? raw.toISOString() : String(raw);
  return iso.slice(0, 10);
}

function readSource(record: any): string | null {
  const raw = record?.source;
  return raw == null ? null : String(raw);
}

/**
 * Optional consolidation/cumulative qualifier used to avoid comparing
 * structurally different periods (e.g. consolidated vs standalone) inside the
 * same periodType. Returns null when the flags are absent/null (legacy rows).
 */
function readQualifier(record: any): string | null {
  const consolidated = record?.is_consolidated ?? record?.isConsolidated;
  const cumulative = record?.is_cumulative ?? record?.isCumulative;
  if (consolidated == null && cumulative == null) return null;
  return `c=${consolidated ?? '?'}|m=${cumulative ?? '?'}`;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

interface PeriodPoint {
  value: number;
  magnitude: number;
  periodEndDate: string;
  source: string | null;
}

/**
 * Within one periodType, decide whether the consolidation/cumulative qualifier
 * can be used to sub-group. It is only safe to split when EVERY record carries a
 * non-null qualifier; if any is null (the common legacy case) the flags can't
 * reliably separate periods, so the whole periodType is treated as one group.
 */
function groupKeysFor(records: any[], periodType: string): (record: any) => string {
  const qualifiers = records.map(readQualifier);
  const uniformlyPresent = qualifiers.length > 0 && qualifiers.every((q) => q !== null);
  if (!uniformlyPresent) return () => periodType;
  return (record: any) => `${periodType}|${readQualifier(record)}`;
}

/**
 * Detect cross-period scale anomalies for one company's fundamentals records.
 *
 * Records are expected in the DQE serving shape (snake_case: `revenue`,
 * `net_income`, `eps`, `period_type`, `period_end_date`, `source`); camelCase is
 * tolerated. Comparison is leave-one-out: each period's magnitude is tested
 * against the median magnitude of the OTHER comparable periods, so the outlier
 * never inflates its own baseline.
 */
export function detectFundamentalScaleAnomalies(
  records: any[],
  config: ScaleAnomalyConfig = DEFAULT_SCALE_ANOMALY_CONFIG,
): FundamentalScaleAnomaly[] {
  if (!Array.isArray(records) || records.length === 0) return [];
  const findings: FundamentalScaleAnomaly[] = [];

  for (const field of config.fields) {
    const keys = FIELD_KEYS[field];

    // Bucket value-bearing records by periodType, then refine by the optional
    // consolidation qualifier when it is uniformly present.
    const byPeriodType = new Map<string, any[]>();
    for (const record of records) {
      const periodType = readPeriodType(record);
      if (!periodType) continue;
      if (readNumber(record, keys) === null) continue;
      if (readPeriodEndDate(record) === null) continue;
      const bucket = byPeriodType.get(periodType) ?? [];
      bucket.push(record);
      byPeriodType.set(periodType, bucket);
    }

    for (const [periodType, periodRecords] of byPeriodType) {
      const keyFor = groupKeysFor(periodRecords, periodType);
      const groups = new Map<string, PeriodPoint[]>();
      for (const record of periodRecords) {
        const value = readNumber(record, keys) as number;
        const point: PeriodPoint = {
          value,
          magnitude: Math.abs(value),
          periodEndDate: readPeriodEndDate(record) as string,
          source: readSource(record),
        };
        const groupKey = keyFor(record);
        const bucket = groups.get(groupKey) ?? [];
        bucket.push(point);
        groups.set(groupKey, bucket);
      }

      for (const points of groups.values()) {
        // Need at least minPeerPeriods OTHER periods → group size > minPeerPeriods.
        if (points.length <= config.minPeerPeriods) continue;

        for (let i = 0; i < points.length; i++) {
          const candidate = points[i];
          const peerMagnitudes = points.filter((_, j) => j !== i).map((p) => p.magnitude);
          if (peerMagnitudes.length < config.minPeerPeriods) continue;

          const peerMedianMagnitude = median(peerMagnitudes);
          // No usable baseline when the neighbours' median magnitude is zero.
          if (peerMedianMagnitude <= 0) continue;

          const ratio = candidate.magnitude / peerMedianMagnitude;
          if (ratio < config.ratioThreshold) continue;

          const deviations = peerMagnitudes.map((m) => Math.abs(m - peerMedianMagnitude));
          const mad = median(deviations);
          const robustZ = mad > 0 ? (0.6745 * (candidate.magnitude - peerMedianMagnitude)) / mad : Infinity;

          findings.push({
            field,
            periodType,
            periodEndDate: candidate.periodEndDate,
            value: candidate.value,
            magnitude: candidate.magnitude,
            peerCount: peerMagnitudes.length,
            peerMedianMagnitude,
            ratio,
            robustZ,
            source: candidate.source,
            reasonCode: REASON_CODE,
          });
        }
      }
    }
  }

  return findings;
}

const NUMBER_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/**
 * Render a finding as a research-support warning string for DQE surfacing.
 * Non-advisory, non-destructive wording — states the observation, not a verdict
 * on the company.
 */
export function formatScaleAnomalyWarning(anomaly: FundamentalScaleAnomaly): string {
  const ratio = NUMBER_FORMAT.format(Math.round(anomaly.ratio));
  const value = NUMBER_FORMAT.format(anomaly.value);
  const peerMedian = NUMBER_FORMAT.format(anomaly.peerMedianMagnitude);
  return (
    `Fundamentals scale anomaly: ${anomaly.periodType} ${anomaly.field} for period ` +
    `${anomaly.periodEndDate} is ~${ratio}x the median magnitude of ${anomaly.peerCount} ` +
    `comparable periods (value ${value} vs peer median ${peerMedian}); possible ` +
    `source-filing units/scale error — value retained unchanged, flagged for review.`
  );
}
