import { MarketDataFoundationService } from '../market-data-foundation';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SubscriptionBillingService } from '../subscription-billing';
import { PortfolioManagementRepository } from './portfolio-management.repository';
import type {
  AllocationBucketDto,
  CreateHoldingRequest,
  CreatePortfolioRequest,
  CreateTransactionRequest,
  HoldingValuationDto,
  PortfolioAllocationDto,
  PortfolioSummaryDto,
  UpdateHoldingRequest,
  UpdatePortfolioRequest,
} from './portfolio-management.types';
import {
  validateHoldingInput,
  validatePortfolioInput,
  validateTransactionInput,
} from './portfolio-management.validation';

export class PortfolioManagementService {
  constructor(
    private readonly repository = new PortfolioManagementRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly signalService = new SignalGenerationEngineService(),
    private readonly subscriptionService = new SubscriptionBillingService()
  ) {}

  listPortfolios(userId = 'default-user') {
    return this.repository.listPortfolios(userId);
  }

  async createPortfolio(input: CreatePortfolioRequest, userId = 'default-user') {
    this.throwIfErrors(validatePortfolioInput(input));
    await this.subscriptionService.assertAllowed('CREATE_PORTFOLIO', userId);
    return this.repository.createPortfolio(input, userId);
  }

  async getPortfolioDetail(id: string, userId = 'default-user') {
    const portfolio = await this.repository.getPortfolio(id, userId);
    if (!portfolio) return null;
    return {
      portfolio,
      holdings: await this.repository.listHoldings(id),
    };
  }

  async updatePortfolio(id: string, input: UpdatePortfolioRequest, userId = 'default-user') {
    await this.requirePortfolio(id, userId);
    this.throwIfErrors(validatePortfolioInput(input, true));
    return this.repository.updatePortfolio(id, input, userId);
  }

  deletePortfolio(id: string, userId = 'default-user') {
    return this.repository.deletePortfolio(id, userId);
  }

  async addHolding(portfolioId: string, input: CreateHoldingRequest, userId = 'default-user') {
    await this.requirePortfolio(portfolioId, userId);
    this.throwIfErrors(validateHoldingInput(input));
    const instrument = await this.marketDataService.getInstrument(input.instrumentId);
    if (!instrument) throw new Error('Instrument not found');
    return this.repository.addHolding(portfolioId, input, instrument);
  }

  async updateHolding(portfolioId: string, holdingId: string, input: UpdateHoldingRequest, userId = 'default-user') {
    await this.requirePortfolio(portfolioId, userId);
    this.throwIfErrors(validateHoldingInput(input, true));
    return this.repository.updateHolding(portfolioId, holdingId, input);
  }

  async removeHolding(portfolioId: string, holdingId: string, userId = 'default-user') {
    await this.requirePortfolio(portfolioId, userId);
    return this.repository.removeHolding(portfolioId, holdingId);
  }

  async summary(portfolioId: string, userId = 'default-user'): Promise<PortfolioSummaryDto | null> {
    const portfolio = await this.repository.getPortfolio(portfolioId, userId);
    if (!portfolio) return null;
    const holdings = await this.repository.listHoldings(portfolioId);
    const valuedHoldings = await Promise.all(holdings.map((holding) => this.valueHolding(holding)));
    const totalValue = this.sum(valuedHoldings.map((holding) => holding.marketValue));
    const totalInvested = this.sum(valuedHoldings.map((holding) => holding.investedAmount));
    const dailyPnL = this.sum(valuedHoldings.map((holding) => holding.dailyChange !== null ? holding.dailyChange * holding.quantity : 0));
    const withAllocation = valuedHoldings.map((holding) => ({
      ...holding,
      allocationPercent: totalValue > 0 ? holding.marketValue / totalValue : 0,
    }));

    return {
      portfolio,
      totalValue,
      totalInvested,
      totalUnrealizedPnL: totalValue - totalInvested,
      totalUnrealizedPnLPercent: totalInvested > 0 ? (totalValue - totalInvested) / totalInvested : null,
      dailyPnL,
      dailyPnLPercent: totalValue - dailyPnL > 0 ? dailyPnL / (totalValue - dailyPnL) : null,
      numberOfHoldings: holdings.length,
      holdings: withAllocation,
      source: 'portfolio-management',
      dataStatus: withAllocation.some((holding) => holding.currentPrice === null) ? 'PARTIAL' : 'COMPLETE',
      generatedAt: new Date().toISOString(),
    };
  }

  async allocation(portfolioId: string, userId = 'default-user'): Promise<PortfolioAllocationDto | null> {
    const summary = await this.summary(portfolioId, userId);
    if (!summary) return null;
    return {
      portfolioId,
      byHolding: summary.holdings.map((holding) => ({
        key: holding.symbol,
        value: holding.marketValue,
        allocationPercent: holding.allocationPercent,
      })),
      bySector: this.bucket(summary.holdings, (holding) => holding.sector || 'Unknown'),
      byCountry: this.bucket(summary.holdings, (holding) => holding.country || 'Unknown'),
      byCurrency: this.bucket(summary.holdings, (holding) => holding.currency || 'Unknown'),
      generatedAt: new Date().toISOString(),
    };
  }

  async listTransactions(portfolioId: string, userId = 'default-user') {
    await this.requirePortfolio(portfolioId, userId);
    return this.repository.listTransactions(portfolioId);
  }

  async createTransaction(portfolioId: string, input: CreateTransactionRequest, userId = 'default-user') {
    await this.requirePortfolio(portfolioId, userId);
    this.throwIfErrors(validateTransactionInput(input));
    if (input.instrumentId) {
      const instrument = await this.marketDataService.getInstrument(input.instrumentId);
      if (!instrument) throw new Error('Instrument not found');
    }
    return this.repository.createTransaction(portfolioId, input);
  }

  async valueHolding(holding: any): Promise<HoldingValuationDto> {
    const [instrument, latest, prices, signal] = await Promise.all([
      this.marketDataService.getInstrument(holding.instrumentId),
      this.marketDataService.latestPriceByInstrumentId(holding.instrumentId),
      this.marketDataService.listPricesByInstrumentId(holding.instrumentId, 2),
      this.signalService.latestForInstrument(holding.instrumentId).catch(() => null),
    ]);
    const latestPrice = latest?.latest?.adjusted_close ?? latest?.latest?.close ?? null;
    const previousPrice = prices?.prices?.[1]?.adjusted_close ?? prices?.prices?.[1]?.close ?? null;
    const currentPrice = typeof latestPrice === 'number' ? latestPrice : null;
    const marketValue = currentPrice !== null ? holding.quantity * currentPrice : 0;
    const investedAmount = holding.quantity * holding.averageCost;
    const dailyChange = currentPrice !== null && typeof previousPrice === 'number' ? currentPrice - previousPrice : null;

    return {
      ...holding,
      currentPrice,
      marketValue,
      investedAmount,
      unrealizedPnL: marketValue - investedAmount,
      unrealizedPnLPercent: investedAmount > 0 ? (marketValue - investedAmount) / investedAmount : null,
      dailyChange,
      dailyChangePercent: dailyChange !== null && typeof previousPrice === 'number' && previousPrice > 0 ? dailyChange / previousPrice : null,
      allocationPercent: 0,
      sector: instrument?.sector ?? null,
      country: instrument?.country ?? null,
      signal: signal ? {
        score: signal.score,
        direction: signal.direction,
        confidence: signal.confidence,
        generatedAt: signal.generated_at,
      } : null,
    };
  }

  private bucket(holdings: HoldingValuationDto[], keyFn: (holding: HoldingValuationDto) => string): AllocationBucketDto[] {
    const total = this.sum(holdings.map((holding) => holding.marketValue));
    const buckets = new Map<string, number>();
    for (const holding of holdings) {
      const key = keyFn(holding);
      buckets.set(key, (buckets.get(key) || 0) + holding.marketValue);
    }
    return [...buckets.entries()]
      .map(([key, value]) => ({ key, value, allocationPercent: total > 0 ? value / total : 0 }))
      .sort((a, b) => b.value - a.value);
  }

  private throwIfErrors(errors: string[]) {
    if (errors.length > 0) throw new Error(errors.join('; '));
  }

  private async requirePortfolio(portfolioId: string, userId: string) {
    const portfolio = await this.repository.getPortfolio(portfolioId, userId);
    if (!portfolio) throw new Error('Portfolio not found');
    return portfolio;
  }

  private sum(values: number[]) {
    return values.reduce((total, value) => total + value, 0);
  }
}
