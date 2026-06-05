/**
 * Bulk & Block Deals Service — CB-22
 *
 * Sources today's bulk deals and block deals from NSE's free public endpoint:
 *   https://www.nseindia.com/api/snapshot-capital-market-largedeal
 *
 * Response shape (confirmed live 05-Jun-2026):
 *   {
 *     as_on_date: "05-Jun-2026",
 *     BULK_DEALS_DATA: [{ date, symbol, name, clientName, buySell, qty, watp, remarks }],
 *     BLOCK_DEALS_DATA: [{ date, symbol, name, clientName, buySell, qty, watp, remarks }]
 *   }
 *
 * qty (shares traded) and watp (weighted average trade price, ₹) are strings.
 *
 * Persisted in `bulk_block_deals` table (idempotent CREATE TABLE IF NOT EXISTS).
 * Dedupe key: (trade_date, symbol, client_name, deal_type, qty) — same client
 * can appear multiple times for different qty blocks so we include qty.
 *
 * Same fetch pattern as fii-dii.service.ts (no cookie warm-up needed for this endpoint).
 */

import https from 'https';
import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DealType = 'BULK' | 'BLOCK';
export type DealSide = 'BUY' | 'SELL';

export interface BulkBlockDealRow {
  tradeDate: string;      // "YYYY-MM-DD"
  dealType: DealType;
  symbol: string;
  name: string;
  clientName: string;
  buySell: DealSide;
  qty: number;
  avgPrice: number;       // WATP in ₹
  remarks: string | null;
}

export interface BulkBlockDealsResponse {
  status: 'ready' | 'missing' | 'error';
  source: string;
  asOf: string | null;
  fetchedAt: string;
  rows: BulkBlockDealRow[];
  message?: string;
}

// ---------------------------------------------------------------------------
// NSE fetch
// ---------------------------------------------------------------------------

const NSE_LARGE_DEAL_URL = 'https://www.nseindia.com/api/snapshot-capital-market-largedeal';
const FETCH_TIMEOUT_MS = 7_000;

interface NseRawDeal {
  date: string;
  symbol: string;
  name: string;
  clientName: string;
  buySell: string;
  qty: string;
  watp: string;
  remarks: string | null;
}

interface NseRawResponse {
  as_on_date: string;
  BULK_DEALS_DATA: NseRawDeal[];
  BLOCK_DEALS_DATA: NseRawDeal[];
}

function fetchNseJson(url: string): Promise<NseRawResponse> {
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
            resolve(JSON.parse(body) as NseRawResponse);
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

/** "05-Jun-2026" → "2026-06-05" */
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

function normalizeSide(raw: string): DealSide | null {
  const upper = raw.trim().toUpperCase();
  if (upper === 'BUY' || upper === 'B') return 'BUY';
  if (upper === 'SELL' || upper === 'S') return 'SELL';
  return null;
}

function parseDeals(rawDeals: NseRawDeal[], dealType: DealType): BulkBlockDealRow[] {
  const result: BulkBlockDealRow[] = [];
  for (const deal of rawDeals) {
    const tradeDate = parseNseDate(deal.date);
    const buySell = normalizeSide(deal.buySell);
    if (!tradeDate || !buySell) continue;
    const qty = Number(deal.qty);
    const avgPrice = Number(deal.watp);
    if (!Number.isFinite(qty) || !Number.isFinite(avgPrice)) continue;
    result.push({
      tradeDate,
      dealType,
      symbol: deal.symbol?.trim() ?? '',
      name: deal.name?.trim() ?? '',
      clientName: deal.clientName?.trim() ?? '',
      buySell,
      qty,
      avgPrice,
      remarks: deal.remarks && deal.remarks.trim() !== '-' ? deal.remarks.trim() : null,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function ensureTable(): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS bulk_block_deals (
      id           TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
      trade_date   DATE          NOT NULL,
      deal_type    TEXT          NOT NULL,
      symbol       TEXT          NOT NULL,
      name         TEXT          NOT NULL,
      client_name  TEXT          NOT NULL,
      buy_sell     TEXT          NOT NULL,
      qty          BIGINT        NOT NULL,
      avg_price    NUMERIC(14,4) NOT NULL,
      remarks      TEXT,
      source       TEXT          NOT NULL DEFAULT 'nse-largedeal',
      fetched_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      PRIMARY KEY (trade_date, symbol, client_name, deal_type, qty)
    )
  `);
}

async function upsertDeals(rows: BulkBlockDealRow[], fetchedAt: Date): Promise<void> {
  for (const row of rows) {
    const tradeDate = new Date(`${row.tradeDate}T00:00:00.000Z`);
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO bulk_block_deals
        (id, trade_date, deal_type, symbol, name, client_name, buy_sell, qty, avg_price, remarks, source, fetched_at, updated_at)
      VALUES
        (gen_random_uuid()::text, ${tradeDate}, ${row.dealType}, ${row.symbol}, ${row.name}, ${row.clientName},
         ${row.buySell}, ${row.qty}, ${row.avgPrice}, ${row.remarks}, 'nse-largedeal', ${fetchedAt}, NOW())
      ON CONFLICT (trade_date, symbol, client_name, deal_type, qty) DO UPDATE SET
        name        = EXCLUDED.name,
        buy_sell    = EXCLUDED.buy_sell,
        avg_price   = EXCLUDED.avg_price,
        remarks     = EXCLUDED.remarks,
        fetched_at  = EXCLUDED.fetched_at,
        updated_at  = NOW()
    `);
  }
}

async function loadDeals(days: number): Promise<BulkBlockDealRow[]> {
  const rows = await prisma.$queryRaw<Array<{
    trade_date: Date;
    deal_type: string;
    symbol: string;
    name: string;
    client_name: string;
    buy_sell: string;
    qty: bigint;
    avg_price: string;
    remarks: string | null;
  }>>(Prisma.sql`
    SELECT trade_date, deal_type, symbol, name, client_name, buy_sell, qty, avg_price, remarks
    FROM bulk_block_deals
    WHERE trade_date >= CURRENT_DATE - (${Math.min(days, 30)} - 1) * INTERVAL '1 day'
    ORDER BY trade_date DESC, deal_type ASC, avg_price * qty DESC
    LIMIT 500
  `);
  return rows.map((r) => ({
    tradeDate: r.trade_date.toISOString().slice(0, 10),
    dealType: r.deal_type as DealType,
    symbol: r.symbol,
    name: r.name,
    clientName: r.client_name,
    buySell: r.buy_sell as DealSide,
    qty: Number(r.qty),
    avgPrice: Number(r.avg_price),
    remarks: r.remarks ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Public service methods
// ---------------------------------------------------------------------------

/**
 * Ingest today's bulk & block deals from NSE and persist them.
 * Safe to call repeatedly (idempotent upsert on primary key).
 */
export async function ingestBulkBlockDeals(): Promise<{
  status: string;
  rowsUpserted: number;
  bulkCount: number;
  blockCount: number;
  message?: string;
}> {
  try {
    await ensureTable();
    const raw = await fetchNseJson(NSE_LARGE_DEAL_URL);
    const bulkRows  = parseDeals(raw.BULK_DEALS_DATA  ?? [], 'BULK');
    const blockRows = parseDeals(raw.BLOCK_DEALS_DATA ?? [], 'BLOCK');
    const all = [...bulkRows, ...blockRows];
    if (all.length === 0) {
      return { status: 'no_data', rowsUpserted: 0, bulkCount: 0, blockCount: 0, message: 'NSE returned 0 parseable deals' };
    }
    await upsertDeals(all, new Date());
    return { status: 'success', rowsUpserted: all.length, bulkCount: bulkRows.length, blockCount: blockRows.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', rowsUpserted: 0, bulkCount: 0, blockCount: 0, message: msg };
  }
}

/**
 * Return bulk & block deals for the last N calendar days from the DB.
 * Never throws — returns error status on failure.
 */
export async function getLatestBulkBlockDeals(days: number = 1): Promise<BulkBlockDealsResponse> {
  const fetchedAt = new Date().toISOString();
  try {
    await ensureTable();
    const rows = await loadDeals(days);
    if (rows.length === 0) {
      return {
        status: 'missing',
        source: NSE_LARGE_DEAL_URL,
        asOf: null,
        fetchedAt,
        rows: [],
        message: 'No bulk/block deal data persisted yet. Run POST /api/v1/market-context/bulk-block-deals/ingest.',
      };
    }
    return {
      status: 'ready',
      source: NSE_LARGE_DEAL_URL,
      asOf: rows[0].tradeDate,
      fetchedAt,
      rows,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 'error',
      source: NSE_LARGE_DEAL_URL,
      asOf: null,
      fetchedAt,
      rows: [],
      message: msg,
    };
  }
}
