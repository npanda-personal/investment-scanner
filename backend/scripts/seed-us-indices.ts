/**
 * seed-us-indices.ts — seed US benchmark / index price history into the shared
 * equity tables (region='US') using the existing Yahoo EOD provider.
 *
 * Seeded instruments:
 *   Indices  : ^GSPC (S&P 500), ^VIX (CBOE VIX)
 *   Sector ETFs: XLK, XLF, XLV, XLE, XLY, XLP, XLI, XLB, XLRE, XLU, XLC (11 SPDR)
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/seed-us-indices.ts
 *   US_INDEX_SYMBOLS=^GSPC,^VIX npx ts-node --transpile-only scripts/seed-us-indices.ts
 *   US_INDEX_LOOKBACK=730 npx ts-node --transpile-only scripts/seed-us-indices.ts
 *   npx ts-node --transpile-only scripts/seed-us-indices.ts --symbols=^GSPC,^VIX
 *   npx ts-node --transpile-only scripts/seed-us-indices.ts --lookback=200
 *   npx ts-node --transpile-only scripts/seed-us-indices.ts --no-etf   # indices only
 *
 * Idempotent: upserts catalog rows and price_ticks. Never touches non-US rows.
 * Does NOT start/stop any server and does NOT run prisma migrate.
 */
import prisma from '../src/db/prisma';
import { MarketDataFoundationRepository } from '../src/modules/market-data-foundation/market-data-foundation.repository';
import { fetchYahooHistory } from '../src/modules/market-data-foundation/market-data-foundation.yahoo-eod-provider';
import type { HistoricalPrice } from '../src/modules/market-data-foundation/market-data-foundation.types';

// ---------------------------------------------------------------------------
// Default instrument sets
// ---------------------------------------------------------------------------

/** Core US benchmark indices. assetType = INDEX. */
const DEFAULT_INDEX_INSTRUMENTS: Array<{ symbol: string; name: string; assetType: 'INDEX' | 'ETF' }> = [
  { symbol: '^GSPC', name: 'S&P 500 Index',       assetType: 'INDEX' },
  { symbol: '^VIX',  name: 'CBOE Volatility Index', assetType: 'INDEX' },
];

/** SPDR sector ETFs tracking S&P 500 sectors. assetType = ETF. */
const DEFAULT_SECTOR_ETF_INSTRUMENTS: Array<{ symbol: string; name: string; assetType: 'INDEX' | 'ETF' }> = [
  { symbol: 'XLK',  name: 'Technology Select Sector SPDR',           assetType: 'ETF' },
  { symbol: 'XLF',  name: 'Financial Select Sector SPDR',            assetType: 'ETF' },
  { symbol: 'XLV',  name: 'Health Care Select Sector SPDR',          assetType: 'ETF' },
  { symbol: 'XLE',  name: 'Energy Select Sector SPDR',               assetType: 'ETF' },
  { symbol: 'XLY',  name: 'Consumer Discretionary Select Sector SPDR', assetType: 'ETF' },
  { symbol: 'XLP',  name: 'Consumer Staples Select Sector SPDR',     assetType: 'ETF' },
  { symbol: 'XLI',  name: 'Industrial Select Sector SPDR',           assetType: 'ETF' },
  { symbol: 'XLB',  name: 'Materials Select Sector SPDR',            assetType: 'ETF' },
  { symbol: 'XLRE', name: 'Real Estate Select Sector SPDR',          assetType: 'ETF' },
  { symbol: 'XLU',  name: 'Utilities Select Sector SPDR',            assetType: 'ETF' },
  { symbol: 'XLC',  name: 'Communication Services Select Sector SPDR', assetType: 'ETF' },
];

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]) {
  const args = {
    symbols: undefined as string[] | undefined,
    lookback: undefined as number | undefined,
    includeEtf: true,
  };
  for (const raw of argv.slice(2)) {
    if (raw.startsWith('--symbols=')) {
      args.symbols = raw.split('=')[1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else if (raw.startsWith('--lookback=')) {
      args.lookback = Number(raw.split('=')[1]) || undefined;
    } else if (raw === '--no-etf') {
      args.includeEtf = false;
    }
  }
  // Env overrides (lower priority than CLI flags)
  if (!args.symbols && process.env.US_INDEX_SYMBOLS) {
    args.symbols = process.env.US_INDEX_SYMBOLS.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  }
  if (!args.lookback && process.env.US_INDEX_LOOKBACK) {
    args.lookback = Number(process.env.US_INDEX_LOOKBACK) || undefined;
  }
  return args;
}

// ---------------------------------------------------------------------------
// Summary counters
// ---------------------------------------------------------------------------

interface SeedSummary {
  catalogInserted: number;
  catalogUpdated: number;
  catalogNoOp: number;
  barsReceived: number;
  barsInserted: number;
  barsUpdated: number;
  barsNoOp: number;
  symbolsWithNoData: number;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);

  // Resolve instrument list
  let instruments: Array<{ symbol: string; name: string; assetType: 'INDEX' | 'ETF' }>;
  if (args.symbols) {
    // Manual override — guess assetType from symbol prefix
    instruments = args.symbols.map((sym) => ({
      symbol: sym,
      name: sym.startsWith('^') ? `${sym} Index` : sym,
      assetType: sym.startsWith('^') ? 'INDEX' : 'ETF',
    }));
  } else {
    instruments = [
      ...DEFAULT_INDEX_INSTRUMENTS,
      ...(args.includeEtf ? DEFAULT_SECTOR_ETF_INSTRUMENTS : []),
    ];
  }

  const lookbackDays = args.lookback ?? Number(process.env.US_INDEX_LOOKBACK || '400');
  const startTime = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  console.log(
    `[seed-us-indices] Starting. instruments=${instruments.length} lookback=${lookbackDays}d startTime=${startTime.toISOString().slice(0, 10)}`,
  );

  const repository = new MarketDataFoundationRepository();

  const summary: SeedSummary = {
    catalogInserted: 0,
    catalogUpdated: 0,
    catalogNoOp: 0,
    barsReceived: 0,
    barsInserted: 0,
    barsUpdated: 0,
    barsNoOp: 0,
    symbolsWithNoData: 0,
    warnings: [],
  };

  for (const instrument of instruments) {
    const { symbol, name, assetType } = instrument;

    // ── 1. Ensure catalog row ────────────────────────────────────────────────
    let stockId: string;
    try {
      const catalogResult = await repository.upsertCatalogInstrument({
        symbol,
        name,
        region: 'US',
        exchange: assetType === 'INDEX' ? 'US_INDEX' : 'NYSE_ARCA',
        country: 'United States',
        currency: 'USD',
        assetType,
        instrumentSegment: assetType === 'INDEX' ? 'INDEX' : 'ETF',
        catalogSource: 'US_INDEX_SEED',
        source: 'US_INDEX_SEED',
        dataStatus: 'PARTIAL',
        isActive: true,
        isDelisted: false,
      });
      stockId = catalogResult.stock.id;
      if (catalogResult.action === 'inserted') {
        summary.catalogInserted++;
        console.log(`[seed-us-indices] catalog inserted: ${symbol} (${name})`);
      } else if (catalogResult.action === 'updated') {
        summary.catalogUpdated++;
        console.log(`[seed-us-indices] catalog updated:  ${symbol}`);
      } else {
        summary.catalogNoOp++;
      }
    } catch (err) {
      const msg = `catalog upsert failed for ${symbol}: ${err instanceof Error ? err.message : String(err)}`;
      console.warn(`[seed-us-indices] WARN: ${msg}`);
      summary.warnings.push(msg);
      continue;
    }

    // ── 2. Fetch Yahoo history ───────────────────────────────────────────────
    let bars: HistoricalPrice[];
    try {
      bars = await fetchYahooHistory(symbol, 'US', { startTime });
    } catch (err) {
      const msg = `Yahoo fetch failed for ${symbol}: ${err instanceof Error ? err.message : String(err)}`;
      console.warn(`[seed-us-indices] WARN: ${msg}`);
      summary.warnings.push(msg);
      summary.symbolsWithNoData++;
      continue;
    }

    if (bars.length === 0) {
      console.warn(`[seed-us-indices] WARN: no price data returned for ${symbol}`);
      summary.symbolsWithNoData++;
      continue;
    }
    summary.barsReceived += bars.length;

    // ── 3. Persist price ticks ───────────────────────────────────────────────
    try {
      const priceResult = await repository.storeHistoricalBulk(
        bars,
        (_sym) => ({ region: 'US' }),
        new Map([[symbol, { region: 'US' }]]),
      );
      summary.barsInserted += priceResult.rowsInserted;
      summary.barsUpdated  += priceResult.rowsUpdated;
      summary.barsNoOp     += priceResult.rowsNoOp;
      if (priceResult.warnings.length) {
        summary.warnings.push(...priceResult.warnings.map((w) => `${symbol}: ${w}`));
      }
      console.log(
        `[seed-us-indices] ${symbol}: bars=${bars.length} inserted=${priceResult.rowsInserted} updated=${priceResult.rowsUpdated} noOp=${priceResult.rowsNoOp}`,
      );
    } catch (err) {
      const msg = `storeHistoricalBulk failed for ${symbol}: ${err instanceof Error ? err.message : String(err)}`;
      console.warn(`[seed-us-indices] WARN: ${msg}`);
      summary.warnings.push(msg);
    }

    void stockId; // referenced for catalog bookkeeping; not used further
  }

  // ── 4. Print summary ────────────────────────────────────────────────────────
  console.log('[seed-us-indices] ── Summary ──────────────────────────────────────');
  console.log(`  Catalog: inserted=${summary.catalogInserted} updated=${summary.catalogUpdated} noOp=${summary.catalogNoOp}`);
  console.log(`  Prices : received=${summary.barsReceived} inserted=${summary.barsInserted} updated=${summary.barsUpdated} noOp=${summary.barsNoOp} noData=${summary.symbolsWithNoData}`);
  if (summary.warnings.length) {
    console.warn(`  Warnings (${summary.warnings.length}):`);
    summary.warnings.slice(0, 20).forEach((w) => console.warn(`    ${w}`));
  }
  console.log('[seed-us-indices] Done.');
}

main()
  .catch((err) => {
    console.error('[seed-us-indices] Fatal:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
