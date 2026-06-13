import { Prisma, PrismaClient } from '@prisma/client';
import type { MarketMoverRow, PaginationOptions } from '../market-data-foundation.types';
import { MARKET_MOVER_BASE_WINDOW_DAYS, MARKET_MOVER_MIN_PRICE, MARKET_MOVER_MIN_RECENT_TURNOVER } from './market-data-foundation.repository.constants';
import { scopedStockSqlWhere } from './market-data-foundation.repository.query-scope';
import { toNumber } from './market-data-foundation.repository.helpers';

export class MarketMoverRepository {
  constructor(private readonly prisma: PrismaClient) {}



  async marketMoversForRange(
    lookbackDays: number,
    options: Pick<PaginationOptions, 'region' | 'assetType'> & { limit?: number; minHistoryBars?: number; maxAbsReturn?: number; recentBars?: number; latestDateStart?: Date | null; latestDateEnd?: Date | null } = {},
  ): Promise<MarketMoverRow[]> {
    const rowLimit = Math.max(1, Math.min(options.limit ?? 25, 100));
    const minHistoryBars = Math.max(2, Math.min(options.minHistoryBars ?? 20, 260));
    const maxAbsReturn = Math.max(0.1, Math.min(options.maxAbsReturn ?? 1000, 1000));
    const recentBars = Math.max(2, Math.min(options.recentBars ?? 20, minHistoryBars));
    const latestFreshnessFilter = options.latestDateStart && options.latestDateEnd
      ? Prisma.sql`AND latest_prices.timestamp >= ${options.latestDateStart} AND latest_prices.timestamp < ${options.latestDateEnd}`
      : Prisma.sql``;
    const rows = await this.prisma.$queryRaw<Array<{
      instrumentId: string;
      symbol: string;
      companyName: string;
      sector: string | null;
      latestDate: Date;
      latestClose: Prisma.Decimal | number | string;
      baseDate: Date;
      baseClose: Prisma.Decimal | number | string;
      returnPercent: Prisma.Decimal | number | string;
      priceBasis: string;
      latestSource: string | null;
      baseSource: string | null;
      actualLookbackDays: Prisma.Decimal | number | string;
      historyBarsInWindow: number;
      averageRecentTurnover: Prisma.Decimal | number | string | null;
    }>>(Prisma.sql`
      WITH scoped_stocks AS (
        SELECT stocks.*
        FROM stocks
        WHERE ${scopedStockSqlWhere(options)}
          AND stocks."isActive" = TRUE
          AND stocks."isDelisted" = FALSE
          AND UPPER(COALESCE(stocks."providerSupportStatus", 'UNSUPPORTED')) = 'SUPPORTED'
      ),
      eligible AS (
        SELECT
          stocks.id AS "instrumentId",
          stocks.symbol,
          stocks.name AS "companyName",
          stocks.sector,
          latest_prices.timestamp AS "latestDate",
          latest_prices.price AS "latestClose",
          base_prices.timestamp AS "baseDate",
          base_prices.price AS "baseClose",
          ((latest_prices.price - base_prices.price) / base_prices.price) AS "returnPercent",
          CASE WHEN latest_prices.has_adjusted THEN 'ADJUSTED_CLOSE' ELSE 'CLOSE_FALLBACK' END AS "priceBasis",
          latest_prices.source AS "latestSource",
          base_prices.source AS "baseSource",
          EXTRACT(EPOCH FROM (latest_prices.timestamp - base_prices.timestamp)) / 86400.0 AS "actualLookbackDays",
          recent_liquidity.recent_bars AS "historyBarsInWindow",
          recent_liquidity.average_turnover AS "averageRecentTurnover"
        FROM scoped_stocks stocks
        CROSS JOIN LATERAL (
          SELECT regexp_replace(
            COALESCE(NULLIF(stocks."sourceSymbol", ''), NULLIF(stocks.symbol, ''), NULLIF(stocks."providerSymbol", '')),
            '\\.(NS|BO)$',
            '',
            'i'
          ) AS price_symbol
        ) price_identity
        INNER JOIN LATERAL (
          SELECT
            price_ticks.timestamp,
            COALESCE(price_ticks."adjustedClose", price_ticks.close) AS price,
            price_ticks."adjustedClose" IS NOT NULL AS has_adjusted,
            price_ticks.source,
            CASE
              WHEN LOWER(COALESCE(price_ticks.source, 'unknown')) = 'yahoo' THEN 'yahoo'
              WHEN LOWER(COALESCE(price_ticks.source, 'unknown')) = 'angel_one' THEN 'angel_one'
              WHEN UPPER(COALESCE(price_ticks.source, 'unknown')) LIKE 'NSE_%BHAV%' THEN 'nse_official'
              WHEN UPPER(COALESCE(price_ticks.source, 'unknown')) LIKE 'NSE_%UDIFF%' THEN 'nse_official'
              ELSE LOWER(COALESCE(price_ticks.source, 'unknown'))
            END AS source_family
          FROM price_ticks
          WHERE price_ticks.symbol = price_identity.price_symbol
            AND UPPER(COALESCE(price_ticks."dataStatus", 'COMPLETE')) = 'COMPLETE'
            AND UPPER(COALESCE(price_ticks.source, '')) NOT LIKE 'TEST\\_%'
            AND COALESCE(price_ticks."adjustedClose", price_ticks.close) >= ${MARKET_MOVER_MIN_PRICE}
          ORDER BY price_ticks.timestamp DESC
          LIMIT 1
        ) latest_prices ON TRUE
        INNER JOIN LATERAL (
          SELECT
            price_ticks.timestamp,
            COALESCE(price_ticks."adjustedClose", price_ticks.close) AS price,
            price_ticks."adjustedClose" IS NOT NULL AS has_adjusted,
            price_ticks.source,
            CASE
              WHEN LOWER(COALESCE(price_ticks.source, 'unknown')) = 'yahoo' THEN 'yahoo'
              WHEN LOWER(COALESCE(price_ticks.source, 'unknown')) = 'angel_one' THEN 'angel_one'
              WHEN UPPER(COALESCE(price_ticks.source, 'unknown')) LIKE 'NSE_%BHAV%' THEN 'nse_official'
              WHEN UPPER(COALESCE(price_ticks.source, 'unknown')) LIKE 'NSE_%UDIFF%' THEN 'nse_official'
              ELSE LOWER(COALESCE(price_ticks.source, 'unknown'))
            END AS source_family
          FROM price_ticks
          WHERE price_ticks.symbol = price_identity.price_symbol
            AND price_ticks.timestamp <= latest_prices.timestamp - (${lookbackDays}::int * INTERVAL '1 day')
            AND price_ticks.timestamp >= latest_prices.timestamp - ((${lookbackDays}::int + ${MARKET_MOVER_BASE_WINDOW_DAYS}::int) * INTERVAL '1 day')
            AND UPPER(COALESCE(price_ticks."dataStatus", 'COMPLETE')) = 'COMPLETE'
            AND UPPER(COALESCE(price_ticks.source, '')) NOT LIKE 'TEST\\_%'
            AND COALESCE(price_ticks."adjustedClose", price_ticks.close) >= ${MARKET_MOVER_MIN_PRICE}
          ORDER BY price_ticks.timestamp DESC
          LIMIT 1
        ) base_prices ON TRUE
        INNER JOIN LATERAL (
          SELECT
            COUNT(*)::int AS recent_bars,
            AVG(COALESCE(recent_rows.volume, 0)::numeric * recent_rows.price) AS average_turnover,
            MIN(COALESCE(recent_rows.volume, 0)) AS min_volume
          FROM (
            SELECT
              price_ticks.volume,
              COALESCE(price_ticks."adjustedClose", price_ticks.close) AS price
            FROM price_ticks
            WHERE price_ticks.symbol = price_identity.price_symbol
              AND price_ticks.timestamp <= latest_prices.timestamp
              AND UPPER(COALESCE(price_ticks."dataStatus", 'COMPLETE')) = 'COMPLETE'
              AND UPPER(COALESCE(price_ticks.source, '')) NOT LIKE 'TEST\\_%'
              AND COALESCE(price_ticks."adjustedClose", price_ticks.close) >= ${MARKET_MOVER_MIN_PRICE}
            ORDER BY price_ticks.timestamp DESC
            LIMIT ${recentBars}
          ) recent_rows
        ) recent_liquidity ON TRUE
        WHERE base_prices.price >= ${MARKET_MOVER_MIN_PRICE}
          AND latest_prices.price >= ${MARKET_MOVER_MIN_PRICE}
          AND price_identity.price_symbol IS NOT NULL
          ${latestFreshnessFilter}
          AND latest_prices.has_adjusted = base_prices.has_adjusted
          AND latest_prices.source_family = base_prices.source_family
          AND recent_liquidity.recent_bars >= ${recentBars}
          AND COALESCE(recent_liquidity.min_volume, 0) > 0
          AND COALESCE(recent_liquidity.average_turnover, 0) >= ${MARKET_MOVER_MIN_RECENT_TURNOVER}
      ),
      ranked AS (
        SELECT
          eligible.*,
          ROW_NUMBER() OVER (ORDER BY eligible."returnPercent" DESC) AS gainer_rank,
          ROW_NUMBER() OVER (ORDER BY eligible."returnPercent" ASC) AS loser_rank
        FROM eligible
        WHERE ABS(eligible."returnPercent") <= ${maxAbsReturn}
          AND eligible."returnPercent" > -0.95
      )
      SELECT
        ranked."instrumentId",
        ranked.symbol,
        ranked."companyName",
        ranked.sector,
        ranked."latestDate",
        ranked."latestClose",
        ranked."baseDate",
        ranked."baseClose",
        ranked."returnPercent",
        ranked."priceBasis",
        ranked."latestSource",
        ranked."baseSource",
        ranked."actualLookbackDays",
        ranked."historyBarsInWindow",
        ranked."averageRecentTurnover"
      FROM ranked
      WHERE ranked.gainer_rank <= ${rowLimit}
        OR ranked.loser_rank <= ${rowLimit}
      ORDER BY ABS(ranked."returnPercent") DESC
    `);

    return rows.map((row) => ({
      instrumentId: row.instrumentId,
      symbol: row.symbol,
      companyName: row.companyName,
      sector: row.sector,
      latestDate: row.latestDate.toISOString(),
      latestClose: toNumber(row.latestClose),
      baseDate: row.baseDate.toISOString(),
      baseClose: toNumber(row.baseClose),
      returnPercent: Number(toNumber(row.returnPercent).toFixed(6)),
      priceBasis: row.priceBasis === 'ADJUSTED_CLOSE' ? 'ADJUSTED_CLOSE' : 'CLOSE_FALLBACK',
      latestSource: row.latestSource,
      baseSource: row.baseSource,
      actualLookbackDays: Number(toNumber(row.actualLookbackDays).toFixed(1)),
      historyBarsInWindow: Number(row.historyBarsInWindow || 0),
      averageRecentTurnover: row.averageRecentTurnover == null ? null : Number(toNumber(row.averageRecentTurnover).toFixed(0)),
    }));
  }
}
