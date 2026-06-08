/** READ-ONLY probe: how many distinct Binance spot base assets per USD-pegged quote. */
import { fetchBinanceSpotPairs } from '../src/modules/market-data-foundation/market-data-foundation.crypto-provider';

async function main() {
  const pairs = await fetchBinanceSpotPairs();
  const quotes = ['USDT', 'USDC', 'FDUSD', 'TUSD', 'BUSD'];
  const perQuote: Record<string, number> = {};
  const baseUnion = new Set<string>();
  const baseUsdtUsdc = new Set<string>();
  for (const p of pairs) {
    if (quotes.includes(p.quoteAsset)) {
      perQuote[p.quoteAsset] = (perQuote[p.quoteAsset] || 0) + 1;
      baseUnion.add(p.baseAsset);
      if (p.quoteAsset === 'USDT' || p.quoteAsset === 'USDC') baseUsdtUsdc.add(p.baseAsset);
    }
  }
  console.log('[probe] total spot pairs (all quotes):', pairs.length);
  console.log('[probe] pairs per USD-quote:', perQuote);
  console.log('[probe] distinct base assets across USDT+USDC:', baseUsdtUsdc.size);
  console.log('[probe] distinct base assets across all USD-quotes:', baseUnion.size);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
