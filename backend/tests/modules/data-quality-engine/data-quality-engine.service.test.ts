/// <reference types="@types/jest" />
import { DataQualityEngineService } from '../../../src/modules/data-quality-engine';

const instrument = (overrides: Record<string, any> = {}) => ({
  id: 'stock-1',
  symbol: 'AAPL',
  company_name: 'Apple',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  country: 'US',
  currency: 'USD',
  ...overrides,
});

const prices = (count: number, volume: number | null = 1_000_000) => Array.from({ length: count }).map((_, index) => ({
  date: new Date(Date.now() - index * 86_400_000).toISOString(),
  close: 100 - index * 0.1,
  adjusted_close: 100 - index * 0.1,
  volume,
}));

function service(overrides: Record<string, any> = {}) {
  const repository = {
    upsertEvaluation: jest.fn(async (evaluation) => ({ ...evaluation, id: 'eval-1' })),
    summary: jest.fn(),
    list: jest.fn(),
    latestForInstrument: jest.fn().mockResolvedValue(null),
    ...overrides.repository,
  };
  const marketDataService = {
    listInstruments: jest.fn().mockResolvedValue({ instruments: [instrument()], pagination: { total: 2 } }),
    getInstrument: jest.fn().mockResolvedValue(instrument()),
    listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: prices(260) }),
    latestPriceByInstrumentId: jest.fn().mockResolvedValue({ latest: prices(1)[0] }),
    fundamentalsByInstrumentId: jest.fn().mockResolvedValue({ records: [{ eps: 1 }] }),
    storedFundamentalsByInstrumentId: jest.fn().mockResolvedValue({ records: [{ eps: 1 }] }),
    corporateActionsByInstrumentId: jest.fn().mockResolvedValue({ actions: [{ action_type: 'dividend' }] }),
    storedCorporateActionsByInstrumentId: jest.fn().mockResolvedValue({ actions: [{ action_type: 'dividend' }] }),
    ...overrides.marketDataService,
  };
  const signalService = {
    signalHistory: jest.fn().mockResolvedValue([{ id: 'signal-1' }]),
    ...overrides.signalService,
  };
  return {
    repository,
    marketDataService,
    signalService,
    instance: new DataQualityEngineService(repository as any, marketDataService as any, signalService as any),
  };
}

describe('data quality engine service', () => {
  it('calculates strong coverage, readiness, liquidity, and eligibility', () => {
    const result = service().instance.evaluateInstrument(instrument(), prices(260), prices(1)[0], [{ eps: 1 }], [{ action_type: 'dividend' }], true);
    expect(result.coverageStatus).toBe('GOOD');
    expect(result.signalReadinessStatus).toBe('READY');
    expect(result.liquidityStatus).toBe('LIQUID');
    expect(result.eligibleForSignals).toBe(true);
    expect(result.eligibleForBacktesting).toBe(true);
    expect(result.eligibleForCalibration).toBe(true);
  });

  it('detects missing metadata, stale price, poor history, and missing volume', () => {
    const stale = { ...prices(1)[0], date: new Date(Date.now() - 20 * 86_400_000).toISOString(), volume: null };
    const result = service().instance.evaluateInstrument(
      instrument({ sector: null, industry: null, country: null }),
      prices(20, null),
      stale,
      [],
      [],
      false
    );
    expect(result.coverageStatus).toBe('UNUSABLE');
    expect(result.signalReadinessStatus).toBe('NOT_READY');
    expect(result.liquidityStatus).toBe('UNKNOWN');
    expect(result.dataGaps).toEqual(expect.arrayContaining(['Fundamentals are missing.', 'Sector metadata is missing.', 'Country metadata is missing.', 'Volume data is missing.']));
    expect(result.readinessBlockers.join(' ')).toContain('SMA50');
  });

  it('evaluates only one requested batch and returns progress metadata', async () => {
    const setup = service({
      marketDataService: {
        listInstruments: jest.fn().mockResolvedValue({ instruments: [instrument({ id: 'stock-1' })], pagination: { total: 3 } }),
      },
    });
    const result = await setup.instance.evaluate({ batchSize: 1, offset: 1 });
    expect(setup.marketDataService.listInstruments).toHaveBeenCalledWith({ page: 2, pageSize: 1, region: undefined, assetType: undefined });
    expect(result).toMatchObject({ processedCount: 1, totalCount: 3, batchSize: 1, offset: 1, nextOffset: 2, hasMore: true, evaluatedCount: 1 });
  });

  it('uses stored context during evaluation without triggering live provider fetches', async () => {
    const setup = service();

    await setup.instance.evaluateAndPersistInstrument(instrument());

    expect(setup.marketDataService.storedFundamentalsByInstrumentId).toHaveBeenCalledWith('stock-1');
    expect(setup.marketDataService.storedCorporateActionsByInstrumentId).toHaveBeenCalledWith('stock-1');
    expect(setup.marketDataService.fundamentalsByInstrumentId).not.toHaveBeenCalled();
    expect(setup.marketDataService.corporateActionsByInstrumentId).not.toHaveBeenCalled();
  });

  it('returns paginated list metadata', async () => {
    const setup = service({
      repository: {
        list: jest.fn().mockResolvedValue([{ instrumentId: 'stock-1' }]),
        count: jest.fn().mockResolvedValue(3),
      },
    });

    const result = await setup.instance.list({ limit: 1, offset: 1, region: 'IN', assetType: 'STOCK' });

    expect(setup.repository.list).toHaveBeenCalledWith({ limit: 1, offset: 1, region: 'IN', assetType: 'STOCK' });
    expect(setup.repository.count).toHaveBeenCalledWith({ limit: 1, offset: 1, region: 'IN', assetType: 'STOCK' });
    expect(result).toMatchObject({
      items: [{ instrumentId: 'stock-1' }],
      pagination: { total: 3, limit: 1, offset: 1, nextOffset: 2, hasMore: true },
    });
  });

  it('continues batch evaluation when one instrument fails', async () => {
    const setup = service({
      repository: {
        upsertEvaluation: jest.fn()
          .mockRejectedValueOnce(new Error('write failed'))
          .mockImplementation(async (evaluation) => ({ ...evaluation, id: 'eval-2' })),
      },
      marketDataService: {
        listInstruments: jest.fn().mockResolvedValue({ instruments: [instrument({ id: 'stock-1' }), instrument({ id: 'stock-2', symbol: 'MSFT' })], pagination: { total: 2 } }),
      },
    });
    const result = await setup.instance.evaluate({ batchSize: 2, offset: 0 });
    expect(result).toMatchObject({ processedCount: 2, evaluatedCount: 1, failedCount: 1, hasMore: false });
    expect(result.warnings[0]).toContain('write failed');
  });

  it('filters eligible instruments using readiness, coverage, liquidity, and missing quality behavior', async () => {
    const setup = service({
      repository: {
        latestForInstruments: jest.fn().mockResolvedValue([
          { instrumentId: 'ready', eligibleForSignals: true, signalReadinessScore: 90, signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID' },
          { instrumentId: 'blocked', eligibleForSignals: false, signalReadinessScore: 25, signalReadinessStatus: 'NOT_READY', coverageStatus: 'UNUSABLE', liquidityStatus: 'ILLIQUID' },
        ]),
      },
    });

    const result = await setup.instance.filterEligibleInstruments(['ready', 'blocked', 'missing'], { missingQualityBehavior: 'SKIP' });

    expect(result.eligibleInstrumentIds).toEqual(['ready']);
    expect(result.excludedInstrumentIds).toEqual(['blocked', 'missing']);
    expect(result.missingQualityEvaluationCount).toBe(1);
  });
});
