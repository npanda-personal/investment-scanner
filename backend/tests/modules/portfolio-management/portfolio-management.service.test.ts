/// <reference types="@types/jest" />
import { PortfolioManagementService } from '../../../src/modules/portfolio-management';

const portfolio = {
  id: 'portfolio-1',
  name: 'Core',
  baseCurrency: 'USD',
  description: null,
  createdAt: '2026-04-28T00:00:00.000Z',
  updatedAt: '2026-04-28T00:00:00.000Z',
};

const holding = {
  id: 'holding-1',
  portfolioId: 'portfolio-1',
  instrumentId: 'stock-1',
  symbol: 'ABC',
  companyName: 'ABC Co',
  quantity: 10,
  averageCost: 80,
  currency: 'USD',
  notes: null,
  createdAt: '2026-04-28T00:00:00.000Z',
  updatedAt: '2026-04-28T00:00:00.000Z',
};

const createService = (overrides: any = {}) => {
  const repository = {
    getPortfolio: jest.fn().mockResolvedValue(portfolio),
    listHoldings: jest.fn().mockResolvedValue([holding]),
    createPortfolio: jest.fn(async (input) => ({ ...portfolio, ...input })),
    listPortfolios: jest.fn().mockResolvedValue([portfolio]),
    addHolding: jest.fn(async (_portfolioId, input) => ({ ...holding, ...input })),
    listTransactions: jest.fn().mockResolvedValue([]),
    createTransaction: jest.fn(async (_portfolioId, input) => ({ id: 'transaction-1', portfolioId: 'portfolio-1', ...input })),
    ...overrides.repository,
  };
  const marketDataService = {
    getInstrument: jest.fn().mockResolvedValue({
      id: 'stock-1',
      symbol: 'ABC',
      company_name: 'ABC Co',
      sector: 'Technology',
      country: 'US',
    }),
    latestPriceByInstrumentId: jest.fn().mockResolvedValue({ latest: { close: 100, adjusted_close: 100 } }),
    listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [{ close: 100 }, { close: 95 }] }),
    ...overrides.marketDataService,
  };
  const signalService = {
    latestForInstrument: jest.fn().mockResolvedValue({
      score: 82,
      direction: 'BULLISH',
      confidence: 'HIGH',
      generated_at: '2026-04-28T00:00:00.000Z',
    }),
    ...overrides.signalService,
  };

  return {
    service: new PortfolioManagementService(repository as any, marketDataService as any, signalService as any),
    repository,
    marketDataService,
    signalService,
  };
};

describe('PortfolioManagementService', () => {
  it('calculates valuation summary and allocation', async () => {
    const { service } = createService();

    const summary = await service.summary('portfolio-1');
    const allocation = await service.allocation('portfolio-1');

    expect(summary).toMatchObject({
      totalValue: 1000,
      totalInvested: 800,
      totalUnrealizedPnL: 200,
      dailyPnL: 50,
      numberOfHoldings: 1,
      dataStatus: 'COMPLETE',
    });
    expect(summary?.holdings[0]).toMatchObject({
      currentPrice: 100,
      marketValue: 1000,
      allocationPercent: 1,
      sector: 'Technology',
      country: 'US',
      signal: { score: 82, direction: 'BULLISH' },
    });
    expect(allocation?.bySector).toEqual([{ key: 'Technology', value: 1000, allocationPercent: 1 }]);
  });

  it('does not crash when latest price and signal are missing', async () => {
    const { service } = createService({
      marketDataService: {
        latestPriceByInstrumentId: jest.fn().mockResolvedValue({ latest: null }),
        listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [] }),
      },
      signalService: {
        latestForInstrument: jest.fn().mockRejectedValue(new Error('signal unavailable')),
      },
    });

    const summary = await service.summary('portfolio-1');

    expect(summary).toMatchObject({
      totalValue: 0,
      totalInvested: 800,
      dataStatus: 'PARTIAL',
    });
    expect(summary?.holdings[0]).toMatchObject({
      currentPrice: null,
      marketValue: 0,
      signal: null,
    });
  });

  it('creates cash and buy transactions through the repository', async () => {
    const { service, repository } = createService();

    await service.createTransaction('portfolio-1', {
      type: 'CASH_IN',
      amount: 5000,
      currency: 'USD',
      transactionDate: '2026-04-28',
    });
    await service.createTransaction('portfolio-1', {
      type: 'BUY',
      instrumentId: 'stock-1',
      quantity: 10,
      price: 100,
      currency: 'USD',
      transactionDate: '2026-04-28',
    });

    expect(repository.createTransaction).toHaveBeenCalledTimes(2);
  });
});
