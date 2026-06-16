/**
 * US Insider Transactions (SEC Form 4) Ingest Service — FREE, official SEC EDGAR.
 *
 * Form 4 reports insider (officer / director / 10%-owner) transactions and is
 * keyed by ISSUER CIK, which maps directly to our US stocks via the public
 * ticker→CIK map (company_tickers.json). For each US stock's CIK we:
 *
 *   1. Fetch  https://data.sec.gov/submissions/CIK{cik}.json  and read the
 *      `filings.recent` columnar arrays (form[], filingDate[], accessionNumber[],
 *      primaryDocument[]); select rows where form === '4'.
 *   2. For each recent Form 4, fetch the ownership XML primary document at
 *      https://www.sec.gov/Archives/edgar/data/{cikNoPad}/{accessionNoDashes}/{primaryDocument}
 *      and parse `nonDerivativeTransaction` entries: transactionCode (P=buy,
 *      S=sell), shares, pricePerShare, transactionDate, plus the reporting
 *      owner's name and officer title.
 *
 * The XML produced by SEC's Form 4 schema is well-structured and stable, so a
 * dependency-free regex/string extraction is robust enough here — NO new npm
 * dependency is added.
 *
 * Persisted into the raw-SQL table `us_insider_trades` (created idempotently via
 * raw SQL — schema.prisma is NOT touched), upserted on a natural key so
 * re-ingesting the same filings is safe. Collision-safe: only Stocks with
 * region='US' are matched.
 *
 * Research-support only: this is observed regulatory-filing data, not advice.
 *
 * Persisted-read getters live in market-data-foundation.us-institutional.repository.ts;
 * ingestion here is explicit (service/script) and NEVER runs on a GET.
 */

import { Prisma } from '@prisma/client';
import prisma from '../../../../db/prisma';
import {
  loadTickerCikMap,
  fetchRecentFilings,
  fetchText,
  archiveDocumentUrl,
  padCik,
  secSleep,
  SEC_EDGAR_THROTTLE_MS,
} from './market-data-foundation.sec-edgar-client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCE_TAG = 'SEC_FORM4';
const UPSERT_CHUNK = 500;
/** Per-stock cap on how many recent Form 4 filings to fetch & parse. */
const DEFAULT_MAX_FILINGS_PER_STOCK = Number(process.env.US_FORM4_MAX_FILINGS_PER_STOCK || 20);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single parsed non-derivative transaction from a Form 4 ownership XML. */
export interface Form4Transaction {
  insiderName: string;
  insiderTitle: string | null;
  /** SEC transaction code; P = open-market purchase, S = open-market sale. */
  transactionCode: string;
  transactionDate: string; // YYYY-MM-DD
  shares: number | null;
  pricePerShare: number | null;
}

/** Fully-parsed Form 4 document. */
export interface ParsedForm4 {
  insiderName: string;
  insiderTitle: string | null;
  transactions: Form4Transaction[];
}

export interface UsForm4IngestOptions {
  /** Only process these symbols (uppercase). If omitted, all active US stocks. */
  symbols?: string[];
  /** Max number of stocks to process. Default 100 (or US_FORM4_LIMIT env). */
  limit?: number;
}

export interface UsForm4IngestSummary {
  source: typeof SOURCE_TAG;
  processed: number;
  updated: number;
  noCik: number;
  noFilings: number;
  warnings: string[];
}

interface InsiderTradeRow {
  id: string;
  stockId: string;
  symbol: string;
  cik: string;
  insiderName: string;
  insiderTitle: string | null;
  transactionCode: string;
  transactionDate: string; // YYYY-MM-DD
  shares: number | null;
  pricePerShare: number | null;
  value: number | null;
}

// ---------------------------------------------------------------------------
// Pure XML parsing helpers (exported for unit tests — no network, no DB)
// ---------------------------------------------------------------------------

/** Decode the handful of XML entities that appear in SEC owner names. */
function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Extract the inner text of the first <tag>…</tag> within `scope`, trimmed. */
function firstTag(scope: string, tag: string): string | null {
  const m = scope.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!m) return null;
  return decodeXmlEntities(m[1].trim());
}

/**
 * Many Form 4 numeric / date fields are wrapped in a <value> element:
 *   <transactionShares><value>1000</value></transactionShares>
 * This pulls the <value> if present, otherwise the element's own text.
 */
function tagValue(scope: string, tag: string): string | null {
  const block = scope.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!block) return null;
  const inner = block[1];
  const valued = inner.match(/<value[^>]*>([\s\S]*?)<\/value>/i);
  return decodeXmlEntities((valued ? valued[1] : inner).trim());
}

function toNumberOrNull(raw: string | null): number | null {
  if (raw === null) return null;
  const s = raw.trim();
  if (s === '' || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/**
 * SEC lists a Form 4's `primaryDocument` as an XSL-rendered *view* path
 * (e.g. "xslF345X06/form4.xml"), which serves a human-readable HTML page — NOT
 * the ownership XML our parser needs. The raw XML always lives at the accession
 * root, so strip a leading "xsl…/" segment to reach it. Exported for unit tests.
 */
export function rawForm4DocPath(primaryDocument: string): string {
  return primaryDocument.replace(/^xsl[^/]*\//i, '');
}

/**
 * Parse a Form 4 ownership XML document into the reporting owner identity and
 * its non-derivative transactions. Dependency-free string/regex extraction —
 * robust for the well-structured SEC Form 4 schema. Exported for unit testing.
 */
export function parseForm4Xml(xml: string): ParsedForm4 {
  // Reporting owner identity.
  const ownerBlock = xml.match(/<reportingOwner>([\s\S]*?)<\/reportingOwner>/i)?.[1] ?? xml;
  const insiderName =
    firstTag(ownerBlock, 'rptOwnerName') ?? firstTag(xml, 'rptOwnerName') ?? 'UNKNOWN';

  const relBlock =
    ownerBlock.match(/<reportingOwnerRelationship>([\s\S]*?)<\/reportingOwnerRelationship>/i)?.[1] ?? '';
  const titleParts: string[] = [];
  const officerTitle = firstTag(relBlock, 'officerTitle');
  if (officerTitle) titleParts.push(officerTitle);
  if ((firstTag(relBlock, 'isDirector') ?? '').match(/^(1|true)$/i)) titleParts.push('Director');
  if ((firstTag(relBlock, 'isOfficer') ?? '').match(/^(1|true)$/i) && !officerTitle) {
    titleParts.push('Officer');
  }
  if ((firstTag(relBlock, 'isTenPercentOwner') ?? '').match(/^(1|true)$/i)) {
    titleParts.push('10% Owner');
  }
  const insiderTitle = titleParts.length ? titleParts.join(', ') : null;

  // Non-derivative transactions.
  const transactions: Form4Transaction[] = [];
  const txRegex = /<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/gi;
  let match: RegExpExecArray | null;
  while ((match = txRegex.exec(xml)) !== null) {
    const tx = match[1];
    const transactionCode = tagValue(tx, 'transactionCode') ?? '';
    const transactionDate = normalizeDate(tagValue(tx, 'transactionDate'));
    if (!transactionDate) continue;
    transactions.push({
      insiderName,
      insiderTitle,
      transactionCode: transactionCode.toUpperCase(),
      transactionDate,
      shares: toNumberOrNull(tagValue(tx, 'transactionShares')),
      pricePerShare: toNumberOrNull(tagValue(tx, 'transactionPricePerShare')),
    });
  }

  return { insiderName, insiderTitle, transactions };
}

/** Natural-key PK for an insider trade row (collision-stable across re-ingests). */
export function insiderTradeNaturalKey(parts: {
  cik: string;
  accession: string;
  insiderName: string;
  transactionDate: string;
  transactionCode: string;
  shares: number | null;
}): string {
  return [
    parts.cik,
    parts.accession,
    parts.insiderName,
    parts.transactionDate,
    parts.transactionCode,
    parts.shares ?? 0,
  ].join('|');
}

// ---------------------------------------------------------------------------
// DB helpers (raw-SQL ensureTable; schema.prisma NOT touched)
// ---------------------------------------------------------------------------

export async function ensureInsiderTradesTable(): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS us_insider_trades (
      id               TEXT          PRIMARY KEY,
      stock_id         TEXT,
      symbol           TEXT          NOT NULL,
      cik              TEXT          NOT NULL,
      insider_name     TEXT          NOT NULL,
      insider_title    TEXT,
      transaction_code TEXT          NOT NULL,
      transaction_date DATE          NOT NULL,
      shares           NUMERIC(20,2),
      price_per_share  NUMERIC(20,4),
      value            NUMERIC(24,2),
      accession        TEXT,
      source           TEXT          NOT NULL DEFAULT 'SEC_FORM4',
      ingested_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRaw(Prisma.sql`
    CREATE INDEX IF NOT EXISTS idx_us_insider_symbol_date
      ON us_insider_trades (symbol, transaction_date DESC)
  `);
}

async function chunkedUpsertTrades(rows: InsiderTradeRow[], accessionBy: Map<string, string>): Promise<number> {
  let upserted = 0;
  for (let start = 0; start < rows.length; start += UPSERT_CHUNK) {
    const chunk = rows.slice(start, start + UPSERT_CHUNK);
    const values = chunk.map((r) => {
      const td = new Date(`${r.transactionDate}T00:00:00.000Z`);
      return Prisma.sql`(
        ${r.id}, ${r.stockId}, ${r.symbol}, ${r.cik}, ${r.insiderName}, ${r.insiderTitle},
        ${r.transactionCode}, ${td}, ${r.shares}, ${r.pricePerShare}, ${r.value},
        ${accessionBy.get(r.id) ?? null}, ${SOURCE_TAG}, NOW()
      )`;
    });
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO us_insider_trades (
        id, stock_id, symbol, cik, insider_name, insider_title,
        transaction_code, transaction_date, shares, price_per_share, value,
        accession, source, ingested_at
      )
      VALUES ${Prisma.join(values)}
      ON CONFLICT (id) DO UPDATE SET
        stock_id        = EXCLUDED.stock_id,
        insider_title   = EXCLUDED.insider_title,
        shares          = EXCLUDED.shares,
        price_per_share = EXCLUDED.price_per_share,
        value           = EXCLUDED.value,
        accession       = EXCLUDED.accession,
        ingested_at     = EXCLUDED.ingested_at
    `);
    upserted += chunk.length;
  }
  return upserted;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class UsForm4Service {
  constructor(private readonly db = prisma as any) {}

  /**
   * Ingest recent Form 4 insider transactions for US stocks. Idempotent &
   * collision-safe (region='US' only). Never opens a GET path; explicit call.
   */
  async ingestForSymbols(options: UsForm4IngestOptions = {}): Promise<UsForm4IngestSummary> {
    const summary: UsForm4IngestSummary = {
      source: SOURCE_TAG,
      processed: 0,
      updated: 0,
      noCik: 0,
      noFilings: 0,
      warnings: [],
    };

    await ensureInsiderTradesTable();

    const effectiveLimit = options.limit ?? (Number(process.env.US_FORM4_LIMIT || '100') || 100);
    const cikMap = await loadTickerCikMap();

    let stocks: Array<{ id: string; symbol: string }>;
    if (options.symbols && options.symbols.length > 0) {
      const wanted = options.symbols.map((s) => s.trim().toUpperCase());
      stocks = await this.db.stock.findMany({
        where: { region: 'US', symbol: { in: wanted } },
        select: { id: true, symbol: true },
      });
    } else {
      stocks = await this.db.stock.findMany({
        where: { region: 'US', isActive: true, isDelisted: false },
        select: { id: true, symbol: true },
        take: effectiveLimit,
        orderBy: { symbol: 'asc' },
      });
    }

    for (const stock of stocks) {
      summary.processed += 1;
      const cik = cikMap.get(stock.symbol.toUpperCase());
      if (!cik) {
        summary.noCik += 1;
        continue;
      }

      try {
        const filings = await fetchRecentFilings(cik);
        const form4s = filings
          .filter((f) => f.form === '4' && f.accessionNumber && f.primaryDocument)
          .slice(0, DEFAULT_MAX_FILINGS_PER_STOCK);

        if (form4s.length === 0) {
          summary.noFilings += 1;
          continue;
        }

        const rows: InsiderTradeRow[] = [];
        const accessionBy = new Map<string, string>();

        for (const filing of form4s) {
          try {
            const url = archiveDocumentUrl(cik, filing.accessionNumber, rawForm4DocPath(filing.primaryDocument));
            const xml = await fetchText(url);
            await secSleep(SEC_EDGAR_THROTTLE_MS);
            const parsed = parseForm4Xml(xml);

            for (const tx of parsed.transactions) {
              const value =
                tx.shares !== null && tx.pricePerShare !== null
                  ? Number((tx.shares * tx.pricePerShare).toFixed(2))
                  : null;
              const id = insiderTradeNaturalKey({
                cik,
                accession: filing.accessionNumber,
                insiderName: tx.insiderName,
                transactionDate: tx.transactionDate,
                transactionCode: tx.transactionCode,
                shares: tx.shares,
              });
              accessionBy.set(id, filing.accessionNumber);
              rows.push({
                id,
                stockId: stock.id,
                symbol: stock.symbol.toUpperCase(),
                cik,
                insiderName: tx.insiderName,
                insiderTitle: tx.insiderTitle,
                transactionCode: tx.transactionCode,
                transactionDate: tx.transactionDate,
                shares: tx.shares,
                pricePerShare: tx.pricePerShare,
                value,
              });
            }
          } catch (err) {
            if (summary.warnings.length < 25) {
              summary.warnings.push(
                `${stock.symbol} ${filing.accessionNumber}: ${(err as Error).message}`,
              );
            }
          }
        }

        if (rows.length > 0) {
          // De-dupe rows sharing a natural key within this batch (last wins).
          const byId = new Map<string, InsiderTradeRow>();
          for (const r of rows) byId.set(r.id, r);
          const unique = [...byId.values()];
          summary.updated += await chunkedUpsertTrades(unique, accessionBy);
        }
      } catch (err) {
        if (summary.warnings.length < 25) {
          summary.warnings.push(`${stock.symbol} (CIK ${padCik(cik)}): ${(err as Error).message}`);
        }
      }
    }

    return summary;
  }
}

export const usForm4Service = new UsForm4Service();
