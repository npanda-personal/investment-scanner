/**
 * seed-us-earnings.ts — Ingest US earnings dates (officialResultDate) from SEC EDGAR.
 *
 * Uses the SEC EDGAR company-facts endpoint (free, official) to match 10-Q/10-K
 * filing dates to existing Fundamental rows for US stocks, writing the result to
 * Fundamental.officialResultDate.  The earnings-intelligence service then picks
 * up resultDateSource='OFFICIAL_CALENDAR' for those rows, enabling RESULT_WINNERS,
 * RESULT_DISAPPOINTMENTS, and RESULT_REACTION_HISTORY categories.
 *
 * Run (from backend/):
 *   npx ts-node --transpile-only scripts/seed-us-earnings.ts
 *   npx ts-node --transpile-only scripts/seed-us-earnings.ts --symbols=AAPL,MSFT
 *   EARN_LIMIT=300 npx ts-node --transpile-only scripts/seed-us-earnings.ts
 *   npx ts-node --transpile-only scripts/seed-us-earnings.ts --limit=50
 *
 * After running, trigger an earnings-intelligence refresh for region=US:
 *   POST /earnings/refresh  body: { "region": "US", "assetType": "STOCK" }
 *
 * NOTE: The filed date is the SEC submission date (closest free proxy for the
 * earnings-call date). For the exact earnings-call date you would need an
 * earnings-calendar provider or to parse 8-K Item 2.02 filings individually.
 */
import prisma from '../src/db/prisma';
import { usEarningsDateAdapter } from '../src/modules/earnings-intelligence/earnings-intelligence.us-sec-source';

function parseArgs(argv: string[]) {
  const args: { symbols?: string[]; limit?: number } = {};
  for (const raw of argv.slice(2)) {
    if (raw.startsWith('--symbols=')) {
      args.symbols = raw.split('=')[1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else if (raw.startsWith('--limit=')) {
      args.limit = Number(raw.split('=')[1]) || undefined;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const limitMsg = args.symbols
    ? `symbols=${args.symbols.join(',')}`
    : `limit=${args.limit ?? process.env.EARN_LIMIT ?? 100}`;
  console.log(`[seed-us-earnings] Ingesting US earnings dates from SEC EDGAR (${limitMsg})...`);

  const result = await usEarningsDateAdapter.ingest({
    symbols: args.symbols,
    limit: args.limit,
  });

  console.log(
    `[seed-us-earnings] processed=${result.processed} updated=${result.updated} ` +
    `alreadySet=${result.alreadySet} noCik=${result.noCik} noFacts=${result.noFacts}`
  );
  result.warnings.slice(0, 10).forEach((w) => console.warn(`[seed-us-earnings]   warn: ${w}`));
  console.log('[seed-us-earnings] Done.');
  console.log('[seed-us-earnings] Next step: POST /earnings/refresh  { "region": "US", "assetType": "STOCK" }');
}

main()
  .catch((e) => { console.error('[seed-us-earnings] Fatal:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
