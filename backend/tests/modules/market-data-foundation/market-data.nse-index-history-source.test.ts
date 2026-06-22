/// <reference types="@types/jest" />
import path from 'path';
import fs from 'fs';
import {
  parseNseIndexHistoryPayload,
  parseNseIndexDate,
  buildNseIndexHistoryUrl,
  NSE_INDEX_EOD_SOURCE,
  NSE_INDEX_EOD_SYMBOL,
  NSE_INDEX_HISTORY_BASE_URL,
} from '../../../src/modules/market-data-foundation/ingestion/india/market-data-foundation.nse-index-history-source';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** UTC-midnight Date from an ISO YYYY-MM-DD string. */
const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

/** Minimal valid NSE indicesHistory payload wrapping an array of records. */
const wrapRecords = (records: unknown[]): unknown => ({
  data: { indexCloseOnlineRecords: records },
});

/** A single valid OHLC record in the real NSE API shape. */
const makeRecord = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  EOD_TIMESTAMP: '01-01-2019',
  EOD_INDEX_NAME: 'Nifty 50',
  EOD_OPEN_INDEX_VAL: 10910.10,
  EOD_HIGH_INDEX_VAL: 10987.45,
  EOD_LOW_INDEX_VAL: 10850.30,
  EOD_CLOSING_INDEX_VAL: 10961.40,
  ...overrides,
});

// ---------------------------------------------------------------------------
// A. parseNseIndexDate — date string parsing
// ---------------------------------------------------------------------------

describe('parseNseIndexDate', () => {
  it('parses DD-MM-YYYY (primary NSE format)', () => {
    expect(parseNseIndexDate('01-01-2019')).toEqual(d('2019-01-01'));
    expect(parseNseIndexDate('31-12-2023')).toEqual(d('2023-12-31'));
    expect(parseNseIndexDate('15-08-2014')).toEqual(d('2014-08-15'));
  });

  it('parses ISO YYYY-MM-DD format', () => {
    expect(parseNseIndexDate('2019-01-01')).toEqual(d('2019-01-01'));
    expect(parseNseIndexDate('2023-12-31')).toEqual(d('2023-12-31'));
  });

  it('parses ISO YYYY-MM-DD with time suffix', () => {
    expect(parseNseIndexDate('2019-06-01T00:00:00Z')).toEqual(d('2019-06-01'));
  });

  it('parses DD-Mon-YYYY format (e.g. "17-Oct-2023")', () => {
    expect(parseNseIndexDate('17-Oct-2023')).toEqual(d('2023-10-17'));
    expect(parseNseIndexDate('04-SEP-2023')).toEqual(d('2023-09-04'));
    expect(parseNseIndexDate('01-jan-2014')).toEqual(d('2014-01-01'));
  });

  it('returns UTC midnight (no time component)', () => {
    const result = parseNseIndexDate('01-01-2019');
    expect(result).not.toBeNull();
    expect(result!.toISOString()).toBe('2019-01-01T00:00:00.000Z');
  });

  it('returns null for empty string', () => {
    expect(parseNseIndexDate('')).toBeNull();
  });

  it('returns null for "-" placeholder', () => {
    expect(parseNseIndexDate('-')).toBeNull();
  });

  it('returns null for "N/A"', () => {
    expect(parseNseIndexDate('N/A')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseNseIndexDate(undefined)).toBeNull();
  });

  it('returns null for null', () => {
    expect(parseNseIndexDate(null)).toBeNull();
  });

  it('returns null for completely invalid text', () => {
    expect(parseNseIndexDate('not-a-date')).toBeNull();
    expect(parseNseIndexDate('abc')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// B. buildNseIndexHistoryUrl
// ---------------------------------------------------------------------------

describe('buildNseIndexHistoryUrl', () => {
  it('builds URL with correct from/to parameters', () => {
    const from = new Date(Date.UTC(2019, 0, 1));
    const to = new Date(Date.UTC(2019, 2, 31));
    const url = buildNseIndexHistoryUrl(from, to);
    expect(url).toContain(NSE_INDEX_HISTORY_BASE_URL);
    expect(url).toContain('indexType=NIFTY+50');
    expect(url).toContain('from=01-01-2019');
    expect(url).toContain('to=31-03-2019');
  });

  it('zero-pads day and month', () => {
    const from = new Date(Date.UTC(2014, 0, 2)); // 2014-01-02
    const to = new Date(Date.UTC(2014, 1, 5));   // 2014-02-05
    const url = buildNseIndexHistoryUrl(from, to);
    expect(url).toContain('from=02-01-2014');
    expect(url).toContain('to=05-02-2014');
  });

  it('uses custom indexType when provided', () => {
    const from = new Date(Date.UTC(2020, 0, 1));
    const to = new Date(Date.UTC(2020, 0, 31));
    const url = buildNseIndexHistoryUrl(from, to, 'NIFTY BANK');
    expect(url).toContain('indexType=NIFTY+BANK');
  });
});

// ---------------------------------------------------------------------------
// C. Constants
// ---------------------------------------------------------------------------

describe('module constants', () => {
  it('NSE_INDEX_EOD_SOURCE is NSE_INDEX_EOD', () => {
    expect(NSE_INDEX_EOD_SOURCE).toBe('NSE_INDEX_EOD');
  });

  it('NSE_INDEX_EOD_SYMBOL is ^NSEI', () => {
    expect(NSE_INDEX_EOD_SYMBOL).toBe('^NSEI');
  });
});

// ---------------------------------------------------------------------------
// D. parseNseIndexHistoryPayload — fixture-based (offline, no network)
// ---------------------------------------------------------------------------

describe('parseNseIndexHistoryPayload — offline fixture', () => {
  let fixture: unknown;

  beforeAll(() => {
    const fixturePath = path.resolve(
      __dirname,
      'fixtures',
      'nse-index-history.fixture.json'
    );
    fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  });

  it('parses 3 rows from the fixture', () => {
    const result = parseNseIndexHistoryPayload(fixture);
    expect(result.rows).toHaveLength(3);
    expect(result.skipped).toBe(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('first row has correct date and OHLC', () => {
    const result = parseNseIndexHistoryPayload(fixture);
    const row = result.rows[0];
    expect(row.date).toEqual(d('2019-01-01'));
    expect(row.open).toBeCloseTo(10910.10, 2);
    expect(row.high).toBeCloseTo(10987.45, 2);
    expect(row.low).toBeCloseTo(10850.30, 2);
    expect(row.close).toBeCloseTo(10961.40, 2);
  });

  it('second and third rows have correct dates', () => {
    const result = parseNseIndexHistoryPayload(fixture);
    expect(result.rows[1].date).toEqual(d('2019-01-02'));
    expect(result.rows[2].date).toEqual(d('2019-01-03'));
  });

  it('all dates are UTC midnight', () => {
    const result = parseNseIndexHistoryPayload(fixture);
    for (const row of result.rows) {
      expect(row.date.toISOString()).toMatch(/T00:00:00\.000Z$/);
    }
  });
});

// ---------------------------------------------------------------------------
// E. parseNseIndexHistoryPayload — inline unit cases
// ---------------------------------------------------------------------------

describe('parseNseIndexHistoryPayload — inline cases', () => {
  it('handles standard nested payload shape', () => {
    const payload = wrapRecords([makeRecord()]);
    const result = parseNseIndexHistoryPayload(payload);
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toBe(0);
  });

  it('returns empty rows for empty records array', () => {
    const result = parseNseIndexHistoryPayload(wrapRecords([]));
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toBe(0);
  });

  it('returns empty rows for null payload', () => {
    const result = parseNseIndexHistoryPayload(null);
    expect(result.rows).toHaveLength(0);
  });

  it('returns empty rows for empty object', () => {
    const result = parseNseIndexHistoryPayload({});
    expect(result.rows).toHaveLength(0);
  });

  it('skips and warns on missing date', () => {
    const payload = wrapRecords([makeRecord({ EOD_TIMESTAMP: '' })]);
    const result = parseNseIndexHistoryPayload(payload);
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toBe(1);
    expect(result.warnings[0]).toMatch(/date/i);
  });

  it('skips and warns on invalid date', () => {
    const payload = wrapRecords([makeRecord({ EOD_TIMESTAMP: 'not-a-date' })]);
    const result = parseNseIndexHistoryPayload(payload);
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it('skips and warns when close is missing', () => {
    const payload = wrapRecords([makeRecord({ EOD_CLOSING_INDEX_VAL: undefined })]);
    const result = parseNseIndexHistoryPayload(payload);
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toBe(1);
    expect(result.warnings[0]).toMatch(/OHLC/i);
  });

  it('skips and warns when open is zero', () => {
    const payload = wrapRecords([makeRecord({ EOD_OPEN_INDEX_VAL: 0 })]);
    const result = parseNseIndexHistoryPayload(payload);
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it('skips and warns when close is negative', () => {
    const payload = wrapRecords([makeRecord({ EOD_CLOSING_INDEX_VAL: -100 })]);
    const result = parseNseIndexHistoryPayload(payload);
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it('skips and warns when close is a non-numeric string', () => {
    const payload = wrapRecords([makeRecord({ EOD_CLOSING_INDEX_VAL: 'N/A' })]);
    const result = parseNseIndexHistoryPayload(payload);
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it('parses numeric values given as strings (NSE sometimes serialises that way)', () => {
    const payload = wrapRecords([makeRecord({
      EOD_OPEN_INDEX_VAL: '10910.10',
      EOD_HIGH_INDEX_VAL: '10987.45',
      EOD_LOW_INDEX_VAL: '10850.30',
      EOD_CLOSING_INDEX_VAL: '10961.40',
    })]);
    const result = parseNseIndexHistoryPayload(payload);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].close).toBeCloseTo(10961.40, 2);
  });

  it('parses values with thousands commas ("22,500.40")', () => {
    const payload = wrapRecords([makeRecord({
      EOD_OPEN_INDEX_VAL: '22,500.40',
      EOD_HIGH_INDEX_VAL: '22,600.00',
      EOD_LOW_INDEX_VAL: '22,400.10',
      EOD_CLOSING_INDEX_VAL: '22,550.75',
    })]);
    const result = parseNseIndexHistoryPayload(payload);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].close).toBeCloseTo(22550.75, 2);
    expect(result.rows[0].open).toBeCloseTo(22500.40, 2);
  });

  it('gracefully skips malformed (non-object) entries in the array', () => {
    const payload = wrapRecords([
      makeRecord(),
      null,
      'not-an-object',
      makeRecord({ EOD_TIMESTAMP: '02-01-2019' }),
    ]);
    const result = parseNseIndexHistoryPayload(payload);
    expect(result.rows).toHaveLength(2);
    expect(result.skipped).toBe(2);
  });

  it('accepts ISO date format (YYYY-MM-DD) in EOD_TIMESTAMP', () => {
    const payload = wrapRecords([makeRecord({ EOD_TIMESTAMP: '2019-01-01' })]);
    const result = parseNseIndexHistoryPayload(payload);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].date).toEqual(d('2019-01-01'));
  });

  it('handles duplicate dates without deduplication (caller handles idempotency)', () => {
    const payload = wrapRecords([makeRecord(), makeRecord()]);
    const result = parseNseIndexHistoryPayload(payload);
    // Parser returns all rows; idempotent DB upsert is done by the script
    expect(result.rows).toHaveLength(2);
  });

  it('accepts records passed as top-level array', () => {
    const result = parseNseIndexHistoryPayload([makeRecord()]);
    expect(result.rows).toHaveLength(1);
  });

  it('isolates per-row errors — valid rows still returned alongside skipped', () => {
    const payload = wrapRecords([
      makeRecord({ EOD_TIMESTAMP: '01-01-2019' }),
      makeRecord({ EOD_TIMESTAMP: '', EOD_CLOSING_INDEX_VAL: null }),
      makeRecord({ EOD_TIMESTAMP: '03-01-2019' }),
    ]);
    const result = parseNseIndexHistoryPayload(payload);
    expect(result.rows).toHaveLength(2);
    expect(result.skipped).toBe(1);
    const dates = result.rows.map((r) => r.date.toISOString().slice(0, 10));
    expect(dates).toContain('2019-01-01');
    expect(dates).toContain('2019-01-03');
  });

  it('includes warnings for every skipped row', () => {
    const payload = wrapRecords([
      makeRecord({ EOD_TIMESTAMP: '' }),
      makeRecord({ EOD_CLOSING_INDEX_VAL: 'bad' }),
    ]);
    const result = parseNseIndexHistoryPayload(payload);
    expect(result.warnings).toHaveLength(2);
    expect(result.skipped).toBe(2);
  });
});
