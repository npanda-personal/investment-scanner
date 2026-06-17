/**
 * seed-eu-universe.ts — seed the curated EUROZONE equity universe + backfill EOD
 * prices AND corporate actions into the SHARED equity tables (region='EU'),
 * FREE via the keyless Yahoo chart API.
 *
 * Universe = market-data-foundation.eu-catalog-source (297 live-validated, EUR-
 * denominated names across XETRA / Euronext / Borsa Italiana / BME / Vienna /
 * Helsinki).  Canonical symbols carry the Yahoo suffix (e.g. SAP.DE) so they
 * never collide with US base tickers.  Stock rows are collision-safe — a symbol
 * already owned by a non-EU region is skipped, never mutated.
 *
 * Requires MARKET_DATA_EU_PROVIDER_ENABLED=true.
 * Run (from backend/):
 *   MARKET_DATA_EU_PROVIDER_ENABLED=true npx ts-node --transpile-only scripts/seed-eu-universe.ts
 *   ... scripts/seed-eu-universe.ts --limit=20                 # first 20 (smoke)
 *   ... scripts/seed-eu-universe.ts --symbols=SAP.DE,ASML.AS   # specific names
 *   ... scripts/seed-eu-universe.ts --lookback-days=400        # shorter window (default: full history)
 *   ... scripts/seed-eu-universe.ts --skip-prices              # upsert universe only
 */
import { Prisma } from '@prisma/client';
import prisma from '../src/db/prisma';
import { MarketDataFoundationRepository } from '../src/modules/market-data-foundation/market-data-foundation.repository';
import { isRegionProviderEnabled } from '../src/modules/market-data-foundation/market-data-foundation.provider-registry';
import {
  fetchYahooHistoryWithEvents,
  YAHOO_PROVIDER_THROTTLE_MS,
} from '../src/modules/market-data-foundation/ingestion/market-data-foundation.yahoo-eod-provider';
import { loadEuUniverse, type EuUniverseCandidate } from '../src/modules/market-data-foundation/market-data-foundation.eu-catalog-source';

function parseArgs(argv: string[]) {
  const args = {
    symbols: undefined as string[] | undefined,
    limit: undefined as number | undefined,
    lookbackDays: undefined as number | undefined,
    skipPrices: false,
  };
  for (const raw of argv.slice(2)) {
    if (raw.startsWith('--symbols=')) args.symbols = raw.split('=')[1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    else if (raw.startsWith('--limit=')) args.limit = Number(raw.split('=')[1]) || undefined;
    else if (raw.startsWith('--lookback-days=')) args.lookbackDays = Number(raw.split('=')[1]) || undefined;
    else if (raw === '--skip-prices') args.skipPrices = true;
  }
  return args;
}

function selectUniverse(args: ReturnType<typeof parseArgs>): EuUniverseCandidate[] {
  let universe = loadEuUniverse();
  if (args.symbols && args.symbols.length) {
    const wanted = new Set(args.symbols);
    universe = universe.filter((c) => wanted.has(c.symbol.toUpperCase()));
  }
  if (args.limit && args.limit > 0) universe = universe.slice(0, args.limit);
  return universe;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!isRegionProviderEnabled('EU')) {
    console.error('[seed-eu] EU provider disabled. Set MARKET_DATA_EU_PROVIDER_ENABLED=true. Aborting.');
    process.exitCode = 1;
    return;
  }

  const repo = new MarketDataFoundationRepository();
  const universe = selectUniverse(args);
  console.log(`[seed-eu] universe selected: ${universe.length} names (lookback=${args.lookbackDays ? `${args.lookbackDays}d` : 'full history'})`);

  // 1) Upsert EU stock rows (collision-safe: never mutate a non-EU symbol).
  let inserted = 0, updated = 0, skipped = 0;
  const stockIdBySymbol = new Map<string, string>();
  for (const c of universe) {
    const existing = await repo.prisma.stock.findUnique({ where: { symbol: c.symbol }, select: { id: true, region: true } });
    if (existing && existing.region !== 'EU') { skipped += 1; continue; }
    const data = {
      name: c.name,
      region: 'EU',
      country: c.country,
      currency: 'EUR',
      exchange: c.exchange,
      assetType: 'STOCK',
      instrumentSegment: 'CASH',
      displaySymbol: c.symbol.split('.')[0],
      providerSymbol: c.symbol,
      catalogSource: 'EU_CURATED',
      providerSupportStatus: 'SUPPORTED',
      source: 'EU_CURATED',
      dataStatus: 'PARTIAL',
      isActive: true,
    };
    if (existing) {
      await repo.prisma.stock.update({ where: { id: existing.id }, data });
      stockIdBySymbol.set(c.symbol, existing.id);
      updated += 1;
    } else {
      const created = await repo.prisma.stock.create({ data: { symbol: c.symbol, ...data } });
      stockIdBySymbol.set(c.symbol, created.id);
      inserted += 1;
    }
  }
  console.log(`[seed-eu] universe: inserted=${inserted} updated=${updated} skipped(non-EU collision)=${skipped}`);

  if (args.skipPrices) {
    console.log('[seed-eu] --skip-prices set; done.');
    return;
  }

  // 2) Backfill EOD prices + corporate actions via the keyless Yahoo chart API.
  //    Full history by default (period1=0); --lookback-days narrows it.
  const startTime = args.lookbackDays ? new Date(Date.now() - args.lookbackDays * 864e5) : null;
  let symbolsOk = 0, noData = 0, failed = 0, bars = 0, caRows = 0;
  for (const c of universe) {
    const stockId = stockIdBySymbol.get(c.symbol);
    if (!stockId) continue; // skipped collision
    try {
      const { bars: history, actions } = await fetchYahooHistoryWithEvents(c.symbol, 'EU', {
        exchange: c.exchange,
        startTime,
        throttleMs: YAHOO_PROVIDER_THROTTLE_MS,
      });
      if (!history.length) { noData += 1; console.warn(`[seed-eu]   ${c.symbol}: no data`); continue; }

      const regionInfo = new Map([[c.symbol, { region: 'EU', exchange: c.exchange }]]);
      const stored = await repo.storeHistoricalBulk(history, () => ({ region: 'EU', exchange: c.exchange }), regionInfo);
      symbolsOk += 1;
      bars += stored.rowsInserted + stored.rowsUpdated;

      // Corporate actions: the parser tags dividends 'USD' (US default) — force
      // the stock's EUR currency for eurozone names before persisting.
      if (actions.length) {
        const euActions = actions.map((a) => ({ ...a, currency: a.type === 'dividend' ? 'EUR' : a.currency ?? null }));
        const caResult = await repo.upsertCorporateActions(stockId, euActions);
        const caCount = (caResult as { inserted?: number; updated?: number } | undefined);
        caRows += (caCount?.inserted ?? 0) + (caCount?.updated ?? 0) || euActions.length;
      }
    } catch (e) {
      failed += 1;
      console.warn(`[seed-eu]   ${c.symbol}: ${(e as Error).message}`);
    }
  }
  console.log(`[seed-eu] prices: ok=${symbolsOk} noData=${noData} failed=${failed} bars=${bars} corporateActions=${caRows}`);

  // 3) Recompute adjustedClose from corporate actions where applicable is handled
  //    by the shared recompute path; Yahoo already supplies split/div-adjusted
  //    close per bar (stored as adjustedClose), so EU rows are adjusted at ingest.
  void Prisma; // (Prisma imported for type parity with sibling seeders)
  console.log('[seed-eu] Done.');
}

main().catch((e) => { console.error('[seed-eu] Fatal:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
