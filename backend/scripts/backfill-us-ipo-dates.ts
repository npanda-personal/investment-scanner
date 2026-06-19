/**
 * backfill-us-ipo-dates.ts — populate Stock.ipoDate for active US stocks from
 * Yahoo Finance chart metadata (meta.firstTradeDateEpochUtc).
 *
 * Why: the DQE trust tier falls back to a 15-year (now 5-year for US) price-history
 * requirement when ipoDate is NULL. Populating it lets stocks listed after the
 * lookback cutoff be trusted based on their actual listing date instead.
 *
 * Uses a minimal chart request (period1=1&period2=2) so no OHLCV payload is
 * downloaded — just the meta block. ~300ms throttle to avoid Yahoo bans.
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/backfill-us-ipo-dates.ts
 *   npx ts-node --transpile-only scripts/backfill-us-ipo-dates.ts --concurrency=3
 */
import * as https from 'https';
import prisma from '../src/db/prisma';

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : undefined;
}

const THROTTLE_MS = Number(arg('throttle') || 300);
const CONCURRENCY = Number(arg('concurrency') || 3);
const TIMEOUT_MS = 12_000;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function fetchFirstTradeDate(rawSymbol: string): Promise<Date | null> {
  return new Promise((resolve) => {
    // Use providerSymbol (e.g. "BRK-B") if set, else raw symbol.
    // Yahoo strips dots: "BRK.B" → "BRK-B" on their side; we store the
    // already-normalised form in providerSymbol.
    const encoded = encodeURIComponent(rawSymbol);
    // Fetch a short recent window (7 days) so Yahoo returns a valid response
    // with the meta block that contains firstTradeDate.
    const p2 = Math.floor(Date.now() / 1000);
    const p1 = p2 - 7 * 86400;
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}` +
      `?period1=${p1}&period2=${p2}&interval=1d&includeAdjustedClose=false`;

    const req = https.get(
      url,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: TIMEOUT_MS },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => (body += chunk.toString()));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            const meta = json?.chart?.result?.[0]?.meta as Record<string, unknown> | undefined;
            // Yahoo returns firstTradeDateEpochUtc (seconds) or firstTradeDate
            // Yahoo returns `firstTradeDate` (seconds epoch) in the meta block.
            // `firstTradeDateEpochUtc` is absent in practice; keep as fallback.
            const epoch =
              (meta?.firstTradeDate as number | undefined) ??
              (meta?.firstTradeDateEpochUtc as number | undefined);
            if (epoch && Number.isFinite(epoch) && epoch > 0) {
              resolve(new Date(epoch * 1000));
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function eachWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      await fn(items[i], i);
      await sleep(THROTTLE_MS);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

async function main(): Promise<void> {
  const stocks = await prisma.stock.findMany({
    where: { region: 'US', assetType: 'STOCK', isActive: true, ipoDate: null },
    select: { id: true, symbol: true, providerSymbol: true },
    orderBy: { symbol: 'asc' },
  });

  if (stocks.length === 0) {
    console.log('[backfill-us-ipo-dates] All active US stocks already have ipoDate — nothing to do.');
    return;
  }

  console.log(`[backfill-us-ipo-dates] Fetching ipoDate for ${stocks.length} US stocks (concurrency=${CONCURRENCY}, throttle=${THROTTLE_MS}ms)...`);

  let updated = 0;
  let failed = 0;

  await eachWithConcurrency(stocks, CONCURRENCY, async (stock, i) => {
    const yahooSym = stock.providerSymbol || stock.symbol;
    const date = await fetchFirstTradeDate(yahooSym);
    if (date) {
      await prisma.stock.update({ where: { id: stock.id }, data: { ipoDate: date } });
      updated++;
    } else {
      failed++;
    }
    if ((i + 1) % 100 === 0 || i + 1 === stocks.length) {
      console.log(`  [${i + 1}/${stocks.length}] updated=${updated} no-data=${failed}`);
    }
  });

  console.log(`[backfill-us-ipo-dates] Done. updated=${updated} no-data=${failed} total=${stocks.length}`);
}

main()
  .catch((err) => {
    console.error('[backfill-us-ipo-dates] fatal:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
