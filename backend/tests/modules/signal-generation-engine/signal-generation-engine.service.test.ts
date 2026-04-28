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
});

