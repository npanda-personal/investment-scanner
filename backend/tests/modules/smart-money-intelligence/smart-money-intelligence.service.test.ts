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

const readyQuality = {
  coverageStatus: 'GOOD',
  signalReadinessStatus: 'READY',
  liquidityStatus: 'LIQUID',
  dataGaps: [],
  warnings: [],
  readinessBlockers: [],
};

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
    expect(summary.evidence?.evidenceStatus).toBe('UNAVAILABLE');
  });

  it('treats missing recent volume as insufficient instead of scoring it as zero-volume pressure', () => {
    const service = new SmartMoneyIntelligenceService({} as any, {} as any);
    const missingVolumeBars = bars('accumulation').map((bar, index) => index > 3 ? { ...bar, volume: null } : bar);
    const summary = service.calculateStockSummary(instrument, missingVolumeBars);

    expect(summary.status).toBe('INSUFFICIENT_DATA');
    expect(summary.explanation).toContain('volume history');
    expect(summary.evidence?.reasonCodes).toContain('INSUFFICIENT_VOLUME_HISTORY');
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

  describe('sector score classification bands', () => {
    /**
     * Verify the 5-band thresholds that prevent all sectors from collapsing to NEUTRAL:
     *   >= 62  → STRONG_ACCUMULATION
     *   56–61  → ACCUMULATING
     *   48–55  → NEUTRAL
     *   38–47  → DISTRIBUTING
     *   < 38   → STRONG_DISTRIBUTION
     */
    const classifyViaAggregate = (score: number) => {
      const service = new SmartMoneyIntelligenceService({} as any, {} as any);
      // Craft THREE stocks that average to exactly `score`. Three (>= minUniverseForStrong)
      // keeps the thin-universe softening from masking the raw band thresholds we test here.
      const mk = (id: string, symbol: string) => ({
        ...service.calculateStockSummary({ ...instrument, id, symbol }, bars('accumulation')),
        smartMoneyScore: score,
        status: 'NEUTRAL' as const,
      });
      return service.aggregateSectors([mk('stock-1', 'AAA'), mk('stock-2', 'BBB'), mk('stock-3', 'CCC')])[0].sectorStatus;
    };

    it('classifies score 63 as non-NEUTRAL (STRONG_ACCUMULATION per 5-band thresholds)', () => {
      const result = classifyViaAggregate(63);
      expect(result).toBe('STRONG_ACCUMULATION');
      expect(result).not.toBe('NEUTRAL');
    });

    it('classifies score 40 as DISTRIBUTING (not NEUTRAL)', () => {
      expect(classifyViaAggregate(40)).toBe('DISTRIBUTING');
    });

    it('classifies score 62 as STRONG_ACCUMULATION boundary', () => {
      expect(classifyViaAggregate(62)).toBe('STRONG_ACCUMULATION');
    });

    it('classifies score 56 as ACCUMULATING lower boundary', () => {
      expect(classifyViaAggregate(56)).toBe('ACCUMULATING');
    });

    it('classifies score 55 as NEUTRAL upper boundary', () => {
      expect(classifyViaAggregate(55)).toBe('NEUTRAL');
    });

    it('classifies score 48 as NEUTRAL lower boundary', () => {
      expect(classifyViaAggregate(48)).toBe('NEUTRAL');
    });

    it('classifies score 47 as DISTRIBUTING upper boundary', () => {
      expect(classifyViaAggregate(47)).toBe('DISTRIBUTING');
    });

    it('classifies score 38 as DISTRIBUTING lower boundary', () => {
      expect(classifyViaAggregate(38)).toBe('DISTRIBUTING');
    });

    it('classifies score 37 as STRONG_DISTRIBUTION', () => {
      expect(classifyViaAggregate(37)).toBe('STRONG_DISTRIBUTION');
    });
  });

  describe('thin-universe verdict softening', () => {
    // A 1–2 stock "sector" cannot honestly be called STRONG_*; the extreme verdict is
    // softened to its non-extreme neighbour below minUniverseForStrongVerdict (3).
    const softenedStatus = (score: number, stockCount: number) => {
      const service = new SmartMoneyIntelligenceService({} as any, {} as any);
      const summaries = Array.from({ length: stockCount }, (_item, index) => ({
        ...service.calculateStockSummary({ ...instrument, id: `stock-${index}`, symbol: `S${index}` }, bars('accumulation')),
        smartMoneyScore: score,
        status: 'NEUTRAL' as const,
      }));
      return service.aggregateSectors(summaries)[0].sectorStatus;
    };

    it('softens STRONG_ACCUMULATION to ACCUMULATING for a 2-stock sector', () => {
      expect(softenedStatus(70, 2)).toBe('ACCUMULATING');
    });

    it('softens STRONG_DISTRIBUTION to DISTRIBUTING for a 1-stock sector', () => {
      expect(softenedStatus(20, 1)).toBe('DISTRIBUTING');
    });

    it('keeps STRONG_ACCUMULATION once the sector has >= 3 stocks', () => {
      expect(softenedStatus(70, 3)).toBe('STRONG_ACCUMULATION');
    });
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
      saveSnapshot: jest.fn(async () => 'created'),
    };
    const marketDataService = {
      listInstruments: jest.fn(async () => ({ instruments: [instrument] })),
      listPricesByInstrumentId: jest.fn(async () => ({ prices: priceRows(181) })),
    };
    const dataQualityService = { diagnostics: jest.fn(async () => readyQuality) };
    const service = new SmartMoneyIntelligenceService(repository as any, marketDataService as any, {} as any, dataQualityService as any);

    const result = await service.run(10, { region: 'IN', assetType: 'STOCK' });

    expect(marketDataService.listInstruments).toHaveBeenCalledWith(expect.objectContaining({ region: 'IN', assetType: 'STOCK' }));
    expect(marketDataService.listPricesByInstrumentId).toHaveBeenCalledTimes(1);
    expect(marketDataService.listPricesByInstrumentId).toHaveBeenCalledWith('stock-1', 180);
    expect(repository.saveSnapshot).toHaveBeenCalledTimes(3);
    const savedRanges = (repository.saveSnapshot.mock.calls as any[][]).map((call) => call[0].range).sort();
    expect(savedRanges).toEqual(['1M', '3M', '6M']);
    expect(result.byRange).toEqual({
      '1M': { generated: 1, skipped: 0, unchanged: 0 },
      '3M': { generated: 1, skipped: 0, unchanged: 0 },
      '6M': { generated: 1, skipped: 0, unchanged: 0 },
    });
    expect(result.unchangedCount).toBe(0);
    expect(result.processedCount).toBe(1);
    expect(result.totalCount).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(result.nextOffset).toBeNull();
    expect(result.scope).toEqual({ region: 'IN', assetType: 'STOCK' });
  });

  it('returns bounded batch progress metadata for snapshot refresh', async () => {
    const repository = {
      saveSnapshot: jest.fn(async () => 'created'),
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
    const dataQualityService = { diagnostics: jest.fn(async () => readyQuality) };
    const service = new SmartMoneyIntelligenceService(repository as any, marketDataService as any, {} as any, dataQualityService as any);

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

  it('snaps a non-page-aligned offset down to its page boundary so the cursor stays consistent', async () => {
    const repository = { saveSnapshot: jest.fn(async () => 'created') };
    const marketDataService = {
      listInstruments: jest.fn(async () => ({
        instruments: [instrument],
        pagination: { page: 2, pageSize: 2, total: 10, totalPages: 5 },
      })),
      listPricesByInstrumentId: jest.fn(async () => ({ prices: priceRows(181) })),
    };
    const dataQualityService = { diagnostics: jest.fn(async () => readyQuality) };
    const service = new SmartMoneyIntelligenceService(repository as any, marketDataService as any, {} as any, dataQualityService as any);

    // offset 3 with pageSize 2 is not page-aligned → snaps to page 2 (offset 2).
    const result = await service.run(2, { region: 'IN', assetType: 'STOCK', offset: 3 });

    expect(marketDataService.listInstruments).toHaveBeenCalledWith({ page: 2, pageSize: 2, region: 'IN', assetType: 'STOCK' });
    expect(result.offset).toBe(2);
    expect(result.nextOffset).toBe(3); // offset(2) + processedCount(1)
    expect(result.hasMore).toBe(true);
  });

  it('refreshes explicit instrument ids without region-wide pagination', async () => {
    const repository = {
      saveSnapshot: jest.fn(async () => 'created'),
    };
    const marketDataService = {
      getInstrumentsByIds: jest.fn(async () => [
        { ...instrument, id: 'stock-2', symbol: 'BBB' },
        { ...instrument, id: 'stock-1', symbol: 'AAA' },
      ]),
      listInstruments: jest.fn(),
      listPricesByInstrumentId: jest.fn(async () => ({ prices: priceRows(181) })),
    };
    const dataQualityService = { diagnostics: jest.fn(async () => readyQuality) };
    const service = new SmartMoneyIntelligenceService(repository as any, marketDataService as any, {} as any, dataQualityService as any);

    const result = await service.run(25, {
      region: 'IN',
      assetType: 'STOCK',
      instrumentIds: ['stock-2', 'stock-1', 'stock-2'],
    });

    expect(marketDataService.getInstrumentsByIds).toHaveBeenCalledWith(['stock-2', 'stock-1']);
    expect(marketDataService.listInstruments).not.toHaveBeenCalled();
    expect(marketDataService.listPricesByInstrumentId).toHaveBeenCalledTimes(2);
    expect(repository.saveSnapshot).toHaveBeenCalledTimes(6);
    expect(result).toMatchObject({
      processedCount: 2,
      totalCount: 2,
      batchSize: 25,
      offset: 0,
      nextOffset: null,
      hasMore: false,
      generatedCount: 6,
      failedCount: 0,
    });
  });

  it('reports unchanged snapshots without rewriting persisted evidence', async () => {
    const repository = {
      saveSnapshot: jest.fn(async () => 'unchanged'),
    };
    const marketDataService = {
      listInstruments: jest.fn(async () => ({ instruments: [instrument] })),
      listPricesByInstrumentId: jest.fn(async () => ({ prices: priceRows(181) })),
    };
    const dataQualityService = { diagnostics: jest.fn(async () => readyQuality) };
    const service = new SmartMoneyIntelligenceService(repository as any, marketDataService as any, {} as any, dataQualityService as any);

    const result = await service.run(10, { region: 'IN', assetType: 'STOCK' });

    expect(result.generatedCount).toBe(0);
    expect(result.unchangedCount).toBe(3);
    expect(result.byRange['3M']).toEqual({ generated: 0, skipped: 0, unchanged: 1 });
  });

  it('skips refresh scoring when Data Quality blocks the instrument', async () => {
    const repository = {
      saveSnapshot: jest.fn(),
    };
    const marketDataService = {
      listInstruments: jest.fn(async () => ({ instruments: [instrument] })),
      listPricesByInstrumentId: jest.fn(async () => ({ prices: priceRows(181) })),
    };
    const dataQualityService = {
      diagnostics: jest.fn(async () => ({
        ...readyQuality,
        coverageStatus: 'UNUSABLE',
        signalReadinessStatus: 'NOT_READY',
        dataGaps: ['stale or unusable prices'],
      })),
    };
    const service = new SmartMoneyIntelligenceService(repository as any, marketDataService as any, {} as any, dataQualityService as any);

    const result = await service.run(10, { region: 'IN', assetType: 'STOCK' });

    expect(repository.saveSnapshot).not.toHaveBeenCalled();
    expect(result.generatedCount).toBe(0);
    expect(result.skippedCount).toBe(3);
    expect(result.failedCount).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings[0]).toContain('Data quality blocks');
  });

  it('does not persist on-demand detail fallback when no snapshot exists', async () => {
    const repository = {
      latestStockSnapshot: jest.fn(async () => null),
      saveSnapshot: jest.fn(),
    };
    const marketDataService = {
      getInstrument: jest.fn(async () => instrument),
      listPricesByInstrumentId: jest.fn(async () => ({ prices: priceRows(181) })),
    };
    const dataQualityService = { diagnostics: jest.fn(async () => readyQuality) };
    const service = new SmartMoneyIntelligenceService(repository as any, marketDataService as any, {} as any, dataQualityService as any);

    const summary = await service.stock('stock-1', '3M');

    expect(summary?.evidence?.provenance.source).toBe('ON_DEMAND_DERIVED');
    expect(summary?.evidence?.provenance.downstreamSafe).toBe(false);
    expect(repository.saveSnapshot).not.toHaveBeenCalled();
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
