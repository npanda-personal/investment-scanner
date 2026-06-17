/**
 * backfill-etf-sectors.ts — give US ETFs a clear sector bucket so trader-facing
 * screens stop rendering "Sector N/A".
 *
 * Why: SEC SIC classification can't slot a multi-holding fund into a single GICS
 * sector, so ~all active US ETFs have a NULL sector. Rather than fabricate a sector,
 * we label them honestly as a diversified-fund bucket (research-support wording — not
 * advice, not a single-sector claim).
 *
 * Scope (strict): region='US' AND assetType='ETF' AND sector IS NULL only. STOCK rows
 * and any ETF that already has a non-null sector are never touched.
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/backfill-etf-sectors.ts            # apply
 *   npx ts-node --transpile-only scripts/backfill-etf-sectors.ts --dry-run  # count only
 *   npx ts-node --transpile-only scripts/backfill-etf-sectors.ts --label="ETF / Diversified"
 *
 * Idempotent: once an ETF's sector is filled the IS-NULL filter no longer matches it,
 * so re-running is a no-op. Does NOT start/stop any server and does NOT run prisma migrate.
 */
import prisma from '../src/db/prisma';

const DEFAULT_LABEL = 'ETF / Diversified';

interface BackfillArgs {
  dryRun: boolean;
  label: string;
}

/** Pure arg parser — exported for unit testing. */
export function parseBackfillArgs(argv: string[]): BackfillArgs {
  const args: BackfillArgs = { dryRun: false, label: DEFAULT_LABEL };
  for (const raw of argv.slice(2)) {
    if (raw === '--dry-run') {
      args.dryRun = true;
    } else if (raw.startsWith('--label=')) {
      const value = raw.slice('--label='.length).trim();
      if (value) args.label = value;
    }
  }
  return args;
}

async function main() {
  const args = parseBackfillArgs(process.argv);

  // Strict target: US ETFs with no sector yet. Reused for both the count and the update
  // so the dry-run count is exactly what an apply run would change.
  const where = { region: 'US', assetType: 'ETF', sector: null } as const;

  const candidateCount = await (prisma as any).stock.count({ where });

  console.log(
    `[backfill-etf-sectors] target=US ETFs with NULL sector  matches=${candidateCount}  label="${args.label}"  mode=${args.dryRun ? 'DRY-RUN' : 'APPLY'}`,
  );

  if (candidateCount === 0) {
    console.log('[backfill-etf-sectors] Nothing to do — all US ETFs already have a sector. (idempotent no-op)');
    return;
  }

  if (args.dryRun) {
    console.log(`[backfill-etf-sectors] DRY-RUN: would set sector="${args.label}" on ${candidateCount} row(s). No writes performed.`);
    return;
  }

  const result = await (prisma as any).stock.updateMany({
    where,
    data: { sector: args.label },
  });

  console.log(`[backfill-etf-sectors] Updated ${result.count} row(s) → sector="${args.label}".`);

  const remaining = await (prisma as any).stock.count({ where });
  console.log(`[backfill-etf-sectors] ── Summary ── updated=${result.count} remainingNullUsEtfs=${remaining}`);
  console.log('[backfill-etf-sectors] Done.');
}

main()
  .catch((err) => {
    console.error('[backfill-etf-sectors] Fatal:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
