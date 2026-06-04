/**
 * NSE Archives Bhavcopy Index CSV PARSER
 *
 * Source: NSE Archives — daily index bhavcopy CSV
 *   URL  : https://archives.nseindia.com/content/indices/ind_close_all_DDMMYYYY.csv
 *          (DDMMYYYY = trading date, e.g. 02012024 for 2024-01-02)
 *   Headers: Index Name,Index Date,Open Index Value,High Index Value,
 *             Low Index Value,Closing Index Value,Points Change,Change(%),
 *             Volume,Turnover (Rs. Cr.),P/E,P/B,Div Yield
 *   Nifty 50 row example:
 *     Nifty 50,02-01-2024,21751.35,21755.6,21555.65,21665.8,...
 *
 * NOTE: This module is a PARSER only — no network I/O.
 * The fetch driver lives in ingest-nifty50-bhavcopy.ts.
 * Tests use inline fixture data; there is NO network dependency here.
 *
 * Confirmed working (free, no cookie-priming needed):
 *   fetch(url, { headers: { 'User-Agent': '...', 'Referer': 'https://www.nseindia.com/' } })
 *
 * Re-exports the source constants originally defined in the old API-based source
 * so callers can import from a single place.
 */

// ---------------------------------------------------------------------------
// Re-export shared constants (defined in the original source module)
// ---------------------------------------------------------------------------

export {
  NSE_INDEX_EOD_SOURCE,
  NSE_INDEX_EOD_SYMBOL,
} from './market-data-foundation.nse-index-history-source';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Single parsed Nifty 50 (or any index) OHLC row from a bhavcopy CSV.
 * date is in YYYY-MM-DD string form (ISO, UTC day) — ready for DB insertion.
 */
export interface NseBhavcopyCsvRow {
  date: string;   // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
}

// ---------------------------------------------------------------------------
// Main parser (pure, no I/O)
// ---------------------------------------------------------------------------

/**
 * Parse a single daily NSE archives bhavcopy CSV text and extract the row
 * for the requested index (default: 'Nifty 50').
 *
 * Returns the parsed OHLC row, or null when:
 *   - the CSV text is empty / not valid CSV
 *   - the expected header is absent (e.g. 404 HTML was passed)
 *   - the requested index row is absent (holiday, non-trading day)
 *   - any OHLC value is non-numeric or non-positive
 *
 * This function NEVER throws; all errors are surfaced via the null return.
 *
 * @param csvText   Raw UTF-8 text of the bhavcopy CSV.
 * @param indexName Index to look for (case-insensitive, trimmed).
 *                  Defaults to 'Nifty 50'.
 */
export function parseIndexBhavcopyCsv(
  csvText: string,
  indexName = 'Nifty 50',
): NseBhavcopyCsvRow | null {
  if (!csvText || typeof csvText !== 'string') return null;

  // Split into non-empty lines, stripping \r
  const lines = csvText
    .split('\n')
    .map((l) => l.replace(/\r/g, '').trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return null;

  // Parse header to determine column positions (tolerant of whitespace/casing)
  const headerCols = splitCsvLine(lines[0]).map((c) => c.toLowerCase().trim());

  // Expected columns (case-insensitive, partial-match tolerant)
  const colIndexName    = findCol(headerCols, ['index name']);
  const colIndexDate    = findCol(headerCols, ['index date']);
  const colOpen         = findCol(headerCols, ['open index value', 'open']);
  const colHigh         = findCol(headerCols, ['high index value', 'high']);
  const colLow          = findCol(headerCols, ['low index value', 'low']);
  const colClose        = findCol(headerCols, ['closing index value', 'close']);

  // We need all six columns to be present
  if (
    colIndexName < 0 || colIndexDate < 0 ||
    colOpen < 0 || colHigh < 0 || colLow < 0 || colClose < 0
  ) {
    return null; // not a bhavcopy CSV (e.g. HTML 404 page)
  }

  const needle = indexName.toLowerCase().trim();

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length <= Math.max(colIndexName, colIndexDate, colOpen, colHigh, colLow, colClose)) {
      continue; // short / malformed row
    }

    const rowName = (cols[colIndexName] ?? '').toLowerCase().trim();
    if (rowName !== needle) continue;

    // Found the target index row — parse date and OHLC
    const rawDate = (cols[colIndexDate] ?? '').trim();
    const date = parseBhavcopDate(rawDate);
    if (!date) continue; // skip malformed date

    const open  = parsePositiveNumber(cols[colOpen]);
    const high  = parsePositiveNumber(cols[colHigh]);
    const low   = parsePositiveNumber(cols[colLow]);
    const close = parsePositiveNumber(cols[colClose]);

    if (open === null || high === null || low === null || close === null) continue;

    return { date, open, high, low, close };
  }

  return null; // index row not found in this file
}

// ---------------------------------------------------------------------------
// URL builder (pure, no network)
// ---------------------------------------------------------------------------

/**
 * Build the NSE archives bhavcopy URL for a given trading date.
 *
 * URL pattern: https://archives.nseindia.com/content/indices/ind_close_all_DDMMYYYY.csv
 * where DDMMYYYY is the zero-padded day/month/year of the trading date (UTC).
 */
export function buildBhavcopyCsvUrl(date: Date): string {
  const dd   = String(date.getUTCDate()).padStart(2, '0');
  const mm   = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `https://archives.nseindia.com/content/indices/ind_close_all_${dd}${mm}${yyyy}.csv`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Split a single CSV line into fields.
 * Handles quoted fields containing commas.
 * This is a minimal RFC-4180-style split sufficient for NSE's plain-ASCII CSVs.
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Find the first column index that exactly matches any of the candidate names
 * (case-insensitive, whitespace-normalised).
 * Falls back to prefix-match if no exact match is found.
 */
function findCol(headerCols: string[], candidates: string[]): number {
  // Exact match first
  for (const candidate of candidates) {
    const idx = headerCols.indexOf(candidate);
    if (idx >= 0) return idx;
  }
  // Partial / contains match as fallback
  for (const candidate of candidates) {
    const idx = headerCols.findIndex((h) => h.includes(candidate));
    if (idx >= 0) return idx;
  }
  return -1;
}

/**
 * Convert the bhavcopy date format DD-MM-YYYY to ISO YYYY-MM-DD string.
 * Returns null for anything unparseable.
 */
function parseBhavcopDate(raw: string): string | null {
  // Primary format from NSE archives bhavcopy: DD-MM-YYYY
  const ddmmMatch = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmMatch) {
    const day   = ddmmMatch[1].padStart(2, '0');
    const month = ddmmMatch[2].padStart(2, '0');
    const year  = ddmmMatch[3];
    // Basic sanity: month 1–12, day 1–31
    const m = Number(month);
    const d = Number(day);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return `${year}-${month}-${day}`;
  }

  // Fallback: already ISO YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return raw;

  return null;
}

/**
 * Parse a numeric string that may contain thousands commas (e.g. "22,500.40").
 * Returns null if the result is not a finite positive number.
 */
function parsePositiveNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  const cleaned = raw.replace(/,/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === 'N/A' || cleaned === 'NA') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
