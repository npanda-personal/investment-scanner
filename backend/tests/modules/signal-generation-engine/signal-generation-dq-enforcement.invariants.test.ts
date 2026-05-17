/// <reference types="@types/jest" />
import { SignalGenerationEngineService } from '../../../src/modules/signal-generation-engine';
import type { SignalResultDto } from '../../../src/modules/signal-generation-engine/signal-generation-engine.types';

const instrumentIds = [
  'ready',
  'limited',
  'not-ready',
  'unusable',
  'manual-required',
  'stale',
  'missing-dq',
];

const price = (index: number, adjustedClose = 200 + index * 0.25, volume = 1_000_000) => {
  const date = new Date('2026-05-15T00:00:00.000Z');
  date.setUTCDate(date.getUTCDate() - index);
  return {
    date: date.toISOString(),
    open: adjustedClose - 1,
    high: adjustedClose + 2,
    low: adjustedClose - 2,
    close: adjustedClose,
    adjusted_close: adjustedClose,
    volume,
  };
};

const readyPrices = Array.from({ length: 260 }, (_, index) => price(index));

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
    startedAt: '2026-05-17T08:00:00.000Z',
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
    generatedDate: '2026-05-17T00:00:00.000Z',
    batchSize: 7,
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
    startedAt: '2026-05-17T08:00:00.000Z',
    completedAt: '2026-05-17T08:00:01.000Z',
    warnings: input.warnings,
  })),
});

const createRepository = () => ({
  createSignalResultWithStatus: jest.fn(async (result: SignalResultDto) => ({
    result: { ...result, id: `${result.instrument_id}-signal` },
    status: 'CREATED',
  })),
  ...runAuditRepository(),
});

const createMarketDataService = () => ({
  listInstruments: jest.fn().mockResolvedValue({
    instruments: instrumentIds.map((id) => ({
      id,
      symbol: `${id.toUpperCase().replace(/-/g, '')}.NS`,
      company_name: `${id} Ltd`,
      sector: 'Technology',
      country: 'India',
      currency: 'INR',
      asset_type: 'STOCK',
    })),
    pagination: { total: instrumentIds.length },
  }),
  getInstrument: jest.fn(async (instrumentId: string) => {
    if (instrumentId !== 'ready') {
      throw new Error(`unexpected generation attempt for ${instrumentId}`);
    }
    return {
      id: 'ready',
      symbol: 'READY.NS',
      company_name: 'Ready Ltd',
      sector: 'Technology',
      country: 'India',
      currency: 'INR',
      asset_type: 'STOCK',
    };
  }),
  listPricesByInstrumentId: jest.fn(async (instrumentId: string) => {
    if (instrumentId !== 'ready') {
      throw new Error(`unexpected price lookup for ${instrumentId}`);
    }
    return { prices: readyPrices };
  }),
  fundamentalsByInstrumentId: jest.fn(async (instrumentId: string) => {
    if (instrumentId !== 'ready') {
      throw new Error(`unexpected fundamentals lookup for ${instrumentId}`);
    }
    return { records: [] };
  }),
});

const createStrictDataQualityService = () => ({
  filterEligibleInstruments: jest.fn().mockResolvedValue({
    eligibleInstrumentIds: ['ready'],
    excludedInstrumentIds: ['limited', 'not-ready', 'unusable', 'manual-required', 'stale', 'missing-dq'],
    missingQualityEvaluationCount: 1,
    warnings: [
      'limited: signal readiness is LIMITED',
      'not-ready: signal readiness is NOT_READY',
      'unusable: coverage is UNUSABLE',
      'manual-required: manual provider symbol repair required',
      'stale: stale latest price',
      'missing-dq: missing data quality evaluation',
    ],
    evaluationsByInstrumentId: {
      ready: {
        instrumentId: 'ready',
        eligibleForSignals: true,
        coverageStatus: 'GOOD',
        signalReadinessStatus: 'READY',
        liquidityStatus: 'LIQUID',
        signalReadinessScore: 92,
      },
      limited: {
        instrumentId: 'limited',
        eligibleForSignals: false,
        coverageStatus: 'PARTIAL',
        signalReadinessStatus: 'LIMITED',
        liquidityStatus: 'LIQUID',
        signalReadinessScore: 65,
      },
      'not-ready': {
        instrumentId: 'not-ready',
        eligibleForSignals: false,
        coverageStatus: 'POOR',
        signalReadinessStatus: 'NOT_READY',
        liquidityStatus: 'UNKNOWN',
        signalReadinessScore: 20,
      },
      unusable: {
        instrumentId: 'unusable',
        eligibleForSignals: false,
        coverageStatus: 'UNUSABLE',
        signalReadinessStatus: 'NOT_READY',
        liquidityStatus: 'UNKNOWN',
        signalReadinessScore: 5,
      },
      'manual-required': {
        instrumentId: 'manual-required',
        eligibleForSignals: false,
        coverageStatus: 'PARTIAL',
        signalReadinessStatus: 'NOT_READY',
        liquidityStatus: 'UNKNOWN',
        signalReadinessScore: 0,
      },
      stale: {
        instrumentId: 'stale',
        eligibleForSignals: false,
        coverageStatus: 'POOR',
        signalReadinessStatus: 'NOT_READY',
        liquidityStatus: 'LIQUID',
        signalReadinessScore: 35,
      },
    },
  }),
});

describe('signal generation data quality enforcement characterization invariants', () => {
  it('generates only DQ-ready signals when the signal run uses a strict data-quality filter', async () => {
    const repository = createRepository();
    const marketDataService = createMarketDataService();
    const dataQualityService = createStrictDataQualityService();
    const service = new SignalGenerationEngineService(
      repository as any,
      marketDataService as any,
      { workbench: jest.fn() } as any,
      dataQualityService as any
    );
    const generateSpy = jest.spyOn(service, 'generateForInstrument');

    const result = await service.run({
      limit: instrumentIds.length,
      batchSize: instrumentIds.length,
      maxConcurrency: 1,
      region: 'IN',
      assetType: 'STOCK',
      useDataQualityFilter: true,
      includeLimited: false,
      skipUnusable: true,
      missingQualityBehavior: 'SKIP',
      minSignalReadinessScore: 70,
    });

    expect(dataQualityService.filterEligibleInstruments).toHaveBeenCalledWith(instrumentIds, expect.objectContaining({
      minSignalReadinessScore: 70,
      includeLimited: false,
      skipUnusable: true,
      missingQualityBehavior: 'SKIP',
    }));
    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(generateSpy.mock.calls[0][0]).toBe('ready');
    expect(marketDataService.getInstrument).toHaveBeenCalledWith('ready', { region: 'IN', assetType: 'STOCK' });
    expect(marketDataService.listPricesByInstrumentId).toHaveBeenCalledWith(
      'ready',
      expect.any(Number),
      undefined,
      undefined,
      { region: 'IN', assetType: 'STOCK' }
    );
    expect(repository.createSignalResultWithStatus).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      generated: 1,
      generatedCount: 1,
      skipped: 6,
      skippedCount: 6,
      failedCount: 0,
      eligibleInstrumentCount: 1,
      attemptedGenerationCount: 1,
      dataQuality: {
        filterApplied: true,
        beforeFilter: 7,
        afterFilter: 1,
        excludedByDataQuality: 6,
        missingQualityEvaluationCount: 1,
        eligibleInstrumentCount: 1,
        attemptedGenerationCount: 1,
      },
    });
    expect(result.runAudit).toMatchObject({
      status: 'COMPLETED',
      processedCount: 7,
      generatedCount: 1,
      skippedCount: 6,
      excludedByDataQuality: 6,
      missingQualityEvaluationCount: 1,
    });
    expect(result.warnings).toEqual(expect.arrayContaining([
      'limited: signal readiness is LIMITED',
      'not-ready: signal readiness is NOT_READY',
      'unusable: coverage is UNUSABLE',
      'manual-required: manual provider symbol repair required',
      'stale: stale latest price',
      'missing-dq: missing data quality evaluation',
    ]));
  });

  it('preserves Data Quality eligibility evidence on generated signal output without target-price fields', async () => {
    const repository = createRepository();
    const service = new SignalGenerationEngineService(
      repository as any,
      createMarketDataService() as any,
      { workbench: jest.fn() } as any,
      createStrictDataQualityService() as any
    );

    const result = await service.run({
      limit: instrumentIds.length,
      batchSize: instrumentIds.length,
      maxConcurrency: 1,
      region: 'IN',
      assetType: 'STOCK',
      useDataQualityFilter: true,
      includeLimited: false,
      skipUnusable: true,
      missingQualityBehavior: 'SKIP',
      minSignalReadinessScore: 70,
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      instrument_id: 'ready',
      symbol: 'READY.NS',
      source: 'signal-generation-engine',
      dataQualityEligibility: {
        filterApplied: true,
        eligible: true,
        coverageStatus: 'GOOD',
        signalReadinessStatus: 'READY',
        liquidityStatus: 'LIQUID',
      },
    });
    expect(repository.createSignalResultWithStatus.mock.calls[0][0]).toMatchObject({
      instrument_id: 'ready',
      dataQualityEligibility: {
        filterApplied: true,
        eligible: true,
        coverageStatus: 'GOOD',
        signalReadinessStatus: 'READY',
        liquidityStatus: 'LIQUID',
      },
    });

    const serialized = JSON.stringify(result.results[0]);
    expect(serialized).not.toMatch(/targetPrice|profitTarget|priceTarget|buy now|sell now|guaranteed/i);
  });

  it('does not require Angel One, live providers, broker credentials, startup behavior, or UI scope', async () => {
    const service = new SignalGenerationEngineService(
      createRepository() as any,
      createMarketDataService() as any,
      { workbench: jest.fn() } as any,
      createStrictDataQualityService() as any
    );

    const result = await service.run({
      limit: instrumentIds.length,
      batchSize: instrumentIds.length,
      maxConcurrency: 1,
      region: 'IN',
      assetType: 'STOCK',
      useDataQualityFilter: true,
      missingQualityBehavior: 'SKIP',
    });

    expect(result.generatedCount).toBe(1);
    expect(result.dataQuality?.filterApplied).toBe(true);
  });
});
