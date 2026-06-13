import { Prisma, PrismaClient } from '@prisma/client';
import defaultPrisma from '../../../db/prisma';

/**
 * Persistence for the instrument COVERAGE policy (which instruments are actively
 * tracked = price-synced + fed downstream). Region-agnostic; the curation service
 * uses it to (a) rank a region's instruments by liquidity, (b) persist the tracked
 * set into `instrument_coverage`, and (c) derive `Stock.isActive` — the single
 * lever every downstream module already honours, so untracked instruments stop
 * flowing to signals/strategies/scans/SEC without per-query changes.
 *
 * Standalone (own Prisma) rather than wired into the composition facade: coverage
 * is a batch/curation concern, not part of the request-serving repository surface.
 */

/** One ranked instrument with its trailing average daily turnover (close*volume). */
export interface CoverageRankRow {
  stockId: string;
  symbol: string;
  assetType: string | null;
  turnover: number;
}

/** A catalogue instrument considered for curation (rank pool + pin candidates). */
export interface CoverageInstrumentRow {
  stockId: string;
  symbol: string;
  assetType: string | null;
  catalogSource: string | null;
}

/** A row to persist as TRACKED in instrument_coverage. */
export interface TrackedCoverageEntry {
  stockId: string;
  symbol: string;
  trackingTier: 'CORE' | 'STANDARD';
  reason: 'INDEX' | 'ETF' | 'LIQUIDITY' | 'MANUAL';
  liquidityScore?: number | null;
  liquidityRank?: number | null;
}

export class CoverageRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  /**
   * Rank a region's instruments by trailing average daily turnover (close*volume)
   * over the most recent `lookbackBars` stored candles per symbol. Symbols with no
   * recent candles are excluded (they cannot be top-liquidity). TEST_ sources are
   * ignored. Ordered most-liquid first.
   */
  async rankRegionLiquidity(
    region: string,
    options: { lookbackBars?: number; assetTypes?: string[] } = {},
  ): Promise<CoverageRankRow[]> {
    const lookbackBars = Math.max(5, Math.min(options.lookbackBars ?? 90, 500));
    const assetTypes = options.assetTypes ?? ['STOCK', 'ETF'];
    return this.prisma.$queryRaw<CoverageRankRow[]>(Prisma.sql`
      SELECT s.id AS "stockId", s.symbol, s."assetType",
             COALESCE(AVG(recent.turnover), 0)::double precision AS turnover
      FROM stocks s
      JOIN LATERAL (
        SELECT (COALESCE(pt."adjustedClose", pt.close) * COALESCE(pt.volume, 0))::double precision AS turnover
        FROM price_ticks pt
        WHERE pt.symbol = s.symbol
          AND pt.timestamp >= NOW() - INTERVAL '200 days'
          AND UPPER(COALESCE(pt.source, '')) NOT LIKE 'TEST\\_%'
        ORDER BY pt.timestamp DESC
        LIMIT ${lookbackBars}
      ) recent ON TRUE
      WHERE s.region = ${region}
        AND s."isDelisted" = false
        AND s."assetType" IN (${Prisma.join(assetTypes)})
      GROUP BY s.id, s.symbol, s."assetType"
      ORDER BY turnover DESC
    `);
  }

  /** All non-delisted catalogue instruments for a region (rank pool + pin source). */
  async listRegionInstruments(
    region: string,
    assetTypes: string[] = ['STOCK', 'ETF', 'INDEX'],
  ): Promise<CoverageInstrumentRow[]> {
    const rows = await this.prisma.stock.findMany({
      where: { region, isDelisted: false, assetType: { in: assetTypes } },
      select: { id: true, symbol: true, assetType: true, catalogSource: true },
    });
    return rows.map((r) => ({ stockId: r.id, symbol: r.symbol, assetType: r.assetType, catalogSource: r.catalogSource }));
  }

  /**
   * Replace the region's tracked-coverage set transactionally (full re-rank is
   * idempotent: delete-then-insert). Only TRACKED instruments are persisted; an
   * absent row means "not tracked".
   */
  async replaceTrackedCoverage(region: string, entries: TrackedCoverageEntry[], rankedAt: Date): Promise<number> {
    const data = entries.map((e) => ({
      stockId: e.stockId,
      symbol: e.symbol,
      region,
      isTracked: true,
      trackingTier: e.trackingTier,
      reason: e.reason,
      liquidityScore: e.liquidityScore == null ? null : new Prisma.Decimal(e.liquidityScore),
      liquidityRank: e.liquidityRank ?? null,
      rankedAt,
    }));
    await this.prisma.$transaction([
      this.prisma.instrumentCoverage.deleteMany({ where: { region } }),
      ...(data.length ? [this.prisma.instrumentCoverage.createMany({ data })] : []),
    ]);
    return data.length;
  }

  /**
   * Derive `Stock.isActive` from coverage for a curated region: tracked → active,
   * EVERY other instrument in the region → inactive (excluded from ingestion + all
   * downstream). Deactivation is NOT filtered by assetType — the tracked set already
   * contains every instrument we keep (incl. all pinned indices/ETFs), so anything
   * not in `trackedStockIds` is out of scope, including rows with a NULL/blank
   * assetType (which an assetType-IN filter would silently miss). The two updates
   * run in one transaction so isActive never reflects a half-applied set.
   * Returns {activated, deactivated}.
   */
  async applyActiveEnforcement(
    region: string,
    trackedStockIds: string[],
  ): Promise<{ activated: number; deactivated: number }> {
    const [activatedRes, deactivatedRes] = await this.prisma.$transaction([
      this.prisma.stock.updateMany({
        where: { id: { in: trackedStockIds }, isActive: false },
        data: { isActive: true },
      }),
      this.prisma.stock.updateMany({
        where: {
          region,
          isActive: true,
          ...(trackedStockIds.length ? { id: { notIn: trackedStockIds } } : {}),
        },
        data: { isActive: false },
      }),
    ]);
    return { activated: activatedRes.count, deactivated: deactivatedRes.count };
  }

  /** Count of tracked instruments for a region. */
  countTracked(region: string): Promise<number> {
    return this.prisma.instrumentCoverage.count({ where: { region, isTracked: true } });
  }

  /** Tracked symbols for a region (for freshness/observability reads). */
  async listTrackedSymbols(region: string): Promise<string[]> {
    const rows = await this.prisma.instrumentCoverage.findMany({
      where: { region, isTracked: true },
      select: { symbol: true },
    });
    return rows.map((r) => r.symbol);
  }

  /**
   * Freshness of the tracked set for a region: how many tracked symbols carry a
   * candle on the freshest date observed across the set. Returns null when the
   * region has no tracked coverage (e.g. uncurated regions). Uses latest_prices
   * for an O(tracked) lookup rather than scanning price_ticks.
   */
  async trackedCoverageStats(region: string): Promise<{
    trackedTotal: number;
    currentToLatest: number;
    latestDate: string | null;
    coveragePct: number;
  } | null> {
    const rows = await this.prisma.$queryRaw<Array<{ tracked_total: bigint; current_to_latest: bigint; latest_date: Date | null }>>(Prisma.sql`
      WITH tracked AS (
        SELECT ic.symbol, lp.timestamp::date AS d
        FROM instrument_coverage ic
        LEFT JOIN latest_prices lp ON lp.symbol = ic.symbol
        WHERE ic.region = ${region} AND ic."isTracked" = true
      )
      SELECT COUNT(*) AS tracked_total,
             MAX(d) AS latest_date,
             COUNT(*) FILTER (WHERE d = (SELECT MAX(d) FROM tracked)) AS current_to_latest
      FROM tracked
    `);
    const row = rows[0];
    const trackedTotal = Number(row?.tracked_total ?? 0);
    if (trackedTotal === 0) return null;
    const currentToLatest = Number(row?.current_to_latest ?? 0);
    const latest = row?.latest_date ? new Date(row.latest_date) : null;
    return {
      trackedTotal,
      currentToLatest,
      latestDate: latest ? latest.toISOString().slice(0, 10) : null,
      coveragePct: trackedTotal > 0 ? Math.round((currentToLatest / trackedTotal) * 1000) / 10 : 0,
    };
  }
}
