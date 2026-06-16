/**
 * SEC Form 13F structured-data-set period model + download-URL builder.
 *
 * SEC reorganised the 13F data sets in 2024: instead of calendar quarters
 * (`2023q4_form13f.zip`) the files are now named by a rolling 3-month FILING
 * window — Mar–May, Jun–Aug, Sep–Nov, Dec–Feb — e.g.
 *   .../form-13f-data-sets/01mar2026-31may2026_form13f.zip
 *
 * Those filename stems do NOT sort chronologically (they begin "01" + an
 * alphabetic month), so we persist a separate sortable `key` (the window's
 * end year-month, e.g. "2026-05") which `ORDER BY quarter DESC` relies on to
 * find the latest holding. This module is pure (no network, no DB) so the
 * window math is unit-testable in isolation.
 *
 * Research-support only: observed regulatory-filing data, not advice.
 */

const SEC_13F_BASE = 'https://www.sec.gov/files/structureddata/data/form-13f-data-sets';
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** Valid 13F filing-window start months (0-based): Mar, Jun, Sep, Dec. */
const WINDOW_START_MONTHS = [2, 5, 8, 11];

export interface ThirteenFPeriod {
  /** Sortable canonical key persisted in the `quarter` column: window-end "YYYY-MM" (e.g. "2026-05"). */
  key: string;
  /** Human label, e.g. "Mar–May 2026". */
  label: string;
  /** SEC dataset filename stem, e.g. "01mar2026-31may2026". */
  fileStem: string;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Build the 3-month window beginning at (startYear, startMonth 0-based). */
function buildPeriod(startYear: number, startMonth: number): ThirteenFPeriod {
  const endMonth = (startMonth + 2) % 12;
  const endYear = startMonth + 2 > 11 ? startYear + 1 : startYear;
  // Last calendar day of the end month (handles Feb 28/29).
  const endDay = new Date(Date.UTC(endYear, endMonth + 1, 0)).getUTCDate();
  return {
    key: `${endYear}-${pad2(endMonth + 1)}`,
    label: `${cap(MONTHS[startMonth])}–${cap(MONTHS[endMonth])} ${endYear}`,
    fileStem: `01${MONTHS[startMonth]}${startYear}-${endDay}${MONTHS[endMonth]}${endYear}`,
  };
}

/** Last instant (UTC) of a period's window, derived from its "YYYY-MM" key. */
function periodEndDate(period: ThirteenFPeriod): Date {
  const [y, m] = period.key.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0, 23, 59, 59)); // day 0 of next month = last day of month m
}

/**
 * The most recent 13F filing window whose end date is on/before `now`.
 * As of mid-2026 this is the Mar–May window (the Jun–Aug window is still open).
 */
export function defaultMostRecent13fPeriod(now: Date = new Date()): ThirteenFPeriod {
  const candidates: ThirteenFPeriod[] = [];
  for (const y of [now.getUTCFullYear() - 1, now.getUTCFullYear()]) {
    for (const m of WINDOW_START_MONTHS) candidates.push(buildPeriod(y, m));
  }
  const completed = candidates.filter((p) => periodEndDate(p) <= now);
  completed.sort((a, b) => (a.key < b.key ? -1 : 1));
  return completed[completed.length - 1];
}

/**
 * Resolve a caller-supplied period token to a ThirteenFPeriod. Accepts:
 *   - "YYYY-MM"            → the rolling window ending that month
 *   - a full file stem     → e.g. "01mar2026-31may2026" (used verbatim)
 *   - legacy "YYYYqQ"      → pre-2024 calendar-quarter datasets (used verbatim)
 * Returns null if the token is unrecognised.
 */
export function parse13fPeriod(input: string): ThirteenFPeriod | null {
  const token = input.trim().toLowerCase();

  // "YYYY-MM" → find the rolling window with that end month.
  const ym = token.match(/^(\d{4})-(\d{2})$/);
  if (ym) {
    const year = Number(ym[1]);
    const month0 = Number(ym[2]) - 1;
    const startMonth = (month0 + 10) % 12; // window end = start + 2 → start = end - 2
    const startYear = month0 - 2 < 0 ? year - 1 : year;
    if (WINDOW_START_MONTHS.includes(startMonth)) return buildPeriod(startYear, startMonth);
    return null;
  }

  // Full SEC date-range stem, e.g. "01mar2026-31may2026".
  const stem = token.match(/^01([a-z]{3})(\d{4})-(\d{2})([a-z]{3})(\d{4})$/);
  if (stem) {
    const endMonth = MONTHS.indexOf(stem[4]);
    if (endMonth < 0) return null;
    return { key: `${stem[5]}-${pad2(endMonth + 1)}`, label: token, fileStem: token };
  }

  // Legacy pre-2024 calendar-quarter dataset, e.g. "2023q4".
  const legacy = token.match(/^(\d{4})q([1-4])$/);
  if (legacy) {
    const endMonthByQuarter = [3, 6, 9, 12];
    const q = Number(legacy[2]);
    return { key: `${legacy[1]}-${pad2(endMonthByQuarter[q - 1])}`, label: token, fileStem: token };
  }

  return null;
}

/** Download URL for a 13F structured-data-set period. */
export function thirteenFZipUrl(period: ThirteenFPeriod): string {
  return `${SEC_13F_BASE}/${period.fileStem}_form13f.zip`;
}
