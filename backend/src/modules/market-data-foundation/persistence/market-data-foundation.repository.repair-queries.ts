import { Prisma, PrismaClient } from '@prisma/client';
import type { DailyRefreshEligibilityResult, MarketDataRepairStateStatus, MarketDataRepairType, PaginationOptions, ProviderValidationQueue } from '../market-data-foundation.types';
import { activeStockSyncTaskSqlWhere, businessMetadataMissingWhere, businessMetadataRepairWhere, providerValidationWhere, stockWhere } from './market-data-foundation.repository.query-scope';

export class RepairQueriesRepository {
  constructor(private readonly prisma: PrismaClient) {}



  listStocksForUniverseHealth(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.prisma.stock.findMany({
      where: stockWhere(options),
      orderBy: { symbol: 'asc' },
    });
  }



  async listRepairStatesForStocks(
    stockIds: string[],
    options: Pick<PaginationOptions, 'region' | 'assetType'> & { repairTypes?: MarketDataRepairType[] } = {}
  ) {
    const uniqueStockIds = [...new Set(stockIds.filter((id) => typeof id === 'string' && id.trim().length > 0))];
    if (uniqueStockIds.length === 0) return new Map<string, any[]>();
    const rows = await (this.prisma as any).marketDataRepairState.findMany({
      where: {
        stockId: { in: uniqueStockIds },
        ...(options.region ? { region: options.region } : {}),
        ...(options.assetType ? { assetType: options.assetType } : {}),
        ...(options.repairTypes?.length ? { repairType: { in: options.repairTypes } } : {}),
      },
      select: {
        stockId: true,
        repairType: true,
        status: true,
        provider: true,
        error: true,
        manualRequiredReason: true,
        nextRetryAt: true,
        fieldsFilledJson: true,
      },
    });
    const grouped = new Map<string, any[]>();
    for (const row of rows) {
      const existing = grouped.get(row.stockId);
      if (existing) existing.push(row);
      else grouped.set(row.stockId, [row]);
    }
    return grouped;
  }



  async listStocksForProviderValidation(options: Pick<PaginationOptions, 'region' | 'assetType'> & {
    offset: number;
    batchSize: number;
    includeRetryFailed?: boolean;
    providerValidationQueue?: ProviderValidationQueue;
    force?: boolean;
  }) {
    const unknownWhere = providerValidationWhere(options, 'UNKNOWN_FIRST');
    const retryWhere = providerValidationWhere(options, 'RETRY_FAILED', { force: options.force });
    const queue = options.providerValidationQueue || (options.includeRetryFailed ? null : 'UNKNOWN_FIRST');

    if (queue === 'RETRY_FAILED') {
      const [stocks, total] = await Promise.all([
        this.prisma.stock.findMany({
          where: retryWhere,
          orderBy: [{ providerSymbol: 'asc' }, { symbol: 'asc' }],
          skip: 0,
          take: options.batchSize,
        }),
        this.prisma.stock.count({ where: retryWhere }),
      ]);
      return { stocks, total };
    }

    if (queue === 'UNKNOWN_FIRST') {
      const [stocks, total] = await Promise.all([
        this.prisma.stock.findMany({
          where: unknownWhere,
          orderBy: [{ providerSymbol: 'asc' }, { symbol: 'asc' }],
          skip: 0,
          take: options.batchSize,
        }),
        this.prisma.stock.count({ where: unknownWhere }),
      ]);
      return { stocks, total };
    }

    const [unknownTotal, retryTotal] = await Promise.all([
      this.prisma.stock.count({ where: unknownWhere }),
      this.prisma.stock.count({ where: retryWhere }),
    ]);
    const stocks = [];
    if (options.offset < unknownTotal) {
      const unknownStocks = await this.prisma.stock.findMany({
        where: unknownWhere,
        orderBy: [{ providerSymbol: 'asc' }, { symbol: 'asc' }],
        skip: 0,
        take: options.batchSize,
      });
      stocks.push(...unknownStocks);
    }
    if (stocks.length < options.batchSize) {
      const retrySkip = Math.max(options.offset - unknownTotal, 0);
      const retryStocks = await this.prisma.stock.findMany({
        where: retryWhere,
        orderBy: [{ providerSymbol: 'asc' }, { symbol: 'asc' }],
        skip: retrySkip,
        take: options.batchSize - stocks.length,
      });
      stocks.push(...retryStocks);
    }
    return { stocks, total: unknownTotal + retryTotal };
  }



  async listStocksForMetadataEnrichment(options: Pick<PaginationOptions, 'region' | 'assetType'> & { offset: number; batchSize: number }) {
    const where: Prisma.StockWhereInput = {
      AND: [
        stockWhere(options),
        { isActive: true },
        { isDelisted: false },
        {
          OR: [
            { sector: null },
            { sector: '' },
            { industry: null },
            { industry: '' },
            { marketCap: null },
            { isin: null },
            { isin: '' },
            { ipoDate: null },
          ],
        },
      ],
    };
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



  async listStocksForBusinessMetadataRepair(options: Pick<PaginationOptions, 'region' | 'assetType'> & {
    offset: number;
    batchSize: number;
    includeManualRequired?: boolean;
    includeRetryable?: boolean;
  }) {
    const where = businessMetadataRepairWhere(options, {
      includeManualRequired: options.includeManualRequired,
      includeRetryable: options.includeRetryable,
    });
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



  async countStocksForBusinessMetadataRepair(options: Pick<PaginationOptions, 'region' | 'assetType'> & {
    includeManualRequired?: boolean;
    includeRetryable?: boolean;
  }) {
    return this.prisma.stock.count({
      where: businessMetadataRepairWhere(options, {
        includeManualRequired: options.includeManualRequired,
        includeRetryable: options.includeRetryable,
      }),
    });
  }



  async countBusinessMetadataRepairStates(options: Pick<PaginationOptions, 'region' | 'assetType'> & {
    statuses: MarketDataRepairStateStatus[];
    retryTiming?: 'blocked' | 'eligible';
    now?: Date;
  }) {
    const now = options.now ?? new Date();
    const stateFilters: Prisma.MarketDataRepairStateWhereInput[] = [
      { status: { in: options.statuses } },
    ] as any;
    if (options.retryTiming === 'blocked') {
      stateFilters.push({ status: 'FAILED_RETRYABLE' } as any, { nextRetryAt: { gt: now } } as any);
    }
    if (options.retryTiming === 'eligible') {
      stateFilters.push(
        { status: 'FAILED_RETRYABLE' } as any,
        { OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }] } as any
      );
    }
    return (this.prisma as any).marketDataRepairState.count({
      where: {
        region: options.region,
        assetType: options.assetType,
        repairType: 'PROVIDER_BUSINESS_METADATA',
        AND: stateFilters,
        stock: {
          is: {
            AND: [
              stockWhere(options),
              { isActive: true },
              { isDelisted: false },
              { providerSupportStatus: { equals: 'SUPPORTED', mode: 'insensitive' } },
              businessMetadataMissingWhere(),
            ],
          },
        },
      },
    });
  }



  async listBlockedPriceBackfillStockIds(options: Pick<PaginationOptions, 'region' | 'assetType'> & {
    now?: Date;
    includeRetryable?: boolean;
  }) {
    const now = options.now ?? new Date();
    const blockedStates: Prisma.MarketDataRepairStateWhereInput[] = [{ status: 'MANUAL_REQUIRED' } as any];
    if (!options.includeRetryable) {
      blockedStates.push(
        { status: 'RETRY_COOLDOWN' } as any,
        { status: 'FAILED_RETRYABLE', nextRetryAt: { gt: now } } as any
      );
    }
    const rows = await (this.prisma as any).marketDataRepairState.findMany({
      where: {
        region: options.region,
        assetType: options.assetType,
        repairType: 'PRICE_BACKFILL',
        OR: blockedStates,
        stock: {
          is: {
            AND: [
              stockWhere(options),
              { isActive: true },
              { isDelisted: false },
              { providerSupportStatus: { equals: 'SUPPORTED', mode: 'insensitive' } },
            ],
          },
        },
      },
      select: { stockId: true },
    });
    return rows.map((row: { stockId: string }) => row.stockId);
  }



  async countPriceBackfillRepairStates(options: Pick<PaginationOptions, 'region' | 'assetType'> & {
    statuses: MarketDataRepairStateStatus[];
    retryTiming?: 'blocked' | 'eligible';
    now?: Date;
  }) {
    const now = options.now ?? new Date();
    const stateFilters: Prisma.MarketDataRepairStateWhereInput[] = [
      { status: { in: options.statuses } },
    ] as any;
    if (options.retryTiming === 'blocked') {
      stateFilters.push({ status: 'FAILED_RETRYABLE' } as any, { nextRetryAt: { gt: now } } as any);
    }
    if (options.retryTiming === 'eligible') {
      stateFilters.push(
        { status: 'FAILED_RETRYABLE' } as any,
        { OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }] } as any
      );
    }
    return (this.prisma as any).marketDataRepairState.count({
      where: {
        region: options.region,
        assetType: options.assetType,
        repairType: 'PRICE_BACKFILL',
        AND: stateFilters,
        stock: {
          is: {
            AND: [
              stockWhere(options),
              { isActive: true },
              { isDelisted: false },
              { providerSupportStatus: { equals: 'SUPPORTED', mode: 'insensitive' } },
            ],
          },
        },
      },
    });
  }



  async countProviderValidationRepairStates(options: Pick<PaginationOptions, 'region' | 'assetType'> & {
    status?: 'eligible' | 'blocked' | 'manual';
    now?: Date;
  }) {
    const now = options.now ?? new Date();
    const providerStatusFilter = options.status === 'manual'
      ? {}
      : { providerSupportStatus: { equals: 'VALIDATION_FAILED', mode: 'insensitive' } };
    const stateWhere: Prisma.MarketDataRepairStateWhereInput = {
      region: options.region,
      assetType: options.assetType,
      repairType: 'PROVIDER_VALIDATION',
      stock: {
        is: {
          AND: [
            stockWhere(options),
            { isActive: true },
            { isDelisted: false },
            providerStatusFilter,
          ],
        },
      },
    } as any;
    if (options.status === 'manual') {
      (stateWhere as any).status = 'MANUAL_REQUIRED';
    } else if (options.status === 'blocked') {
      (stateWhere as any).status = { in: ['FAILED_RETRYABLE', 'RETRY_COOLDOWN'] };
      (stateWhere as any).nextRetryAt = { gt: now };
    } else if (options.status === 'eligible') {
      (stateWhere as any).status = { in: ['FAILED_RETRYABLE', 'RETRY_COOLDOWN'] };
      (stateWhere as any).OR = [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }];
    }
    return (this.prisma as any).marketDataRepairState.count({ where: stateWhere });
  }



  async nextProviderValidationRetryAt(options: Pick<PaginationOptions, 'region' | 'assetType'> & { now?: Date }) {
    const now = options.now ?? new Date();
    const row = await (this.prisma as any).marketDataRepairState.findFirst({
      where: {
        region: options.region,
        assetType: options.assetType,
        repairType: 'PROVIDER_VALIDATION',
        status: { in: ['FAILED_RETRYABLE', 'RETRY_COOLDOWN'] },
        nextRetryAt: { gt: now },
        stock: {
          is: {
            AND: [
              stockWhere(options),
              { isActive: true },
              { isDelisted: false },
              { providerSupportStatus: { equals: 'VALIDATION_FAILED', mode: 'insensitive' } },
            ],
          },
        },
      },
      orderBy: { nextRetryAt: 'asc' },
      select: { nextRetryAt: true },
    });
    return row?.nextRetryAt ?? null;
  }



  async listDailyRefreshEligibleInstrumentIds(input: {
    region: string;
    assetType: string;
    dataThroughDate: string;
    limit?: number;
  }): Promise<DailyRefreshEligibilityResult> {
    const dateText = String(input.dataThroughDate || '').slice(0, 10);
    const start = new Date(`${dateText}T00:00:00.000Z`);
    if (!dateText || Number.isNaN(start.getTime())) {
      return {
        region: input.region,
        assetType: input.assetType,
        dataThroughDate: dateText,
        source: 'NONE',
        instrumentIds: [],
        instrumentCount: 0,
      };
    }
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const limit = Math.max(1, Math.min(Math.floor(input.limit || 5000), 10_000));
    const limitFilter = Prisma.sql`LIMIT ${limit}`;
    const scope = { region: input.region, assetType: input.assetType };

    const latestPriceRows = await this.prisma.$queryRaw<Array<{ id: string; symbol: string }>>(Prisma.sql`
      SELECT stocks.id, stocks.symbol
      FROM latest_prices
      INNER JOIN stocks ON stocks.symbol = latest_prices.symbol
      WHERE ${activeStockSyncTaskSqlWhere(scope)}
        AND latest_prices.timestamp >= ${start}
        AND latest_prices.timestamp < ${end}
      GROUP BY stocks.id, stocks.symbol
      ORDER BY stocks.symbol ASC
      ${limitFilter}
    `);
    if (latestPriceRows.length > 0) {
      const instrumentIds = latestPriceRows.map((row) => row.id);
      return {
        region: input.region,
        assetType: input.assetType,
        dataThroughDate: dateText,
        source: 'LATEST_PRICE',
        instrumentIds,
        instrumentCount: instrumentIds.length,
      };
    }

    const priceTickRows = await this.prisma.$queryRaw<Array<{ id: string; symbol: string }>>(Prisma.sql`
      SELECT stocks.id, stocks.symbol
      FROM price_ticks
      INNER JOIN stocks ON stocks.symbol = price_ticks.symbol
      WHERE ${activeStockSyncTaskSqlWhere(scope)}
        AND price_ticks.timestamp >= ${start}
        AND price_ticks.timestamp < ${end}
      GROUP BY stocks.id, stocks.symbol
      ORDER BY stocks.symbol ASC
      ${limitFilter}
    `);
    const instrumentIds = priceTickRows.map((row) => row.id);
    return {
      region: input.region,
      assetType: input.assetType,
      dataThroughDate: dateText,
      source: instrumentIds.length > 0 ? 'PRICE_TICK' : 'NONE',
      instrumentIds,
      instrumentCount: instrumentIds.length,
    };
  }
}
