/**
 * Backfill historical MarketContextSnapshots (point-in-time regime per date).
 *
 * Purpose: generate a MarketContextSnapshot for a grid of historical as-of dates
 * so that backtests and quality-lab by-regime lookups can access real per-date
 * regime (RISK_ON / NEUTRAL / RISK_OFF) instead of hardcoding OPEN/NEUTRAL.
 *
 * Grid defaults:
 *   region:   IN
 *   start:    2019-01  (monthly, first trading-session-approximate day)
 *   end:      2026-01
 *   cadence:  monthly  (~85 dates, cost-appropriate)
 *
 * Idempotent: dates that already have a snapshot for the region are skipped.
 *
 * Usage:
 *   cd backend
 *   npx ts-node --transpile-only scripts/backfill-market-context-snapshots.ts
 *
 * Override via env:
 *   REGION=IN START_YEAR=2019 START_MONTH=1 END_YEAR=2026 END_MONTH=1
 */

import prisma from '../src/db/prisma';
import { MarketContextIntelligenceService } from '../src/modules/market-context-intelligence';
import { MarketContextIntelligenceRepository } from '../src/modules/market-context-intelligence/market-context-intelligence.repository';

const REGION = process.env.REGION || 'IN';
const START_YEAR = parseInt(process.env.START_YEAR || '2019', 10);
const START_MONTH = parseInt(process.env.START_MONTH || '1', 10); // 1-based
const END_YEAR = parseInt(process.env.END_YEAR || '2026', 10);
const END_MONTH = parseInt(process.env.END_MONTH || '1', 10); // 1-based (inclusive)

/** Build a list of UTC dates: 1st day of each month in [start, end] (inclusive). */
function buildMonthlyGrid(
  startYear: number, startMonth: number,
  endYear: number, endMonth: number
): Date[] {
  const dates: Date[] = [];
  let year = startYear;
  let month = startMonth; // 1-based
  while (year < endYear || (year === endYear && month <= endMonth)) {
    dates.push(new Date(Date.UTC(year, month - 1, 1)));
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return dates;
}

/**
 * Returns the set of snapshotDate values (as ISO date strings YYYY-MM-DD) that
 * already exist in MarketContextSnapshot for the given region.
 */
async function loadExistingDates(region: string): Promise<Set<string>> {
  const rows = await prisma.marketContextSnapshot.findMany({
    where: { region },
    select: { snapshotDate: true },
  });
  return new Set(rows.map((row) => row.snapshotDate.toISOString().slice(0, 10)));
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const t0 = Date.now();
  const grid = buildMonthlyGrid(START_YEAR, START_MONTH, END_YEAR, END_MONTH);
  console.log(`[backfill-market-context-snapshots] region=${REGION} grid=${grid.length} monthly dates`);
  console.log(`  from ${dateKey(grid[0])} to ${dateKey(grid[grid.length - 1])}`);

  const existing = await loadExistingDates(REGION);
  console.log(`  existing snapshots for ${REGION}: ${existing.size}`);

  const toProcess = grid.filter((d) => !existing.has(dateKey(d)));
  console.log(`  to generate: ${toProcess.length}  (already present: ${grid.length - toProcess.length})`);

  if (toProcess.length === 0) {
    console.log('[backfill-market-context-snapshots] nothing to do — all dates already present.');
    await prisma.$disconnect();
    return;
  }

  const repo = new MarketContextIntelligenceRepository(prisma as any);
  const svc = new MarketContextIntelligenceService(repo as any);

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const asOf = toProcess[i];
    const key = dateKey(asOf);

    // Double-check idempotency inside the loop in case the script is re-run concurrently
    // or resumed after a partial run.
    if (existing.has(key)) {
      skipped += 1;
      continue;
    }

    try {
      await svc.runAsOf(REGION, asOf);
      succeeded += 1;
      existing.add(key); // track locally so the idempotency check above works
    } catch (err) {
      failed += 1;
      console.error(`  [FAILED] ${key}: ${(err as Error).message}`);
    }

    if ((i + 1) % 10 === 0 || i === toProcess.length - 1) {
      const elapsedS = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  progress: ${i + 1}/${toProcess.length}  succeeded=${succeeded}  failed=${failed}  skipped=${skipped}  elapsed=${elapsedS}s`);
    }
  }

  const totalElapsedS = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n[backfill-market-context-snapshots] DONE — succeeded=${succeeded}  failed=${failed}  skipped=${skipped}  total=${toProcess.length}  elapsed=${totalElapsedS}s`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[backfill-market-context-snapshots] fatal error:', err);
  prisma.$disconnect().finally(() => process.exit(1));
});
