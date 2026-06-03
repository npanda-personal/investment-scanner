/// <reference types="@types/jest" />
import { EarningsIntelligenceService } from '../../../src/modules/earnings-intelligence';
import type { EarningsFundamentalInput, EarningsSnapshotDto } from '../../../src/modules/earnings-intelligence';

function fundamental(
  periodEndDate: string,
  revenue: number,
  netIncome: number,
  eps: number,
  overrides: Partial<EarningsFundamentalInput> = {}
): EarningsFundamentalInput {
  return {
    id: `fund-${periodEndDate}`,
    stockId: 'stock-1',
    revenue,
    netIncome,
    eps,
    periodType: 'QUARTERLY',
    periodEndDate: new Date(`${periodEndDate}T00:00:00.000Z`),
    source: 'MANUAL_VERIFIED',
    validatedAt: new Date(`${periodEndDate}T00:00:00.000Z`),
    ingestionTimestamp: new Date(`${periodEndDate}T01:00:00.000Z`),
    lastUpdatedTimestamp: new Date(`${periodEndDate}T01:00:00.000Z`),
    dataStatus: 'PARTIAL',
    ...overrides,
  };
}

function persistedRow(categories: EarningsSnapshotDto['categories']): EarningsSnapshotDto {
  return {
    id: 'earnings-1',
    snapshotDate: '2026-06-01T00:00:00.000Z',
    dataThroughDate: '2026-05-31T00:00:00.000Z',
    symbol: 'AAA',
    resultDate: '2026-05-10T00:00:00.000Z',
    resultDateSource: 'OFFICIAL_CALENDAR',
    periodEndDate: '2026-03-31T00:00:00.000Z',
    validatedAt: '2026-05-11T00:00:00.000Z',
    daysToResult: null,
    revenueGrowth: 20,
    profitGrowth: 30,
    epsGrowth: 25,
    marginTrend: 1.5,
    consistencyScore: 100,
    accelerationScore: 75,
    reasonTags: ['MANUAL_VERIFIED_RESULT'],
    riskTags: [],
    warnings: [],
    freshness: 'FRESH',
    categories,
  };
}

describe('EarningsIntelligenceService', () => {
  it('calculates consistency score from improving persisted earnings metrics', () => {
    const service = new EarningsIntelligenceService({} as any);

    expect(service.calculateConsistencyScore([
      fundamental('2025-03-31', 100, 10, 1),
      fundamental('2025-06-30', 110, 12, 1.2),
      fundamental('2025-09-30', 125, 15, 1.5),
    ])).toBe(100);
  });

  it('calculates acceleration score when latest growth improves versus prior growth', () => {
    const service = new EarningsIntelligenceService({} as any);

    expect(service.calculateAccelerationScore([
      fundamental('2025-03-31', 100, 10, 1),
      fundamental('2025-06-30', 110, 12.1, 1.2),
      fundamental('2025-09-30', 130, 16.9, 1.5),
    ])).toBe(100);
  });

  it('generates result winner and reaction history only from official result date inputs', () => {
    const service = new EarningsIntelligenceService({} as any);
    const winner = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-03-31', 130, 18, 1.8, {
          officialResultDate: new Date('2026-05-10T00:00:00.000Z'),
          validatedAt: new Date('2026-05-11T00:00:00.000Z'),
        }),
        fundamental('2025-03-31', 100, 10, 1),
      ],
      prices: [
        { symbol: 'AAA', timestamp: new Date('2026-05-08T00:00:00.000Z'), close: 100, adjustedClose: 100, volume: 1000 },
        { symbol: 'AAA', timestamp: new Date('2026-05-16T00:00:00.000Z'), close: 106, adjustedClose: 106, volume: 1200 },
      ],
      deliverySnapshots: [],
    });

    expect(winner.categories).toEqual(expect.arrayContaining([
      'RESULT_WINNERS',
      'RESULT_REACTION_HISTORY',
      'EARNINGS_WATCHLIST',
    ]));
    expect(winner.resultDateSource).toBe('OFFICIAL_CALENDAR');
    expect(winner.resultDate?.toISOString()).toBe('2026-05-10T00:00:00.000Z');
    expect(winner.periodEndDate?.toISOString()).toBe('2026-03-31T00:00:00.000Z');
    expect(winner.validatedAt?.toISOString()).toBe('2026-05-11T00:00:00.000Z');
    expect(winner.warnings).toEqual([]);
  });

  it('generates upcoming estimated categories with explicit estimated provenance', () => {
    const service = new EarningsIntelligenceService({} as any);

    const upcoming = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-07-15T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-03-31', 130, 18, 1.8, { validatedAt: new Date('2026-05-10T00:00:00.000Z') }),
        fundamental('2025-03-31', 100, 10, 1),
      ],
      prices: [],
      deliverySnapshots: [
        { stockId: 'stock-1', symbol: 'AAA', tradingDate: new Date('2026-07-14T00:00:00.000Z'), deliveryPercent: 62, tradedQuantity: 1000, deliverableQuantity: 620 },
      ],
    });

    expect(upcoming.daysToResult).toBe(30);
    expect(upcoming.resultDateSource).toBe('ESTIMATED_FROM_PERIOD_CADENCE');
    expect(upcoming.riskTags).toContain('ESTIMATED_RESULT_DATE');
    expect(upcoming.reasonTags).toContain('RESULT_WINDOW_ESTIMATED_FROM_PERSISTED_PERIODS');
    expect(upcoming.warnings).toEqual(expect.arrayContaining([
      'OFFICIAL_CALENDAR_NOT_AVAILABLE',
      'RESULT_DATE_ESTIMATED_FROM_PERIOD_CADENCE',
    ]));
    expect(upcoming.categories).toEqual(expect.arrayContaining([
      'UPCOMING_RESULTS',
      'PRE_RESULT_INTEREST',
    ]));
  });

  it('uses period end fallback without treating validatedAt as the result date', () => {
    const service = new EarningsIntelligenceService({} as any);

    const snapshot = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2026-03-31', 130, 18, 1.8, { validatedAt: new Date('2026-05-10T00:00:00.000Z') }),
        fundamental('2025-03-31', 100, 10, 1),
      ],
      prices: [
        { symbol: 'AAA', timestamp: new Date('2026-05-08T00:00:00.000Z'), close: 100, adjustedClose: 100, volume: 1000 },
        { symbol: 'AAA', timestamp: new Date('2026-05-16T00:00:00.000Z'), close: 106, adjustedClose: 106, volume: 1200 },
      ],
      deliverySnapshots: [],
    });

    expect(snapshot.resultDateSource).toBe('PERIOD_END_DATE_FALLBACK');
    expect(snapshot.resultDate?.toISOString()).toBe('2026-03-31T00:00:00.000Z');
    expect(snapshot.periodEndDate?.toISOString()).toBe('2026-03-31T00:00:00.000Z');
    expect(snapshot.validatedAt?.toISOString()).toBe('2026-05-10T00:00:00.000Z');
    expect(snapshot.categories).not.toContain('RESULT_WINNERS');
    expect(snapshot.categories).not.toContain('RESULT_REACTION_HISTORY');
    expect(snapshot.riskTags).toContain('PRICE_REACTION_REQUIRES_OFFICIAL_RESULT_DATE');
    expect(snapshot.warnings).toEqual(expect.arrayContaining([
      'OFFICIAL_CALENDAR_NOT_AVAILABLE',
      'RESULT_DATE_USES_PERIOD_END_DATE_FALLBACK',
    ]));
  });

  it('marks stale freshness from period end even when validatedAt is recent', () => {
    const service = new EarningsIntelligenceService({} as any);

    const snapshot = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2025-03-31', 130, 18, 1.8, { validatedAt: new Date('2026-05-10T00:00:00.000Z') }),
        fundamental('2024-03-31', 100, 10, 1),
      ],
      prices: [],
      deliverySnapshots: [],
    });

    expect(snapshot.resultDateSource).toBe('PERIOD_END_DATE_FALLBACK');
    expect(snapshot.freshness).toBe('STALE');
    expect(snapshot.riskTags).toContain('STALE_EARNINGS_DATA');
  });

  it('assigns a valid fallback category when no stronger earnings bucket qualifies', () => {
    const service = new EarningsIntelligenceService({} as any);

    const snapshot = service.calculateSnapshot({
      stockId: 'stock-1',
      symbol: 'AAA',
      region: 'IN',
      assetType: 'STOCK',
      snapshotDate: new Date('2026-06-01T00:00:00.000Z'),
      dataThroughDate: null,
      fundamentals: [
        fundamental('2025-03-31', 90, 8, 0.8),
        fundamental('2024-03-31', 100, 10, 1),
      ],
      prices: [],
      deliverySnapshots: [],
    });

    expect(snapshot.categories).toEqual(['EARNINGS_WATCHLIST']);
  });

  it('refreshes with idempotent snapshot upsert by scope date and symbol', async () => {
    const stored = new Map<string, EarningsSnapshotDto>();
    const repository = {
      countRefreshUniverse: jest.fn().mockResolvedValue(1),
      loadCalculationInputs: jest.fn().mockResolvedValue([{
        stockId: 'stock-1',
        symbol: 'AAA',
        region: 'IN',
        assetType: 'STOCK',
        snapshotDate: new Date('2026-06-01T00:00:00.000Z'),
        dataThroughDate: null,
        fundamentals: [
          fundamental('2026-03-31', 130, 18, 1.8, { validatedAt: new Date('2026-05-10T00:00:00.000Z') }),
          fundamental('2025-03-31', 100, 10, 1),
        ],
        prices: [],
        deliverySnapshots: [],
      }]),
      upsertSnapshots: jest.fn(async (rows) => rows.map((row: any) => {
        const key = `${row.snapshotDate.toISOString()}:${row.scopeRegion}:${row.scopeAssetType}:${row.symbol}`;
        const saved = { id: stored.get(key)?.id || 'earnings-1', ...row, snapshotDate: row.snapshotDate.toISOString(), dataThroughDate: row.dataThroughDate?.toISOString?.() ?? null, resultDate: row.resultDate?.toISOString?.() ?? null };
        stored.set(key, saved);
        return saved;
      })),
    };
    const service = new EarningsIntelligenceService(repository as any);

    await service.refreshSnapshots({ region: 'IN', assetType: 'STOCK', snapshotDate: new Date('2026-06-01T00:00:00.000Z') });
    await service.refreshSnapshots({ region: 'IN', assetType: 'STOCK', snapshotDate: new Date('2026-06-01T00:00:00.000Z') });

    expect(repository.upsertSnapshots).toHaveBeenCalledTimes(2);
    expect(stored.size).toBe(1);
  });

  it('serves only the latest persisted snapshot without request-time calculation', async () => {
    const repository = {
      latestSnapshot: jest.fn().mockResolvedValue({
        rows: [persistedRow(['RESULT_WINNERS', 'EARNINGS_WATCHLIST'])],
        truncated: false,
        snapshotDate: '2026-06-01',
        dataThroughDate: '2026-05-31',
      }),
    };
    const service = new EarningsIntelligenceService(repository as any);

    const response = await service.latest({ region: 'IN', assetType: 'STOCK', limit: 10, category: 'RESULT_WINNERS' }, new Date('2026-06-01T06:00:00.000Z'));

    expect(repository.latestSnapshot).toHaveBeenCalledWith({
      region: 'IN',
      assetType: 'STOCK',
      limit: 10,
      category: 'RESULT_WINNERS',
    });
    expect(response.categories.RESULT_WINNERS).toHaveLength(1);
    expect(response.items[0].symbol).toBe('AAA');
  });
});
