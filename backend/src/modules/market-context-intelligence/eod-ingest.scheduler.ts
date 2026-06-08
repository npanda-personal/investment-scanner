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
 * Single source of truth for intelligence snapshot regenerations:
 *   Market Pulse snapshot and Research Hub (Research Projection) snapshot
 *   are owned by the pipeline-orchestration chain and run as ledger-tracked
 *   downstream stages (MARKET_PULSE_REFRESH after SECTOR_INTELLIGENCE_REFRESH;
 *   RESEARCH_PROJECTION before TODAY_REVIEW). They are NOT scheduled here to
 *   avoid double execution and Postgres connection-pool contention.
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
import { ingestFoBhavcopy } from '../../modules/derivatives-intelligence/derivatives-intelligence.fo-bhavcopy.service';
import { computeOiBuildup } from '../../modules/derivatives-intelligence/derivatives-intelligence.oi-buildup.service';
import { computeOptionMetrics } from '../../modules/derivatives-intelligence/derivatives-intelligence.option-metrics.service';
import { ingestParticipantOi } from '../../modules/derivatives-intelligence/derivatives-intelligence.participant-oi.service';
import { enrichDerivativeCatalogMetadata } from '../../modules/derivatives-intelligence/derivatives-intelligence.catalog-enrichment.service';

/**
 * Ingest the F&O bhavcopy, then compute the derived OI-buildup and option-metric
 * (PCR / max-pain / support-resistance) rows on the freshly persisted contracts,
 * and back-fill Stock derivative metadata (lot size / nearest expiry).
 * Returns a combined result for logging.
 */
async function ingestFoBhavcopyAndBuildup(): Promise<unknown> {
  const ingest = await ingestFoBhavcopy();
  if (ingest.status === 'success' && ingest.tradingDate) {
    const buildup = await computeOiBuildup(ingest.tradingDate);
    const optionMetrics = await computeOptionMetrics(ingest.tradingDate);
    const catalog = await enrichDerivativeCatalogMetadata(ingest.tradingDate);
    return { ingest, buildup, optionMetrics, catalog };
  }
  return { ingest };
}

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
    {
      name: 'F&O Bhavcopy OI',
      utcHour: 13,
      utcMinute: 20,  // 18:50 IST = 13:20 UTC (margin past ~6pm IST publish)
      run: ingestFoBhavcopyAndBuildup,
      lastFiredDate: null,
    },
    {
      name: 'F&O Participant OI',
      utcHour: 13,
      utcMinute: 25,  // 18:55 IST = 13:25 UTC
      run: ingestParticipantOi,
      lastFiredDate: null,
    },
    // NOTE: Market Pulse snapshot and Research Hub snapshot are intentionally
    // NOT listed here for IN/India. Both are now ledger-tracked stages owned by
    // the pipeline-orchestration chain (MARKET_PULSE_REFRESH fires as downstream
    // of SECTOR_INTELLIGENCE_REFRESH; RESEARCH_PROJECTION already ran earlier
    // in the chain before TODAY_REVIEW). Firing them here as well would cause
    // double execution and pool contention.

    // -----------------------------------------------------------------------
    // US PERSISTED-READ SURFACE REFRESH — post-US-close (NYSE closes 21:00 UTC;
    // stagger starting 22:00 UTC so prices are already stored by MarketDataFoundationScheduler).
    // These jobs regenerate snapshot tables from already-persisted prices/signals
    // and do NOT fetch live data — safe to call any time after market close.
    // -----------------------------------------------------------------------
    {
      name: 'US Market Scan Snapshots',
      utcHour: 22,
      utcMinute: 0,  // 22:00 UTC — ~1 h after NYSE close
      run: async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { MarketDataFoundationService } = require('../../modules/market-data-foundation/market-data-foundation.service') as typeof import('../../modules/market-data-foundation/market-data-foundation.service');
          const svc = new MarketDataFoundationService();
          return (svc as any).refreshMarketScanSnapshots({ region: 'US', assetType: 'STOCK' });
        } catch (err) {
          console.warn('[EodIngestScheduler] US Market Scan Snapshots error (non-fatal):', err instanceof Error ? err.message : String(err));
          return null;
        }
      },
      lastFiredDate: null,
    },
    {
      name: 'US Stock Interest Snapshots',
      utcHour: 22,
      utcMinute: 10, // stagger 10 min
      run: async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { StockInterestSnapshotService } = require('../../modules/market-intelligence/stock-interest-snapshot.service') as typeof import('../../modules/market-intelligence/stock-interest-snapshot.service');
          const svc = new StockInterestSnapshotService();
          return (svc as any).refreshSnapshots({ region: 'US', assetType: 'STOCK' });
        } catch (err) {
          console.warn('[EodIngestScheduler] US Stock Interest Snapshots error (non-fatal):', err instanceof Error ? err.message : String(err));
          return null;
        }
      },
      lastFiredDate: null,
    },
    {
      name: 'US Market Pulse Snapshot',
      utcHour: 22,
      utcMinute: 20, // stagger 20 min
      run: async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { MarketPulseSnapshotService } = require('../../modules/market-context-intelligence/market-pulse-snapshot.service') as typeof import('../../modules/market-context-intelligence/market-pulse-snapshot.service');
          const svc = new MarketPulseSnapshotService();
          return (svc as any).refreshSnapshot({ region: 'US', assetType: 'STOCK' });
        } catch (err) {
          console.warn('[EodIngestScheduler] US Market Pulse Snapshot error (non-fatal):', err instanceof Error ? err.message : String(err));
          return null;
        }
      },
      lastFiredDate: null,
    },
    {
      name: 'US Research Hub Overview',
      utcHour: 22,
      utcMinute: 30, // stagger 30 min
      run: async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { ResearchHubService } = require('../../modules/research-hub/research-hub.service') as typeof import('../../modules/research-hub/research-hub.service');
          const svc = new ResearchHubService();
          return (svc as any).refreshOverview({ region: 'US', assetType: 'STOCK' });
        } catch (err) {
          console.warn('[EodIngestScheduler] US Research Hub Overview error (non-fatal):', err instanceof Error ? err.message : String(err));
          return null;
        }
      },
      lastFiredDate: null,
    },
    {
      name: 'US Workbench Snapshots',
      utcHour: 22,
      utcMinute: 40, // stagger 40 min
      run: async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { WorkbenchRefreshService } = require('../../modules/stock-research-workbench') as typeof import('../../modules/stock-research-workbench');
          const svc = new WorkbenchRefreshService();
          return (svc as any).refreshWorkbenchSnapshots({ region: 'US', assetType: 'STOCK' });
        } catch (err) {
          console.warn('[EodIngestScheduler] US Workbench Snapshots error (non-fatal):', err instanceof Error ? err.message : String(err));
          return null;
        }
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
      {
        name: 'F&O Bhavcopy OI',
        table: 'fo_bhavcopy_contracts',
        delayMs: 15_000,
        ingest: ingestFoBhavcopyAndBuildup,
      },
      {
        name: 'F&O Participant OI',
        table: 'fo_participant_oi',
        delayMs: 20_000,
        ingest: ingestParticipantOi,
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
