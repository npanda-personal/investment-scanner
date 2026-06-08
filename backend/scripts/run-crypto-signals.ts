/**
 * run-crypto-signals.ts — generate (or refresh) crypto signals into
 * crypto_signal_results using the lean crypto-signals path (reuses the equity
 * engine's pure compute, reads the crypto_* plane).
 *
 * Usage (from backend/):
 *   npx ts-node scripts/run-crypto-signals.ts            # all active crypto assets
 *   npx ts-node scripts/run-crypto-signals.ts --limit=50
 */
import prisma from '../src/db/prisma';
import { cryptoSignalGenerationService } from '../src/modules/signal-generation-engine/signal-generation-engine.crypto-service';
import { marketDataFoundationCryptoRepository } from '../src/modules/market-data-foundation/market-data-foundation.crypto-repository';

async function main() {
  const limitArg = process.argv.slice(2).find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) || undefined : undefined;

  console.log(`[crypto-signals] Generating crypto signals${limit ? ` (limit ${limit})` : ''}...`);
  const summary = await cryptoSignalGenerationService.generateAll({ limit });
  console.log(
    `[crypto-signals] run=${summary.runId} processed=${summary.processed} generated=${summary.generated} updated=${summary.updated} skipped=${summary.skipped} failed=${summary.failed}`
  );
  summary.warnings.slice(0, 10).forEach((w) => console.warn(`[crypto-signals]   warn: ${w}`));

  // Refresh crypto market scans (52w high/low, volume spike) — needs signals for direction.
  console.log('[crypto-signals] Refreshing crypto market scans...');
  const scans = await marketDataFoundationCryptoRepository.refreshMarketScans();
  console.log(`[crypto-signals] Scans: 52W_HIGH=${scans['52W_HIGH']} 52W_LOW=${scans['52W_LOW']} VOLUME_SPIKE=${scans.VOLUME_SPIKE} (from ${scans.assetsConsidered} assets)`);
}

main()
  .catch((error) => {
    console.error('[crypto-signals] Fatal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
