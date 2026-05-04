/// <reference types="@types/jest" />
import { SmartMoneyIntelligenceService } from '../../../src/modules/smart-money-intelligence';
import type { SmartMoneyPriceBar } from '../../../src/modules/smart-money-intelligence';

const bars = (mode: 'accumulation' | 'distribution' = 'accumulation'): SmartMoneyPriceBar[] => {
  const start = new Date('2026-01-01T00:00:00.000Z');
  const base = Array.from({ length: 20 }, (_item, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      open: 100 + index,
      high: 102 + index,
      low: 99 + index,
      close: 101 + index,
      volume: 1000,
    };
  });
  const latestDate = new Date(start);
  latestDate.setDate(start.getDate() + 20);
  return [
    ...base,
    mode === 'accumulation'
      ? { date: latestDate.toISOString().slice(0, 10), open: 121, high: 126, low: 120, close: 125, volume: 2200 }
      : { date: latestDate.toISOString().slice(0, 10), open: 121, high: 122, low: 115, close: 116, volume: 2300 },
  ];
};

const instrument = { id: 'stock-1', symbol: 'AAA', company_name: 'AAA Co', sector: 'Technology' };

describe('SmartMoneyIntelligenceService', () => {
  it('detects unusual volume and accumulation signals', () => {
    const service = new SmartMoneyIntelligenceService({} as any, {} as any);
    const signals = service.detectSignals(bars('accumulation'), 1000);

    expect(signals.map((signal) => signal.type)).toEqual(expect.arrayContaining([
      'UNUSUAL_VOLUME',
      'PRICE_UP_HIGH_VOLUME',
      'CLOSE_NEAR_HIGH',
    ]));
  });

  it('detects distribution signals', () => {
    const service = new SmartMoneyIntelligenceService({} as any, {} as any);
    const summary = service.calculateStockSummary(instrument, bars('distribution'));

    expect(summary.status).toBe('DISTRIBUTION');
    expect(summary.signals.map((signal) => signal.type)).toEqual(expect.arrayContaining([
      'PRICE_DOWN_HIGH_VOLUME',
      'CLOSE_NEAR_LOW',
    ]));
  });

  it('calculates accumulation score and partial data status when ownership is missing', () => {
    const service = new SmartMoneyIntelligenceService({} as any, {} as any);
    const summary = service.calculateStockSummary(instrument, bars('accumulation'));

    expect(summary.smartMoneyScore).toBeGreaterThanOrEqual(70);
    expect(summary.status).toBe('ACCUMULATION');
    expect(summary.dataStatus).toBe('PARTIAL');
    expect(summary.insiderOwnership.ownershipDataStatus).toBe('MISSING');
  });

  it('handles insufficient data explicitly', () => {
    const service = new SmartMoneyIntelligenceService({} as any, {} as any);
    const summary = service.calculateStockSummary(instrument, bars('accumulation').slice(0, 5));

    expect(summary.status).toBe('INSUFFICIENT_DATA');
    expect(summary.dataStatus).toBe('MISSING');
  });

  it('aggregates sector smart money scores', () => {
    const service = new SmartMoneyIntelligenceService({} as any, {} as any);
    const sectors = service.aggregateSectors([
      service.calculateStockSummary(instrument, bars('accumulation')),
      service.calculateStockSummary({ ...instrument, id: 'stock-2', symbol: 'BBB' }, bars('distribution')),
    ]);

    expect(sectors[0]).toHaveProperty('sector', 'Technology');
    expect(sectors[0].instrumentCount).toBe(2);
  });

  it('returns top accumulation and distribution lists from mocked repository', async () => {
    const repository = {
      latestSnapshots: jest.fn(async (_query, isDistribution) => ({
        results: [
          isDistribution 
            ? { symbol: 'BBB', status: 'DISTRIBUTION' } 
            : { symbol: 'AAA', status: 'ACCUMULATION' }
        ],
        total: 1
      }))
    };
    const service = new SmartMoneyIntelligenceService(repository as any, {} as any, {} as any);

    const top = await service.top({ limit: 5, range: '3M' });
    const distribution = await service.distribution({ limit: 5, range: '3M' });

    expect(top.results[0].symbol).toBe('AAA');
    expect(distribution.results[0].symbol).toBe('BBB');
  });
});
