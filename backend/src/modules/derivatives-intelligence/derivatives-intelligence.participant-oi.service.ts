/**
 * Participant-wise Open Interest — FII Derivatives Positioning — Derivatives Intelligence
 *
 * Sources the NSE "Participant wise Open Interest" free CSV:
 *   https://nsearchives.nseindia.com/content/nsccl/fao_participant_oi_DDMMYYYY.csv
 *
 * Reports the net long/short OI (in contracts) of each participant class —
 * Client, DII, FII, Pro — across index futures/options and stock futures/options.
 * The FII net index-futures position is a widely-watched directional sentiment
 * gauge. Plain CSV (no zip). Persisted in `fo_participant_oi`, upserted on
 * (trading_date, participant) so re-ingest is safe.
 *
 * Research-support only — descriptive positioning, never trade advice.
 */

import https from 'https';
import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';

const PARTICIPANT_OI_BASE = 'https://nsearchives.nseindia.com/content/nsccl';
const FETCH_TIMEOUT_MS = 10_000;
const PARTICIPANTS = ['Client', 'DII', 'FII', 'Pro'];

export interface ParticipantOiRow {
  participant: string;
  futureIndexLong: number;
  futureIndexShort: number;
  futureStockLong: number;
  futureStockShort: number;
  optionIndexCallLong: number;
  optionIndexPutLong: number;
  optionIndexCallShort: number;
  optionIndexPutShort: number;
  optionStockCallLong: number;
  optionStockPutLong: number;
  optionStockCallShort: number;
  optionStockPutShort: number;
  totalLong: number;
  totalShort: number;
  /** futureIndexLong − futureIndexShort (directional sentiment proxy) */
  netIndexFutures: number;
  netStockFutures: number;
}

export interface ParticipantOiResponse {
  status: 'ready' | 'missing' | 'error';
  source: string;
  tradingDate: string | null;
  fetchedAt: string;
  rows: ParticipantOiRow[];
  message?: string;
}

export interface ParticipantOiIngestResult {
  status: 'success' | 'no_data' | 'parse_error' | 'error';
  tradingDate: string | null;
  rowsUpserted: number;
  message?: string;
}

// ---------------------------------------------------------------------------
// Date helpers (IST)
// ---------------------------------------------------------------------------

function nowInIst(): Date {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000);
}
function pad2(n: number): string { return String(n).padStart(2, '0'); }
function ddmmyyyy(d: Date): string {
  return `${pad2(d.getUTCDate())}${pad2(d.getUTCMonth() + 1)}${d.getUTCFullYear()}`;
}

const MONTHS: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

/** Parse "Jun 05, 2026" (from the title line) → "2026-06-05". */
function parseTitleDate(text: string): string | null {
  const m = text.match(/as on\s+([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})/i);
  if (!m) return null;
  const mo = MONTHS[m[1].toUpperCase()];
  if (!mo) return null;
  return `${m[3]}-${mo}-${m[2].padStart(2, '0')}`;
}

function url(dt: string): string {
  return `${PARTICIPANT_OI_BASE}/fao_participant_oi_${dt}.csv`;
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

function fetchCsv(u: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`TIMEOUT fetching ${u}`)), FETCH_TIMEOUT_MS);
    const req = https.get(u, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/csv,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://www.nseindia.com/',
      },
    }, (res) => {
      const statusCode = res.statusCode ?? 0;
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => { clearTimeout(timer); resolve({ statusCode, body: Buffer.concat(chunks).toString('utf8') }); });
    });
    req.on('error', (err) => { clearTimeout(timer); reject(err); });
    req.on('timeout', () => { clearTimeout(timer); req.destroy(); reject(new Error('TIMEOUT')); });
  });
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function toInt(raw: string | undefined): number {
  if (raw === undefined) return 0;
  const n = Number(raw.replace(/[",\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse the participant-wise OI CSV.
 * Line 0: title with the as-on date. Line 1: header. Lines 2..: Client/DII/FII/Pro/TOTAL.
 * Column order is positional and stable, but we also tolerate header whitespace.
 */
export function parseParticipantOi(text: string): { tradingDate: string | null; rows: ParticipantOiRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 3) return { tradingDate: null, rows: [] };

  const tradingDate = parseTitleDate(lines[0]);

  const rows: ParticipantOiRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const participant = cols[0]?.replace(/"/g, '').trim();
    if (!participant || !PARTICIPANTS.includes(participant)) continue;

    const futureIndexLong = toInt(cols[1]);
    const futureIndexShort = toInt(cols[2]);
    const futureStockLong = toInt(cols[3]);
    const futureStockShort = toInt(cols[4]);
    rows.push({
      participant,
      futureIndexLong,
      futureIndexShort,
      futureStockLong,
      futureStockShort,
      optionIndexCallLong: toInt(cols[5]),
      optionIndexPutLong: toInt(cols[6]),
      optionIndexCallShort: toInt(cols[7]),
      optionIndexPutShort: toInt(cols[8]),
      optionStockCallLong: toInt(cols[9]),
      optionStockPutLong: toInt(cols[10]),
      optionStockCallShort: toInt(cols[11]),
      optionStockPutShort: toInt(cols[12]),
      totalLong: toInt(cols[13]),
      totalShort: toInt(cols[14]),
      netIndexFutures: futureIndexLong - futureIndexShort,
      netStockFutures: futureStockLong - futureStockShort,
    });
  }

  return { tradingDate, rows };
}

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------

async function ensureTable(): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS fo_participant_oi (
      trading_date            DATE        NOT NULL,
      participant             TEXT        NOT NULL,
      future_index_long       BIGINT      NOT NULL DEFAULT 0,
      future_index_short      BIGINT      NOT NULL DEFAULT 0,
      future_stock_long       BIGINT      NOT NULL DEFAULT 0,
      future_stock_short      BIGINT      NOT NULL DEFAULT 0,
      option_index_call_long  BIGINT      NOT NULL DEFAULT 0,
      option_index_put_long   BIGINT      NOT NULL DEFAULT 0,
      option_index_call_short BIGINT      NOT NULL DEFAULT 0,
      option_index_put_short  BIGINT      NOT NULL DEFAULT 0,
      option_stock_call_long  BIGINT      NOT NULL DEFAULT 0,
      option_stock_put_long   BIGINT      NOT NULL DEFAULT 0,
      option_stock_call_short BIGINT      NOT NULL DEFAULT 0,
      option_stock_put_short  BIGINT      NOT NULL DEFAULT 0,
      total_long              BIGINT      NOT NULL DEFAULT 0,
      total_short             BIGINT      NOT NULL DEFAULT 0,
      source                  TEXT        NOT NULL DEFAULT 'nse-participant-oi',
      fetched_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (trading_date, participant)
    )
  `);
}

async function upsertRows(tradingDate: string, rows: ParticipantOiRow[], fetchedAt: Date): Promise<void> {
  const td = new Date(`${tradingDate}T00:00:00.000Z`);
  for (const r of rows) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO fo_participant_oi (
        trading_date, participant, future_index_long, future_index_short,
        future_stock_long, future_stock_short, option_index_call_long, option_index_put_long,
        option_index_call_short, option_index_put_short, option_stock_call_long, option_stock_put_long,
        option_stock_call_short, option_stock_put_short, total_long, total_short, fetched_at
      ) VALUES (
        ${td}, ${r.participant}, ${r.futureIndexLong}, ${r.futureIndexShort},
        ${r.futureStockLong}, ${r.futureStockShort}, ${r.optionIndexCallLong}, ${r.optionIndexPutLong},
        ${r.optionIndexCallShort}, ${r.optionIndexPutShort}, ${r.optionStockCallLong}, ${r.optionStockPutLong},
        ${r.optionStockCallShort}, ${r.optionStockPutShort}, ${r.totalLong}, ${r.totalShort}, ${fetchedAt}
      )
      ON CONFLICT (trading_date, participant) DO UPDATE SET
        future_index_long = EXCLUDED.future_index_long,
        future_index_short = EXCLUDED.future_index_short,
        future_stock_long = EXCLUDED.future_stock_long,
        future_stock_short = EXCLUDED.future_stock_short,
        option_index_call_long = EXCLUDED.option_index_call_long,
        option_index_put_long = EXCLUDED.option_index_put_long,
        option_index_call_short = EXCLUDED.option_index_call_short,
        option_index_put_short = EXCLUDED.option_index_put_short,
        option_stock_call_long = EXCLUDED.option_stock_call_long,
        option_stock_put_long = EXCLUDED.option_stock_put_long,
        option_stock_call_short = EXCLUDED.option_stock_call_short,
        option_stock_put_short = EXCLUDED.option_stock_put_short,
        total_long = EXCLUDED.total_long,
        total_short = EXCLUDED.total_short,
        fetched_at = EXCLUDED.fetched_at
    `);
  }
}

// ---------------------------------------------------------------------------
// Public service methods
// ---------------------------------------------------------------------------

/** Ingest participant-wise OI (defaults to today IST, falling back over holidays). Never throws on 404. */
export async function ingestParticipantOi(dateOverride?: string): Promise<ParticipantOiIngestResult> {
  try {
    await ensureTable();
    const candidates: string[] = [];
    if (dateOverride) {
      const [y, m, d] = dateOverride.split('-');
      candidates.push(`${d}${m}${y}`);
    } else {
      const ist = nowInIst();
      for (let back = 0; back < 6; back += 1) {
        candidates.push(ddmmyyyy(new Date(ist.getTime() - back * 86_400_000)));
      }
    }

    let lastStatus = 0;
    for (const dt of candidates) {
      const { statusCode, body } = await fetchCsv(url(dt));
      lastStatus = statusCode;
      if (statusCode === 200 && body.trim().length > 0) {
        const { tradingDate, rows } = parseParticipantOi(body);
        if (!tradingDate || rows.length === 0) {
          return { status: 'parse_error', tradingDate, rowsUpserted: 0, message: 'Participant OI parsed to zero rows.' };
        }
        await upsertRows(tradingDate, rows, new Date());
        return { status: 'success', tradingDate, rowsUpserted: rows.length };
      }
    }
    return {
      status: 'no_data', tradingDate: null, rowsUpserted: 0,
      message: `No participant OI available for the last 6 days (last HTTP ${lastStatus}). Likely a market holiday.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', tradingDate: null, rowsUpserted: 0, message: msg };
  }
}

/** Persisted-read of the latest participant-wise OI. Never computes / ingests. */
export async function getLatestParticipantOi(): Promise<ParticipantOiResponse> {
  const fetchedAt = new Date().toISOString();
  try {
    await ensureTable();
    const dateRows = await prisma.$queryRaw<Array<{ d: Date }>>(Prisma.sql`
      SELECT MAX(trading_date) AS d FROM fo_participant_oi
    `);
    const latest = dateRows[0]?.d ?? null;
    if (!latest) {
      return {
        status: 'missing', source: PARTICIPANT_OI_BASE, tradingDate: null, fetchedAt, rows: [],
        message: 'No participant OI persisted yet. Run POST /api/v1/derivatives/participant-oi/ingest.',
      };
    }
    const raw = await prisma.$queryRaw<Array<Record<string, bigint | number | string>>>(Prisma.sql`
      SELECT participant, future_index_long, future_index_short, future_stock_long, future_stock_short,
             option_index_call_long, option_index_put_long, option_index_call_short, option_index_put_short,
             option_stock_call_long, option_stock_put_long, option_stock_call_short, option_stock_put_short,
             total_long, total_short
      FROM fo_participant_oi
      WHERE trading_date = ${latest}
      ORDER BY CASE participant WHEN 'FII' THEN 0 WHEN 'DII' THEN 1 WHEN 'Pro' THEN 2 ELSE 3 END
    `);
    const n = (v: bigint | number | string | undefined) => Number(v ?? 0);
    return {
      status: 'ready',
      source: PARTICIPANT_OI_BASE,
      tradingDate: latest.toISOString().slice(0, 10),
      fetchedAt,
      rows: raw.map((r) => {
        const futureIndexLong = n(r.future_index_long);
        const futureIndexShort = n(r.future_index_short);
        const futureStockLong = n(r.future_stock_long);
        const futureStockShort = n(r.future_stock_short);
        return {
          participant: String(r.participant),
          futureIndexLong,
          futureIndexShort,
          futureStockLong,
          futureStockShort,
          optionIndexCallLong: n(r.option_index_call_long),
          optionIndexPutLong: n(r.option_index_put_long),
          optionIndexCallShort: n(r.option_index_call_short),
          optionIndexPutShort: n(r.option_index_put_short),
          optionStockCallLong: n(r.option_stock_call_long),
          optionStockPutLong: n(r.option_stock_put_long),
          optionStockCallShort: n(r.option_stock_call_short),
          optionStockPutShort: n(r.option_stock_put_short),
          totalLong: n(r.total_long),
          totalShort: n(r.total_short),
          netIndexFutures: futureIndexLong - futureIndexShort,
          netStockFutures: futureStockLong - futureStockShort,
        };
      }),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', source: PARTICIPANT_OI_BASE, tradingDate: null, fetchedAt, rows: [], message: msg };
  }
}
