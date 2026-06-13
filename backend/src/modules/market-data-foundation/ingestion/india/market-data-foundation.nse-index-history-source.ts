/**
 * NSE Index History SOURCE PARSER
 *
 * Official free source: NSE India indicesHistory API
 *   Endpoint : https://www.nseindia.com/api/historical/indicesHistory
 *              ?indexType=NIFTY%2050&from=DD-MM-YYYY&to=DD-MM-YYYY
 *   Shape    : { data: { indexCloseOnlineRecords: [...] } }
 *   Row keys : EOD_INDEX_NAME, EOD_TIMESTAMP (DD-MM-YYYY), EOD_OPEN_INDEX_VAL,
 *              EOD_HIGH_INDEX_VAL, EOD_LOW_INDEX_VAL, EOD_CLOSING_INDEX_VAL
 *
 * NOTE: The NSE endpoint is bot-protected (requires a live browser cookie).
 * This module is a PARSER only — network fetching is the caller's responsibility
 * (see ingest-nifty50-history.ts for the cookie-primed fetch driver).
 * Tests use inline fixture data; there is NO network dependency here.
 *
 * Conventions:
 *   - All numbers are plain JavaScript numbers (Decimal coercion is the caller's job)
 *   - Dates are normalised to UTC midnight (Date objects)
 *   - Malformed rows are skipped with per-row warnings (never throws)
 *   - Source constant exported so the script and tests share one definition
 */

import { nseIndexHistoryBaseUrl } from '../market-data-foundation.endpoints';

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

export const NSE_INDEX_EOD_SOURCE = 'NSE_INDEX_EOD';
export const NSE_INDEX_EOD_SYMBOL = '^NSEI';
/** Sourced from the central endpoint registry (override: MARKET_DATA_NSE_WWW_BASE). */
export const NSE_INDEX_HISTORY_BASE_URL = nseIndexHistoryBaseUrl();
export const NSE_INDEX_HISTORY_INDEX_TYPE = 'NIFTY 50';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface NseIndexEodRow {
  date: Date; // UTC midnight
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ParseNseIndexHistoryResult {
  rows: NseIndexEodRow[];
  skipped: number;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// URL builder (pure, no network)
// ---------------------------------------------------------------------------

/**
 * Build the NSE indicesHistory URL for a given date range.
 * Dates are formatted as DD-MM-YYYY as required by the NSE API.
 */
export const buildNseIndexHistoryUrl = (
  fromDate: Date,
  toDate: Date,
  indexType: string = NSE_INDEX_HISTORY_INDEX_TYPE
): string => {
  const from = formatNseDateParam(fromDate);
  const to = formatNseDateParam(toDate);
  const params = new URLSearchParams();
  params.set('indexType', indexType);
  params.set('from', from);
  params.set('to', to);
  return `${NSE_INDEX_HISTORY_BASE_URL}?${params.toString()}`;
};

// ---------------------------------------------------------------------------
// Main parser: raw NSE JSON payload → NseIndexEodRow[]
// ---------------------------------------------------------------------------

/**
 * Parse a raw NSE indicesHistory API JSON payload into normalised OHLC rows.
 *
 * The payload shape from NSE's live API is:
 *   {
 *     data: {
 *       indexCloseOnlineRecords: [
 *         { EOD_INDEX_NAME, EOD_TIMESTAMP, EOD_OPEN_INDEX_VAL,
 *           EOD_HIGH_INDEX_VAL, EOD_LOW_INDEX_VAL, EOD_CLOSING_INDEX_VAL },
 *         ...
 *       ]
 *     }
 *   }
 *
 * This parser is tolerant of:
 *   - Payload wrapped in a top-level array
 *   - Alternate key names / casing
 *   - DD-MM-YYYY or ISO (YYYY-MM-DD) date strings in EOD_TIMESTAMP
 *   - Numeric values supplied as strings
 *   - Rows with missing or non-numeric OHLC (skipped, warns)
 *   - Rows where date is unparseable (skipped, warns)
 */
export const parseNseIndexHistoryPayload = (rawPayload: unknown): ParseNseIndexHistoryResult => {
  const warnings: string[] = [];
  let skipped = 0;
  const rows: NseIndexEodRow[] = [];

  const records = extractIndexRecords(rawPayload);
  if (records.length === 0 && rawPayload !== null && rawPayload !== undefined) {
    warnings.push('NSE indicesHistory payload: could not locate indexCloseOnlineRecords array; got empty result.');
  }

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const label = `row[${i}]`;
    if (!isRecord(record)) {
      skipped += 1;
      warnings.push(`${label}: not an object; skipped.`);
      continue;
    }

    const rawDate = readString(record, [
      'EOD_TIMESTAMP', 'eod_timestamp', 'date', 'Date', 'DATE',
    ]);
    const date = parseNseIndexDate(rawDate);
    if (!date) {
      skipped += 1;
      warnings.push(`${label}: unparseable or empty date "${rawDate}"; skipped.`);
      continue;
    }

    const open = readPositiveNumber(record, ['EOD_OPEN_INDEX_VAL', 'eod_open_index_val', 'open', 'Open', 'OPEN']);
    const high = readPositiveNumber(record, ['EOD_HIGH_INDEX_VAL', 'eod_high_index_val', 'high', 'High', 'HIGH']);
    const low = readPositiveNumber(record, ['EOD_LOW_INDEX_VAL', 'eod_low_index_val', 'low', 'Low', 'LOW']);
    const close = readPositiveNumber(record, [
      'EOD_CLOSING_INDEX_VAL', 'eod_closing_index_val', 'close', 'Close', 'CLOSE',
      'EOD_CLOSE_INDEX_VAL',
    ]);

    if (open === null || high === null || low === null || close === null) {
      skipped += 1;
      warnings.push(
        `${label} (date=${rawDate}): missing or non-numeric OHLC ` +
        `(open=${open}, high=${high}, low=${low}, close=${close}); skipped.`
      );
      continue;
    }

    rows.push({ date, open, high, low, close });
  }

  return { rows, skipped, warnings };
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Walk the payload to find the array of daily records. */
const extractIndexRecords = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    // Some callers pass the records array directly (e.g. tests)
    if (payload.length === 0 || isRecord(payload[0])) return payload;
  }

  if (!isRecord(payload)) return [];

  // Shape: { data: { indexCloseOnlineRecords: [...] } }
  const data = readValue(payload, ['data', 'Data', 'DATA']);
  if (isRecord(data)) {
    const records = readValue(data, [
      'indexCloseOnlineRecords',
      'IndexCloseOnlineRecords',
      'INDEX_CLOSE_ONLINE_RECORDS',
    ]);
    if (Array.isArray(records)) return records;
  }

  // Fallback: try top-level candidate keys
  const topLevelCandidates = [
    'indexCloseOnlineRecords', 'IndexCloseOnlineRecords',
    'records', 'Records', 'rows', 'Rows', 'data', 'Data',
  ];
  for (const key of topLevelCandidates) {
    const value = readValue(payload, [key]);
    if (Array.isArray(value) && (value.length === 0 || isRecord(value[0]))) {
      return value;
    }
  }

  return [];
};

/**
 * Parse NSE index date string to UTC midnight Date.
 * Supported formats:
 *   - DD-MM-YYYY  (most common in NSE historical index data)
 *   - YYYY-MM-DD  (ISO 8601)
 *   - DD-Mon-YYYY (rare, but consistent with other NSE endpoints)
 */
export const parseNseIndexDate = (raw: string | null | undefined): Date | null => {
  const text = (raw ?? '').trim();
  if (!text || text === '-' || text === 'N/A' || text === 'NA') return null;

  // DD-MM-YYYY
  const ddmmMatch = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmMatch) {
    return utcMidnight(Number(ddmmMatch[3]), Number(ddmmMatch[2]) - 1, Number(ddmmMatch[1]));
  }

  // YYYY-MM-DD (ISO)
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return utcMidnight(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  // DD-Mon-YYYY (e.g. '17-Oct-2023')
  const dmmMatch = text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (dmmMatch) {
    const monthIndex = MONTH_NAMES[dmmMatch[2].toLowerCase()];
    if (monthIndex !== undefined) {
      return utcMidnight(Number(dmmMatch[3]), monthIndex, Number(dmmMatch[1]));
    }
  }

  return null;
};

const MONTH_NAMES: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
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

/** Format a Date as DD-MM-YYYY for the NSE API query parameter. */
const formatNseDateParam = (date: Date): string => {
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const readValue = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
    // Case-insensitive fallback
    const normalised = key.toUpperCase();
    const found = Object.keys(record).find((k) => k.toUpperCase() === normalised);
    if (found !== undefined) return record[found];
  }
  return undefined;
};

const readString = (record: Record<string, unknown>, keys: string[]): string => {
  const value = readValue(record, keys);
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
};

const readPositiveNumber = (record: Record<string, unknown>, keys: string[]): number | null => {
  const value = readValue(record, keys);
  let n: number;
  if (typeof value === 'number') {
    n = value;
  } else if (typeof value === 'string') {
    // NSE sometimes returns values like "22,500.40" with commas
    const cleaned = value.replace(/,/g, '').trim();
    if (!cleaned) return null;
    n = Number(cleaned);
  } else {
    return null;
  }
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
