/**
 * signal-fundamentals-scale-guard.ts
 *
 * #7 — scale-anomaly guard on the fundamental-vote inputs.
 *
 * A single source filing that carries a fundamental fact at the wrong units/scale
 * (the canonical TNTELE case: one QUARTERLY netIncome ~1000x its own neighbours —
 * see data-quality-engine.scale-anomaly) would otherwise flow straight into the v4
 * margin / margin-trend / growth votes and flip them.  This adapter drops the
 * flagged fiscal periods from the record set BEFORE it reaches the pure scorer, so
 * the votes are computed from clean history only.
 *
 * It reuses the two DQE detectors (same pair earnings-intelligence uses):
 *   • isScaleAnomalyFundamental — the CURATED, zero-false-positive suppression list
 *     (confirmed out-of-scale rows verified against filings).
 *   • detectFundamentalScaleAnomalies — the leave-one-out STATISTICAL guard that
 *     catches un-curated cases automatically (upward-only, ratio >= 100x vs same
 *     -periodType peers).
 *
 * The records at this seam are in the snake_case serving shape (`net_income`,
 * `revenue`, `eps`, `period_type`, `period_end_date`), which both detectors accept.
 *
 * B1 INVARIANT: the record at index 0 is the live-TTM snapshot the scorer relies on
 * for the current peRatio / net-margin vote (see the Phase B serving-order fix).  A
 * single TTM row can never be statistically flagged (it has no same-periodType peers)
 * and is not on the curated QUARTERLY list, but as a hard safety the guard never
 * drops index 0 — the live snapshot always survives.
 */
import { detectFundamentalScaleAnomalies, isScaleAnomalyFundamental } from '../data-quality-engine';

function readPeriodType(record: any): string {
  return String(record?.period_type ?? record?.periodType ?? '').trim().toUpperCase();
}

function readPeriodEndDay(record: any): string | null {
  const raw = record?.period_end_date ?? record?.periodEndDate;
  if (raw == null) return null;
  const iso = raw instanceof Date ? raw.toISOString() : String(raw);
  const day = iso.slice(0, 10);
  return day.length === 10 ? day : null;
}

const periodKey = (periodType: string, periodEndDay: string): string => `${periodType}|${periodEndDay}`;

export interface ScaleGuardResult<T = any> {
  /** The records with flagged fiscal periods removed (order preserved; index 0 always kept). */
  records: T[];
  /** How many periods were dropped. */
  droppedCount: number;
  /** `PERIODTYPE|YYYY-MM-DD` keys that were dropped (for diagnostics / warnings). */
  droppedKeys: string[];
}

/**
 * Remove scale-anomalous fiscal periods from one instrument's fundamentals record set.
 * Non-destructive to storage — this only shapes the in-memory input to the scorer.
 */
export function filterScaleAnomalousFundamentals<T = any>(
  region: string | undefined,
  symbol: string | undefined,
  records: readonly T[] | null | undefined,
): ScaleGuardResult<T> {
  if (!Array.isArray(records) || records.length === 0) {
    return { records: (records as T[]) ?? [], droppedCount: 0, droppedKeys: [] };
  }

  // Statistical drop-set: leave-one-out cross-period findings keyed by period.
  const dropSet = new Set<string>();
  for (const finding of detectFundamentalScaleAnomalies(records as any[])) {
    dropSet.add(periodKey(String(finding.periodType).trim().toUpperCase(), finding.periodEndDate));
  }

  const droppedKeys: string[] = [];
  const kept: T[] = [];
  records.forEach((record, index) => {
    // B1: never drop the live-TTM snapshot at index 0.
    if (index === 0) {
      kept.push(record);
      return;
    }
    const periodType = readPeriodType(record);
    const periodEndDay = readPeriodEndDay(record);
    if (!periodType || !periodEndDay) {
      kept.push(record);
      return;
    }

    const statisticallyFlagged = dropSet.has(periodKey(periodType, periodEndDay));
    const curatedFlagged =
      region != null && symbol != null &&
      isScaleAnomalyFundamental({ region, symbol, periodType, periodEndDate: new Date(periodEndDay) });

    if (statisticallyFlagged || curatedFlagged) {
      droppedKeys.push(periodKey(periodType, periodEndDay));
      return;
    }
    kept.push(record);
  });

  return { records: kept, droppedCount: droppedKeys.length, droppedKeys };
}
