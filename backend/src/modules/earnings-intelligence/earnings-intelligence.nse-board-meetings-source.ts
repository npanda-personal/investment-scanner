/**
 * NSE Board-Meetings / Result-Announcement Date SOURCE PARSER
 *
 * Official free source: NSE India API
 *   Endpoint (bulk):   https://www.nseindia.com/api/corporate-board-meetings?index=equities
 *   Endpoint (symbol): https://www.nseindia.com/api/corporate-board-meetings?index=equities&symbol=RELIANCE
 *
 * The response is a JSON array of board-meeting records. Each record has:
 *   symbol      NSE trading symbol (e.g. "RELIANCE")
 *   company     Company name
 *   purpose     Free-text purpose field, e.g.:
 *                 "Quarterly Results"
 *                 "To consider and approve Unaudited Financial Results for Q3 FY25"
 *                 "Annual Results"
 *                 "Dividend"
 *   meetingDate Meeting date  (DD-Mon-YYYY or DD-MM-YYYY or YYYY-MM-DD)
 *   bm_desc     Sometimes an alternate description field (may be absent)
 *
 * NOTE: The NSE endpoint is bot-protected (requires a live browser cookie).
 * This module provides PARSER/MAPPER logic only — the caller provides the fetch
 * function (e.g. using the same cookie-primed strategy as XBRL fundamentals).
 * Tests use saved fixture data.
 *
 * Persistence design: officialResultDate is stored on the Fundamental row
 * (see migration 202606050001_earnings_official_result_date) because:
 *   - The Fundamental row already carries periodType + periodEndDate which
 *     identifies the period being announced.
 *   - The service already reads latest.officialResultDate from the
 *     EarningsFundamentalInput to resolve resultDateSource='OFFICIAL_CALENDAR'.
 *   - No new table is needed — a nullable column on fundamentals is the
 *     minimal-risk, additive change.
 *   - The ingest script matches NSE board-meeting dates to Fundamental rows
 *     by (stockId, periodEndDate window) — the quarter ending ≤ meetingDate
 *     and meetingDate within reasonable window for result announcement.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface NseBoardMeetingRow {
  symbol: string;
  company?: string;
  purpose: string;
  meetingDate: string; // raw string from NSE, e.g. "17-Oct-2024"
  bm_desc?: string;   // alternate/supplemental description (may be absent)
  [key: string]: unknown;
}

export interface ParsedBoardMeeting {
  symbol: string;           // NSE symbol, normalized uppercase
  boardMeetingDate: Date;   // UTC-midnight date of the board meeting
  purpose: 'RESULTS';       // only result-announcement board meetings are included
  rawPurpose: string;        // original purpose string, preserved for audit
  source: string;            // always 'NSE_BOARD_MEETINGS'
}

export interface ParseNseBoardMeetingsOptions {
  source?: string;          // defaults to 'NSE_BOARD_MEETINGS'
  fromDate?: Date;          // only include meetings on or after this date
  toDate?: Date;            // only include meetings on or before this date
}

export interface ParseNseBoardMeetingsResult {
  parsed: ParsedBoardMeeting[];
  skipped: number;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const NSE_BOARD_MEETINGS_SOURCE = 'NSE_BOARD_MEETINGS';
export const NSE_BOARD_MEETINGS_ENDPOINT =
  'https://www.nseindia.com/api/corporate-board-meetings';

/** URL builder — mirrors the corporate-actions URL builder convention. */
export const buildNseBoardMeetingsUrl = (options: {
  index?: 'equities' | 'sme';
  symbol?: string;
  fromDate?: string; // 'DD-MM-YYYY'
  toDate?: string;   // 'DD-MM-YYYY'
} = {}): string => {
  const params = new URLSearchParams();
  params.set('index', options.index ?? 'equities');
  if (options.symbol) params.set('symbol', options.symbol);
  if (options.fromDate) params.set('from_date', options.fromDate);
  if (options.toDate) params.set('to_date', options.toDate);
  return `${NSE_BOARD_MEETINGS_ENDPOINT}?${params.toString()}`;
};

// ---------------------------------------------------------------------------
// Month-name lookup (shared logic, identical to corporate-actions-source)
// ---------------------------------------------------------------------------

const MONTH_NAMES: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// ---------------------------------------------------------------------------
// Date parsing (tolerates multiple NSE date formats, outputs UTC midnight)
// ---------------------------------------------------------------------------

/**
 * Parse an NSE date string to a UTC-midnight Date.
 * Supported formats: 'DD-Mon-YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD', ISO.
 * Returns null for empty/invalid strings — never throws.
 */
export const parseNseBoardMeetingDate = (raw: string | null | undefined): Date | null => {
  const text = (raw ?? '').trim();
  if (!text || text === '-' || text === 'N/A') return null;

  // DD-Mon-YYYY (e.g. '17-Oct-2024')
  const mmmMatch = text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (mmmMatch) {
    const day = Number(mmmMatch[1]);
    const monthIndex = MONTH_NAMES[mmmMatch[2].toLowerCase()];
    const year = Number(mmmMatch[3]);
    if (monthIndex !== undefined) return utcMidnight(year, monthIndex, day);
  }

  // DD-MM-YYYY
  const ddmmMatch = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmMatch) {
    return utcMidnight(
      Number(ddmmMatch[3]),
      Number(ddmmMatch[2]) - 1,
      Number(ddmmMatch[1])
    );
  }

  // YYYY-MM-DD
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return utcMidnight(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3])
    );
  }

  // Native Date fallback (handles ISO-8601 with time)
  const d = new Date(text);
  if (!Number.isNaN(d.getTime())) {
    return utcMidnight(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  return null;
};

const utcMidnight = (year: number, monthIndex: number, day: number): Date | null => {
  const d = new Date(Date.UTC(year, monthIndex, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== monthIndex ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
};

// ---------------------------------------------------------------------------
// Purpose filter — does this board meeting announce financial results?
// ---------------------------------------------------------------------------

/**
 * Return true if the purpose string indicates a financial-results announcement.
 *
 * Recognises NSE real-world patterns:
 *   "Quarterly Results"
 *   "Half Yearly Results"
 *   "Annual Results"
 *   "To consider and approve Unaudited Financial Results for Q3 FY25"
 *   "Financial Results for the quarter ended December 31, 2024"
 *   "Unaudited Standalone Financial Results"
 *   "Audited Financial Results"
 *   "To consider approval of Financial Results"
 *   (also handles bm_desc field for newer API responses)
 *
 * Non-result purposes (excluded):
 *   "Dividend"
 *   "AGM", "EGM", "General Meeting"
 *   "Buyback"
 *   "Issue of Securities"
 *   "Sub-Division", "Bonus"
 *   "Auditor Appointment"
 *   etc.
 */
export const isPurposeResultsAnnouncement = (purpose: string | null | undefined): boolean => {
  const text = (purpose ?? '').trim().toLowerCase();
  if (!text) return false;

  // Positive patterns: the text must contain a results/financials marker
  const positivePatterns = [
    /\bquarterly\s+results?\b/,
    /\bhalf[\s-]?yearly\s+results?\b/,
    /\bannual\s+results?\b/,
    /\bfinancial\s+results?\b/,
    /\bunaudited\s+.*results?\b/,
    /\baudited\s+.*results?\b/,
    /\bresults?\s+for\s+(the\s+)?(quarter|half|year)\b/,
    /\bconsider\s+.*financial\s+results?\b/,
    /\bapprove\s+.*financial\s+results?\b/,
    /\bresults?\s+for\s+q[1-4]\b/,
    /\bstandalone\s+financial\s+results?\b/,
    /\bconsolidated\s+financial\s+results?\b/,
    /\bfinancials?\s+for\s+(the\s+)?(quarter|half|year)\b/,
  ];

  // Negative patterns: these purpose strings are NOT result announcements
  // even if they inadvertently contain the word "result"
  const negativePatterns = [
    /\bdividend\b/,
    /\bbonus\b/,
    /\bsplit\b/,
    /\bsub.?division\b/,
    /\bbuyback\b/,
    /\bbuy.back\b/,
    /\bagm\b/,
    /\begm\b/,
    /\bgeneral\s+meeting\b/,
    /\bauditor\b/,
    /\bappointment\b/,
    /\brights?\s+issue\b/,
    /\bmerger\b/,
    /\bdemerger\b/,
    /\bopen\s+offer\b/,
    /\bstock\s+option\b/,
    /\besop\b/,
  ];

  // Check positives first: if any results pattern matches, return true
  // (even if the string also mentions "dividend" e.g. "Quarterly Results & Dividend")
  for (const pattern of positivePatterns) {
    if (pattern.test(text)) return true;
  }

  // Only apply negatives if no positive matched (avoids false exclusions for
  // mixed-purpose strings like "Quarterly Results & Dividend")
  for (const pattern of negativePatterns) {
    if (pattern.test(text)) return false;
  }

  return false;
};

// ---------------------------------------------------------------------------
// Row parser
// ---------------------------------------------------------------------------

/**
 * Parse a single NSE board-meeting row.
 * Returns ParsedBoardMeeting | null — never throws; errors go to warnings[].
 */
export const parseNseBoardMeetingRow = (
  row: NseBoardMeetingRow,
  source: string,
  warnings: string[],
  options: Pick<ParseNseBoardMeetingsOptions, 'fromDate' | 'toDate'> = {}
): ParsedBoardMeeting | null => {
  const rowLabel = `[symbol=${row.symbol ?? '?'} purpose="${String(row.purpose ?? '')}"]`;

  try {
    const symbol = (row.symbol ?? '').trim().toUpperCase();
    if (!symbol) {
      warnings.push(`Row ${rowLabel}: missing symbol; skipped.`);
      return null;
    }

    const rawPurpose = String(row.purpose ?? row.bm_desc ?? '').trim();

    // Check both purpose and bm_desc fields
    const purposeText = rawPurpose || String(row.bm_desc ?? '').trim();
    if (!isPurposeResultsAnnouncement(purposeText)) {
      // Silently skip non-result meetings — do not add to warnings (they're expected)
      return null;
    }

    const boardMeetingDate = parseNseBoardMeetingDate(String(row.meetingDate ?? ''));
    if (!boardMeetingDate) {
      warnings.push(`Row ${rowLabel}: unparseable or empty meetingDate "${row.meetingDate}"; skipped.`);
      return null;
    }

    // Optional date range filter
    if (options.fromDate && boardMeetingDate < options.fromDate) return null;
    if (options.toDate && boardMeetingDate > options.toDate) return null;

    return {
      symbol,
      boardMeetingDate,
      purpose: 'RESULTS',
      rawPurpose,
      source,
    };
  } catch (err) {
    warnings.push(
      `Row ${rowLabel}: unexpected error — ${err instanceof Error ? err.message : String(err)}; skipped.`
    );
    return null;
  }
};

// ---------------------------------------------------------------------------
// Batch parser
// ---------------------------------------------------------------------------

/**
 * Parse an array of raw NSE board-meeting API rows.
 * Non-result meetings are silently dropped (not counted as skipped).
 * Rows with missing symbol or unparseable date are counted as skipped + warned.
 */
export const parseNseBoardMeetings = (
  rows: NseBoardMeetingRow[],
  options: ParseNseBoardMeetingsOptions = {}
): ParseNseBoardMeetingsResult => {
  const source = options.source ?? NSE_BOARD_MEETINGS_SOURCE;
  const warnings: string[] = [];
  const parsed: ParsedBoardMeeting[] = [];
  let skipped = 0;

  for (const row of rows) {
    // Silently skip non-result meetings (not an error — expected)
    const rawPurpose = String(row.purpose ?? row.bm_desc ?? '').trim();
    if (!isPurposeResultsAnnouncement(rawPurpose)) continue;

    const result = parseNseBoardMeetingRow(row, source, warnings, {
      fromDate: options.fromDate,
      toDate: options.toDate,
    });
    if (result) {
      parsed.push(result);
    } else {
      // Count as skipped only if it was a results-purpose row that failed to parse
      if (isPurposeResultsAnnouncement(rawPurpose)) skipped += 1;
    }
  }

  return { parsed, skipped, warnings };
};

// ---------------------------------------------------------------------------
// Matching helper: given a board-meeting date, find the fiscal period end date
// that the board meeting is most likely announcing.
// ---------------------------------------------------------------------------

/**
 * Match a board-meeting date to the closest prior fiscal quarter-end.
 *
 * NSE board meetings typically occur 30–75 days after the period end.
 * We return the most recent fiscal period-end date that:
 *   1. Is earlier than boardMeetingDate
 *   2. Is within MATCH_WINDOW_MAX_DAYS before boardMeetingDate
 *
 * MATCH_WINDOW_MAX_DAYS = 90 covers:
 *   - Quarterly: period ends 31-Mar, meeting on 15-May (45d) ✓
 *   - Annual:    period ends 31-Mar, meeting on 20-Jun (81d) ✓
 *   Edge: a meeting >90 days after the period end is unusual; we skip to avoid
 *   mis-matching a very-delayed announcement to the wrong fundamental row.
 */
export const MATCH_WINDOW_MAX_DAYS = 90;

export const matchBoardMeetingToPeriodEnd = (
  boardMeetingDate: Date,
  periodEndDates: Date[]
): Date | null => {
  const cutoff = new Date(boardMeetingDate.getTime() - MATCH_WINDOW_MAX_DAYS * 24 * 60 * 60 * 1000);
  const candidates = periodEndDates
    .filter((d) => d < boardMeetingDate && d >= cutoff)
    .sort((a, b) => b.getTime() - a.getTime()); // most-recent first
  return candidates[0] ?? null;
};
