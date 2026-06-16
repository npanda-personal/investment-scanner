/**
 * US EOD Price Scheduler
 *
 * Fetches a short Yahoo EOD lookback window for ALL active US stocks once per
 * weekday, shortly after NYSE close (21:30 UTC), so US prices advance daily on
 * their own — without a manual `backfill-us-tracked` run. It runs BEFORE the
 * US snapshot regens in `eod-ingest.scheduler.ts` (22:00+ UTC), so those regen
 * off freshly-stored prices.
 *
 * Why a dedicated UNCONDITIONAL refresh rather than relying on the
 * MarketDataFoundationScheduler's session gate: that gate treats a trading day
 * as "stored" once ANY candle exists for it, so a partially-ingested day (e.g.
 * an interrupted run that stored only a handful of symbols) permanently strands
 * the rest of the universe a day behind. Re-fetching a lookback window every
 * weekday — idempotent upsert, dedup on symbol+timestamp — self-heals partial
 * days regardless of that pointer.
 *
 * Mirrors the EodIngestScheduler design: 5-minute clock tick, UTC time-of-day
 * gate, once-per-UTC-day guard, fire-and-forget with a caught warning so a
 * Yahoo failure never crashes the process. In-memory `lastFiredDate` means a
 * process restart before 21:30 UTC simply fires on the next due tick.
 *
 * Research-support only: observed Yahoo EOD prices, not advice.
 */

const UTC_HOUR = 21;
const UTC_MINUTE = 30; // ~30 min after NYSE close (21:00 UTC)
const WEEKDAYS_UTC = new Set([1, 2, 3, 4, 5]); // NYSE trades Mon–Fri

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Pure decision: should the US EOD price refresh fire at `now`, given the UTC
 * date it last fired? Fires on a weekday once the scheduled UTC time is reached
 * and it hasn't already fired today. Exported for unit testing without touching
 * the network.
 */
export function isUsEodPriceDue(now: Date, lastFiredDate: string | null): boolean {
  if (lastFiredDate === utcDateString(now)) return false;
  if (!WEEKDAYS_UTC.has(now.getUTCDay())) return false;
  const nowUtcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return nowUtcMinutes >= UTC_HOUR * 60 + UTC_MINUTE;
}

export class UsEodPriceScheduler {
  private timer: NodeJS.Timeout | null = null;
  private lastFiredDate: string | null = null;
  private readonly tickIntervalMs: number;

  constructor(tickIntervalMinutes = 5) {
    this.tickIntervalMs = Math.max(1, tickIntervalMinutes) * 60_000;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(new Date()), this.tickIntervalMs);
    console.log('[UsEodPriceScheduler] started, tick every', this.tickIntervalMs / 60_000, 'min');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Visible for tests. */
  tick(now: Date): void {
    if (!isUsEodPriceDue(now, this.lastFiredDate)) return;
    // Mark fired before the async call so a slow fetch doesn't double-fire. This
    // once-per-UTC-day guard is also what makes run() non-reentrant — a fetch
    // running longer than the 5-min tick cannot be re-entered the same day.
    this.lastFiredDate = utcDateString(now);
    this.run();
  }

  private run(): void {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { UsEquityIngestionService } = require('../market-data-foundation/ingestion/us/market-data-foundation.us-equity-ingestion.service') as typeof import('../market-data-foundation/ingestion/us/market-data-foundation.us-equity-ingestion.service');
      const lookbackDays = Number(process.env.US_EOD_LOOKBACK_DAYS || 5);
      const summary = await new UsEquityIngestionService().backfillPrices({ region: 'US', lookbackDays });
      console.log('[UsEodPriceScheduler] US EOD price refresh complete', {
        changedSymbols: summary.changedSymbols?.length ?? 0,
      });
      return summary;
    })().catch((err: unknown) => {
      console.warn(
        '[UsEodPriceScheduler] US EOD price refresh failed (will retry tomorrow):',
        err instanceof Error ? err.message : String(err),
      );
    });
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

const singletonUsEodPriceScheduler = new UsEodPriceScheduler();

export function startUsEodPriceScheduler(): UsEodPriceScheduler {
  singletonUsEodPriceScheduler.start();
  return singletonUsEodPriceScheduler;
}

export function getUsEodPriceScheduler(): UsEodPriceScheduler {
  return singletonUsEodPriceScheduler;
}
