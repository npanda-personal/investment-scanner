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

const priceRows = (count: number) => {
  const start = new Date('2026-01-01T00:00:00.000Z');
  return Array.from({ length: count }, (_item, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date: date.toISOString(),
      open: 100 + index,
      high: 103 + index,
      low: 99 + index,
      close: 101 + index,
      adjusted_close: 101 + index,
      volume: index === count - 1 ? 2500 : 1000,
    };
  });
};

const mixedRegimeBars = (): SmartMoneyPriceBar[] => {
  const start = new Date('2026-01-01T00:00:00.000Z');
  const rows: SmartMoneyPriceBar[] = [];
  let close = 220;
  for (let index = 0; index < 145; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    close -= 0.55;
    rows.push({
      date: date.toISOString().slice(0, 10),
      open: close + 0.4,
      high: close + 0.8,
      low: close - 1.2,
      close,
      volume: 3200,
    });
  }
  for (let index = 145; index < 180; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    close += 0.7;
    rows.push({
      date: date.toISOString().slice(0, 10),
      open: close - 0.3,
      high: close + 1.1,
      low: close - 0.6,
      close,
      volume: 2600,
    });
  }
  return rows;
};

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

    const top = await service.top({ limit: 5, range: '3M', region: 'IN', assetType: 'STOCK' });
    const distribution = await service.distribution({ limit: 5, range: '3M', region: 'IN', assetType: 'STOCK' });

    expect(repository.latestSnapshots).toHaveBeenCalledWith(expect.objectContaining({ region: 'IN', assetType: 'STOCK' }), false);
    expect(repository.latestSnapshots).toHaveBeenCalledWith(expect.objectContaining({ region: 'IN', assetType: 'STOCK' }), true);
    expect(top.results[0].symbol).toBe('AAA');
    expect(distribution.results[0].symbol).toBe('BBB');
  });

  it('refreshes persisted snapshots for every supported range', async () => {
    const repository = {
      saveSnapshot: jest.fn(async () => undefined),
    };
    const marketDataService = {
      listInstruments: jest.fn(async () => ({ instruments: [instrument] })),
      listPricesByInstrumentId: jest.fn(async () => ({ prices: priceRows(181) })),
    };
    const service = new SmartMoneyIntelligenceService(repository as any, marketDataService as any, {} as any);

    const result = await service.run(10, { region: 'IN', assetType: 'STOCK' });

    expect(marketDataService.listInstruments).toHaveBeenCalledWith(expect.objectContaining({ region: 'IN', assetType: 'STOCK' }));
    expect(marketDataService.listPricesByInstrumentId).toHaveBeenCalledTimes(1);
    expect(marketDataService.listPricesByInstrumentId).toHaveBeenCalledWith('stock-1', 180);
    expect(repository.saveSnapshot).toHaveBeenCalledTimes(3);
    const savedRanges = (repository.saveSnapshot.mock.calls as any[][]).map((call) => call[0].range).sort();
    expect(savedRanges).toEqual(['1M', '3M', '6M']);
    expect(result.byRange).toEqual({
      '1M': { generated: 1, skipped: 0 },
      '3M': { generated: 1, skipped: 0 },
      '6M': { generated: 1, skipped: 0 },
    });
    expect(result.processedCount).toBe(1);
    expect(result.totalCount).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(result.nextOffset).toBeNull();
    expect(result.scope).toEqual({ region: 'IN', assetType: 'STOCK' });
  });

  it('returns bounded batch progress metadata for snapshot refresh', async () => {
    const repository = {
      saveSnapshot: jest.fn(async () => undefined),
    };
    const instruments = [
      { ...instrument, id: 'stock-1', symbol: 'AAA' },
      { ...instrument, id: 'stock-2', symbol: 'BBB' },
    ];
    const marketDataService = {
      listInstruments: jest.fn(async () => ({
        instruments,
        pagination: { page: 1, pageSize: 2, total: 5, totalPages: 3 },
      })),
      listPricesByInstrumentId: jest.fn(async () => ({ prices: priceRows(181) })),
    };
    const service = new SmartMoneyIntelligenceService(repository as any, marketDataService as any, {} as any);

    const result = await service.run(2, { region: 'IN', assetType: 'STOCK', offset: 0 });

    expect(marketDataService.listInstruments).toHaveBeenCalledWith({ page: 1, pageSize: 2, region: 'IN', assetType: 'STOCK' });
    expect(result.batchSize).toBe(2);
    expect(result.offset).toBe(0);
    expect(result.processedCount).toBe(2);
    expect(result.totalCount).toBe(5);
    expect(result.nextOffset).toBe(2);
    expect(result.hasMore).toBe(true);
    expect(result.generatedCount).toBe(6);
    expect(repository.saveSnapshot).toHaveBeenCalledTimes(6);
  });

  it('uses the selected range window as scoring evidence instead of cloning the latest 20-day result', () => {
    const service = new SmartMoneyIntelligenceService({} as any, {} as any);
    const allBars = mixedRegimeBars();

    const oneMonth = service.calculateStockSummary(instrument, allBars.slice(-35), undefined, '1M');
    const sixMonth = service.calculateStockSummary(instrument, allBars.slice(-180), undefined, '6M');

    expect(oneMonth.signals.map((signal) => signal.type)).toContain('RANGE_ACCUMULATION_1M');
    expect(sixMonth.signals.map((signal) => signal.type)).toContain('RANGE_DISTRIBUTION_6M');
    expect(oneMonth.smartMoneyScore).toBeGreaterThan(sixMonth.smartMoneyScore);
    expect(oneMonth.status).not.toBe(sixMonth.status);
  });
});
