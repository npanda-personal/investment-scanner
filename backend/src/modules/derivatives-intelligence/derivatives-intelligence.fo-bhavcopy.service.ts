/**
 * F&O (Derivatives) Bhavcopy Ingest Service — Derivatives Intelligence
 *
 * Sources the NSE End-Of-Day F&O bhavcopy (UDiFF format) from the free public
 * archive zip:
 *   https://nsearchives.nseindia.com/content/fo/BhavCopy_NSE_FO_0_0_0_YYYYMMDD_F_0000.csv.zip
 *
 * This single file carries per-contract EOD data for ALL NSE futures & options
 * (index + stock): instrument type, underlying, expiry, strike, option type,
 * settle price, open interest, change-in-OI, traded volume and lot size.
 * From it we derive OI buildup (this module), PCR / max-pain / support-resistance
 * (option-metrics service) — all persisted, all free, NSE-only.
 *
 * Persisted in `fo_bhavcopy_contracts` (raw per-contract landing table, created
 * idempotently via raw SQL). Upserted on the natural contract key so re-ingesting
 * the same day is safe. Futures rows use sentinels (strike_price = 0,
 * option_type = 'XX') so the composite key is never NULL.
 *
 * Accuracy/constraint notes:
 * - NSE OpnIntrst is in CONTRACTS (lots), not shares. Stored raw; multiply by
 *   lot size only for notional displays. Ratios/deltas (PCR, buildup) are
 *   lot-consistent and unaffected.
 * - Holiday / missing file → soft { status: 'no_data' }, never throws.
 * - Large file (~30k–100k rows): chunked sequential upsert (~500/txn) to respect
 *   connection_limit=10. Never Promise.all over the rows.
 */

import https from 'https';
import { inflateRawSync } from 'zlib';
import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FO_BHAVCOPY_BASE = 'https://nsearchives.nseindia.com/content/fo';
const FETCH_TIMEOUT_MS = 15_000;
const MAX_ZIP_BYTES = 64 * 1024 * 1024;   // 64 MB hard cap on the download
const MAX_CSV_BYTES = 256 * 1024 * 1024;  // 256 MB hard cap on the inflated CSV
const UPSERT_CHUNK = 500;                  // rows per transaction (pool-safe)
const SOURCE_TAG = 'nse-fo-bhavcopy-udiff';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FoInstrumentType = 'FUTIDX' | 'FUTSTK' | 'OPTIDX' | 'OPTSTK';

export interface FoContractRow {
  tradingDate: string;       // YYYY-MM-DD
  instrumentType: FoInstrumentType;
  underlying: string;
  expiryDate: string;        // YYYY-MM-DD
  strikePrice: number;       // 0 for futures (sentinel)
  optionType: string;        // 'CE' | 'PE' | 'XX' (sentinel for futures)
  settlePrice: number | null;
  underlyingPrice: number | null;
  openInterest: number;      // contracts (lots)
  changeInOi: number;        // contracts (lots)
  contractsTraded: number;
  turnoverRs: number | null;
  lotSize: number | null;
}

export interface FoBhavcopyIngestResult {
  status: 'success' | 'no_data' | 'parse_error' | 'error';
  tradingDate: string | null;
  rowsUpserted: number;
  message?: string;
}

export interface FoBhavcopyMeta {
  status: 'ready' | 'missing' | 'error';
  source: string;
  tradingDate: string | null;
  rowCount: number;
  fetchedAt: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Date helpers (IST)
// ---------------------------------------------------------------------------

/** Returns the date in IST as a Date whose UTC fields equal the IST calendar day. */
function nowInIst(): Date {
  const now = new Date();
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** YYYYMMDD for the URL. */
function yyyymmdd(d: Date): string {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`;
}

/** YYYY-MM-DD ISO date string. */
function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function bhavcopyUrl(yyyymmddStr: string): string {
  return `${FO_BHAVCOPY_BASE}/BhavCopy_NSE_FO_0_0_0_${yyyymmddStr}_F_0000.csv.zip`;
}

const MONTHS: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

/** Parse a UDiFF date which may be ISO (2026-06-25) or DD-Mon-YYYY (25-Jun-2026). */
function parseUdiffDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (dmy) {
    const mo = MONTHS[dmy[2].toUpperCase()];
    if (mo) return `${dmy[3]}-${mo}-${dmy[1].padStart(2, '0')}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Network — fetch the zip as a binary buffer
// ---------------------------------------------------------------------------

interface FetchResult {
  statusCode: number;
  buffer: Buffer | null;
}

function fetchZipBuffer(url: string): Promise<FetchResult> {
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
          Accept: 'application/zip,application/octet-stream,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://www.nseindia.com/',
        },
      },
      (res) => {
        const statusCode = res.statusCode ?? 0;
        // Non-200 (e.g. 404 on a holiday): drain and report, do not buffer.
        if (statusCode !== 200) {
          clearTimeout(timer);
          res.resume();
          resolve({ statusCode, buffer: null });
          return;
        }
        const chunks: Buffer[] = [];
        let total = 0;
        res.on('data', (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_ZIP_BYTES) {
            clearTimeout(timer);
            req.destroy();
            reject(new Error('F&O bhavcopy download exceeds max size'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          clearTimeout(timer);
          resolve({ statusCode, buffer: Buffer.concat(chunks) });
        });
      },
    );
    req.on('error', (err) => { clearTimeout(timer); reject(err); });
    req.on('timeout', () => { clearTimeout(timer); req.destroy(); reject(new Error('TIMEOUT')); });
  });
}

// ---------------------------------------------------------------------------
// Zip extraction (EOCD scan + inflateRawSync) — replicates the proven algorithm
// in market-data-foundation.service.ts:8633-8703 as a standalone, dependency-free
// helper. zlib is a Node built-in.
// ---------------------------------------------------------------------------

function findZipEndOfCentralDirectory(buffer: Buffer): number {
  const minOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

function extractZipEntry(
  buffer: Buffer,
  entry: { fileName: string; compressionMethod: number; compressedSize: number; localHeaderOffset: number },
): Buffer {
  const localOffset = entry.localHeaderOffset;
  if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
    throw new Error(`zip local header is malformed for ${entry.fileName}`);
  }
  const fileNameLength = buffer.readUInt16LE(localOffset + 26);
  const extraLength = buffer.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > buffer.length) throw new Error(`zip entry exceeds archive bounds for ${entry.fileName}`);
  const compressed = buffer.subarray(dataStart, dataEnd);
  if (entry.compressionMethod === 0) return compressed;      // stored
  if (entry.compressionMethod === 8) return inflateRawSync(compressed); // deflate
  throw new Error(`unsupported zip compression ${entry.compressionMethod} for ${entry.fileName}`);
}

export function extractFirstCsvFromZip(buffer: Buffer): string {
  const eocdOffset = findZipEndOfCentralDirectory(buffer);
  if (eocdOffset < 0) throw new Error('zip end-of-central-directory was not found');
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  let cursor = buffer.readUInt32LE(eocdOffset + 16);

  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error('zip central directory is malformed');
    }
    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const fileName = buffer.subarray(cursor + 46, cursor + 46 + fileNameLength).toString('utf8');

    if (fileName.toLowerCase().endsWith('.csv') && !fileName.endsWith('/')) {
      if (uncompressedSize > MAX_CSV_BYTES) throw new Error(`${fileName} exceeds max size`);
      const csvBuffer = extractZipEntry(buffer, { fileName, compressionMethod, compressedSize, localHeaderOffset });
      if (csvBuffer.length > MAX_CSV_BYTES) throw new Error(`${fileName} exceeds max size`);
      return csvBuffer.toString('utf8');
    }
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }
  throw new Error('no CSV entry found in F&O bhavcopy zip');
}

// ---------------------------------------------------------------------------
// Parsing — header-name driven (robust to column reordering)
// ---------------------------------------------------------------------------

/** Normalize UDiFF / legacy instrument-type codes to canonical labels. */
function normalizeInstrumentType(raw: string): FoInstrumentType | null {
  const t = raw.trim().toUpperCase();
  switch (t) {
    case 'IDF': case 'FUTIDX': return 'FUTIDX';
    case 'STF': case 'FUTSTK': return 'FUTSTK';
    case 'IDO': case 'OPTIDX': return 'OPTIDX';
    case 'STO': case 'OPTSTK': return 'OPTSTK';
    default: return null;
  }
}

function toNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const s = raw.trim();
  if (s === '' || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function isFutures(t: FoInstrumentType): boolean {
  return t === 'FUTIDX' || t === 'FUTSTK';
}

/**
 * Parse the F&O UDiFF bhavcopy CSV text into typed contract rows.
 * Recognized columns (UDiFF + legacy aliases):
 *   FinInstrmTp, TckrSymb, XpryDt, StrkPric, OptnTp, SttlmPric, UndrlygPric,
 *   OpnIntrst, ChngInOpnIntrst, TtlTradgVol, TtlTrfVal, NewBrdLotQty, TradDt
 */
export function parseFoBhavcopy(text: string): { tradingDate: string | null; rows: FoContractRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { tradingDate: null, rows: [] };

  const header = lines[0].split(',').map((h) => h.trim());
  const idx = (...names: string[]): number => {
    for (const name of names) {
      const i = header.findIndex((h) => h.toUpperCase() === name.toUpperCase());
      if (i >= 0) return i;
    }
    return -1;
  };

  const iType = idx('FinInstrmTp', 'INSTRUMENT');
  const iSym = idx('TckrSymb', 'SYMBOL');
  const iExpiry = idx('XpryDt', 'EXPIRY_DT');
  const iStrike = idx('StrkPric', 'STRIKE_PR');
  const iOpt = idx('OptnTp', 'OPTION_TYP');
  const iSettle = idx('SttlmPric', 'SETTLE_PR');
  const iUnderPx = idx('UndrlygPric', 'UNDERLYING_VALUE');
  const iOi = idx('OpnIntrst', 'OPEN_INT');
  const iChgOi = idx('ChngInOpnIntrst', 'CHG_IN_OI');
  const iVol = idx('TtlTradgVol', 'CONTRACTS');
  const iTurnover = idx('TtlTrfVal', 'VAL_INLAKH');
  const iLot = idx('NewBrdLotQty');
  const iTradDt = idx('TradDt', 'TIMESTAMP');

  if (iType < 0 || iSym < 0 || iExpiry < 0 || iOi < 0) {
    return { tradingDate: null, rows: [] };
  }

  const rows: FoContractRow[] = [];
  let tradingDate: string | null = null;

  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',');
    const instrumentType = normalizeInstrumentType(cols[iType] ?? '');
    if (!instrumentType) continue;

    const underlying = (cols[iSym] ?? '').trim().toUpperCase();
    if (!underlying) continue;

    const expiryDate = parseUdiffDate(cols[iExpiry] ?? '');
    if (!expiryDate) continue;

    if (tradingDate === null && iTradDt >= 0) {
      tradingDate = parseUdiffDate(cols[iTradDt] ?? '');
    }

    const futures = isFutures(instrumentType);
    const strikePrice = futures ? 0 : (toNumber(iStrike >= 0 ? cols[iStrike] : undefined) ?? 0);
    const optRaw = (iOpt >= 0 ? cols[iOpt] : '')?.trim().toUpperCase() ?? '';
    const optionType = futures ? 'XX' : (optRaw === 'CE' || optRaw === 'PE' ? optRaw : 'XX');

    rows.push({
      tradingDate: '',  // set below once tradingDate resolved
      instrumentType,
      underlying,
      expiryDate,
      strikePrice,
      optionType,
      settlePrice: toNumber(iSettle >= 0 ? cols[iSettle] : undefined),
      underlyingPrice: toNumber(iUnderPx >= 0 ? cols[iUnderPx] : undefined),
      openInterest: toNumber(cols[iOi]) ?? 0,
      changeInOi: toNumber(iChgOi >= 0 ? cols[iChgOi] : undefined) ?? 0,
      contractsTraded: toNumber(iVol >= 0 ? cols[iVol] : undefined) ?? 0,
      turnoverRs: toNumber(iTurnover >= 0 ? cols[iTurnover] : undefined),
      lotSize: toNumber(iLot >= 0 ? cols[iLot] : undefined),
    });
  }

  // Stamp the resolved trading date onto every row.
  if (tradingDate) {
    for (const r of rows) r.tradingDate = tradingDate;
  }

  return { tradingDate, rows };
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

export async function ensureFoBhavcopyTable(): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS fo_bhavcopy_contracts (
      id               TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
      trading_date     DATE          NOT NULL,
      instrument_type  TEXT          NOT NULL,
      underlying       TEXT          NOT NULL,
      expiry_date      DATE          NOT NULL,
      strike_price     NUMERIC(14,2) NOT NULL DEFAULT 0,
      option_type      TEXT          NOT NULL DEFAULT 'XX',
      settle_price     NUMERIC(14,2),
      underlying_price NUMERIC(14,2),
      open_interest    BIGINT        NOT NULL DEFAULT 0,
      change_in_oi     BIGINT        NOT NULL DEFAULT 0,
      contracts_traded BIGINT        NOT NULL DEFAULT 0,
      turnover_rs      NUMERIC(20,2),
      lot_size         INTEGER,
      source           TEXT          NOT NULL DEFAULT 'nse-fo-bhavcopy-udiff',
      fetched_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      PRIMARY KEY (trading_date, instrument_type, underlying, expiry_date, strike_price, option_type)
    )
  `);
  await prisma.$executeRaw(Prisma.sql`
    CREATE INDEX IF NOT EXISTS idx_fo_bhav_underlying_date
      ON fo_bhavcopy_contracts (underlying, trading_date)
  `);
  await prisma.$executeRaw(Prisma.sql`
    CREATE INDEX IF NOT EXISTS idx_fo_bhav_date_type
      ON fo_bhavcopy_contracts (trading_date, instrument_type)
  `);
}

async function chunkedUpsertContracts(rows: FoContractRow[], fetchedAt: Date): Promise<number> {
  let upserted = 0;
  for (let start = 0; start < rows.length; start += UPSERT_CHUNK) {
    const chunk = rows.slice(start, start + UPSERT_CHUNK);
    const values = chunk.map((r) => {
      const td = new Date(`${r.tradingDate}T00:00:00.000Z`);
      const xd = new Date(`${r.expiryDate}T00:00:00.000Z`);
      return Prisma.sql`(
        gen_random_uuid()::text, ${td}, ${r.instrumentType}, ${r.underlying}, ${xd},
        ${r.strikePrice}, ${r.optionType}, ${r.settlePrice}, ${r.underlyingPrice},
        ${r.openInterest}, ${r.changeInOi}, ${r.contractsTraded}, ${r.turnoverRs},
        ${r.lotSize}, ${SOURCE_TAG}, ${fetchedAt}
      )`;
    });
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO fo_bhavcopy_contracts (
        id, trading_date, instrument_type, underlying, expiry_date,
        strike_price, option_type, settle_price, underlying_price,
        open_interest, change_in_oi, contracts_traded, turnover_rs,
        lot_size, source, fetched_at
      )
      VALUES ${Prisma.join(values)}
      ON CONFLICT (trading_date, instrument_type, underlying, expiry_date, strike_price, option_type)
      DO UPDATE SET
        settle_price     = EXCLUDED.settle_price,
        underlying_price = EXCLUDED.underlying_price,
        open_interest    = EXCLUDED.open_interest,
        change_in_oi     = EXCLUDED.change_in_oi,
        contracts_traded = EXCLUDED.contracts_traded,
        turnover_rs      = EXCLUDED.turnover_rs,
        lot_size         = EXCLUDED.lot_size,
        fetched_at       = EXCLUDED.fetched_at
    `);
    upserted += chunk.length;
  }
  return upserted;
}

// ---------------------------------------------------------------------------
// Public service methods
// ---------------------------------------------------------------------------

/**
 * Ingest the F&O bhavcopy for a given trading date (defaults to today IST,
 * falling back to prior days when a file is missing — e.g. weekends/holidays).
 * Idempotent. Never throws on missing files (returns { status: 'no_data' }).
 */
export async function ingestFoBhavcopy(dateOverride?: string): Promise<FoBhavcopyIngestResult> {
  try {
    await ensureFoBhavcopyTable();

    // Build the candidate date list: explicit override, else today IST and a
    // short look-back window to skip weekends/holidays.
    const candidates: string[] = [];
    if (dateOverride) {
      candidates.push(dateOverride.replace(/-/g, ''));
    } else {
      const ist = nowInIst();
      for (let back = 0; back < 6; back += 1) {
        const d = new Date(ist.getTime() - back * 24 * 60 * 60 * 1000);
        candidates.push(yyyymmdd(d));
      }
    }

    let lastStatus = 0;
    for (const ymd of candidates) {
      const url = bhavcopyUrl(ymd);
      const { statusCode, buffer } = await fetchZipBuffer(url);
      lastStatus = statusCode;
      if (statusCode === 200 && buffer && buffer.length > 0) {
        const csv = extractFirstCsvFromZip(buffer);
        const { tradingDate, rows } = parseFoBhavcopy(csv);
        if (!tradingDate || rows.length === 0) {
          // Header present but unparseable / empty — surface explicitly.
          return {
            status: 'parse_error',
            tradingDate: tradingDate ?? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`,
            rowsUpserted: 0,
            message: 'F&O bhavcopy parsed to zero contract rows (column layout may have changed).',
          };
        }
        const rowsUpserted = await chunkedUpsertContracts(rows, new Date());
        return { status: 'success', tradingDate, rowsUpserted };
      }
      // 404 → try the previous day; any other status → also try previous day.
    }

    return {
      status: 'no_data',
      tradingDate: null,
      rowsUpserted: 0,
      message: `No F&O bhavcopy available for the last 6 days (last HTTP ${lastStatus}). Likely a market holiday.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', tradingDate: null, rowsUpserted: 0, message: msg };
  }
}

/** Latest persisted trading date + row count (drives staleness badge). Never throws. */
export async function getLatestFoBhavcopyMeta(): Promise<FoBhavcopyMeta> {
  const fetchedAt = new Date().toISOString();
  try {
    await ensureFoBhavcopyTable();
    const rows = await prisma.$queryRaw<Array<{ trading_date: Date; cnt: bigint }>>(Prisma.sql`
      SELECT trading_date, COUNT(*)::bigint AS cnt
      FROM fo_bhavcopy_contracts
      GROUP BY trading_date
      ORDER BY trading_date DESC
      LIMIT 1
    `);
    if (rows.length === 0) {
      return {
        status: 'missing',
        source: FO_BHAVCOPY_BASE,
        tradingDate: null,
        rowCount: 0,
        fetchedAt,
        message: 'No F&O bhavcopy persisted yet. Run POST /api/v1/derivatives/fo-bhavcopy/ingest.',
      };
    }
    return {
      status: 'ready',
      source: FO_BHAVCOPY_BASE,
      tradingDate: isoDate(rows[0].trading_date),
      rowCount: Number(rows[0].cnt),
      fetchedAt,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', source: FO_BHAVCOPY_BASE, tradingDate: null, rowCount: 0, fetchedAt, message: msg };
  }
}
