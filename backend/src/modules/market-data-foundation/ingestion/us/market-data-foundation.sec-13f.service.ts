/**
 * US Institutional Holdings (SEC Form 13F) Ingest Service — FREE, official SEC.
 *
 * Tractable free approach: the SEC publishes quarterly STRUCTURED data sets for
 * Form 13F as a zip of tab-separated tables:
 *   https://www.sec.gov/files/structureddata/data/form-13f-data-sets/{YYYYqQ}_form13f.zip
 * (e.g. 2025q1_form13f.zip). The zip contains, among others:
 *   - INFOTABLE.tsv  — one row per reported holding: CUSIP, NAMEOFISSUER,
 *                      VALUE, SSHPRNAMT (shares), plus an ACCESSION_NUMBER link.
 *   - COVERPAGE.tsv  — one row per filing: FILINGMANAGER_NAME, ACCESSION_NUMBER.
 *
 * We aggregate INFOTABLE per CUSIP: total value, total shares, number of
 * distinct filing managers (= holder count), and the top holders by value
 * (resolving manager names via COVERPAGE). The zip is extracted with Node's
 * built-in zlib (inflateRawSync) — NO new npm dependency.
 *
 * CUSIP → our US stocks: our Stock catalog does NOT store CUSIP, so we map by
 * NAMEOFISSUER ↔ Stock.name as a BEST-EFFORT fallback, while still persisting
 * the CUSIP so a future exact CUSIP map can plug in. Coverage is LOGGED
 * explicitly (issuersTotal / issuersMapped / issuersUnmapped) — NO silent
 * truncation; unmapped issuers are still persisted with stock_id = NULL so the
 * data is not lost and can be re-linked later.
 *
 * Persisted into the raw-SQL table `us_institutional_holdings` (created
 * idempotently via raw SQL — schema.prisma is NOT touched), upserted on
 * (cusip|quarter). Collision-safe: only Stocks with region='US' are matched.
 *
 * Research-support only: this is observed regulatory-filing data, not advice.
 */

import { inflateRawSync } from 'zlib';
import { Prisma } from '@prisma/client';
import prisma from '../../../../db/prisma';
import { fetchBuffer } from './market-data-foundation.sec-edgar-client';
import {
  defaultMostRecent13fPeriod,
  parse13fPeriod,
  thirteenFZipUrl,
} from './market-data-foundation.sec-13f.periods';
import {
  extractZipEntryBuffer,
  streamAggregateInfotable,
} from './market-data-foundation.sec-13f.infotable-stream';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCE_TAG = 'SEC_13F';
const UPSERT_CHUNK = 500;
const MAX_ZIP_BYTES = 256 * 1024 * 1024; // 256 MB hard cap on the inflated TSV
const TOP_HOLDERS_LIMIT = 10;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InfotableRow {
  accessionNumber: string | null;
  cusip: string;
  nameOfIssuer: string;
  value: number;
  shares: number;
}

export interface TopHolder {
  manager: string;
  value: number;
}

export interface CusipAggregate {
  cusip: string;
  nameOfIssuer: string;
  totalValue: number;
  totalShares: number;
  holderCount: number;
  topHolders: TopHolder[];
}

export interface UsThirteenFIngestOptions {
  /** 13F filing period: "YYYY-MM" (window end), a full SEC file stem
   *  ("01mar2026-31may2026"), or legacy "YYYYqQ". Defaults to the most recent
   *  completed rolling filing window. */
  quarter?: string;
  /** Optional cap on the number of CUSIP aggregates persisted (for smoke runs). */
  limit?: number;
}

export interface UsThirteenFIngestSummary {
  source: typeof SOURCE_TAG;
  quarter: string;
  issuersTotal: number;
  issuersMapped: number;
  issuersUnmapped: number;
  rowsUpserted: number;
  warnings: string[];
}

interface HoldingRow {
  id: string;
  stockId: string | null;
  symbol: string | null;
  cusip: string;
  quarter: string;
  totalValue: number;
  totalShares: number;
  holderCount: number;
  topHolders: TopHolder[];
}

// ---------------------------------------------------------------------------
// Zip extraction (EOCD scan + inflateRawSync) — same proven algorithm used by
// the derivatives fo-bhavcopy service; generalized to pull a NAMED entry.
// zlib is a Node built-in (no new dependency).
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
  if (entry.compressionMethod === 0) return compressed; // stored
  if (entry.compressionMethod === 8) return inflateRawSync(compressed); // deflate
  throw new Error(`unsupported zip compression ${entry.compressionMethod} for ${entry.fileName}`);
}

/**
 * Extract the contents of every zip entry whose lower-cased base name matches
 * one of `wantedBaseNames` (e.g. 'infotable.tsv'). Returns a map of
 * baseName(lower) → utf8 text. Dependency-free (zlib only).
 */
export function extractNamedEntriesFromZip(buffer: Buffer, wantedBaseNames: string[]): Map<string, string> {
  const wanted = new Set(wantedBaseNames.map((n) => n.toLowerCase()));
  const out = new Map<string, string>();

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
    const base = fileName.split('/').pop()?.toLowerCase() ?? '';

    if (wanted.has(base)) {
      if (uncompressedSize > MAX_ZIP_BYTES) throw new Error(`${fileName} exceeds max size`);
      const data = extractZipEntry(buffer, { fileName, compressionMethod, compressedSize, localHeaderOffset });
      if (data.length > MAX_ZIP_BYTES) throw new Error(`${fileName} exceeds max size`);
      out.set(base, data.toString('utf8'));
    }
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }
  return out;
}

// ---------------------------------------------------------------------------
// TSV parsing & aggregation (pure — exported for unit tests)
// ---------------------------------------------------------------------------

function splitTsvLine(line: string): string[] {
  return line.split('\t');
}

function headerIndex(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const i = headers.findIndex((h) => h.trim().toUpperCase() === name.toUpperCase());
    if (i >= 0) return i;
  }
  return -1;
}

function toNum(raw: string | undefined): number {
  if (raw === undefined) return 0;
  const s = raw.trim().replace(/,/g, '');
  if (s === '' || s === '-') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Parse COVERPAGE.tsv into ACCESSION_NUMBER → FILINGMANAGER_NAME. */
export function parseCoverpageTsv(tsv: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = tsv.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return map;
  const headers = splitTsvLine(lines[0]);
  const iAcc = headerIndex(headers, 'ACCESSION_NUMBER');
  const iMgr = headerIndex(headers, 'FILINGMANAGER_NAME');
  if (iAcc < 0 || iMgr < 0) return map;
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitTsvLine(lines[i]);
    const acc = (cols[iAcc] ?? '').trim();
    const mgr = (cols[iMgr] ?? '').trim();
    if (acc) map.set(acc, mgr || acc);
  }
  return map;
}

/** Parse INFOTABLE.tsv into typed holding rows. */
export function parseInfotableTsv(tsv: string): InfotableRow[] {
  const lines = tsv.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const headers = splitTsvLine(lines[0]);
  const iAcc = headerIndex(headers, 'ACCESSION_NUMBER');
  const iCusip = headerIndex(headers, 'CUSIP');
  const iName = headerIndex(headers, 'NAMEOFISSUER');
  const iValue = headerIndex(headers, 'VALUE');
  const iShares = headerIndex(headers, 'SSHPRNAMT');
  if (iCusip < 0 || iValue < 0) return [];

  const rows: InfotableRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitTsvLine(lines[i]);
    const cusip = (cols[iCusip] ?? '').trim().toUpperCase();
    if (!cusip) continue;
    rows.push({
      accessionNumber: iAcc >= 0 ? (cols[iAcc] ?? '').trim() || null : null,
      cusip,
      nameOfIssuer: (iName >= 0 ? cols[iName] : '')?.trim() ?? '',
      value: toNum(iValue >= 0 ? cols[iValue] : undefined),
      shares: toNum(iShares >= 0 ? cols[iShares] : undefined),
    });
  }
  return rows;
}

/**
 * Aggregate INFOTABLE rows per CUSIP. holderCount = distinct filing managers
 * (resolved via the coverpage accession→manager map; rows without a resolvable
 * manager fall back to their accession number as the distinct key). topHolders
 * are the largest managers by summed value.
 */
export function aggregateByCusip(
  rows: InfotableRow[],
  managerByAccession: Map<string, string>,
): CusipAggregate[] {
  interface Acc {
    cusip: string;
    nameOfIssuer: string;
    totalValue: number;
    totalShares: number;
    managers: Set<string>;
    valueByManager: Map<string, number>;
  }
  const byCusip = new Map<string, Acc>();

  for (const row of rows) {
    let acc = byCusip.get(row.cusip);
    if (!acc) {
      acc = {
        cusip: row.cusip,
        nameOfIssuer: row.nameOfIssuer,
        totalValue: 0,
        totalShares: 0,
        managers: new Set(),
        valueByManager: new Map(),
      };
      byCusip.set(row.cusip, acc);
    }
    if (!acc.nameOfIssuer && row.nameOfIssuer) acc.nameOfIssuer = row.nameOfIssuer;
    acc.totalValue += row.value;
    acc.totalShares += row.shares;

    const manager =
      (row.accessionNumber && managerByAccession.get(row.accessionNumber)) ||
      row.accessionNumber ||
      'UNKNOWN_FILER';
    acc.managers.add(manager);
    acc.valueByManager.set(manager, (acc.valueByManager.get(manager) ?? 0) + row.value);
  }

  const out: CusipAggregate[] = [];
  for (const acc of byCusip.values()) {
    const topHolders = [...acc.valueByManager.entries()]
      .map(([manager, value]) => ({ manager, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, TOP_HOLDERS_LIMIT);
    out.push({
      cusip: acc.cusip,
      nameOfIssuer: acc.nameOfIssuer,
      totalValue: acc.totalValue,
      totalShares: acc.totalShares,
      holderCount: acc.managers.size,
      topHolders,
    });
  }
  return out;
}

/** Normalize an issuer name for best-effort matching against Stock.name. */
export function normalizeIssuerName(name: string): string {
  return name
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[.,'"]/g, '')
    // Dashes → space: our US names are Nasdaq-style "Apple Inc. - Common Stock";
    // collapsing the separator (and hyphens like COCA-COLA) lets them match the
    // 13F "APPLE INC" form. Removing the dash entirely would fuse "COCACOLA".
    .replace(/[-–—]/g, ' ')
    .replace(/\b(INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|LTD|LIMITED|PLC|LLC|LP|HLDGS|HOLDINGS|GROUP|THE|CLASS|CL|COM|COMMON|STOCK|NEW)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// DB helpers (raw-SQL ensureTable; schema.prisma NOT touched)
// ---------------------------------------------------------------------------

export async function ensureInstitutionalHoldingsTable(): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS us_institutional_holdings (
      id            TEXT          PRIMARY KEY,
      stock_id      TEXT,
      symbol        TEXT,
      cusip         TEXT          NOT NULL,
      quarter       TEXT          NOT NULL,
      total_value   NUMERIC(24,2) NOT NULL DEFAULT 0,
      total_shares  NUMERIC(24,2) NOT NULL DEFAULT 0,
      holder_count  INTEGER       NOT NULL DEFAULT 0,
      top_holders   JSONB,
      source        TEXT          NOT NULL DEFAULT 'SEC_13F',
      ingested_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRaw(Prisma.sql`
    CREATE INDEX IF NOT EXISTS idx_us_inst_symbol_quarter
      ON us_institutional_holdings (symbol, quarter)
  `);
}

async function chunkedUpsertHoldings(rows: HoldingRow[]): Promise<number> {
  let upserted = 0;
  for (let start = 0; start < rows.length; start += UPSERT_CHUNK) {
    const chunk = rows.slice(start, start + UPSERT_CHUNK);
    const values = chunk.map(
      (r) => Prisma.sql`(
        ${r.id}, ${r.stockId}, ${r.symbol}, ${r.cusip}, ${r.quarter},
        ${r.totalValue}, ${r.totalShares}, ${r.holderCount},
        ${JSON.stringify(r.topHolders)}::jsonb, ${SOURCE_TAG}, NOW()
      )`,
    );
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO us_institutional_holdings (
        id, stock_id, symbol, cusip, quarter,
        total_value, total_shares, holder_count, top_holders, source, ingested_at
      )
      VALUES ${Prisma.join(values)}
      ON CONFLICT (id) DO UPDATE SET
        stock_id     = EXCLUDED.stock_id,
        symbol       = EXCLUDED.symbol,
        total_value  = EXCLUDED.total_value,
        total_shares = EXCLUDED.total_shares,
        holder_count = EXCLUDED.holder_count,
        top_holders  = EXCLUDED.top_holders,
        ingested_at  = EXCLUDED.ingested_at
    `);
    upserted += chunk.length;
  }
  return upserted;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class UsThirteenFService {
  constructor(private readonly db = prisma as any) {}

  /**
   * Ingest one quarter of the SEC Form 13F structured data set. Best-effort
   * NAMEOFISSUER↔Stock.name mapping (region='US' only); unmapped CUSIPs are
   * persisted with stock_id=NULL (no silent truncation). Coverage is reported
   * AND logged. Idempotent on (cusip|quarter).
   */
  async ingestQuarter(options: UsThirteenFIngestOptions = {}): Promise<UsThirteenFIngestSummary> {
    const period = options.quarter ? parse13fPeriod(options.quarter) : defaultMostRecent13fPeriod();
    if (!period) {
      return {
        source: SOURCE_TAG,
        quarter: options.quarter ?? '',
        issuersTotal: 0,
        issuersMapped: 0,
        issuersUnmapped: 0,
        rowsUpserted: 0,
        warnings: [`Unrecognised 13F period "${options.quarter}" (expected YYYY-MM, a SEC file stem, or YYYYqQ)`],
      };
    }
    // Persist the sortable window-end key so `ORDER BY quarter DESC` finds the latest.
    const quarter = period.key;
    const summary: UsThirteenFIngestSummary = {
      source: SOURCE_TAG,
      quarter,
      issuersTotal: 0,
      issuersMapped: 0,
      issuersUnmapped: 0,
      rowsUpserted: 0,
      warnings: [],
    };

    await ensureInstitutionalHoldingsTable();

    // 1. Download + extract the structured-data zip. INFOTABLE.tsv is huge
    //    (~400 MB uncompressed), so keep it as an off-heap Buffer and
    //    stream-aggregate it rather than materialising one giant JS string.
    const url = thirteenFZipUrl(period);
    const zip = await fetchBuffer(url);
    const infotableBuf = extractZipEntryBuffer(zip, 'INFOTABLE.tsv');
    if (!infotableBuf) {
      summary.warnings.push(`INFOTABLE.tsv not found in ${url}`);
      return summary;
    }
    const coverpage = extractNamedEntriesFromZip(zip, ['COVERPAGE.tsv']).get('coverpage.tsv') ?? '';

    // 2. Parse + aggregate (streaming; bounded memory for the ~400 MB INFOTABLE).
    const managerByAccession = parseCoverpageTsv(coverpage);
    let aggregates = streamAggregateInfotable(infotableBuf, managerByAccession);
    summary.issuersTotal = aggregates.length;
    if (options.limit && options.limit > 0) {
      // Keep the largest issuers by total value when limiting (no silent random truncation).
      aggregates = [...aggregates].sort((a, b) => b.totalValue - a.totalValue).slice(0, options.limit);
    }

    // 3. Best-effort CUSIP→stock via NAMEOFISSUER↔Stock.name.
    const usStocks: Array<{ id: string; symbol: string; name: string }> = await this.db.stock.findMany({
      where: { region: 'US' },
      select: { id: true, symbol: true, name: true },
    });
    const stockByNormName = new Map<string, { id: string; symbol: string }>();
    for (const s of usStocks) {
      const key = normalizeIssuerName(s.name ?? '');
      if (key && !stockByNormName.has(key)) stockByNormName.set(key, { id: s.id, symbol: s.symbol });
    }

    const rows: HoldingRow[] = aggregates.map((agg) => {
      const matched = stockByNormName.get(normalizeIssuerName(agg.nameOfIssuer));
      if (matched) summary.issuersMapped += 1;
      else summary.issuersUnmapped += 1;
      return {
        id: `${agg.cusip}|${quarter}`,
        stockId: matched?.id ?? null,
        symbol: matched?.symbol ?? null,
        cusip: agg.cusip,
        quarter,
        totalValue: agg.totalValue,
        totalShares: agg.totalShares,
        holderCount: agg.holderCount,
        topHolders: agg.topHolders,
      };
    });

    // 4. Persist (chunked, pool-safe).
    summary.rowsUpserted = await chunkedUpsertHoldings(rows);

    // 5. Explicit coverage log (no silent truncation).
    const mapRate =
      summary.issuersTotal > 0
        ? ((summary.issuersMapped / Math.min(summary.issuersTotal, rows.length || 1)) * 100).toFixed(1)
        : '0.0';
    // eslint-disable-next-line no-console
    console.log(
      `[us-13f] period=${period.label} (key=${quarter}) issuersTotal=${summary.issuersTotal} ` +
        `persisted=${rows.length} mapped=${summary.issuersMapped} unmapped=${summary.issuersUnmapped} ` +
        `(name-match coverage ~${mapRate}% of persisted; unmapped rows kept with stock_id=NULL)`,
    );

    return summary;
  }
}

export const usThirteenFService = new UsThirteenFService();
