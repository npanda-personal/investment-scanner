/**
 * NSE Board-Meetings ingest — service-layer entry point.
 *
 * Fetches the NSE corporate board-meetings endpoint (cookie-primed, same
 * browser-spoofing strategy as the XBRL fundamentals exporter), parses
 * result-announcement rows, matches them to Fundamental period rows via
 * matchBoardMeetingToPeriodEnd(), and persists officialResultDate on each
 * matched row.  Idempotent — rows already set to the same date are skipped.
 *
 * Called from:
 *   POST /api/v1/market-intelligence/earnings/ingest-board-meetings   (HTTP trigger)
 *   npx ts-node --transpile-only scripts/ingest-nse-earnings-dates.ts  (CLI script)
 */

import prisma from '../../db/prisma';
import {
  parseNseBoardMeetings,
  buildNseBoardMeetingsUrl,
  matchBoardMeetingToPeriodEnd,
  type NseBoardMeetingRow,
  type ParsedBoardMeeting,
} from './earnings-intelligence.nse-board-meetings-source';

// ---------------------------------------------------------------------------
// Public result type
// ---------------------------------------------------------------------------

export interface BoardMeetingsIngestResult {
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'BLOCKED';
  /** Total raw rows returned by NSE (before filtering) */
  rawRows: number;
  /** Result-announcement board meetings successfully parsed */
  parsedMeetings: number;
  /** Fundamental rows where officialResultDate was newly written */
  written: number;
  /** Fundamental rows already carrying the same date (no-op) */
  alreadySet: number;
  /** Board meetings with no matching Fundamental row in the DB */
  noMatch: number;
  /** Board meetings for symbols not in the stock catalog */
  noFundamental: number;
  /** DB write failures */
  failed: number;
  /** Parse-time warnings */
  warnings: string[];
  /** Top-level error message if fetch/parse aborted early */
  error?: string;
  /** Sample of newly-written rows for verification */
  examples: Array<{ symbol: string; periodEndDate: string; officialResultDate: string }>;
}

export interface BoardMeetingsIngestOptions {
  /** 'DD-MM-YYYY' — defaults to 90 days ago */
  fromDate?: string;
  /** 'DD-MM-YYYY' — defaults to 90 days ahead */
  toDate?: string;
  /** If true: parse + match but do NOT write to DB */
  dryRun?: boolean;
  /** Single NSE symbol — uses the per-symbol endpoint */
  symbol?: string;
}

// ---------------------------------------------------------------------------
// Cookie-primed NSE fetch client
// ---------------------------------------------------------------------------

const DELAY_MS = 600;

class NseFetchClient {
  private cookie = '';
  private warmed = false;

  async warmSession(symbol?: string): Promise<void> {
    const url = symbol
      ? `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`
      : 'https://www.nseindia.com/companies-listing/corporate-filings-financial-results';
    try {
      const response = await fetch(url, { headers: this.buildHeaders(symbol) });
      this.captureCookie(response);
      this.warmed = response.ok;
      if (!response.ok) {
        console.warn(`[board-meetings-ingest] warm session returned ${response.status} for ${url}`);
      }
    } catch (err) {
      console.warn(`[board-meetings-ingest] warm session failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async fetchJson(url: string, symbol?: string): Promise<unknown> {
    if (!this.warmed) await this.warmSession(symbol);

    let response = await fetch(url, { headers: this.buildHeaders(symbol) });
    this.captureCookie(response);

    if ((response.status === 401 || response.status === 403) && this.warmed) {
      this.warmed = false;
      await sleep(DELAY_MS);
      await this.warmSession(symbol);
      await sleep(DELAY_MS);
      response = await fetch(url, { headers: this.buildHeaders(symbol) });
      this.captureCookie(response);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`NSE fetch failed ${response.status} for ${url}: ${text.slice(0, 200)}`);
    }

    return response.json();
  }

  private buildHeaders(symbol?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: symbol
        ? `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`
        : 'https://www.nseindia.com/companies-listing/corporate-filings-financial-results',
    };
    if (this.cookie) headers['Cookie'] = this.cookie;
    return headers;
  }

  private captureCookie(response: Response): void {
    const h = response.headers as Headers & { getSetCookie?: () => string[] };
    const cookieValues =
      typeof h.getSetCookie === 'function'
        ? h.getSetCookie()
        : String(h.get('set-cookie') || '').split(/,(?=[^;]+?=)/);
    const parts = cookieValues
      .map((c) => String(c || '').split(';')[0].trim())
      .filter(Boolean);
    if (parts.length > 0) this.cookie = parts.join('; ');
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultDateRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  return {
    fromDate: formatNseDate(from),
    toDate: formatNseDate(to),
  };
}

function formatNseDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// ---------------------------------------------------------------------------
// Field-name normalizer
//
// The live NSE API (as of 2026) returns rows with bm_* prefixed field names:
//   bm_symbol  → symbol
//   bm_date    → meetingDate
//   bm_purpose → purpose
//   bm_desc    → bm_desc (already correct)
//
// The parser (parseNseBoardMeetings) expects the canonical names used in the
// test fixtures (symbol / meetingDate / purpose).  This normalizer bridges the
// two representations without altering the parser or its tests.
// ---------------------------------------------------------------------------

function normalizeNseRow(raw: Record<string, unknown>): NseBoardMeetingRow {
  return {
    // Accept real-API field names with fallback to fixture/legacy names
    symbol: String(raw.bm_symbol ?? raw.symbol ?? ''),
    company: String(raw.sm_name ?? raw.company ?? ''),
    purpose: String(raw.bm_purpose ?? raw.purpose ?? ''),
    meetingDate: String(raw.bm_date ?? raw.meetingDate ?? ''),
    bm_desc: String(raw.bm_desc ?? ''),
    ...raw,
  };
}

// ---------------------------------------------------------------------------
// Core ingest function
// ---------------------------------------------------------------------------

/**
 * Fetch, parse, match, and persist NSE board-meeting result dates.
 *
 * Throws only on unexpected internal errors; NSE fetch failures are caught
 * and returned as status='BLOCKED' with an error message so HTTP callers
 * receive a clean JSON response rather than a 500.
 */
export async function ingestNseBoardMeetings(
  options: BoardMeetingsIngestOptions = {}
): Promise<BoardMeetingsIngestResult> {
  const defaults = defaultDateRange();
  const fromDate = options.fromDate ?? defaults.fromDate;
  const toDate = options.toDate ?? defaults.toDate;
  const dryRun = options.dryRun ?? false;
  const singleSymbol = options.symbol ? options.symbol.trim().toUpperCase() : null;

  const result: BoardMeetingsIngestResult = {
    status: 'COMPLETED',
    rawRows: 0,
    parsedMeetings: 0,
    written: 0,
    alreadySet: 0,
    noMatch: 0,
    noFundamental: 0,
    failed: 0,
    warnings: [],
    examples: [],
  };

  // ── 1. Fetch from NSE ────────────────────────────────────────────────────
  const client = new NseFetchClient();
  let rawRows: NseBoardMeetingRow[] = [];

  const url = buildNseBoardMeetingsUrl({
    index: 'equities',
    ...(singleSymbol ? { symbol: singleSymbol } : {}),
    fromDate,
    toDate,
  });

  try {
    const data = await client.fetchJson(url, singleSymbol ?? undefined);
    if (Array.isArray(data)) {
      rawRows = (data as Record<string, unknown>[]).map(normalizeNseRow);
    } else if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).data)) {
      rawRows = ((data as Record<string, unknown>).data as Record<string, unknown>[]).map(normalizeNseRow);
    } else {
      result.warnings.push(
        `Unexpected NSE response shape — no array found. Preview: ${JSON.stringify(data).slice(0, 300)}`
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.status = 'BLOCKED';
    result.error = `NSE fetch failed: ${message}`;
    return result;
  }

  result.rawRows = rawRows.length;
  if (rawRows.length === 0) {
    result.warnings.push('NSE returned 0 rows — possible bot-block or empty range.');
    result.status = 'PARTIAL';
    return result;
  }

  // ── 2. Parse + filter result-announcement rows ───────────────────────────
  const { parsed, skipped, warnings: parseWarnings } = parseNseBoardMeetings(rawRows, {
    fromDate: new Date(fromDate.split('-').reverse().join('-')),
    toDate: new Date(toDate.split('-').reverse().join('-')),
  });
  result.parsedMeetings = parsed.length;
  result.warnings.push(...parseWarnings);

  if (parsed.length === 0) {
    result.warnings.push(`No result-announcement board meetings found (${skipped} skipped).`);
    return result;
  }

  // ── 3. Resolve stock catalog + load Fundamental rows ────────────────────
  const symbols = [...new Set(parsed.map((p) => p.symbol))];

  const stocks = await (prisma as any).stock.findMany({
    where: { symbol: { in: symbols }, region: 'IN', assetType: 'STOCK' },
    select: { id: true, symbol: true },
  });
  const symbolToStockId = new Map<string, string>(
    stocks.map((s: { id: string; symbol: string }) => [s.symbol.toUpperCase(), s.id])
  );

  const stockIds = stocks.map((s: { id: string }) => s.id);
  const fundamentals = await (prisma as any).fundamental.findMany({
    where: { stockId: { in: stockIds } },
    select: { id: true, stockId: true, periodEndDate: true, periodType: true, officialResultDate: true },
    orderBy: [{ stockId: 'asc' }, { periodEndDate: 'desc' }],
  });

  // Group fundamentals by stockId
  const fundsByStockId = new Map<string, typeof fundamentals>();
  for (const f of fundamentals) {
    const arr = fundsByStockId.get(f.stockId) ?? [];
    arr.push(f);
    fundsByStockId.set(f.stockId, arr);
  }

  // ── 4. Match board meetings → fundamental rows ───────────────────────────
  const updates: Array<{
    id: string;
    officialResultDate: Date;
    symbol: string;
    periodEndDate: Date;
  }> = [];

  const bySymbol = new Map<string, ParsedBoardMeeting[]>();
  for (const bm of parsed) {
    const arr = bySymbol.get(bm.symbol) ?? [];
    arr.push(bm);
    bySymbol.set(bm.symbol, arr);
  }

  for (const [symbol, meetings] of bySymbol.entries()) {
    const stockId = symbolToStockId.get(symbol);
    if (!stockId) {
      result.noFundamental += meetings.length;
      continue;
    }

    const rows = fundsByStockId.get(stockId) ?? [];
    if (rows.length === 0) {
      result.noFundamental += meetings.length;
      continue;
    }

    const periodEndDates: Date[] = rows.map((r: { periodEndDate: Date }) => r.periodEndDate);

    for (const bm of meetings) {
      const matchedPeriodEnd = matchBoardMeetingToPeriodEnd(bm.boardMeetingDate, periodEndDates);
      if (!matchedPeriodEnd) {
        result.noMatch += 1;
        continue;
      }

      const matchingRows = rows.filter(
        (r: { periodEndDate: Date }) => r.periodEndDate.getTime() === matchedPeriodEnd.getTime()
      );
      for (const row of matchingRows) {
        const existing: Date | null = row.officialResultDate ?? null;
        if (
          existing &&
          Math.abs(existing.getTime() - bm.boardMeetingDate.getTime()) < 24 * 60 * 60 * 1000
        ) {
          result.alreadySet += 1;
          continue;
        }
        updates.push({
          id: row.id,
          officialResultDate: bm.boardMeetingDate,
          symbol,
          periodEndDate: matchedPeriodEnd,
        });
      }
    }
  }

  if (dryRun) {
    result.written = 0;
    result.warnings.push(`DRY_RUN — ${updates.length} rows would be updated (no DB writes).`);
    result.examples = updates.slice(0, 10).map((u) => ({
      symbol: u.symbol,
      periodEndDate: u.periodEndDate.toISOString().slice(0, 10),
      officialResultDate: u.officialResultDate.toISOString().slice(0, 10),
    }));
    return result;
  }

  // ── 5. Persist ────────────────────────────────────────────────────────────
  for (const u of updates) {
    try {
      await (prisma as any).fundamental.update({
        where: { id: u.id },
        data: { officialResultDate: u.officialResultDate },
      });
      result.written += 1;
      if (result.examples.length < 10) {
        result.examples.push({
          symbol: u.symbol,
          periodEndDate: u.periodEndDate.toISOString().slice(0, 10),
          officialResultDate: u.officialResultDate.toISOString().slice(0, 10),
        });
      }
    } catch (err) {
      result.failed += 1;
      result.warnings.push(
        `Failed to update fundamental ${u.id} (${u.symbol}): ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (result.failed > 0) result.status = 'PARTIAL';
  return result;
}
