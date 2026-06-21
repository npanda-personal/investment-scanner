import { MarketDataFoundationRepository } from '../../market-data-foundation.repository';
import { fetchNasdaqTraderUniverse, UsUniverseCandidate } from './market-data-foundation.us-catalog-source';
import { resolveEodProvider, isRegionProviderEnabled } from '../market-data-foundation.provider-registry';
import { YAHOO_PROVIDER_THROTTLE_MS } from '../market-data-foundation.yahoo-eod-provider';
import { eachWithConcurrency } from '../../util/market-data-foundation.util.concurrency';

/**
 * US equity ingestion service — orchestrates the FREE US providers
 * (NASDAQ Trader universe + Yahoo keyless chart API for EOD prices and
 * dividend/split corporate actions) into the SHARED equity tables
 * (stocks / price_ticks / latest_prices / corporate_actions) with region='US'.
 *
 * Mirrors the crypto ingestion service shape, but writes equities (no isolated
 * tables — US/EU equities are region-discriminated rows alongside India).  It
 * NEVER mutates a non-US row: on a global symbol collision with an existing
 * IN/EU/crypto instrument it skips with a warning rather than overwriting.
 *
 * Driven by the seed script (scripts/seed-us-universe.ts) and the scheduler's
 * US region lane via the free region-provider import path.  The backfill is
 * resumable (skipSymbols) and emits per-symbol progress so a multi-hour
 * full-universe run can checkpoint and recover.
 */

export interface UsUniverseIngestSummary {
  source: 'US_EQUITY';
  universeFetched: number;
  universeRequested: number | 'ALL';
  assetsInserted: number;
  assetsUpdated: number;
  assetsSkipped: number;
  collisionsSkipped: number;
  warnings: string[];
}

export interface UsPriceBackfillSummary {
  source: 'US_EQUITY';
  symbolsProcessed: number;
  symbolsSkipped: number;
  barsReceived: number;
  barsInserted: number;
  barsUpdated: number;
  barsSkipped: number;
  symbolsWithNoData: number;
  corporateActionsUpserted: number;
  symbolsWithActions: number;
  /** Symbols whose backfill inserted or updated at least one bar (for DQ downstream). */
  changedSymbols: string[];
  /** Symbols whose fetch/store threw (isolated — did not abort the run). */
  symbolsFailed: number;
  /** Epoch/pre-listing artifact bars dropped at ingest (data hygiene). */
  barsDroppedStale: number;
  /** True if the circuit breaker paused the run (provider likely throttling/banning). */
  aborted: boolean;
  warnings: string[];
}

export interface UsPriceBackfillOptions {
  /** Region to ingest for (default 'US'). EU rides the same Yahoo path via the adapter. */
  region?: string;
  symbols?: string[];
  lookbackDays?: number;
  all?: boolean;
  /** Upper-cased symbols to skip (resume support — already-completed in a prior pass). */
  skipSymbols?: Set<string>;
  /** Parse + persist dividend/split corporate actions alongside prices (default true). */
  withCorporateActions?: boolean;
  /** Max symbols fetched in parallel (default MARKET_DATA_US_FETCH_CONCURRENCY or 6). */
  concurrency?: number;
  /** Trip the circuit breaker after this many consecutive failures (default 25). */
  maxConsecutiveFailures?: number;
  /** Drop bars dated before this year as epoch/pre-listing artifacts (default 1971). */
  priceFloorYear?: number;
  /**
   * Per-symbol progress callback for checkpointing / logging.  `ok` is false only
   * when the fetch/store threw — callers should checkpoint on `ok` (a clean empty
   * result is `ok: true, hadData: false`) so genuine failures are retried on resume.
   */
  onSymbolComplete?: (symbol: string, info: { index: number; total: number; bars: number; actions: number; hadData: boolean; ok: boolean }) => void;
}

export class UsEquityIngestionService {
  constructor(private readonly repo = new MarketDataFoundationRepository()) {}

  get enabled(): boolean {
    return isRegionProviderEnabled('US');
  }

  /**
   * Fetch the US universe and upsert into `stocks` (region='US').  `limit` caps
   * the count (alphabetical until market-cap ranks exist); `all` ingests the
   * entire universe.  Idempotent.
   */
  async ingestUniverse(
    options: { limit?: number; all?: boolean; includeSymbols?: string[] } = {}
  ): Promise<UsUniverseIngestSummary> {
    const { candidates, warnings } = await fetchNasdaqTraderUniverse();
    const base = options.all ? candidates : candidates.slice(0, options.limit ?? 1000);
    // Always include explicitly-requested symbols (e.g. tickers under test) even
    // when they fall outside the top-N alphabetical slice, so their catalog rows
    // exist for price backfill. Stays within the staged "top-N + tested symbols".
    const selected = base;
    if (options.includeSymbols && options.includeSymbols.length > 0) {
      const want = new Set(options.includeSymbols.map((s) => s.trim().toUpperCase()));
      const already = new Set(base.map((c) => c.symbol));
      for (const candidate of candidates) {
        if (want.has(candidate.symbol) && !already.has(candidate.symbol)) selected.push(candidate);
      }
    }

    const summary: UsUniverseIngestSummary = {
      source: 'US_EQUITY',
      universeFetched: candidates.length,
      universeRequested: options.all ? 'ALL' : options.limit ?? 1000,
      assetsInserted: 0,
      assetsUpdated: 0,
      assetsSkipped: 0,
      collisionsSkipped: 0,
      warnings: [...warnings],
    };

    for (const candidate of selected) {
      try {
        const result = await this.upsertUsStock(candidate);
        if (result === 'inserted') summary.assetsInserted += 1;
        else if (result === 'updated') summary.assetsUpdated += 1;
        else if (result === 'collision') {
          summary.collisionsSkipped += 1;
          if (summary.warnings.length < 25) {
            summary.warnings.push(`Skipped ${candidate.symbol}: symbol already exists in a non-US scope.`);
          }
        } else summary.assetsSkipped += 1;
      } catch (error) {
        summary.assetsSkipped += 1;
        if (summary.warnings.length < 25) {
          summary.warnings.push(`Upsert failed for ${candidate.symbol}: ${(error as Error).message}`);
        }
      }
    }
    return summary;
  }

  /**
   * Collision-safe upsert into the shared `stocks` table.  Returns:
   *  - 'inserted' / 'updated' for US rows
   *  - 'collision' when the symbol exists under a different region (left untouched)
   */
  private async upsertUsStock(candidate: UsUniverseCandidate): Promise<'inserted' | 'updated' | 'collision'> {
    const existing = await this.repo.prisma.stock.findUnique({
      where: { symbol: candidate.symbol },
      select: { id: true, region: true },
    });

    if (existing && existing.region !== 'US') {
      return 'collision';
    }

    const base = {
      name: candidate.name,
      region: 'US',
      country: 'US',
      currency: 'USD',
      exchange: candidate.exchange,
      assetType: candidate.assetType,
      instrumentSegment: candidate.assetType === 'ETF' ? 'ETF' : 'CASH',
      displaySymbol: candidate.symbol,
      providerSymbol: candidate.symbol,
      catalogSource: candidate.catalogSource,
      providerSupportStatus: 'SUPPORTED',
      source: candidate.catalogSource,
      dataStatus: 'PARTIAL',
      isActive: true,
    };

    if (existing) {
      await this.repo.prisma.stock.update({ where: { id: existing.id }, data: base });
      return 'updated';
    }
    await this.repo.prisma.stock.create({ data: { symbol: candidate.symbol, ...base } });
    return 'inserted';
  }

  /** List active stock rows (id + symbol + exchange) for a region's price backfill. */
  private async listRegionSymbols(region: string): Promise<Array<{ id: string; symbol: string; exchange: string | null }>> {
    const rows = await this.repo.prisma.stock.findMany({
      where: { region, isActive: true, isDelisted: false },
      select: { id: true, symbol: true, exchange: true },
      orderBy: { symbol: 'asc' },
    });
    return rows;
  }

  /**
   * Backfill daily OHLCV (and dividend/split corporate actions) from the free
   * Yahoo chart API into price_ticks / latest_prices / corporate_actions for the
   * given symbols (or all active US stocks when omitted), region='US'.
   *
   * Resumable: pass `skipSymbols` to skip already-completed symbols, and
   * `onSymbolComplete` to checkpoint progress for a long full-universe run.
   */
  async backfillPrices(options: UsPriceBackfillOptions = {}): Promise<UsPriceBackfillSummary> {
    const region = (options.region || 'US').toUpperCase();
    const provider = resolveEodProvider(region);
    const withCorporateActions = options.withCorporateActions !== false;
    const summary: UsPriceBackfillSummary = {
      source: 'US_EQUITY',
      symbolsProcessed: 0,
      symbolsSkipped: 0,
      barsReceived: 0,
      barsInserted: 0,
      barsUpdated: 0,
      barsSkipped: 0,
      symbolsWithNoData: 0,
      corporateActionsUpserted: 0,
      symbolsWithActions: 0,
      changedSymbols: [],
      symbolsFailed: 0,
      barsDroppedStale: 0,
      aborted: false,
      warnings: [],
    };
    if (!provider) {
      summary.warnings.push(`${region} EOD provider disabled (MARKET_DATA_${region}_PROVIDER_ENABLED=false).`);
      return summary;
    }

    let targets: Array<{ id?: string; symbol: string; exchange: string | null }>;
    if (options.symbols && options.symbols.length > 0) {
      const wanted = new Set(options.symbols.map((s) => s.trim().toUpperCase()));
      const known = await this.listRegionSymbols(region);
      const bySymbol = new Map(known.map((r) => [r.symbol, r] as const));
      targets = [...wanted].map((symbol) => bySymbol.get(symbol) ?? { symbol, exchange: null });
    } else {
      targets = await this.listRegionSymbols(region);
    }

    const skip = options.skipSymbols;
    const startTime = options.lookbackDays
      ? new Date(Date.now() - options.lookbackDays * 24 * 60 * 60 * 1000)
      : null;

    // Region info per symbol so price_ticks rows carry the correct region + exchange.
    const regionInfoBySymbol = new Map<string, { region: string; exchange?: string | null }>();

    // Efficiency: fetch up to `concurrency` symbols in parallel (1,500 names finish
    // in one post-close pass). Robustness: a circuit breaker pauses the run if the
    // provider starts mass-rejecting (avoids IP bans) — `consecutiveFailures` is a
    // failure-pressure signal (failures with no intervening success across the
    // interleaved workers); under a genuine ban no success resets it, so it climbs
    // to the threshold, at which point the abort predicate stops launching new
    // fetches. Per-symbol errors stay isolated; epoch/pre-listing bars are dropped.
    const concurrency = Math.max(1, Math.min(options.concurrency ?? (Number(process.env.MARKET_DATA_US_FETCH_CONCURRENCY) || 6), 32));
    const maxConsecutiveFailures = Math.max(1, options.maxConsecutiveFailures ?? 25);
    const floorYear = options.priceFloorYear ?? (Number(process.env.MARKET_DATA_US_PRICE_FLOOR_YEAR) || 1971);
    const total = targets.length;
    let index = 0;
    let consecutiveFailures = 0;
    let aborted = false;

    await eachWithConcurrency(targets, concurrency, async (target) => {
      if (aborted) return;
      const myIndex = (index += 1);
      if (skip && skip.has(target.symbol.toUpperCase())) {
        summary.symbolsSkipped += 1;
        return;
      }
      try {
        const withEvents = withCorporateActions && typeof provider.fetchHistoryWithEvents === 'function';
        const fetched = withEvents
          ? await provider.fetchHistoryWithEvents!(target.symbol, { exchange: target.exchange, startTime, throttleMs: YAHOO_PROVIDER_THROTTLE_MS })
          : { bars: await provider.fetchHistory(target.symbol, { exchange: target.exchange, startTime, throttleMs: YAHOO_PROVIDER_THROTTLE_MS }), actions: [] };
        consecutiveFailures = 0;
        const rawBars = fetched.bars;
        const actions = fetched.actions ?? [];
        // Drop epoch/pre-listing artifact bars (e.g. Yahoo's spurious 1970-01-02
        // leading row) so they never enter price_ticks.
        const bars = floorYear > 0 ? rawBars.filter((b) => b.date.getUTCFullYear() >= floorYear) : rawBars;
        summary.barsDroppedStale += rawBars.length - bars.length;
        summary.symbolsProcessed += 1;
        if (bars.length === 0) {
          summary.symbolsWithNoData += 1;
          options.onSymbolComplete?.(target.symbol, { index: myIndex, total, bars: 0, actions: 0, hadData: false, ok: true });
          return;
        }
        regionInfoBySymbol.set(target.symbol, { region, exchange: target.exchange ?? null });
        const stored = await this.repo.storeHistoricalBulk(
          bars,
          () => ({ region, exchange: target.exchange ?? null }),
          regionInfoBySymbol
        );
        summary.barsReceived += stored.rowsReceived;
        summary.barsInserted += stored.rowsInserted;
        summary.barsUpdated += stored.rowsUpdated;
        summary.barsSkipped += stored.rowsSkipped;
        if (stored.rowsInserted > 0 || stored.rowsUpdated > 0) {
          summary.changedSymbols.push(target.symbol);
        }
        if (stored.warnings.length && summary.warnings.length < 25) {
          summary.warnings.push(...stored.warnings.slice(0, 3));
        }

        // Persist corporate actions (dividends/splits) — needs the resolved stockId.
        let actionsUpserted = 0;
        if (withCorporateActions && actions.length > 0) {
          const stockId = target.id ?? (await this.resolveRegionStockId(region, target.symbol));
          if (stockId) {
            try {
              await this.repo.upsertCorporateActions(stockId, actions);
              actionsUpserted = actions.length;
              summary.corporateActionsUpserted += actions.length;
              summary.symbolsWithActions += 1;
            } catch (caError) {
              if (summary.warnings.length < 25) {
                summary.warnings.push(`Corporate-action upsert failed for ${target.symbol}: ${(caError as Error).message}`);
              }
            }
          }
        }

        options.onSymbolComplete?.(target.symbol, { index: myIndex, total, bars: bars.length, actions: actionsUpserted, hadData: true, ok: true });
      } catch (error) {
        consecutiveFailures += 1;
        summary.symbolsFailed += 1;
        if (summary.warnings.length < 25) {
          summary.warnings.push(`Backfill failed for ${target.symbol}: ${(error as Error).message}`);
        }
        options.onSymbolComplete?.(target.symbol, { index: myIndex, total, bars: 0, actions: 0, hadData: false, ok: false });
        if (consecutiveFailures >= maxConsecutiveFailures && !aborted) {
          aborted = true;
          summary.aborted = true;
          summary.warnings.push(`Circuit breaker tripped after ${consecutiveFailures} consecutive failures — pausing ${region} backfill to avoid provider bans.`);
        }
      }
    }, () => aborted);
    if (aborted) {
      summary.warnings.push(`${region} backfill paused early after ~${index}/${total} symbols attempted (circuit breaker tripped on sustained provider failures).`);
    }
    return summary;
  }

  /** Resolve the stockId for a region's symbol (collision-safe — region-scoped). */
  private async resolveRegionStockId(region: string, symbol: string): Promise<string | null> {
    const row = await this.repo.prisma.stock.findFirst({
      where: { symbol: symbol.toUpperCase(), region },
      select: { id: true },
    });
    return row?.id ?? null;
  }
}

export const usEquityIngestionService = new UsEquityIngestionService();
