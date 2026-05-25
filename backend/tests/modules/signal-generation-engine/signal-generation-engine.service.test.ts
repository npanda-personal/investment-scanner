/// <reference types="@types/jest" />
import { SignalGenerationEngineService } from '../../../src/modules/signal-generation-engine';
import { StrategyFrameworkRegistry } from '../../../src/modules/strategy-framework';

const price = (index: number, adjusted_close: number, volume = 100) => ({
  date: new Date(2026, 3, 28 - index).toISOString(),
  open: adjusted_close,
  high: adjusted_close + 1,
  low: adjusted_close - 1,
  close: adjusted_close,
  adjusted_close,
  volume,
});

const freshPrice = (index: number, adjusted_close: number, volume = 100) => {
  const date = new Date();
  date.setDate(date.getDate() - index);
  return {
    date: date.toISOString(),
    open: adjusted_close,
    high: adjusted_close + 1,
    low: adjusted_close - 1,
    close: adjusted_close,
    adjusted_close,
    volume,
  };
};

const trustedReadEvidence = {
  auditStatus: 'CURRENT' as const,
  dataQualityEligibility: {
    filterApplied: true,
    eligible: true,
    coverageStatus: 'GOOD',
    signalReadinessStatus: 'READY',
    liquidityStatus: 'LIQUID',
  },
};

const runAuditRepository = () => ({
  createRunAudit: jest.fn(async (input: any) => ({
    id: 'run-1',
    scope: { region: input.region, assetType: input.assetType },
    requestedByUserId: input.requestedByUserId,
    status: 'RUNNING',
    modelVersion: input.modelVersion,
    rulesetVersion: input.rulesetVersion,
    sourceDataDate: input.sourceDataDate?.toISOString?.() ?? null,
    generatedDate: input.generatedDate.toISOString(),
    batchSize: input.batchSize,
    offset: input.offset,
    totalCount: input.totalCount,
    processedCount: 0,
    generatedCount: 0,
    updatedCount: 0,
    noOpCount: 0,
    duplicateOrIdempotentCount: 0,
    skippedCount: 0,
    failedCount: 0,
    excludedByDataQuality: 0,
    missingQualityEvaluationCount: 0,
    durationMs: 0,
    startedAt: '2026-05-13T10:00:00.000Z',
    completedAt: null,
    warnings: input.warnings,
  })),
  completeRunAudit: jest.fn(async (_id: string, input: any) => ({
    id: 'run-1',
    scope: { region: 'IN', assetType: 'STOCK' },
    requestedByUserId: 'system',
    status: input.status,
    modelVersion: 'signal-engine-v1',
    rulesetVersion: 'signal-engine-v1',
    sourceDataDate: input.sourceDataDate?.toISOString?.() ?? null,
    generatedDate: '2026-05-13T00:00:00.000Z',
    batchSize: 100,
    offset: 0,
    totalCount: input.processedCount,
    processedCount: input.processedCount,
    generatedCount: input.generatedCount,
    updatedCount: input.updatedCount,
    noOpCount: input.noOpCount,
    duplicateOrIdempotentCount: input.duplicateOrIdempotentCount,
    skippedCount: input.skippedCount,
    failedCount: input.failedCount,
    excludedByDataQuality: input.excludedByDataQuality,
    missingQualityEvaluationCount: input.missingQualityEvaluationCount,
    durationMs: input.durationMs,
    startedAt: '2026-05-13T10:00:00.000Z',
    completedAt: '2026-05-13T10:00:01.000Z',
    warnings: input.warnings,
  })),
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

  it('skips heavyweight research workbench calls for lightweight batch context', async () => {
    const repository = {
      createSignalResult: jest.fn(async (result) => ({ ...result, id: 'signal-lightweight' })),
    };
    const prices = Array.from({ length: 260 }, (_, index) => freshPrice(index, 180 - index * 0.15, 1000));
    const marketDataService = {
      getInstrument: jest.fn().mockResolvedValue({
        id: 'stock-1',
        symbol: 'LITE',
        company_name: 'Lite Co',
        sector: 'Technology',
        country: 'IN',
        currency: 'INR',
      }),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices }),
      fundamentalsByInstrumentId: jest.fn().mockResolvedValue({
        records: [],
      }),
      storedFundamentalsByInstrumentId: jest.fn().mockResolvedValue({
        records: [{ eps: 3, net_income: 1000000, pe_ratio: 18, dividend_yield: 0.01, market_cap: 1000000000 }],
      }),
    };
    const researchService = {
      workbench: jest.fn().mockResolvedValue({
        valuation: { peer_average_pe: 20 },
        relative_strength: { relative_to_peer_average: 0.05 },
      }),
    };
    const service = new SignalGenerationEngineService(repository as any, marketDataService as any, researchService as any);

    const result = await service.generateForInstrument('stock-1', { researchContextMode: 'LIGHTWEIGHT' });

    expect(result?.instrument_id).toBe('stock-1');
    expect(marketDataService.storedFundamentalsByInstrumentId).toHaveBeenCalledWith('stock-1', { region: undefined, assetType: undefined });
    expect(marketDataService.fundamentalsByInstrumentId).not.toHaveBeenCalled();
    expect(researchService.workbench).not.toHaveBeenCalled();
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
          ...trustedReadEvidence,
        }],
        total: 1,
        limit: 100,
        offset: 0
      }),
    };
    const marketDataService = {
      getInstrumentsByIds: jest.fn().mockResolvedValue([{ id: 'stock-1', currency: 'USD' }]),
      getLatestPricesBySymbols: jest.fn().mockResolvedValue([{ symbol: 'ABC', adjusted_close: 105, date: '2026-04-28T00:00:00.000Z' }]),
      latestPriceByInstrumentId: jest.fn().mockResolvedValue({ latest: { adjusted_close: 105, date: '2026-04-28T00:00:00.000Z' } }),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [{ adjusted_close: 105 }, { adjusted_close: 100 }] }),
    };
    const service = new SignalGenerationEngineService(repository as any, marketDataService as any, {} as any);

    const result = await service.topSignals({ limit: 5 });
    const signals = result.signals;

    expect(signals[0]).toMatchObject({
      currentPrice: 105,
      previousClose: 100,
      dailyChange: 5,
      dailyChangePercent: 0.05,
      currency: 'USD',
      priceTimestamp: '2026-04-28T00:00:00.000Z',
    });
  });

  it('filters untrusted persisted rows from top signal responses', async () => {
    const repository = {
      latestSignals: jest.fn().mockResolvedValue({
        signals: [
          {
            id: 'trusted-signal',
            instrument_id: 'trusted',
            symbol: 'TRUST',
            company_name: 'Trusted Co',
            sector: 'Technology',
            country: 'IN',
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
            explanation: 'Bullish because DQ is trusted.',
            generated_at: '2026-04-28T00:00:00.000Z',
            source: 'signal-generation-engine',
            data_status: 'COMPLETE',
            ...trustedReadEvidence,
          },
          {
            id: 'legacy-signal',
            instrument_id: 'legacy',
            symbol: 'LEGACY',
            company_name: 'Legacy Co',
            sector: 'Technology',
            country: 'IN',
            currentPrice: null,
            previousClose: null,
            dailyChange: null,
            dailyChangePercent: null,
            currency: null,
            priceTimestamp: null,
            score: 90,
            direction: 'BULLISH',
            confidence: 'HIGH',
            triggered_signals: [],
            negative_signals: [],
            explanation: 'Bullish because legacy row has no DQ snapshot.',
            generated_at: '2026-04-28T00:00:00.000Z',
            source: 'signal-generation-engine',
            data_status: 'COMPLETE',
            auditStatus: 'LEGACY_MISSING',
            dataQualityEligibility: null,
          },
          {
            id: 'limited-signal',
            instrument_id: 'limited',
            symbol: 'LIMIT',
            company_name: 'Limited Co',
            sector: 'Technology',
            country: 'IN',
            currentPrice: null,
            previousClose: null,
            dailyChange: null,
            dailyChangePercent: null,
            currency: null,
            priceTimestamp: null,
            score: 70,
            direction: 'NEUTRAL',
            confidence: 'MEDIUM',
            triggered_signals: [],
            negative_signals: [],
            explanation: 'Neutral because DQ is limited.',
            generated_at: '2026-04-28T00:00:00.000Z',
            source: 'signal-generation-engine',
            data_status: 'PARTIAL',
            auditStatus: 'CURRENT',
            dataQualityEligibility: {
              filterApplied: true,
              eligible: false,
              coverageStatus: 'PARTIAL',
              signalReadinessStatus: 'LIMITED',
              liquidityStatus: 'LIQUID',
            },
          },
        ],
        total: 3,
      }),
    };
    const marketDataService = {
      getInstrumentsByIds: jest.fn().mockResolvedValue([{ id: 'trusted', currency: 'INR' }]),
      getLatestPricesBySymbols: jest.fn().mockResolvedValue([{ symbol: 'TRUST', adjusted_close: 105, date: '2026-04-28T00:00:00.000Z' }]),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [{ adjusted_close: 105 }, { adjusted_close: 100 }] }),
    };
    const service = new SignalGenerationEngineService(repository as any, marketDataService as any, {} as any);

    const result = await service.topSignals({ limit: 5 });

    expect(result.signals.map((signal) => signal.instrument_id)).toEqual(['trusted']);
    expect(result.total).toBe(1);
    expect(result.totalCount).toBe(1);
    expect(result.hasMore).toBe(false);
  });

  it('filters untrusted persisted rows from screener responses', async () => {
    const repository = {
      latestSignals: jest.fn().mockResolvedValue({
        signals: [
          {
            instrument_id: 'trusted',
            symbol: 'TRUST',
            company_name: 'Trusted Co',
            sector: 'Technology',
            country: 'IN',
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
            explanation: 'Trusted.',
            generated_at: '2026-04-28T00:00:00.000Z',
            source: 'signal-generation-engine',
            data_status: 'COMPLETE',
            ...trustedReadEvidence,
          },
          {
            instrument_id: 'blocked',
            symbol: 'BLOCK',
            company_name: 'Blocked Co',
            sector: 'Technology',
            country: 'IN',
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
            explanation: 'Blocked.',
            generated_at: '2026-04-28T00:00:00.000Z',
            source: 'signal-generation-engine',
            data_status: 'COMPLETE',
            auditStatus: 'CURRENT',
            dataQualityEligibility: {
              filterApplied: true,
              eligible: false,
              signalReadinessStatus: 'NOT_READY',
            },
          },
        ],
        total: 2,
      }),
    };
    const marketDataService = {
      getInstrumentsByIds: jest.fn().mockResolvedValue([{ id: 'trusted', currency: 'INR' }]),
      getLatestPricesBySymbols: jest.fn().mockResolvedValue([]),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [] }),
    };
    const service = new SignalGenerationEngineService(repository as any, marketDataService as any, {} as any);

    const result = await service.screener({ limit: 5 });

    expect(result.signals.map((signal) => signal.instrument_id)).toEqual(['trusted']);
    expect(result.items?.map((signal) => signal.instrument_id)).toEqual(['trusted']);
  });

  it('returns trusted persisted latest instrument signal without regeneration', async () => {
    const repository = {
      latestForInstrument: jest.fn().mockResolvedValue({
        instrument_id: 'trusted',
        symbol: 'TRUST',
        company_name: 'Trusted Co',
        sector: 'Technology',
        country: 'IN',
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
        explanation: 'Trusted.',
        generated_at: '2026-04-28T00:00:00.000Z',
        source: 'signal-generation-engine',
        data_status: 'COMPLETE',
        ...trustedReadEvidence,
      }),
    };
    const marketDataService = {
      getInstrumentsByIds: jest.fn().mockResolvedValue([{ id: 'trusted', currency: 'INR' }]),
      getLatestPricesBySymbols: jest.fn().mockResolvedValue([]),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [] }),
    };
    const service = new SignalGenerationEngineService(repository as any, marketDataService as any, {} as any);
    const runSpy = jest.spyOn(service, 'run');

    const result = await service.latestForInstrument('trusted');

    expect(result?.instrument_id).toBe('trusted');
    expect(runSpy).not.toHaveBeenCalled();
  });

  it('fails closed for untrusted latest instrument signal when DQ excludes the instrument', async () => {
    const repository = {
      latestForInstrument: jest.fn().mockResolvedValue({
        instrument_id: 'legacy',
        symbol: 'LEGACY',
        company_name: 'Legacy Co',
        sector: 'Technology',
        country: 'IN',
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
        explanation: 'Legacy.',
        generated_at: '2026-04-28T00:00:00.000Z',
        source: 'signal-generation-engine',
        data_status: 'COMPLETE',
        auditStatus: 'LEGACY_MISSING',
        dataQualityEligibility: null,
      }),
      ...runAuditRepository(),
    };
    const dataQualityService = {
      filterEligibleInstruments: jest.fn().mockResolvedValue({
        eligibleInstrumentIds: [],
        excludedInstrumentIds: ['legacy'],
        missingQualityEvaluationCount: 1,
        warnings: ['legacy: missing data quality evaluation'],
        evaluationsByInstrumentId: {},
      }),
    };
    const service = new SignalGenerationEngineService(repository as any, {} as any, {} as any, dataQualityService as any);
    const generateSpy = jest.spyOn(service, 'generateForInstrument');

    const result = await service.latestForInstrument('legacy');

    expect(result).toBeNull();
    expect(dataQualityService.filterEligibleInstruments).toHaveBeenCalledWith(['legacy'], expect.objectContaining({
      missingQualityBehavior: 'SKIP',
    }));
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it('returns null price context when market data is unavailable', async () => {
    const service = new SignalGenerationEngineService({} as any, {
      getInstrumentsByIds: jest.fn().mockRejectedValue(new Error('missing')),
      getLatestPricesBySymbols: jest.fn().mockRejectedValue(new Error('missing')),
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
    const repository = { createSignalResult: jest.fn(), ...runAuditRepository() };
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'ready', symbol: 'RDY' }, { id: 'blocked', symbol: 'BLK' }, { id: 'missing', symbol: 'MSG' }] }),
    };
    const dataQualityService = {
      filterEligibleInstruments: jest.fn().mockResolvedValue({
        eligibleInstrumentIds: ['ready'],
        excludedInstrumentIds: ['blocked', 'missing'],
        missingQualityEvaluationCount: 1,
        warnings: ['missing: missing data quality evaluation'],
        evaluationsByInstrumentId: {
          ready: { instrumentId: 'ready', eligibleForSignals: true, coverageStatus: 'GOOD', signalReadinessStatus: 'READY', liquidityStatus: 'LIQUID', signalReadinessScore: 90 },
          blocked: { instrumentId: 'blocked', eligibleForSignals: false, coverageStatus: 'UNUSABLE', signalReadinessStatus: 'NOT_READY', liquidityStatus: 'UNKNOWN', signalReadinessScore: 10 },
        },
      }),
    };
    const service = new SignalGenerationEngineService(repository as any, marketDataService as any, {} as any, dataQualityService as any);
    const generateForInstrument = jest.spyOn(service, 'generateForInstrument').mockImplementation(async (instrumentId) => ({
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

    expect(result.generated).toBe(1);
    expect(result.dataQuality).toMatchObject({
      beforeFilter: 3,
      afterFilter: 1,
      excludedByDataQuality: 2,
      missingQualityEvaluationCount: 1,
      eligibleInstrumentCount: 1,
      attemptedGenerationCount: 1,
    });
    expect(result).toMatchObject({ eligibleInstrumentCount: 1, attemptedGenerationCount: 1, skippedCount: 2 });
    expect(result.warnings[0]).toContain('missing data quality');
    expect(dataQualityService.filterEligibleInstruments).toHaveBeenCalledTimes(1);
    expect(dataQualityService.filterEligibleInstruments).toHaveBeenCalledWith(['ready', 'blocked', 'missing'], expect.objectContaining({
      missingQualityBehavior: 'SKIP',
    }));
    const generationOptions = generateForInstrument.mock.calls[0][1] as any;
    expect(generationOptions.dataQualityEvaluationsByInstrumentId.ready).toMatchObject({
      filterApplied: true,
      eligible: true,
      coverageStatus: 'GOOD',
      signalReadinessStatus: 'READY',
      liquidityStatus: 'LIQUID',
    });
    expect(generationOptions.dataQualityEvaluationsByInstrumentId.blocked).toMatchObject({
      filterApplied: true,
      eligible: false,
    });
    expect(generationOptions.dataQualityEvaluationsByInstrumentId.missing).toMatchObject({
      filterApplied: true,
      eligible: false,
      excludedReason: 'Missing data quality evaluation.',
    });
  });

  it('fails closed when the data quality filter is unavailable for a trusted run', async () => {
    const repository = { createSignalResult: jest.fn(), ...runAuditRepository() };
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'one' }, { id: 'two' }], pagination: { total: 2 } }),
    };
    const dataQualityService = {
      filterEligibleInstruments: jest.fn().mockRejectedValue(new Error('dq unavailable')),
    };
    const service = new SignalGenerationEngineService(repository as any, marketDataService as any, {} as any, dataQualityService as any);
    const generateForInstrument = jest.spyOn(service, 'generateForInstrument');

    const result = await service.run({ batchSize: 2, region: 'IN', assetType: 'STOCK' });

    expect(dataQualityService.filterEligibleInstruments).toHaveBeenCalledWith(['one', 'two'], expect.objectContaining({
      missingQualityBehavior: 'SKIP',
    }));
    expect(generateForInstrument).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      generatedCount: 0,
      skippedCount: 2,
      failedCount: 0,
      dataQuality: {
        filterApplied: true,
        beforeFilter: 2,
        afterFilter: 0,
        excludedByDataQuality: 2,
        missingQualityEvaluationCount: 2,
        eligibleInstrumentCount: 0,
        attemptedGenerationCount: 0,
      },
    });
    expect(result.warnings[0]).toContain('trusted signal generation failed closed');
  });

  it('runs one bounded batch and returns progress metadata', async () => {
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({
        instruments: [{ id: 'stock-3' }, { id: 'stock-4' }],
        pagination: { total: 5 },
      }),
    };
    const service = new SignalGenerationEngineService(runAuditRepository() as any, marketDataService as any, {} as any);
    jest.spyOn(service, 'generateForInstrument').mockImplementation(async (instrumentId) => ({
      instrument_id: instrumentId,
      symbol: instrumentId.toUpperCase(),
      company_name: null,
      sector: null,
      country: 'IN',
      currentPrice: null,
      previousClose: null,
      dailyChange: null,
      dailyChangePercent: null,
      currency: null,
      priceTimestamp: null,
      score: instrumentId === 'stock-3' ? 75 : 45,
      direction: instrumentId === 'stock-3' ? 'BULLISH' : 'NEUTRAL',
      confidence: 'LOW',
      triggered_signals: [],
      negative_signals: [],
      explanation: 'Neutral because data is limited.',
      generated_at: new Date().toISOString(),
      source: 'signal-generation-engine',
      data_status: 'PARTIAL',
    } as any));

    const result = await service.run({ batchSize: 2, offset: 2, region: 'IN', assetType: 'STOCK', useDataQualityFilter: false });

    expect(marketDataService.listInstruments).toHaveBeenCalledWith(expect.objectContaining({
      page: 2,
      pageSize: 2,
      region: 'IN',
      assetType: 'STOCK',
    }));
    expect(result).toMatchObject({
      processedCount: 2,
      totalCount: 5,
      batchSize: 2,
      offset: 2,
      nextOffset: 4,
      hasMore: true,
      generatedCount: 2,
      skippedCount: 0,
      failedCount: 0,
      scope: { region: 'IN', assetType: 'STOCK' },
    });
    expect(result.directionCountsGenerated).toEqual({ BULLISH: 1, NEUTRAL: 1, BEARISH: 0 });
  });

  it('runs an explicit instrument-id batch without region-wide pagination', async () => {
    const marketDataService = {
      listInstruments: jest.fn(),
    };
    const service = new SignalGenerationEngineService(runAuditRepository() as any, marketDataService as any, {} as any);
    jest.spyOn(service, 'generateForInstrument').mockImplementation(async (instrumentId) => ({
      instrument_id: instrumentId,
      symbol: instrumentId.toUpperCase(),
      company_name: null,
      sector: null,
      country: 'IN',
      currentPrice: null,
      previousClose: null,
      dailyChange: null,
      dailyChangePercent: null,
      currency: null,
      priceTimestamp: null,
      score: 75,
      direction: 'BULLISH',
      confidence: 'LOW',
      triggered_signals: [],
      negative_signals: [],
      explanation: 'Bullish because rule evidence is present.',
      generated_at: new Date().toISOString(),
      source: 'signal-generation-engine',
      data_status: 'COMPLETE',
    } as any));

    const result = await service.run({
      instrumentIds: ['stock-2', 'stock-1', 'stock-2'],
      region: 'IN',
      assetType: 'STOCK',
      useDataQualityFilter: false,
      providerThrottleMs: 0,
    });

    expect(marketDataService.listInstruments).not.toHaveBeenCalled();
    expect(service.generateForInstrument).toHaveBeenCalledTimes(2);
    expect(service.generateForInstrument).toHaveBeenNthCalledWith(1, 'stock-2', expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
    }));
    expect(service.generateForInstrument).toHaveBeenNthCalledWith(2, 'stock-1', expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
    }));
    expect(result).toMatchObject({
      processedCount: 2,
      totalCount: 2,
      batchSize: 2,
      offset: 0,
      nextOffset: null,
      hasMore: false,
      generatedCount: 2,
      skippedCount: 0,
      failedCount: 0,
    });
  });

  it('uses batch-loaded market context and shared strategy ratings for signal runs', async () => {
    const repository = {
      createSignalResult: jest.fn(async (result) => ({ ...result, id: `${result.instrument_id}-signal` })),
      ...runAuditRepository(),
    };
    const instruments = [
      { id: 'stock-1', symbol: 'AAA.NS', company_name: 'AAA Ltd', sector: 'Technology', country: 'IN', currency: 'INR', asset_type: 'STOCK' },
      { id: 'stock-2', symbol: 'BBB.NS', company_name: 'BBB Ltd', sector: 'Technology', country: 'IN', currency: 'INR', asset_type: 'STOCK' },
    ];
    const pricesByInstrumentId = new Map(instruments.map((instrument) => [
      instrument.id,
      Array.from({ length: 260 }, (_, index) => freshPrice(index, 180 - index * 0.1, 1000)),
    ]));
    const fundamentalsByInstrumentId = new Map(instruments.map((instrument) => [instrument.id, {
      records: [{ eps: 3, net_income: 1000000, pe_ratio: 18, dividend_yield: 0.01, market_cap: 1000000000 }],
    }]));
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({ instruments, pagination: { total: 2 } }),
      getInstrumentsByIds: jest.fn().mockResolvedValue(instruments),
      listRecentPriceWindowsByInstrumentIds: jest.fn().mockResolvedValue(pricesByInstrumentId),
      storedFundamentalsByInstrumentIds: jest.fn().mockResolvedValue(fundamentalsByInstrumentId),
      getInstrument: jest.fn(),
      listPricesByInstrumentId: jest.fn(),
      storedFundamentalsByInstrumentId: jest.fn(),
      fundamentalsByInstrumentId: jest.fn(),
    };
    const strategyFrameworkService = {
      performance: jest.fn().mockResolvedValue([{ ratingScore: 66, ratingGrade: 'GOOD', readinessLabel: 'PAPER_TEST_CANDIDATE' }]),
    };
    const service = new SignalGenerationEngineService(
      repository as any,
      marketDataService as any,
      { workbench: jest.fn() } as any,
      {} as any,
      new StrategyFrameworkRegistry(),
      strategyFrameworkService as any
    );

    const result = await service.run({
      batchSize: 2,
      offset: 0,
      region: 'IN',
      assetType: 'STOCK',
      includeStrategyMatches: true,
      strategyCode: 'TREND_MOMENTUM',
      maxConcurrency: 2,
      useDataQualityFilter: false,
    });

    expect(result.processedCount).toBe(2);
    expect(marketDataService.getInstrumentsByIds).toHaveBeenCalledWith(['stock-1', 'stock-2']);
    expect(marketDataService.listRecentPriceWindowsByInstrumentIds).toHaveBeenCalledWith(['stock-1', 'stock-2'], 520, { region: 'IN', assetType: 'STOCK' });
    expect(marketDataService.storedFundamentalsByInstrumentIds).toHaveBeenCalledWith(['stock-1', 'stock-2'], { region: 'IN', assetType: 'STOCK' });
    expect(marketDataService.getInstrument).not.toHaveBeenCalled();
    expect(marketDataService.listPricesByInstrumentId).not.toHaveBeenCalled();
    expect(marketDataService.fundamentalsByInstrumentId).not.toHaveBeenCalled();
    expect(strategyFrameworkService.performance).toHaveBeenCalledTimes(1);
  });

  it('marks the last bounded batch as complete', async () => {
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({
        instruments: [{ id: 'stock-5' }],
        pagination: { total: 5 },
      }),
    };
    const service = new SignalGenerationEngineService(runAuditRepository() as any, marketDataService as any, {} as any);
    jest.spyOn(service, 'generateForInstrument').mockResolvedValue(null);

    const result = await service.run({ batchSize: 2, offset: 4, region: 'IN', assetType: 'STOCK', useDataQualityFilter: false });

    expect(result.processedCount).toBe(1);
    expect(result.nextOffset).toBeNull();
    expect(result.hasMore).toBe(false);
    expect(result.skippedCount).toBe(1);
  });

  it('continues a batch when one instrument fails', async () => {
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({
        instruments: [{ id: 'ok' }, { id: 'bad' }],
        pagination: { total: 2 },
      }),
    };
    const service = new SignalGenerationEngineService(runAuditRepository() as any, marketDataService as any, {} as any);
    jest.spyOn(service, 'generateForInstrument').mockImplementation(async (instrumentId) => {
      if (instrumentId === 'bad') throw new Error('missing prices');
      return {
        instrument_id: 'ok',
        symbol: 'OK',
        company_name: null,
        sector: null,
        country: 'IN',
        currentPrice: null,
        previousClose: null,
        dailyChange: null,
        dailyChangePercent: null,
        currency: null,
        priceTimestamp: null,
        score: 75,
        direction: 'BULLISH',
        confidence: 'LOW',
        triggered_signals: [],
        negative_signals: [],
        explanation: 'Bullish.',
        generated_at: new Date().toISOString(),
        source: 'signal-generation-engine',
        data_status: 'PARTIAL',
      } as any;
    });

    const result = await service.run({ batchSize: 2, offset: 0, region: 'IN', assetType: 'STOCK', useDataQualityFilter: false });

    expect(result.generatedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.errors[0]).toContain('bad: missing prices');
  });

  it('processes instruments with bounded parallelism', async () => {
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({
        instruments: [{ id: 'one' }, { id: 'two' }, { id: 'three' }, { id: 'four' }],
        pagination: { total: 4 },
      }),
    };
    const service = new SignalGenerationEngineService(runAuditRepository() as any, marketDataService as any, {} as any);
    let active = 0;
    let maxActive = 0;
    jest.spyOn(service, 'generateForInstrument').mockImplementation(async (instrumentId) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return {
        instrument_id: instrumentId,
        symbol: instrumentId.toUpperCase(),
        company_name: null,
        sector: null,
        country: 'IN',
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
        explanation: 'Neutral.',
        generated_at: new Date().toISOString(),
        source: 'signal-generation-engine',
        data_status: 'PARTIAL',
      } as any;
    });

    const result = await service.run({ batchSize: 4, maxConcurrency: 2, providerThrottleMs: 0, region: 'IN', assetType: 'STOCK', useDataQualityFilter: false });

    expect(result.maxConcurrency).toBe(2);
    expect(result.providerThrottleMs).toBe(0);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(result.generatedCount).toBe(4);
  });

  it('separates created, updated, and no-op write counts in a run summary', async () => {
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({
        instruments: [{ id: 'created' }, { id: 'updated' }, { id: 'noop' }],
        pagination: { total: 3 },
      }),
    };
    const service = new SignalGenerationEngineService(runAuditRepository() as any, marketDataService as any, {} as any);
    jest.spyOn(service, 'generateForInstrument').mockImplementation(async (instrumentId) => ({
      instrument_id: instrumentId,
      symbol: instrumentId.toUpperCase(),
      company_name: null,
      sector: null,
      country: 'IN',
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
      explanation: 'Neutral.',
      generated_at: new Date().toISOString(),
      source: 'signal-generation-engine',
      data_status: 'PARTIAL',
      writeStatus: instrumentId === 'created' ? 'CREATED' : instrumentId === 'updated' ? 'UPDATED' : 'NO_OP',
    } as any));

    const result = await service.run({ batchSize: 3, offset: 0, region: 'IN', assetType: 'STOCK', useDataQualityFilter: false });

    expect(result.generatedCount).toBe(1);
    expect(result.updatedCount).toBe(1);
    expect(result.noOpCount).toBe(1);
    expect(result.skippedCount).toBe(0);
  });

  it('allows strong bearish evidence to receive high confidence when data is fresh and sufficient', () => {
    const service = new SignalGenerationEngineService({} as any, {} as any, {} as any);
    const prices = Array.from({ length: 220 }, (_, index) => freshPrice(index, 200 - index));

    expect((service as any).confidenceFor(prices, { eps: -1 }, 8)).toBe('HIGH');
  });

  it('adds a stale price warning and confidence penalty without crashing', async () => {
    const repository = {
      createSignalResult: jest.fn(async (result) => ({ ...result, id: 'signal-1' })),
    };
    const stalePrices = Array.from({ length: 260 }, (_, index) => price(index, 100 + index * 0.1));
    const marketDataService = {
      getInstrument: jest.fn().mockResolvedValue({ id: 'stock-1', symbol: 'STALE', company_name: 'Stale Co', currency: 'INR' }),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: stalePrices }),
      fundamentalsByInstrumentId: jest.fn().mockResolvedValue({ records: [{ eps: 1, net_income: 1, market_cap: 1000 }] }),
    };
    const service = new SignalGenerationEngineService(repository as any, marketDataService as any, { workbench: jest.fn().mockResolvedValue({ valuation: {}, relative_strength: {} }) } as any);

    const result = await service.generateForInstrument('stock-1');

    expect(result?.warnings?.[0]).toContain('Market data is stale');
    expect(result?.confidence).not.toBe('HIGH');
  });

  it('adds Strategy Framework matches when requested', async () => {
    const repository = {
      latestSignals: jest.fn().mockResolvedValue({
        signals: [{
          id: 'signal-1',
          instrument_id: 'stock-1',
          symbol: 'ABC',
          company_name: 'ABC Co',
          sector: 'Technology',
          country: 'IN',
          currentPrice: null,
          previousClose: null,
          dailyChange: null,
          dailyChangePercent: null,
          currency: null,
          priceTimestamp: null,
          score: 85,
          direction: 'BULLISH',
          confidence: 'HIGH',
          triggered_signals: [{ code: 'PRICE_ABOVE_SMA50', label: 'price is above SMA50', category: 'TECHNICAL' }],
          negative_signals: [],
          explanation: 'Bullish because price is above SMA50.',
          generated_at: '2026-04-28T00:00:00.000Z',
          source: 'signal-generation-engine',
          data_status: 'COMPLETE',
          ...trustedReadEvidence,
        }],
        total: 1,
      }),
    };
    const prices = Array.from({ length: 260 }, (_, index) => price(index, 200 - index * 0.2, 1000));
    const marketDataService = {
      getInstrumentsByIds: jest.fn().mockResolvedValue([{ id: 'stock-1', symbol: 'ABC', country: 'India', asset_type: 'STOCK', currency: 'INR' }]),
      getLatestPricesBySymbols: jest.fn().mockResolvedValue([{ symbol: 'ABC', adjusted_close: 200, date: '2026-04-28T00:00:00.000Z' }]),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices }),
    };
    const frameworkService = {
      performance: jest.fn().mockResolvedValue([{ ratingGrade: 'GOOD', readinessLabel: 'PAPER_TEST_CANDIDATE' }]),
    };
    const service = new SignalGenerationEngineService(repository as any, marketDataService as any, {} as any, {} as any, new StrategyFrameworkRegistry(), frameworkService as any);

    const result = await service.topSignals({ limit: 5, includeStrategyMatches: true, strategyCode: 'TREND_MOMENTUM' });

    expect(result.signals[0].strategyMatches?.[0]).toMatchObject({
      strategyCode: 'TREND_MOMENTUM',
      strategyName: expect.any(String),
      strategyVersion: '1.0.0',
      ratingGrade: 'GOOD',
      readinessLabel: 'PAPER_TEST_CANDIDATE',
    });
    expect(result.signals[0].strategyMatches?.[0].entryRulesPassed.length).toBeGreaterThan(0);
    expect(frameworkService.performance).toHaveBeenCalledWith('TREND_MOMENTUM', { region: 'IN', assetType: 'STOCK' });
  });

  it('returns blocked strategies with data gaps instead of failing matching', async () => {
    const service = new SignalGenerationEngineService({} as any, {
      getInstrumentsByIds: jest.fn().mockResolvedValue([{ id: 'stock-1', symbol: 'ABC', region: 'IN', asset_type: 'STOCK' }]),
      getLatestPricesBySymbols: jest.fn().mockResolvedValue([]),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [] }),
    } as any, {} as any);

    const signal = await service.enrichSignal({
      instrument_id: 'stock-1',
      symbol: 'ABC',
      company_name: 'ABC Co',
      sector: null,
      country: 'IN',
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
      explanation: 'Bullish because raw signal is strong.',
      generated_at: '2026-04-28T00:00:00.000Z',
      source: 'signal-generation-engine',
      data_status: 'MISSING',
    } as any);

    const enriched = await service.enrichSignals([signal], { includeStrategyMatches: true, strategyCode: 'TREND_MOMENTUM' });
    expect(enriched[0].blockedStrategies?.[0]).toEqual(expect.objectContaining({
      strategyCode: 'TREND_MOMENTUM',
      reason: expect.any(String),
    }));
    expect(enriched[0].blockedStrategies?.[0].dataGaps.length).toBeGreaterThan(0);
  });

  it('filters only strategy eligible signals after bounded enrichment', async () => {
    const repository = {
      latestSignals: jest.fn().mockResolvedValue({
        signals: [
          {
            instrument_id: 'match',
            symbol: 'MATCH',
            company_name: null,
            sector: null,
            country: 'IN',
            currentPrice: null,
            previousClose: null,
            dailyChange: null,
            dailyChangePercent: null,
            currency: null,
            priceTimestamp: null,
            score: 85,
            direction: 'BULLISH',
            confidence: 'HIGH',
            triggered_signals: [],
            negative_signals: [],
            explanation: 'Bullish.',
            generated_at: '2026-04-28T00:00:00.000Z',
            source: 'signal-generation-engine',
            data_status: 'COMPLETE',
            ...trustedReadEvidence,
          },
          {
            instrument_id: 'blocked',
            symbol: 'BLOCK',
            company_name: null,
            sector: null,
            country: 'IN',
            currentPrice: null,
            previousClose: null,
            dailyChange: null,
            dailyChangePercent: null,
            currency: null,
            priceTimestamp: null,
            score: 85,
            direction: 'BULLISH',
            confidence: 'HIGH',
            triggered_signals: [],
            negative_signals: [],
            explanation: 'Bullish.',
            generated_at: '2026-04-28T00:00:00.000Z',
            source: 'signal-generation-engine',
            data_status: 'COMPLETE',
            ...trustedReadEvidence,
          },
        ],
        total: 2,
      }),
    };
    const prices = Array.from({ length: 260 }, (_, index) => price(index, 200 - index * 0.2, 1000));
    const marketDataService = {
      getInstrumentsByIds: jest.fn().mockResolvedValue([{ id: 'match', symbol: 'MATCH', region: 'IN' }, { id: 'blocked', symbol: 'BLOCK', region: 'IN' }]),
      getLatestPricesBySymbols: jest.fn().mockResolvedValue([{ symbol: 'MATCH', adjusted_close: 200 }, { symbol: 'BLOCK', adjusted_close: 200 }]),
      listPricesByInstrumentId: jest.fn((instrumentId) => Promise.resolve({ prices: instrumentId === 'match' ? prices : [] })),
    };
    const service = new SignalGenerationEngineService(repository as any, marketDataService as any, {} as any);

    const result = await service.topSignals({ limit: 10, onlyStrategyEligible: true, strategyCode: 'TREND_MOMENTUM' });

    expect(result.signals.map((signal) => signal.instrument_id)).toEqual(['match']);
  });
});
