/**
 * regenerate-in-decisions.ts — re-run the strategy-decision engine for the IN/STOCK
 * instruments that already have decisions on the latest generated date, so the two
 * upstream fixes take effect on persisted rows:
 *   - Fix A: calculateConfidence now reads nested verdicts.signalEligible (was always
 *     undefined → every decision LOW). Eligible instruments regain non-LOW confidence.
 *   - Fix B: fresh v1.4.0 IN/STOCK performance summaries now exist, so
 *     latestStrategyRating() populates strategyRating / readinessLabel (was null /
 *     RESEARCH_ONLY for the whole universe).
 *
 * Mirrors the pipeline STRATEGY_DECISION adapter: svc.evaluate({ strategy:'ALL',
 * instrumentIds, region, assetType, batchSize, offset }) looped on nextOffset.
 *
 * Run: GEN_REGION=IN npx ts-node --transpile-only scripts/regenerate-in-decisions.ts
 */
import prisma from '../src/db/prisma';
import { StrategyDecisionEngineService } from '../src/modules/strategy-decision-engine';

async function main() {
  const region = (process.env.GEN_REGION || 'IN').toUpperCase();
  const assetType = (process.env.GEN_ASSET || 'STOCK').toUpperCase();
  const country = region === 'IN' ? 'India' : region;
  const batchSize = Number(process.env.BATCH_SIZE || 250);

  const latest = await prisma.$queryRawUnsafe<Array<{ d: Date }>>(
    `SELECT MAX("generatedDate") AS d FROM strategy_decision_results WHERE country = $1`,
    country,
  );
  const latestDate = latest?.[0]?.d;
  if (!latestDate) throw new Error(`no decisions found for country=${country}`);

  const rows = await prisma.$queryRawUnsafe<Array<{ instrumentId: string }>>(
    `SELECT DISTINCT "instrumentId" FROM strategy_decision_results
       WHERE country = $1 AND "generatedDate" = $2`,
    country,
    latestDate,
  );
  const instrumentIds = rows.map((r) => r.instrumentId);
  console.log(
    `regenerate-in-decisions: region=${region} assetType=${assetType} latestDate=${new Date(latestDate).toISOString().slice(0, 10)} instruments=${instrumentIds.length} batchSize=${batchSize}`,
  );

  const svc = new StrategyDecisionEngineService();
  let offset = 0;
  let processed = 0, generated = 0, failed = 0, skipped = 0, pages = 0;
  const total = instrumentIds.length;
  while (offset < total) {
    const result: any = await svc.evaluate({
      strategy: 'ALL',
      instrumentIds,
      region,
      assetType,
      batchSize,
      offset,
    } as any);
    processed += result.processedCount || 0;
    generated += result.generatedCount || 0;
    failed += result.failedCount || 0;
    skipped += result.skippedCount || 0;
    pages += 1;
    if (pages % 5 === 0 || result.nextOffset == null) {
      console.log(`  page ${pages}: processed=${processed}/${total} generated=${generated} failed=${failed} skipped=${skipped}`);
    }
    if (!result.hasMore || (result.processedCount ?? 0) <= 0 || result.nextOffset == null) break;
    offset = result.nextOffset;
  }
  console.log(`DONE pages=${pages} processed=${processed} generated=${generated} failed=${failed} skipped=${skipped}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
