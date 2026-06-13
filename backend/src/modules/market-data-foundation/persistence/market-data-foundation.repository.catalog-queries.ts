import { Prisma, PrismaClient } from '@prisma/client';
import type { PaginationOptions } from '../market-data-foundation.types';
import { EXCHANGE_PRICE_SOURCES } from './market-data-foundation.repository.constants';
import { activeStockSyncTaskSqlWhere, currencyWhere, derivativesEligibleWhere, safeStockSortBy, scopedStockSqlWhere, stockWhere } from './market-data-foundation.repository.query-scope';

export class CatalogQueriesRepository {
  constructor(private readonly prisma: PrismaClient) {}



  async listStocks(options: PaginationOptions) {
    const {
      page,
      pageSize,
      sortBy = 'symbol',
      sortOrder = 'asc',
      region,
      country,
      exchange,
      assetType,
      instrumentSegment,
      currency,
      sector,
      industry,
      dataStatus,
      catalogSource,
      providerSupportStatus,
      derivativesEligible,
      search,
    } = options;
    const skip = (page - 1) * pageSize;
    
    // Combine explicit region filter with other filters
    const where: Prisma.StockWhereInput = stockWhere({ region, assetType, instrumentSegment });

    if (country) {
      where.country = { contains: country.trim(), mode: 'insensitive' };
    }
    if (exchange) {
      where.exchange = { equals: exchange.trim().toUpperCase(), mode: 'insensitive' };
    }
    if (currency) {
      where.AND = [
        ...this.asAndArray(where.AND),
        currencyWhere(currency),
      ];
    }
    if (sector) {
      where.sector = { contains: sector.trim(), mode: 'insensitive' };
    }
    if (industry) {
      where.industry = { contains: industry.trim(), mode: 'insensitive' };
    }
    if (dataStatus) {
      where.dataStatus = { equals: dataStatus.trim().toUpperCase(), mode: 'insensitive' };
    }
    if (catalogSource) {
      where.catalogSource = { equals: catalogSource.trim().toUpperCase(), mode: 'insensitive' };
    }
    if (providerSupportStatus) {
      where.providerSupportStatus = { equals: providerSupportStatus.trim().toUpperCase(), mode: 'insensitive' };
    }
    if (derivativesEligible !== undefined) {
      where.AND = [
        ...this.asAndArray(where.AND),
        derivativesEligibleWhere(derivativesEligible),
      ];
    }
    if (search) {
      where.AND = [
        ...this.asAndArray(where.AND),
        {
          OR: [
            { symbol: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const resolvedSortBy = safeStockSortBy(sortBy);
    // Nullable numeric columns (marketCap) default to NULLS FIRST in Postgres for
    // DESC sorts, which causes stocks added without a marketCap value to dominate
    // the first page and displace real large-caps in the backtest ALL universe.
    // Use Prisma's { sort, nulls } object form to force NULLS LAST on any DESC sort.
    const orderByValue: any = sortOrder === 'desc'
      ? { sort: 'desc', nulls: 'last' }
      : sortOrder;
    const [stocks, total] = await Promise.all([
      this.prisma.stock.findMany({
        where,
        orderBy: { [resolvedSortBy]: orderByValue },
        skip,
        take: pageSize,
      }),
      this.prisma.stock.count({ where }),
    ]);

    return {
      stocks,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }



  async listStocksForCatalogBackfill(options: Pick<PaginationOptions, 'region' | 'assetType'> & { offset: number; batchSize: number; catalogSource?: string }) {
    const where = stockWhere({ region: options.region, assetType: options.assetType });
    if (options.catalogSource) {
      where.AND = [
        ...this.asAndArray(where.AND),
        { catalogSource: { equals: options.catalogSource.trim().toUpperCase(), mode: 'insensitive' } },
      ];
    }
    const [stocks, total] = await Promise.all([
      this.prisma.stock.findMany({
        where,
        orderBy: { symbol: 'asc' },
        skip: options.offset,
        take: options.batchSize,
      }),
      this.prisma.stock.count({ where }),
    ]);
    return { stocks, total };
  }



  instrumentCount(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.prisma.stock.count({ where: stockWhere(options) });
  }



  private asAndArray(value: Prisma.StockWhereInput['AND']): Prisma.StockWhereInput[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }



  async findExchangeIdentitiesForExchangeSymbols(exchange: string, symbols: string[]) {
    const uniqueSymbols = [...new Set(symbols.map((symbol) => symbol.trim()).filter(Boolean))];
    if (uniqueSymbols.length === 0) return [];
    return (this.prisma as any).instrumentExchangeIdentity.findMany({
      where: {
        exchange,
        OR: [
          { exchangeSymbol: { in: uniqueSymbols, mode: 'insensitive' } },
          { securityCode: { in: uniqueSymbols, mode: 'insensitive' } },
          { securityId: { in: uniqueSymbols, mode: 'insensitive' } },
        ],
      },
      include: {
        stock: {
          select: {
            id: true,
            symbol: true,
            region: true,
            assetType: true,
            exchange: true,
            isActive: true,
            isDelisted: true,
          },
        },
      },
    });
  }



  async findIndexStocksBySourceSymbols(sourceSymbols: string[]) {
    const uniqueSymbols = [...new Set(sourceSymbols.map((symbol) => symbol.trim()).filter(Boolean))];
    if (uniqueSymbols.length === 0) return [];
    return this.prisma.stock.findMany({
      where: {
        region: 'IN',
        assetType: 'INDEX',
        OR: [
          { sourceSymbol: { in: uniqueSymbols, mode: 'insensitive' } },
          { displaySymbol: { in: uniqueSymbols, mode: 'insensitive' } },
          { name: { in: uniqueSymbols, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        symbol: true,
        sourceSymbol: true,
        displaySymbol: true,
        name: true,
        exchange: true,
        isActive: true,
        isDelisted: true,
      },
    });
  }



  async findStocksBySymbolsInScope(symbols: string[], options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    const uniqueSymbols = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
    if (uniqueSymbols.length === 0) return [];
    return this.prisma.stock.findMany({
      where: {
        ...stockWhere(options),
        OR: [
          { symbol: { in: uniqueSymbols, mode: 'insensitive' } },
          { sourceSymbol: { in: uniqueSymbols, mode: 'insensitive' } },
          { displaySymbol: { in: uniqueSymbols, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        symbol: true,
        sourceSymbol: true,
        displaySymbol: true,
        region: true,
        assetType: true,
      },
    });
  }



  async listExchangeIdentitiesMissingPriceHistory(
    options: Pick<PaginationOptions, 'region' | 'assetType'> = {},
    exchanges: string[] = ['NSE', 'BSE']
  ) {
    const normalizedExchanges = [...new Set(exchanges.map((exchange) => exchange.trim().toUpperCase()).filter(Boolean))];
    if (normalizedExchanges.length === 0) return [];
    const sourceFilter = EXCHANGE_PRICE_SOURCES.map((source) => source.toUpperCase());
    return this.prisma.$queryRaw<Array<{
      id: string;
      stockId: string;
      exchange: string;
      exchangeSymbol: string;
      isin: string | null;
      stockSymbol: string;
    }>>(Prisma.sql`
      SELECT
        identities.id,
        identities."stockId",
        identities.exchange,
        identities."exchangeSymbol",
        identities.isin,
        stocks.symbol AS "stockSymbol"
      FROM instrument_exchange_identities identities
      JOIN stocks ON stocks.id = identities."stockId"
      LEFT JOIN price_ticks
        ON price_ticks.symbol = stocks.symbol
        AND UPPER(COALESCE(price_ticks.source, '')) IN (${Prisma.join(sourceFilter)})
      WHERE ${scopedStockSqlWhere(options)}
        AND stocks."isActive" = TRUE
        AND UPPER(identities.exchange) IN (${Prisma.join(normalizedExchanges)})
        AND price_ticks.id IS NULL
      ORDER BY stocks.symbol ASC, identities.exchange ASC, identities."exchangeSymbol" ASC
    `);
  }



  listActiveStockSyncTasks(
    options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {},
    take?: number,
    excludeIds: string[] = []
  ) {
    return this.prisma.stock.findMany({
      where: {
        ...stockWhere(options),
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
        isActive: true,
        isDelisted: false,
        OR: [
          { providerSupportStatus: null },
          { providerSupportStatus: { in: ['SUPPORTED', 'UNKNOWN'], mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        symbol: true,
        exchange: true,
        providerSymbol: true,
        sourceSymbol: true,
        displaySymbol: true,
        lastSuccessfulDataLoadTimestamp: true,
      },
      take,
      orderBy: [
        { lastSuccessfulDataLoadTimestamp: { sort: 'asc', nulls: 'first' } },
        { symbol: 'asc' },
      ],
    });
  }



  async listStaleActiveStockSyncTasks(
    options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {},
    targetTradingDate: string,
    take?: number,
    excludeIds: string[] = []
  ): Promise<Array<{
    id: string;
    symbol: string;
    exchange: string | null;
    providerSymbol: string | null;
    sourceSymbol: string | null;
    displaySymbol: string | null;
    lastSuccessfulDataLoadTimestamp: Date | null;
    latestStoredTimestamp: Date | null;
  }>> {
    const target = new Date(`${targetTradingDate}T00:00:00.000Z`);
    const excludeFilter = excludeIds.length > 0
      ? Prisma.sql`AND stocks.id NOT IN (${Prisma.join(excludeIds)})`
      : Prisma.sql``;
    const limitFilter = typeof take === 'number'
      ? Prisma.sql`LIMIT ${Math.max(1, take)}`
      : Prisma.sql``;

    return this.prisma.$queryRaw<Array<{
      id: string;
      symbol: string;
      exchange: string | null;
      providerSymbol: string | null;
      sourceSymbol: string | null;
      displaySymbol: string | null;
      lastSuccessfulDataLoadTimestamp: Date | null;
      latestStoredTimestamp: Date | null;
    }>>(Prisma.sql`
      WITH latest_by_stock AS (
        SELECT
          stocks.id,
          stocks.symbol,
          stocks.exchange,
          stocks."providerSymbol",
          stocks."sourceSymbol",
          stocks."displaySymbol",
          stocks."lastSuccessfulDataLoadTimestamp",
          MAX(price_ticks.timestamp) AS "latestStoredTimestamp"
        FROM stocks
        LEFT JOIN price_ticks ON price_ticks.symbol = stocks.symbol
          AND UPPER(COALESCE(price_ticks.source, '')) NOT LIKE 'TEST\\_%'
        WHERE ${activeStockSyncTaskSqlWhere(options)}
        ${excludeFilter}
        GROUP BY stocks.id, stocks.symbol, stocks.exchange, stocks."providerSymbol", stocks."sourceSymbol", stocks."displaySymbol", stocks."lastSuccessfulDataLoadTimestamp"
      )
      SELECT
        id,
        symbol,
        exchange,
        "providerSymbol",
        "sourceSymbol",
        "displaySymbol",
        "lastSuccessfulDataLoadTimestamp",
        "latestStoredTimestamp"
      FROM latest_by_stock
      WHERE "latestStoredTimestamp" IS NULL OR "latestStoredTimestamp" < ${target}
      ORDER BY "latestStoredTimestamp" ASC NULLS FIRST, "lastSuccessfulDataLoadTimestamp" ASC NULLS FIRST, symbol ASC
      ${limitFilter}
    `);
  }



  countActiveStockSyncTasks(options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {}) {
    return this.prisma.stock.count({
      where: {
        ...stockWhere(options),
        isActive: true,
        isDelisted: false,
        OR: [
          { providerSupportStatus: null },
          { providerSupportStatus: { in: ['SUPPORTED', 'UNKNOWN'], mode: 'insensitive' } },
        ],
      },
    });
  }



  async countStaleActiveStockSyncTasks(
    options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {},
    targetTradingDate: string
  ): Promise<number> {
    const target = new Date(`${targetTradingDate}T00:00:00.000Z`);
    const rows = await this.prisma.$queryRaw<Array<{ count: number | bigint }>>(Prisma.sql`
      WITH latest_by_stock AS (
        SELECT
          stocks.id,
          MAX(price_ticks.timestamp) AS "latestStoredTimestamp"
        FROM stocks
        LEFT JOIN price_ticks ON price_ticks.symbol = stocks.symbol
          AND UPPER(COALESCE(price_ticks.source, '')) NOT LIKE 'TEST\\_%'
        WHERE ${activeStockSyncTaskSqlWhere(options)}
        GROUP BY stocks.id
      )
      SELECT COUNT(*)::int AS count
      FROM latest_by_stock
      WHERE "latestStoredTimestamp" IS NULL OR "latestStoredTimestamp" < ${target}
    `);
    return Number(rows[0]?.count || 0);
  }
}
