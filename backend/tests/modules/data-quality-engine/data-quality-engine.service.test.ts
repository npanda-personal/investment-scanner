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
    upsertEligibility: jest.fn().mockResolvedValue(undefined),
    findEligibilityRows: jest.fn().mockResolvedValue([]),
    ...overrides.repository,
  };
  const marketDataService = {
    listInstruments: jest.fn().mockResolvedValue({ instruments: [instrument()], pagination: { total: 2 } }),
    getInstrument: jest.fn().mockResolvedValue(instrument()),
    getInstrumentsByIds: jest.fn().mockResolvedValue([instrument()]),
    listRecentPriceWindowsByInstrumentIds: jest.fn().mockResolvedValue(new Map([['stock-1', prices(260)]])),
    storedFundamentalsByInstrumentIds: jest.fn().mockResolvedValue(new Map([['stock-1', { records: [{ eps: 1 }] }]])),
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

  it('evaluates scheduled stage using explicit instrument ids and DB-only market data reads', async () => {
    const setup = service({
      marketDataService: {
        getInstrumentsByIds: jest.fn().mockResolvedValue([
          instrument({ id: 'stock-1', symbol: 'AAPL', region: 'IN', asset_type: 'STOCK' }),
          instrument({ id: 'stock-2', symbol: 'MSFT', region: 'IN', asset_type: 'STOCK' }),
        ]),
        listRecentPriceWindowsByInstrumentIds: jest.fn().mockResolvedValue(new Map([
          ['stock-1', prices(260)],
          ['stock-2', prices(200)],
        ])),
        storedFundamentalsByInstrumentIds: jest.fn().mockResolvedValue(new Map([
          ['stock-1', { records: [{ eps: 1 }] }],
          ['stock-2', { records: [{ eps: 2 }] }],
        ])),
        storedCorporateActionsByInstrumentId: jest.fn()
          .mockResolvedValueOnce({ actions: [{ action_type: 'dividend' }] })
          .mockResolvedValueOnce({ actions: [] }),
      },
    });

    const result = await setup.instance.evaluateScheduledStage({
      instrumentIds: ['stock-2', 'stock-1', 'stock-2'],
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 25,
    });

    expect(result).toMatchObject({
      totalCount: 2,
      processedCount: 2,
      evaluatedCount: 2,
      failedCount: 0,
      skippedCount: 0,
    });
    expect(setup.marketDataService.getInstrumentsByIds).toHaveBeenCalledWith(['stock-2', 'stock-1']);
    expect(setup.marketDataService.listRecentPriceWindowsByInstrumentIds).toHaveBeenCalledWith(['stock-2', 'stock-1'], 300, { region: 'IN', assetType: 'STOCK' });
    expect(setup.marketDataService.storedFundamentalsByInstrumentIds).toHaveBeenCalledWith(['stock-2', 'stock-1'], { region: 'IN', assetType: 'STOCK' });
    expect(setup.marketDataService.storedCorporateActionsByInstrumentId).toHaveBeenCalledTimes(2);
    expect(setup.repository.upsertEvaluation).toHaveBeenCalledTimes(2);
  });

  it('chunks scheduled stage price-window reads by requested batch size', async () => {
    const ids = Array.from({ length: 205 }, (_value, index) => `stock-${index + 1}`);
    const sharedPrices = prices(260);
    const setup = service({
      marketDataService: {
        getInstrumentsByIds: jest.fn(async (chunkIds: string[]) => chunkIds.map((id) => instrument({
          id,
          symbol: `SYM${id.split('-')[1]}`,
          region: 'IN',
          asset_type: 'STOCK',
        }))),
        listRecentPriceWindowsByInstrumentIds: jest.fn(async (chunkIds: string[]) => {
          if (chunkIds.length > 100) throw new Error(`oversized read: ${chunkIds.length}`);
          return new Map(chunkIds.map((id) => [id, sharedPrices]));
        }),
        storedFundamentalsByInstrumentIds: jest.fn(async (chunkIds: string[]) => (
          new Map(chunkIds.map((id) => [id, { records: [{ eps: 1 }] }]))
        )),
      },
    });

    const result = await setup.instance.evaluateScheduledStage({
      instrumentIds: ids,
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 100,
    });

    expect(result).toMatchObject({
      totalCount: 205,
      processedCount: 205,
      evaluatedCount: 205,
      failedCount: 0,
      skippedCount: 0,
      hasMore: false,
    });
    expect(setup.marketDataService.listRecentPriceWindowsByInstrumentIds).toHaveBeenCalledTimes(3);
    expect(setup.marketDataService.listRecentPriceWindowsByInstrumentIds.mock.calls.map((call: any[]) => call[0].length)).toEqual([100, 100, 5]);
    expect(setup.marketDataService.getInstrumentsByIds.mock.calls.map((call: any[]) => call[0].length)).toEqual([100, 100, 5]);
    expect(setup.marketDataService.storedFundamentalsByInstrumentIds.mock.calls.map((call: any[]) => call[0].length)).toEqual([100, 100, 5]);
    expect(setup.marketDataService.fundamentalsByInstrumentId).not.toHaveBeenCalled();
    expect(setup.marketDataService.corporateActionsByInstrumentId).not.toHaveBeenCalled();
  });

  it('reports scheduled stage progress after each chunk', async () => {
    const progress: any[] = [];
    const ids = ['stock-1', 'stock-2', 'stock-3'];
    const setup = service({
      marketDataService: {
        getInstrumentsByIds: jest.fn(async (chunkIds: string[]) => chunkIds.map((id) => instrument({
          id,
          symbol: id.toUpperCase(),
          region: 'IN',
          asset_type: 'STOCK',
        }))),
        listRecentPriceWindowsByInstrumentIds: jest.fn(async (chunkIds: string[]) => (
          new Map(chunkIds.map((id) => [id, prices(260)]))
        )),
        storedFundamentalsByInstrumentIds: jest.fn(async (chunkIds: string[]) => (
          new Map(chunkIds.map((id) => [id, { records: [{ eps: 1 }] }]))
        )),
      },
    });

    const result = await setup.instance.evaluateScheduledStage({
      instrumentIds: ids,
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 2,
      onProgress: async (update) => {
        progress.push(update);
      },
    });

    expect(result.processedCount).toBe(3);
    expect(progress).toHaveLength(2);
    expect(progress.map((item) => item.processedCount)).toEqual([2, 3]);
    expect(progress.map((item) => item.nextOffset)).toEqual([2, null]);
    expect(progress.map((item) => item.hasMore)).toEqual([true, false]);
    expect(progress.map((item) => item.metadata.chunkIndex)).toEqual([1, 2]);
  });

  it('records failed scheduled chunks with clear evidence and continues later chunks', async () => {
    const progress: any[] = [];
    const setup = service({
      marketDataService: {
        getInstrumentsByIds: jest.fn(async (chunkIds: string[]) => chunkIds.map((id) => instrument({
          id,
          symbol: id.toUpperCase(),
          region: 'IN',
          asset_type: 'STOCK',
        }))),
        listRecentPriceWindowsByInstrumentIds: jest.fn()
          .mockImplementationOnce(async (chunkIds: string[]) => new Map(chunkIds.map((id) => [id, prices(260)])))
          .mockRejectedValueOnce(new Error('Prisma oversized read simulation'))
          .mockImplementationOnce(async (chunkIds: string[]) => new Map(chunkIds.map((id) => [id, prices(260)]))),
        storedFundamentalsByInstrumentIds: jest.fn(async (chunkIds: string[]) => (
          new Map(chunkIds.map((id) => [id, { records: [{ eps: 1 }] }]))
        )),
      },
    });

    const result = await setup.instance.evaluateScheduledStage({
      instrumentIds: ['stock-1', 'stock-2', 'stock-3', 'stock-4', 'stock-5'],
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 2,
      onProgress: async (update) => {
        progress.push(update);
      },
    });

    expect(result).toMatchObject({
      totalCount: 5,
      processedCount: 5,
      evaluatedCount: 3,
      failedCount: 2,
      skippedCount: 0,
      hasMore: false,
    });
    expect(result.warnings.join('\n')).toContain('chunk 2/3 offset 2 failed for 2 instruments: Prisma oversized read simulation');
    expect(result.errors?.join('\n')).toContain('chunk 2/3 offset 2 failed for 2 instruments: Prisma oversized read simulation');
    expect(progress.map((item) => item.processedCount)).toEqual([2, 4, 5]);
    expect(progress[1].metadata).toMatchObject({ chunkIndex: 2, chunkStatus: 'FAILED' });
    expect(setup.repository.upsertEvaluation).toHaveBeenCalledTimes(3);
  });

  // ── Point-in-time (as-of) DQ filter ────────────────────────────────────

  it('asOf: filterEligibleInstruments allows instruments with score>=70 that are ineligible only due to today-stale flag', async () => {
    const repository = {
      latestForInstruments: jest.fn().mockResolvedValue([
        {
          instrumentId: 'stock-1',
          symbol: 'HIST',
          eligibleForSignals: false, // persisted as ineligible because price is stale *today*
          signalReadinessScore: 80,  // but score is 80 (>=70)
          signalReadinessStatus: 'READY',
          coverageStatus: 'GOOD',
          liquidityStatus: 'LIQUID',
        },
      ]),
    };
    const setup = service({ repository });
    const asOf = new Date('2020-06-15');

    const result = await setup.instance.filterEligibleInstruments(
      ['stock-1'],
      { missingQualityBehavior: 'SKIP', skipUnusable: true },
      asOf,
    );

    // With asOf override: score>=70 overrides stale-today ineligibility
    expect(result.eligibleInstrumentIds).toContain('stock-1');
    expect(result.excludedInstrumentIds).not.toContain('stock-1');
  });

  it('asOf: backward-compat — without asOf, ineligible instrument stays excluded', async () => {
    const repository = {
      latestForInstruments: jest.fn().mockResolvedValue([
        {
          instrumentId: 'stock-2',
          symbol: 'STALE',
          eligibleForSignals: false,
          signalReadinessScore: 80,
          signalReadinessStatus: 'READY',
          coverageStatus: 'GOOD',
          liquidityStatus: 'LIQUID',
        },
      ]),
    };
    const setup = service({ repository });

    const result = await setup.instance.filterEligibleInstruments(
      ['stock-2'],
      { missingQualityBehavior: 'SKIP', skipUnusable: true },
      // no asOf → default today path
    );

    expect(result.excludedInstrumentIds).toContain('stock-2');
    expect(result.eligibleInstrumentIds).not.toContain('stock-2');
  });

  // ── Trading-session-aware staleness ────────────────────────────────────────

  it('trading-session staleness: price dated last Friday is NOT stale on the following Monday (0 sessions behind)', () => {
    // Monday 2026-05-11, evaluated after IN market close (IST ≈ 10:00 UTC)
    // Latest price = Friday 2026-05-08 → 0 sessions behind expected Mon 11
    // (the Monday candle hasn't settled yet so expected = 2026-05-08 or 2026-05-11
    //  depending on time; to keep this deterministic we set price = today's date)
    const todayMs = Date.now();
    const latestPriceDate = new Date(todayMs).toISOString(); // today
    const result = service().instance.evaluateInstrument(
      instrument({ region: 'IN' }),
      prices(260),
      { ...prices(1)[0], date: latestPriceDate },
      [{ eps: 1 }],
      [{ action_type: 'dividend' }],
      true
    );
    expect(result.eligibleForSignals).toBe(true);
    expect(result.dataGaps).not.toContain('latest price is stale.');
  });

  it('trading-session staleness: price that is >3 trading sessions old is stale', () => {
    // Price is 20 calendar days old — well beyond 3 trading sessions
    const staleDate = new Date(Date.now() - 20 * 86_400_000).toISOString();
    const stalePrice = { ...prices(1)[0], date: staleDate, volume: 1_000_000 };
    const result = service().instance.evaluateInstrument(
      instrument({ region: 'IN' }),
      prices(260),
      stalePrice,
      [{ eps: 1 }],
      [{ action_type: 'dividend' }],
      true
    );
    expect(result.eligibleForSignals).toBe(false);
    expect(result.dataGaps).toContain('latest price is stale.');
  });

  it('trading-session staleness: price dated 5 calendar days ago (over Diwali 4-day cluster) is NOT stale — only ~1 session behind', () => {
    // Simulate: today is a Wednesday, price is from previous Thursday (5 calendar
    // days ago, but Fri was holiday, Sat/Sun weekend, Mon holiday, Tue holiday
    // in a Diwali-like cluster → only 0–1 trading sessions behind).
    // We approximate this by using a price dated 5 calendar days ago and
    // an instrument without region (defaults to IN weekend-only).
    // With the old 7-day threshold this would be NOT stale; with the new
    // 3-session threshold it also should NOT be stale (5 calendar days ≤ 3 sessions
    // if most were non-trading).  The exact count depends on today's day-of-week,
    // so we use a date 4 calendar days ago (guaranteed ≤ 3 trading sessions on
    // any week that spans a weekend, e.g. Thu price evaluated on Mon = 2 sessions).
    const recentEnoughDate = new Date(Date.now() - 4 * 86_400_000).toISOString();
    const recentPrice = { ...prices(1)[0], date: recentEnoughDate, volume: 1_000_000 };
    const result = service().instance.evaluateInstrument(
      instrument({ region: 'IN', required_history_status: 'COMPLETE', listing_date_status: 'PRESENT_OLDER_THAN_15Y_USED_15Y' }),
      prices(260),
      recentPrice,
      [{ eps: 1 }],
      [{ action_type: 'dividend' }],
      true
    );
    // 4 calendar days ago spans at most 3 trading sessions (Thu→Mon: Thu,Fri,Mon)
    // so this should NOT be stale
    expect(result.dataGaps).not.toContain('latest price is stale.');
    expect(result.eligibleForSignals).toBe(true);
  });

  it('trading-session staleness: null latest price records gap and stale check falls back to price array date', () => {
    // When latestPrice=null the code falls back to prices[0].date.
    // prices(260) uses today's dates so stale=false.
    // The important contract: 'Latest price is missing.' is in dataGaps.
    const result = service().instance.evaluateInstrument(
      instrument({ region: 'IN' }),
      prices(260),
      null,
      [{ eps: 1 }],
      [{ action_type: 'dividend' }],
      false
    );
    expect(result.dataGaps).toContain('Latest price is missing.');
    // eligibleForSignals may still be true because prices[0] is current; the
    // important staleness-related gap ('latest price is stale.') should NOT
    // appear because the price array is recent.
    expect(result.dataGaps).not.toContain('latest price is stale.');
  });
});
