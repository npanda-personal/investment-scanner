/**
 * Fiscal-period classification for Earnings-Intelligence.
 *
 * The canonical `periodType` values written by the ingestion layer are
 * `QUARTERLY`, `ANNUAL`, and `TTM` (the last from the US SEC / Yahoo trailing-
 * twelve-month adapters).  The engine must classify a record into exactly one
 * class so that:
 *   - growth comparisons only ever pit like-against-like periods, and
 *   - US/TTM rows are not mislabelled as "missing quarterly + missing annual".
 *
 * This replaces the previous `isQuarterly` / `isAnnual` substring sniffing on the
 * service, which had two defects:
 *   1. it had no `TTM` concept, so every US trailing-twelve-month row was treated
 *      as having neither quarterly nor annual data; and
 *   2. `isAnnual` matched the substring "FY", so a quarterly label like
 *      "Q3 FY25" was misclassified as annual.
 * Both are fixed here by classifying into a single mutually-exclusive class with
 * the quarterly check ordered ahead of the annual check.
 */

export type EarningsPeriodClass = 'QUARTERLY' | 'ANNUAL' | 'TTM' | 'UNKNOWN';

/**
 * Classify a raw `periodType` string into exactly one period class.
 * Order matters: a label such as "Q3 FY25" carries both a quarter marker and the
 * substring "FY", and must classify as QUARTERLY — so the quarter test runs first.
 */
export function classifyPeriod(periodType: string | null | undefined): EarningsPeriodClass {
  const normalized = String(periodType ?? '').toUpperCase().trim();
  if (!normalized) return 'UNKNOWN';

  // Trailing-twelve-month (US SEC company-facts / Yahoo) — check first because it
  // is the most specific marker and never overlaps the quarterly/annual tests.
  if (normalized === 'TTM' || normalized.includes('TRAILING')) return 'TTM';

  // Quarterly — exact canonical value, the word "QUARTER", or a "Q1".."Q4" prefix
  // (with a word boundary so "Q3 FY25" matches but "QX" does not).
  if (normalized === 'QUARTERLY' || normalized.includes('QUARTER') || /^Q[1-4]\b/.test(normalized)) {
    return 'QUARTERLY';
  }

  // Annual — exact canonical value, the words "ANNUAL"/"YEAR", or an "FY" marker
  // ("FY24", "FY 2024", ...).  Only reached when no quarter marker was present, so
  // "Q3 FY25" was already classified QUARTERLY above and cannot leak in here —
  // which is exactly why the loose "FY" match is safe.
  if (
    normalized === 'ANNUAL' ||
    normalized.includes('ANNUAL') ||
    normalized.includes('YEAR') ||
    normalized.includes('FY')
  ) {
    return 'ANNUAL';
  }

  return 'UNKNOWN';
}

export const isQuarterlyPeriod = (periodType: string | null | undefined): boolean =>
  classifyPeriod(periodType) === 'QUARTERLY';

export const isAnnualPeriod = (periodType: string | null | undefined): boolean =>
  classifyPeriod(periodType) === 'ANNUAL';

export const isTtmPeriod = (periodType: string | null | undefined): boolean =>
  classifyPeriod(periodType) === 'TTM';
