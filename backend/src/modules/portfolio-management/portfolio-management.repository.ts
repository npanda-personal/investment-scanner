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

  async listPortfolios(): Promise<PortfolioDto[]> {
    const portfolios = await this.db.portfolio.findMany({ orderBy: { updatedAt: 'desc' } });
    return portfolios.map(this.toPortfolioDto);
  }

  async createPortfolio(input: CreatePortfolioRequest): Promise<PortfolioDto> {
    const portfolio = await this.db.portfolio.create({
      data: {
        name: input.name.trim(),
        baseCurrency: input.baseCurrency.trim().toUpperCase(),
        description: input.description ?? null,
      },
    });
    return this.toPortfolioDto(portfolio);
  }

  async getPortfolio(id: string): Promise<PortfolioDto | null> {
    const portfolio = await this.db.portfolio.findUnique({ where: { id } });
    return portfolio ? this.toPortfolioDto(portfolio) : null;
  }

  async updatePortfolio(id: string, input: UpdatePortfolioRequest): Promise<PortfolioDto> {
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

  async deletePortfolio(id: string): Promise<void> {
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
    return this.toHoldingDto(holding);
  }

  async removeHolding(portfolioId: string, holdingId: string): Promise<void> {
    await this.db.portfolioHolding.deleteMany({ where: { id: holdingId, portfolioId } });
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
