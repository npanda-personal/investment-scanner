/**
 * seed-eu-fundamentals.ts — ingest EU fundamentals from the FREE keyless Yahoo
 * quoteSummary endpoint into the shared Fundamental model + backfill
 * Stock.sector / industry / marketCap + Fundamental.officialResultDate.
 *
 * EU has no SEC-EDGAR analog; Yahoo quoteSummary (via yahoo-finance2, no API key)
 * is the only free source covering the whole eurozone universe incl. XETRA .DE.
 *
 * Run (from backend/):
 *   npx ts-node --transpile-only scripts/seed-eu-fundamentals.ts                  # all EU stocks (cap 1000)
 *   npx ts-node --transpile-only scripts/seed-eu-fundamentals.ts --symbols=SAP.DE,ASML.AS
 *   npx ts-node --transpile-only scripts/seed-eu-fundamentals.ts --limit=50
 */
import prisma from '../src/db/prisma';
import { yahooFundamentalsService } from '../src/modules/market-data-foundation/market-data-foundation.yahoo-fundamentals.service';

function parseArgs(argv: string[]) {
  const args = { region: 'EU', symbols: undefined as string[] | undefined, limit: 1000 };
  for (const raw of argv.slice(2)) {
    if (raw.startsWith('--symbols=')) args.symbols = raw.split('=')[1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    else if (raw.startsWith('--limit=')) args.limit = Number(raw.split('=')[1]) || args.limit;
    else if (raw.startsWith('--region=')) args.region = raw.split('=')[1].trim().toUpperCase();
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  console.log(`[seed-eu-fundamentals] Ingesting Yahoo quoteSummary fundamentals (${args.region}, ${args.symbols ? args.symbols.join(',') : `all, cap ${args.limit}`})...`);
  const r = await yahooFundamentalsService.ingestForSymbols({ region: args.region, symbols: args.symbols, limit: args.limit });
  console.log(`[seed-eu-fundamentals] processed=${r.processed} updated=${r.updated} noData=${r.noData} earningsDates=${r.earningsDates}`);
  r.warnings.slice(0, 10).forEach((w) => console.warn(`[seed-eu-fundamentals]   warn: ${w}`));
  console.log('[seed-eu-fundamentals] Done.');
}

main().catch((e) => { console.error('[seed-eu-fundamentals] Fatal:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
