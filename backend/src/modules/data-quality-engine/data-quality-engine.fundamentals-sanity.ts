/**
 * Curated suppression of fundamental records whose stored netIncome is confirmed
 * OUT-OF-SCALE BAD DATA — either an iXBRL scale mis-parse or a filer error in the
 * source NSE XBRL filing itself. Each entry has been individually verified against
 * the source filing.
 *
 * This is intentionally a CURATED list of known-bad rows, not a statistical
 * heuristic. A genuine impairment loss or a one-off exceptional gain is
 * statistically indistinguishable from a scale error (both are a large netIncome
 * far exceeding revenue and the rest of the series), so any threshold rule
 * suppresses real financials as false positives. We confirmed two such real cases
 * during calibration — ARSHIYA (a ~Rs.2,417cr impairment, corroborated by its own
 * annual) and MOTOGENFIN (a ~Rs.145cr exceptional gain, matching its annual to ~1%)
 * — which a ratio rule wrongly flagged. The only reliable signal separating these
 * from a true scale error is the source filing, so suppression is curated.
 *
 * Owned by the Data Quality Engine (it owns data-quality/readiness logic per
 * docs/agents/data-and-market-policy.md). Downstream modules (e.g.
 * earnings-intelligence) consume these helpers to drop the affected periods before
 * computing growth / classification, rather than re-deriving the judgement
 * themselves. This is a read-time filter only — it never mutates stored data.
 */

/** Minimal shape needed to test a fundamental period for scale-error suppression. */
export interface ScaleAnomalyCandidate {
  region: string;
  symbol: string;
  periodType: string;
  /** Period end date; matched on its UTC calendar day. */
  periodEndDate: Date;
}

interface ScaleAnomalyEntry {
  region: string;
  symbol: string;
  periodType: string;
  /** UTC calendar day, yyyy-mm-dd. */
  periodEndDate: string;
  /** Short note on why the value is bad (for auditability). */
  reason: string;
}

/**
 * Verified scale-error netIncome rows. Each was checked against its source NSE
 * SEBI Integrated-Filing IndAS XBRL. Values shown are the stored (bad) netIncome.
 */
const SCALE_ANOMALY_NETINCOME: readonly ScaleAnomalyEntry[] = [
  // TNTELE (Tamilnadu Telecommunications) — every flagged period is uniformly
  // 1000x the real reported figure (an iXBRL scale mis-parse for this filer).
  // The true quarterly loss is ~Rs.3.4 Cr and the FY24 annual loss ~Rs.14.6 Cr;
  // the stored values imply ~Rs.3,400 Cr and ~Rs.14,600 Cr respectively.
  // Each cross-checked against the company's filed results (see Done Report).
  {
    region: 'IN',
    symbol: 'TNTELE',
    periodType: 'QUARTERLY',
    periodEndDate: '2025-12-31',
    reason: 'netIncome -34,634,800,000 is 1000x real -Rs.3.46 Cr (iXBRL scale mis-parse)',
  },
  {
    region: 'IN',
    symbol: 'TNTELE',
    periodType: 'QUARTERLY',
    periodEndDate: '2025-06-30',
    reason: 'netIncome -34,415,500,000 is 1000x real -Rs.3.44 Cr (iXBRL scale mis-parse)',
  },
  {
    region: 'IN',
    symbol: 'TNTELE',
    periodType: 'QUARTERLY',
    periodEndDate: '2024-12-31',
    reason: 'netIncome -34,254,100,000 is 1000x real -Rs.3.43 Cr (iXBRL scale mis-parse)',
  },
  {
    region: 'IN',
    symbol: 'TNTELE',
    periodType: 'ANNUAL',
    periodEndDate: '2024-03-31',
    reason: 'netIncome -146,188,000,000 is 1000x real -Rs.14.62 Cr (iXBRL scale mis-parse)',
  },
  // NOTE — deliberately EXCLUDED after source verification (real exceptional
  // items, NOT scale errors; stored values match filed figures to the rupee):
  //   VLEGOV ANNUAL 2025-03-31 (-Rs.2,517 Cr write-down),
  //   GAYAHWS ANNUAL 2025-03-31 (+Rs.1,129 Cr OTS debt-settlement gain),
  //   SUPREMEINF QUARTERLY 2025-09-30 (+Rs.6,306 Cr debt-restructuring write-back),
  //   WILLAMAGOR ANNUAL 2025-03-31 (-Rs.181 Cr provisioned loss),
  //   ARSHIYA / MOTOGENFIN (the calibration controls).
];

const anomalyKey = (region: string, symbol: string, periodType: string, isoDay: string): string =>
  `${region.trim().toUpperCase()}|${symbol.trim().toUpperCase()}|${periodType.trim().toUpperCase()}|${isoDay}`;

const SUPPRESSED_KEYS: ReadonlySet<string> = new Set(
  SCALE_ANOMALY_NETINCOME.map((entry) =>
    anomalyKey(entry.region, entry.symbol, entry.periodType, entry.periodEndDate)
  )
);

/** Format a Date as its UTC calendar day (yyyy-mm-dd), independent of local TZ. */
const toUtcDay = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * True when the given fundamental period is a confirmed out-of-scale netIncome row
 * that should be excluded from any netIncome-derived analysis.
 */
export const isScaleAnomalyFundamental = (candidate: ScaleAnomalyCandidate): boolean =>
  SUPPRESSED_KEYS.has(
    anomalyKey(candidate.region, candidate.symbol, candidate.periodType, toUtcDay(candidate.periodEndDate))
  );

/**
 * Drop confirmed out-of-scale fundamental periods for a single instrument. The
 * instrument's region + symbol are supplied once; each record contributes its own
 * periodType + periodEndDate.
 */
export const filterScaleAnomalies = <T extends { periodType: string; periodEndDate: Date }>(
  region: string,
  symbol: string,
  records: readonly T[]
): T[] =>
  records.filter(
    (record) =>
      !isScaleAnomalyFundamental({
        region,
        symbol,
        periodType: record.periodType,
        periodEndDate: record.periodEndDate,
      })
  );

/** Count of curated scale-error rows (exposed for sanity tests / diagnostics). */
export const scaleAnomalyRowCount = (): number => SCALE_ANOMALY_NETINCOME.length;
