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
 * - Never runs at startup via the tick loop — dev-server restarts must NOT
 *   hammer NSE on every restart.
 * - seedIfEmpty() is called once at startup and fires each dataset's ingest
 *   ONLY when the corresponding table has zero rows (fresh DB guard). On any
 *   restart with populated tables the COUNT query short-circuits immediately
 *   and no network call is made.
 * - Every job is wrapped in try/catch so a network failure only logs a warning
 *   and never crashes the scheduler or the process.
 * - Snapshot regen jobs are pool-aware: they run sequentially (staggered
 *   10-minute gaps) and never concurrently with each other.
 * - The ingest functions already enforce their own 7–8 s timeouts internally.
 */

import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
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

  /**
   * Start the scheduler.
   * - Registers the periodic tick for daily post-close ingests.
   * - Fires seedIfEmpty() once (fire-and-forget) to populate tables on a
   *   fresh DB. On restarts with data present the seed is a no-op.
   */
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick(new Date());
    }, this.tickIntervalMs);
    console.log('[EodIngestScheduler] started, tick every', this.tickIntervalMs / 60_000, 'min');

    // Guarded startup seed — runs once, skipped if tables already have rows.
    this.seedIfEmpty().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[EodIngestScheduler] seedIfEmpty error (non-fatal):', msg);
    });
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

  /**
   * Startup seed: for each of the 3 NSE data tables, count rows and fire the
   * corresponding ingest ONCE if the table is empty.  Calls are staggered 5 s
   * apart so they don't hammer NSE concurrently.  Any network/parse error is
   * caught and logged — never crashes boot.
   *
   * Guard: if the table already has rows this method returns immediately for
   * that dataset (the COUNT query is the only DB call made on a normal restart).
   */
  private async seedIfEmpty(): Promise<void> {
    const seeds: Array<{
      name: string;
      table: string;
      delayMs: number;
      ingest: () => Promise<unknown>;
    }> = [
      {
        name: 'FII/DII Activity',
        table: 'fii_dii_snapshots',
        delayMs: 0,
        ingest: ingestFiiDii,
      },
      {
        name: 'Bulk & Block Deals',
        table: 'bulk_block_deals',
        delayMs: 5_000,
        ingest: ingestBulkBlockDeals,
      },
      {
        name: 'F&O Ban List',
        table: 'fno_ban_list',
        delayMs: 10_000,
        ingest: ingestFnoBanList,
      },
    ];

    for (const seed of seeds) {
      // Capture for closure — avoid await inside setTimeout
      const { name, table, delayMs, ingest } = seed;

      const isEmpty = await countTableRows(table) === 0;
      if (!isEmpty) {
        console.log(`[EodIngestScheduler] seed skip — ${name} already has data`);
        continue;
      }

      // Schedule the fetch with stagger; wrap in try/catch so NSE failures
      // are warnings, never crashes.
      setTimeout(() => {
        console.log(`[EodIngestScheduler] seeding ${name} (table was empty)…`);
        ingest().then((result) => {
          console.log(`[EodIngestScheduler] seed ${name} done`, result);
        }).catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[EodIngestScheduler] seed ${name} failed (non-fatal):`, msg);
        });
      }, delayMs);
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

/**
 * Return the row count for a raw (non-Prisma-model) table.
 * Returns 0 if the table does not exist yet (handles fresh DB where
 * ensureTable() hasn't been called yet).
 */
async function countTableRows(table: string): Promise<number> {
  try {
    const rows = await prisma.$queryRaw<Array<{ cnt: bigint }>>(
      Prisma.sql`SELECT COUNT(*)::bigint AS cnt FROM ${Prisma.raw(table)}`,
    );
    return Number(rows[0]?.cnt ?? 0);
  } catch {
    // Table doesn't exist yet → treat as empty so seed fires
    return 0;
  }
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
