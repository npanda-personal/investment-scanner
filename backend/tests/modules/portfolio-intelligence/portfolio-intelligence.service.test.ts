/// <reference types="@types/jest" />
import { PortfolioIntelligenceService } from '../../../src/modules/portfolio-intelligence';

const portfolio = {
  id: 'portfolio-1',
  name: 'Core',
  baseCurrency: 'USD',
  description: null,
  createdAt: '2026-04-28T00:00:00.000Z',
  updatedAt: '2026-04-28T00:00:00.000Z',
};

const holding = (overrides: any = {}) => ({
  id: overrides.id || 'holding-1',
  portfolioId: 'portfolio-1',
  instrumentId: overrides.instrumentId || 'stock-1',
  symbol: overrides.symbol || 'AAA',
  companyName: overrides.companyName || 'AAA Co',
  quantity: 10,
  averageCost: 80,
  currency: 'USD',
  notes: null,
  createdAt: '2026-04-28T00:00:00.000Z',
  updatedAt: '2026-04-28T00:00:00.000Z',
  currentPrice: overrides.currentPrice ?? 100,
  priceDate: overrides.priceDate ?? '2026-06-04',
  marketValue: overrides.marketValue ?? 1000,
  investedAmount: 800,
  unrealizedPnL: overrides.unrealizedPnL ?? 200,
  unrealizedPnLPercent: overrides.unrealizedPnLPercent ?? 0.25,
  dailyChange: overrides.dailyChange ?? 2,
  dailyChangePercent: overrides.dailyChangePercent ?? 0.02,
  allocationPercent: overrides.allocationPercent ?? 0.2,
  sector: overrides.sector || 'Technology',
  country: overrides.country || 'US',
  signal: overrides.signal === undefined ? {
    score: 82,
    direction: 'BULLISH',
    confidence: 'HIGH',
    generatedAt: new Date().toISOString(),
  } : overrides.signal,
});

const summary = (holdings: any[]) => ({
  portfolio,
  totalValue: holdings.reduce((total, item) => total + item.marketValue, 0),
  totalInvested: holdings.reduce((total, item) => total + item.investedAmount, 0),
  totalUnrealizedPnL: holdings.reduce((total, item) => total + item.unrealizedPnL, 0),
  totalUnrealizedPnLPercent: 0.1,
  dailyPnL: 0,
  dailyPnLPercent: 0,
  numberOfHoldings: holdings.length,
  holdings,
  source: 'portfolio-management',
  dataStatus: holdings.some((item) => item.currentPrice === null) ? 'PARTIAL' : 'COMPLETE',
  generatedAt: '2026-04-28T00:00:00.000Z',
});

const allocation = (holdings: any[]) => ({
  portfolioId: 'portfolio-1',
  byHolding: holdings.map((item) => ({ key: item.symbol, value: item.marketValue, allocationPercent: item.allocationPercent })),
  bySector: [{ key: 'Technology', value: holdings.reduce((total, item) => total + item.marketValue, 0), allocationPercent: 1 }],
  byCountry: [{ key: 'US', value: holdings.reduce((total, item) => total + item.marketValue, 0), allocationPercent: 1 }],
  byCurrency: [{ key: 'USD', value: holdings.reduce((total, item) => total + item.marketValue, 0), allocationPercent: 1 }],
  generatedAt: '2026-04-28T00:00:00.000Z',
});

/** Mock repository: always a cache miss so the service falls through to compute + persist. */
const mockRepo = () => ({
  findByPortfolioId: jest.fn().mockResolvedValue(null),
  upsertSnapshot: jest.fn().mockResolvedValue(undefined),
});

const serviceWith = (holdings: any[]) => new PortfolioIntelligenceService(
  {
    summary: jest.fn().mockResolvedValue(summary(holdings)),
    allocation: jest.fn().mockResolvedValue(allocation(holdings)),
  } as any,
  undefined,   // default thresholds
  undefined,   // no capitalPostureService
  mockRepo() as any,
);

describe('PortfolioIntelligenceService', () => {
  it('calculates health score and status thresholds', async () => {
    const result = await serviceWith([
      holding({ id: 'h1', symbol: 'AAA', allocationPercent: 0.2 }),
      holding({ id: 'h2', symbol: 'BBB', allocationPercent: 0.2, sector: 'Healthcare' }),
      holding({ id: 'h3', symbol: 'CCC', allocationPercent: 0.2, sector: 'Financials' }),
      holding({ id: 'h4', symbol: 'DDD', allocationPercent: 0.2, sector: 'Industrials' }),
      holding({ id: 'h5', symbol: 'EEE', allocationPercent: 0.2, sector: 'Energy' }),
    ]).intelligence('portfolio-1');

    expect(result?.healthScore).toBeGreaterThanOrEqual(50);
    expect(['HEALTHY', 'WATCH']).toContain(result?.status);
    expect(result?.scoreBreakdown.signalQuality).toBeGreaterThan(50);
  });

  it('labels missing price as high risk and creates red flags', async () => {
    const missingPrice = holding({
      currentPrice: null,
      marketValue: 0,
      unrealizedPnL: -800,
      unrealizedPnLPercent: -1,
      signal: null,
    });
    const result = await serviceWith([missingPrice]).intelligence('portfolio-1');

    expect(result?.holdings[0].decisionLabel).toBe('HIGH_RISK');
    expect(result?.redFlags.some((flag) => flag.category === 'data')).toBe(true);
    expect(result?.groupedSummary.dataIssues.length).toBe(1);
  });

  it('detects bearish and loss red flags', async () => {
    const result = await serviceWith([
      holding({
        unrealizedPnL: -200,
        unrealizedPnLPercent: -0.2,
        dailyChangePercent: -0.06,
        signal: { score: 25, direction: 'BEARISH', confidence: 'MEDIUM', generatedAt: new Date().toISOString() },
      }),
    ]).intelligence('portfolio-1');

    expect(result?.redFlags.map((flag) => flag.category)).toEqual(expect.arrayContaining(['holding-loss', 'daily-drop', 'signal']));
    expect(result?.reviewRanking[0].decisionLabel).toBe('HIGH_RISK');
  });

  it('sorts review ranking by urgency', async () => {
    const result = await serviceWith([
      holding({ id: 'good', symbol: 'GOOD' }),
      holding({ id: 'review', symbol: 'REV', signal: { score: 30, direction: 'BEARISH', confidence: 'LOW', generatedAt: new Date().toISOString() } }),
      holding({ id: 'risk', symbol: 'RISK', currentPrice: null, marketValue: 0, unrealizedPnL: -800, unrealizedPnLPercent: -1 }),
    ]).intelligence('portfolio-1');

    expect(result?.reviewRanking[0].symbol).toBe('RISK');
    expect(result?.reviewRanking[1].symbol).toBe('REV');
  });

  it('summarizes signal overlay', async () => {
    const result = await serviceWith([
      holding({ symbol: 'BULL', signal: { score: 80, direction: 'BULLISH', confidence: 'HIGH', generatedAt: new Date().toISOString() } }),
      holding({ symbol: 'BEAR', signal: { score: 20, direction: 'BEARISH', confidence: 'LOW', generatedAt: new Date().toISOString() } }),
      holding({ symbol: 'MISS', signal: null }),
    ]).intelligence('portfolio-1');

    expect(result?.signalOverlay).toMatchObject({
      bullishCount: 1,
      bearishCount: 1,
      missingSignalCount: 1,
    });
  });

  it('handles empty portfolios', async () => {
    const result = await serviceWith([]).intelligence('portfolio-1');

    expect(result?.status).toBe('AT_RISK');
    expect(result?.holdings).toEqual([]);
    expect(result?.redFlags.some((flag) => flag.category === 'diversification')).toBe(true);
  });
});
