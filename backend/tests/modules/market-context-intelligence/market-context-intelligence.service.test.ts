/// <reference types="@types/jest" />
import { MarketContextIntelligenceService } from '../../../src/modules/market-context-intelligence';

const instrument = (overrides: any = {}) => ({
  instrumentId: overrides.instrumentId || 'stock-1',
  symbol: overrides.symbol || 'AAA',
  sector: overrides.sector || 'Technology',
  country: overrides.country || 'US',
  latest: overrides.latest ?? 120,
  previous: overrides.previous ?? 118,
  prices: overrides.prices || Array.from({ length: 260 }, (_, index) => 120 - index * 0.2),
  signalDirection: overrides.signalDirection || 'BULLISH',
  signalScore: overrides.signalScore ?? 80,
});

describe('MarketContextIntelligenceService', () => {
  it('calculates regime score and status', () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const result = service.calculateRegime([instrument(), instrument({ symbol: 'BBB', sector: 'Financials' })]);

    expect(result.score).toBeGreaterThan(50);
    expect(result.regime).toBe('RISK_ON');
  });

  it('ranks sectors and classifies leadership', () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const sectors = service.rankSectors([
      instrument({ sector: 'Technology', prices: Array.from({ length: 260 }, (_, index) => 140 - index * 0.5) }),
      instrument({ sector: 'Utilities', prices: Array.from({ length: 260 }, (_, index) => 90 + index * 0.1), signalDirection: 'BEARISH' }),
    ]);

    expect(sectors[0].sector).toBe('Technology');
    expect(['LEADING', 'IMPROVING']).toContain(sectors[0].leadershipStatus);
  });

  it('calculates breadth', () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const breadth = service.calculateBreadth([instrument(), instrument({ signalDirection: 'BEARISH' })]);

    expect(breadth.instrumentCount).toBe(2);
    expect(breadth.percentAboveSma50).toBeGreaterThan(0);
    expect(breadth.bullishSignalCount).toBe(1);
    expect(breadth.bearishSignalCount).toBe(1);
  });

  it('ranks countries', () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const countries = service.rankCountries([instrument({ country: 'US' }), instrument({ country: 'India' })]);

    expect(countries.map((item) => item.country)).toEqual(expect.arrayContaining(['US', 'India']));
  });

  it('returns missing macro fallback', () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    expect(service.macro()).toMatchObject({ macroStatus: 'UNKNOWN', dataStatus: 'MISSING' });
  });

  it('builds summary response shape', async () => {
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'stock-1', symbol: 'AAA', sector: 'Technology', country: 'US' }] }),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: instrument().prices.map((close: number) => ({ adjusted_close: close })) }),
    };
    const signalService = { topSignals: jest.fn().mockResolvedValue({ signals: [{ instrument_id: 'stock-1', direction: 'BULLISH', score: 80 }], total: 1, limit: 100, offset: 0 }) };
    const repository = {
      latestSnapshot: jest.fn().mockResolvedValue({
        regime: { regime: 'RISK_ON', score: 80, explanation: '', dataStatus: 'COMPLETE', updatedAt: '' },
        topSectors: [],
        weakSectors: [],
        breadth: { percentAboveSma50: 0.8, percentAboveSma200: 0.8, advanceDeclineRatio: 1.5, newHigh52WeekCount: 10, newLow52WeekCount: 2, bullishSignalCount: 10, bearishSignalCount: 2, instrumentCount: 100, dataStatus: 'COMPLETE' },
        countryStrength: [],
        macro: { macroStatus: 'UNKNOWN', dataStatus: 'MISSING', explanation: 'Macro providers are not configured yet.', interestRateProxy: null, inflationProxy: null, usdStrengthProxy: null, commodityProxy: null },
        explanation: ['Test'],
        updatedAt: '2026-01-01',
        dataStatus: 'COMPLETE'
      }),
      saveSnapshot: jest.fn(),
    };
    const service = new MarketContextIntelligenceService(repository as any, marketDataService as any, signalService as any);

    const summary = await service.summary();

    expect(summary).toHaveProperty('regime');
    expect(summary).toHaveProperty('topSectors');
    expect(summary).toHaveProperty('breadth');
    expect(summary.explanation.length).toBeGreaterThan(0);
  });
});
