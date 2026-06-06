import prisma from '../../db/prisma';
import type {
  CreateHoldingRequest,
  CreatePortfolioRequest,
  CreateTransactionRequest,
  PortfolioDto,
  PortfolioHoldingDto,
  PortfolioTransactionDto,
  UpdateHoldingRequest,
  UpdatePortfolioRequest,
} from './portfolio-management.types';

export class PortfolioManagementRepository {
  constructor(private readonly db = prisma) {}

  async listPortfolios(userId = 'default-user'): Promise<PortfolioDto[]> {
    const portfolios = await this.db.portfolio.findMany({ where: this.ownerWhere(userId), orderBy: { updatedAt: 'desc' } });
    return portfolios.map(this.toPortfolioDto);
  }

  async createPortfolio(input: CreatePortfolioRequest, userId = 'default-user'): Promise<PortfolioDto> {
    const portfolio = await this.db.portfolio.create({
      data: {
        name: input.name.trim(),
        userId,
        baseCurrency: input.baseCurrency.trim().toUpperCase(),
        description: input.description ?? null,
      },
    });
    return this.toPortfolioDto(portfolio);
  }

  async getPortfolio(id: string, userId = 'default-user'): Promise<PortfolioDto | null> {
    const portfolio = await this.db.portfolio.findFirst({ where: { id, ...this.ownerWhere(userId) } });
    return portfolio ? this.toPortfolioDto(portfolio) : null;
  }

  async updatePortfolio(id: string, input: UpdatePortfolioRequest, userId = 'default-user'): Promise<PortfolioDto> {
    const existing = await this.getPortfolio(id, userId);
    if (!existing) throw new Error('Portfolio not found');
    const portfolio = await this.db.portfolio.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        baseCurrency: input.baseCurrency?.trim().toUpperCase(),
        description: input.description,
      },
    });
    return this.toPortfolioDto(portfolio);
  }

  async deletePortfolio(id: string, userId = 'default-user'): Promise<void> {
    const existing = await this.getPortfolio(id, userId);
    if (!existing) throw new Error('Portfolio not found');
    await this.db.portfolio.delete({ where: { id } });
  }

  async listHoldings(portfolioId: string): Promise<PortfolioHoldingDto[]> {
    const holdings = await this.db.portfolioHolding.findMany({
      where: { portfolioId },
      orderBy: { symbol: 'asc' },
    });
    return holdings.map(this.toHoldingDto);
  }

  async addHolding(portfolioId: string, input: CreateHoldingRequest, instrument: any): Promise<PortfolioHoldingDto> {
    const holding = await this.db.portfolioHolding.create({
      data: {
        portfolioId,
        instrumentId: input.instrumentId,
        symbol: instrument.symbol,
        companyName: instrument.company_name ?? instrument.name ?? null,
        quantity: input.quantity,
        averageCost: input.averageCost,
        currency: input.currency.trim().toUpperCase(),
        notes: input.notes ?? null,
      },
    });
    // Touch portfolio.updatedAt so staleness guards elsewhere can compare it
    // against intelligence snapshot computedAt.
    await this.db.portfolio.update({ where: { id: portfolioId }, data: { updatedAt: new Date() } });
    return this.toHoldingDto(holding);
  }

  async updateHolding(portfolioId: string, holdingId: string, input: UpdateHoldingRequest): Promise<PortfolioHoldingDto> {
    const existing = await this.db.portfolioHolding.findFirst({ where: { id: holdingId, portfolioId } });
    if (!existing) throw new Error('Holding not found');
    const holding = await this.db.portfolioHolding.update({
      where: { id: holdingId },
      data: {
        quantity: input.quantity,
        averageCost: input.averageCost,
        currency: input.currency?.trim().toUpperCase(),
        notes: input.notes,
      },
    });
    // Touch portfolio.updatedAt so staleness guards elsewhere can compare it
    // against intelligence snapshot computedAt.
    await this.db.portfolio.update({ where: { id: portfolioId }, data: { updatedAt: new Date() } });
    return this.toHoldingDto(holding);
  }

  async removeHolding(portfolioId: string, holdingId: string): Promise<void> {
    // Resolve portfolioId from the holding row before deletion so we can touch updatedAt.
    const existing = await this.db.portfolioHolding.findFirst({ where: { id: holdingId, portfolioId }, select: { portfolioId: true } });
    await this.db.portfolioHolding.deleteMany({ where: { id: holdingId, portfolioId } });
    if (existing) {
      // Touch portfolio.updatedAt so staleness guards elsewhere can compare it
      // against intelligence snapshot computedAt.
      await this.db.portfolio.update({ where: { id: existing.portfolioId }, data: { updatedAt: new Date() } });
    }
  }

  async listTransactions(portfolioId: string): Promise<PortfolioTransactionDto[]> {
    const transactions = await this.db.portfolioTransaction.findMany({
      where: { portfolioId },
      orderBy: { transactionDate: 'desc' },
    });
    return transactions.map(this.toTransactionDto);
  }

  async createTransaction(portfolioId: string, input: CreateTransactionRequest): Promise<PortfolioTransactionDto> {
    const transaction = await this.db.portfolioTransaction.create({
      data: {
        portfolioId,
        instrumentId: input.instrumentId ?? null,
        type: input.type,
        quantity: input.quantity ?? null,
        price: input.price ?? null,
        amount: input.amount ?? null,
        currency: input.currency.trim().toUpperCase(),
        transactionDate: new Date(input.transactionDate),
        notes: input.notes ?? null,
      },
    });
    return this.toTransactionDto(transaction);
  }

  /**
   * Returns the two most-recent persisted signal rows for a given instrument,
   * ordered by generatedAt descending.  Index [0] = current, [1] = prior.
   * Persisted-read only — never recomputes signals.
   */
  async twoMostRecentSignals(instrumentId: string): Promise<Array<{ id: string; direction: string; score: number; generatedAt: Date }>> {
    const rows = await (this.db as any).signalResult.findMany({
      where: { instrumentId },
      orderBy: { generatedAt: 'desc' },
      take: 2,
      select: { id: true, direction: true, score: true, generatedAt: true },
    });
    return Array.isArray(rows) ? rows : [];
  }

  /**
   * Returns the most-recent persisted price for the given instrument.
   * Used for loss-threshold crossing detection.
   */
  async latestPrice(instrumentId: string): Promise<{ close: number; adjustedClose: number } | null> {
    // Prices live in PriceTick (price_ticks), keyed by symbol/timestamp — there is
    // no stockEodPrice model. Resolve the instrument's symbol, then read the latest tick.
    const stock = await (this.db as any).stock.findUnique({
      where: { id: instrumentId },
      select: { symbol: true },
    });
    if (!stock?.symbol) return null;
    const row = await (this.db as any).priceTick.findFirst({
      where: { symbol: stock.symbol },
      orderBy: { timestamp: 'desc' },
      select: { close: true, adjustedClose: true },
    });
    if (!row) return null;
    const close = row.close === null || row.close === undefined ? null : Number(row.close);
    const adjustedClose = row.adjustedClose === null || row.adjustedClose === undefined ? close : Number(row.adjustedClose);
    if (close === null) return null;
    return { close, adjustedClose: adjustedClose ?? close };
  }

  private ownerWhere(userId: string) {
    return { OR: [{ userId }, { userId: null }] };
  }

  private toPortfolioDto(record: any): PortfolioDto {
    return {
      id: record.id,
      name: record.name,
      baseCurrency: record.baseCurrency,
      description: record.description,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toHoldingDto(record: any): PortfolioHoldingDto {
    return {
      id: record.id,
      portfolioId: record.portfolioId,
      instrumentId: record.instrumentId,
      symbol: record.symbol,
      companyName: record.companyName,
      quantity: Number(record.quantity),
      averageCost: Number(record.averageCost),
      currency: record.currency,
      notes: record.notes,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toTransactionDto(record: any): PortfolioTransactionDto {
    return {
      id: record.id,
      portfolioId: record.portfolioId,
      instrumentId: record.instrumentId,
      type: record.type,
      quantity: record.quantity !== null ? Number(record.quantity) : null,
      price: record.price !== null ? Number(record.price) : null,
      amount: record.amount !== null ? Number(record.amount) : null,
      currency: record.currency,
      transactionDate: record.transactionDate.toISOString(),
      notes: record.notes,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
