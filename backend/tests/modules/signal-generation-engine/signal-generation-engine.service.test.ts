/// <reference types="@types/jest" />
import { SignalGenerationEngineService } from '../../../src/modules/signal-generation-engine';

const price = (index: number, adjusted_close: number, volume = 100) => ({
  date: new Date(2026, 3, 28 - index).toISOString(),
  close: adjusted_close,
  adjusted_close,
  volume,
});

describe('SignalGenerationEngineService', () => {
  it('calculates SMA values', () => {
    const service = new SignalGenerationEngineService({} as any, {} as any, {} as any);
    const prices = [price(0, 10), price(1, 20), price(2, 30)];

    expect(service.sma(prices, 2)).toBe(15);
    expect(service.sma(prices, 4)).toBeNull();
  });

  it('calculates RSI', () => {
    const service = new SignalGenerationEngineService({} as any, {} as any, {} as any);
    const prices = [
      price(0, 112),
      price(1, 110),
      price(2, 108),
      price(3, 106),
      price(4, 104),
      price(5, 103),
      price(6, 101),
      price(7, 100),
      price(8, 98),
      price(9, 96),
      price(10, 95),
      price(11, 94),
      price(12, 93),
      price(13, 92),
      price(14, 91),
    ];

    expect(service.rsi(prices, 14)).toBeGreaterThan(50);
  });

  it('detects 52-week high and low windows', () => {
    const service = new SignalGenerationEngineService({} as any, {} as any, {} as any);
    const prices = [price(0, 90), price(1, 120), price(2, 80)];

    expect(service.periodHigh(prices, 252)).toBe(120);
    expect(service.periodLow(prices, 252)).toBe(80);
  });

  it('calculates score and direction thresholds', () => {
    const service = new SignalGenerationEngineService({} as any, {} as any, {} as any);

    expect(service.compositeScore(1, 0.5, 0)).toBe(57);
    expect(service.directionForScore(70)).toBe('BULLISH');
    expect(service.directionForScore(40)).toBe('NEUTRAL');
    expect(service.directionForScore(39)).toBe('BEARISH');
  });

  it('generates explanations', () => {
    const service = new SignalGenerationEngineService({} as any, {} as any, {} as any);

    expect(service.explain('BULLISH', [{ code: 'A', label: 'price is above SMA50', category: 'TECHNICAL' }], []))
      .toContain('Bullish because price is above SMA50');
  });

  it('generates and persists an instrument signal', async () => {
    const saved: any[] = [];
    const repository = {
      createSignalResult: jest.fn(async (result) => {
        saved.push(result);
        return { ...result, id: 'signal-1' };
      }),
    };
    const prices = Array.from({ length: 260 }, (_, index) => price(index, 200 - index * 0.2, index === 0 ? 1000 : 100));
    const marketDataService = {
      getInstrument: jest.fn().mockResolvedValue({
        id: 'stock-1',
        symbol: 'ABC',
        company_name: 'ABC Co',
        sector: 'Technology',
        country: 'US',
      }),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices }),
      fundamentalsByInstrumentId: jest.fn().mockResolvedValue({
        records: [{ eps: 2, net_income: 1000000, pe_ratio: 15, dividend_yield: 0.03, market_cap: 1000000000 }],
      }),
    };
    const researchService = {
      workbench: jest.fn().mockResolvedValue({
        valuation: { peer_average_pe: 20, peer_average_dividend_yield: 0.02 },
        relative_strength: { relative_to_peer_average: 0.05 },
      }),
    };
    const service = new SignalGenerationEngineService(repository as any, marketDataService as any, researchService as any);

    const result = await service.generateForInstrument('stock-1');

    expect(result).toMatchObject({
      id: 'signal-1',
      instrument_id: 'stock-1',
      symbol: 'ABC',
      direction: 'BULLISH',
    });
    expect(saved[0].triggered_signals.length).toBeGreaterThan(0);
    expect(saved[0].explanation).toContain('Bullish because');
  });

  it('enriches top signal responses with current price context', async () => {
    const repository = {
      latestSignals: jest.fn().mockResolvedValue({
        signals: [{
          id: 'signal-1',
          instrument_id: 'stock-1',
          symbol: 'ABC',
          company_name: 'ABC Co',
          sector: 'Technology',
          country: 'US',
          currentPrice: null,
          previousClose: null,
          dailyChange: null,
          dailyChangePercent: null,
          currency: null,
          priceTimestamp: null,
          score: 80,
          direction: 'BULLISH',
          confidence: 'HIGH',
          triggered_signals: [],
          negative_signals: [],
          explanation: 'Bullish because price is above SMA50.',
          generated_at: '2026-04-28T00:00:00.000Z',
          source: 'signal-generation-engine',
          data_status: 'COMPLETE',
        }],
        total: 1,
        limit: 100,
        offset: 0
      }),
    };
    const marketDataService = {
      getInstrument: jest.fn().mockResolvedValue({ id: 'stock-1', currency: 'USD' }),
      latestPriceByInstrumentId: jest.fn().mockResolvedValue({ latest: { adjusted_close: 105, date: '2026-04-28T00:00:00.000Z' } }),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [{ adjusted_close: 105 }, { adjusted_close: 100 }] }),
    };
    const service = new SignalGenerationEngineService(repository as any, marketDataService as any, {} as any);

    const signals = await service.topSignals({ limit: 5 });

    expect(signals[0]).toMatchObject({
      currentPrice: 105,
      previousClose: 100,
      dailyChange: 5,
      dailyChangePercent: 0.05,
      currency: 'USD',
      priceTimestamp: '2026-04-28T00:00:00.000Z',
    });
  });

  it('returns null price context when market data is unavailable', async () => {
    const service = new SignalGenerationEngineService({} as any, {
      getInstrument: jest.fn().mockRejectedValue(new Error('missing')),
      latestPriceByInstrumentId: jest.fn().mockRejectedValue(new Error('missing')),
      listPricesByInstrumentId: jest.fn().mockRejectedValue(new Error('missing')),
    } as any, {} as any);

    const signal = await service.enrichSignal({
      instrument_id: 'stock-1',
      symbol: 'ABC',
      company_name: 'ABC Co',
      sector: null,
      country: null,
      currentPrice: null,
      previousClose: null,
      dailyChange: null,
      dailyChangePercent: null,
      currency: null,
      priceTimestamp: null,
      score: 50,
      direction: 'NEUTRAL',
      confidence: 'LOW',
      triggered_signals: [],
      negative_signals: [],
      explanation: 'Neutral because data is limited.',
      generated_at: '2026-04-28T00:00:00.000Z',
      source: 'signal-generation-engine',
      data_status: 'MISSING',
    });

    expect(signal).toMatchObject({
      currentPrice: null,
      previousClose: null,
      dailyChange: null,
      dailyChangePercent: null,
      currency: null,
      priceTimestamp: null,
    });
  });

  it('skips not-ready instruments when data quality filter is enabled and warns on missing evaluations', async () => {
    const repository = { createSignalResult: jest.fn() };
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'ready', symbol: 'RDY' }, { id: 'blocked', symbol: 'BLK' }, { id: 'missing', symbol: 'MSG' }] }),
    };
    const dataQualityService = {
      filterEligibleInstruments: jest.fn().mockResolvedValue({
        eligibleInstrumentIds: ['ready', 'missing'],
        excludedInstrumentIds: ['blocked'],
        missingQualityEvaluationCount: 1,
        warnings: ['missing: missing data quality evaluation'],
      }),
    };
    const service = new SignalGenerationEngineService(repository as any, marketDataService as any, {} as any, dataQualityService as any);
    jest.spyOn(service, 'generateForInstrument').mockImplementation(async (instrumentId) => ({
      instrument_id: instrumentId,
      symbol: instrumentId,
      company_name: null,
      sector: null,
      country: null,
      currentPrice: null,
      previousClose: null,
      dailyChange: null,
      dailyChangePercent: null,
      currency: null,
      priceTimestamp: null,
      score: 50,
      direction: 'NEUTRAL',
      confidence: 'LOW',
      triggered_signals: [],
      negative_signals: [],
      explanation: 'Neutral because data is limited.',
      generated_at: new Date().toISOString(),
      source: 'signal-generation-engine',
      data_status: 'PARTIAL',
    }));

    const result = await service.run({ limit: 3, useDataQualityFilter: true });

    expect(result.generated).toBe(2);
    expect(result.dataQuality).toMatchObject({ beforeFilter: 3, afterFilter: 2, excludedByDataQuality: 1, missingQualityEvaluationCount: 1 });
    expect(result.warnings[0]).toContain('missing data quality');
  });
});
