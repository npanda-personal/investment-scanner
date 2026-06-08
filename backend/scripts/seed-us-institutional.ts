/**
 * seed-us-institutional.ts — Ingest US "smart money" from FREE SEC EDGAR sources.
 *
 * Two free, official sources (no API key, no paid provider):
 *   - SEC Form 4  → insider transactions     → us_insider_trades
 *   - SEC Form 13F (quarterly structured set) → us_institutional_holdings
 *
 * Tables are created idempotently by the services via raw SQL (schema.prisma is
 * NOT touched; do NOT run prisma migrate). Both ingests are idempotent and
 * collision-safe (region='US' only).
 *
 * Run (from backend/):
 *   npx ts-node --transpile-only scripts/seed-us-institutional.ts
 *   npx ts-node --transpile-only scripts/seed-us-institutional.ts --symbols=AAPL,MSFT
 *   npx ts-node --transpile-only scripts/seed-us-institutional.ts --limit=50 --form4-only
 *   npx ts-node --transpile-only scripts/seed-us-institutional.ts --quarter=2025q1 --13f-only
 *
 * Flags:
 *   --symbols=AAPL,MSFT   Restrict Form 4 ingest to these symbols.
 *   --limit=N             Cap stocks (Form 4) / persisted CUSIP aggregates (13F).
 *   --quarter=YYYYqQ      13F quarter to ingest (default: most recent completed).
 *   --form4-only          Run only the Form 4 insider ingest.
 *   --13f-only            Run only the 13F institutional-holdings ingest.
 *
 * Research-support only: this is observed regulatory-filing data, not advice.
 */
import prisma from '../src/db/prisma';
import { usForm4Service } from '../src/modules/market-data-foundation/market-data-foundation.sec-form4.service';
import { usThirteenFService } from '../src/modules/market-data-foundation/market-data-foundation.sec-13f.service';

interface CliArgs {
  symbols?: string[];
  limit?: number;
  quarter?: string;
  form4Only: boolean;
  thirteenFOnly: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { form4Only: false, thirteenFOnly: false };
  for (const raw of argv.slice(2)) {
    if (raw.startsWith('--symbols=')) {
      args.symbols = raw.split('=')[1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else if (raw.startsWith('--limit=')) {
      args.limit = Number(raw.split('=')[1]) || undefined;
    } else if (raw.startsWith('--quarter=')) {
      args.quarter = raw.split('=')[1].trim().toLowerCase() || undefined;
    } else if (raw === '--form4-only') {
      args.form4Only = true;
    } else if (raw === '--13f-only') {
      args.thirteenFOnly = true;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const runForm4 = !args.thirteenFOnly;
  const run13f = !args.form4Only;

  if (runForm4) {
    console.log(
      `[seed-us-institutional] Form 4 insider ingest ` +
        `(${args.symbols ? `symbols=${args.symbols.join(',')}` : `limit=${args.limit ?? 100}`})...`,
    );
    const r = await usForm4Service.ingestForSymbols({ symbols: args.symbols, limit: args.limit });
    console.log(
      `[seed-us-institutional] form4 processed=${r.processed} updated=${r.updated} ` +
        `noCik=${r.noCik} noFilings=${r.noFilings}`,
    );
    r.warnings.slice(0, 10).forEach((w) => console.warn(`[seed-us-institutional]   warn: ${w}`));
  }

  if (run13f) {
    console.log(
      `[seed-us-institutional] 13F institutional ingest ` +
        `(quarter=${args.quarter ?? 'auto'} limit=${args.limit ?? 'none'})...`,
    );
    const r = await usThirteenFService.ingestQuarter({ quarter: args.quarter, limit: args.limit });
    console.log(
      `[seed-us-institutional] 13f quarter=${r.quarter} issuersTotal=${r.issuersTotal} ` +
        `issuersMapped=${r.issuersMapped} issuersUnmapped=${r.issuersUnmapped} rowsUpserted=${r.rowsUpserted}`,
    );
    r.warnings.slice(0, 10).forEach((w) => console.warn(`[seed-us-institutional]   warn: ${w}`));
  }

  console.log('[seed-us-institutional] Done.');
}

main()
  .catch((e) => {
    console.error('[seed-us-institutional] Fatal:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
