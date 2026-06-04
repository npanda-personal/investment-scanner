import { MarketDataFoundationService } from '../market-data-foundation';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SubscriptionBillingService } from '../subscription-billing';
import { PortfolioManagementRepository } from './portfolio-management.repository';
import type {
  AllocationBucketDto,
  CreateHoldingRequest,
  CreatePortfolioRequest,
  CreateTransactionRequest,
  HoldingLossCrossing,
  HoldingSignalFlip,
  HoldingValuationDto,
  PortfolioAllocationDto,
  PortfolioChangesDto,
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

  /**
   * Diffs persisted signals and prices for each holding to surface what changed.
   * Persisted-read only — never recomputes signals live.
   *
   * @param lossThresholdPercent  Fraction loss below average cost that triggers a crossing alert.
   *                              Default -0.10 (-10%).
   */
  async portfolioChanges(
    portfolioId: string,
    userId = 'default-user',
    lossThresholdPercent = -0.10,
  ): Promise<PortfolioChangesDto | null> {
    const portfolio = await this.repository.getPortfolio(portfolioId, userId);
    if (!portfolio) return null;

    const holdings = await this.repository.listHoldings(portfolioId);
    if (holdings.length === 0) {
      return {
        portfolioId,
        referenceNote: 'Portfolio has no holdings.',
        signalFlips: [],
        lossCrossings: [],
        marketGateChange: null,
        warnings: [],
        generatedAt: new Date().toISOString(),
      };
    }

    const signalFlips: HoldingSignalFlip[] = [];
    const lossCrossings: HoldingLossCrossing[] = [];
    const warnings: string[] = [];
    let anyHasPrior = false;
    let anyLacksPrior = false;

    await Promise.all(holdings.map(async (holding) => {
      // --- Signal direction flip detection (persisted read) ---
      const signals = await this.repository.twoMostRecentSignals(holding.instrumentId).catch(() => []);
      if (signals.length >= 2) {
        anyHasPrior = true;
        const [current, prior] = signals;
        if (current.direction !== prior.direction) {
          signalFlips.push({
            holdingId: holding.id,
            instrumentId: holding.instrumentId,
            symbol: holding.symbol,
            companyName: holding.companyName,
            priorDirection: prior.direction,
            currentDirection: current.direction,
            priorScore: prior.score,
            currentScore: current.score,
            currentSignalDate: current.generatedAt.toISOString(),
            note: `Signal direction changed from ${prior.direction} to ${current.direction} (score: ${prior.score.toFixed(0)} → ${current.score.toFixed(0)}).`,
          });
        }
      } else {
        // 0 or 1 signals — no prior to compare
        anyLacksPrior = true;
      }

      // --- Loss threshold crossing (persisted price read) ---
      const priceRow = await this.repository.latestPrice(holding.instrumentId).catch(() => null);
      const currentPrice = priceRow?.adjustedClose ?? priceRow?.close ?? null;
      if (currentPrice !== null && holding.averageCost > 0) {
        const pnlPct = (currentPrice - holding.averageCost) / holding.averageCost;
        if (pnlPct <= lossThresholdPercent) {
          lossCrossings.push({
            holdingId: holding.id,
            instrumentId: holding.instrumentId,
            symbol: holding.symbol,
            companyName: holding.companyName,
            averageCost: holding.averageCost,
            currentPrice,
            unrealizedPnLPercent: pnlPct,
            thresholdPercent: lossThresholdPercent,
            note: `Holding has declined ${(pnlPct * 100).toFixed(1)}% from average cost of ${holding.averageCost.toFixed(2)}.`,
          });
        }
      }
    }));

    let referenceNote: string;
    if (!anyHasPrior && anyLacksPrior) {
      referenceNote = 'No prior persisted signal to compare yet; run the signal pipeline to establish a baseline.';
    } else if (anyLacksPrior) {
      referenceNote = 'Diff is based on the two most-recent persisted signal rows per holding. Some holdings lack a prior signal for comparison.';
    } else {
      referenceNote = 'Diff is based on the two most-recent persisted signal rows per holding instrument.';
    }

    if (warnings.length === 0 && signalFlips.length === 0 && lossCrossings.length === 0 && anyHasPrior) {
      warnings.push('No signal direction changes or loss threshold crossings detected since the prior persisted signal run.');
    }

    return {
      portfolioId,
      referenceNote,
      signalFlips,
      lossCrossings,
      marketGateChange: null, // portfolio-level gate change is surfaced via research-hub; not duplicated here
      warnings,
      generatedAt: new Date().toISOString(),
    };
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
