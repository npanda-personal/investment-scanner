/**
 * refresh-crypto-scans.ts — re-run the crypto market scan refresh so the
 * persisted crypto_market_scan_snapshots no longer contain stablecoins.
 *
 * Usage (from backend/):
 *   npx ts-node scripts/refresh-crypto-scans.ts
 *
 * This script calls refreshMarketScans() which now excludes pegged assets
 * (stablecoins + gold-pegged) via the isStablecoin() helper.
 * No network calls required — reads from local crypto_price_ticks + crypto_assets.
 */
import prisma from '../src/db/prisma';
import { marketDataFoundationCryptoRepository } from '../src/modules/market-data-foundation/market-data-foundation.crypto-repository';
import { isStablecoin } from '../src/modules/market-data-foundation/market-data-foundation.crypto-repository';

async function main() {
  console.log('[refresh-crypto-scans] Fetching active crypto assets (with stablecoin exclusion)...');

  // Preview which assets will be classified as stablecoins
  const allAssets = await marketDataFoundationCryptoRepository.listAssets({ activeOnly: true });
  const stablecoins = allAssets.filter((a) => isStablecoin(a));
  const nonStablecoins = allAssets.filter((a) => !isStablecoin(a));

  console.log(`[refresh-crypto-scans] Total active assets: ${allAssets.length}`);
  console.log(`[refresh-crypto-scans] Stablecoins/pegged EXCLUDED (${stablecoins.length}):`);
  stablecoins.forEach((a) => console.log(`  - ${a.symbol} (display=${a.displaySymbol ?? '-'}, name=${a.name}, tags=[${a.categoryTags.join(', ')}])`));
  console.log(`[refresh-crypto-scans] Non-stablecoin assets that WILL be scanned: ${nonStablecoins.length}`);

  console.log('\n[refresh-crypto-scans] Running refreshMarketScans()...');
  const result = await marketDataFoundationCryptoRepository.refreshMarketScans();

  console.log(`[refresh-crypto-scans] Done.`);
  console.log(`  52W_HIGH rows persisted : ${result['52W_HIGH']}`);
  console.log(`  52W_LOW rows persisted  : ${result['52W_LOW']}`);
  console.log(`  VOLUME_SPIKE rows       : ${result.VOLUME_SPIKE}`);
  console.log(`  Assets considered       : ${result.assetsConsidered}`);

  // Read back top 15 of 52W_HIGH to confirm no stablecoins remain
  const scan = await marketDataFoundationCryptoRepository.readLatestScan('52W_HIGH');
  if (scan) {
    console.log(`\n[verify] Top 52W_HIGH symbols (tradingDate=${scan.tradingDate.toISOString().slice(0, 10)}):`);
    (scan.rows as Array<{ symbol: string; companyName: string; pctFromHigh: number }>)
      .slice(0, 15)
      .forEach((r, i) => console.log(`  ${String(i + 1).padStart(2)}. ${r.symbol.padEnd(12)} ${r.companyName} (pctFromHigh=${r.pctFromHigh.toFixed(2)}%)`));
  } else {
    console.log('[verify] No 52W_HIGH snapshot found (no assets with >= 20 price ticks?).');
  }
}

main()
  .catch((error) => {
    console.error('[refresh-crypto-scans] Fatal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
