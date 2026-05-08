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
  ScheduledRegionSyncSummary,
} from './market-data-foundation.types';
import { partitionHistoricalPrices } from './market-data-foundation.validation';
import type { YahooFinanceIngestionService } from './market-data-foundation.provider';
import { resolveMarketRegionFilter } from '../../shared/utils/market-scope';

export class MarketDataFoundationRepository {
  constructor(public readonly prisma: PrismaClient = defaultPrisma) {}

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
      where.derivativesEligible = derivativesEligible;
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

  findStockBySymbol(symbol: string) {
    return this.prisma.stock.findUnique({ where: { symbol } });
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

  listActiveStockSyncTasks(options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {}, take?: number) {
    return this.prisma.stock.findMany({
      where: {
        ...this.stockWhere(options),
        isActive: true,
        OR: [
          { providerSupportStatus: null },
          { providerSupportStatus: { in: ['SUPPORTED', 'UNKNOWN'], mode: 'insensitive' } },
        ],
      },
      select: { id: true, symbol: true, providerSymbol: true, lastSuccessfulDataLoadTimestamp: true },
      take,
      orderBy: [
        { lastSuccessfulDataLoadTimestamp: { sort: 'asc', nulls: 'first' } },
        { symbol: 'asc' },
      ],
    });
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

  async updateProviderSupportStatus(symbol: string, status: string, providerError?: string | null) {
    return this.prisma.stock.update({
      where: { symbol },
      data: {
        providerSupportStatus: status,
        providerError: providerError || null,
      },
    });
  }

  async listStocksForCatalogBackfill(options: Pick<PaginationOptions, 'region' | 'assetType'> & { offset: number; batchSize: number }) {
    const where = this.stockWhere({ region: options.region, assetType: options.assetType });
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

  updateStockLoadTimestampBySymbol(symbol: string, timestamp = new Date()) {
    return this.prisma.stock.update({
      where: { symbol },
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
    const stocks = await this.prisma.stock.findMany({
      where: this.stockWhere(options),
      select: { symbol: true },
    });
    const symbols = stocks.map((stock) => stock.symbol);
    const latestPrice = await this.prisma.priceTick.findFirst({
      where: symbols.length > 0 ? { symbol: { in: symbols } } : undefined,
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });

    return latestPrice?.timestamp ?? null;
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
    inferRegion: YahooFinanceIngestionService['inferRegion']
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

    const regionInfo = inferRegion(prices[0].symbol);
    const latest = prices.reduce((prev, current) =>
      prev.date > current.date ? prev : current
    );
    const existingRows = await this.prisma.priceTick.findMany({
      where: {
        symbol: prices[0].symbol,
        timestamp: { in: prices.map((price) => price.date) },
      },
      select: { timestamp: true, open: true, high: true, low: true, close: true, adjustedClose: true, volume: true },
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
      const batchSize = 100;
      for (let i = 0; i < rowsToWrite.length; i += batchSize) {
        const batch = rowsToWrite.slice(i, i + batchSize);
        const upsertOperations = batch.map(price =>
          tx.priceTick.upsert({
            where: {
              symbol_timestamp: {
                symbol: price.symbol,
                timestamp: price.date,
              },
            },
            update: {
              open: new Prisma.Decimal(price.open),
              high: new Prisma.Decimal(price.high),
              low: new Prisma.Decimal(price.low),
              close: new Prisma.Decimal(price.close),
              adjustedClose: price.adjustedClose !== undefined && price.adjustedClose !== null ? new Prisma.Decimal(price.adjustedClose) : null,
              volume: price.volume !== undefined && price.volume !== null ? BigInt(price.volume) : null,
              source: 'yahoo',
              region: regionInfo.region,
              exchange: regionInfo.exchange,
              dataStatus: 'COMPLETE',
            },
            create: {
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
              source: 'yahoo',
              dataStatus: 'COMPLETE',
            },
          })
        );

        await Promise.all(upsertOperations);

        if (batch.length === batchSize) {
          console.log(`    Processed ${i + batchSize} of ${rowsToWrite.length} changed records...`);
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

  async latestStoredTradingDateForRegion(region: string, assetType: string): Promise<string | null> {
    const stocks = await this.prisma.stock.findMany({
      where: this.stockWhere({ region, assetType }),
      select: { symbol: true },
    });
    const symbols = stocks.map((stock) => stock.symbol);
    if (symbols.length === 0) return null;
    const latest = await this.prisma.priceTick.findFirst({
      where: { symbol: { in: symbols } },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });
    return latest?.timestamp.toISOString().slice(0, 10) ?? null;
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
        source: 'yahoo',
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
        stockId_periodType_source: {
          stockId,
          periodType: fundamentals.periodType,
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

  async listFundamentals(stockId: string) {
    return (this.prisma as any).fundamental.findMany({
      where: { stockId },
      orderBy: { periodEndDate: 'desc' },
    });
  }

  async upsertCorporateActions(stockId: string, actions: CorporateAction[]) {
    const operations = actions.map((action) => {
      const effectiveDate = this.normalizeUtcDay(action.date);
      return (this.prisma as any).corporateAction.upsert({
        where: {
          stockId_actionType_effectiveDate_source: {
            stockId,
            actionType: action.type,
            effectiveDate,
            source: action.source,
          },
        },
        update: {
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
          declaredDate: action.declaredDate ? new Date(action.declaredDate) : null,
          paymentDate: action.paymentDate ? new Date(action.paymentDate) : null,
          amount: action.amount !== undefined && action.amount !== null ? new Prisma.Decimal(action.amount) : null,
          splitRatio: action.splitRatio !== undefined && action.splitRatio !== null ? new Prisma.Decimal(action.splitRatio) : null,
          currency: action.currency ?? null,
          source: action.source,
          dataStatus: 'COMPLETE',
        },
      });
    });

    return Promise.all(operations);
  }

  async listCorporateActions(stockId: string) {
    return (this.prisma as any).corporateAction.findMany({
      where: { stockId },
      orderBy: { effectiveDate: 'desc' },
    });
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

  private sameDailyCandle(existing: any, price: HistoricalPrice): boolean {
    return this.sameDecimal(existing.open, price.open)
      && this.sameDecimal(existing.high, price.high)
      && this.sameDecimal(existing.low, price.low)
      && this.sameDecimal(existing.close, price.close)
      && this.sameNullableDecimal(existing.adjustedClose, price.adjustedClose ?? null)
      && this.sameNullableBigInt(existing.volume, price.volume ?? null);
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
    this.assignIfChanged(next, 'derivativesEligible', data.derivativesEligible ?? existing.derivativesEligible, existing.derivativesEligible);
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
    if (data.isDelisted !== undefined && data.isDelisted !== existing.isDelisted) next.isDelisted = data.isDelisted;
    if (data.isActive !== undefined && data.isActive !== existing.isActive) next.isActive = data.isActive;
    if (Object.keys(next).length > 0) {
      next.source = data.catalogSource || existing.source || 'catalog';
      next.dataStatus = data.dataStatus || existing.dataStatus || 'PARTIAL';
    }
    return next;
  }

  private assignIfChanged(target: Prisma.StockUpdateInput, key: string, next: unknown, current: unknown) {
    if (next === undefined || next === null) return;
    if (next !== current) (target as any)[key] = next;
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
        { symbol: { contains: 'FUT', mode: 'insensitive' } },
        { name: { contains: 'future', mode: 'insensitive' } },
      ],
    };
  }

  private notFuturesSymbolWhere(): Prisma.StockWhereInput {
    return {
      NOT: [
        { symbol: { contains: 'FUT', mode: 'insensitive' } },
        { name: { contains: 'future', mode: 'insensitive' } },
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
