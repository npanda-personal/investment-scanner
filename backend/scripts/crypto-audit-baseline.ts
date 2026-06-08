/**
 * crypto-audit-baseline.ts — READ-ONLY snapshot of the crypto plane's current
 * data state. No writes. Safe to run repeatedly. Used as the Phase 0 baseline
 * and again during Phase 9 data validation.
 *
 *   npx ts-node scripts/crypto-audit-baseline.ts
 */
import prisma from '../src/db/prisma';

async function main() {
  const out: Record<string, unknown> = {};

  out.crypto_assets_total = await prisma.cryptoAsset.count();
  out.crypto_assets_active = await prisma.cryptoAsset.count({ where: { isActive: true } });
  out.crypto_assets_delisted = await prisma.cryptoAsset.count({ where: { isDelisted: true } });

  // assets that have at least one price tick
  const distinctTickSymbols = await prisma.cryptoPriceTick.findMany({
    distinct: ['symbol'],
    select: { symbol: true },
  });
  out.assets_with_any_price = distinctTickSymbols.length;

  out.price_ticks_total = await prisma.cryptoPriceTick.count();
  out.latest_prices_rows = await prisma.cryptoLatestPrice.count();

  // freshness: newest tick timestamp overall
  const newest = await prisma.cryptoPriceTick.findFirst({ orderBy: { timestamp: 'desc' }, select: { symbol: true, timestamp: true } });
  const oldest = await prisma.cryptoPriceTick.findFirst({ orderBy: { timestamp: 'asc' }, select: { symbol: true, timestamp: true } });
  out.newest_tick = newest;
  out.oldest_tick = oldest;

  // per-symbol bar counts (top/bottom coverage)
  const grouped = await prisma.cryptoPriceTick.groupBy({
    by: ['symbol'],
    _count: { _all: true },
  });
  const counts = grouped.map((g) => ({ symbol: g.symbol, bars: g._count._all })).sort((a, b) => b.bars - a.bars);
  out.symbols_with_15plus_bars = counts.filter((c) => c.bars >= 15).length;
  out.bars_top5 = counts.slice(0, 5);
  out.bars_bottom5 = counts.slice(-5);

  out.signal_results_total = await prisma.cryptoSignalResult.count();
  out.signal_runs_total = await prisma.cryptoSignalGenerationRun.count();
  out.market_scan_rows = await prisma.cryptoMarketScanSnapshot.count();

  // dead-table check
  out.quality_evaluations = await prisma.cryptoDataQualityEvaluation.count();
  out.interest_snapshots = await prisma.cryptoInterestSnapshot.count();
  out.calibration_results = await prisma.cryptoSignalCalibrationResult.count();

  // sample asset to see which metadata fields are populated
  const sample = await prisma.cryptoAsset.findFirst({ orderBy: { rank: 'asc' } });
  out.sample_top_asset = sample;

  console.log(JSON.stringify(out, null, 2));
}

main()
  .catch((e) => {
    console.error('[crypto-audit-baseline] error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
