import { Prisma, PrismaClient } from '@prisma/client';
import type { CreateStockRequest, PaginationOptions, UpdateStockRequest } from '../market-data-foundation.types';
import { stockWhere } from './market-data-foundation.repository.query-scope';
import { assignIdentityIfChanged, assignIfChanged, keepExistingIfBlank, keepExistingRequiredIfBlank } from './market-data-foundation.repository.helpers';

export class CatalogRepository {
  constructor(private readonly prisma: PrismaClient) {}



  findStockById(id: string) {
    return this.prisma.stock.findUnique({ where: { id } });
  }



  findStockByIdInScope(id: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.prisma.stock.findFirst({ where: { ...stockWhere(options), id } });
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
          stockWhere(options),
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
        name: keepExistingRequiredIfBlank(data.name, current.name),
        region: keepExistingRequiredIfBlank(data.region, current.region),
        exchange: keepExistingIfBlank(data.exchange, current.exchange),
        country: keepExistingIfBlank(data.country, current.country),
        sector: keepExistingIfBlank(data.sector, current.sector),
        industry: keepExistingIfBlank(data.industry, current.industry),
        currency: keepExistingIfBlank(data.currency, current.currency),
        marketCap: nextMarketCap,
        assetType: keepExistingIfBlank(data.assetType, current.assetType),
        instrumentSegment: keepExistingIfBlank(data.instrumentSegment, (current as any).instrumentSegment),
        displaySymbol: keepExistingIfBlank(data.displaySymbol, (current as any).displaySymbol),
        providerSymbol: keepExistingIfBlank(data.providerSymbol, (current as any).providerSymbol),
        sourceSymbol: keepExistingIfBlank(data.sourceSymbol, (current as any).sourceSymbol),
        catalogSource: keepExistingIfBlank(data.catalogSource, (current as any).catalogSource),
        providerSupportStatus: keepExistingIfBlank(data.providerSupportStatus, (current as any).providerSupportStatus),
        providerError: data.providerError === undefined ? (current as any).providerError : data.providerError,
        derivativesEligible: data.derivativesEligible ?? (current as any).derivativesEligible,
        underlyingSymbol: keepExistingIfBlank(data.underlyingSymbol, (current as any).underlyingSymbol),
        expiryDate: data.expiryDate ?? (current as any).expiryDate,
        contractMonth: keepExistingIfBlank(data.contractMonth, (current as any).contractMonth),
        lotSize: data.lotSize ?? (current as any).lotSize,
        contractStatus: keepExistingIfBlank(data.contractStatus, (current as any).contractStatus),
        isDelisted: data.isDelisted ?? current.isDelisted,
        ipoDate: data.ipoDate ?? current.ipoDate,
        isin: keepExistingIfBlank(data.isin, current.isin),
        source: data.source ?? current.source ?? 'yahoo',
        dataStatus: 'PARTIAL',
      },
    });
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



  private catalogUpdateData(existing: any, data: CreateStockRequest): Prisma.StockUpdateInput {
    const next: Prisma.StockUpdateInput = {};
    assignIfChanged(next, 'name', keepExistingRequiredIfBlank(data.name, existing.name), existing.name);
    assignIfChanged(next, 'region', keepExistingRequiredIfBlank(data.region, existing.region), existing.region);
    assignIfChanged(next, 'exchange', keepExistingIfBlank(data.exchange, existing.exchange), existing.exchange);
    assignIfChanged(next, 'country', keepExistingIfBlank(data.country, existing.country), existing.country);
    assignIfChanged(next, 'sector', keepExistingIfBlank(data.sector, existing.sector), existing.sector);
    assignIfChanged(next, 'industry', keepExistingIfBlank(data.industry, existing.industry), existing.industry);
    assignIfChanged(next, 'currency', keepExistingIfBlank(data.currency, existing.currency), existing.currency);
    assignIfChanged(next, 'assetType', keepExistingIfBlank(data.assetType, existing.assetType), existing.assetType);
    assignIfChanged(next, 'instrumentSegment', keepExistingIfBlank(data.instrumentSegment, existing.instrumentSegment), existing.instrumentSegment);
    assignIfChanged(next, 'displaySymbol', keepExistingIfBlank(data.displaySymbol, existing.displaySymbol), existing.displaySymbol);
    assignIfChanged(next, 'providerSymbol', keepExistingIfBlank(data.providerSymbol, existing.providerSymbol), existing.providerSymbol);
    assignIfChanged(next, 'sourceSymbol', keepExistingIfBlank(data.sourceSymbol, existing.sourceSymbol), existing.sourceSymbol);
    assignIfChanged(next, 'catalogSource', keepExistingIfBlank(data.catalogSource, existing.catalogSource), existing.catalogSource);
    assignIfChanged(next, 'providerSupportStatus', keepExistingIfBlank(data.providerSupportStatus, existing.providerSupportStatus), existing.providerSupportStatus);
    assignIfChanged(next, 'providerError', data.providerError === undefined ? existing.providerError : data.providerError, existing.providerError);
    assignIfChanged(next, 'derivativesEligible', Boolean(existing.derivativesEligible) || Boolean(data.derivativesEligible), existing.derivativesEligible);
    assignIfChanged(next, 'underlyingSymbol', keepExistingIfBlank(data.underlyingSymbol, existing.underlyingSymbol), existing.underlyingSymbol);
    assignIfChanged(next, 'contractMonth', keepExistingIfBlank(data.contractMonth, existing.contractMonth), existing.contractMonth);
    assignIfChanged(next, 'lotSize', data.lotSize ?? existing.lotSize, existing.lotSize);
    assignIfChanged(next, 'contractStatus', keepExistingIfBlank(data.contractStatus, existing.contractStatus), existing.contractStatus);
    if (data.marketCap !== undefined && data.marketCap !== null && String(data.marketCap) !== String(existing.marketCap)) {
      next.marketCap = new Prisma.Decimal(data.marketCap);
    }
    if (data.expiryDate && data.expiryDate.getTime() !== existing.expiryDate?.getTime?.()) {
      next.expiryDate = data.expiryDate;
    }
    if (data.ipoDate && data.ipoDate.getTime() !== existing.ipoDate?.getTime?.()) {
      next.ipoDate = data.ipoDate;
    }
    assignIfChanged(next, 'isin', keepExistingIfBlank(data.isin, existing.isin), existing.isin);
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
    assignIdentityIfChanged(next, 'exchange', data.exchange, existing.exchange, force);
    assignIdentityIfChanged(next, 'country', data.country, existing.country, force);
    assignIdentityIfChanged(next, 'currency', data.currency, existing.currency, force);
    assignIdentityIfChanged(next, 'assetType', data.assetType, existing.assetType, force);
    assignIdentityIfChanged(next, 'instrumentSegment', data.instrumentSegment, existing.instrumentSegment, force);
    assignIdentityIfChanged(next, 'displaySymbol', data.displaySymbol, existing.displaySymbol, force);
    assignIdentityIfChanged(next, 'providerSymbol', data.providerSymbol, existing.providerSymbol, force);
    assignIdentityIfChanged(next, 'sourceSymbol', data.sourceSymbol, existing.sourceSymbol, force);
    assignIdentityIfChanged(next, 'catalogSource', data.catalogSource, existing.catalogSource, force);
    assignIdentityIfChanged(next, 'isin', data.isin, existing.isin, force);
    if (data.ipoDate && (force || !existing.ipoDate) && data.ipoDate.getTime() !== existing.ipoDate?.getTime?.()) {
      next.ipoDate = data.ipoDate;
    }
    if (Object.keys(next).length > 0) {
      next.source = data.catalogSource || data.source || existing.source || 'catalog';
      next.dataStatus = data.dataStatus || existing.dataStatus || 'PARTIAL';
    }
    return next;
  }
}
