/**
 * backfill-eligibility.ts — compute and persist instrument_eligibility rows for
 * the full daily-refresh universe (or a bounded sample with --limit N).
 *
 * Reuses the same computation path as the DQE evaluation pipeline:
 *   DataQualityEngineService.persistEligibility() (shared private helper).
 * No formula duplication.
 *
 * Usage (from backend/):
 *   npx ts-node scripts/backfill-eligibility.ts
 *   npx ts-node scripts/backfill-eligibility.ts --limit 100
 *
 * Env overrides:
 *   REGION=IN      (default: IN)
 *   ASSET_TYPE=STOCK  (default: STOCK)
 *   BATCH_SIZE=50  (default: 50)
 *   CONCURRENCY=4  (default: 4)
 */

import prisma from '../src/db/prisma';
import { DataQualityEngineService } from '../src/modules/data-quality-engine/data-quality-engine.service';
import { MarketDataFoundationService } from '../src/modules/market-data-foundation/market-data-foundation.service';
import type { EligibilityReasonCode } from '../src/shared/types/eligibility-policy';

// ── CLI / env config ─────────────────────────────────────────────────────────
const REGION = (process.env.REGION || 'IN').toUpperCase();
const ASSET_TYPE = (process.env.ASSET_TYPE || 'STOCK').toUpperCase();
const BATCH_SIZE = Math.max(1, parseInt(process.env.BATCH_SIZE || '50', 10));
const CONCURRENCY = Math.max(1, Math.min(parseInt(process.env.CONCURRENCY || '4', 10), 8));

// Parse --limit N from argv
let LIMIT = Infinity;
const limitArg = process.argv.indexOf('--limit');
if (limitArg !== -1 && process.argv[limitArg + 1]) {
  const n = parseInt(process.argv[limitArg + 1], 10);
  if (Number.isFinite(n) && n > 0) LIMIT = n;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function eachWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(items[index]);
    }
  }));
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const mdf = new MarketDataFoundationService();
  const dqe = new DataQualityEngineService();

  console.log(`\n=== backfill-eligibility ===`);
  console.log(`region=${REGION} assetType=${ASSET_TYPE} batchSize=${BATCH_SIZE} concurrency=${CONCURRENCY} limit=${LIMIT === Infinity ? 'none' : LIMIT}\n`);

  // ── 1. Collect universe instrument IDs ────────────────────────────────────
  const instrumentIds: string[] = [];
  let offset = 0;
  let totalCount = 0;

  while (true) {
    const page = Math.floor(offset / BATCH_SIZE) + 1;
    const result = await mdf.listInstruments({ page, pageSize: BATCH_SIZE, region: REGION, assetType: ASSET_TYPE });
    if (totalCount === 0) totalCount = result.pagination?.total ?? result.instruments.length;
    for (const inst of result.instruments) {
      if (instrumentIds.length >= LIMIT) break;
      instrumentIds.push(String(inst.id));
    }
    offset += result.instruments.length;
    const totalPages = result.pagination?.totalPages ?? 1;
    if (page >= totalPages || result.instruments.length === 0 || instrumentIds.length >= LIMIT) break;
  }

  const effectiveTotal = instrumentIds.length;
  console.log(`Universe collected: ${effectiveTotal} instruments (of ${totalCount} total)\n`);

  // ── 2. Process in batches ─────────────────────────────────────────────────
  let processed = 0;
  let written = 0;
  let failed = 0;
  const failedIds: string[] = [];

  for (let batchStart = 0; batchStart < effectiveTotal; batchStart += BATCH_SIZE) {
    const batchIds = instrumentIds.slice(batchStart, batchStart + BATCH_SIZE);
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(effectiveTotal / BATCH_SIZE);

    // Pre-load price windows and fundamentals for the batch in parallel
    let instruments: any[] = [];
    let priceWindowsByInstrumentId = new Map<string, any[]>();
    let fundamentalsByInstrumentId = new Map<string, any>();

    try {
      [instruments, priceWindowsByInstrumentId, fundamentalsByInstrumentId] = await Promise.all([
        (mdf as any).getInstrumentsByIds(batchIds),
        (mdf as any).listRecentPriceWindowsByInstrumentIds(batchIds, 300, { region: REGION, assetType: ASSET_TYPE }),
        (mdf as any).storedFundamentalsByInstrumentIds(batchIds, { region: REGION, assetType: ASSET_TYPE }),
      ]);
    } catch (err: any) {
      console.error(`[batch ${batchNum}/${totalBatches}] preload failed: ${err?.message}`);
      failed += batchIds.length;
      failedIds.push(...batchIds);
      processed += batchIds.length;
      continue;
    }

    const instrumentById = new Map(instruments.map((inst: any) => [String(inst.id), inst]));

    await eachWithConcurrency(batchIds, CONCURRENCY, async (instrumentId) => {
      const instrument = instrumentById.get(instrumentId);
      if (!instrument) {
        failed += 1;
        failedIds.push(instrumentId);
        processed += 1;
        return;
      }
      try {
        const priceWindow: any[] = priceWindowsByInstrumentId.get(instrumentId) || [];
        const normalizedPrices = (dqe as any).normalizePrices(priceWindow);
        const latestPrice = normalizedPrices[0] || null;
        const fundamentalsResponse = fundamentalsByInstrumentId.get(instrumentId) || { records: [] };
        const fundamentals = fundamentalsResponse.records || [];

        // Compute readiness score via the same formula DQE uses
        const liquidity = (dqe as any).calculateLiquidity(normalizedPrices);
        const volumeValues = normalizedPrices.map((p: any) => p.volume).filter((v: unknown) => v !== null && v !== undefined && Number.isFinite(Number(v)));
        const latestDate = latestPrice?.date
          ? new Date(latestPrice.date as unknown as string)
          : normalizedPrices[0]?.date
            ? new Date(normalizedPrices[0].date as unknown as string)
            : null;
        const stale = (dqe as any).isPriceStale(latestDate, instrument) as boolean;
        const readinessScore = (dqe as any).readinessScore(
          normalizedPrices.length,
          stale,
          volumeValues.length,
          { sector: instrument.sector, country: instrument.country },
          liquidity.score,
        ) as number;
        const readinessStatus = (dqe as any).readinessStatus(readinessScore) as string;

        await (dqe as any).persistEligibility(
          instrument,
          normalizedPrices,
          latestPrice,
          fundamentals,
          readinessScore,
          readinessStatus,
        );
        written += 1;
      } catch (err: any) {
        failed += 1;
        failedIds.push(instrumentId);
      }
      processed += 1;
    });

    const pct = ((processed / effectiveTotal) * 100).toFixed(1);
    console.log(`[batch ${batchNum}/${totalBatches}] processed=${processed}/${effectiveTotal} (${pct}%) written=${written} failed=${failed}`);
  }

  // ── 3. Read back summary verdicts ─────────────────────────────────────────
  // Filter to rows written in this run: last computed 60s ago or less, and
  // belonging to the instrument IDs we just processed.
  const cutoff = new Date(Date.now() - 60_000);
  const summaryRows = await prisma.instrumentEligibility.findMany({
    where: {
      instrumentId: { in: instrumentIds },
      computedAt: { gte: cutoff },
    },
    select: {
      signalEligible: true,
      reviewEligible: true,
      backtestEligible: true,
      calibrationEligible: true,
      signalReasons: true,
      reviewReasons: true,
      backtestReasons: true,
      calibrationReasons: true,
    },
  });

  const signalEligibleCount = summaryRows.filter((r) => r.signalEligible).length;
  const reviewEligibleCount = summaryRows.filter((r) => r.reviewEligible).length;
  const backtestEligibleCount = summaryRows.filter((r) => r.backtestEligible).length;
  const calibrationEligibleCount = summaryRows.filter((r) => r.calibrationEligible).length;

  // Top reason codes across all verdicts
  const reasonCounts = new Map<string, number>();
  const allReasonArrays = [
    ...summaryRows.map((r) => r.signalReasons),
    ...summaryRows.map((r) => r.reviewReasons),
    ...summaryRows.map((r) => r.backtestReasons),
    ...summaryRows.map((r) => r.calibrationReasons),
  ];
  for (const arr of allReasonArrays) {
    for (const code of (arr as string[])) {
      reasonCounts.set(code, (reasonCounts.get(code) ?? 0) + 1);
    }
  }
  const topReasons = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, count]) => `  ${(code as EligibilityReasonCode).padEnd(28)} ${count}`);

  console.log('\n=== SUMMARY ===');
  console.log(`Total instruments:       ${effectiveTotal}`);
  console.log(`Written eligibility rows: ${written}`);
  console.log(`Failed:                  ${failed}`);
  console.log(`Signal eligible:         ${signalEligibleCount} / ${summaryRows.length}`);
  console.log(`Review eligible:         ${reviewEligibleCount} / ${summaryRows.length}`);
  console.log(`Backtest eligible:       ${backtestEligibleCount} / ${summaryRows.length}`);
  console.log(`Calibration eligible:    ${calibrationEligibleCount} / ${summaryRows.length}`);
  if (topReasons.length > 0) {
    console.log(`\nTop reason codes:`);
    for (const line of topReasons) console.log(line);
  }
  if (failedIds.length > 0 && failedIds.length <= 20) {
    console.log(`\nFailed IDs: ${failedIds.join(', ')}`);
  }
}

main()
  .catch((err) => { console.error('[backfill-eligibility] Fatal:', err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
