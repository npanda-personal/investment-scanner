import { Prisma, PrismaClient } from '@prisma/client';
import defaultPrisma from '../../db/prisma';
import type {
  CorporateAction,
  CreateStockRequest,
  CoreFundamentals,
  FxRateInput,
  HistoricalPrice,
  PaginationOptions,
  SyncSummary,
  UpdateStockRequest,
  MarketDataSyncStateDto,
  MarketDataSyncScopeType,
  MarketDataSyncStateStatus,
  MarketDataRepairType,
  MarketDataRepairRunStatus,
  MarketDataRepairStateStatus,
  MarketMoverRow,
  ProviderValidationQueue,
  ScheduledRegionSyncSummary,
  TrustedReviewUniversePriceRow,
} from './market-data-foundation.types';
import { partitionHistoricalPrices } from './market-data-foundation.validation';
import type { YahooFinanceIngestionService } from './market-data-foundation.provider';
import { normalizeMarketRegion, resolveMarketRegionFilter } from '../../shared/utils/market-scope';
import { knownNseFnoStockUnderlyingSymbols } from './market-data-foundation.fno-underlyings';
import { STANDARD_REVIEW_MIN_BARS, type UniversePriceStats } from './market-data-foundation.universe';

const MARKET_MOVER_BASE_WINDOW_DAYS = 14;
const MARKET_MOVER_MIN_PRICE = 10;
const MARKET_MOVER_MIN_RECENT_TURNOVER = 1_000_000;
const PROVIDER_MARKET_DATA_SOURCES = [
  'yahoo',
  'yahoo_finance',
  'yfinance',
  'YAHOO',
  'YAHOO_CHART',
  'angel_one',
  'ANGEL_ONE',
  'ANGEL_ONE_HISTORICAL',
];
const PROVIDER_MARKET_DATA_SOURCE_UPPER = PROVIDER_MARKET_DATA_SOURCES.map((source) => source.toUpperCase());
const PROVIDER_REPAIR_TYPES = ['PROVIDER_VALIDATION', 'PROVIDER_BUSINESS_METADATA'];
const PROVIDER_CLEANUP_DELETE_BATCH_SIZE = 50_000;
const EXCHANGE_PRICE_SOURCES = [
  'NSE',
  'NSE_CM',
  'NSE_CM_UDIFF',
  'NSE_CM_UDIFF_BHAVCOPY',
  'NSE_UDIFF_CM_BHAVCOPY',
  'NSE_SECURITY_BHAVDATA',
  'NSE_INDEX_EOD',
  'NIFTY_SECTOR_INDEX',
  'BSE',
  'BSE_CM',
  'BSE_CM_BHAVCOPY',
  'BSE_CM_BACKUP_BHAVCOPY',
  'BSE_UDIFF_CM_BHAVCOPY',
];

type PriceRegionInfo = { region?: string | null; exchange?: string | null };
type HistoricalBulkStoreSummary = SyncSummary & {
  summaryBySymbol: Map<string, SyncSummary>;
};
type HistoricalStoreOptions = {
  sourceFileImportId?: string | null;
};
type SourceFileImportInput = {
  source: string;
  segment: string;
  tradingDate: Date;
  fileName: string;
  fileUrl?: string | null;
  fileHash: string;
  fileSize?: number | null;
  status: string;
  rowsRaw?: number;
  rowsAccepted?: number;
  rowsRejected?: number;
  parserVersion: string;
  errorMessage?: string | null;
};
type ManualVerifiedFundamentalInput = {
  periodType: string;
  periodEndDate: Date;
  revenue?: number | null;
  eps?: number | null;
  netIncome?: number | null;
  peRatio?: number | null;
  marketCap?: number | null;
  sourceNote?: string | null;
  sourceUrl?: string | null;
  validatedBy?: string | null;
  validatedAt?: Date | null;
  currency?: string | null;
};
type DeliverySnapshotInput = {
  stockId: string;
  symbol: string;
  exchange: string;
  tradingDate: Date;
  tradedQuantity?: number | null;
  deliverableQuantity?: number | null;
  deliveryPercent?: number | null;
  source: string;
  sourceFileImportId?: string | null;
};

export class MarketDataFoundationRepository {
  constructor(public readonly prisma: PrismaClient = defaultPrisma) {}

  async upsertSourceFileImport(input: SourceFileImportInput) {
    const tradingDate = this.normalizeUtcDay(input.tradingDate);
    const data = {
      source: input.source,
      segment: input.segment,
      tradingDate,
      fileName: input.fileName,
      fileUrl: input.fileUrl ?? null,
      fileHash: input.fileHash,
      fileSize: input.fileSize ?? null,
      status: input.status,
      rowsRaw: input.rowsRaw ?? 0,
      rowsAccepted: input.rowsAccepted ?? 0,
      rowsRejected: input.rowsRejected ?? 0,
      parserVersion: input.parserVersion,
      errorMessage: input.errorMessage ?? null,
    };

    return (this.prisma as any).sourceFileImport.upsert({
      where: {
        source_segment_tradingDate_fileHash: {
          source: input.source,
          segment: input.segment,
          tradingDate,
          fileHash: input.fileHash,
        },
      },
      create: data,
      update: {
        fileName: input.fileName,
        fileUrl: input.fileUrl ?? null,
        fileSize: input.fileSize ?? null,
        status: input.status,
        rowsRaw: input.rowsRaw ?? 0,
        rowsAccepted: input.rowsAccepted ?? 0,
        rowsRejected: input.rowsRejected ?? 0,
        parserVersion: input.parserVersion,
        errorMessage: input.errorMessage ?? null,
      },
    });
  }

  async findSourceFileImportByKey(input: Pick<SourceFileImportInput, 'source' | 'segment' | 'tradingDate' | 'fileHash'>) {
    return (this.prisma as any).sourceFileImport.findUnique({
      where: {
        source_segment_tradingDate_fileHash: {
          source: input.source,
          segment: input.segment,
          tradingDate: this.normalizeUtcDay(input.tradingDate),
          fileHash: input.fileHash,
        },
      },
    });
  }

  async listCompletedSourceFileImportDates(input: {
    source: string;
    segment: string;
    startDate: Date;
    endDate: Date;
  }): Promise<Date[]> {
    const rows = await (this.prisma as any).sourceFileImport.findMany({
      where: {
        source: input.source,
        segment: input.segment,
        status: 'COMPLETED',
        tradingDate: {
          gte: this.normalizeUtcDay(input.startDate),
          lte: this.normalizeUtcDay(input.endDate),
        },
      },
      orderBy: { tradingDate: 'asc' },
      select: { tradingDate: true },
    });
    return rows.map((row: { tradingDate: Date }) => this.normalizeUtcDay(row.tradingDate));
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
      WHERE ${this.scopedStockSqlWhere(options)}
        AND stocks."isActive" = TRUE
        AND UPPER(identities.exchange) IN (${Prisma.join(normalizedExchanges)})
        AND price_ticks.id IS NULL
      ORDER BY stocks.symbol ASC, identities.exchange ASC, identities."exchangeSymbol" ASC
    `);
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

  async filterPricesMissingPrimaryExchangeCandles(prices: HistoricalPrice[], primaryExchange: string): Promise<HistoricalPrice[]> {
    if (prices.length === 0) return [];
    const symbols = [...new Set(prices.map((price) => price.symbol))];
    const timestamps = [...new Set(prices.map((price) => this.normalizeUtcDay(price.date).toISOString()))]
      .map((date) => new Date(date));
    const primarySources = EXCHANGE_PRICE_SOURCES.filter((source) => source.toUpperCase().startsWith(primaryExchange.toUpperCase()));
    const existing = await this.prisma.priceTick.findMany({
      where: {
        symbol: { in: symbols },
        timestamp: { in: timestamps },
        OR: [
          { exchange: { equals: primaryExchange, mode: 'insensitive' } },
          { source: { in: primarySources, mode: 'insensitive' } },
        ],
      },
      select: { symbol: true, timestamp: true },
    });
    const existingKeys = new Set(existing.map((row) => this.priceStorageKey(row.symbol, this.normalizeUtcDay(row.timestamp))));
    return prices.filter((price) => !existingKeys.has(this.priceStorageKey(price.symbol, this.normalizeUtcDay(price.date))));
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
        ...this.stockWhere(options),
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

  async upsertDeliverySnapshots(snapshots: DeliverySnapshotInput[]): Promise<{ insertedOrUpdated: number }> {
    let insertedOrUpdated = 0;
    for (const snapshot of snapshots) {
      const tradingDate = this.normalizeUtcDay(snapshot.tradingDate);
      const data = {
        stockId: snapshot.stockId,
        symbol: snapshot.symbol,
        exchange: snapshot.exchange,
        tradingDate,
        tradedQuantity: snapshot.tradedQuantity === null || snapshot.tradedQuantity === undefined ? null : BigInt(Math.trunc(snapshot.tradedQuantity)),
        deliverableQuantity: snapshot.deliverableQuantity === null || snapshot.deliverableQuantity === undefined ? null : BigInt(Math.trunc(snapshot.deliverableQuantity)),
        deliveryPercent: snapshot.deliveryPercent ?? null,
        source: snapshot.source,
        sourceFileImportId: snapshot.sourceFileImportId ?? null,
      };
      await (this.prisma as any).marketDeliverySnapshot.upsert({
        where: {
          stockId_exchange_tradingDate_source: {
            stockId: snapshot.stockId,
            exchange: snapshot.exchange,
            tradingDate,
            source: snapshot.source,
          },
        },
        create: data,
        update: {
          symbol: snapshot.symbol,
          tradedQuantity: data.tradedQuantity,
          deliverableQuantity: data.deliverableQuantity,
          deliveryPercent: data.deliveryPercent,
          sourceFileImportId: data.sourceFileImportId,
        },
      });
      insertedOrUpdated += 1;
    }
    return { insertedOrUpdated };
  }

  async providerDataCleanupReport() {
    const providerSource = this.providerSourceWhere();
    const [
      priceTicks,
      fundamentals,
      corporateActions,
      fxRates,
      repairAttempts,
      repairStates,
      latestPricesWithoutExchangeCandles,
    ] = await Promise.all([
      this.prisma.priceTick.count({ where: { source: providerSource } }),
      (this.prisma as any).fundamental.count({ where: { source: providerSource } }),
      (this.prisma as any).corporateAction.count({ where: { source: providerSource } }),
      (this.prisma as any).fxRate.count({ where: { source: providerSource } }),
      (this.prisma as any).marketDataRepairAttempt.count({
        where: {
          OR: [
            { provider: providerSource },
            { repairType: { in: ['PROVIDER_VALIDATION', 'PROVIDER_BUSINESS_METADATA'] } },
          ],
        },
      }),
      (this.prisma as any).marketDataRepairState.count({
        where: {
          OR: [
            { provider: providerSource },
            { repairType: { in: ['PROVIDER_VALIDATION', 'PROVIDER_BUSINESS_METADATA'] } },
          ],
        },
      }),
      this.countLatestPricesWithoutExchangeCandles(),
    ]);

    return {
      dryRun: true,
      providerSources: PROVIDER_MARKET_DATA_SOURCES,
      exchangeSources: EXCHANGE_PRICE_SOURCES,
      counts: {
        priceTicks,
        fundamentals,
        corporateActions,
        fxRates,
        repairAttempts,
        repairStates,
        latestPricesWithoutExchangeCandles,
      },
      protectedData: [
        'stocks',
        'portfolio_holdings',
        'portfolio_transactions',
        'watchlist_items',
        'alert_rules',
        'alert_events',
        'notes',
      ],
    };
  }

  async executeProviderDataCleanup() {
    const before = await this.providerDataCleanupReport();
    const deleted = {
      priceTicks: await this.batchDeleteProviderSourceRows('price_ticks'),
      fundamentals: await this.batchDeleteProviderSourceRows('fundamentals'),
      corporateActions: await this.batchDeleteProviderSourceRows('corporate_actions'),
      fxRates: await this.batchDeleteProviderSourceRows('fx_rates'),
      repairAttempts: await this.batchDeleteProviderRepairRows('market_data_repair_attempts'),
      repairStates: await this.batchDeleteProviderRepairRows('market_data_repair_states'),
    };
    const latestPriceRebuild = await this.rebuildLatestPricesFromExchangeCandles();

    return {
      dryRun: false,
      providerSources: PROVIDER_MARKET_DATA_SOURCES,
      before: before.counts,
      deleted,
      latestPriceRebuild,
      protectedData: before.protectedData,
    };
  }

  private async batchDeleteProviderSourceRows(
    tableName: 'price_ticks' | 'fundamentals' | 'corporate_actions' | 'fx_rates',
    batchSize = PROVIDER_CLEANUP_DELETE_BATCH_SIZE,
  ): Promise<number> {
    let deletedCount = 0;
    while (true) {
      const result = await this.prisma.$executeRaw(Prisma.sql`
        DELETE FROM ${Prisma.raw(tableName)}
        WHERE id IN (
          SELECT id
          FROM ${Prisma.raw(tableName)}
          WHERE UPPER(COALESCE(source, '')) IN (${Prisma.join(PROVIDER_MARKET_DATA_SOURCE_UPPER)})
          LIMIT ${batchSize}
        )
      `);
      const count = Number(result || 0);
      deletedCount += count;
      if (count < batchSize) return deletedCount;
    }
  }

  private async batchDeleteProviderRepairRows(
    tableName: 'market_data_repair_attempts' | 'market_data_repair_states',
    batchSize = PROVIDER_CLEANUP_DELETE_BATCH_SIZE,
  ): Promise<number> {
    let deletedCount = 0;
    while (true) {
      const result = await this.prisma.$executeRaw(Prisma.sql`
        DELETE FROM ${Prisma.raw(tableName)}
        WHERE id IN (
          SELECT id
          FROM ${Prisma.raw(tableName)}
          WHERE UPPER(COALESCE(provider, '')) IN (${Prisma.join(PROVIDER_MARKET_DATA_SOURCE_UPPER)})
             OR "repairType" IN (${Prisma.join(PROVIDER_REPAIR_TYPES)})
          LIMIT ${batchSize}
        )
      `);
      const count = Number(result || 0);
      deletedCount += count;
      if (count < batchSize) return deletedCount;
    }
  }

  async rebuildLatestPricesFromExchangeCandles() {
    const sourceList = EXCHANGE_PRICE_SOURCES.map((source) => source.toUpperCase());
    const latestRows = await this.prisma.$queryRaw<Array<{
      symbol: string;
      region: string | null;
      timestamp: Date;
      close: Prisma.Decimal | number | string;
    }>>(Prisma.sql`
      SELECT DISTINCT ON (pt.symbol)
        pt.symbol,
        pt.region,
        pt.timestamp,
        pt.close
      FROM price_ticks pt
      WHERE UPPER(COALESCE(pt.source, '')) IN (${Prisma.join(sourceList)})
      ORDER BY pt.symbol ASC, pt.timestamp DESC, pt."lastUpdatedTimestamp" DESC
    `);

    for (const row of latestRows) {
      await this.prisma.latestPrice.upsert({
        where: { symbol: row.symbol },
        update: {
          region: row.region,
          price: new Prisma.Decimal(row.close),
          timestamp: row.timestamp,
          updatedAt: new Date(),
        },
        create: {
          symbol: row.symbol,
          region: row.region,
          price: new Prisma.Decimal(row.close),
          timestamp: row.timestamp,
          updatedAt: new Date(),
        },
      });
    }

    const staleDeleted = await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM latest_prices lp
      WHERE NOT EXISTS (
        SELECT 1
        FROM price_ticks pt
        WHERE pt.symbol = lp.symbol
          AND UPPER(COALESCE(pt.source, '')) IN (${Prisma.join(sourceList)})
      )
    `);

    return {
      rebuiltCount: latestRows.length,
      staleDeletedCount: Number(staleDeleted || 0),
    };
  }

  private async countLatestPricesWithoutExchangeCandles(): Promise<number> {
    if (typeof (this.prisma as any).$queryRaw !== 'function') {
      return this.prisma.latestPrice.count({ where: {} });
    }
    const sourceList = EXCHANGE_PRICE_SOURCES.map((source) => source.toUpperCase());
    const rows = await this.prisma.$queryRaw<Array<{ count: number | bigint | string }>>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM latest_prices lp
      WHERE NOT EXISTS (
        SELECT 1
        FROM price_ticks pt
        WHERE pt.symbol = lp.symbol
          AND UPPER(COALESCE(pt.source, '')) IN (${Prisma.join(sourceList)})
      )
    `);
    return Number(rows[0]?.count || 0);
  }

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
    const where: Prisma.StockWhereInput = this.stockWhere({ region, assetType, instrumentSegment });

    if (country) {
      where.country = { contains: country.trim(), mode: 'insensitive' };
    }
    if (exchange) {
      where.exchange = { equals: exchange.trim().toUpperCase(), mode: 'insensitive' };
    }
    if (currency) {
      where.AND = [
        ...this.asAndArray(where.AND),
        this.currencyWhere(currency),
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
        this.derivativesEligibleWhere(derivativesEligible),
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

    const [stocks, total] = await Promise.all([
      this.prisma.stock.findMany({
        where,
        orderBy: { [this.safeStockSortBy(sortBy)]: sortOrder },
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

  findStockById(id: string) {
    return this.prisma.stock.findUnique({ where: { id } });
  }

  findStockByIdInScope(id: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.prisma.stock.findFirst({ where: { ...this.stockWhere(options), id } });
  }

  async findStockBySymbol(symbol: string) {
    const normalized = symbol.trim().toUpperCase();
    const baseSymbol = normalized.replace(/\.(NS|BO)$/i, '');
    const exact = await this.prisma.stock.findUnique({ where: { symbol: normalized } }).catch(() => null);
    if (exact) return exact;

    return this.prisma.stock.findFirst({
      where: {
        OR: [
          { symbol: baseSymbol },
          { providerSymbol: normalized },
          { sourceSymbol: baseSymbol },
          { displaySymbol: baseSymbol },
        ],
      },
      orderBy: [
        { isActive: 'desc' },
        { isDelisted: 'asc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  findStockBySymbolAndExchange(symbol: string, exchange: string) {
    return this.prisma.stock.findFirst({
      where: {
        symbol,
        exchange,
      },
    });
  }

  createStock(data: CreateStockRequest) {
    return this.prisma.stock.create({
      data: {
        symbol: data.symbol,
        name: data.name,
        region: data.region,
        exchange: data.exchange,
        country: data.country,
        sector: data.sector,
        industry: data.industry,
        currency: data.currency,
        marketCap: data.marketCap !== undefined && data.marketCap !== null ? new Prisma.Decimal(data.marketCap) : undefined,
        assetType: data.assetType,
        instrumentSegment: data.instrumentSegment,
        displaySymbol: data.displaySymbol,
        providerSymbol: data.providerSymbol,
        sourceSymbol: data.sourceSymbol,
        catalogSource: data.catalogSource,
        providerSupportStatus: data.providerSupportStatus,
        providerError: data.providerError,
        derivativesEligible: data.derivativesEligible ?? false,
        underlyingSymbol: data.underlyingSymbol,
        expiryDate: data.expiryDate,
        contractMonth: data.contractMonth,
        lotSize: data.lotSize,
        contractStatus: data.contractStatus,
        isDelisted: data.isDelisted ?? false,
        ipoDate: data.ipoDate,
        isin: data.isin,
        source: data.source || data.catalogSource || 'database',
        dataStatus: data.dataStatus || 'PARTIAL',
        isActive: data.isActive ?? true,
        lastSuccessfulDataLoadTimestamp: null,
      },
    });
  }

  updateStock(id: string, data: UpdateStockRequest) {
    return this.prisma.stock.update({ where: { id }, data });
  }

  deleteStock(id: string) {
    return this.prisma.stock.delete({ where: { id } });
  }

  async toggleStockActive(id: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { id },
      select: { isActive: true },
    });
    if (!stock) {
      throw new Error('Stock not found');
    }
    return this.prisma.stock.update({
      where: { id },
      data: { isActive: !stock.isActive },
    });
  }

  searchStocks(query: string, take = 10, options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {}) {
    return this.prisma.stock.findMany({
      where: {
        AND: [
          this.stockWhere(options),
          {
            OR: [
              { symbol: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take,
    });
  }

  listActiveStockSyncTasks(
    options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {},
    take?: number,
    excludeIds: string[] = []
  ) {
    return this.prisma.stock.findMany({
      where: {
        ...this.stockWhere(options),
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
        isActive: true,
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
        WHERE ${this.activeStockSyncTaskSqlWhere(options)}
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
        ...this.stockWhere(options),
        isActive: true,
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
        WHERE ${this.activeStockSyncTaskSqlWhere(options)}
        GROUP BY stocks.id
      )
      SELECT COUNT(*)::int AS count
      FROM latest_by_stock
      WHERE "latestStoredTimestamp" IS NULL OR "latestStoredTimestamp" < ${target}
    `);
    return Number(rows[0]?.count || 0);
  }

  async upsertCatalogInstrument(data: CreateStockRequest): Promise<{ stock: any; action: 'inserted' | 'updated' | 'noOp' }> {
    const matchingSymbols = [data.symbol, data.providerSymbol, data.sourceSymbol, data.displaySymbol]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim().toUpperCase());
    const normalizedExchange = data.exchange?.trim().toUpperCase();
    const canMatchByName = data.name?.trim()
      && data.region === 'IN'
      && (normalizedExchange === 'NSE' || normalizedExchange === 'BSE')
      && ['NSE_EQUITY_SECURITIES', 'NSE_ETF_SECURITIES', 'BSE_EQUITY_SECURITIES'].includes(String(data.catalogSource || '').toUpperCase());
    const existing = await this.prisma.stock.findFirst({
      where: {
        OR: [
          { symbol: { in: matchingSymbols, mode: 'insensitive' } },
          data.providerSymbol ? { providerSymbol: { equals: data.providerSymbol, mode: 'insensitive' } } : undefined,
          data.sourceSymbol ? { sourceSymbol: { equals: data.sourceSymbol, mode: 'insensitive' } } : undefined,
          canMatchByName ? {
            AND: [
              { name: { equals: data.name.trim(), mode: 'insensitive' } },
              { region: 'IN' },
              { OR: [{ exchange: { equals: normalizedExchange, mode: 'insensitive' } }, { exchange: null }] },
            ],
          } : undefined,
        ].filter(Boolean) as Prisma.StockWhereInput[],
      },
    });
    if (!existing) {
      const stock = await this.createStock({
        ...data,
        source: data.catalogSource || data.source || 'catalog',
        dataStatus: data.dataStatus || 'PARTIAL',
      } as any);
      return { stock, action: 'inserted' };
    }

    const updateData = this.catalogUpdateData(existing, data);
    if (Object.keys(updateData).length === 0) {
      return { stock: existing, action: 'noOp' };
    }

    const stock = await this.prisma.stock.update({
      where: { id: existing.id },
      data: updateData,
    });
    return { stock, action: 'updated' };
  }

  async repairCatalogIdentityForStock(
    stockId: string,
    data: CreateStockRequest,
    options: { force?: boolean } = {}
  ): Promise<{ stock: any; action: 'updated' | 'noOp' }> {
    const existing = await this.prisma.stock.findUnique({ where: { id: stockId } });
    if (!existing) {
      throw new Error(`Stock ${stockId} not found for catalog identity repair.`);
    }
    const updateData = this.catalogIdentityUpdateData(existing, data, Boolean(options.force));
    if (Object.keys(updateData).length === 0) {
      return { stock: existing, action: 'noOp' };
    }
    const stock = await this.prisma.stock.update({
      where: { id: stockId },
      data: updateData,
    });
    return { stock, action: 'updated' };
  }

  async updateProviderSupportStatus(symbol: string, status: string, providerError?: string | null) {
    return this.prisma.stock.update({
      where: { symbol },
      data: {
        providerSupportStatus: status,
        providerError: providerError || null,
      },
    });
  }

  async markProviderSupportedFromStoredPrices(symbols: string[]) {
    const uniqueSymbols = [...new Set(symbols.filter(Boolean))];
    if (uniqueSymbols.length === 0) return { count: 0 };
    return this.prisma.stock.updateMany({
      where: {
        symbol: { in: uniqueSymbols },
        OR: [
          { providerSupportStatus: null },
          { providerSupportStatus: '' },
          { providerSupportStatus: { equals: 'UNKNOWN', mode: 'insensitive' } },
        ],
      },
      data: {
        providerSupportStatus: 'SUPPORTED',
        providerError: null,
      },
    });
  }

  async listStocksForCatalogBackfill(options: Pick<PaginationOptions, 'region' | 'assetType'> & { offset: number; batchSize: number; catalogSource?: string }) {
    const where = this.stockWhere({ region: options.region, assetType: options.assetType });
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

  updateStockLoadTimestampById(id: string, timestamp = new Date()) {
    return this.prisma.stock.update({
      where: { id },
      data: { lastSuccessfulDataLoadTimestamp: timestamp },
    });
  }

  async updateStockLoadTimestampBySymbol(symbol: string, timestamp = new Date()) {
    const normalized = symbol.trim().toUpperCase();
    const baseSymbol = normalized.replace(/\.(NS|BO)$/i, '');
    const result = await this.prisma.stock.updateMany({
      where: {
        OR: [
          { symbol: normalized },
          { symbol: baseSymbol },
          { providerSymbol: normalized },
        ],
      },
      data: { lastSuccessfulDataLoadTimestamp: timestamp },
    });
    if (result.count === 0) {
      return this.prisma.stock.update({
        where: { symbol: normalized },
        data: { lastSuccessfulDataLoadTimestamp: timestamp },
      });
    }
    return result;
  }

  updateStockLoadTimestampBySymbols(symbols: string[], timestamp = new Date()) {
    const uniqueSymbols = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
    if (uniqueSymbols.length === 0) return Promise.resolve({ count: 0 });
    const baseSymbols = uniqueSymbols.map((symbol) => symbol.replace(/\.(NS|BO)$/i, ''));
    return this.prisma.stock.updateMany({
      where: {
        OR: [
          { symbol: { in: uniqueSymbols } },
          { symbol: { in: baseSymbols } },
          { providerSymbol: { in: uniqueSymbols } },
        ],
      },
      data: { lastSuccessfulDataLoadTimestamp: timestamp },
    });
  }

  async listPrices(symbol: string, limit: number, startDate?: Date, endDate?: Date) {
    const prices = await this.prisma.priceTick.findMany({
      where: {
        symbol,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        timestamp: true,
        open: true,
        high: true,
        low: true,
        close: true,
        adjustedClose: true,
        volume: true,
        region: true,
        exchange: true,
        source: true,
        ingestionTimestamp: true,
        lastUpdatedTimestamp: true,
        dataStatus: true,
      },
    });

    return prices.map((price) => ({
      ...price,
      open: price.open.toString(),
      high: price.high.toString(),
      low: price.low.toString(),
      close: price.close.toString(),
      adjustedClose: price.adjustedClose?.toString() ?? null,
      volume: price.volume !== null ? price.volume.toString() : null,
    }));
  }

  async listForwardPriceWindowsByInstrumentIds(
    instrumentIds: string[],
    startDate: Date,
    options: Pick<PaginationOptions, 'region' | 'assetType'> = {}
  ) {
    const uniqueIds = [...new Set(instrumentIds.filter(Boolean))];
    if (uniqueIds.length === 0) return new Map<string, any[]>();

    const stocks = await this.prisma.stock.findMany({
      where: { ...this.stockWhere(options), id: { in: uniqueIds } },
      select: { id: true, symbol: true },
    });
    if (stocks.length === 0) return new Map<string, any[]>();

    const symbolByInstrumentId = new Map(stocks.map((stock) => [stock.id, stock.symbol]));
    const instrumentIdBySymbol = new Map(stocks.map((stock) => [stock.symbol, stock.id]));
    const prices = await this.prisma.priceTick.findMany({
      where: {
        symbol: { in: stocks.map((stock) => stock.symbol) },
        timestamp: { gte: startDate },
      },
      orderBy: [{ symbol: 'asc' }, { timestamp: 'asc' }],
      select: {
        symbol: true,
        timestamp: true,
        close: true,
        adjustedClose: true,
      },
    });

    const byInstrumentId = new Map(uniqueIds.map((id) => [id, [] as any[]]));
    for (const price of prices) {
      const instrumentId = instrumentIdBySymbol.get(price.symbol);
      if (!instrumentId) continue;
      byInstrumentId.get(instrumentId)?.push({
        date: price.timestamp,
        close: price.close.toString(),
        adjusted_close: price.adjustedClose?.toString() ?? price.close.toString(),
      });
    }

    for (const [instrumentId] of symbolByInstrumentId) {
      if (!byInstrumentId.has(instrumentId)) byInstrumentId.set(instrumentId, []);
    }
    return byInstrumentId;
  }

  async latestPrice(symbol: string) {
    const latestTick = await this.prisma.priceTick.findFirst({
      where: { symbol },
      orderBy: { timestamp: 'desc' },
      select: {
        timestamp: true,
        open: true,
        high: true,
        low: true,
        close: true,
        adjustedClose: true,
        volume: true,
        region: true,
        exchange: true,
        source: true,
        ingestionTimestamp: true,
        lastUpdatedTimestamp: true,
        dataStatus: true,
      },
    });

    if (latestTick) {
      return {
        ...latestTick,
        open: latestTick.open.toString(),
        high: latestTick.high.toString(),
        low: latestTick.low.toString(),
        close: latestTick.close.toString(),
        adjustedClose: latestTick.adjustedClose?.toString() ?? null,
        volume: latestTick.volume !== null ? latestTick.volume.toString() : null,
      };
    }

    const latestPrice = await this.prisma.latestPrice.findUnique({
      where: { symbol },
    });
    if (!latestPrice) {
      return null;
    }

    return {
      timestamp: latestPrice.timestamp,
      open: null,
      high: null,
      low: null,
      close: latestPrice.price.toString(),
      adjustedClose: latestPrice.price.toString(),
      volume: null,
      region: latestPrice.region,
      exchange: null,
      source: 'latest_prices',
      ingestionTimestamp: latestPrice.updatedAt,
      lastUpdatedTimestamp: latestPrice.updatedAt,
      dataStatus: 'PARTIAL',
    };
  }

  instrumentCount(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.prisma.stock.count({ where: this.stockWhere(options) });
  }

  async latestDataTimestamp(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    const rows = await this.prisma.$queryRaw<Array<{ timestamp: Date | null }>>(Prisma.sql`
      SELECT MAX(price_ticks.timestamp) AS timestamp
      FROM price_ticks
      INNER JOIN stocks ON stocks.symbol = price_ticks.symbol
      WHERE ${this.scopedStockSqlWhere(options)}
    `);

    return rows[0]?.timestamp ?? null;
  }

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
        WHERE ${this.scopedStockSqlWhere(options)}
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
      latestClose: this.toNumber(row.latestClose),
      baseDate: row.baseDate.toISOString(),
      baseClose: this.toNumber(row.baseClose),
      returnPercent: Number(this.toNumber(row.returnPercent).toFixed(6)),
      priceBasis: row.priceBasis === 'ADJUSTED_CLOSE' ? 'ADJUSTED_CLOSE' : 'CLOSE_FALLBACK',
      latestSource: row.latestSource,
      baseSource: row.baseSource,
      actualLookbackDays: Number(this.toNumber(row.actualLookbackDays).toFixed(1)),
      historyBarsInWindow: Number(row.historyBarsInWindow || 0),
      averageRecentTurnover: row.averageRecentTurnover == null ? null : Number(this.toNumber(row.averageRecentTurnover).toFixed(0)),
    }));
  }

  listStocksForUniverseHealth(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.prisma.stock.findMany({
      where: this.stockWhere(options),
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
    const unknownWhere = this.providerValidationWhere(options, 'UNKNOWN_FIRST');
    const retryWhere = this.providerValidationWhere(options, 'RETRY_FAILED', { force: options.force });
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
        this.stockWhere(options),
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
    const where = this.businessMetadataRepairWhere(options, {
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
      where: this.businessMetadataRepairWhere(options, {
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
              this.stockWhere(options),
              { isActive: true },
              { isDelisted: false },
              { providerSupportStatus: { equals: 'SUPPORTED', mode: 'insensitive' } },
              this.businessMetadataMissingWhere(),
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
              this.stockWhere(options),
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
              this.stockWhere(options),
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
            this.stockWhere(options),
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
              this.stockWhere(options),
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

  async recordRepairAttempt(input: {
    stockId: string;
    region: string;
    assetType?: string | null;
    repairType: MarketDataRepairType;
    status: string;
    provider?: string | null;
    attemptedAt?: Date;
    completedAt?: Date | null;
    fieldsFilledJson?: Prisma.InputJsonValue | null;
    error?: string | null;
    manualRequiredReason?: string | null;
  }) {
    const now = new Date();
    return (this.prisma as any).marketDataRepairAttempt.create({
      data: {
        stockId: input.stockId,
        region: input.region,
        assetType: input.assetType ?? null,
        repairType: input.repairType,
        status: input.status,
        provider: input.provider ?? null,
        attemptedAt: input.attemptedAt ?? now,
        completedAt: input.completedAt === undefined ? now : input.completedAt,
        fieldsFilledJson: input.fieldsFilledJson ?? undefined,
        error: input.error ?? null,
        manualRequiredReason: input.manualRequiredReason ?? null,
      },
    });
  }

  async countRepairAttempts(input: {
    stockId: string;
    repairType: MarketDataRepairType;
  }) {
    return (this.prisma as any).marketDataRepairAttempt.count({
      where: {
        stockId: input.stockId,
        repairType: input.repairType,
      },
    });
  }

  async upsertRepairState(input: {
    stockId: string;
    region: string;
    assetType?: string | null;
    repairType: MarketDataRepairType;
    status: MarketDataRepairStateStatus;
    provider?: string | null;
    lastAttemptId?: string | null;
    fieldsFilledJson?: Prisma.InputJsonValue | null;
    error?: string | null;
    manualRequiredReason?: string | null;
    nextRetryAt?: Date | null;
    lastAttemptedAt?: Date | null;
    resolvedAt?: Date | null;
  }) {
    const now = new Date();
    return (this.prisma as any).marketDataRepairState.upsert({
      where: {
        stockId_repairType: {
          stockId: input.stockId,
          repairType: input.repairType,
        },
      },
      create: {
        stockId: input.stockId,
        region: input.region,
        assetType: input.assetType ?? null,
        repairType: input.repairType,
        status: input.status,
        provider: input.provider ?? null,
        lastAttemptId: input.lastAttemptId ?? null,
        fieldsFilledJson: input.fieldsFilledJson ?? undefined,
        error: input.error ?? null,
        manualRequiredReason: input.manualRequiredReason ?? null,
        nextRetryAt: input.nextRetryAt ?? null,
        lastAttemptedAt: input.lastAttemptedAt ?? now,
        resolvedAt: input.resolvedAt ?? (input.status === 'RESOLVED' ? now : null),
      },
      update: {
        region: input.region,
        assetType: input.assetType ?? null,
        status: input.status,
        provider: input.provider ?? null,
        lastAttemptId: input.lastAttemptId ?? null,
        fieldsFilledJson: input.fieldsFilledJson ?? undefined,
        error: input.error ?? null,
        manualRequiredReason: input.manualRequiredReason ?? null,
        nextRetryAt: input.nextRetryAt ?? null,
        lastAttemptedAt: input.lastAttemptedAt ?? now,
        resolvedAt: input.resolvedAt ?? (input.status === 'RESOLVED' ? now : null),
      },
    });
  }

  async createRepairRun(input: {
    region: string;
    assetType?: string | null;
    status: MarketDataRepairRunStatus;
    beforeHealthJson?: Prisma.InputJsonValue | null;
    beforeRepairPlanJson?: Prisma.InputJsonValue | null;
    actionsJson: Prisma.InputJsonValue;
    warningsJson?: Prisma.InputJsonValue | null;
  }) {
    return (this.prisma as any).marketDataRepairRun.create({
      data: {
        region: input.region,
        assetType: input.assetType ?? null,
        status: input.status,
        beforeHealthJson: input.beforeHealthJson ?? undefined,
        beforeRepairPlanJson: input.beforeRepairPlanJson ?? undefined,
        actionsJson: input.actionsJson,
        warningsJson: input.warningsJson ?? undefined,
      },
    });
  }

  async updateRepairRun(id: string, input: {
    status: MarketDataRepairRunStatus;
    completedAt?: Date | null;
    afterHealthJson?: Prisma.InputJsonValue | null;
    afterRepairPlanJson?: Prisma.InputJsonValue | null;
    summaryJson?: Prisma.InputJsonValue | null;
    warningsJson?: Prisma.InputJsonValue | null;
    error?: string | null;
  }) {
    return (this.prisma as any).marketDataRepairRun.update({
      where: { id },
      data: {
        status: input.status,
        completedAt: input.completedAt ?? null,
        afterHealthJson: input.afterHealthJson ?? undefined,
        afterRepairPlanJson: input.afterRepairPlanJson ?? undefined,
        summaryJson: input.summaryJson ?? undefined,
        warningsJson: input.warningsJson ?? undefined,
        error: input.error ?? null,
      },
    });
  }

  async latestRepairRun(options: Pick<PaginationOptions, 'region' | 'assetType'>) {
    return (this.prisma as any).marketDataRepairRun.findFirst({
      where: {
        region: options.region,
        assetType: options.assetType ?? null,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async latestPriceExists(symbol: string): Promise<boolean> {
    const row = await this.prisma.latestPrice.findUnique({
      where: { symbol },
      select: { symbol: true },
    });
    return Boolean(row);
  }

  async reassignPriceRowsToCanonicalSymbol(input: {
    stockId: string;
    fromSymbol: string;
    toSymbol: string;
  }): Promise<{ priceRowsMoved: number; latestPricesMoved: number }> {
    return this.prisma.$transaction(async (tx) => {
      const [targetLatest, canonicalPriceRows] = await Promise.all([
        tx.latestPrice.findUnique({ where: { symbol: input.toSymbol }, select: { symbol: true } }),
        tx.priceTick.count({ where: { symbol: input.toSymbol } }),
      ]);
      if (targetLatest) {
        throw new Error(`TARGET_LATEST_PRICE_COLLISION: ${input.toSymbol} already has latest price.`);
      }
      if (canonicalPriceRows > 0) {
        throw new Error(`CANONICAL_PRICE_ROWS_EXIST: ${input.toSymbol} already has price rows.`);
      }

      const priceRows = await tx.priceTick.updateMany({
        where: { symbol: input.fromSymbol },
        data: { symbol: input.toSymbol },
      });
      const latestRows = await tx.latestPrice.updateMany({
        where: { symbol: input.fromSymbol },
        data: { symbol: input.toSymbol },
      });
      if (priceRows.count > 0) {
        await tx.stock.update({
          where: { id: input.stockId },
          data: { lastSuccessfulDataLoadTimestamp: new Date() },
        });
      }

      return {
        priceRowsMoved: priceRows.count,
        latestPricesMoved: latestRows.count,
      };
    });
  }

  async priceReadinessStatsForSymbols(symbols: string[]): Promise<Map<string, UniversePriceStats>> {
    const uniqueSymbols = [...new Set(symbols.filter(Boolean))];
    const emptyStats: Map<string, UniversePriceStats> = new Map(uniqueSymbols.map((symbol) => [symbol, {
      priceHistoryBars: 0,
      firstPriceDate: null,
      latestPriceDate: null,
      latestVolume: null,
      latestAdjustedClose: null,
      latestClose: null,
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
        rollingWindowBars,
        rollingWindowCoveragePercent: this.percent(rollingWindowBars, STANDARD_REVIEW_MIN_BARS),
        maxPriceGapDays: rollingWindowBars > 1 ? Math.round(Number(row.maxPriceGapDays || 0)) : null,
        recentVolumeCoveragePercent: this.percent(volumeRows, Math.max(rollingWindowBars, 1)),
        adjustedCloseCoveragePercent: this.percent(adjustedCloseRows, Math.max(rollingWindowBars, 1)),
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
    const chunkSize = 25;
    for (let index = 0; index < uniqueSymbols.length; index += chunkSize) {
      const chunk = uniqueSymbols.slice(index, index + chunkSize);
      const chunkRows = await Promise.all(chunk.map(async (symbol) => {
        const rows = await this.prisma.priceTick.findMany({
          where: { symbol },
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
        rowsBySymbol.set(symbol, rows.reverse().map((row) => ({
          date: row.timestamp.toISOString().slice(0, 10),
          open: Number(row.open),
          high: Number(row.high),
          low: Number(row.low),
          close: Number(row.close),
          adjustedClose: row.adjustedClose === null || row.adjustedClose === undefined ? null : Number(row.adjustedClose),
          volume: row.volume === null || row.volume === undefined ? null : Number(row.volume),
        })));
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
          history_stats."firstTimestamp"
        FROM input_symbols
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS "priceHistoryBars",
            MIN(price_ticks.timestamp) AS "firstTimestamp"
          FROM price_ticks
          WHERE price_ticks.symbol = input_symbols.symbol
        ) history_stats ON TRUE
      ),
      recent_ranked AS (
        SELECT
          recent.symbol,
          recent.timestamp,
          recent.volume,
          recent."adjustedClose",
          recent.close,
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
              price_ticks.close
            FROM price_ticks
            WHERE price_ticks.symbol = input_symbols.symbol
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
          close AS "latestClose"
        FROM recent_ranked
        WHERE row_num = 1
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
        COALESCE(quality."rollingWindowBars", 0)::int AS "rollingWindowBars",
        COALESCE(quality."volumeRows", 0)::int AS "volumeRows",
        COALESCE(quality."adjustedCloseRows", 0)::int AS "adjustedCloseRows",
        COALESCE(quality."maxPriceGapDays", 0)::float AS "maxPriceGapDays"
      FROM input_symbols
      LEFT JOIN history ON history.symbol = input_symbols.symbol
      LEFT JOIN latest ON latest.symbol = input_symbols.symbol
      LEFT JOIN quality ON quality.symbol = input_symbols.symbol
      ORDER BY input_symbols.symbol ASC
    `);
  }

  private percent(value: number, denominator: number) {
    if (denominator <= 0) return 0;
    return Number(((value / denominator) * 100).toFixed(1));
  }

  async priceCoverage(symbol: string) {
    const [count, oldest, latest] = await Promise.all([
      this.prisma.priceTick.count({ where: { symbol } }),
      this.prisma.priceTick.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true },
      }),
      this.prisma.priceTick.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      }),
    ]);

    return {
      count,
      oldestTimestamp: oldest?.timestamp ?? null,
      latestTimestamp: latest?.timestamp ?? null,
    };
  }

  async storeHistorical(
    prices: HistoricalPrice[],
    inferRegion: YahooFinanceIngestionService['inferRegion'],
    regionInfoBySymbol: Map<string, PriceRegionInfo> = new Map()
  ): Promise<SyncSummary> {
    const rowsReceived = prices.length;
    const validation = partitionHistoricalPrices(prices);
    const duplicateProviderRowsSkipped = (validation as any).duplicateProviderRowsSkipped || 0;
    const warnings = validation.invalid.flatMap((invalid) =>
      invalid.errors.map((error) => `${(invalid.item as HistoricalPrice)?.symbol || 'UNKNOWN'}: ${error}`)
    );
    if (validation.invalid.length > 0) {
      console.warn(`Skipped ${validation.invalid.length} malformed historical price rows before storage`);
    }
    prices = validation.valid;
    if (prices.length === 0) {
      return {
        rowsReceived,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: validation.invalid.length,
        rowsNoOp: 0,
        duplicateProviderRowsSkipped,
        warningCount: warnings.length,
        warnings: warnings.slice(0, 10),
      };
    }

    prices = prices.map((price) => ({ ...price, date: this.normalizeUtcDay(price.date) }));

    const regionInfo = regionInfoBySymbol.get(prices[0].symbol) ?? inferRegion(prices[0].symbol);
    const latest = prices.reduce((prev, current) =>
      prev.date > current.date ? prev : current
    );
    const existingRows = await this.prisma.priceTick.findMany({
      where: {
        symbol: prices[0].symbol,
        timestamp: { in: prices.map((price) => price.date) },
      },
      select: { timestamp: true, open: true, high: true, low: true, close: true, adjustedClose: true, volume: true, source: true },
    });
    const existingByTimestamp = new Map(existingRows.map((row) => [row.timestamp.toISOString(), row]));
    const rowsToInsert = prices.filter((price) => !existingByTimestamp.has(price.date.toISOString()));
    const rowsToUpdate = prices.filter((price) => {
      const existing = existingByTimestamp.get(price.date.toISOString());
      return existing ? !this.sameDailyCandle(existing, price) : false;
    });
    const rowsNoOp = prices.length - rowsToInsert.length - rowsToUpdate.length;
    const rowsInserted = rowsToInsert.length;
    const rowsUpdated = rowsToUpdate.length;
    const rowsToWrite = [...rowsToInsert, ...rowsToUpdate];

    console.log(`  Storing ${prices.length} price ticks for ${prices[0].symbol}...`);

    await this.prisma.$transaction(async (tx: any) => {
      const batchSize = 1000;
      for (let i = 0; i < rowsToInsert.length; i += batchSize) {
        const batch = rowsToInsert.slice(i, i + batchSize);
        await tx.priceTick.createMany({
          data: batch.map((price) => {
            const source = price.source || 'yahoo';
            return {
              symbol: price.symbol,
              region: regionInfo.region,
              exchange: regionInfo.exchange,
              timestamp: price.date,
              open: new Prisma.Decimal(price.open),
              high: new Prisma.Decimal(price.high),
              low: new Prisma.Decimal(price.low),
              close: new Prisma.Decimal(price.close),
              adjustedClose: price.adjustedClose !== undefined && price.adjustedClose !== null ? new Prisma.Decimal(price.adjustedClose) : null,
              volume: price.volume !== undefined && price.volume !== null ? BigInt(price.volume) : null,
              source,
              dataStatus: 'COMPLETE',
            };
          }),
          skipDuplicates: true,
        });
      }

      for (let i = 0; i < rowsToUpdate.length; i += batchSize) {
        const batch = rowsToUpdate.slice(i, i + batchSize);
        await Promise.all(batch.map((price) => {
          const source = price.source || 'yahoo';
          return tx.priceTick.update({
            where: {
              symbol_timestamp: {
                symbol: price.symbol,
                timestamp: price.date,
              },
            },
            data: {
              open: new Prisma.Decimal(price.open),
              high: new Prisma.Decimal(price.high),
              low: new Prisma.Decimal(price.low),
              close: new Prisma.Decimal(price.close),
              adjustedClose: price.adjustedClose !== undefined && price.adjustedClose !== null ? new Prisma.Decimal(price.adjustedClose) : null,
              volume: price.volume !== undefined && price.volume !== null ? BigInt(price.volume) : null,
              source,
              region: regionInfo.region,
              exchange: regionInfo.exchange,
              dataStatus: 'COMPLETE',
            },
          });
        }));

        if (batch.length === batchSize) {
          console.log(`    Processed ${Math.min(i + batchSize, rowsToWrite.length)} of ${rowsToWrite.length} changed records...`);
        }
      }

      await tx.latestPrice.upsert({
        where: { symbol: latest.symbol },
        update: {
          region: regionInfo.region,
          price: new Prisma.Decimal(latest.close),
          timestamp: latest.date,
          updatedAt: new Date(),
        },
        create: {
          symbol: latest.symbol,
          region: regionInfo.region,
          price: new Prisma.Decimal(latest.close),
          timestamp: latest.date,
          updatedAt: new Date(),
        },
      });
    }, {
      maxWait: 30000,
      timeout: 60000,
    });

    console.log(`  Successfully stored ${prices.length} price ticks for ${prices[0].symbol}: ${rowsInserted} inserted, ${rowsUpdated} updated, ${rowsNoOp} no-op`);
    return {
      rowsReceived,
      rowsInserted,
      rowsUpdated,
      rowsSkipped: validation.invalid.length,
      rowsNoOp,
      duplicateProviderRowsSkipped,
      warningCount: warnings.length,
      warnings: warnings.slice(0, 10),
    };
  }

  async storeHistoricalBulk(
    prices: HistoricalPrice[],
    inferRegion: YahooFinanceIngestionService['inferRegion'],
    regionInfoBySymbol: Map<string, PriceRegionInfo> = new Map(),
    options: HistoricalStoreOptions = {}
  ): Promise<HistoricalBulkStoreSummary> {
    const rowsReceived = prices.length;
    const receivedBySymbol = new Map<string, number>();
    for (const price of prices) {
      receivedBySymbol.set(price.symbol, (receivedBySymbol.get(price.symbol) || 0) + 1);
    }

    const validation = partitionHistoricalPrices(prices);
    const duplicateProviderRowsSkipped = (validation as any).duplicateProviderRowsSkipped || 0;
    const warningBySymbol = new Map<string, string[]>();
    for (const invalid of validation.invalid) {
      const symbol = (invalid.item as HistoricalPrice)?.symbol || 'UNKNOWN';
      const warnings = invalid.errors.map((error) => `${symbol}: ${error}`);
      warningBySymbol.set(symbol, [...(warningBySymbol.get(symbol) || []), ...warnings]);
    }
    if (validation.invalid.length > 0) {
      console.warn(`Skipped ${validation.invalid.length} malformed historical price rows before bulk storage`);
    }

    const validPrices = validation.valid.map((price) => ({ ...price, date: this.normalizeUtcDay(price.date) }));
    const summaryBySymbol = new Map<string, SyncSummary>();
    const symbols = [...new Set([
      ...Array.from(receivedBySymbol.keys()),
      ...validPrices.map((price) => price.symbol),
    ])];

    if (validPrices.length === 0) {
      const warnings = Array.from(warningBySymbol.values()).flat();
      for (const symbol of symbols) {
        const symbolWarnings = warningBySymbol.get(symbol) || [];
        summaryBySymbol.set(symbol, {
          rowsReceived: receivedBySymbol.get(symbol) || 0,
          rowsInserted: 0,
          rowsUpdated: 0,
          rowsSkipped: symbolWarnings.length > 0 ? 1 : 0,
          rowsNoOp: 0,
          duplicateProviderRowsSkipped,
          warningCount: symbolWarnings.length,
          warnings: symbolWarnings.slice(0, 10),
        });
      }
      return {
        rowsReceived,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: validation.invalid.length,
        rowsNoOp: 0,
        duplicateProviderRowsSkipped,
        warningCount: warnings.length,
        warnings: warnings.slice(0, 10),
        summaryBySymbol,
      };
    }

    const validSymbols = [...new Set(validPrices.map((price) => price.symbol))];
    const validDates = [...new Set(validPrices.map((price) => price.date.toISOString()))].map((date) => new Date(date));
    const existingRows = await this.prisma.priceTick.findMany({
      where: {
        symbol: { in: validSymbols },
        timestamp: { in: validDates },
      },
      select: { symbol: true, timestamp: true, open: true, high: true, low: true, close: true, adjustedClose: true, volume: true, source: true },
    });
    const existingByKey = new Map(existingRows.map((row) => [this.priceStorageKey(row.symbol, row.timestamp), row]));
    const rowsToInsert = validPrices.filter((price) => !existingByKey.has(this.priceStorageKey(price.symbol, price.date)));
    const rowsToUpdate = validPrices.filter((price) => {
      const existing = existingByKey.get(this.priceStorageKey(price.symbol, price.date));
      return existing ? !this.sameDailyCandle(existing, price) : false;
    });
    const rowsNoOp = validPrices.length - rowsToInsert.length - rowsToUpdate.length;
    const latestBySymbol = this.latestHistoricalPriceBySymbol(validPrices);

    console.log(`  Bulk storing ${validPrices.length} price ticks across ${validSymbols.length} symbols...`);

    await this.prisma.$transaction(async (tx: any) => {
      const batchSize = 1000;
      for (let i = 0; i < rowsToInsert.length; i += batchSize) {
        const batch = rowsToInsert.slice(i, i + batchSize);
        await tx.priceTick.createMany({
          data: batch.map((price) => this.priceTickCreateData(price, regionInfoBySymbol.get(price.symbol) ?? inferRegion(price.symbol), options)),
          skipDuplicates: true,
        });
      }

      for (let i = 0; i < rowsToUpdate.length; i += batchSize) {
        const batch = rowsToUpdate.slice(i, i + batchSize);
        await Promise.all(batch.map((price) => {
          const regionInfo = regionInfoBySymbol.get(price.symbol) ?? inferRegion(price.symbol);
          return tx.priceTick.update({
            where: {
              symbol_timestamp: {
                symbol: price.symbol,
                timestamp: price.date,
              },
            },
            data: this.priceTickUpdateData(price, regionInfo, options),
          });
        }));
      }

      const latestEntries = Array.from(latestBySymbol.entries());
      for (let i = 0; i < latestEntries.length; i += 500) {
        const batch = latestEntries.slice(i, i + 500);
        await Promise.all(batch.map(([symbol, latest]) => {
          const regionInfo = regionInfoBySymbol.get(symbol) ?? inferRegion(symbol);
          return tx.latestPrice.upsert({
            where: { symbol },
            update: {
              region: regionInfo.region,
              price: new Prisma.Decimal(latest.close),
              timestamp: latest.date,
              updatedAt: new Date(),
            },
            create: {
              symbol,
              region: regionInfo.region,
              price: new Prisma.Decimal(latest.close),
              timestamp: latest.date,
              updatedAt: new Date(),
            },
          });
        }));
      }
    }, {
      maxWait: 30000,
      timeout: 120000,
    });

    const insertedBySymbol = this.countPricesBySymbol(rowsToInsert);
    const updatedBySymbol = this.countPricesBySymbol(rowsToUpdate);
    const validBySymbol = this.countPricesBySymbol(validPrices);
    for (const symbol of symbols) {
      const symbolWarnings = warningBySymbol.get(symbol) || [];
      const validCount = validBySymbol.get(symbol) || 0;
      const inserted = insertedBySymbol.get(symbol) || 0;
      const updated = updatedBySymbol.get(symbol) || 0;
      summaryBySymbol.set(symbol, {
        rowsReceived: receivedBySymbol.get(symbol) || validCount,
        rowsInserted: inserted,
        rowsUpdated: updated,
        rowsSkipped: symbolWarnings.length > 0 ? 1 : 0,
        rowsNoOp: Math.max(0, validCount - inserted - updated),
        duplicateProviderRowsSkipped,
        warningCount: symbolWarnings.length,
        warnings: symbolWarnings.slice(0, 10),
      });
    }

    const warnings = Array.from(warningBySymbol.values()).flat();
    console.log(`  Successfully bulk stored ${validPrices.length} price ticks: ${rowsToInsert.length} inserted, ${rowsToUpdate.length} updated, ${rowsNoOp} no-op`);
    return {
      rowsReceived,
      rowsInserted: rowsToInsert.length,
      rowsUpdated: rowsToUpdate.length,
      rowsSkipped: validation.invalid.length,
      rowsNoOp,
      duplicateProviderRowsSkipped,
      warningCount: warnings.length,
      warnings: warnings.slice(0, 10),
      summaryBySymbol,
    };
  }

  async latestStoredTradingDateForRegion(region: string, assetType: string): Promise<string | null> {
    const latest = await this.latestDataTimestamp({ region, assetType });
    return latest?.toISOString().slice(0, 10) ?? null;
  }

  async getSyncState(
    region: string,
    assetType: string,
    tradingDate: string,
    options: { scopeType?: MarketDataSyncScopeType; scopeKey?: string; timeframe?: string } = {}
  ): Promise<MarketDataSyncStateDto | null> {
    const scopeType = options.scopeType || 'CATALOG';
    const scopeKey = options.scopeKey || region;
    const timeframe = options.timeframe || '1D';
    const row = await (this.prisma as any).marketDataSyncState.findUnique({
      where: {
        region_assetType_scopeType_scopeKey_timeframe_tradingDate: {
          region,
          assetType,
          scopeType,
          scopeKey,
          timeframe,
          tradingDate: new Date(`${tradingDate}T00:00:00.000Z`),
        },
      },
    });
    return row ? this.toSyncStateDto(row) : null;
  }

  async upsertSyncState(input: {
    region: string;
    assetType: string;
    scopeType?: MarketDataSyncScopeType;
    scopeKey?: string;
    timeframe?: string;
    tradingDate: string;
    status: MarketDataSyncStateStatus;
    summary?: ScheduledRegionSyncSummary | SyncSummary | null;
    lastCheckedAt?: Date;
    lastProviderFetchAt?: Date | null;
  }): Promise<MarketDataSyncStateDto> {
    const summary = input.summary;
    const scopeType = input.scopeType || 'CATALOG';
    const scopeKey = input.scopeKey || input.region;
    const timeframe = input.timeframe || '1D';
    const lastCheckedAt = input.lastCheckedAt || new Date();
    const row = await (this.prisma as any).marketDataSyncState.upsert({
      where: {
        region_assetType_scopeType_scopeKey_timeframe_tradingDate: {
          region: input.region,
          assetType: input.assetType,
          scopeType,
          scopeKey,
          timeframe,
          tradingDate: new Date(`${input.tradingDate}T00:00:00.000Z`),
        },
      },
      create: {
        region: input.region,
        assetType: input.assetType,
        scopeType,
        scopeKey,
        timeframe,
        tradingDate: new Date(`${input.tradingDate}T00:00:00.000Z`),
        status: input.status,
        lastCheckedAt,
        lastProviderFetchAt: input.lastProviderFetchAt,
        lastRunAt: lastCheckedAt,
        lastInsertedCount: summary?.rowsInserted ?? 0,
        lastUpdatedCount: summary?.rowsUpdated ?? 0,
        lastNoOpCount: summary?.rowsNoOp ?? 0,
        lastSkippedCount: summary?.providerFetchSkippedCount ?? summary?.skippedBeforeFetchCount ?? 0,
        lastWarningCount: summary?.warningCount ?? 0,
        lastSummary: summary as any,
      },
      update: {
        status: input.status,
        lastCheckedAt,
        lastProviderFetchAt: input.lastProviderFetchAt === undefined ? undefined : input.lastProviderFetchAt,
        lastRunAt: lastCheckedAt,
        lastInsertedCount: summary?.rowsInserted ?? 0,
        lastUpdatedCount: summary?.rowsUpdated ?? 0,
        lastNoOpCount: summary?.rowsNoOp ?? 0,
        lastSkippedCount: summary?.providerFetchSkippedCount ?? summary?.skippedBeforeFetchCount ?? 0,
        lastWarningCount: summary?.warningCount ?? 0,
        lastSummary: summary as any,
      },
    });
    return this.toSyncStateDto(row);
  }

  async updateCompanyMasterData(stockId: string, data: Partial<CreateStockRequest>) {
    const current = await this.prisma.stock.findUnique({ where: { id: stockId } });
    if (!current) {
      throw new Error('Stock not found');
    }
    const nextMarketCap = data.marketCap !== undefined && data.marketCap !== null
      ? new Prisma.Decimal(data.marketCap)
      : current.marketCap;

    return this.prisma.stock.update({
      where: { id: stockId },
      data: {
        name: this.keepExistingRequiredIfBlank(data.name, current.name),
        region: this.keepExistingRequiredIfBlank(data.region, current.region),
        exchange: this.keepExistingIfBlank(data.exchange, current.exchange),
        country: this.keepExistingIfBlank(data.country, current.country),
        sector: this.keepExistingIfBlank(data.sector, current.sector),
        industry: this.keepExistingIfBlank(data.industry, current.industry),
        currency: this.keepExistingIfBlank(data.currency, current.currency),
        marketCap: nextMarketCap,
        assetType: this.keepExistingIfBlank(data.assetType, current.assetType),
        instrumentSegment: this.keepExistingIfBlank(data.instrumentSegment, (current as any).instrumentSegment),
        displaySymbol: this.keepExistingIfBlank(data.displaySymbol, (current as any).displaySymbol),
        providerSymbol: this.keepExistingIfBlank(data.providerSymbol, (current as any).providerSymbol),
        sourceSymbol: this.keepExistingIfBlank(data.sourceSymbol, (current as any).sourceSymbol),
        catalogSource: this.keepExistingIfBlank(data.catalogSource, (current as any).catalogSource),
        providerSupportStatus: this.keepExistingIfBlank(data.providerSupportStatus, (current as any).providerSupportStatus),
        providerError: data.providerError === undefined ? (current as any).providerError : data.providerError,
        derivativesEligible: data.derivativesEligible ?? (current as any).derivativesEligible,
        underlyingSymbol: this.keepExistingIfBlank(data.underlyingSymbol, (current as any).underlyingSymbol),
        expiryDate: data.expiryDate ?? (current as any).expiryDate,
        contractMonth: this.keepExistingIfBlank(data.contractMonth, (current as any).contractMonth),
        lotSize: data.lotSize ?? (current as any).lotSize,
        contractStatus: this.keepExistingIfBlank(data.contractStatus, (current as any).contractStatus),
        isDelisted: data.isDelisted ?? current.isDelisted,
        ipoDate: data.ipoDate ?? current.ipoDate,
        isin: this.keepExistingIfBlank(data.isin, current.isin),
        source: data.source ?? current.source ?? 'yahoo',
        dataStatus: 'PARTIAL',
      },
    });
  }

  async upsertFundamentals(stockId: string, fundamentals: CoreFundamentals) {
    const periodEndDate = this.normalizePeriodEndDate(fundamentals.asOf);
    const dataStatus = fundamentals.revenue || fundamentals.earnings || fundamentals.eps || fundamentals.ratios.trailingPe
      ? 'PARTIAL'
      : 'MISSING';

    return (this.prisma as any).fundamental.upsert({
      where: {
        stockId_periodType_periodEndDate_source: {
          stockId,
          periodType: fundamentals.periodType,
          periodEndDate,
          source: fundamentals.source,
        },
      },
      update: {
        revenue: fundamentals.revenue !== null ? new Prisma.Decimal(fundamentals.revenue) : null,
        eps: fundamentals.eps !== null ? new Prisma.Decimal(fundamentals.eps) : null,
        netIncome: fundamentals.earnings !== null ? new Prisma.Decimal(fundamentals.earnings) : null,
        peRatio: fundamentals.ratios.trailingPe !== null ? new Prisma.Decimal(fundamentals.ratios.trailingPe) : null,
        dividendYield: fundamentals.dividendYield !== null ? new Prisma.Decimal(fundamentals.dividendYield) : null,
        sharesOutstanding: fundamentals.sharesOutstanding !== null ? BigInt(Math.trunc(fundamentals.sharesOutstanding)) : null,
        marketCap: fundamentals.marketCap !== null ? new Prisma.Decimal(fundamentals.marketCap) : null,
        currency: fundamentals.currency,
        periodEndDate,
        dataStatus,
      },
      create: {
        stockId,
        revenue: fundamentals.revenue !== null ? new Prisma.Decimal(fundamentals.revenue) : null,
        eps: fundamentals.eps !== null ? new Prisma.Decimal(fundamentals.eps) : null,
        netIncome: fundamentals.earnings !== null ? new Prisma.Decimal(fundamentals.earnings) : null,
        peRatio: fundamentals.ratios.trailingPe !== null ? new Prisma.Decimal(fundamentals.ratios.trailingPe) : null,
        dividendYield: fundamentals.dividendYield !== null ? new Prisma.Decimal(fundamentals.dividendYield) : null,
        sharesOutstanding: fundamentals.sharesOutstanding !== null ? BigInt(Math.trunc(fundamentals.sharesOutstanding)) : null,
        marketCap: fundamentals.marketCap !== null ? new Prisma.Decimal(fundamentals.marketCap) : null,
        currency: fundamentals.currency,
        periodType: fundamentals.periodType,
        periodEndDate,
        source: fundamentals.source,
        dataStatus,
      },
    });
  }

  async upsertManualVerifiedFundamental(stockId: string, input: ManualVerifiedFundamentalInput) {
    const periodEndDate = this.normalizeUtcDay(input.periodEndDate);
    const validatedAt = input.validatedAt || new Date();
    const data = {
      revenue: input.revenue !== undefined && input.revenue !== null ? new Prisma.Decimal(input.revenue) : null,
      eps: input.eps !== undefined && input.eps !== null ? new Prisma.Decimal(input.eps) : null,
      netIncome: input.netIncome !== undefined && input.netIncome !== null ? new Prisma.Decimal(input.netIncome) : null,
      peRatio: input.peRatio !== undefined && input.peRatio !== null ? new Prisma.Decimal(input.peRatio) : null,
      marketCap: input.marketCap !== undefined && input.marketCap !== null ? new Prisma.Decimal(input.marketCap) : null,
      currency: input.currency ?? 'INR',
      sourceNote: input.sourceNote ?? null,
      sourceUrl: input.sourceUrl ?? null,
      validatedBy: input.validatedBy ?? null,
      validatedAt,
      dataStatus: 'PARTIAL',
    };

    return (this.prisma as any).fundamental.upsert({
      where: {
        stockId_periodType_periodEndDate_source: {
          stockId,
          periodType: input.periodType,
          periodEndDate,
          source: 'MANUAL_VERIFIED',
        },
      },
      update: data,
      create: {
        stockId,
        periodType: input.periodType,
        periodEndDate,
        source: 'MANUAL_VERIFIED',
        ...data,
      },
    });
  }

  async listFundamentals(stockId: string) {
    return (this.prisma as any).fundamental.findMany({
      where: { stockId },
      orderBy: { periodEndDate: 'desc' },
    });
  }

  async upsertCorporateActions(stockId: string, actions: CorporateAction[]) {
    const normalizedActions = new Map<string, CorporateAction & { normalizedEffectiveDate: Date; normalizedSource: string; naturalKey: string }>();
    for (const action of actions) {
      const effectiveDate = this.normalizeUtcDay(action.date);
      const source = action.source || 'unknown';
      const key = this.corporateActionNaturalKeyFromParts({
        stockId,
        actionType: action.type,
        effectiveDate,
        source,
        amount: action.amount,
        splitRatio: action.splitRatio,
      });
      const existing = normalizedActions.get(key);
      normalizedActions.set(key, {
        ...existing,
        ...action,
        source,
        amount: action.amount ?? existing?.amount ?? null,
        splitRatio: action.splitRatio ?? existing?.splitRatio ?? null,
        currency: action.currency ?? existing?.currency ?? null,
        declaredDate: action.declaredDate ?? existing?.declaredDate,
        paymentDate: action.paymentDate ?? existing?.paymentDate,
        normalizedEffectiveDate: effectiveDate,
        normalizedSource: source,
        naturalKey: key,
      });
    }

    const operations = [...normalizedActions.values()].map((action) => {
      const effectiveDate = action.normalizedEffectiveDate;
      return (this.prisma as any).corporateAction.upsert({
        where: {
          naturalKey: action.naturalKey,
        },
        update: {
          naturalKey: action.naturalKey,
          declaredDate: action.declaredDate ? new Date(action.declaredDate) : null,
          paymentDate: action.paymentDate ? new Date(action.paymentDate) : null,
          amount: action.amount !== undefined && action.amount !== null ? new Prisma.Decimal(action.amount) : null,
          splitRatio: action.splitRatio !== undefined && action.splitRatio !== null ? new Prisma.Decimal(action.splitRatio) : null,
          currency: action.currency ?? null,
          dataStatus: 'COMPLETE',
        },
        create: {
          stockId,
          actionType: action.type,
          effectiveDate,
          naturalKey: action.naturalKey,
          declaredDate: action.declaredDate ? new Date(action.declaredDate) : null,
          paymentDate: action.paymentDate ? new Date(action.paymentDate) : null,
          amount: action.amount !== undefined && action.amount !== null ? new Prisma.Decimal(action.amount) : null,
          splitRatio: action.splitRatio !== undefined && action.splitRatio !== null ? new Prisma.Decimal(action.splitRatio) : null,
          currency: action.currency ?? null,
          source: action.normalizedSource,
          dataStatus: 'COMPLETE',
        },
      });
    });

    return Promise.all(operations);
  }

  async listCorporateActions(stockId: string) {
    const rows = await (this.prisma as any).corporateAction.findMany({
      where: { stockId },
      orderBy: { effectiveDate: 'desc' },
    });
    return this.dedupeCorporateActionRows(rows);
  }

  async dedupeCorporateActions(stockId: string): Promise<{ deletedCount: number; remainingCount: number }> {
    const rows = await (this.prisma as any).corporateAction.findMany({
      where: { stockId },
      orderBy: { effectiveDate: 'desc' },
    });
    const grouped = this.groupCorporateActionRows(rows);
    const deleteIds: string[] = [];
    for (const group of grouped.values()) {
      if (group.length <= 1) continue;
      const [keeper, ...duplicates] = this.sortCorporateActionKeepers(group);
      void keeper;
      deleteIds.push(...duplicates.map((row) => row.id).filter(Boolean));
    }
    if (deleteIds.length > 0) {
      await (this.prisma as any).corporateAction.deleteMany({ where: { id: { in: deleteIds } } });
    }
    return { deletedCount: deleteIds.length, remainingCount: rows.length - deleteIds.length };
  }

  async upsertFxRate(input: FxRateInput) {
    return (this.prisma as any).fxRate.upsert({
      where: { pair: input.pair },
      update: {
        rate: new Prisma.Decimal(input.rate),
        rateTimestamp: input.rateTimestamp,
        source: input.source,
        dataStatus: input.dataStatus ?? 'COMPLETE',
      },
      create: {
        pair: input.pair,
        baseCurrency: input.baseCurrency,
        quoteCurrency: input.quoteCurrency,
        rate: new Prisma.Decimal(input.rate),
        rateTimestamp: input.rateTimestamp,
        source: input.source,
        dataStatus: input.dataStatus ?? 'COMPLETE',
      },
    });
  }

  async listFxRates() {
    return (this.prisma as any).fxRate.findMany({ orderBy: { pair: 'asc' } });
  }

  async findFxRate(pair: string) {
    return (this.prisma as any).fxRate.findUnique({ where: { pair } });
  }

  private normalizePeriodEndDate(value: string | Date): Date {
    return this.normalizeUtcDay(value);
  }

  private normalizeUtcDay(value: string | Date): Date {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private dedupeCorporateActionRows(rows: any[]) {
    return [...this.groupCorporateActionRows(rows).values()]
      .map((group) => this.sortCorporateActionKeepers(group)[0])
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
  }

  private groupCorporateActionRows(rows: any[]) {
    const groups = new Map<string, any[]>();
    for (const row of rows) {
      const key = this.corporateActionNaturalKey(row);
      groups.set(key, [...(groups.get(key) || []), row]);
    }
    return groups;
  }

  private corporateActionNaturalKey(row: any) {
    const effectiveDate = this.normalizeUtcDay(row.effectiveDate || row.date).toISOString().slice(0, 10);
    return this.corporateActionNaturalKeyFromParts({
      stockId: row.stockId,
      actionType: row.actionType || row.type,
      effectiveDate,
      source: row.source,
      amount: row.amount,
      splitRatio: row.splitRatio,
    });
  }

  private corporateActionNaturalKeyFromParts(row: { stockId: string; actionType: string; effectiveDate: Date | string; source?: string | null; amount?: unknown; splitRatio?: unknown }) {
    const effectiveDate = row.effectiveDate instanceof Date
      ? this.normalizeUtcDay(row.effectiveDate).toISOString().slice(0, 10)
      : String(row.effectiveDate).slice(0, 10);
    return [
      row.stockId,
      String(row.actionType || '').toLowerCase(),
      effectiveDate,
      String(row.source || 'unknown').toLowerCase(),
      this.decimalKey(row.amount),
      this.decimalKey(row.splitRatio),
    ].join('|');
  }

  private sortCorporateActionKeepers(rows: any[]) {
    return [...rows].sort((a, b) => {
      const aMidnight = new Date(a.effectiveDate).toISOString().endsWith('T00:00:00.000Z') ? 1 : 0;
      const bMidnight = new Date(b.effectiveDate).toISOString().endsWith('T00:00:00.000Z') ? 1 : 0;
      if (aMidnight !== bMidnight) return bMidnight - aMidnight;
      return new Date(b.lastUpdatedTimestamp || b.ingestionTimestamp || b.effectiveDate).getTime()
        - new Date(a.lastUpdatedTimestamp || a.ingestionTimestamp || a.effectiveDate).getTime();
    });
  }

  private decimalKey(value: unknown) {
    if (value === null || value === undefined) return 'null';
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(8).replace(/\.?0+$/, '') : String(value);
  }

  private priceStorageKey(symbol: string, timestamp: Date): string {
    return `${symbol}|${timestamp.toISOString()}`;
  }

  private providerSourceWhere(): Prisma.StringNullableFilter {
    return {
      in: PROVIDER_MARKET_DATA_SOURCES,
      mode: 'insensitive',
    };
  }

  private priceTickCreateData(price: HistoricalPrice, regionInfo: PriceRegionInfo, options: HistoricalStoreOptions = {}) {
    const source = price.source || 'yahoo';
    return {
      symbol: price.symbol,
      region: regionInfo.region,
      exchange: regionInfo.exchange ?? null,
      timestamp: price.date,
      open: new Prisma.Decimal(price.open),
      high: new Prisma.Decimal(price.high),
      low: new Prisma.Decimal(price.low),
      close: new Prisma.Decimal(price.close),
      adjustedClose: price.adjustedClose !== undefined && price.adjustedClose !== null ? new Prisma.Decimal(price.adjustedClose) : null,
      volume: price.volume !== undefined && price.volume !== null ? BigInt(price.volume) : null,
      source,
      sourceFileImportId: options.sourceFileImportId ?? null,
      dataStatus: 'COMPLETE',
    };
  }

  private priceTickUpdateData(price: HistoricalPrice, regionInfo: PriceRegionInfo, options: HistoricalStoreOptions = {}) {
    const source = price.source || 'yahoo';
    return {
      open: new Prisma.Decimal(price.open),
      high: new Prisma.Decimal(price.high),
      low: new Prisma.Decimal(price.low),
      close: new Prisma.Decimal(price.close),
      adjustedClose: price.adjustedClose !== undefined && price.adjustedClose !== null ? new Prisma.Decimal(price.adjustedClose) : null,
      volume: price.volume !== undefined && price.volume !== null ? BigInt(price.volume) : null,
      source,
      ...(options.sourceFileImportId !== undefined ? { sourceFileImportId: options.sourceFileImportId } : {}),
      region: regionInfo.region,
      exchange: regionInfo.exchange ?? null,
      dataStatus: 'COMPLETE',
    };
  }

  private latestHistoricalPriceBySymbol(prices: HistoricalPrice[]): Map<string, HistoricalPrice> {
    const latestBySymbol = new Map<string, HistoricalPrice>();
    for (const price of prices) {
      const current = latestBySymbol.get(price.symbol);
      if (!current || current.date < price.date) {
        latestBySymbol.set(price.symbol, price);
      }
    }
    return latestBySymbol;
  }

  private countPricesBySymbol(prices: HistoricalPrice[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const price of prices) {
      counts.set(price.symbol, (counts.get(price.symbol) || 0) + 1);
    }
    return counts;
  }

  private sameDailyCandle(existing: any, price: HistoricalPrice): boolean {
    return this.sameDecimal(existing.open, price.open)
      && this.sameDecimal(existing.high, price.high)
      && this.sameDecimal(existing.low, price.low)
      && this.sameDecimal(existing.close, price.close)
      && this.sameNullableDecimal(existing.adjustedClose, price.adjustedClose ?? null)
      && this.sameNullableBigInt(existing.volume, price.volume ?? null)
      && String(existing.source || 'yahoo') === String(price.source || 'yahoo');
  }

  private sameDecimal(left: unknown, right: number, tolerance = 0.000001): boolean {
    return Math.abs(Number(left) - Number(right)) <= tolerance;
  }

  private sameNullableDecimal(left: unknown, right: number | null, tolerance = 0.000001): boolean {
    if (left === null || left === undefined || right === null || right === undefined) return (left === null || left === undefined) && (right === null || right === undefined);
    return this.sameDecimal(left, right, tolerance);
  }

  private sameNullableBigInt(left: unknown, right: number | null): boolean {
    if (left === null || left === undefined || right === null || right === undefined) return (left === null || left === undefined) && (right === null || right === undefined);
    return BigInt(left as any) === BigInt(right);
  }

  private toSyncStateDto(row: any): MarketDataSyncStateDto {
    return {
      region: row.region,
      assetType: row.assetType,
      scopeType: row.scopeType || 'CATALOG',
      scopeKey: row.scopeKey || row.region,
      timeframe: row.timeframe || '1D',
      tradingDate: row.tradingDate.toISOString().slice(0, 10),
      status: row.status,
      lastCheckedAt: row.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
      lastProviderFetchAt: row.lastProviderFetchAt ? row.lastProviderFetchAt.toISOString() : null,
      lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
      lastInsertedCount: row.lastInsertedCount,
      lastUpdatedCount: row.lastUpdatedCount,
      lastNoOpCount: row.lastNoOpCount,
      lastSkippedCount: row.lastSkippedCount ?? 0,
      lastWarningCount: row.lastWarningCount,
      lastSummary: row.lastSummary,
    };
  }

  private catalogUpdateData(existing: any, data: CreateStockRequest): Prisma.StockUpdateInput {
    const next: Prisma.StockUpdateInput = {};
    this.assignIfChanged(next, 'name', this.keepExistingRequiredIfBlank(data.name, existing.name), existing.name);
    this.assignIfChanged(next, 'region', this.keepExistingRequiredIfBlank(data.region, existing.region), existing.region);
    this.assignIfChanged(next, 'exchange', this.keepExistingIfBlank(data.exchange, existing.exchange), existing.exchange);
    this.assignIfChanged(next, 'country', this.keepExistingIfBlank(data.country, existing.country), existing.country);
    this.assignIfChanged(next, 'sector', this.keepExistingIfBlank(data.sector, existing.sector), existing.sector);
    this.assignIfChanged(next, 'industry', this.keepExistingIfBlank(data.industry, existing.industry), existing.industry);
    this.assignIfChanged(next, 'currency', this.keepExistingIfBlank(data.currency, existing.currency), existing.currency);
    this.assignIfChanged(next, 'assetType', this.keepExistingIfBlank(data.assetType, existing.assetType), existing.assetType);
    this.assignIfChanged(next, 'instrumentSegment', this.keepExistingIfBlank(data.instrumentSegment, existing.instrumentSegment), existing.instrumentSegment);
    this.assignIfChanged(next, 'displaySymbol', this.keepExistingIfBlank(data.displaySymbol, existing.displaySymbol), existing.displaySymbol);
    this.assignIfChanged(next, 'providerSymbol', this.keepExistingIfBlank(data.providerSymbol, existing.providerSymbol), existing.providerSymbol);
    this.assignIfChanged(next, 'sourceSymbol', this.keepExistingIfBlank(data.sourceSymbol, existing.sourceSymbol), existing.sourceSymbol);
    this.assignIfChanged(next, 'catalogSource', this.keepExistingIfBlank(data.catalogSource, existing.catalogSource), existing.catalogSource);
    this.assignIfChanged(next, 'providerSupportStatus', this.keepExistingIfBlank(data.providerSupportStatus, existing.providerSupportStatus), existing.providerSupportStatus);
    this.assignIfChanged(next, 'providerError', data.providerError === undefined ? existing.providerError : data.providerError, existing.providerError);
    this.assignIfChanged(next, 'derivativesEligible', Boolean(existing.derivativesEligible) || Boolean(data.derivativesEligible), existing.derivativesEligible);
    this.assignIfChanged(next, 'underlyingSymbol', this.keepExistingIfBlank(data.underlyingSymbol, existing.underlyingSymbol), existing.underlyingSymbol);
    this.assignIfChanged(next, 'contractMonth', this.keepExistingIfBlank(data.contractMonth, existing.contractMonth), existing.contractMonth);
    this.assignIfChanged(next, 'lotSize', data.lotSize ?? existing.lotSize, existing.lotSize);
    this.assignIfChanged(next, 'contractStatus', this.keepExistingIfBlank(data.contractStatus, existing.contractStatus), existing.contractStatus);
    if (data.marketCap !== undefined && data.marketCap !== null && String(data.marketCap) !== String(existing.marketCap)) {
      next.marketCap = new Prisma.Decimal(data.marketCap);
    }
    if (data.expiryDate && data.expiryDate.getTime() !== existing.expiryDate?.getTime?.()) {
      next.expiryDate = data.expiryDate;
    }
    if (data.ipoDate && data.ipoDate.getTime() !== existing.ipoDate?.getTime?.()) {
      next.ipoDate = data.ipoDate;
    }
    this.assignIfChanged(next, 'isin', this.keepExistingIfBlank(data.isin, existing.isin), existing.isin);
    if (data.isDelisted !== undefined && data.isDelisted !== existing.isDelisted) next.isDelisted = data.isDelisted;
    if (data.isActive !== undefined && data.isActive !== existing.isActive) next.isActive = data.isActive;
    if (Object.keys(next).length > 0) {
      next.source = data.catalogSource || existing.source || 'catalog';
      next.dataStatus = data.dataStatus || existing.dataStatus || 'PARTIAL';
    }
    return next;
  }

  private catalogIdentityUpdateData(existing: any, data: CreateStockRequest, force: boolean): Prisma.StockUpdateInput {
    const next: Prisma.StockUpdateInput = {};
    this.assignIdentityIfChanged(next, 'exchange', data.exchange, existing.exchange, force);
    this.assignIdentityIfChanged(next, 'country', data.country, existing.country, force);
    this.assignIdentityIfChanged(next, 'currency', data.currency, existing.currency, force);
    this.assignIdentityIfChanged(next, 'assetType', data.assetType, existing.assetType, force);
    this.assignIdentityIfChanged(next, 'instrumentSegment', data.instrumentSegment, existing.instrumentSegment, force);
    this.assignIdentityIfChanged(next, 'displaySymbol', data.displaySymbol, existing.displaySymbol, force);
    this.assignIdentityIfChanged(next, 'providerSymbol', data.providerSymbol, existing.providerSymbol, force);
    this.assignIdentityIfChanged(next, 'sourceSymbol', data.sourceSymbol, existing.sourceSymbol, force);
    this.assignIdentityIfChanged(next, 'catalogSource', data.catalogSource, existing.catalogSource, force);
    this.assignIdentityIfChanged(next, 'isin', data.isin, existing.isin, force);
    if (data.ipoDate && (force || !existing.ipoDate) && data.ipoDate.getTime() !== existing.ipoDate?.getTime?.()) {
      next.ipoDate = data.ipoDate;
    }
    if (Object.keys(next).length > 0) {
      next.source = data.catalogSource || data.source || existing.source || 'catalog';
      next.dataStatus = data.dataStatus || existing.dataStatus || 'PARTIAL';
    }
    return next;
  }

  private assignIfChanged(target: Prisma.StockUpdateInput, key: string, next: unknown, current: unknown) {
    if (next === undefined || next === null) return;
    if (next !== current) (target as any)[key] = next;
  }

  private assignIdentityIfChanged(target: Prisma.StockUpdateInput, key: string, next: unknown, current: unknown, force: boolean) {
    if (next === undefined || next === null) return;
    if (typeof next === 'string' && next.trim().length === 0) return;
    if (!force && current !== null && current !== undefined && !(typeof current === 'string' && current.trim().length === 0)) return;
    if (next !== current) (target as any)[key] = next;
  }

  private businessMetadataRepairWhere(
    options: Pick<PaginationOptions, 'region' | 'assetType'>,
    stateOptions: { includeManualRequired?: boolean; includeRetryable?: boolean } = {}
  ): Prisma.StockWhereInput {
    const and: Prisma.StockWhereInput[] = [
      this.stockWhere(options),
      { isActive: true },
      { isDelisted: false },
      { providerSupportStatus: { equals: 'SUPPORTED', mode: 'insensitive' } },
      this.businessMetadataMissingWhere(),
    ];
    const now = new Date();
    const excludedStates: Prisma.MarketDataRepairStateWhereInput[] = [];
    if (!stateOptions.includeManualRequired) excludedStates.push({ status: 'MANUAL_REQUIRED' } as any);
    if (!stateOptions.includeRetryable) {
      excludedStates.push(
        { status: 'RETRY_COOLDOWN' } as any,
        { status: 'FAILED_RETRYABLE', nextRetryAt: { gt: now } } as any
      );
    }
    if (excludedStates.length > 0) {
      and.push({
        marketDataRepairStates: {
          none: {
            repairType: 'PROVIDER_BUSINESS_METADATA',
            OR: excludedStates,
          },
        },
      } as any);
    }
    return { AND: and };
  }

  private providerValidationWhere(
    options: Pick<PaginationOptions, 'region' | 'assetType'>,
    queue: ProviderValidationQueue,
    stateOptions: { force?: boolean } = {}
  ): Prisma.StockWhereInput {
    const now = new Date();
    const retryStateWhere: Prisma.MarketDataRepairStateWhereInput = {
      repairType: 'PROVIDER_VALIDATION',
    } as any;
    if (!stateOptions.force) {
      (retryStateWhere as any).OR = [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }];
    }
    return {
      AND: [
        this.stockWhere(options),
        { isActive: true },
        { isDelisted: false },
        queue === 'RETRY_FAILED'
          ? {
            AND: [
              { providerSupportStatus: { equals: 'VALIDATION_FAILED', mode: 'insensitive' } },
              {
                OR: [
                  { marketDataRepairStates: { none: { repairType: 'PROVIDER_VALIDATION' } } } as any,
                  {
                    marketDataRepairStates: {
                      some: {
                        ...retryStateWhere,
                        status: { in: ['FAILED_RETRYABLE', 'RETRY_COOLDOWN'] },
                      } as any,
                    },
                  } as any,
                ],
              },
              { marketDataRepairStates: { none: { repairType: 'PROVIDER_VALIDATION', status: 'MANUAL_REQUIRED' } } } as any,
            ],
          }
          : {
            OR: [
              { providerSupportStatus: null },
              { providerSupportStatus: '' },
              { providerSupportStatus: { equals: 'UNKNOWN', mode: 'insensitive' } },
            ],
          },
      ],
    };
  }

  private businessMetadataMissingWhere(): Prisma.StockWhereInput {
    return {
      OR: [
        this.invalidStringWhere('sector'),
        this.invalidStringWhere('industry'),
        { marketCap: null },
        { marketCap: { lte: 0 } },
      ],
    };
  }

  private invalidStringWhere(field: 'sector' | 'industry'): Prisma.StockWhereInput {
    return {
      OR: [
        { [field]: null } as Prisma.StockWhereInput,
        { [field]: '' } as Prisma.StockWhereInput,
        { [field]: { equals: 'UNKNOWN', mode: 'insensitive' } } as Prisma.StockWhereInput,
        { [field]: { equals: 'N/A', mode: 'insensitive' } } as Prisma.StockWhereInput,
        { [field]: { equals: 'NA', mode: 'insensitive' } } as Prisma.StockWhereInput,
        { [field]: { equals: 'NONE', mode: 'insensitive' } } as Prisma.StockWhereInput,
        { [field]: { equals: 'NULL', mode: 'insensitive' } } as Prisma.StockWhereInput,
      ],
    };
  }

  private scopedStockSqlWhere(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}): Prisma.Sql {
    const filters: Prisma.Sql[] = [];
    const normalizedRegion = normalizeMarketRegion(options.region);
    if (normalizedRegion) {
      switch (normalizedRegion) {
        case 'IN':
          filters.push(Prisma.sql`(
            stocks.region = ${'IN'}
            OR UPPER(stocks.country) IN (${Prisma.join(['IN', 'INDIA'])})
            OR UPPER(stocks.exchange) IN (${Prisma.join(['NSE', 'BSE'])})
          )`);
          break;
        case 'US':
          filters.push(Prisma.sql`(
            stocks.region = ${'US'}
            OR UPPER(stocks.country) IN (${Prisma.join(['US', 'USA', 'UNITED STATES'])})
            OR UPPER(stocks.exchange) IN (${Prisma.join(['NASDAQ', 'NYSE', 'AMEX'])})
          )`);
          break;
        case 'EU':
          filters.push(Prisma.sql`(
            stocks.region = ${'EU'}
            OR UPPER(stocks.country) IN (${Prisma.join(['UK', 'UNITED KINGDOM', 'DE', 'GERMANY', 'FR', 'FRANCE', 'IT', 'ITALY', 'ES', 'SPAIN', 'NL', 'NETHERLANDS'])})
            OR UPPER(stocks.exchange) IN (${Prisma.join(['LSE', 'XETRA', 'EURONEXT', 'BME'])})
          )`);
          break;
        default:
          filters.push(Prisma.sql`stocks.region = ${normalizedRegion}`);
          break;
      }
    }

    const normalizedAssetType = options.assetType?.trim().toUpperCase();
    if (normalizedAssetType) {
      if (normalizedAssetType === 'STOCK' || normalizedAssetType === 'EQUITY') {
        filters.push(Prisma.sql`(
          (
            UPPER(stocks."assetType") IN (${Prisma.join(['STOCK', 'EQUITY'])})
            OR stocks."assetType" IS NULL
          )
          AND NOT (
            UPPER(COALESCE(stocks."assetType", '')) IN (${Prisma.join(['FUTURE', 'FUTURES'])})
            OR UPPER(COALESCE(stocks."instrumentSegment", '')) = ${'FUTURES'}
          )
        )`);
      } else if (normalizedAssetType === 'FUTURE' || normalizedAssetType === 'FUTURES') {
        filters.push(Prisma.sql`(
          UPPER(stocks."assetType") IN (${Prisma.join(['FUTURE', 'FUTURES'])})
          OR UPPER(COALESCE(stocks."instrumentSegment", '')) = ${'FUTURES'}
        )`);
      } else if (normalizedAssetType === 'FOREX' || normalizedAssetType === 'FX' || normalizedAssetType === 'CURRENCY') {
        filters.push(Prisma.sql`UPPER(stocks."assetType") IN (${Prisma.join(['FOREX', 'FX', 'CURRENCY'])})`);
      } else {
        filters.push(Prisma.sql`UPPER(stocks."assetType") = ${normalizedAssetType}`);
      }
    }

    return filters.length > 0 ? Prisma.join(filters, ' AND ') : Prisma.sql`TRUE`;
  }

  private activeStockSyncTaskSqlWhere(options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {}): Prisma.Sql {
    const filters: Prisma.Sql[] = [
      this.scopedStockSqlWhere(options),
      Prisma.sql`stocks."isActive" = TRUE`,
      Prisma.sql`(
        stocks."providerSupportStatus" IS NULL
        OR UPPER(stocks."providerSupportStatus") IN (${Prisma.join(['SUPPORTED', 'UNKNOWN'])})
      )`,
    ];
    const normalizedSegment = options.instrumentSegment?.trim().toUpperCase();
    if (normalizedSegment) {
      if (normalizedSegment === 'CASH') {
        filters.push(Prisma.sql`(
          (
            UPPER(stocks."assetType") IN (${Prisma.join(['STOCK', 'EQUITY'])})
            OR stocks."assetType" IS NULL
          )
          AND NOT (
            UPPER(COALESCE(stocks."assetType", '')) IN (${Prisma.join(['FUTURE', 'FUTURES'])})
            OR UPPER(COALESCE(stocks."instrumentSegment", '')) = ${'FUTURES'}
          )
        )`);
      } else if (normalizedSegment === 'FUTURES') {
        filters.push(Prisma.sql`(
          UPPER(stocks."assetType") IN (${Prisma.join(['FUTURE', 'FUTURES'])})
          OR UPPER(COALESCE(stocks."instrumentSegment", '')) = ${'FUTURES'}
        )`);
      } else {
        filters.push(Prisma.sql`UPPER(COALESCE(stocks."instrumentSegment", stocks."assetType", '')) = ${normalizedSegment}`);
      }
    }
    return Prisma.join(filters, ' AND ');
  }

  private stockWhere(options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'>): Prisma.StockWhereInput {
    const filters: Prisma.StockWhereInput[] = [];
    const regionFilter = resolveMarketRegionFilter(options.region);
    if (Object.keys(regionFilter).length > 0) filters.push(regionFilter);
    const assetType = options.assetType?.trim();
    if (assetType) {
      filters.push(this.assetTypeWhere(assetType));
    }
    const segmentWhere = this.segmentWhere(options.instrumentSegment);
    if (segmentWhere) filters.push(segmentWhere);
    return filters.length > 0 ? { AND: filters } : {};
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    return value.toNumber();
  }

  private safeStockSortBy(sortBy?: string): string {
    const allowed = new Set(['symbol', 'name', 'marketCap', 'country', 'exchange', 'sector', 'industry', 'currency', 'assetType', 'lastSuccessfulDataLoadTimestamp', 'createdAt']);
    return allowed.has(sortBy || '') ? sortBy as any : 'symbol';
  }

  private assetTypeWhere(assetType: string): Prisma.StockWhereInput {
    const normalized = assetType.trim().toUpperCase();
    if (normalized === 'STOCK' || normalized === 'EQUITY') {
      return {
        AND: [
          {
            OR: [
              { assetType: { in: ['STOCK', 'EQUITY'], mode: 'insensitive' } },
              { assetType: null },
            ],
          },
          this.notFuturesSymbolWhere(),
        ],
      };
    }
    if (normalized === 'FUTURE' || normalized === 'FUTURES') return this.futuresWhere();
    if (normalized === 'FOREX' || normalized === 'FX' || normalized === 'CURRENCY') {
      return { assetType: { in: ['FOREX', 'FX', 'CURRENCY'], mode: 'insensitive' } };
    }
    return { assetType: { equals: normalized, mode: 'insensitive' } };
  }

  private segmentWhere(segment?: string | null): Prisma.StockWhereInput | null {
    const normalized = segment?.trim().toUpperCase();
    if (!normalized) return null;
    if (normalized === 'CASH') {
      return {
        AND: [
          {
            OR: [
              { assetType: { in: ['STOCK', 'EQUITY'], mode: 'insensitive' } },
              { assetType: null },
            ],
          },
          this.notFuturesSymbolWhere(),
        ],
      };
    }
    if (normalized === 'FUTURES') return this.futuresWhere();
    if (normalized === 'CURRENCY') return { assetType: { in: ['FOREX', 'FX', 'CURRENCY'], mode: 'insensitive' } };
    if (['INDEX', 'ETF', 'COMMODITY', 'CRYPTO', 'FUND', 'OTHER', 'UNKNOWN'].includes(normalized)) {
      return { assetType: { equals: normalized, mode: 'insensitive' } };
    }
    return { assetType: { equals: '__NO_MATCH__', mode: 'insensitive' } };
  }

  private futuresWhere(): Prisma.StockWhereInput {
    return {
      OR: [
        { assetType: { in: ['FUTURE', 'FUTURES'], mode: 'insensitive' } },
        { instrumentSegment: { equals: 'FUTURES', mode: 'insensitive' } },
      ],
    };
  }

  private notFuturesSymbolWhere(): Prisma.StockWhereInput {
    return {
      NOT: [
        { assetType: { in: ['FUTURE', 'FUTURES'], mode: 'insensitive' } },
        { instrumentSegment: { equals: 'FUTURES', mode: 'insensitive' } },
      ],
    };
  }

  private currencyWhere(currency: string): Prisma.StockWhereInput {
    const normalized = currency.trim().toUpperCase();
    if (normalized === 'INR') {
      return {
        OR: [
          { currency: { equals: 'INR', mode: 'insensitive' } },
          {
            AND: [
              {
                OR: [
                  { region: 'IN' },
                  { country: { contains: 'India', mode: 'insensitive' } },
                  { exchange: { in: ['NSE', 'BSE'], mode: 'insensitive' } },
                  { symbol: { endsWith: '.NS', mode: 'insensitive' } },
                  { symbol: { endsWith: '.BO', mode: 'insensitive' } },
                ],
              },
              {
                OR: [
                  { currency: null },
                  { currency: '' },
                ],
              },
            ],
          },
        ],
      };
    }
    return { currency: { equals: normalized, mode: 'insensitive' } };
  }

  private derivativesEligibleWhere(eligible: boolean): Prisma.StockWhereInput {
    const known = knownNseFnoStockUnderlyingSymbols();
    const derivedEligible: Prisma.StockWhereInput = {
      OR: [
        { symbol: { in: known.map((symbol) => `${symbol}.NS`), mode: 'insensitive' } },
        { providerSymbol: { in: known.map((symbol) => `${symbol}.NS`), mode: 'insensitive' } },
        { sourceSymbol: { in: known, mode: 'insensitive' } },
        { displaySymbol: { in: known, mode: 'insensitive' } },
      ],
    };
    if (eligible) {
      return {
        OR: [
          { derivativesEligible: true },
          derivedEligible,
        ],
      };
    }
    return {
      AND: [
        {
          OR: [
            { derivativesEligible: false },
          ],
        },
        { NOT: derivedEligible },
      ],
    };
  }

  private keepExistingIfBlank<T>(next: T | null | undefined, current: T | null): T | null {
    if (typeof next === 'string' && next.trim().length === 0) return current;
    return next === null || next === undefined ? current : next;
  }

  private keepExistingRequiredIfBlank(next: string | null | undefined, current: string): string {
    if (typeof next === 'string' && next.trim().length > 0) return next;
    return current;
  }

  private asAndArray(value: Prisma.StockWhereInput['AND']): Prisma.StockWhereInput[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }
}
