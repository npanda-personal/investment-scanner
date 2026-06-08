/**
 * run-today-review.ts — publish a fresh Today Trade Review run for a region.
 *
 * Today Review publication is scheduler-only via the pipeline (the manual
 * TODAY_REVIEW_PUBLISH command is FORBIDDEN), but the scheduled stage's adapter
 * is simply `TodayTradeReviewService.run({ region, assetType })`. This operator
 * script invokes that same adapter directly so the owner can publish a US (or any
 * region) review on demand — e.g. right after seeding prices, re-seeding strategies
 * (so strategy-decision candidates exist), running DQE, and regenerating signals.
 *
 * The trader page reads the latest persisted run via GET /today-review/latest; this
 * script persists a complete run (markRunStarted → completeRun) that page will read.
 *
 * Prerequisites for a populated US run (run in this order):
 *   1. Strategies re-seeded with US support (POST /api/v1/strategies/seed)
 *   2. DQE evaluated for US (evaluate-region-data-quality.ts) so signals are trusted
 *   3. US signals regenerated (generate-us-signals.ts, WITHOUT GEN_NO_DQ)
 *   4. Trusted review universe ready (US prices seeded → reviewReadiness FULL/LIMITED)
 *
 * Run: GEN_REGION=US npx ts-node --transpile-only scripts/run-today-review.ts
 */
import prisma from '../src/db/prisma';
import { TodayTradeReviewService } from '../src/modules/today-trade-review/today-trade-review.service';

async function main() {
  const region = (process.env.GEN_REGION || 'US').toUpperCase();
  const assetType = (process.env.GEN_ASSET || 'STOCK').toUpperCase();
  const t0 = Date.now();

  const svc = new TodayTradeReviewService();
  console.log(`run-today-review: region=${region} assetType=${assetType} …`);
  const res = await svc.run({ region, assetType });

  const run = (res as any)?.run;
  const counts = run?.candidateCounts || {};
  const total = Object.values(counts).reduce((sum: number, v: any) => sum + Number(v || 0), 0);
  console.log(`DONE in ${Math.round((Date.now() - t0) / 1000)}s — status=${run?.status} mode=${run?.reviewUniverse?.mode ?? 'n/a'} totalCandidates=${total}`);
  console.log('candidateCounts:', counts);
  if (run?.warnings?.length) console.log('warnings:', run.warnings);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
