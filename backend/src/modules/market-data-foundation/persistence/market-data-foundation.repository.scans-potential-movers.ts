import { Prisma, PrismaClient } from '@prisma/client';
import type { PaginationOptions } from '../market-data-foundation.types';
import { MARKET_MOVER_MIN_PRICE } from './market-data-foundation.repository.constants';
import { scopedStockSqlWhere } from './market-data-foundation.repository.query-scope';

export class PotentialMoversRepository {
  constructor(readonly prisma: PrismaClient) {}

  /**
   * Potential-movers scan.
   * Detects the pre-circuit quiet-accumulation fingerprint: 3 consecutive rising closes,
   * price above SMA20, minimum average-volume floor. Sorted by latest daily change %.
   * Uses split-adjusted close (COALESCE adjustedClose, close) so ex-split artifacts
   * don't fabricate or destroy the 3-day rising pattern.
   */
  async scanPotentialMovers(
    options: Pick<PaginationOptions, 'region' | 'assetType'> & {
      minAvgVolume?: number;
      minDailyChangePct?: number;
      limit?: number;
    },
  ): Promise<Array<{
    instrumentId: string;
    symbol: string;
    companyName: string;
    sector: string | null;
    latestDate: Date;
    latestClose: Prisma.Decimal | number;
    dailyChangePct: Prisma.Decimal | number;
    move3dPct: Prisma.Decimal | number;
    avgVolume20: Prisma.Decimal | number;
    sma20: Prisma.Decimal | number;
    signalDirection: string | null;
    signalScore: number | null;
  }>> {
    const rowLimit = Math.max(1, Math.min(options.limit ?? 50, 100));
    const minAvgVolume = Math.max(100, options.minAvgVolume ?? 5000);
    const minDailyChangePct = Math.max(0, options.minDailyChangePct ?? 1.0);

    return this.prisma.$queryRaw<Array<{
      instrumentId: string;
      symbol: string;
      companyName: string;
      sector: string | null;
      latestDate: Date;
      latestClose: Prisma.Decimal | number;
      dailyChangePct: Prisma.Decimal | number;
      move3dPct: Prisma.Decimal | number;
      avgVolume20: Prisma.Decimal | number;
      sma20: Prisma.Decimal | number;
      signalDirection: string | null;
      signalScore: number | null;
    }>>(Prisma.sql`
      WITH scoped_stocks AS (
        SELECT stocks.id, stocks.symbol, stocks.name, stocks.sector,
               stocks."sourceSymbol", stocks."providerSymbol"
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
          sr.score     AS "signalScore"
        FROM signal_results sr
        WHERE sr."generatedDate" IS NOT NULL
        ORDER BY sr."instrumentId", sr."generatedDate" DESC
      ),
      recent_bars AS (
        SELECT
          s.id                                                                       AS "instrumentId",
          s.symbol, s.name AS "companyName", s.sector,
          COALESCE(pt."adjustedClose", pt.close)                                    AS close,
          pt.timestamp,
          ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY pt.timestamp DESC)          AS rn
        FROM scoped_stocks s
        CROSS JOIN LATERAL (
          SELECT regexp_replace(
            COALESCE(NULLIF(s."sourceSymbol",''), NULLIF(s.symbol,''), NULLIF(s."providerSymbol",'')),
            '\\.(NS|BO)$', '', 'i'
          ) AS price_symbol
        ) pid
        INNER JOIN price_ticks pt ON pt.symbol = pid.price_symbol
          AND pt.timestamp >= CURRENT_DATE - INTERVAL '15 days'
          AND UPPER(COALESCE(pt."dataStatus", 'COMPLETE')) = 'COMPLETE'
          AND UPPER(COALESCE(pt.source, '')) NOT LIKE 'TEST\\_%'
          AND COALESCE(pt."adjustedClose", pt.close) >= ${MARKET_MOVER_MIN_PRICE}
      ),
      price_trend AS (
        SELECT
          "instrumentId", symbol, "companyName", sector,
          MAX(CASE WHEN rn = 1 THEN close     END) AS close_t0,
          MAX(CASE WHEN rn = 2 THEN close     END) AS close_t1,
          MAX(CASE WHEN rn = 3 THEN close     END) AS close_t2,
          MAX(CASE WHEN rn = 1 THEN timestamp END) AS latest_date
        FROM recent_bars
        WHERE rn <= 4
        GROUP BY "instrumentId", symbol, "companyName", sector
        HAVING COUNT(*) >= 3
      ),
      sma20 AS (
        SELECT
          s.id                                                    AS "instrumentId",
          AVG(COALESCE(pt."adjustedClose", pt.close)::numeric)   AS sma20_val,
          AVG(pt.volume::numeric)                                 AS avg_volume_20
        FROM scoped_stocks s
        CROSS JOIN LATERAL (
          SELECT regexp_replace(
            COALESCE(NULLIF(s."sourceSymbol",''), NULLIF(s.symbol,''), NULLIF(s."providerSymbol",'')),
            '\\.(NS|BO)$', '', 'i'
          ) AS price_symbol
        ) pid
        INNER JOIN price_ticks pt ON pt.symbol = pid.price_symbol
          AND pt.timestamp >= CURRENT_DATE - INTERVAL '30 days'
          AND UPPER(COALESCE(pt."dataStatus", 'COMPLETE')) = 'COMPLETE'
          AND UPPER(COALESCE(pt.source, '')) NOT LIKE 'TEST\\_%'
          AND pt.volume > 0
        GROUP BY s.id
        HAVING COUNT(*) >= 15
      )
      SELECT
        pt."instrumentId",
        pt.symbol,
        pt."companyName",
        pt.sector,
        pt.latest_date                                                       AS "latestDate",
        pt.close_t0                                                          AS "latestClose",
        ROUND(((pt.close_t0 - pt.close_t1) / NULLIF(pt.close_t1, 0) * 100)::numeric, 2) AS "dailyChangePct",
        ROUND(((pt.close_t0 - pt.close_t2) / NULLIF(pt.close_t2, 0) * 100)::numeric, 2) AS "move3dPct",
        ROUND(sm.avg_volume_20::numeric, 0)                                  AS "avgVolume20",
        ROUND(sm.sma20_val::numeric, 2)                                      AS sma20,
        ls."signalDirection",
        ls."signalScore"
      FROM price_trend pt
      INNER JOIN sma20 sm ON sm."instrumentId" = pt."instrumentId"
      LEFT JOIN latest_signal ls ON ls."instrumentId" = pt."instrumentId"
      WHERE pt.close_t0 > pt.close_t1
        AND pt.close_t1 > pt.close_t2
        AND pt.close_t0 > sm.sma20_val
        AND sm.avg_volume_20 >= ${minAvgVolume}
        AND pt.close_t1 > 0
        AND ROUND(((pt.close_t0 - pt.close_t1) / NULLIF(pt.close_t1, 0) * 100)::numeric, 2) >= ${minDailyChangePct}
      ORDER BY ((pt.close_t0 - pt.close_t1) / NULLIF(pt.close_t1, 0)) DESC
      LIMIT ${rowLimit}
    `);
  }
}
