/**
 * Ingest official NSE board-meeting / result-announcement dates and persist
 * them as officialResultDate on matching Fundamental rows.
 *
 * Source: NSE India API (cookie-primed — same strategy as XBRL fundamentals)
 *   https://www.nseindia.com/api/corporate-board-meetings?index=equities
 *
 * What it does:
 *   1. Fetches board-meeting JSON from NSE (bulk equities endpoint, date-windowed).
 *   2. Parses + filters rows that are result-announcement purposes.
 *   3. For each symbol: resolves stockId, loads existing Fundamental periodEndDates,
 *      matches each board meeting to the most likely Fundamental row by period-end
 *      proximity, and sets officialResultDate on that row.
 *   4. Logs progress and summary.
 *
 * Run:
 *   npx ts-node --transpile-only scripts/ingest-nse-earnings-dates.ts
 *
 * Options (env vars):
 *   NSE_EARNINGS_FROM_DATE   'DD-MM-YYYY' — defaults to 90 days ago
 *   NSE_EARNINGS_TO_DATE     'DD-MM-YYYY' — defaults to 90 days ahead
 *   NSE_EARNINGS_DRY_RUN     '1' — parse + match but do NOT write to DB
 *   NSE_EARNINGS_SYMBOL      single symbol to ingest (uses per-symbol endpoint)
 *
 * NOTE: NSE is bot-protected. This script uses the same cookie-priming approach
 * as the XBRL fundamentals exporter (NseOfficialFinancialResultsClient):
 *   GET /get-quotes/equity?symbol=X → captures Set-Cookie
 *   then GET /api/corporate-board-meetings?index=equities → returns JSON
 *
 * Live fetch may fail if NSE changes its bot-detection; the parser is
 * independently tested offline (see tests/modules/earnings-intelligence/).
 */
import prisma from '../src/db/prisma';
import {
  parseNseBoardMeetings,
  buildNseBoardMeetingsUrl,
  matchBoardMeetingToPeriodEnd,
  type NseBoardMeetingRow,
  type ParsedBoardMeeting,
} from '../src/modules/earnings-intelligence/earnings-intelligence.nse-board-meetings-source';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DRY_RUN = process.env.NSE_EARNINGS_DRY_RUN === '1';
const SINGLE_SYMBOL = (process.env.NSE_EARNINGS_SYMBOL ?? '').trim().toUpperCase() || null;
const DELAY_MS = 600; // ms between NSE API calls — be polite

// Default: 90 days ago → 90 days ahead (covers both recent results and upcoming)
function defaultDateRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  return {
    fromDate: process.env.NSE_EARNINGS_FROM_DATE ?? formatNseDate(from),
    toDate: process.env.NSE_EARNINGS_TO_DATE ?? formatNseDate(to),
  };
}

function formatNseDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// ---------------------------------------------------------------------------
// Cookie-primed NSE fetch (mirrors NseOfficialFinancialResultsClient)
// ---------------------------------------------------------------------------

class NseFetchClient {
  private cookie = '';
  private warmed = false;

  async warmSession(symbol?: string): Promise<void> {
    const url = symbol
      ? `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`
      : 'https://www.nseindia.com/companies-listing/corporate-filings-financial-results';
    try {
      const response = await fetch(url, { headers: this.headers(symbol) });
      this.captureCookie(response);
      this.warmed = response.ok;
      if (!response.ok) {
        console.warn(`[nse-fetch] warm session returned ${response.status} for ${url}`);
      }
    } catch (err) {
      console.warn(`[nse-fetch] warm session failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async fetchJson(url: string, symbol?: string): Promise<unknown> {
    if (!this.warmed) await this.warmSession(symbol);

    let response = await fetch(url, { headers: this.headers(symbol) });
    this.captureCookie(response);

    if ((response.status === 401 || response.status === 403) && this.warmed) {
      this.warmed = false;
      await this.warmSession(symbol);
      await sleep(DELAY_MS);
      response = await fetch(url, { headers: this.headers(symbol) });
      this.captureCookie(response);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`NSE fetch failed ${response.status} for ${url}: ${text.slice(0, 200)}`);
    }

    return response.json();
  }

  private headers(symbol?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0 Safari/537.36',
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
    const cookieValues = typeof h.getSetCookie === 'function'
      ? h.getSetCookie()
      : String(h.get('set-cookie') || '').split(/,(?=[^;]+?=)/);
    const parts = cookieValues
      .map((c) => String(c || '').split(';')[0].trim())
      .filter(Boolean);
    if (parts.length > 0) this.cookie = parts.join('; ');
  }
}

// ---------------------------------------------------------------------------
// Field-name normalizer
//
// The live NSE API (as of 2026) returns bm_* prefixed field names:
//   bm_symbol → symbol, bm_date → meetingDate, bm_purpose → purpose
// The parser expects the canonical names used in the test fixtures.
// ---------------------------------------------------------------------------

function normalizeNseRow(raw: Record<string, unknown>): NseBoardMeetingRow {
  return {
    symbol: String(raw.bm_symbol ?? raw.symbol ?? ''),
    company: String(raw.sm_name ?? raw.company ?? ''),
    purpose: String(raw.bm_purpose ?? raw.purpose ?? ''),
    meetingDate: String(raw.bm_date ?? raw.meetingDate ?? ''),
    bm_desc: String(raw.bm_desc ?? ''),
    ...raw,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  const { fromDate, toDate } = defaultDateRange();
  console.log(`[ingest-nse-earnings-dates] START`);
  console.log(`  fromDate=${fromDate}  toDate=${toDate}  dryRun=${DRY_RUN}  symbol=${SINGLE_SYMBOL ?? '(all)'}`);

  // ── 1. Fetch board meetings from NSE ────────────────────────────────────
  const client = new NseFetchClient();
  let rawRows: NseBoardMeetingRow[] = [];

  const url = buildNseBoardMeetingsUrl({
    index: 'equities',
    ...(SINGLE_SYMBOL ? { symbol: SINGLE_SYMBOL } : {}),
    fromDate,
    toDate,
  });

  console.log(`[ingest-nse-earnings-dates] Fetching: ${url}`);
  try {
    const data = await client.fetchJson(url, SINGLE_SYMBOL ?? undefined);
    if (Array.isArray(data)) {
      rawRows = (data as Record<string, unknown>[]).map(normalizeNseRow);
    } else if (data && typeof data === 'object' && Array.isArray((data as any).data)) {
      rawRows = ((data as any).data as Record<string, unknown>[]).map(normalizeNseRow);
    } else {
      console.warn('[ingest-nse-earnings-dates] Unexpected response shape — no array found. Raw:', JSON.stringify(data).slice(0, 300));
    }
  } catch (err) {
    console.error(`[ingest-nse-earnings-dates] NSE fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    console.error('[ingest-nse-earnings-dates] ABORTED — live NSE fetch required. Run this script on a machine with NSE access (cookie-primed).');
    process.exitCode = 1;
    return;
  }

  console.log(`[ingest-nse-earnings-dates] Raw rows from NSE: ${rawRows.length}`);

  // ── 2. Parse + filter result-announcement rows ──────────────────────────
  const { parsed, skipped, warnings } = parseNseBoardMeetings(rawRows);
  console.log(`[ingest-nse-earnings-dates] Parsed result-announcement meetings: ${parsed.length} (skipped/errored: ${skipped})`);
  if (warnings.length > 0) {
    console.warn(`[ingest-nse-earnings-dates] Parse warnings (${warnings.length}):`);
    for (const w of warnings.slice(0, 10)) console.warn(`  ${w}`);
    if (warnings.length > 10) console.warn(`  ... and ${warnings.length - 10} more`);
  }

  if (parsed.length === 0) {
    console.log('[ingest-nse-earnings-dates] No result-announcement board meetings found. Done.');
    return;
  }

  // ── 3. Load stock catalog and fundamentals ──────────────────────────────
  const symbols = [...new Set(parsed.map((p) => p.symbol))];
  console.log(`[ingest-nse-earnings-dates] Unique symbols with result meetings: ${symbols.length}`);

  const stocks = await prisma.stock.findMany({
    where: { symbol: { in: symbols }, region: 'IN', assetType: 'STOCK' },
    select: { id: true, symbol: true },
  });
  const symbolToStockId = new Map(stocks.map((s) => [s.symbol.toUpperCase(), s.id]));
  console.log(`[ingest-nse-earnings-dates] Matched to catalog: ${stocks.length}/${symbols.length} symbols`);

  const stockIds = stocks.map((s) => s.id);
  const fundamentals = await prisma.fundamental.findMany({
    where: { stockId: { in: stockIds } },
    select: { id: true, stockId: true, periodEndDate: true, periodType: true, officialResultDate: true },
    orderBy: [{ stockId: 'asc' }, { periodEndDate: 'desc' }],
  });

  // Group by stockId
  const fundsByStockId = new Map<string, typeof fundamentals>();
  for (const f of fundamentals) {
    const arr = fundsByStockId.get(f.stockId) ?? [];
    arr.push(f);
    fundsByStockId.set(f.stockId, arr);
  }

  // ── 4. Match board meetings → fundamental rows ──────────────────────────
  let matched = 0;
  let alreadySet = 0;
  let noFundamental = 0;
  let noMatch = 0;
  const updates: Array<{ id: string; officialResultDate: Date; symbol: string; periodEndDate: Date }> = [];

  // Group parsed board meetings by symbol
  const bySymbol = new Map<string, ParsedBoardMeeting[]>();
  for (const bm of parsed) {
    const arr = bySymbol.get(bm.symbol) ?? [];
    arr.push(bm);
    bySymbol.set(bm.symbol, arr);
  }

  for (const [symbol, meetings] of bySymbol.entries()) {
    const stockId = symbolToStockId.get(symbol);
    if (!stockId) {
      noFundamental += meetings.length;
      continue;
    }

    const rows = fundsByStockId.get(stockId) ?? [];
    if (rows.length === 0) {
      noFundamental += meetings.length;
      continue;
    }

    const periodEndDates = rows.map((r) => r.periodEndDate);

    for (const bm of meetings) {
      const matchedPeriodEnd = matchBoardMeetingToPeriodEnd(bm.boardMeetingDate, periodEndDates);
      if (!matchedPeriodEnd) {
        noMatch += 1;
        continue;
      }

      // Find the fundamental row(s) with this periodEndDate
      const matchingRows = rows.filter(
        (r) => r.periodEndDate.getTime() === matchedPeriodEnd.getTime()
      );
      for (const row of matchingRows) {
        const existing = row.officialResultDate;
        if (existing && Math.abs(existing.getTime() - bm.boardMeetingDate.getTime()) < 24 * 60 * 60 * 1000) {
          alreadySet += 1;
          continue;
        }
        updates.push({
          id: row.id,
          officialResultDate: bm.boardMeetingDate,
          symbol,
          periodEndDate: matchedPeriodEnd,
        });
        matched += 1;
      }
    }
  }

  console.log(`[ingest-nse-earnings-dates] Match results:`);
  console.log(`  matched=${matched}  alreadySet=${alreadySet}  noMatch=${noMatch}  noFundamental=${noFundamental}`);

  if (DRY_RUN) {
    console.log('[ingest-nse-earnings-dates] DRY_RUN=1 — skipping DB writes.');
    for (const u of updates.slice(0, 10)) {
      console.log(`  would set: ${u.symbol} periodEnd=${u.periodEndDate.toISOString().slice(0, 10)} → officialResultDate=${u.officialResultDate.toISOString().slice(0, 10)}`);
    }
    if (updates.length > 10) console.log(`  ... and ${updates.length - 10} more`);
    return;
  }

  // ── 5. Write to DB ───────────────────────────────────────────────────────
  let written = 0;
  let failed = 0;
  for (const u of updates) {
    try {
      await prisma.fundamental.update({
        where: { id: u.id },
        data: { officialResultDate: u.officialResultDate },
      });
      written += 1;
    } catch (err) {
      failed += 1;
      console.warn(`[ingest-nse-earnings-dates] Failed to update fundamental ${u.id} (${u.symbol}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const elapsed = Math.round((Date.now() - t0) / 1000);
  console.log(`[ingest-nse-earnings-dates] DONE — written=${written}  failed=${failed}  elapsed=${elapsed}s`);

  // ── 6. Verification: count populated officialResultDate rows ────────────
  const populated = await prisma.fundamental.count({
    where: { officialResultDate: { not: null } },
  });
  const total = await prisma.fundamental.count();
  console.log(`[ingest-nse-earnings-dates] DB coverage: ${populated}/${total} fundamental rows have officialResultDate`);
}

main()
  .catch((err) => { console.error('[ingest-nse-earnings-dates] Fatal:', err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
