/**
 * US Forward-Earnings Calendar Scheduler
 *
 * Keeps the Earnings page "Upcoming Results" fresh for US automatically. Today
 * the forward-earnings calendar only populates when someone runs the Yahoo
 * fundamentals seed by hand and then POSTs the earnings refresh — so it goes
 * stale. This scheduler does both steps on a WEEKLY cadence (earnings dates move
 * slowly), each Sunday at a UTC time AFTER the daily US price/snapshot jobs have
 * run (the US EOD price refresh fires ~21:30 UTC and the US snapshot regens in
 * `eod-ingest.scheduler.ts` fire ~22:00+ UTC), so it refreshes off freshly-stored
 * prices and never races them.
 *
 * run() does two steps IN ORDER, each wrapped so a provider/refresh failure logs
 * a warning and never crashes the scheduler:
 *   1. Ingest forward earnings dates for US via the free, keyless Yahoo
 *      `quoteSummary` fundamentals service (writes `Fundamental.officialResultDate`;
 *      it already has bounded concurrency + a circuit breaker).
 *   2. THEN re-materialise the US earnings snapshot so the page surfaces the new
 *      dates, looping the batched `refreshSnapshots` offset until `hasMore` is
 *      false (mirrors how the `/earnings/refresh` controller calls the service).
 *
 * Mirrors the `UsEodPriceScheduler` design exactly: a pure exported `isDue` gate,
 * a 5-minute clock tick, a once-per-UTC-day guard, fire-and-forget `run()` with a
 * caught warning, a module-level singleton + `start...Scheduler()`, and lazy
 * `require()` of the cross-module services inside `run()`. In-memory
 * `lastFiredDate` means a process restart before the scheduled time simply fires
 * on the next due tick.
 *
 * Research-support only: observed Yahoo forward earnings dates, not advice.
 */

const UTC_HOUR = 23;
const UTC_MINUTE = 45; // Sunday late-UTC, after the US price (21:30) + snapshot (~22:00) jobs
const DAYS_OF_WEEK_UTC = new Set([0]); // Sunday only — earnings dates change slowly

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Pure decision: should the US forward-earnings refresh fire at `now`, given the
 * UTC date it last fired? Fires on a Sunday once the scheduled UTC time is reached
 * and it hasn't already fired today. Exported for unit testing without touching
 * the network.
 */
export function isUsEarningsRefreshDue(now: Date, lastFiredDate: string | null): boolean {
  if (lastFiredDate === utcDateString(now)) return false;
  if (!DAYS_OF_WEEK_UTC.has(now.getUTCDay())) return false;
  const nowUtcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return nowUtcMinutes >= UTC_HOUR * 60 + UTC_MINUTE;
}

export class UsEarningsScheduler {
  private timer: NodeJS.Timeout | null = null;
  private lastFiredDate: string | null = null;
  private readonly tickIntervalMs: number;

  constructor(tickIntervalMinutes = 5) {
    this.tickIntervalMs = Math.max(1, tickIntervalMinutes) * 60_000;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(new Date()), this.tickIntervalMs);
    console.log('[UsEarningsScheduler] started, tick every', this.tickIntervalMs / 60_000, 'min');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Visible for tests. */
  tick(now: Date): void {
    if (!isUsEarningsRefreshDue(now, this.lastFiredDate)) return;
    // Mark fired before the async call so a slow run doesn't double-fire. This
    // once-per-UTC-day guard is also what makes run() non-reentrant — a run
    // longer than the 5-min tick cannot be re-entered the same day.
    this.lastFiredDate = utcDateString(now);
    this.run();
  }

  private run(): void {
    (async () => {
      await this.ingestForwardEarningsDates();
      await this.refreshEarningsSnapshot();
    })().catch((err: unknown) => {
      // Defensive: the two steps are individually guarded, so this should not
      // trigger — but a top-level catch keeps a surprise from crashing the tick.
      console.warn(
        '[UsEarningsScheduler] US forward-earnings refresh failed (will retry next Sunday):',
        err instanceof Error ? err.message : String(err),
      );
    });
  }

  /**
   * Step 1: ingest forward earnings dates for US via Yahoo fundamentals. Guarded
   * so a Yahoo failure logs a warning and the snapshot refresh still runs against
   * whatever dates are already persisted.
   */
  private async ingestForwardEarningsDates(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { yahooFundamentalsService } =
        require('../market-data-foundation/ingestion/market-data-foundation.yahoo-fundamentals.service') as typeof import('../market-data-foundation/ingestion/market-data-foundation.yahoo-fundamentals.service');
      const limit = Number(process.env.US_EARNINGS_LIMIT || 1500);
      const summary = await yahooFundamentalsService.ingestForSymbols({ region: 'US', limit });
      console.log('[UsEarningsScheduler] US forward-earnings ingest complete', {
        processed: summary.processed,
        updated: summary.updated,
        earningsDates: summary.earningsDates,
        aborted: summary.aborted,
      });
    } catch (err: unknown) {
      console.warn(
        '[UsEarningsScheduler] US forward-earnings ingest failed (continuing to snapshot refresh):',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  /**
   * Step 2: re-materialise the US earnings snapshot. Mirrors the
   * `/api/v1/market-intelligence/earnings/refresh` controller — calls
   * `refreshSnapshots({ region: 'US', assetType: 'STOCK' })` and advances the
   * returned `nextOffset` until `hasMore` is false. Guarded so a refresh failure
   * logs a warning rather than crashing the scheduler.
   */
  private async refreshEarningsSnapshot(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { EarningsIntelligenceService } =
        require('../earnings-intelligence/earnings-intelligence.service') as typeof import('../earnings-intelligence/earnings-intelligence.service');
      const service = new EarningsIntelligenceService();
      const snapshotDate = new Date();
      let offset = 0;
      let totalProcessed = 0;
      let totalSucceeded = 0;
      // Hard ceiling on batches as a runaway guard (1500 symbols / 25-per-batch
      // ≈ 60 batches; 1000 leaves ample headroom while bounding the loop).
      for (let batch = 0; batch < 1000; batch += 1) {
        const result = await service.refreshSnapshots({
          region: 'US',
          assetType: 'STOCK',
          snapshotDate,
          batchSize: 25,
          offset,
        });
        totalProcessed += result.processedCount;
        totalSucceeded += result.succeededCount;
        if (!result.hasMore || result.nextOffset == null) break;
        offset = result.nextOffset;
      }
      console.log('[UsEarningsScheduler] US earnings snapshot refresh complete', {
        processed: totalProcessed,
        succeeded: totalSucceeded,
      });
    } catch (err: unknown) {
      console.warn(
        '[UsEarningsScheduler] US earnings snapshot refresh failed (will retry next Sunday):',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

const singletonUsEarningsScheduler = new UsEarningsScheduler();

export function startUsEarningsScheduler(): UsEarningsScheduler {
  singletonUsEarningsScheduler.start();
  return singletonUsEarningsScheduler;
}

export function getUsEarningsScheduler(): UsEarningsScheduler {
  return singletonUsEarningsScheduler;
}
