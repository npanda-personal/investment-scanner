/**
 * seed-us-universe.ts — seed the US equity universe + backfill EOD prices and
 * dividend/split corporate actions into the SHARED equity tables (region='US').
 * FREE sources: NASDAQ Trader symbol directory (universe) + Yahoo keyless chart
 * API (prices + corporate actions).
 *
 * Usage (from backend/):
 *   npx ts-node scripts/seed-us-universe.ts                         # top 1000 universe + backfill AAPL,MSFT,SPY
 *   npx ts-node scripts/seed-us-universe.ts --limit=200             # smaller universe
 *   npx ts-node scripts/seed-us-universe.ts --symbols=AAPL,MSFT,SPY # backfill specific tickers
 *   npx ts-node scripts/seed-us-universe.ts --all                   # ingest the ENTIRE universe (slow)
 *   npx ts-node scripts/seed-us-universe.ts --all --all-backfill    # FULL universe + FULL price history (hours)
 *   npx ts-node scripts/seed-us-universe.ts --all-backfill --resume # resume an interrupted full backfill
 *   npx ts-node scripts/seed-us-universe.ts --lookback=120          # limit history depth (days)
 *   npx ts-node scripts/seed-us-universe.ts --no-backfill           # universe only
 *   npx ts-node scripts/seed-us-universe.ts --no-actions            # prices only, skip corporate actions
 *
 * Resumable: `--resume` skips symbols recorded in the checkpoint file
 * (backend/tmp/us-backfill-checkpoint.log, gitignored). Each completed symbol is
 * appended so an interrupted multi-hour run can pick up where it left off.
 * Idempotent: re-runs upsert rows; never mutates non-US rows. Shared Prisma singleton.
 */
import fs from 'fs';
import path from 'path';
import prisma from '../src/db/prisma';
import { usEquityIngestionService } from '../src/modules/market-data-foundation/market-data-foundation.us-equity-ingestion.service';

const CHECKPOINT_PATH = path.resolve(__dirname, '..', 'tmp', 'us-backfill-checkpoint.log');

function parseArgs(argv: string[]) {
  const args = {
    limit: 1000,
    all: false,
    symbols: ['AAPL', 'MSFT', 'SPY'] as string[],
    backfill: true,
    allBackfill: false,
    lookback: undefined as number | undefined,
    resume: false,
    actions: true,
  };
  for (const raw of argv.slice(2)) {
    if (raw === '--all') args.all = true;
    else if (raw === '--all-backfill') args.allBackfill = true;
    else if (raw === '--no-backfill') args.backfill = false;
    else if (raw === '--no-actions') args.actions = false;
    else if (raw === '--resume') args.resume = true;
    else if (raw.startsWith('--limit=')) args.limit = Number(raw.split('=')[1]) || args.limit;
    else if (raw.startsWith('--lookback=')) args.lookback = Number(raw.split('=')[1]) || undefined;
    else if (raw.startsWith('--symbols=')) args.symbols = raw.split('=')[1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  }
  return args;
}

function loadCheckpoint(): Set<string> {
  try {
    const text = fs.readFileSync(CHECKPOINT_PATH, 'utf8');
    return new Set(text.split('\n').map((s) => s.trim().toUpperCase()).filter(Boolean));
  } catch {
    return new Set();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (!usEquityIngestionService.enabled) {
    console.error('US equity provider is disabled (MARKET_DATA_US_PROVIDER_ENABLED=false). Aborting.');
    process.exitCode = 1;
    return;
  }

  console.log(`[seed-us] Ingesting US universe (NASDAQ Trader) limit=${args.all ? 'ALL' : args.limit}...`);
  const universe = await usEquityIngestionService.ingestUniverse({
    limit: args.limit,
    all: args.all,
    // Ensure the tickers we're about to backfill always have catalog rows.
    includeSymbols: args.backfill && !args.allBackfill ? args.symbols : undefined,
  });
  console.log(
    `[seed-us] Universe: fetched=${universe.universeFetched} inserted=${universe.assetsInserted} updated=${universe.assetsUpdated} collisions=${universe.collisionsSkipped} skipped=${universe.assetsSkipped}`
  );
  universe.warnings.slice(0, 10).forEach((w) => console.warn(`[seed-us]   warn: ${w}`));

  if (args.backfill) {
    const symbols = args.allBackfill ? undefined : args.symbols;
    const skipSymbols = args.resume ? loadCheckpoint() : undefined;
    if (skipSymbols && skipSymbols.size > 0) {
      console.log(`[seed-us] Resume: skipping ${skipSymbols.size} already-checkpointed symbols.`);
    }
    // Append-only checkpoint stream so an interrupted run can resume.
    fs.mkdirSync(path.dirname(CHECKPOINT_PATH), { recursive: true });
    const checkpoint = fs.createWriteStream(CHECKPOINT_PATH, { flags: 'a' });

    console.log(
      `[seed-us] Backfilling EOD prices${args.actions ? ' + corporate actions' : ''} (Yahoo) for ${args.allBackfill ? 'ALL active US stocks' : symbols!.join(', ')}${args.lookback ? ` lookback=${args.lookback}d` : ' (full history)'}...`
    );
    const startedAt = Date.now();
    const backfill = await usEquityIngestionService.backfillPrices({
      symbols,
      lookbackDays: args.lookback,
      withCorporateActions: args.actions,
      skipSymbols,
      onSymbolComplete: (symbol, info) => {
        if (info.ok) checkpoint.write(`${symbol}\n`);
        // Progress every 100 symbols (or 10 for small runs) with a rough ETA.
        const stride = info.total > 500 ? 100 : 10;
        if (info.index % stride === 0 || info.index === info.total) {
          const elapsedMin = (Date.now() - startedAt) / 60000;
          const rate = info.index / Math.max(elapsedMin, 0.0001);
          const etaMin = rate > 0 ? (info.total - info.index) / rate : 0;
          console.log(
            `[seed-us]   ${info.index}/${info.total} (${((info.index / info.total) * 100).toFixed(1)}%) last=${symbol} bars=${info.bars} actions=${info.actions} eta=${etaMin.toFixed(0)}m`
          );
        }
      },
    });
    checkpoint.end();
    console.log(
      `[seed-us] Prices: processed=${backfill.symbolsProcessed} skipped=${backfill.symbolsSkipped} received=${backfill.barsReceived} inserted=${backfill.barsInserted} updated=${backfill.barsUpdated} noData=${backfill.symbolsWithNoData}`
    );
    console.log(
      `[seed-us] Corporate actions: upserted=${backfill.corporateActionsUpserted} acrossSymbols=${backfill.symbolsWithActions}`
    );
    backfill.warnings.slice(0, 10).forEach((w) => console.warn(`[seed-us]   warn: ${w}`));
  }

  console.log('[seed-us] Done.');
}

main()
  .catch((error) => {
    console.error('[seed-us] Fatal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
