/**
 * F&O Securities in Ban Period Service — CB-24
 *
 * Sources the NSE "Securities in Ban Period" list from the free public CSV:
 *   https://nsearchives.nseindia.com/content/fo/fo_secban.csv
 *
 * These are F&O securities whose derivatives open-interest has crossed 95% of
 * the market-wide position limit (MWPL). Derivatives trading is restricted for
 * these stocks until OI drops below the threshold. This is a risk flag, not a
 * trading signal.
 *
 * Response format (raw CSV):
 *   Securities in Ban For Trade Date DD-Mon-YYYY:
 *   1,SYMBOL1
 *   2,SYMBOL2
 *   ...
 *
 * Persisted in `fno_ban_list` table (created idempotently via raw SQL).
 * The table is upserted on (ban_date, symbol) so calling ingest multiple times
 * is safe.
 */

import https from 'https';
import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FnoBanRow {
  banDate: string;   // "YYYY-MM-DD"
  symbol: string;
}

export interface FnoBanListResponse {
  status: 'ready' | 'missing' | 'error';
  source: string;
  banDate: string | null;
  fetchedAt: string;
  symbols: string[];
  count: number;
  message?: string;
}

// ---------------------------------------------------------------------------
// NSE fetch helper (mirrors fii-dii.service.ts pattern — no cookie needed)
// ---------------------------------------------------------------------------

const NSE_BAN_CSV_URL = 'https://nsearchives.nseindia.com/content/fo/fo_secban.csv';
const FETCH_TIMEOUT_MS = 8_000;

function fetchCsvText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`TIMEOUT fetching ${url}`)),
      FETCH_TIMEOUT_MS,
    );
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/csv,text/plain,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://www.nseindia.com/',
        },
      },
      (res) => {
        clearTimeout(timer);
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => { chunks.push(chunk); });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} from ${url}`));
            return;
          }
          resolve(Buffer.concat(chunks).toString('utf8'));
        });
      },
    );
    req.on('error', (err) => { clearTimeout(timer); reject(err); });
    req.on('timeout', () => { clearTimeout(timer); req.destroy(); reject(new Error('TIMEOUT')); });
  });
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse "DD-Mon-YYYY" (e.g. "08-JUN-2026") → "YYYY-MM-DD"
 * Handles both short (Jun) and upper (JUN) month abbreviations.
 */
function parseBanDate(raw: string): string | null {
  const months: Record<string, string> = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
  };
  const m = raw.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const mo = months[m[2].toUpperCase()];
  if (!mo) return null;
  return `${m[3]}-${mo}-${m[1].padStart(2, '0')}`;
}

/**
 * Parse the CSV text into a ban date and list of symbols.
 *
 * Expected format:
 *   Securities in Ban For Trade Date DD-Mon-YYYY:
 *   1,SYMBOL1
 *   2,SYMBOL2
 *   ...
 */
export function parseBanCsv(text: string): { banDate: string | null; symbols: string[] } {
  const lines = text.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { banDate: null, symbols: [] };

  // Extract date from header line
  let banDate: string | null = null;
  const header = lines[0];
  const headerMatch = header.match(/Trade Date\s+(\d{1,2}-[A-Za-z]{3}-\d{4})/i);
  if (headerMatch) {
    banDate = parseBanDate(headerMatch[1]);
  }

  // Parse symbol lines: "1,AMBER" or "2,KAYNES"
  const symbols: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 2) {
      const symbol = parts[1].trim().toUpperCase();
      if (symbol) symbols.push(symbol);
    }
  }

  return { banDate, symbols };
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function ensureTable(): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS fno_ban_list (
      id         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
      ban_date   DATE        NOT NULL,
      symbol     TEXT        NOT NULL,
      source     TEXT        NOT NULL DEFAULT 'nsearchives-fo-secban-csv',
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (ban_date, symbol)
    )
  `);
}

async function upsertBanList(banDate: string, symbols: string[], fetchedAt: Date): Promise<void> {
  const date = new Date(`${banDate}T00:00:00.000Z`);
  for (const symbol of symbols) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO fno_ban_list (id, ban_date, symbol, source, fetched_at)
      VALUES (gen_random_uuid()::text, ${date}, ${symbol}, 'nsearchives-fo-secban-csv', ${fetchedAt})
      ON CONFLICT (ban_date, symbol) DO UPDATE SET
        fetched_at = EXCLUDED.fetched_at
    `);
  }
}

async function loadLatestBanList(): Promise<{ banDate: string; symbols: string[] } | null> {
  // Determine the latest ban date in the table
  const dateRows = await prisma.$queryRaw<Array<{ ban_date: Date }>>(Prisma.sql`
    SELECT ban_date FROM fno_ban_list ORDER BY ban_date DESC LIMIT 1
  `);
  if (dateRows.length === 0) return null;

  const latestDate = dateRows[0].ban_date;
  const symbolRows = await prisma.$queryRaw<Array<{ symbol: string }>>(Prisma.sql`
    SELECT symbol FROM fno_ban_list
    WHERE ban_date = ${latestDate}
    ORDER BY symbol ASC
  `);

  return {
    banDate: latestDate.toISOString().slice(0, 10),
    symbols: symbolRows.map((r) => r.symbol),
  };
}

// ---------------------------------------------------------------------------
// Public service methods
// ---------------------------------------------------------------------------

/**
 * Ingest the latest F&O ban list from NSE archives and persist it.
 * Safe to call repeatedly (idempotent upsert on ban_date+symbol).
 */
export async function ingestFnoBanList(): Promise<{ status: string; banDate: string | null; symbolsUpserted: number; message?: string }> {
  try {
    await ensureTable();
    const csvText = await fetchCsvText(NSE_BAN_CSV_URL);
    const { banDate, symbols } = parseBanCsv(csvText);

    if (!banDate) {
      return { status: 'parse_error', banDate: null, symbolsUpserted: 0, message: 'Could not parse ban date from NSE CSV header' };
    }

    // Empty ban list is valid (no securities in ban)
    if (symbols.length === 0) {
      return { status: 'success', banDate, symbolsUpserted: 0, message: 'NSE F&O ban list is empty for this date (no securities in ban period)' };
    }

    await upsertBanList(banDate, symbols, new Date());
    return { status: 'success', banDate, symbolsUpserted: symbols.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', banDate: null, symbolsUpserted: 0, message: msg };
  }
}

/**
 * Return the latest persisted F&O ban list.
 * If the table does not exist yet, returns a missing result (never throws).
 */
export async function getLatestFnoBanList(): Promise<FnoBanListResponse> {
  const fetchedAt = new Date().toISOString();
  try {
    await ensureTable();
    const data = await loadLatestBanList();
    if (!data) {
      return {
        status: 'missing',
        source: NSE_BAN_CSV_URL,
        banDate: null,
        fetchedAt,
        symbols: [],
        count: 0,
        message: 'No F&O ban data persisted yet. Run POST /api/v1/smart-money/fno-ban/ingest.',
      };
    }
    return {
      status: 'ready',
      source: NSE_BAN_CSV_URL,
      banDate: data.banDate,
      fetchedAt,
      symbols: data.symbols,
      count: data.symbols.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 'error',
      source: NSE_BAN_CSV_URL,
      banDate: null,
      fetchedAt,
      symbols: [],
      count: 0,
      message: msg,
    };
  }
}
