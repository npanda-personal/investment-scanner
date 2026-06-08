/**
 * run-us-strategy-backtests.ts — run registered-mode backtests for each US-supported
 * ENTRY strategy so `strategy_performance_summaries` gets US rows. This is what the
 * Research Hub needs: without a US backtest summary every candidate is rated UNPROVEN
 * and research actionability stays UNPROVEN ("missing backtest").
 *
 * BacktestingStrategyLabService.run() auto-calls persistBacktestPerformance() for
 * registered configs (config.strategyCode present), upserting a region-scoped summary.
 *
 * Timeframe defaults to 1Y because US history is ~1y of Yahoo bars (a 3Y registered
 * backtest requires ~529 bars and would be rejected by the minimum-bars guard).
 *
 * Run: GEN_REGION=US npx ts-node --transpile-only scripts/run-us-strategy-backtests.ts
 */
import prisma from '../src/db/prisma';
import { BacktestingStrategyLabService } from '../src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service';
import { StrategyFrameworkRegistry } from '../src/modules/strategy-framework/strategy-framework.registry';

async function main() {
  const region = (process.env.GEN_REGION || 'US').toUpperCase();
  const timeframe = (process.env.BT_TIMEFRAME || '1Y') as any;
  const svc = new BacktestingStrategyLabService();
  const registry = new StrategyFrameworkRegistry();
  const strategies = registry.list().filter(
    (s) => s.status === 'ACTIVE' && s.category === 'ENTRY' && (s.supportedRegions || []).includes(region),
  );
  console.log(`run-us-strategy-backtests: ${strategies.length} ${region} ENTRY strategies, timeframe ${timeframe}`);
  let ok = 0, fail = 0;
  for (const s of strategies) {
    try {
      const run: any = await svc.run(
        { config: { strategyCode: s.code, timeframe, region, assetType: 'STOCK', universe: { type: 'ALL', region, assetType: 'STOCK' }, initialCapital: 100000 } } as any,
        'default-user',
      );
      const grade = run?.metrics?.frameworkRating?.ratingGrade ?? 'n/a';
      const trades = Array.isArray(run?.trades) ? run.trades.length : 0;
      console.log(`  ${s.code}: status=${run?.status} grade=${grade} trades=${trades}`);
      if (run?.status === 'COMPLETED') ok++; else fail++;
    } catch (e: any) {
      console.log(`  ${s.code}: ERROR ${e?.message || e}`);
      fail++;
    }
  }
  console.log(`DONE ok=${ok} fail=${fail}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
