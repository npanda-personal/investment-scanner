/**
 * seed-fred-macro.ts — populate the GLOBAL macro regime read (macro_snapshots
 * landing table) from free St. Louis Fed (FRED) macro series, ONCE.
 *
 * Series → field:
 *   DFF        → interestRateProxy  (effective fed funds rate, %, latest)
 *   CPIAUCSL   → inflationProxy     (CPI YoY %, computed)
 *   DTWEXBGS   → usdStrengthProxy   (broad trade-weighted USD index, latest)
 *   DCOILWTICO → commodityProxy     (WTI crude oil $/bbl, latest)
 *   T10Y2Y     → yieldCurve         (10y–2y spread, status-only)
 *
 * Reads the FRED API key ONLY from process.env.FRED_API_KEY (never hardcoded).
 * When the key is unset the ingest SKIPS gracefully (no throw). Idempotent
 * (upsert on snapshot_date+region). Does NOT start/stop servers, does NOT run
 * prisma migrate, and does NOT trigger snapshot refresh (macro surfaces as a
 * live persisted DB read on market-context reconstruction).
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/seed-fred-macro.ts
 */
import prisma from '../src/db/prisma';
import { FredMacroIngestService } from '../src/modules/market-context-intelligence/market-context-intelligence.fred-ingest.service';

async function main(): Promise<void> {
  const service = new FredMacroIngestService();
  const result = await service.ingest();

  if (result.status === 'SKIPPED') {
    console.log('[seed-fred-macro] SKIPPED:', result.warnings.join(' '));
    return;
  }

  console.log('[seed-fred-macro] snapshotDate:', result.snapshotDate);
  console.log('[seed-fred-macro] macroStatus :', result.snapshot?.macroStatus);
  console.log('[seed-fred-macro] dataStatus  :', result.snapshot?.dataStatus);
  console.log('[seed-fred-macro] proxies     :', JSON.stringify({
    interestRateProxy: result.snapshot?.interestRateProxy,
    inflationProxy: result.snapshot?.inflationProxy,
    usdStrengthProxy: result.snapshot?.usdStrengthProxy,
    commodityProxy: result.snapshot?.commodityProxy,
  }));
  console.log('[seed-fred-macro] explanation :', result.snapshot?.explanation);
  if (result.warnings.length > 0) {
    console.log(`[seed-fred-macro] ${result.warnings.length} warning(s):`, result.warnings.join(' | '));
  }
}

main()
  .catch((error) => {
    console.error('[seed-fred-macro] failed', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
