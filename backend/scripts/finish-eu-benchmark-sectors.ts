/**
 * finish-eu-benchmark-sectors.ts — two EU polish steps:
 *   1) Seed the ^STOXX (STOXX 600) benchmark: stock row (region='EU', INDEX) +
 *      full Yahoo price history into price_ticks (region='EU'), so EU alpha-vs-beta
 *      / RS-vs-benchmark have benchmark prices.
 *   2) Refresh EU sector-rotation (sector-intelligence) snapshots.
 *
 * Requires MARKET_DATA_EU_PROVIDER_ENABLED=true (for the Yahoo fetch).
 * Run: MARKET_DATA_EU_PROVIDER_ENABLED=true npx ts-node --transpile-only scripts/finish-eu-benchmark-sectors.ts
 */
import prisma from '../src/db/prisma';
import { MarketDataFoundationRepository } from '../src/modules/market-data-foundation/market-data-foundation.repository';
import { isRegionProviderEnabled } from '../src/modules/market-data-foundation/market-data-foundation.provider-registry';
import { fetchYahooHistoryWithEvents, YAHOO_PROVIDER_THROTTLE_MS } from '../src/modules/market-data-foundation/ingestion/market-data-foundation.yahoo-eod-provider';
import { MarketContextIntelligenceService } from '../src/modules/market-context-intelligence/market-context-intelligence.service';

const BENCH_SYMBOL = '^STOXX';

async function seedBenchmark(repo: MarketDataFoundationRepository) {
  if (!isRegionProviderEnabled('EU')) {
    console.warn('[finish-eu] EU provider disabled; skipping ^STOXX seed. Set MARKET_DATA_EU_PROVIDER_ENABLED=true.');
    return;
  }
  const existing = await repo.prisma.stock.findUnique({ where: { symbol: BENCH_SYMBOL }, select: { id: true, region: true } });
  if (existing && existing.region !== 'EU') { console.warn(`[finish-eu] ${BENCH_SYMBOL} owned by ${existing.region}; skipping.`); return; }
  const data = {
    name: 'STOXX Europe 600', region: 'EU', country: 'EU', currency: 'EUR',
    exchange: 'STOXX', assetType: 'INDEX', instrumentSegment: 'INDEX',
    displaySymbol: 'STOXX600', providerSymbol: BENCH_SYMBOL,
    catalogSource: 'EU_CURATED', providerSupportStatus: 'SUPPORTED', source: 'EU_CURATED', dataStatus: 'PARTIAL', isActive: true,
  };
  if (existing) await repo.prisma.stock.update({ where: { id: existing.id }, data });
  else await repo.prisma.stock.create({ data: { symbol: BENCH_SYMBOL, ...data } });

  const { bars } = await fetchYahooHistoryWithEvents(BENCH_SYMBOL, 'EU', { throttleMs: YAHOO_PROVIDER_THROTTLE_MS });
  if (!bars.length) { console.warn('[finish-eu] ^STOXX returned no bars.'); return; }
  const regionInfo = new Map([[BENCH_SYMBOL, { region: 'EU', exchange: 'STOXX' }]]);
  const stored = await repo.storeHistoricalBulk(bars, () => ({ region: 'EU', exchange: 'STOXX' }), regionInfo);
  console.log(`[finish-eu] ^STOXX benchmark: bars=${bars.length} inserted=${stored.rowsInserted} updated=${stored.rowsUpdated} range=${bars[0].date.toISOString().slice(0,10)}..${bars[bars.length-1].date.toISOString().slice(0,10)}`);
}

async function refreshSectors() {
  const svc = new MarketContextIntelligenceService();
  const r = await svc.refreshSectorSnapshots({ region: 'EU', assetType: 'STOCK' });
  console.log('[finish-eu] sector-rotation:', JSON.stringify(r).slice(0, 300));
}

async function main() {
  const repo = new MarketDataFoundationRepository();
  await seedBenchmark(repo);
  await refreshSectors();
  console.log('[finish-eu] Done.');
}

main().catch((e) => { console.error('[finish-eu] Fatal:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
