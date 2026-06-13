import { Prisma, PrismaClient } from '@prisma/client';
import type { PaginationOptions } from '../market-data-foundation.types';
import { MARKET_MOVER_MIN_PRICE } from './market-data-foundation.repository.constants';
import { scopedStockSqlWhere } from './market-data-foundation.repository.query-scope';

export class ScanQueryRepository {
  constructor(private readonly prisma: PrismaClient) {}



  // ---------------------------------------------------------------------------
  // Market Scans: 52-week proximity, delivery-spike, volume-spike
  // ---------------------------------------------------------------------------

  /**
   * 52-week high/low proximity scan.
   * Returns up to `limit` stocks closest to their 52-week adjusted-close high/low.
   * Entirely persisted-read; no generation on GET.
   */
  async scan52wProximity(
    options: Pick<PaginationOptions, 'region' | 'assetType'> & {
      scanType: '52w-high' | '52w-low';
      proximityPct?: number;
      limit?: number;
    },
  ): Promise<Array<{
    instrumentId: string;
    symbol: string;
    companyName: string;
    sector: string | null;
    latestDate: Date;
    currentPrice: Prisma.Decimal | number;
    high52w: Prisma.Decimal | number;
    low52w: Prisma.Decimal | number;
    pctFromHigh: Prisma.Decimal | number;
    pctFromLow: Prisma.Decimal | number;
    priceBasis: string;
    signalDirection: string | null;
    signalScore: number | null;
  }>> {
    const rowLimit = Math.max(1, Math.min(options.limit ?? 30, 100));
    const proximityPct = Math.max(0.5, Math.min(options.proximityPct ?? 10, 50));
    const scanType = options.scanType;
    // 252 trading days ≈ 1 year; use 365 calendar days to be safe
    const lookbackDays = 365;
    const rows = await this.prisma.$queryRaw<Array<{
      instrumentId: string;
      symbol: string;
      companyName: string;
      sector: string | null;
      latestDate: Date;
      currentPrice: Prisma.Decimal | number;
      high52w: Prisma.Decimal | number;
      low52w: Prisma.Decimal | number;
      pctFromHigh: Prisma.Decimal | number;
      pctFromLow: Prisma.Decimal | number;
      priceBasis: string;
      signalDirection: string | null;
      signalScore: number | null;
    }>>(Prisma.sql`
      WITH scoped_stocks AS (
        SELECT stocks.*
        FROM stocks
        WHERE ${scopedStockSqlWhere(options)}
          AND stocks."isActive" = TRUE
          AND stocks."isDelisted" = FALSE
          AND UPPER(COALESCE(stocks."providerSupportStatus", 'UNSUPPORTED')) = 'SUPPORTED'
      ),
      latest_signal AS (
        SELECT DISTINCT ON (sr."instrumentId")
          sr."instrumentId",
          sr.direction AS "signalDirection",
          sr.score AS "signalScore"
        FROM signal_results sr
        WHERE sr."generatedDate" IS NOT NULL
        ORDER BY sr."instrumentId", sr."generatedDate" DESC
      ),
      price_range AS (
        SELECT
          s.id AS "instrumentId",
          s.symbol,
          s.name AS "companyName",
          s.sector,
          latest_p.timestamp AS "latestDate",
          COALESCE(latest_p."adjustedClose", latest_p.close) AS "currentPrice",
          CASE WHEN latest_p."adjustedClose" IS NOT NULL THEN 'ADJUSTED_CLOSE' ELSE 'CLOSE_FALLBACK' END AS "priceBasis",
          MAX(COALESCE(pt."adjustedClose", pt.close)) OVER w AS "high52w",
          MIN(COALESCE(pt."adjustedClose", pt.close)) OVER w AS "low52w"
        FROM scoped_stocks s
        CROSS JOIN LATERAL (
          SELECT regexp_replace(
            COALESCE(NULLIF(s."sourceSymbol", ''), NULLIF(s.symbol, ''), NULLIF(s."providerSymbol", '')),
            '\\.(NS|BO)$', '', 'i'
          ) AS price_symbol
        ) pid
        INNER JOIN LATERAL (
          SELECT pt2.timestamp, pt2."adjustedClose", pt2.close
          FROM price_ticks pt2
          WHERE pt2.symbol = pid.price_symbol
            AND UPPER(COALESCE(pt2."dataStatus", 'COMPLETE')) = 'COMPLETE'
            AND UPPER(COALESCE(pt2.source, '')) NOT LIKE 'TEST\\_%'
            AND COALESCE(pt2."adjustedClose", pt2.close) >= ${MARKET_MOVER_MIN_PRICE}
          ORDER BY pt2.timestamp DESC
          LIMIT 1
        ) latest_p ON TRUE
        INNER JOIN price_ticks pt ON pt.symbol = pid.price_symbol
          AND pt.timestamp >= latest_p.timestamp - (${lookbackDays} * INTERVAL '1 day')
          AND pt.timestamp < latest_p.timestamp
          AND UPPER(COALESCE(pt."dataStatus", 'COMPLETE')) = 'COMPLETE'
          AND UPPER(COALESCE(pt.source, '')) NOT LIKE 'TEST\\_%'
          AND COALESCE(pt."adjustedClose", pt.close) >= ${MARKET_MOVER_MIN_PRICE}
        WINDOW w AS (PARTITION BY s.id)
      ),
      deduped AS (
        SELECT DISTINCT ON ("instrumentId")
          "instrumentId", symbol, "companyName", sector, "latestDate", "currentPrice",
          "high52w", "low52w", "priceBasis",
          (("currentPrice" - "high52w") / NULLIF("high52w", 0) * 100) AS "pctFromHigh",
          (("currentPrice" - "low52w")  / NULLIF("low52w",  0) * 100) AS "pctFromLow"
        FROM price_range
        ORDER BY "instrumentId"
      )
      SELECT
        d.*,
        ls."signalDirection",
        ls."signalScore"
      FROM deduped d
      LEFT JOIN latest_signal ls ON ls."instrumentId" = d."instrumentId"
      WHERE d."high52w" IS NOT NULL AND d."low52w" IS NOT NULL
        AND ${scanType === '52w-high'
          ? Prisma.sql`d."pctFromHigh" >= ${-(proximityPct)} AND d."pctFromHigh" <= 0`
          : Prisma.sql`d."pctFromLow" >= 0 AND d."pctFromLow" <= ${proximityPct}`}
      ORDER BY ${scanType === '52w-high'
        ? Prisma.sql`d."pctFromHigh" DESC`
        : Prisma.sql`d."pctFromLow" ASC`}
      LIMIT ${rowLimit}
    `);
    return rows;
  }



  /**
   * Delivery-spike scan.
   * Stocks whose latest delivery% is materially above their recent rolling average.
   * Persisted-read from market_delivery_snapshots only.
   */
  async scanDeliverySpike(
    options: Pick<PaginationOptions, 'region' | 'assetType'> & {
      lookbackBars?: number;
      minSpikeRatio?: number;
      limit?: number;
    },
  ): Promise<Array<{
    instrumentId: string;
    symbol: string;
    companyName: string;
    sector: string | null;
    tradingDate: Date;
    deliveryPct: Prisma.Decimal | number;
    avgDeliveryPct: Prisma.Decimal | number;
    spikeRatio: Prisma.Decimal | number;
    lookbackBars: number;
    signalDirection: string | null;
    signalScore: number | null;
  }>> {
    const rowLimit = Math.max(1, Math.min(options.limit ?? 30, 100));
    const lookbackBars = Math.max(5, Math.min(options.lookbackBars ?? 20, 60));
    const minSpikeRatio = Math.max(1.1, Math.min(options.minSpikeRatio ?? 1.5, 10));

    const rows = await this.prisma.$queryRaw<Array<{
      instrumentId: string;
      symbol: string;
      companyName: string;
      sector: string | null;
      tradingDate: Date;
      deliveryPct: Prisma.Decimal | number;
      avgDeliveryPct: Prisma.Decimal | number;
      spikeRatio: Prisma.Decimal | number;
      lookbackBars: number;
      signalDirection: string | null;
      signalScore: number | null;
    }>>(Prisma.sql`
      WITH scoped_stocks AS (
        SELECT stocks.id, stocks.symbol, stocks.name, stocks.sector
        FROM stocks
        WHERE ${scopedStockSqlWhere(options)}
          AND stocks."isActive" = TRUE
          AND stocks."isDelisted" = FALSE
          AND UPPER(COALESCE(stocks."providerSupportStatus", 'UNSUPPORTED')) = 'SUPPORTED'
      ),
      latest_signal AS (
        SELECT DISTINCT ON (sr."instrumentId")
          sr."instrumentId",
          sr.direction AS "signalDirection",
          sr.score AS "signalScore"
        FROM signal_results sr
        WHERE sr."generatedDate" IS NOT NULL
        ORDER BY sr."instrumentId", sr."generatedDate" DESC
      ),
      latest_delivery AS (
        SELECT DISTINCT ON (d.symbol)
          d.symbol,
          d."tradingDate",
          d."deliveryPercent" AS "deliveryPct"
        FROM market_delivery_snapshots d
        INNER JOIN scoped_stocks s ON s.symbol = d.symbol
        WHERE d."deliveryPercent" IS NOT NULL
          AND d."deliveryPercent" > 0
        ORDER BY d.symbol, d."tradingDate" DESC
      ),
      history AS (
        SELECT
          d.symbol,
          AVG(d."deliveryPercent") AS "avgDeliveryPct",
          COUNT(*)::int AS bars
        FROM market_delivery_snapshots d
        INNER JOIN latest_delivery ld ON ld.symbol = d.symbol
        WHERE d."deliveryPercent" IS NOT NULL
          AND d."deliveryPercent" > 0
          AND d."tradingDate" < ld."tradingDate"
          AND d."tradingDate" >= ld."tradingDate" - (${lookbackBars} * INTERVAL '1 day')
        GROUP BY d.symbol
      )
      SELECT
        s.id AS "instrumentId",
        s.symbol,
        s.name AS "companyName",
        s.sector,
        ld."tradingDate",
        ld."deliveryPct",
        h."avgDeliveryPct",
        (ld."deliveryPct" / NULLIF(h."avgDeliveryPct", 0)) AS "spikeRatio",
        h.bars AS "lookbackBars",
        ls."signalDirection",
        ls."signalScore"
      FROM scoped_stocks s
      INNER JOIN latest_delivery ld ON ld.symbol = s.symbol
      INNER JOIN history h ON h.symbol = s.symbol
      LEFT JOIN latest_signal ls ON ls."instrumentId" = s.id
      WHERE h."avgDeliveryPct" > 0
        AND (ld."deliveryPct" / NULLIF(h."avgDeliveryPct", 0)) >= ${minSpikeRatio}
        AND h.bars >= 3
      ORDER BY (ld."deliveryPct" / NULLIF(h."avgDeliveryPct", 0)) DESC
      LIMIT ${rowLimit}
    `);
    return rows;
  }



  /**
   * Volume-spike scan.
   * Stocks with latest volume materially above their N-day average volume.
   * Persisted-read from price_ticks only.
   */
  async scanVolumeSpike(
    options: Pick<PaginationOptions, 'region' | 'assetType'> & {
      lookbackBars?: number;
      minSpikeRatio?: number;
      limit?: number;
    },
  ): Promise<Array<{
    instrumentId: string;
    symbol: string;
    companyName: string;
    sector: string | null;
    latestDate: Date;
    latestVolume: Prisma.Decimal | number | bigint;
    avgVolume: Prisma.Decimal | number;
    spikeRatio: Prisma.Decimal | number;
    lookbackBars: number;
    signalDirection: string | null;
    signalScore: number | null;
  }>> {
    const rowLimit = Math.max(1, Math.min(options.limit ?? 30, 100));
    const lookbackBars = Math.max(5, Math.min(options.lookbackBars ?? 20, 60));
    const minSpikeRatio = Math.max(1.1, Math.min(options.minSpikeRatio ?? 2.0, 20));

    const rows = await this.prisma.$queryRaw<Array<{
      instrumentId: string;
      symbol: string;
      companyName: string;
      sector: string | null;
      latestDate: Date;
      latestVolume: Prisma.Decimal | number | bigint;
      avgVolume: Prisma.Decimal | number;
      spikeRatio: Prisma.Decimal | number;
      lookbackBars: number;
      signalDirection: string | null;
      signalScore: number | null;
    }>>(Prisma.sql`
      WITH scoped_stocks AS (
        SELECT stocks.id, stocks.symbol, stocks.name, stocks.sector, stocks."sourceSymbol", stocks."providerSymbol"
        FROM stocks
        WHERE ${scopedStockSqlWhere(options)}
          AND stocks."isActive" = TRUE
          AND stocks."isDelisted" = FALSE
          AND UPPER(COALESCE(stocks."providerSupportStatus", 'UNSUPPORTED')) = 'SUPPORTED'
      ),
      latest_signal AS (
        SELECT DISTINCT ON (sr."instrumentId")
          sr."instrumentId",
          sr.direction AS "signalDirection",
          sr.score AS "signalScore"
        FROM signal_results sr
        WHERE sr."generatedDate" IS NOT NULL
        ORDER BY sr."instrumentId", sr."generatedDate" DESC
      ),
      latest_bar AS (
        SELECT DISTINCT ON (s.id)
          s.id AS "instrumentId",
          s.symbol,
          s.name AS "companyName",
          s.sector,
          pt.timestamp AS "latestDate",
          pt.volume AS "latestVolume",
          pid.price_symbol
        FROM scoped_stocks s
        CROSS JOIN LATERAL (
          SELECT regexp_replace(
            COALESCE(NULLIF(s."sourceSymbol",''), NULLIF(s.symbol,''), NULLIF(s."providerSymbol",'')),
            '\\.(NS|BO)$', '', 'i'
          ) AS price_symbol
        ) pid
        INNER JOIN price_ticks pt ON pt.symbol = pid.price_symbol
          AND UPPER(COALESCE(pt."dataStatus", 'COMPLETE')) = 'COMPLETE'
          AND UPPER(COALESCE(pt.source, '')) NOT LIKE 'TEST\\_%'
          AND pt.volume IS NOT NULL
          AND pt.volume > 0
          AND COALESCE(pt."adjustedClose", pt.close) >= ${MARKET_MOVER_MIN_PRICE}
        ORDER BY s.id, pt.timestamp DESC
      ),
      avg_vol AS (
        SELECT
          lb."instrumentId",
          AVG(pt.volume::numeric) AS "avgVolume",
          COUNT(*)::int AS bars
        FROM latest_bar lb
        INNER JOIN price_ticks pt ON pt.symbol = lb.price_symbol
          AND pt.timestamp >= lb."latestDate" - (${lookbackBars} * INTERVAL '1 day')
          AND pt.timestamp < lb."latestDate"
          AND UPPER(COALESCE(pt."dataStatus", 'COMPLETE')) = 'COMPLETE'
          AND UPPER(COALESCE(pt.source, '')) NOT LIKE 'TEST\\_%'
          AND pt.volume > 0
        GROUP BY lb."instrumentId"
      )
      SELECT
        lb."instrumentId",
        lb.symbol,
        lb."companyName",
        lb.sector,
        lb."latestDate",
        lb."latestVolume",
        av."avgVolume",
        (lb."latestVolume"::numeric / NULLIF(av."avgVolume", 0)) AS "spikeRatio",
        av.bars AS "lookbackBars",
        ls."signalDirection",
        ls."signalScore"
      FROM latest_bar lb
      INNER JOIN avg_vol av ON av."instrumentId" = lb."instrumentId"
      LEFT JOIN latest_signal ls ON ls."instrumentId" = lb."instrumentId"
      WHERE av."avgVolume" > 0
        AND av.bars >= 3
        AND (lb."latestVolume"::numeric / NULLIF(av."avgVolume", 0)) >= ${minSpikeRatio}
      ORDER BY (lb."latestVolume"::numeric / NULLIF(av."avgVolume", 0)) DESC
      LIMIT ${rowLimit}
    `);
    return rows;
  }



  /**
   * Fetch a batch of price rows for the given symbols using raw SQL so that the
   * `volume` column is returned as a float8 (JavaScript `number`) rather than
   * a JavaScript `BigInt`.
   *
   * Background: the Prisma schema declares `volume BigInt?`.  Prisma 6 returns
   * `BigInt` native JS values for that column.  When any row in the result set
   * carries a volume value that exceeds the safe-integer range (e.g. IDEA at
   * 8.4 B or GTLINFRA at 6.1 B) the Rust NAPI bridge throws
   * "Failed to convert rust String into napi string" and the entire `findMany`
   * call crashes — even for the other ~100 symbols in the same batch that have
   * perfectly normal volumes.  Using `CAST(volume AS float8)` at the SQL layer
   * means Prisma never sees a BigInt in the result, avoiding the crash.
   *
   * The caller is responsible for chunking `symbols` to a safe size (≤ 50) to
   * keep per-query result sets manageable and avoid pool exhaustion.
   */
  async listPriceWindowsForSymbolChunk(
    symbols: string[],
    cutoff: Date,
    endDate: Date | null
  ): Promise<Array<{
    symbol: string;
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    adjustedClose: number | null;
    volume: number | null;
    source: string | null;
    ingestionTimestamp: Date;
    lastUpdatedTimestamp: Date;
    dataStatus: string;
  }>> {
    if (symbols.length === 0) return [];
    // Prisma.join builds a safe parameterised IN list
    const endFilter = endDate
      ? Prisma.sql`AND pt."timestamp" <= ${endDate}`
      : Prisma.sql``;
    return this.prisma.$queryRaw<Array<{
      symbol: string;
      timestamp: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      adjustedClose: number | null;
      volume: number | null;
      source: string | null;
      ingestionTimestamp: Date;
      lastUpdatedTimestamp: Date;
      dataStatus: string;
    }>>(Prisma.sql`
      SELECT
        pt.symbol,
        pt."timestamp",
        pt.open::float8                AS open,
        pt.high::float8                AS high,
        pt.low::float8                 AS low,
        pt.close::float8               AS close,
        pt."adjustedClose"::float8     AS "adjustedClose",
        CAST(pt.volume AS float8)      AS volume,
        pt.source,
        pt."ingestionTimestamp"        AS "ingestionTimestamp",
        pt."lastUpdatedTimestamp"      AS "lastUpdatedTimestamp",
        COALESCE(pt."dataStatus", 'COMPLETE') AS "dataStatus"
      FROM price_ticks pt
      WHERE pt.symbol IN (${Prisma.join(symbols)})
        AND pt."timestamp" >= ${cutoff}
        ${endFilter}
      ORDER BY pt.symbol ASC, pt."timestamp" DESC
    `);
  }
}
