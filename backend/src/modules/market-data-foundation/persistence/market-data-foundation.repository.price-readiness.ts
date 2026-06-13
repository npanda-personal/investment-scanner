import { Prisma, PrismaClient } from '@prisma/client';
import type { TrustedReviewUniversePriceRow } from '../market-data-foundation.types';
import { STANDARD_REVIEW_MIN_BARS, type UniversePriceStats } from '../ingestion/market-data-foundation.universe';
import { EXCHANGE_PRICE_SOURCES } from './market-data-foundation.repository.constants';
import { computeAdjustmentFactor, percent } from './market-data-foundation.repository.helpers';

export class PriceReadinessRepository {
  constructor(private readonly prisma: PrismaClient) {}



  async priceReadinessStatsForSymbols(symbols: string[]): Promise<Map<string, UniversePriceStats>> {
    const uniqueSymbols = [...new Set(symbols.filter(Boolean))];
    const emptyStats: Map<string, UniversePriceStats> = new Map(uniqueSymbols.map((symbol) => [symbol, {
      priceHistoryBars: 0,
      firstPriceDate: null,
      latestPriceDate: null,
      latestVolume: null,
      latestAdjustedClose: null,
      latestClose: null,
      latestSource: null,
      latestSourceFileImportId: null,
      latestSnapshotDate: null,
      approvedExchangePriceRows: 0,
      approvedExchangeLatestPriceDate: null,
      approvedExchangeLatestSource: null,
      approvedExchangeLatestSourceFileImportId: null,
      sourceFileImportPriceRows: 0,
      rollingWindowBars: 0,
      rollingWindowCoveragePercent: 0,
      maxPriceGapDays: null,
      recentVolumeCoveragePercent: 0,
      adjustedCloseCoveragePercent: 0,
      usesAdjustedCloseFallback: true,
    } satisfies UniversePriceStats]));
    if (uniqueSymbols.length === 0) return emptyStats;

    const rows = await this.priceReadinessRowsForSymbols(uniqueSymbols);
    for (const row of rows) {
      const priceHistoryBars = Number(row.priceHistoryBars || 0);
      const rollingWindowBars = Number(row.rollingWindowBars || 0);
      const volumeRows = Number(row.volumeRows || 0);
      const adjustedCloseRows = Number(row.adjustedCloseRows || 0);
      emptyStats.set(row.symbol, {
        priceHistoryBars,
        firstPriceDate: row.firstTimestamp ? row.firstTimestamp.toISOString().slice(0, 10) : null,
        latestPriceDate: row.latestTimestamp ? row.latestTimestamp.toISOString().slice(0, 10) : null,
        latestVolume: row.latestVolume ?? null,
        latestAdjustedClose: row.latestAdjustedClose ?? null,
        latestClose: row.latestClose ?? null,
        latestSource: row.latestSource ?? null,
        latestSourceFileImportId: row.latestSourceFileImportId ?? null,
        latestSnapshotDate: row.latestSnapshotTimestamp ? row.latestSnapshotTimestamp.toISOString().slice(0, 10) : null,
        approvedExchangePriceRows: Number(row.approvedExchangePriceRows || 0),
        approvedExchangeLatestPriceDate: row.approvedExchangeLatestTimestamp ? row.approvedExchangeLatestTimestamp.toISOString().slice(0, 10) : null,
        approvedExchangeLatestSource: row.approvedExchangeLatestSource ?? null,
        approvedExchangeLatestSourceFileImportId: row.approvedExchangeLatestSourceFileImportId ?? null,
        sourceFileImportPriceRows: Number(row.sourceFileImportPriceRows || 0),
        rollingWindowBars,
        rollingWindowCoveragePercent: percent(rollingWindowBars, STANDARD_REVIEW_MIN_BARS),
        maxPriceGapDays: rollingWindowBars > 1 ? Math.round(Number(row.maxPriceGapDays || 0)) : null,
        recentVolumeCoveragePercent: percent(volumeRows, Math.max(rollingWindowBars, 1)),
        adjustedCloseCoveragePercent: percent(adjustedCloseRows, Math.max(rollingWindowBars, 1)),
        usesAdjustedCloseFallback: adjustedCloseRows < rollingWindowBars,
      } as UniversePriceStats & { firstPriceDate: string | null });
    }

    return emptyStats;
  }



  async priceHistoryForSymbols(
    symbols: string[],
    options: { perSymbolLimit?: number } = {}
  ): Promise<Map<string, TrustedReviewUniversePriceRow[]>> {
    const uniqueSymbols = [...new Set(symbols.filter(Boolean))];
    const perSymbolLimit = Math.max(1, Math.min(options.perSymbolLimit ?? 320, 500));
    const rowsBySymbol = new Map<string, TrustedReviewUniversePriceRow[]>(
      uniqueSymbols.map((symbol) => [symbol, []])
    );
    // Bounded to 5 concurrent queries per chunk so we stay well under the Prisma pool limit
    // (connection_limit=10) even when paginating over the full trusted universe.
    const chunkSize = 5;
    for (let index = 0; index < uniqueSymbols.length; index += chunkSize) {
      const chunk = uniqueSymbols.slice(index, index + chunkSize);
      const chunkRows = await Promise.all(chunk.map(async (symbol) => {
        const rows = await this.prisma.priceTick.findMany({
          where: { symbol, source: { not: { startsWith: 'TEST_' } } },
          orderBy: { timestamp: 'desc' },
          take: perSymbolLimit,
          select: {
            timestamp: true,
            open: true,
            high: true,
            low: true,
            close: true,
            adjustedClose: true,
            volume: true,
          },
        });
        return [symbol, rows] as const;
      }));
      for (const [symbol, rows] of chunkRows) {
        rowsBySymbol.set(symbol, rows.reverse().map((row) => {
          const factor = computeAdjustmentFactor(row.close, row.adjustedClose);
          const rawOpen = Number(row.open);
          const rawHigh = Number(row.high);
          const rawLow = Number(row.low);
          const rawVol = row.volume === null || row.volume === undefined ? null : Number(row.volume);
          return {
            date: row.timestamp.toISOString().slice(0, 10),
            open: rawOpen,
            high: rawHigh,
            low: rawLow,
            close: Number(row.close),
            adjustedClose: row.adjustedClose === null || row.adjustedClose === undefined ? null : Number(row.adjustedClose),
            volume: rawVol,
            adjustmentFactor: factor,
            adjustedOpen: Number((rawOpen * factor).toFixed(4)),
            adjustedHigh: Number((rawHigh * factor).toFixed(4)),
            adjustedLow: Number((rawLow * factor).toFixed(4)),
            adjustedVolume: rawVol !== null ? Number((rawVol / factor).toFixed(0)) : null,
          };
        }));
      }
    }
    return rowsBySymbol;
  }



  private async priceReadinessRowsForSymbols(symbols: string[]) {
    return this.prisma.$queryRaw<Array<{
      symbol: string;
      priceHistoryBars: number | bigint;
      firstTimestamp: Date | null;
      latestTimestamp: Date | null;
      latestVolume: bigint | null;
      latestAdjustedClose: Prisma.Decimal | null;
      latestClose: Prisma.Decimal | null;
      latestSource: string | null;
      latestSourceFileImportId: string | null;
      latestSnapshotTimestamp: Date | null;
      approvedExchangePriceRows: number | bigint;
      approvedExchangeLatestTimestamp: Date | null;
      approvedExchangeLatestSource: string | null;
      approvedExchangeLatestSourceFileImportId: string | null;
      sourceFileImportPriceRows: number | bigint;
      rollingWindowBars: number | bigint;
      volumeRows: number | bigint;
      adjustedCloseRows: number | bigint;
      maxPriceGapDays: number | null;
    }>>(Prisma.sql`
      WITH input_symbols(symbol) AS (
        SELECT unnest(ARRAY[${Prisma.join(symbols)}]::text[])
      ),
      history AS (
        SELECT
          input_symbols.symbol,
          history_stats."priceHistoryBars",
          history_stats."firstTimestamp",
          history_stats."approvedExchangePriceRows",
          history_stats."sourceFileImportPriceRows"
        FROM input_symbols
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS "priceHistoryBars",
            MIN(price_ticks.timestamp) AS "firstTimestamp",
            SUM(CASE
              WHEN UPPER(COALESCE(price_ticks.source, '')) IN (${Prisma.join(EXCHANGE_PRICE_SOURCES.map((source) => source.toUpperCase()))})
                OR price_ticks."sourceFileImportId" IS NOT NULL
              THEN 1 ELSE 0
            END)::int AS "approvedExchangePriceRows",
            SUM(CASE WHEN price_ticks."sourceFileImportId" IS NOT NULL THEN 1 ELSE 0 END)::int AS "sourceFileImportPriceRows"
          FROM price_ticks
          WHERE price_ticks.symbol = input_symbols.symbol
            AND UPPER(COALESCE(price_ticks.source, '')) NOT LIKE 'TEST\\_%'
        ) history_stats ON TRUE
      ),
      recent_ranked AS (
        SELECT
          recent.symbol,
          recent.timestamp,
          recent.volume,
          recent."adjustedClose",
          recent.close,
          recent.source,
          recent."sourceFileImportId",
          recent.row_num,
          recent.previous_timestamp
        FROM input_symbols
        CROSS JOIN LATERAL (
          SELECT
            sampled.*,
            ROW_NUMBER() OVER (ORDER BY sampled.timestamp DESC) AS row_num,
            LAG(sampled.timestamp) OVER (ORDER BY sampled.timestamp DESC) AS previous_timestamp
          FROM (
            SELECT
              price_ticks.symbol,
              price_ticks.timestamp,
              price_ticks.volume,
              price_ticks."adjustedClose",
              price_ticks.close,
              price_ticks.source,
              price_ticks."sourceFileImportId"
            FROM price_ticks
            WHERE price_ticks.symbol = input_symbols.symbol
              AND UPPER(COALESCE(price_ticks.source, '')) NOT LIKE 'TEST\\_%'
            ORDER BY price_ticks.timestamp DESC
            LIMIT ${STANDARD_REVIEW_MIN_BARS}
          ) sampled
        ) recent
      ),
      latest AS (
        SELECT
          symbol,
          timestamp AS "latestTimestamp",
          volume AS "latestVolume",
          "adjustedClose" AS "latestAdjustedClose",
          close AS "latestClose",
          source AS "latestSource",
          "sourceFileImportId" AS "latestSourceFileImportId"
        FROM recent_ranked
        WHERE row_num = 1
      ),
      approved_latest AS (
        SELECT
          input_symbols.symbol,
          latest_official.timestamp AS "approvedExchangeLatestTimestamp",
          latest_official.source AS "approvedExchangeLatestSource",
          latest_official."sourceFileImportId" AS "approvedExchangeLatestSourceFileImportId"
        FROM input_symbols
        LEFT JOIN LATERAL (
          SELECT
            price_ticks.timestamp,
            price_ticks.source,
            price_ticks."sourceFileImportId"
          FROM price_ticks
          WHERE price_ticks.symbol = input_symbols.symbol
            AND (
              UPPER(COALESCE(price_ticks.source, '')) IN (${Prisma.join(EXCHANGE_PRICE_SOURCES.map((source) => source.toUpperCase()))})
              OR price_ticks."sourceFileImportId" IS NOT NULL
            )
          ORDER BY price_ticks.timestamp DESC
          LIMIT 1
        ) latest_official ON TRUE
      ),
      latest_snapshot AS (
        SELECT
          input_symbols.symbol,
          latest_prices.timestamp AS "latestSnapshotTimestamp"
        FROM input_symbols
        LEFT JOIN latest_prices ON latest_prices.symbol = input_symbols.symbol
      ),
      quality AS (
        SELECT
          symbol,
          COUNT(*)::int AS "rollingWindowBars",
          SUM(CASE WHEN volume IS NOT NULL AND volume > 0 THEN 1 ELSE 0 END)::int AS "volumeRows",
          SUM(CASE WHEN "adjustedClose" IS NOT NULL THEN 1 ELSE 0 END)::int AS "adjustedCloseRows",
          MAX(CASE
            WHEN previous_timestamp IS NOT NULL THEN ABS(EXTRACT(EPOCH FROM (previous_timestamp - timestamp)) / 86400.0)
            ELSE 0
          END)::float AS "maxPriceGapDays"
        FROM recent_ranked
        GROUP BY symbol
      )
      SELECT
        input_symbols.symbol,
        COALESCE(history."priceHistoryBars", 0)::int AS "priceHistoryBars",
        history."firstTimestamp",
        latest."latestTimestamp",
        latest."latestVolume",
        latest."latestAdjustedClose",
        latest."latestClose",
        latest."latestSource",
        latest."latestSourceFileImportId",
        latest_snapshot."latestSnapshotTimestamp",
        COALESCE(history."approvedExchangePriceRows", 0)::int AS "approvedExchangePriceRows",
        approved_latest."approvedExchangeLatestTimestamp",
        approved_latest."approvedExchangeLatestSource",
        approved_latest."approvedExchangeLatestSourceFileImportId",
        COALESCE(history."sourceFileImportPriceRows", 0)::int AS "sourceFileImportPriceRows",
        COALESCE(quality."rollingWindowBars", 0)::int AS "rollingWindowBars",
        COALESCE(quality."volumeRows", 0)::int AS "volumeRows",
        COALESCE(quality."adjustedCloseRows", 0)::int AS "adjustedCloseRows",
        COALESCE(quality."maxPriceGapDays", 0)::float AS "maxPriceGapDays"
      FROM input_symbols
      LEFT JOIN history ON history.symbol = input_symbols.symbol
      LEFT JOIN latest ON latest.symbol = input_symbols.symbol
      LEFT JOIN approved_latest ON approved_latest.symbol = input_symbols.symbol
      LEFT JOIN latest_snapshot ON latest_snapshot.symbol = input_symbols.symbol
      LEFT JOIN quality ON quality.symbol = input_symbols.symbol
      ORDER BY input_symbols.symbol ASC
    `);
  }
}
