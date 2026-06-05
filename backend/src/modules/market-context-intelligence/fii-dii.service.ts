/**
 * FII/DII Activity Service — CB-21
 *
 * Sources daily net FII (Foreign Institutional Investor) and DII (Domestic
 * Institutional Investor) cash-market buy/sell figures from NSE's free
 * public endpoint: https://www.nseindia.com/api/fiidiiTradeReact
 *
 * Response format (array of 2 rows):
 *   { category: "DII" | "FII/FPI", date: "DD-Mon-YYYY",
 *     buyValue: "<Cr>", sellValue: "<Cr>", netValue: "<Cr>" }
 *
 * All amounts are ₹ Crore (as NSE publishes them).
 *
 * Persisted in `fii_dii_snapshots` table (created idempotently via raw SQL
 * because we are not adding a Prisma migration to avoid model-regen noise).
 * The table is upserted on (trading_date, category) so calling ingest multiple
 * times is safe.
 */

import https from 'https';
import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FiiDiiRow {
  tradingDate: string;    // "YYYY-MM-DD"
  category: 'FII' | 'DII';
  buyValueCr: number;
  sellValueCr: number;
  netValueCr: number;
}

export interface FiiDiiActivityResponse {
  status: 'ready' | 'missing' | 'error';
  source: string;
  asOf: string | null;
  fetchedAt: string;
  rows: FiiDiiRow[];
  message?: string;
}

// ---------------------------------------------------------------------------
// NSE fetch helper
// ---------------------------------------------------------------------------

const NSE_FII_DII_URL = 'https://www.nseindia.com/api/fiidiiTradeReact';
const FETCH_TIMEOUT_MS = 7_000;

interface NseRawRow {
  category: string;
  date: string;
  buyValue: string;
  sellValue: string;
  netValue: string;
}

function fetchNseJson(url: string): Promise<NseRawRow[]> {
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
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://www.nseindia.com/',
        },
      },
      (res) => {
        clearTimeout(timer);
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} from ${url}`));
            return;
          }
          try {
            resolve(JSON.parse(body) as NseRawRow[]);
          } catch (e) {
            reject(new Error(`JSON parse error: ${String(e)}`));
          }
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
 * Parse "05-Jun-2026" → "2026-06-05"
 */
function parseNseDate(raw: string): string | null {
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const m = raw.trim().match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const mo = months[m[2]];
  if (!mo) return null;
  return `${m[3]}-${mo}-${m[1]}`;
}

function normalizeCategory(raw: string): 'FII' | 'DII' | null {
  const upper = raw.trim().toUpperCase();
  if (upper === 'DII') return 'DII';
  if (upper.startsWith('FII') || upper.startsWith('FPI')) return 'FII';
  return null;
}

function parseRows(raw: NseRawRow[]): FiiDiiRow[] {
  const result: FiiDiiRow[] = [];
  for (const row of raw) {
    const tradingDate = parseNseDate(row.date);
    const category = normalizeCategory(row.category);
    if (!tradingDate || !category) continue;
    const buyValueCr  = Number(row.buyValue);
    const sellValueCr = Number(row.sellValue);
    const netValueCr  = Number(row.netValue);
    if (!Number.isFinite(buyValueCr) || !Number.isFinite(sellValueCr) || !Number.isFinite(netValueCr)) continue;
    result.push({ tradingDate, category, buyValueCr, sellValueCr, netValueCr });
  }
  return result;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function ensureTable(): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS fii_dii_snapshots (
      id             TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
      trading_date   DATE        NOT NULL,
      category       TEXT        NOT NULL,
      buy_value_cr   NUMERIC(14,2) NOT NULL,
      sell_value_cr  NUMERIC(14,2) NOT NULL,
      net_value_cr   NUMERIC(14,2) NOT NULL,
      source         TEXT        NOT NULL DEFAULT 'nse-fiidii-trade-react',
      fetched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (trading_date, category)
    )
  `);
}

async function upsertRows(rows: FiiDiiRow[], fetchedAt: Date): Promise<void> {
  for (const row of rows) {
    const tradingDate = new Date(`${row.tradingDate}T00:00:00.000Z`);
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO fii_dii_snapshots
        (id, trading_date, category, buy_value_cr, sell_value_cr, net_value_cr, source, fetched_at, updated_at)
      VALUES
        (gen_random_uuid()::text, ${tradingDate}, ${row.category}, ${row.buyValueCr}, ${row.sellValueCr}, ${row.netValueCr}, 'nse-fiidii-trade-react', ${fetchedAt}, NOW())
      ON CONFLICT (trading_date, category) DO UPDATE SET
        buy_value_cr  = EXCLUDED.buy_value_cr,
        sell_value_cr = EXCLUDED.sell_value_cr,
        net_value_cr  = EXCLUDED.net_value_cr,
        fetched_at    = EXCLUDED.fetched_at,
        updated_at    = NOW()
    `);
  }
}

async function loadLatestRows(limit: number): Promise<FiiDiiRow[]> {
  const rows = await prisma.$queryRaw<Array<{
    trading_date: Date;
    category: string;
    buy_value_cr: string;
    sell_value_cr: string;
    net_value_cr: string;
  }>>(Prisma.sql`
    SELECT trading_date, category, buy_value_cr, sell_value_cr, net_value_cr
    FROM fii_dii_snapshots
    ORDER BY trading_date DESC, category ASC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({
    tradingDate: r.trading_date.toISOString().slice(0, 10),
    category: r.category as 'FII' | 'DII',
    buyValueCr:  Number(r.buy_value_cr),
    sellValueCr: Number(r.sell_value_cr),
    netValueCr:  Number(r.net_value_cr),
  }));
}

// ---------------------------------------------------------------------------
// Public service methods
// ---------------------------------------------------------------------------

/**
 * Ingest the latest FII/DII figures from NSE and persist them.
 * Safe to call repeatedly (idempotent upsert).
 */
export async function ingestFiiDii(): Promise<{ status: string; rowsUpserted: number; message?: string }> {
  try {
    await ensureTable();
    const raw = await fetchNseJson(NSE_FII_DII_URL);
    const rows = parseRows(raw);
    if (rows.length === 0) {
      return { status: 'no_data', rowsUpserted: 0, message: 'NSE returned 0 parseable rows' };
    }
    await upsertRows(rows, new Date());
    return { status: 'success', rowsUpserted: rows.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', rowsUpserted: 0, message: msg };
  }
}

/**
 * Return the latest N trading days' FII/DII snapshots from the DB.
 * If the table does not exist yet, returns an empty result (never throws).
 * `days` controls how many distinct trading dates to surface; we fetch
 * (days * 2) rows to cover both FII and DII per day.
 */
export async function getLatestFiiDiiActivity(days: number = 5): Promise<FiiDiiActivityResponse> {
  const fetchedAt = new Date().toISOString();
  try {
    await ensureTable();
    const limit = Math.min(days, 30) * 2;  // FII + DII per day
    const rows = await loadLatestRows(limit);
    if (rows.length === 0) {
      return {
        status: 'missing',
        source: NSE_FII_DII_URL,
        asOf: null,
        fetchedAt,
        rows: [],
        message: 'No FII/DII data persisted yet. Run POST /api/v1/market-context/fii-dii/ingest.',
      };
    }
    return {
      status: 'ready',
      source: NSE_FII_DII_URL,
      asOf: rows[0].tradingDate,
      fetchedAt,
      rows,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 'error',
      source: NSE_FII_DII_URL,
      asOf: null,
      fetchedAt,
      rows: [],
      message: msg,
    };
  }
}
