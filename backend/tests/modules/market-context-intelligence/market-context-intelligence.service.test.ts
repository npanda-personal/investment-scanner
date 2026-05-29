/// <reference types="@types/jest" />
import { MarketContextIntelligenceService } from '../../../src/modules/market-context-intelligence';

const instrument = (overrides: any = {}) => ({
  instrumentId: overrides.instrumentId || 'stock-1',
  symbol: overrides.symbol || 'AAA',
  sector: overrides.sector === undefined ? 'Technology' : overrides.sector,
  country: overrides.country === undefined ? 'US' : overrides.country,
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

  it('excludes missing or Unknown sectors from leadership rankings', () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const sectors = service.rankSectors([
      instrument({ sector: 'Unknown', prices: Array.from({ length: 260 }, (_, index) => 160 - index) }),
      instrument({ sector: null, prices: Array.from({ length: 260 }, (_, index) => 150 - index) }),
      instrument({ sector: 'Financial Services', prices: Array.from({ length: 260 }, (_, index) => 120 - index * 0.2) }),
    ]);

    expect(sectors.map((sector) => sector.sector)).toEqual(['Financial Services']);
    expect(sectors[0].leadershipStatus).toBeDefined();
  });

  it('does not classify the only named sector as both top and weak', async () => {
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'stock-1', symbol: 'AAA', sector: 'Financial Services', country: 'India' }] }),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: instrument().prices.map((close: number) => ({ adjusted_close: close })) }),
    };
    const signalService = { topSignals: jest.fn().mockResolvedValue({ signals: [] }) };
    const repository = { saveSnapshot: jest.fn().mockResolvedValue(undefined) };
    const service = new MarketContextIntelligenceService(repository as any, marketDataService as any, signalService as any);

    await service.run('IN');

    const savedSummary = repository.saveSnapshot.mock.calls[0][0];
    expect(savedSummary.topSectors.map((sector: any) => sector.sector)).toEqual(['Financial Services']);
    expect(savedSummary.weakSectors).toEqual([]);
  });

  it('calculates breadth', () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const breadth = service.calculateBreadth([instrument(), instrument({ signalDirection: 'BEARISH' })]);

    expect(breadth.instrumentCount).toBe(2);
    expect(breadth.sma50SampleCount).toBe(2);
    expect(breadth.sma200SampleCount).toBe(2);
    expect(breadth.percentAboveSma50).toBeGreaterThan(0);
    expect(breadth.bullishSignalCount).toBe(1);
    expect(breadth.bearishSignalCount).toBe(1);
  });

  it('uses indicator-specific breadth sample counts', () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const fullHistory = instrument({ symbol: 'FULL', prices: Array.from({ length: 260 }, (_, index) => 120 - index * 0.2) });
    const sma50Only = instrument({ symbol: 'SMA50', prices: Array.from({ length: 60 }, (_, index) => 100 - index * 0.1) });
    const tooShort = instrument({ symbol: 'SHORT', prices: Array.from({ length: 10 }, (_, index) => 90 - index * 0.1) });

    const breadth = service.calculateBreadth([fullHistory, sma50Only, tooShort]);

    expect(breadth.instrumentCount).toBe(3);
    expect(breadth.sma50SampleCount).toBe(2);
    expect(breadth.sma200SampleCount).toBe(1);
    expect(breadth.percentAboveSma50).not.toBeNull();
    expect(breadth.percentAboveSma200).not.toBeNull();
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

  it('persists generated snapshots using the requested region', async () => {
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'stock-1', symbol: 'AAA', sector: 'Technology', country: 'India' }] }),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: instrument().prices.map((close: number) => ({ adjusted_close: close })) }),
    };
    const signalService = { topSignals: jest.fn().mockResolvedValue({ signals: [{ instrument_id: 'stock-1', direction: 'BULLISH', score: 80 }] }) };
    const repository = {
      saveSnapshot: jest.fn().mockResolvedValue(undefined),
    };
    const service = new MarketContextIntelligenceService(repository as any, marketDataService as any, signalService as any);

    await service.run('IN');

    expect(marketDataService.listInstruments).toHaveBeenCalledWith({ page: 1, pageSize: 500, region: 'IN' });
    expect(signalService.topSignals).toHaveBeenCalledWith({ limit: 100, region: 'IN' });
    expect(repository.saveSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      regime: expect.any(Object),
      breadth: expect.any(Object),
    }), 'IN');
  });

  it('summary loads the requested region and re-reads that region after generation', async () => {
    const summary = {
      regime: { regime: 'RISK_ON', score: 80, explanation: '', dataStatus: 'COMPLETE', updatedAt: '' },
      topSectors: [],
      weakSectors: [],
      breadth: { percentAboveSma50: 0.8, percentAboveSma200: 0.8, advanceDeclineRatio: 1.5, newHigh52WeekCount: 10, newLow52WeekCount: 2, bullishSignalCount: 10, bearishSignalCount: 2, instrumentCount: 100, dataStatus: 'COMPLETE' },
      countryStrength: [],
      macro: { macroStatus: 'UNKNOWN', dataStatus: 'MISSING', explanation: 'Macro providers are not configured yet.', interestRateProxy: null, inflationProxy: null, usdStrengthProxy: null, commodityProxy: null },
      explanation: ['Test'],
      updatedAt: '2026-01-01',
      dataStatus: 'COMPLETE'
    };
    const repository = {
      latestSnapshot: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(summary),
      saveSnapshot: jest.fn().mockResolvedValue(undefined),
    };
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'stock-1', symbol: 'AAA', sector: 'Technology', country: 'India' }] }),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: instrument().prices.map((close: number) => ({ adjusted_close: close })) }),
    };
    const signalService = { topSignals: jest.fn().mockResolvedValue({ signals: [] }) };
    const service = new MarketContextIntelligenceService(repository as any, marketDataService as any, signalService as any);

    const result = await service.summary({ region: 'IN' });

    expect(repository.latestSnapshot).toHaveBeenNthCalledWith(1, 'IN');
    expect(repository.latestSnapshot).toHaveBeenNthCalledWith(2, 'IN');
    expect(repository.saveSnapshot).toHaveBeenCalledWith(expect.any(Object), 'IN');
    expect(result).toBe(summary);
  });

  it('returns persisted summary without generating when snapshot exists', async () => {
    const summary = {
      regime: { regime: 'RISK_ON', score: 80, explanation: '', dataStatus: 'COMPLETE', updatedAt: '2026-05-27T05:00:00.000Z' },
      topSectors: [],
      weakSectors: [],
      breadth: { percentAboveSma50: 0.8, percentAboveSma200: 0.8, advanceDeclineRatio: 1.5, newHigh52WeekCount: 10, newLow52WeekCount: 2, bullishSignalCount: 10, bearishSignalCount: 2, instrumentCount: 100, dataStatus: 'COMPLETE' },
      countryStrength: [],
      macro: { macroStatus: 'UNKNOWN', dataStatus: 'MISSING', explanation: 'Macro providers are not configured yet.', interestRateProxy: null, inflationProxy: null, usdStrengthProxy: null, commodityProxy: null },
      explanation: ['Test'],
      updatedAt: '2026-05-27T05:00:00.000Z',
      dataStatus: 'COMPLETE'
    };
    const repository = {
      latestPersistedSnapshot: jest.fn().mockResolvedValue(summary),
      saveSnapshot: jest.fn(),
    };
    const marketDataService = {
      listInstruments: jest.fn(),
      listPricesByInstrumentId: jest.fn(),
    };
    const signalService = { topSignals: jest.fn() };
    const service = new MarketContextIntelligenceService(repository as any, marketDataService as any, signalService as any);

    const result = await service.latestPersistedSummary('IN');

    expect(result).toBe(summary);
    expect(repository.latestPersistedSnapshot).toHaveBeenCalledWith('IN');
    expect(repository.saveSnapshot).not.toHaveBeenCalled();
    expect(marketDataService.listInstruments).not.toHaveBeenCalled();
    expect(signalService.topSignals).not.toHaveBeenCalled();
  });

  it('returns null for latest persisted summary without generating when no snapshot exists', async () => {
    const repository = {
      latestPersistedSnapshot: jest.fn().mockResolvedValue(null),
      saveSnapshot: jest.fn(),
    };
    const marketDataService = {
      listInstruments: jest.fn(),
      listPricesByInstrumentId: jest.fn(),
    };
    const signalService = { topSignals: jest.fn() };
    const service = new MarketContextIntelligenceService(repository as any, marketDataService as any, signalService as any);

    const result = await service.latestPersistedSummary('IN');

    expect(result).toBeNull();
    expect(repository.latestPersistedSnapshot).toHaveBeenCalledWith('IN');
    expect(repository.saveSnapshot).not.toHaveBeenCalled();
    expect(marketDataService.listInstruments).not.toHaveBeenCalled();
    expect(signalService.topSignals).not.toHaveBeenCalled();
  });
});
