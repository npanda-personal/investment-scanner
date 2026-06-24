/**
 * run-in-strategy-backtests.ts — run registered-mode backtests for each IN-supported
 * ENTRY strategy so `strategy_performance_summaries` gets CURRENT-VERSION IN rows.
 *
 * Why this exists (root cause):
 *   StrategyFrameworkService.currentVersionSummaries() only keeps performance rows
 *   whose `strategyVersion` matches the registry's current version. The registry is
 *   now at 1.4.0, but every persisted IN/STOCK summary is an older 1.0.0/1.2.0 run,
 *   so the version filter drops them all → latestStrategyRating() returns null →
 *   every IN TRADE_CANDIDATE decision is persisted with ratingGrade=null /
 *   readinessLabel=RESEARCH_ONLY, and Today Review suppresses it as UNPROVEN.
 *   Re-running the backtests persists fresh 1.4.0 summaries so the rating populates.
 *
 * BacktestingStrategyLabService.run() auto-calls persistBacktestPerformance() for
 * registered configs (config.strategyCode present), upserting a region-scoped summary
 * keyed by strategyCode_strategyVersion_timeframe_region_assetType_universeKey.
 *
 * Timeframe defaults to 5Y: IN has deep (15Y+) Yahoo history, and 5Y is a well-sampled
 * canonical horizon (historical 5Y runs produced 400–1700 trades — far above the
 * 10-trade / sufficiency thresholds the rating evaluator requires). latestStrategyRating
 * selects the first current-version summary ordered by timeframe — running a single
 * canonical timeframe keeps that selection deterministic.
 *
 * Run: GEN_REGION=IN npx ts-node --transpile-only scripts/run-in-strategy-backtests.ts
 *   Override timeframe(s): BT_TIMEFRAME=5Y (or a comma list: BT_TIMEFRAME=3Y,5Y)
 */
import prisma from '../src/db/prisma';
import { BacktestingStrategyLabService } from '../src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service';
import { StrategyFrameworkRegistry } from '../src/modules/strategy-framework/strategy-framework.registry';

async function main() {
  const region = (process.env.GEN_REGION || 'IN').toUpperCase();
  const timeframes = (process.env.BT_TIMEFRAME || '5Y')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean) as any[];
  const svc = new BacktestingStrategyLabService();
  const registry = new StrategyFrameworkRegistry();
  const strategies = registry.list().filter(
    (s) => s.status === 'ACTIVE' && s.category === 'ENTRY' && (s.supportedRegions || []).includes(region),
  );
  console.log(
    `run-in-strategy-backtests: ${strategies.length} ${region} ENTRY strategies @ v?, timeframes ${timeframes.join(',')}`,
  );
  let ok = 0, fail = 0;
  for (const s of strategies) {
    for (const timeframe of timeframes) {
      try {
        const run: any = await svc.run(
          {
            config: {
              strategyCode: s.code,
              timeframe,
              region,
              assetType: 'STOCK',
              universe: { type: 'ALL', region, assetType: 'STOCK' },
              initialCapital: 100000,
            },
          } as any,
          'default-user',
        );
        const grade = run?.metrics?.frameworkRating?.ratingGrade ?? 'n/a';
        const trades = Array.isArray(run?.trades) ? run.trades.length : 0;
        console.log(`  ${s.code} v${s.version} ${timeframe}: status=${run?.status} grade=${grade} trades=${trades}`);
        if (run?.status === 'COMPLETED') ok++; else fail++;
      } catch (e: any) {
        console.log(`  ${s.code} ${timeframe}: ERROR ${e?.message || e}`);
        fail++;
      }
    }
  }
  console.log(`DONE ok=${ok} fail=${fail}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
