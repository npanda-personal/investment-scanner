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
    const result = service().instance.evaluateInstrument(
      instrument({
        required_history_status: 'COMPLETE',
        listing_date_status: 'PRESENT_OLDER_THAN_15Y_USED_15Y',
      }),
      prices(260),
      prices(1)[0],
      [{ eps: 1 }],
      [{ action_type: 'dividend' }],
      true
    );
    expect(result.coverageStatus).toBe('GOOD');
    expect(result.signalReadinessStatus).toBe('READY');
    expect(result.liquidityStatus).toBe('LIQUID');
    expect(result.eligibleForSignals).toBe(true);
    expect(result.eligibleForBacktesting).toBe(true);
    expect(result.eligibleForCalibration).toBe(true);
    expect(result.useCaseTiers?.dailyReview.status).toBe('READY');
    expect(result.useCaseTiers?.signal.status).toBe('READY');
    expect(result.useCaseTiers?.backtest.status).toBe('READY');
    expect(result.useCaseTiers?.calibration.status).toBe('READY');
    expect(result.useCaseTiers?.automation).toMatchObject({
      status: 'BLOCKED',
      reasons: ['PHASE0_AUTOMATION_NOT_AUTHORIZED'],
    });
  });

  it('fails closed when high-score instruments have no trusted-baseline fields', () => {
    const result = service().instance.evaluateInstrument(
      instrument(),
      prices(260),
      prices(1)[0],
      [{ eps: 1 }],
      [{ action_type: 'dividend' }],
      true
    );

    expect(result.signalReadinessStatus).toBe('READY');
    expect(result.eligibleForBacktesting).toBe(true);
    expect(result.eligibleForCalibration).toBe(true);
    expect(result.useCaseTiers?.dailyReview).toMatchObject({
      status: 'LIMITED',
      reasons: expect.arrayContaining(['TRUST_CONTEXT_MISSING', 'LISTING_DATE_CONFIDENCE_MISSING']),
    });
    expect(result.useCaseTiers?.signal).toMatchObject({
      status: 'LIMITED',
      reasons: expect.arrayContaining(['TRUST_CONTEXT_MISSING', 'LISTING_DATE_CONFIDENCE_MISSING']),
    });
    expect(result.useCaseTiers?.backtest).toMatchObject({
      status: 'BLOCKED',
      reasons: expect.arrayContaining(['TRUST_CONTEXT_MISSING', 'LISTING_DATE_CONFIDENCE_MISSING']),
    });
    expect(result.useCaseTiers?.calibration).toMatchObject({
      status: 'BLOCKED',
      reasons: expect.arrayContaining(['TRUST_CONTEXT_MISSING', 'LISTING_DATE_CONFIDENCE_MISSING']),
    });
    expect(result.useCaseTiers?.automation).toMatchObject({
      status: 'BLOCKED',
      reasons: ['PHASE0_AUTOMATION_NOT_AUTHORIZED'],
    });
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
    expect(setup.marketDataService.listInstruments).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ processedCount: 1, totalCount: 3, batchSize: 1, offset: 1, nextOffset: 2, hasMore: true, evaluatedCount: 1 });
  });

  it('evaluates batch instruments with bounded parallelism', async () => {
    const previousConcurrency = process.env.DATA_QUALITY_EVALUATION_CONCURRENCY;
    process.env.DATA_QUALITY_EVALUATION_CONCURRENCY = '3';
    let activePriceReads = 0;
    let maxActivePriceReads = 0;
    const listPricesByInstrumentId = jest.fn(async () => {
      activePriceReads += 1;
      maxActivePriceReads = Math.max(maxActivePriceReads, activePriceReads);
      try {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { prices: prices(260) };
      } finally {
        activePriceReads -= 1;
      }
    });
    const batch = Array.from({ length: 8 }, (_value, index) => instrument({ id: `stock-${index}`, symbol: `STOCK${index}` }));
    const setup = service({
      marketDataService: {
        listInstruments: jest.fn().mockResolvedValue({ instruments: batch, pagination: { total: batch.length } }),
        listPricesByInstrumentId,
      },
    });

    try {
      const result = await setup.instance.evaluate({ batchSize: 8, offset: 0 });

      expect(result).toMatchObject({ processedCount: 8, evaluatedCount: 8, failedCount: 0, hasMore: false });
      expect(listPricesByInstrumentId).toHaveBeenCalledTimes(8);
      expect(maxActivePriceReads).toBeGreaterThan(1);
      expect(maxActivePriceReads).toBeLessThanOrEqual(3);
    } finally {
      if (previousConcurrency === undefined) delete process.env.DATA_QUALITY_EVALUATION_CONCURRENCY;
      else process.env.DATA_QUALITY_EVALUATION_CONCURRENCY = previousConcurrency;
    }
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

  it('fails closed for missing quality evaluations by default', async () => {
    const setup = service({
      repository: {
        latestForInstruments: jest.fn().mockResolvedValue([
          { instrumentId: 'ready', eligibleForSignals: true, signalReadinessScore: 90, signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID' },
        ]),
      },
    });

    const result = await setup.instance.filterEligibleInstruments(['ready', 'missing']);

    expect(result.eligibleInstrumentIds).toEqual(['ready']);
    expect(result.excludedInstrumentIds).toEqual(['missing']);
    expect(result.missingQualityEvaluationCount).toBe(1);
    expect(result.warnings).toEqual(['missing: missing data quality evaluation']);
  });

  it('keeps daily review limited while blocking backtest and calibration on shallow trusted-baseline history', () => {
    const result = service().instance.evaluateInstrument(
      instrument({
        required_history_status: 'INCOMPLETE',
        listing_date_status: 'MISSING_USED_15_YEAR_TARGET',
      }),
      prices(260),
      prices(1)[0],
      [{ eps: 1 }],
      [{ action_type: 'dividend' }],
      true
    );

    expect(result.eligibleForBacktesting).toBe(true);
    expect(result.eligibleForCalibration).toBe(true);
    expect(result.useCaseTiers?.dailyReview.status).toBe('LIMITED');
    expect(result.useCaseTiers?.backtest).toMatchObject({
      status: 'BLOCKED',
      reasons: expect.arrayContaining(['TRUSTED_BASELINE_HISTORY_INCOMPLETE', 'LISTING_DATE_CONFIDENCE_MISSING']),
    });
    expect(result.useCaseTiers?.calibration).toMatchObject({
      status: 'BLOCKED',
      reasons: expect.arrayContaining(['TRUSTED_BASELINE_HISTORY_INCOMPLETE', 'LISTING_DATE_CONFIDENCE_MISSING']),
    });
    expect(result.useCaseTiers?.automation).toMatchObject({
      status: 'BLOCKED',
      reasons: ['PHASE0_AUTOMATION_NOT_AUTHORIZED'],
    });
  });
});
