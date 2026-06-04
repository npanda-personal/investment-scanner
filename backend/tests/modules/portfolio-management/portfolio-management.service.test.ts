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
    createPortfolio: jest.fn(async (input: any) => ({ ...portfolio, ...input })),
    listPortfolios: jest.fn().mockResolvedValue([portfolio]),
    addHolding: jest.fn(async (_portfolioId: any, input: any) => ({ ...holding, ...input })),
    listTransactions: jest.fn().mockResolvedValue([]),
    createTransaction: jest.fn(async (_portfolioId: any, input: any) => ({ id: 'transaction-1', portfolioId: 'portfolio-1', ...input })),
    twoMostRecentSignals: jest.fn().mockResolvedValue([]),
    latestPrice: jest.fn().mockResolvedValue(null),
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
    service: new PortfolioManagementService(repository as any, marketDataService as any, signalService as any, { assertAllowed: jest.fn() } as any),
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

  // ── portfolioChanges tests ─────────────────────────────────────────────────

  describe('portfolioChanges', () => {
    const makeSignalRow = (direction: string, score: number, daysAgo: number) => ({
      id: `sig-${direction}-${daysAgo}`,
      direction,
      score,
      generatedAt: new Date(Date.now() - daysAgo * 86400_000),
    });

    it('detects a signal direction flip from persisted data', async () => {
      const { service } = createService({
        repository: {
          twoMostRecentSignals: jest.fn().mockResolvedValue([
            makeSignalRow('BEARISH', 35, 0),   // current
            makeSignalRow('BULLISH', 78, 1),    // prior
          ]),
          latestPrice: jest.fn().mockResolvedValue({ adjustedClose: 85, close: 85 }),
        },
      });

      const result = await service.portfolioChanges('portfolio-1');

      expect(result).not.toBeNull();
      expect(result!.signalFlips).toHaveLength(1);
      expect(result!.signalFlips[0].symbol).toBe('ABC');
      expect(result!.signalFlips[0].priorDirection).toBe('BULLISH');
      expect(result!.signalFlips[0].currentDirection).toBe('BEARISH');
      // Research-support language: must not mention buy/sell in notes
      expect(result!.signalFlips[0].note.toLowerCase()).not.toMatch(/\b(buy|sell|purchase|order)\b/);
    });

    it('detects a loss threshold crossing', async () => {
      // averageCost = 80, currentPrice = 65 → -18.75% < -10% threshold
      const { service } = createService({
        repository: {
          twoMostRecentSignals: jest.fn().mockResolvedValue([
            makeSignalRow('BULLISH', 72, 0),
            makeSignalRow('BULLISH', 75, 1),
          ]),
          latestPrice: jest.fn().mockResolvedValue({ adjustedClose: 65, close: 65 }),
        },
      });

      const result = await service.portfolioChanges('portfolio-1', 'default-user', -0.10);

      expect(result).not.toBeNull();
      expect(result!.lossCrossings).toHaveLength(1);
      expect(result!.lossCrossings[0].symbol).toBe('ABC');
      expect(result!.lossCrossings[0].unrealizedPnLPercent).toBeLessThan(-0.10);
      expect(result!.lossCrossings[0].note.toLowerCase()).not.toMatch(/\b(buy|sell|purchase|order)\b/);
    });

    it('returns no flips when direction is unchanged between the two persisted signals', async () => {
      const { service } = createService({
        repository: {
          twoMostRecentSignals: jest.fn().mockResolvedValue([
            makeSignalRow('BULLISH', 80, 0),
            makeSignalRow('BULLISH', 75, 1),
          ]),
          latestPrice: jest.fn().mockResolvedValue({ adjustedClose: 85, close: 85 }),
        },
      });

      const result = await service.portfolioChanges('portfolio-1');

      expect(result!.signalFlips).toHaveLength(0);
    });

    it('returns empty with honest note when only one persisted signal exists (no prior to compare)', async () => {
      const { service } = createService({
        repository: {
          twoMostRecentSignals: jest.fn().mockResolvedValue([
            makeSignalRow('BULLISH', 80, 0),
          ]),
          latestPrice: jest.fn().mockResolvedValue({ adjustedClose: 85, close: 85 }),
        },
      });

      const result = await service.portfolioChanges('portfolio-1');

      expect(result).not.toBeNull();
      expect(result!.signalFlips).toHaveLength(0);
      // Honest note — references "prior" somewhere, does not fabricate a diff
      expect(result!.referenceNote.toLowerCase()).toContain('prior');
    });

    it('returns empty with honest note when no signals exist at all', async () => {
      const { service } = createService({
        repository: {
          twoMostRecentSignals: jest.fn().mockResolvedValue([]),
          latestPrice: jest.fn().mockResolvedValue(null),
        },
      });

      const result = await service.portfolioChanges('portfolio-1');

      expect(result).not.toBeNull();
      expect(result!.signalFlips).toHaveLength(0);
      expect(result!.lossCrossings).toHaveLength(0);
      expect(result!.referenceNote.toLowerCase()).toContain('no prior persisted signal');
    });

    it('returns null when portfolio is not found', async () => {
      const { service } = createService({
        repository: {
          getPortfolio: jest.fn().mockResolvedValue(null),
        },
      });

      const result = await service.portfolioChanges('nonexistent', 'default-user');
      expect(result).toBeNull();
    });

    it('does not recompute signals live — reads from repository only', async () => {
      const signalServiceMock = { latestForInstrument: jest.fn() };
      const { service } = createService({
        signalService: signalServiceMock,
        repository: {
          twoMostRecentSignals: jest.fn().mockResolvedValue([
            makeSignalRow('BULLISH', 80, 0),
            makeSignalRow('NEUTRAL', 50, 1),
          ]),
          latestPrice: jest.fn().mockResolvedValue({ adjustedClose: 85, close: 85 }),
        },
      });

      await service.portfolioChanges('portfolio-1');

      // Signal generation service must NOT be called
      expect(signalServiceMock.latestForInstrument).not.toHaveBeenCalled();
    });

    it('does not contain buy/sell language anywhere in the output', async () => {
      const { service } = createService({
        repository: {
          twoMostRecentSignals: jest.fn().mockResolvedValue([
            makeSignalRow('BEARISH', 30, 0),
            makeSignalRow('BULLISH', 80, 1),
          ]),
          latestPrice: jest.fn().mockResolvedValue({ adjustedClose: 60, close: 60 }),
        },
      });

      const result = await service.portfolioChanges('portfolio-1');
      const json = JSON.stringify(result).toLowerCase();
      expect(json).not.toMatch(/\b(buy|sell|purchase|order)\b/);
    });
  });
});
