/**
 * crypto-universe-dryrun.ts — READ-ONLY live check of the universe resolver.
 * Calls the real CoinPaprika + Binance APIs and reports how many Binance-tradable
 * coins we can collect. Writes NOTHING to the DB.
 *
 *   npx ts-node scripts/crypto-universe-dryrun.ts            # target 500
 *   npx ts-node scripts/crypto-universe-dryrun.ts --limit=500
 */
import { fetchCryptoUniverse } from '../src/modules/market-data-foundation/market-data-foundation.crypto-provider';
import { runScript } from './_run-script';

async function main() {
  const limitArg = process.argv.slice(2).find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) || 500 : 500;

  const { candidates, warnings } = await fetchCryptoUniverse({ limit });

  const byQuote: Record<string, number> = {};
  for (const c of candidates) byQuote[c.quoteAsset || '?'] = (byQuote[c.quoteAsset || '?'] || 0) + 1;

  console.log(`[dryrun] requested=${limit} collected=${candidates.length}`);
  console.log(`[dryrun] quote-asset breakdown:`, byQuote);
  console.log(`[dryrun] first 5:`, candidates.slice(0, 5).map((c) => `${c.symbol}(#${c.rank})`).join(', '));
  console.log(`[dryrun] last 5:`, candidates.slice(-5).map((c) => `${c.symbol}(#${c.rank})`).join(', '));
  const noRank = candidates.filter((c) => c.rank == null).length;
  const noMcap = candidates.filter((c) => c.marketCap == null).length;
  console.log(`[dryrun] missing rank=${noRank} missing marketCap=${noMcap}`);
  console.log(`[dryrun] warnings:`); warnings.forEach((w) => console.log('   -', w));
}

runScript(main);
