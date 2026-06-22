/// <reference types="@types/jest" />
/**
 * Offline unit tests for the NSE archives bhavcopy CSV parser.
 *
 * ALL tests run fully offline — no network calls whatsoever.
 * The fixture CSV is a realistic multi-row ind_close_all_DDMMYYYY.csv
 * that mirrors the real NSE archives format.
 *
 * Coverage:
 *   A. buildBhavcopyCsvUrl  — URL construction
 *   B. parseIndexBhavcopyCsv — fixture-based (realistic multi-row CSV)
 *   C. parseIndexBhavcopyCsv — inline edge-cases
 *   D. Constant re-exports
 */

import path from 'path';
import fs   from 'fs';
import {
  parseIndexBhavcopyCsv,
  buildBhavcopyCsvUrl,
  NSE_INDEX_EOD_SOURCE,
  NSE_INDEX_EOD_SYMBOL,
} from '../../../src/modules/market-data-foundation/ingestion/india/market-data-foundation.nse-bhavcopy-index-source';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Load the bundled fixture CSV. */
const loadFixture = (name: string): string =>
  fs.readFileSync(
    path.resolve(__dirname, 'fixtures', name),
    'utf8',
  );

// ---------------------------------------------------------------------------
// A. buildBhavcopyCsvUrl
// ---------------------------------------------------------------------------

describe('buildBhavcopyCsvUrl', () => {
  it('formats a date as DDMMYYYY in the URL', () => {
    const d = new Date(Date.UTC(2024, 0, 2)); // 2024-01-02
    const url = buildBhavcopyCsvUrl(d);
    expect(url).toBe(
      'https://archives.nseindia.com/content/indices/ind_close_all_02012024.csv',
    );
  });

  it('zero-pads single-digit day and month', () => {
    const d = new Date(Date.UTC(2020, 2, 5)); // 2020-03-05
    expect(buildBhavcopyCsvUrl(d)).toContain('ind_close_all_05032020.csv');
  });

  it('handles end-of-year date', () => {
    const d = new Date(Date.UTC(2023, 11, 29)); // 2023-12-29
    expect(buildBhavcopyCsvUrl(d)).toContain('ind_close_all_29122023.csv');
  });
});

// ---------------------------------------------------------------------------
// B. parseIndexBhavcopyCsv — fixture-based (offline, no network)
// ---------------------------------------------------------------------------

describe('parseIndexBhavcopyCsv — fixture (ind_close_all_02012024.csv)', () => {
  let csv: string;

  beforeAll(() => {
    csv = loadFixture('ind_close_all_02012024.csv');
  });

  it('parses the Nifty 50 row successfully', () => {
    const result = parseIndexBhavcopyCsv(csv);
    expect(result).not.toBeNull();
  });

  it('returns correct date in YYYY-MM-DD format', () => {
    const result = parseIndexBhavcopyCsv(csv)!;
    expect(result.date).toBe('2024-01-02');
  });

  it('returns correct OHLC values', () => {
    const result = parseIndexBhavcopyCsv(csv)!;
    expect(result.open).toBeCloseTo(21751.35, 2);
    expect(result.high).toBeCloseTo(21755.60, 2);
    expect(result.low).toBeCloseTo(21555.65, 2);
    expect(result.close).toBeCloseTo(21665.80, 2);
  });

  it('returns null for a non-existent index name', () => {
    expect(parseIndexBhavcopyCsv(csv, 'Nifty Realty')).toBeNull();
  });

  it('case-insensitive index name matching', () => {
    const lower = parseIndexBhavcopyCsv(csv, 'nifty 50');
    const upper = parseIndexBhavcopyCsv(csv, 'NIFTY 50');
    expect(lower).not.toBeNull();
    expect(upper).not.toBeNull();
    expect(lower!.close).toBeCloseTo(21665.80, 2);
  });

  it('can extract Nifty Bank from the same file', () => {
    const result = parseIndexBhavcopyCsv(csv, 'Nifty Bank');
    expect(result).not.toBeNull();
    expect(result!.date).toBe('2024-01-02');
    expect(result!.open).toBeCloseTo(48010.90, 2);
  });
});

// ---------------------------------------------------------------------------
// C. parseIndexBhavcopyCsv — inline edge cases
// ---------------------------------------------------------------------------

/** Minimal valid CSV with one Nifty 50 row. */
const MINIMAL_CSV = [
  'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value,Points Change,Change(%),Volume,Turnover (Rs. Cr.),P/E,P/B,Div Yield',
  'Nifty 50,02-01-2024,21751.35,21755.60,21555.65,21665.80,-85.55,-0.39,287430000,19832.47,22.69,4.17,1.25',
].join('\n');

describe('parseIndexBhavcopyCsv — inline edge cases', () => {

  // ---- Basics ----

  it('parses a minimal valid CSV', () => {
    const result = parseIndexBhavcopyCsv(MINIMAL_CSV);
    expect(result).not.toBeNull();
    expect(result!.date).toBe('2024-01-02');
    expect(result!.close).toBeCloseTo(21665.80, 2);
  });

  it('returns null for empty string', () => {
    expect(parseIndexBhavcopyCsv('')).toBeNull();
  });

  it('returns null for header-only CSV (no data rows)', () => {
    const headerOnly =
      'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value';
    expect(parseIndexBhavcopyCsv(headerOnly)).toBeNull();
  });

  it('returns null for HTML content (e.g. 404 page)', () => {
    const html = '<!DOCTYPE html><html><head><title>Error</title></head><body>Not Found</body></html>';
    expect(parseIndexBhavcopyCsv(html)).toBeNull();
  });

  // ---- Date format ----

  it('converts DD-MM-YYYY (primary bhavcopy format) to YYYY-MM-DD', () => {
    const csv = MINIMAL_CSV; // already DD-MM-YYYY
    expect(parseIndexBhavcopyCsv(csv)!.date).toBe('2024-01-02');
  });

  it('pads single-digit day and month in the output date', () => {
    const csv = [
      'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value,P/E,P/B,Div Yield',
      'Nifty 50,5-3-2023,17500.00,17600.00,17400.00,17550.00,22.00,4.00,1.20',
    ].join('\n');
    const result = parseIndexBhavcopyCsv(csv);
    expect(result).not.toBeNull();
    expect(result!.date).toBe('2023-03-05');
  });

  it('accepts ISO YYYY-MM-DD date format too', () => {
    const csv = [
      'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value',
      'Nifty 50,2024-01-02,21751.35,21755.60,21555.65,21665.80',
    ].join('\n');
    const result = parseIndexBhavcopyCsv(csv);
    expect(result).not.toBeNull();
    expect(result!.date).toBe('2024-01-02');
  });

  // ---- Thousands commas ----

  it('strips thousands commas from OHLC values', () => {
    const csv = [
      'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value',
      'Nifty 50,02-01-2024,"21,751.35","21,755.60","21,555.65","21,665.80"',
    ].join('\n');
    const result = parseIndexBhavcopyCsv(csv);
    expect(result).not.toBeNull();
    expect(result!.open).toBeCloseTo(21751.35, 2);
    expect(result!.close).toBeCloseTo(21665.80, 2);
  });

  // ---- Multi-index file — correct row selection ----

  it('returns only the requested index row when file has multiple indices', () => {
    const csv = [
      'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value',
      'Nifty Bank,02-01-2024,48010.90,48244.05,47597.90,47817.80',
      'Nifty 50,02-01-2024,21751.35,21755.60,21555.65,21665.80',
      'Nifty IT,02-01-2024,35053.40,35092.05,34491.30,34566.55',
    ].join('\n');
    const nifty50 = parseIndexBhavcopyCsv(csv, 'Nifty 50');
    const niftyIT = parseIndexBhavcopyCsv(csv, 'Nifty IT');
    expect(nifty50!.close).toBeCloseTo(21665.80, 2);
    expect(niftyIT!.close).toBeCloseTo(34566.55, 2);
  });

  // ---- Holiday / missing row ----

  it('returns null when the target index row is missing (e.g. holiday file)', () => {
    const holidayCsv = [
      'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value',
      'Nifty Bank,02-01-2024,48010.90,48244.05,47597.90,47817.80',
    ].join('\n');
    expect(parseIndexBhavcopyCsv(holidayCsv, 'Nifty 50')).toBeNull();
  });

  // ---- Bad OHLC values ----

  it('returns null when a required OHLC value is zero', () => {
    const csv = [
      'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value',
      'Nifty 50,02-01-2024,0,21755.60,21555.65,21665.80',
    ].join('\n');
    expect(parseIndexBhavcopyCsv(csv)).toBeNull();
  });

  it('returns null when a required OHLC value is negative', () => {
    const csv = [
      'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value',
      'Nifty 50,02-01-2024,21751.35,21755.60,21555.65,-21665.80',
    ].join('\n');
    expect(parseIndexBhavcopyCsv(csv)).toBeNull();
  });

  it('returns null when a required OHLC value is non-numeric', () => {
    const csv = [
      'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value',
      'Nifty 50,02-01-2024,21751.35,N/A,21555.65,21665.80',
    ].join('\n');
    expect(parseIndexBhavcopyCsv(csv)).toBeNull();
  });

  // ---- Malformed date ----

  it('returns null when the date field is invalid', () => {
    const csv = [
      'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value',
      'Nifty 50,not-a-date,21751.35,21755.60,21555.65,21665.80',
    ].join('\n');
    expect(parseIndexBhavcopyCsv(csv)).toBeNull();
  });

  // ---- Windows CRLF ----

  it('handles Windows CRLF line endings', () => {
    const csv = MINIMAL_CSV.replace(/\n/g, '\r\n');
    const result = parseIndexBhavcopyCsv(csv);
    expect(result).not.toBeNull();
    expect(result!.date).toBe('2024-01-02');
  });

  // ---- Default indexName ----

  it('defaults to Nifty 50 when no indexName argument is given', () => {
    const result = parseIndexBhavcopyCsv(MINIMAL_CSV);
    expect(result).not.toBeNull();
    expect(result!.close).toBeCloseTo(21665.80, 2);
  });

  // ---- Wrong header (e.g. wrong CSV type) ----

  it('returns null when the CSV does not contain the expected bhavcopy header', () => {
    const wrongCsv = 'SYMBOL,SERIES,PREV_CLOSE,OPEN_PRICE,HIGH_PRICE,LOW_PRICE\nINFY,EQ,1500,1510,1525,1495';
    expect(parseIndexBhavcopyCsv(wrongCsv)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// D. Constant re-exports
// ---------------------------------------------------------------------------

describe('module constant re-exports', () => {
  it('NSE_INDEX_EOD_SOURCE is NSE_INDEX_EOD', () => {
    expect(NSE_INDEX_EOD_SOURCE).toBe('NSE_INDEX_EOD');
  });

  it('NSE_INDEX_EOD_SYMBOL is ^NSEI', () => {
    expect(NSE_INDEX_EOD_SYMBOL).toBe('^NSEI');
  });
});
