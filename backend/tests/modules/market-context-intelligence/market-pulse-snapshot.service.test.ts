/// <reference types="@types/jest" />
import { MarketPulseSnapshotService } from '../../../src/modules/market-context-intelligence/market-pulse-snapshot.service';
import type {
  MarketPulseCalculationData,
  MarketPulsePricePoint,
} from '../../../src/modules/market-context-intelligence/market-pulse-snapshot.types';

function priceSeries(symbol: string, source: string, latestClose: number, dailyStep: number, count: number): MarketPulsePricePoint[] {
  const latestDate = new Date('2026-05-29T00:00:00.000Z');
  return Array.from({ length: count }, (_unused, index) => ({
    symbol,
    label: symbol,
    source,
    timestamp: new Date(latestDate.getTime() - index * 24 * 60 * 60 * 1000),
    close: latestClose - index * dailyStep,
    adjustedClose: latestClose - index * dailyStep,
    volume: 100000 + index,
  }));
}

function baseData(overrides: Partial<MarketPulseCalculationData> = {}): MarketPulseCalculationData {
  return {
    region: 'IN',
    assetType: 'STOCK',
    stockUniverse: [
      { id: 'stock-1', symbol: 'AAA', sector: 'Information Technology', marketCap: 1000000 },
      { id: 'stock-2', symbol: 'BBB', sector: 'Financial Services', marketCap: 1000000 },
      { id: 'stock-3', symbol: 'CCC', sector: 'Energy', marketCap: 1000000 },
    ],
    stockPrices: [
      ...priceSeries('AAA', 'NSE_UDIFF_CM_BHAVCOPY', 150, 1, 230),
      ...priceSeries('BBB', 'NSE_UDIFF_CM_BHAVCOPY', 120, 0.4, 230),
      ...priceSeries('CCC', 'NSE_UDIFF_CM_BHAVCOPY', 80, -0.5, 230),
    ],
    indexPrices: [
      ...priceSeries('NIFTY_FAST', 'NSE_INDEX_EOD', 24000, 30, 90),
      ...priceSeries('NIFTY_SLOW', 'NSE_INDEX_EOD', 21000, 5, 90),
      ...priceSeries('NIFTY_WEAK', 'NSE_INDEX_EOD', 18000, -20, 90),
    ],
    sectorIndexPrices: [
      ...priceSeries('NIFTY_IT', 'NIFTY_SECTOR_INDEX', 36000, 70, 90),
      ...priceSeries('NIFTY_BANK', 'NIFTY_SECTOR_INDEX', 48000, 8, 90),
      ...priceSeries('NIFTY_PSU_BANK', 'NIFTY_SECTOR_INDEX', 6500, -8, 90),
    ],
    deliverySnapshots: [
      {
        symbol: 'AAA',
        tradingDate: new Date('2026-05-29T00:00:00.000Z'),
        deliveryPercent: 68,
        tradedQuantity: 100000,
        deliverableQuantity: 68000,
      },
      {
        symbol: 'BBB',
        tradingDate: new Date('2026-05-29T00:00:00.000Z'),
        deliveryPercent: 42,
        tradedQuantity: 80000,
        deliverableQuantity: 33600,
      },
    ],
    sourceImports: [
      { source: 'NSE', segment: 'CM', status: 'COMPLETED', tradingDate: new Date('2026-05-29T00:00:00.000Z'), importedAt: new Date('2026-05-30T02:00:00.000Z') },
      { source: 'NSE', segment: 'INDEX', status: 'COMPLETED', tradingDate: new Date('2026-05-29T00:00:00.000Z'), importedAt: new Date('2026-05-30T02:01:00.000Z') },
      { source: 'NSE', segment: 'SECTOR_INDEX', status: 'COMPLETED', tradingDate: new Date('2026-05-29T00:00:00.000Z'), importedAt: new Date('2026-05-30T02:02:00.000Z') },
      { source: 'NSE', segment: 'DELIVERY', status: 'COMPLETED', tradingDate: new Date('2026-05-29T00:00:00.000Z'), importedAt: new Date('2026-05-30T02:03:00.000Z') },
    ],
    ...overrides,
  };
}

describe('MarketPulseSnapshotService', () => {
  const generatedAt = new Date('2026-06-01T06:00:00.000Z');

  it('maps market health scores to approved threshold labels', () => {
    const service = new MarketPulseSnapshotService({} as any);

    expect(service.marketHealthLabelForScore(100)).toBe('HEALTHY');
    expect(service.marketHealthLabelForScore(80)).toBe('HEALTHY');
    expect(service.marketHealthLabelForScore(79)).toBe('TRADABLE_BUT_SELECTIVE');
    expect(service.marketHealthLabelForScore(60)).toBe('TRADABLE_BUT_SELECTIVE');
    expect(service.marketHealthLabelForScore(59)).toBe('FRAGILE');
    expect(service.marketHealthLabelForScore(40)).toBe('FRAGILE');
    expect(service.marketHealthLabelForScore(39)).toBe('RISKY');
  });

  it('calculates freshness from completed source imports and reports fresh scope status', () => {
    const service = new MarketPulseSnapshotService({} as any);

    const freshness = service.calculateFreshness(baseData().sourceImports, 'IN', generatedAt);

    expect(freshness.status).toBe('FRESH');
    expect(freshness.score).toBe(100);
    expect(freshness.dataThroughDate?.toISOString()).toBe('2026-05-29T00:00:00.000Z');
    expect(freshness.warnings).toEqual([]);
  });

  it('marks stale or partial source segments with explicit warnings', () => {
    const service = new MarketPulseSnapshotService({} as any);

    const freshness = service.calculateFreshness([
      { source: 'NSE', segment: 'CM', status: 'COMPLETED', tradingDate: new Date('2026-05-22T00:00:00.000Z'), importedAt: new Date('2026-05-22T18:00:00.000Z') },
      { source: 'NSE', segment: 'INDEX', status: 'COMPLETED', tradingDate: new Date('2026-05-29T00:00:00.000Z'), importedAt: new Date('2026-05-30T02:00:00.000Z') },
    ], 'IN', generatedAt);

    expect(freshness.status).toBe('PARTIAL');
    expect(freshness.score).toBeLessThan(100);
    expect(freshness.warnings.join(' ')).toMatch(/SECTOR_INDEX/);
    expect(freshness.warnings.join(' ')).toMatch(/CM/);
  });

  it('ranks indices and sector indices from persisted price rows', () => {
    const service = new MarketPulseSnapshotService({} as any);

    const snapshot = service.calculateSnapshot(baseData(), { generatedAt });

    expect(snapshot.topIndicesJson[0]).toMatchObject({ symbol: 'NIFTY_FAST' });
    expect(snapshot.strongSectorsJson[0]).toMatchObject({ sector: 'NIFTY_IT' });
    expect(snapshot.weakSectorsJson[0]).toMatchObject({ sector: 'NIFTY_PSU_BANK' });
    expect(snapshot.indexTrendScore).toBeGreaterThan(50);
    expect(snapshot.sectorStrengthScore).toBeGreaterThan(50);
  });

  it('calculates breadth from persisted stock price rows and records unavailable metrics as warnings', () => {
    const service = new MarketPulseSnapshotService({} as any);

    const snapshot = service.calculateSnapshot(baseData({
      stockPrices: [
        ...priceSeries('AAA', 'NSE_UDIFF_CM_BHAVCOPY', 150, 1, 60),
        ...priceSeries('BBB', 'NSE_UDIFF_CM_BHAVCOPY', 120, 0.4, 60),
        ...priceSeries('CCC', 'NSE_UDIFF_CM_BHAVCOPY', 80, -0.5, 60),
      ],
    }), { generatedAt });

    expect(snapshot.breadthScore).toBeGreaterThan(0);
    expect(snapshot.breadthSummaryJson.percentAbove20Dma).toBeGreaterThan(0);
    expect(snapshot.breadthSummaryJson.percentAbove200Dma).toBeNull();
    expect(snapshot.warningsJson.join(' ')).toMatch(/200 DMA/);
  });

  it('handles missing delivery data honestly without failing the snapshot', () => {
    const service = new MarketPulseSnapshotService({} as any);

    const snapshot = service.calculateSnapshot(baseData({ deliverySnapshots: [] }), { generatedAt });

    expect(snapshot.status).toBe('PARTIAL');
    expect(snapshot.deliveryParticipationScore).toBe(0);
    expect(snapshot.deliverySummaryJson.status).toBe('UNAVAILABLE');
    expect(snapshot.warningsJson.join(' ')).toMatch(/Delivery participation data is unavailable/);
  });

  it('refreshes from repository-loaded persisted data and upserts by snapshot scope', async () => {
    const repository = {
      loadCalculationData: jest.fn().mockResolvedValue(baseData()),
      upsertSnapshot: jest.fn(async (snapshot) => ({ id: 'pulse-1', ...snapshot })),
    };
    const service = new MarketPulseSnapshotService(repository as any);

    const first = await service.refreshSnapshot({ region: 'IN', assetType: 'STOCK', generatedAt });
    const second = await service.refreshSnapshot({ region: 'IN', assetType: 'STOCK', generatedAt });

    expect(repository.loadCalculationData).toHaveBeenCalledTimes(2);
    expect(repository.upsertSnapshot).toHaveBeenCalledTimes(2);
    expect(first.snapshotDate.toISOString()).toBe(second.snapshotDate.toISOString());
    expect(first.region).toBe('IN');
    expect(first.assetType).toBe('STOCK');
  });

  it('NR-22: extracts India VIX latest value + 5D range from index prices and classifies posture', () => {
    const service = new MarketPulseSnapshotService({} as any);
    const latestDate = new Date('2026-05-29T00:00:00.000Z');

    const vixPrices: MarketPulsePricePoint[] = Array.from({ length: 7 }, (_u, i) => ({
      symbol: 'NSE_INDEX_INDIA_VIX',
      label: 'India VIX',
      source: 'NSE_INDEX_EOD',
      timestamp: new Date(latestDate.getTime() - i * 24 * 60 * 60 * 1000),
      close: 14.5 - i * 0.3,
      adjustedClose: 14.5 - i * 0.3,
      volume: null,
    }));

    const data = baseData({ indexPrices: [...baseData().indexPrices, ...vixPrices] });
    const snapshot = service.calculateSnapshot(data, { generatedAt });

    expect(snapshot.vixSummaryJson.latest).toBeCloseTo(14.5);
    expect(snapshot.vixSummaryJson.posture).toBe('CALM');
    expect(snapshot.vixSummaryJson.asOf).toBe('2026-05-29');
    expect(snapshot.vixSummaryJson.low5d).toBeLessThan(snapshot.vixSummaryJson.high5d!);
  });

  it('NR-22: caps market health label at FRAGILE when VIX > 22', () => {
    const service = new MarketPulseSnapshotService({} as any);
    const latestDate = new Date('2026-05-29T00:00:00.000Z');

    // VIX at 25 (HIGH posture)
    const highVixPrices: MarketPulsePricePoint[] = Array.from({ length: 5 }, (_u, i) => ({
      symbol: 'NSE_INDEX_INDIA_VIX',
      label: 'India VIX',
      source: 'NSE_INDEX_EOD',
      timestamp: new Date(latestDate.getTime() - i * 24 * 60 * 60 * 1000),
      close: 25 - i * 0.2,
      adjustedClose: 25 - i * 0.2,
      volume: null,
    }));

    const data = baseData({ indexPrices: [...baseData().indexPrices, ...highVixPrices] });
    const snapshot = service.calculateSnapshot(data, { generatedAt });

    expect(snapshot.vixSummaryJson.posture).toBe('HIGH');
    // Health label must be FRAGILE or lower — not HEALTHY or TRADABLE_BUT_SELECTIVE
    expect(['FRAGILE', 'RISKY']).toContain(snapshot.marketHealthLabel);
  });

  it('NR-22: returns UNAVAILABLE VIX summary when no VIX price data is present', () => {
    const service = new MarketPulseSnapshotService({} as any);
    const snapshot = service.calculateSnapshot(baseData(), { generatedAt });

    expect(snapshot.vixSummaryJson.posture).toBe('UNAVAILABLE');
    expect(snapshot.vixSummaryJson.latest).toBeNull();
  });

  it('NR-22 (US): recognises the CBOE ^VIX for US, classifies posture, and keeps ^VIX out of headline indices', () => {
    const service = new MarketPulseSnapshotService({} as any);
    // US uses the Yahoo-sourced ^VIX symbol (not NSE_INDEX_INDIA_VIX); both are recognised region-agnostically.
    const usData = baseData({
      region: 'US',
      indexPrices: [
        ...priceSeries('^GSPC', 'YAHOO_EOD', 7400, 10, 90),
        ...priceSeries('^VIX', 'YAHOO_EOD', 18, -0.4, 7),
      ],
    });
    const snapshot = service.calculateSnapshot(usData, { generatedAt });

    expect(snapshot.vixSummaryJson.latest).toBeCloseTo(18);
    expect(snapshot.vixSummaryJson.posture).toBe('ELEVATED'); // 15 <= 18 <= 22
    // ^VIX is a volatility index, never a headline price/trend index.
    const headlineSymbols = (snapshot.topIndicesJson || []).map((row: { symbol: string }) => row.symbol);
    expect(headlineSymbols).toContain('^GSPC');
    expect(headlineSymbols).not.toContain('^VIX');
  });

  it('NR-23: counts advances and declines from latest stock prices and computes A/D ratio', () => {
    const service = new MarketPulseSnapshotService({} as any);
    const snapshot = service.calculateSnapshot(baseData(), { generatedAt });

    // baseData has AAA (+trend), BBB (+trend), CCC (-trend)
    expect(snapshot.advanceDeclineJson.advances).toBeGreaterThan(0);
    expect(snapshot.advanceDeclineJson.declines).toBeGreaterThanOrEqual(0);
    expect(snapshot.advanceDeclineJson.ratio).not.toBeNull();
    expect(snapshot.advanceDeclineJson.asOf).not.toBeNull();
  });

  it('NR-23: returns zero advances/declines and null ratio when no stock prices are present', () => {
    const service = new MarketPulseSnapshotService({} as any);
    const snapshot = service.calculateSnapshot(baseData({ stockPrices: [] }), { generatedAt });

    expect(snapshot.advanceDeclineJson.advances).toBe(0);
    expect(snapshot.advanceDeclineJson.declines).toBe(0);
    expect(snapshot.advanceDeclineJson.ratio).toBeNull();
  });

  it('NR-21: latestSnapshot loads up to 6 snapshots and derives health score history + prior score', async () => {
    const makeRecord = (score: number, date: string) => ({
      id: `id-${date}`,
      snapshotDate: new Date(date),
      dataThroughDate: new Date(date),
      generatedAt: new Date(date),
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      status: 'FRESH',
      marketHealthScore: score,
      marketHealthLabel: 'HEALTHY',
      indexTrendScore: 80,
      sectorStrengthScore: 75,
      breadthScore: 70,
      deliveryParticipationScore: 65,
      dataFreshnessScore: 100,
      topIndicesJson: [],
      strongSectorsJson: [],
      weakSectorsJson: [],
      breadthSummaryJson: {
        status: 'READY',
        percentAbove20Dma: 0.7, percentAbove50Dma: 0.6, percentAbove200Dma: 0.5,
        percentPositive1M: 0.65, percentPositive3M: 0.6,
        sampleCount: 100, sma20SampleCount: 100, sma50SampleCount: 100,
        sma200SampleCount: 100, positive1MSampleCount: 100, positive3MSampleCount: 100,
        summaryText: 'ok',
      },
      deliverySummaryJson: {
        status: 'READY', sampleCount: 100, highDeliveryCount: 60,
        highDeliveryPercent: 0.6, latestTradingDate: date, summaryText: 'ok',
      },
      candidateCount: 5,
      warningsJson: [],
      sourceSummaryJson: { status: 'FRESH', score: 100, latestCompletedTradingDate: date, dataThroughDate: date, segments: {} },
      vixSummaryJson: { latest: 14.5, low5d: 13.2, high5d: 16.1, asOf: date, posture: 'CALM' as const },
      advanceDeclineJson: { advances: 150, declines: 80, ratio: 1.88, asOf: date },
      pipelineRunId: null,
      createdAt: new Date(date),
      updatedAt: new Date(date),
    });

    // Newest-first order (as repository returns)
    const rows = [51, 43, 55, 60, 48].map((score, i) => makeRecord(score, `2026-05-${29 - i}T00:00:00.000Z`));

    const repository = {
      snapshotHistory: jest.fn().mockResolvedValue(rows),
    };
    const service = new MarketPulseSnapshotService(repository as any);

    const envelope = await service.latestSnapshot({ region: 'IN', assetType: 'STOCK' });

    expect(envelope.availability).toBe('READY');
    expect(envelope.snapshot!.marketHealthScore).toBe(51); // newest score
    expect(envelope.snapshot!.priorHealthScore).toBe(43); // second-newest
    // History is oldest-first with >=2 entries
    expect(envelope.snapshot!.healthScoreHistory.length).toBeGreaterThanOrEqual(2);
    expect(envelope.snapshot!.healthScoreHistory[envelope.snapshot!.healthScoreHistory.length - 1]).toBe(51);
  });
});
