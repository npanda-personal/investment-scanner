/**
 * seed-crypto-universe.ts — seed the crypto universe + backfill OHLCV into the
 * isolated crypto_* tables (FREE sources: CoinGecko + Binance).
 *
 * Usage (from backend/):
 *   npx ts-node scripts/seed-crypto-universe.ts                  # top 500 universe + backfill BTCUSDT,ETHUSDT
 *   npx ts-node scripts/seed-crypto-universe.ts --limit=200      # smaller universe
 *   npx ts-node scripts/seed-crypto-universe.ts --symbols=BTCUSDT,ETHUSDT,SOLUSDT
 *   npx ts-node scripts/seed-crypto-universe.ts --all            # backfill the entire universe (slow)
 *   npx ts-node scripts/seed-crypto-universe.ts --lookback=400   # limit history depth (days)
 *   npx ts-node scripts/seed-crypto-universe.ts --no-backfill    # universe only
 *
 * Idempotent: re-runs upsert rows. Uses the shared Prisma singleton.
 */
import prisma from '../src/db/prisma';
import { cryptoIngestionService } from '../src/modules/market-data-foundation/market-data-foundation.crypto-ingestion.service';

function parseArgs(argv: string[]) {
  const args = { limit: 500, symbols: ['BTCUSDT', 'ETHUSDT'] as string[], all: false, backfill: true, lookback: undefined as number | undefined };
  for (const raw of argv.slice(2)) {
    if (raw === '--all') args.all = true;
    else if (raw === '--no-backfill') args.backfill = false;
    else if (raw.startsWith('--limit=')) args.limit = Number(raw.split('=')[1]) || args.limit;
    else if (raw.startsWith('--lookback=')) args.lookback = Number(raw.split('=')[1]) || undefined;
    else if (raw.startsWith('--symbols=')) args.symbols = raw.split('=')[1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!cryptoIngestionService.enabled) {
    console.error('Crypto provider is disabled (MARKET_DATA_CRYPTO_PROVIDER_ENABLED=false). Aborting.');
    process.exitCode = 1;
    return;
  }

  console.log(`[seed-crypto] Ingesting top ${args.limit} crypto universe (CoinPaprika ranking + Binance tradability)...`);
  const universe = await cryptoIngestionService.ingestUniverse({ limit: args.limit });
  console.log(
    `[seed-crypto] Universe: received=${universe.assetsReceived} inserted=${universe.assetsInserted} updated=${universe.assetsUpdated} skipped=${universe.assetsSkipped}`
  );
  universe.warnings.slice(0, 10).forEach((w) => console.warn(`[seed-crypto]   warn: ${w}`));

  if (args.backfill) {
    const symbols = args.all ? undefined : args.symbols;
    console.log(`[seed-crypto] Backfilling OHLCV for ${args.all ? 'ALL active assets' : symbols!.join(', ')}...`);
    const backfill = await cryptoIngestionService.backfillPrices({
      symbols,
      lookbackDays: args.lookback,
    });
    console.log(
      `[seed-crypto] Prices: symbols=${backfill.symbolsProcessed} inserted=${backfill.barsInserted} updated=${backfill.barsUpdated} skipped=${backfill.barsSkipped}`
    );
    backfill.perSymbol.slice(0, 20).forEach((s) => console.log(`[seed-crypto]   ${s.symbol}: received=${s.received} inserted=${s.inserted} updated=${s.updated}`));
    backfill.warnings.slice(0, 10).forEach((w) => console.warn(`[seed-crypto]   warn: ${w}`));
  }

  console.log('[seed-crypto] Done.');
}

main()
  .catch((error) => {
    console.error('[seed-crypto] Fatal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
