/**
 * seed-strategies.ts — upsert strategy definitions from the in-code registry into the DB.
 *
 * Equivalent to POST /api/v1/strategies/seed, but runs directly via ts-node (fresh code)
 * so it picks up registry changes (e.g. supportedRegions now ['IN','US']) without needing
 * the HTTP endpoint. Idempotent upsert keyed by strategyCode+strategyVersion.
 *
 * Run: npx ts-node --transpile-only scripts/seed-strategies.ts
 */
import prisma from '../src/db/prisma';
import { StrategyFrameworkService } from '../src/modules/strategy-framework/strategy-framework.service';

async function main() {
  const svc = new StrategyFrameworkService();
  await svc.seedDefinitions();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "strategyCode", "supportedRegions" FROM strategy_definitions ORDER BY "strategyCode"`,
  );
  const usEnabled = rows.filter((r) => {
    try { return (Array.isArray(r.supportedRegions) ? r.supportedRegions : JSON.parse(r.supportedRegions)).includes('US'); }
    catch { return false; }
  }).length;
  console.log(`strategies seeded: ${rows.length} definitions, ${usEnabled} US-enabled`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
