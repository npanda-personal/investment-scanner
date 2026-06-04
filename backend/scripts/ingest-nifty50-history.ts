/**
 * Ingest historical Nifty 50 (^NSEI) EOD data from NSE indicesHistory API.
 *
 * Populates price_ticks with symbol='^NSEI', source='NSE_INDEX_EOD' for the
 * full 2014-01-01 … today range, chunked year-by-year to stay within NSE's
 * per-request limit.
 *
 * Idempotent: existing rows (symbol+timestamp unique constraint) are skipped
 * via ON CONFLICT DO NOTHING — re-running is safe.
 *
 * Usage:
 *   cd backend
 *   npx ts-node --transpile-only scripts/ingest-nifty50-history.ts
 *
 * Overrides via env:
 *   FROM_YEAR=2014   START_YEAR (default 2014)
 *   TO_YEAR=2026     END_YEAR   (default = current year)
 *   DRY_RUN=1        Print counts without writing to DB
 *
 * NSE endpoint (cookie-primed):
 *   https://www.nseindia.com/api/historical/indicesHistory
 *     ?indexType=NIFTY%2050&from=DD-MM-YYYY&to=DD-MM-YYYY
 *
 * Cookie-priming strategy mirrors NseOfficialFinancialResultsClient in
 * market-data-foundation.nse-xbrl-fundamentals-exporter.ts:
 *   1. GET the NSE homepage to receive session cookies
 *   2. Carry cookies on every subsequent API call
 *   3. Auto-retry once on 401/403 after re-warming the session
 *
 * adjustedClose is set equal to close (Nifty is a price-return index;
 * there are no corporate-action adjustments to apply).
 */

import { Prisma, PrismaClient } from '@prisma/client';
import {
  parseNseIndexHistoryPayload,
  buildNseIndexHistoryUrl,
  NSE_INDEX_EOD_SOURCE,
  NSE_INDEX_EOD_SYMBOL,
} from '../src/modules/market-data-foundation/market-data-foundation.nse-index-history-source';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FROM_YEAR = parseInt(process.env.FROM_YEAR || '2014', 10);
const TO_YEAR = parseInt(process.env.TO_YEAR || String(new Date().getUTCFullYear()), 10);
const DRY_RUN = process.env.DRY_RUN === '1';

// NSE caps its per-request range; we chunk by year to stay safe.
const CHUNK_MONTHS = 3; // quarterly chunks inside each year
const DELAY_BETWEEN_CHUNKS_MS = 1200;
const DELAY_AFTER_WARMUP_MS = 800;
const MAX_RETRIES_PER_CHUNK = 2;

// Warm session using the NSE markets/indices homepage.
const NSE_WARMUP_URL = 'https://www.nseindia.com/market-data/live-market-indices-watch';
const NSE_REFERER_INDEX_HISTORY = 'https://www.nseindia.com/market-data/nifty-50-live-chart';

// ---------------------------------------------------------------------------
// NSE cookie-primed fetch client (mirrors NseOfficialFinancialResultsClient)
// ---------------------------------------------------------------------------

class NseIndexFetchClient {
  private cookie = '';
  private warmed = false;

  async warmSession(): Promise<void> {
    try {
      const response = await fetch(NSE_WARMUP_URL, { headers: this.buildHeaders() });
      this.captureCookie(response);
      this.warmed = response.ok;
    } catch (err) {
      console.warn('[nse-client] warmSession failed:', errorMessage(err));
      this.warmed = false;
    }
  }

  async fetchJson(url: string): Promise<unknown> {
    if (!this.warmed) {
      await this.warmSession();
      await sleep(DELAY_AFTER_WARMUP_MS);
    }

    let response = await fetch(url, { headers: this.buildHeaders(NSE_REFERER_INDEX_HISTORY) });
    this.captureCookie(response);

    // Re-warm on 401/403 and retry once
    if ((response.status === 401 || response.status === 403) && this.warmed) {
      this.warmed = false;
      await this.warmSession();
      await sleep(DELAY_AFTER_WARMUP_MS);
      response = await fetch(url, { headers: this.buildHeaders(NSE_REFERER_INDEX_HISTORY) });
      this.captureCookie(response);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`NSE request failed (${response.status}) for ${url}: ${body.slice(0, 200)}`);
    }

    return response.json();
  }

  private buildHeaders(referer?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: referer || NSE_WARMUP_URL,
    };
    if (this.cookie) headers['Cookie'] = this.cookie;
    return headers;
  }

  private captureCookie(response: Response): void {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    const cookieValues =
      typeof headers.getSetCookie === 'function'
        ? headers.getSetCookie()
        : String(headers.get('set-cookie') || '').split(/,(?=[^;]+?=)/);
    const parts = cookieValues
      .map((c) => String(c || '').split(';')[0].trim())
      .filter(Boolean);
    if (parts.length > 0) this.cookie = parts.join('; ');
  }
}

// ---------------------------------------------------------------------------
// Date chunk builder
// ---------------------------------------------------------------------------

interface DateChunk {
  from: Date;
  to: Date;
  label: string;
}

function buildQuarterlyChunks(fromYear: number, toYear: number): DateChunk[] {
  const chunks: DateChunk[] = [];
  const today = new Date();

  for (let year = fromYear; year <= toYear; year += 1) {
    for (let q = 0; q < 4; q += 1) {
      const fromMonth = q * CHUNK_MONTHS; // 0-indexed
      const toMonth = fromMonth + CHUNK_MONTHS - 1;

      const from = new Date(Date.UTC(year, fromMonth, 1));
      // Last day of toMonth
      const toRaw = new Date(Date.UTC(year, toMonth + 1, 0)); // day 0 of next month = last day of toMonth
      const to = toRaw > today ? today : toRaw;

      if (from > today) break; // no future chunks

      chunks.push({
        from,
        to,
        label: `${year}-Q${q + 1} (${fmtDate(from)} to ${fmtDate(to)})`,
      });
    }
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// DB upsert (idempotent via ON CONFLICT DO NOTHING on symbol+timestamp key)
// ---------------------------------------------------------------------------

async function upsertPriceTicks(
  prisma: PrismaClient,
  rows: Array<{ date: Date; open: number; high: number; low: number; close: number }>
): Promise<{ inserted: number; skipped: number }> {
  if (rows.length === 0) return { inserted: 0, skipped: 0 };

  // We use a raw SQL upsert so we can use ON CONFLICT DO NOTHING for the
  // unique (symbol, timestamp) constraint — no schema migration needed,
  // no Prisma model change required.
  const values = rows.map((row) => {
    const ts = row.date.toISOString(); // Postgres accepts ISO timestamp strings
    const closeDecimal = new Prisma.Decimal(row.close);
    return {
      symbol: NSE_INDEX_EOD_SYMBOL,
      timestamp: ts,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      // For a price-return index, adjustedClose = close
      adjustedClose: row.close,
      source: NSE_INDEX_EOD_SOURCE,
      region: 'IN',
      exchange: 'NSE',
      dataStatus: 'COMPLETE',
    };
  });

  // Batch in groups of 500 for safety
  const BATCH_SIZE = 500;
  let totalInserted = 0;
  let totalSkipped = 0;

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);

    // Build a multi-row INSERT ... ON CONFLICT DO NOTHING
    // using Prisma.sql template tags to prevent SQL injection.
    const valueClauses = batch.map((row) =>
      Prisma.sql`(
        ${Prisma.raw(`'${row.symbol.replace(/'/g, "''")}'`)},
        ${Prisma.raw(`'${row.timestamp}'`)}::timestamptz,
        ${new Prisma.Decimal(row.open)},
        ${new Prisma.Decimal(row.high)},
        ${new Prisma.Decimal(row.low)},
        ${new Prisma.Decimal(row.close)},
        ${new Prisma.Decimal(row.adjustedClose)},
        ${Prisma.raw(`'${row.source}'`)},
        ${Prisma.raw(`'${row.region}'`)},
        ${Prisma.raw(`'${row.exchange}'`)},
        ${Prisma.raw(`'${row.dataStatus}'`)}
      )`
    );

    // Prisma.join builds a comma-separated list from the array
    const query = Prisma.sql`
      INSERT INTO price_ticks
        (symbol, timestamp, open, high, low, close, "adjustedClose", source, region, exchange, "dataStatus")
      VALUES ${Prisma.join(valueClauses)}
      ON CONFLICT (symbol, timestamp) DO NOTHING
    `;

    const result: any = await prisma.$executeRaw(query);
    // $executeRaw returns the number of affected (inserted) rows
    const inserted = typeof result === 'number' ? result : Number(result ?? 0);
    totalInserted += inserted;
    totalSkipped += batch.length - inserted;
  }

  return { inserted: totalInserted, skipped: totalSkipped };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));
const fmtDate = (d: Date): string => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  console.log('[ingest-nifty50-history] Starting Nifty 50 historical EOD ingest');
  console.log(`  Symbol   : ${NSE_INDEX_EOD_SYMBOL}`);
  console.log(`  Source   : ${NSE_INDEX_EOD_SOURCE}`);
  console.log(`  Range    : ${FROM_YEAR}-01-01 → ${TO_YEAR}-12-31`);
  console.log(`  Dry run  : ${DRY_RUN}`);

  const { default: prismaDefault } = await import('../src/db/prisma');
  const prisma: PrismaClient = prismaDefault as unknown as PrismaClient;

  // How many bars does ^NSEI already have?
  const existingCount = await prisma.$queryRawUnsafe<Array<{ n: string }>>(
    `SELECT count(*)::text AS n FROM price_ticks WHERE symbol = '${NSE_INDEX_EOD_SYMBOL}'`
  );
  console.log(`  Existing ^NSEI bars: ${existingCount[0]?.n ?? 0}`);

  const chunks = buildQuarterlyChunks(FROM_YEAR, TO_YEAR);
  console.log(`  Chunks to fetch: ${chunks.length} (quarterly)`);

  const client = new NseIndexFetchClient();

  // Warm session before the loop
  console.log('\n[step 1/2] Warming NSE session...');
  await client.warmSession();
  await sleep(DELAY_AFTER_WARMUP_MS);
  console.log('  Session warmed.');

  console.log('\n[step 2/2] Fetching chunks...');
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalParseSkipped = 0;
  let totalParseWarnings = 0;
  let chunksFailed = 0;

  for (let ci = 0; ci < chunks.length; ci += 1) {
    const chunk = chunks[ci];
    const url = buildNseIndexHistoryUrl(chunk.from, chunk.to);

    let payload: unknown = null;
    let fetchOk = false;

    for (let attempt = 1; attempt <= MAX_RETRIES_PER_CHUNK; attempt += 1) {
      try {
        payload = await client.fetchJson(url);
        fetchOk = true;
        break;
      } catch (err) {
        console.warn(`  [${chunk.label}] attempt ${attempt}/${MAX_RETRIES_PER_CHUNK} failed: ${errorMessage(err)}`);
        if (attempt < MAX_RETRIES_PER_CHUNK) await sleep(DELAY_BETWEEN_CHUNKS_MS * 2);
      }
    }

    if (!fetchOk || payload === null) {
      chunksFailed += 1;
      console.error(`  [${chunk.label}] SKIPPED after all retries.`);
      await sleep(DELAY_BETWEEN_CHUNKS_MS);
      continue;
    }

    const { rows, skipped, warnings } = parseNseIndexHistoryPayload(payload);
    totalParseSkipped += skipped;
    totalParseWarnings += warnings.length;
    if (warnings.length > 0) {
      console.warn(`  [${chunk.label}] parser warnings (${warnings.length}): ${warnings.slice(0, 2).join(' | ')}`);
    }

    let inserted = 0;
    let skipDb = 0;

    if (!DRY_RUN && rows.length > 0) {
      const result = await upsertPriceTicks(prisma, rows);
      inserted = result.inserted;
      skipDb = result.skipped;
    } else {
      // Dry run: count as if we'd insert all
      inserted = rows.length;
      skipDb = 0;
    }

    totalInserted += inserted;
    totalSkipped += skipDb;

    const elapsed = Math.round((Date.now() - t0) / 1000);
    const pct = Math.round(((ci + 1) / chunks.length) * 100);
    console.log(
      `  [${String(ci + 1).padStart(3)}/${chunks.length}] ${chunk.label} ` +
      `parsed=${rows.length} inserted=${inserted} dup=${skipDb} ` +
      `parseSkip=${skipped} ${pct}% ${elapsed}s`
    );

    if (ci < chunks.length - 1) await sleep(DELAY_BETWEEN_CHUNKS_MS);
  }

  // Final summary
  const totalElapsed = Math.round((Date.now() - t0) / 1000);
  const finalCount = DRY_RUN
    ? '(dry run)'
    : (await prisma.$queryRawUnsafe<Array<{ n: string }>>(
        `SELECT count(*)::text AS n FROM price_ticks WHERE symbol = '${NSE_INDEX_EOD_SYMBOL}'`
      ))[0]?.n ?? '?';

  console.log('\n[ingest-nifty50-history] DONE');
  console.log(`  Chunks processed : ${chunks.length - chunksFailed}/${chunks.length}`);
  console.log(`  Chunks failed    : ${chunksFailed}`);
  console.log(`  Rows inserted    : ${totalInserted}`);
  console.log(`  Rows skipped(dup): ${totalSkipped}`);
  console.log(`  Parse-skipped    : ${totalParseSkipped}`);
  console.log(`  Parse-warnings   : ${totalParseWarnings}`);
  console.log(`  Total ^NSEI bars : ${finalCount}`);
  console.log(`  Elapsed          : ${totalElapsed}s`);

  if (chunksFailed > 0) {
    console.warn(`\n  WARNING: ${chunksFailed} chunk(s) failed. Re-run the script to retry.`);
    console.warn('  NSE rate-limits are common — a brief wait and re-run usually resolves this.');
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[ingest-nifty50-history] fatal:', err);
  import('../src/db/prisma')
    .then(({ default: p }) => (p as any).$disconnect())
    .finally(() => process.exit(1));
});
