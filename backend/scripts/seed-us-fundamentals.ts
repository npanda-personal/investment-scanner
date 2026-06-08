/**
 * seed-us-fundamentals.ts — ingest US fundamentals from SEC EDGAR (FREE) into the
 * shared Fundamental model + backfill Stock.sector / industry / marketCap.
 *
 * Run (from backend/):
 *   npx ts-node --transpile-only scripts/seed-us-fundamentals.ts                 # all priced US stocks (cap 200)
 *   npx ts-node --transpile-only scripts/seed-us-fundamentals.ts --symbols=AAPL,MSFT
 *   GEN... SEC_EDGAR_USER_AGENT="you@example.com" npx ts-node ... --limit=300
 */
import prisma from '../src/db/prisma';
import { secCompanyFactsService } from '../src/modules/market-data-foundation/market-data-foundation.sec-companyfacts.service';

function parseArgs(argv: string[]) {
  const args = { symbols: undefined as string[] | undefined, limit: 200 };
  for (const raw of argv.slice(2)) {
    if (raw.startsWith('--symbols=')) args.symbols = raw.split('=')[1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    else if (raw.startsWith('--limit=')) args.limit = Number(raw.split('=')[1]) || args.limit;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  console.log(`[seed-us-fundamentals] Ingesting SEC EDGAR fundamentals (${args.symbols ? args.symbols.join(',') : `all priced US, cap ${args.limit}`})...`);
  const r = await secCompanyFactsService.ingestForSymbols({ symbols: args.symbols, limit: args.limit });
  console.log(`[seed-us-fundamentals] processed=${r.processed} updated=${r.updated} noCik=${r.noCik} noFacts=${r.noFacts}`);
  r.warnings.slice(0, 10).forEach((w) => console.warn(`[seed-us-fundamentals]   warn: ${w}`));
  console.log('[seed-us-fundamentals] Done.');
}

main().catch((e) => { console.error('[seed-us-fundamentals] Fatal:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
