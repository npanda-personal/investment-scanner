/**
 * EOD Ingest Scheduler
 *
 * Runs data ingests and intelligence snapshot regenerations once per day
 * after market close, in staggered order so each job runs on the freshest
 * persisted data:
 *
 *   DATA INGESTS (raw NSE free-data):
 *   1. FII/DII activity         — 18:30 IST (13:00 UTC)
 *   2. Bulk & Block Deals       — 18:35 IST (13:05 UTC)
 *   3. F&O Securities Ban List  — 18:40 IST (13:10 UTC)
 *
 *   INTELLIGENCE SNAPSHOT REGENERATIONS (recompute over persisted data):
 *   4. Market Pulse snapshot    — 19:00 IST (13:30 UTC)
 *      Calls MarketPulseSnapshotService.refreshSnapshot — persists a new
 *      dated snapshot so prior-day diff and sparkline can be computed.
 *      NOTE: The Market Context regime snapshot (MarketContextSnapshot /
 *      HistoricalContextSnapshots) is already scheduled via the
 *      pipeline-orchestration chain (runScheduledMarketContextSnapshotStage
 *      fires as a downstream of the market-data pipeline). It is NOT added
 *      here to avoid duplication.
 *   5. Research Hub snapshot    — 19:10 IST (13:40 UTC)
 *      Calls ResearchHubService.refreshOverview — persists a new overview
 *      snapshot so whatChanged can diff the current day against the prior
 *      one (fixes the permanent "No prior snapshot to compare yet" message).
 *
 * Design:
 * - Uses the same setInterval pattern as MarketDataFoundationScheduler.
 * - Checks time-of-day in UTC on each tick; fires each job at most once per
 *   calendar day (UTC date guard).
 * - Never runs at startup — dev-server restarts must NOT hammer NSE.
 * - Every job is wrapped in try/catch so a network failure only logs a warning
 *   and never crashes the scheduler or the process.
 * - Snapshot regen jobs are pool-aware: they run sequentially (staggered
 *   10-minute gaps) and never concurrently with each other.
 * - The ingest functions already enforce their own 7–8 s timeouts internally.
 */

import { ingestFiiDii } from './fii-dii.service';
import { ingestBulkBlockDeals } from './bulk-block-deals.service';
import { ingestFnoBanList } from '../../modules/smart-money-intelligence/fno-ban.service';
import { MarketPulseSnapshotService } from './market-pulse-snapshot.service';
import { ResearchHubService } from '../research-hub/research-hub.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobSpec {
  /** Descriptive name used in log messages. */
  name: string;
  /** UTC hour at which the job should fire (0–23). */
  utcHour: number;
  /** UTC minute at which the job should fire (0–59). */
  utcMinute: number;
  /** The async ingest function to call. */
  run: () => Promise<unknown>;
  /** ISO date string (YYYY-MM-DD UTC) of the last successful fire, or null. */
  lastFiredDate: string | null;
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

export class EodIngestScheduler {
  private timer: NodeJS.Timeout | null = null;
  /** How often we check the clock (5-minute granularity is plenty). */
  private readonly tickIntervalMs: number;

  private readonly jobs: JobSpec[] = [
    // -----------------------------------------------------------------------
    // DATA INGESTS — raw NSE free-data feeds
    // -----------------------------------------------------------------------
    {
      name: 'FII/DII Activity',
      utcHour: 13,
      utcMinute: 0,   // 18:30 IST = 13:00 UTC
      run: ingestFiiDii,
      lastFiredDate: null,
    },
    {
      name: 'Bulk & Block Deals',
      utcHour: 13,
      utcMinute: 5,   // 18:35 IST = 13:05 UTC
      run: ingestBulkBlockDeals,
      lastFiredDate: null,
    },
    {
      name: 'F&O Ban List',
      utcHour: 13,
      utcMinute: 10,  // 18:40 IST = 13:10 UTC
      run: ingestFnoBanList,
      lastFiredDate: null,
    },
    // -----------------------------------------------------------------------
    // INTELLIGENCE SNAPSHOT REGENERATIONS — recompute over persisted data.
    // Staggered 10-minute gaps keep pool usage sequential, not concurrent.
    // The Market Context regime snapshot is intentionally NOT listed here:
    // it is already fired by pipeline-orchestration's
    // runScheduledMarketContextSnapshotStage (downstream of market-data sync).
    // -----------------------------------------------------------------------
    {
      name: 'Market Pulse Snapshot',
      utcHour: 13,
      utcMinute: 30,  // 19:00 IST = 13:30 UTC
      run: async () => {
        const svc = new MarketPulseSnapshotService();
        return svc.refreshSnapshot({ region: 'IN', assetType: 'STOCK' });
      },
      lastFiredDate: null,
    },
    {
      name: 'Research Hub Snapshot',
      utcHour: 13,
      utcMinute: 40,  // 19:10 IST = 13:40 UTC
      run: async () => {
        const svc = new ResearchHubService();
        return svc.refreshOverview({ region: 'IN', assetType: 'STOCK' });
      },
      lastFiredDate: null,
    },
  ];

  constructor(tickIntervalMinutes = 5) {
    this.tickIntervalMs = Math.max(1, tickIntervalMinutes) * 60_000;
  }

  /** Start the scheduler. Never fires jobs immediately — schedule-only. */
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick(new Date());
    }, this.tickIntervalMs);
    console.log('[EodIngestScheduler] started, tick every', this.tickIntervalMs / 60_000, 'min');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /** Visible for tests. */
  tick(now: Date): void {
    const nowUtcDateStr = utcDateString(now);
    const nowUtcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

    for (const job of this.jobs) {
      const jobUtcMinutes = job.utcHour * 60 + job.utcMinute;

      // Already fired today → skip
      if (job.lastFiredDate === nowUtcDateStr) continue;

      // Not yet reached the scheduled time → skip
      if (nowUtcMinutes < jobUtcMinutes) continue;

      // Mark fired before the async call so a slow response doesn't double-fire
      job.lastFiredDate = nowUtcDateStr;

      this.runSafe(job);
    }
  }

  private runSafe(job: JobSpec): void {
    job.run().then((result) => {
      console.log(`[EodIngestScheduler] ${job.name} completed`, result);
    }).catch((err: unknown) => {
      // Network failures, NSE blocks, parse errors — log only, never rethrow
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[EodIngestScheduler] ${job.name} failed (will retry tomorrow):`, msg);
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

const singletonEodScheduler = new EodIngestScheduler();

export function startEodIngestScheduler(): EodIngestScheduler {
  singletonEodScheduler.start();
  return singletonEodScheduler;
}

export function getEodIngestScheduler(): EodIngestScheduler {
  return singletonEodScheduler;
}
