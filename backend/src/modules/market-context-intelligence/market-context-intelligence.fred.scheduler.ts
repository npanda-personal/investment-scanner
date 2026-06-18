/**
 * FRED Macro Scheduler
 *
 * Refreshes the GLOBAL macro regime read from free FRED series once per day,
 * shortly after FRED's typical publish window (~08:00 UTC). FRED updates slowly
 * (DFF/T10Y2Y daily on a lag; CPIAUCSL monthly), so a single daily pull is
 * ample — there is no intraday macro to chase.
 *
 * Mirrors the UsEodPriceScheduler design: a 5-minute clock tick, a UTC
 * time-of-day gate, a once-per-UTC-day guard, and fire-and-forget with a caught
 * warning so a FRED outage (or an unset FRED_API_KEY) never crashes the process.
 * In-memory `lastFiredDate` means a restart before 08:00 UTC simply fires on the
 * next due tick. Runs every day (FRED macro is not market-session bound).
 *
 * Research-support only: observed FRED macro series, characterized as a regime
 * read — not advice.
 */

const UTC_HOUR = 8;
const UTC_MINUTE = 0;

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Pure decision: should the FRED macro refresh fire at `now`, given the UTC date
 * it last fired? Fires once the scheduled UTC time is reached and it hasn't
 * already fired today. Runs every calendar day. Exported for unit testing
 * without touching the network.
 */
export function isFredDue(now: Date, lastFiredDate: string | null): boolean {
  if (lastFiredDate === utcDateString(now)) return false;
  const nowUtcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return nowUtcMinutes >= UTC_HOUR * 60 + UTC_MINUTE;
}

export class FredMacroScheduler {
  private timer: NodeJS.Timeout | null = null;
  private lastFiredDate: string | null = null;
  private readonly tickIntervalMs: number;

  constructor(tickIntervalMinutes = 5) {
    this.tickIntervalMs = Math.max(1, tickIntervalMinutes) * 60_000;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(new Date()), this.tickIntervalMs);
    console.log('[FredMacroScheduler] started, tick every', this.tickIntervalMs / 60_000, 'min');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Visible for tests. */
  tick(now: Date): void {
    if (!isFredDue(now, this.lastFiredDate)) return;
    // Mark fired before the async call so a slow fetch doesn't double-fire. This
    // once-per-UTC-day guard also makes run() non-reentrant — a fetch running
    // longer than the 5-min tick cannot be re-entered the same day.
    this.lastFiredDate = utcDateString(now);
    this.run();
  }

  private run(): void {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { fredMacroIngestService } = require('./market-context-intelligence.fred-ingest.service') as typeof import('./market-context-intelligence.fred-ingest.service');
      const result = await fredMacroIngestService.ingest();
      console.log('[FredMacroScheduler] FRED macro refresh complete', {
        status: result.status,
        macroStatus: result.snapshot?.macroStatus ?? null,
        warnings: result.warnings.length,
      });
      return result;
    })().catch((err: unknown) => {
      console.warn(
        '[FredMacroScheduler] FRED macro refresh failed (will retry tomorrow):',
        err instanceof Error ? err.message : String(err),
      );
    });
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

const singletonFredMacroScheduler = new FredMacroScheduler();

export function startFredScheduler(): FredMacroScheduler {
  singletonFredMacroScheduler.start();
  return singletonFredMacroScheduler;
}

export function getFredMacroScheduler(): FredMacroScheduler {
  return singletonFredMacroScheduler;
}
