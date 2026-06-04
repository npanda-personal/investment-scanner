/**
 * Ingest historical Nifty 50 (^NSEI) EOD data from the NSE Archives bhavcopy CSV.
 *
 * Source: https://archives.nseindia.com/content/indices/ind_close_all_DDMMYYYY.csv
 *
 * This replaces the old ingest-nifty50-history.ts which hit the Akamai-gated
 * NSE indicesHistory API. The archives endpoint returns clean CSV for all
 * trading dates and requires only a User-Agent + Referer header — no cookie
 * priming needed.
 *
 * Idempotent:
 *   1. Pre-loads all existing ^NSEI timestamps from price_ticks and skips them.
 *   2. Uses INSERT … ON CONFLICT (symbol, timestamp) DO NOTHING as a backstop.
 *   Re-running the script is always safe.
 *
 * Usage:
 *   cd backend
 *   npx ts-node --transpile-only scripts/ingest-nifty50-bhavcopy.ts
 *
 * Environment variables:
 *   FROM_YEAR=2015      First calendar year to ingest (default 2015)
 *   TO_YEAR=2026        Last  calendar year to ingest (default = current year)
 *   DRY_RUN=1           Parse + count without writing to DB
 *   THROTTLE_MS=200     Delay between requests in ms (default 200)
 *
 * Request volume for a full 2015-01-01 → today run:
 *   ~2,900 calendar weekdays (excl. Sat/Sun) over 11 years.
 *   At 200 ms throttle ≈ 10 min total wall-clock.
 *   Holidays → 404 or missing Nifty 50 row → counted as "skipped (holiday)".
 *   Only actual trading days produce an inserted row.
 *
 * Output schema:
 *   price_ticks (symbol, timestamp, open, high, low, close,
 *                "adjustedClose", source, region, exchange, "dataStatus")
 *   symbol        = '^NSEI'
 *   source        = 'NSE_INDEX_EOD'
 *   adjustedClose = close  (Nifty 50 is a price-return index; no CA adjustment)
 *   region        = 'IN'
 *   exchange      = 'NSE'
 *   dataStatus    = 'COMPLETE'
 */

import { Prisma, PrismaClient } from '@prisma/client';
import {
  parseIndexBhavcopyCsv,
  buildBhavcopyCsvUrl,
  NSE_INDEX_EOD_SOURCE,
  NSE_INDEX_EOD_SYMBOL,
} from '../src/modules/market-data-foundation/market-data-foundation.nse-bhavcopy-index-source';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FROM_YEAR   = parseInt(process.env.FROM_YEAR   || '2015',  10);
const TO_YEAR     = parseInt(process.env.TO_YEAR     || String(new Date().getUTCFullYear()), 10);
const DRY_RUN     = process.env.DRY_RUN     === '1';
const THROTTLE_MS = parseInt(process.env.THROTTLE_MS || '200',   10);

const RETRY_DELAY_MS     = 600;  // wait before retry on transient error
const PROGRESS_EVERY     = 100;  // print progress every N days iterated
const FETCH_TIMEOUT_MS   = 15000;

const ARCHIVES_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const ARCHIVES_REFERER = 'https://www.nseindia.com/';

// ---------------------------------------------------------------------------
// Date iteration helpers
// ---------------------------------------------------------------------------

/** Produce every Mon–Fri date (UTC) from fromDate to toDate inclusive. */
function* weekdays(fromDate: Date, toDate: Date): Generator<Date> {
  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    const dow = cursor.getUTCDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) {
      yield new Date(cursor);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Fetch with single retry (for transient network errors)
// ---------------------------------------------------------------------------

async function fetchCsvWithRetry(url: string): Promise<string | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            'User-Agent': ARCHIVES_USER_AGENT,
            Referer:      ARCHIVES_REFERER,
            Accept:       'text/csv,text/plain,*/*',
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      // 404 = file doesn't exist for that date (holiday or future date) — not an error
      if (response.status === 404) return null;

      if (!response.ok) {
        // Non-404 failure — worth retrying once
        if (attempt < 2) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        return null; // give up, count as skipped
      }

      const text = await response.text();
      return text;
    } catch (err) {
      if (attempt < 2) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// DB upsert (idempotent via ON CONFLICT DO NOTHING)
// ---------------------------------------------------------------------------

async function upsertPriceTick(
  prisma: PrismaClient,
  row: { date: string; open: number; high: number; low: number; close: number },
): Promise<boolean> {
  // Use prisma.createMany (not raw SQL) so the client fills its managed columns
  // (id cuid, ingestionTimestamp, lastUpdatedTimestamp — none of which have DB-level
  // defaults). skipDuplicates gives the same ON CONFLICT (symbol,timestamp) DO NOTHING.
  const res = await prisma.priceTick.createMany({
    data: [{
      symbol: NSE_INDEX_EOD_SYMBOL,
      timestamp: new Date(`${row.date}T00:00:00.000Z`),
      open: new Prisma.Decimal(row.open),
      high: new Prisma.Decimal(row.high),
      low: new Prisma.Decimal(row.low),
      close: new Prisma.Decimal(row.close),
      adjustedClose: new Prisma.Decimal(row.close),
      source: NSE_INDEX_EOD_SOURCE,
      region: 'IN',
      exchange: 'NSE',
      dataStatus: 'COMPLETE',
    }],
    skipDuplicates: true,
  });
  return res.count > 0;
}

// ---------------------------------------------------------------------------
// Load existing ^NSEI dates to skip them upfront (faster than DB round-trips)
// ---------------------------------------------------------------------------

async function loadExistingDates(prisma: PrismaClient): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<Array<{ d: string }>>(
    `SELECT to_char(timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS d
     FROM price_ticks
     WHERE symbol = '${NSE_INDEX_EOD_SYMBOL}'`,
  );
  return new Set(rows.map((r) => r.d));
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function elapsedStr(t0: number): string {
  const s = Math.round((Date.now() - t0) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60}s`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();

  console.log('[ingest-nifty50-bhavcopy] Nifty 50 historical EOD ingest via NSE Archives bhavcopy');
  console.log(`  Symbol      : ${NSE_INDEX_EOD_SYMBOL}`);
  console.log(`  Source      : ${NSE_INDEX_EOD_SOURCE}`);
  console.log(`  Range       : ${FROM_YEAR}-01-01 → ${TO_YEAR}-12-31 (Mon–Fri only)`);
  console.log(`  Throttle    : ${THROTTLE_MS}ms`);
  console.log(`  Dry run     : ${DRY_RUN}`);
  console.log(`  Fetch URL   : https://archives.nseindia.com/content/indices/ind_close_all_DDMMYYYY.csv`);
  console.log('');

  const { default: prismaDefault } = await import('../src/db/prisma');
  const prisma: PrismaClient = prismaDefault as unknown as PrismaClient;

  // Pre-load existing dates for fast idempotency check
  console.log('[step 1/3] Loading existing ^NSEI dates...');
  const existingDates = await loadExistingDates(prisma);
  console.log(`  Existing ^NSEI bars: ${existingDates.size}`);

  // Build date range
  const fromDate = new Date(Date.UTC(FROM_YEAR, 0, 1));
  const toDate   = new Date(Math.min(
    new Date(Date.UTC(TO_YEAR, 11, 31)).getTime(),
    Date.now(),
  ));
  console.log(`  Date range: ${isoDate(fromDate)} → ${isoDate(toDate)}`);

  // Count weekdays for ETA
  let totalWeekdays = 0;
  for (const _d of weekdays(fromDate, toDate)) totalWeekdays++;
  console.log(`  Calendar weekdays in range: ${totalWeekdays}`);
  console.log('');
  console.log('[step 2/3] Fetching bhavcopy CSVs...');

  // Stats
  let fetched   = 0;  // successful HTTP responses (non-404)
  let inserted  = 0;  // rows inserted into DB
  let skippedEx = 0;  // skipped because already in DB (pre-load check)
  let skippedHo = 0;  // skipped: 404 or Nifty 50 row missing (holiday)
  let errors    = 0;  // fetch failures (non-404 non-OK, after retry)
  let dayIdx    = 0;

  for (const day of weekdays(fromDate, toDate)) {
    dayIdx++;
    const dateStr = isoDate(day);

    // Fast idempotency check — skip if already in DB
    if (existingDates.has(dateStr)) {
      skippedEx++;
      if (dayIdx % PROGRESS_EVERY === 0) {
        console.log(
          `  [${dayIdx}/${totalWeekdays}] Progress: ` +
          `fetched=${fetched} inserted=${inserted} ` +
          `skipped(existing)=${skippedEx} skipped(holiday)=${skippedHo} ` +
          `errors=${errors} elapsed=${elapsedStr(t0)}`,
        );
      }
      continue;
    }

    const url = buildBhavcopyCsvUrl(day);
    const csvText = await fetchCsvWithRetry(url);

    if (csvText === null) {
      // 404 or network error after retry — treat as holiday/non-trading day
      skippedHo++;
    } else {
      fetched++;
      const row = parseIndexBhavcopyCsv(csvText, 'Nifty 50');

      if (row === null) {
        // CSV returned but no Nifty 50 row — likely a partial holiday file
        skippedHo++;
      } else if (!DRY_RUN) {
        const wasInserted = await upsertPriceTick(prisma, row);
        if (wasInserted) {
          inserted++;
          existingDates.add(dateStr); // keep the set current for idempotency
        } else {
          skippedEx++; // ON CONFLICT backstop fired
        }
      } else {
        // DRY_RUN — count as if inserted
        inserted++;
      }
    }

    // Progress log
    if (dayIdx % PROGRESS_EVERY === 0) {
      console.log(
        `  [${dayIdx}/${totalWeekdays}] Progress: ` +
        `fetched=${fetched} inserted=${inserted} ` +
        `skipped(existing)=${skippedEx} skipped(holiday)=${skippedHo} ` +
        `errors=${errors} elapsed=${elapsedStr(t0)}`,
      );
    }

    // Throttle
    if (dayIdx < totalWeekdays) await sleep(THROTTLE_MS);
  }

  // Final summary
  console.log('');
  console.log('[step 3/3] Final summary...');

  const finalCount = DRY_RUN
    ? `(dry run — not written)`
    : (await prisma.$queryRawUnsafe<Array<{ n: string }>>(
        `SELECT count(*)::text AS n FROM price_ticks WHERE symbol = '${NSE_INDEX_EOD_SYMBOL}'`,
      ))[0]?.n ?? '?';

  const minMaxRow = DRY_RUN
    ? null
    : (await prisma.$queryRawUnsafe<Array<{ mn: string; mx: string }>>(
        `SELECT min(timestamp)::date::text AS mn, max(timestamp)::date::text AS mx
         FROM price_ticks WHERE symbol = '${NSE_INDEX_EOD_SYMBOL}'`,
      ))[0] ?? null;

  console.log('');
  console.log('[ingest-nifty50-bhavcopy] DONE');
  console.log(`  Days iterated       : ${dayIdx} (Mon–Fri in range)`);
  console.log(`  CSV fetches OK      : ${fetched}`);
  console.log(`  Rows inserted       : ${inserted}`);
  console.log(`  Skipped (existing)  : ${skippedEx}`);
  console.log(`  Skipped (holiday)   : ${skippedHo}`);
  console.log(`  Fetch errors        : ${errors}`);
  console.log(`  Total ^NSEI bars    : ${finalCount}`);
  if (minMaxRow) {
    console.log(`  ^NSEI date range    : ${minMaxRow.mn} → ${minMaxRow.mx}`);
  }
  console.log(`  Elapsed             : ${elapsedStr(t0)}`);

  if (errors > 0) {
    console.warn(`\n  WARNING: ${errors} fetch error(s). Re-run the script to retry missing dates.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[ingest-nifty50-bhavcopy] fatal:', err);
  import('../src/db/prisma')
    .then(({ default: p }) => (p as unknown as PrismaClient).$disconnect())
    .finally(() => process.exit(1));
});
