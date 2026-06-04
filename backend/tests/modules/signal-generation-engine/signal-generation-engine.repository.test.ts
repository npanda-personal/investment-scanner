/// <reference types="@types/jest" />
import { SignalGenerationEngineRepository, type SignalResultDto } from '../../../src/modules/signal-generation-engine';

const signal: SignalResultDto = {
  instrument_id: 'stock-1',
  symbol: 'AAPL',
  company_name: 'Apple',
  sector: 'Technology',
  country: 'US',
  currentPrice: null,
  previousClose: null,
  dailyChange: null,
  dailyChangePercent: null,
  currency: null,
  priceTimestamp: null,
  score: 75,
  direction: 'BULLISH',
  confidence: 'HIGH',
  triggered_signals: [{ code: 'PRICE_ABOVE_SMA50', label: 'price above SMA50', category: 'TECHNICAL' }],
  negative_signals: [],
  explanation: 'Bullish because price is above SMA50.',
  generated_at: '2026-04-29T15:45:00.000Z',
  modelVersion: 'signal-engine-v1',
  source: 'signal-generation-engine',
  data_status: 'COMPLETE',
};

const trustedReadRecord = {
  rulesetVersion: 'signal-engine-v1',
  scoringInputSummary: {
    priceBarsUsed: 260,
    latestCloseDate: '2026-04-28T00:00:00.000Z',
    hasSma50: true,
    hasSma200: true,
    hasVolume: true,
    fundamentalsAvailable: true,
    strategyContextLoaded: false,
  },
  dataQualityEligibilitySnapshot: {
    filterApplied: true,
    eligible: true,
    coverageStatus: 'GOOD',
    signalReadinessStatus: 'READY',
    liquidityStatus: 'LIQUID',
  },
};

describe('SignalGenerationEngineRepository', () => {
  it('upserts same-day signal results by instrument, model version, and normalized generated date', async () => {
    const upsert = jest.fn().mockResolvedValue({
      id: 'signal-1',
      instrumentId: 'stock-1',
      symbol: 'AAPL',
      companyName: 'Apple',
      sector: 'Technology',
      country: 'US',
      score: 75,
      direction: 'BULLISH',
      confidence: 'HIGH',
      triggeredSignals: signal.triggered_signals,
      negativeSignals: [],
      explanation: signal.explanation,
      generatedAt: new Date(signal.generated_at),
      modelVersion: 'signal-engine-v1',
      source: 'signal-generation-engine',
      dataStatus: 'COMPLETE',
    });
    const repository = new SignalGenerationEngineRepository({ signalResult: { upsert } } as any);

    const saved = await repository.createSignalResult(signal);

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        instrumentId_modelVersion_generatedDate: {
          instrumentId: 'stock-1',
          modelVersion: 'signal-engine-v1',
          generatedDate: new Date('2026-04-29T00:00:00.000Z'),
        },
      },
    }));
    expect(upsert.mock.calls[0][0].create.generatedDate).toEqual(new Date('2026-04-29T00:00:00.000Z'));
    expect(saved).toMatchObject({ id: 'signal-1', instrument_id: 'stock-1', score: 75 });
  });

  it('reports same-day write status without changing the compatible create method', async () => {
    const existing = {
      id: 'signal-1',
      instrumentId: 'stock-1',
      symbol: 'AAPL',
      companyName: 'Apple',
      sector: 'Technology',
      country: 'US',
      score: 70,
      direction: 'BULLISH',
      confidence: 'HIGH',
      triggeredSignals: [],
      negativeSignals: [],
      explanation: 'Old.',
      generatedAt: new Date(signal.generated_at),
      modelVersion: 'signal-engine-v1',
      source: 'signal-generation-engine',
      dataStatus: 'COMPLETE',
    };
    const findUnique = jest.fn().mockResolvedValue(existing);
    const upsert = jest.fn().mockResolvedValue({ ...existing, score: 75, explanation: signal.explanation, triggeredSignals: signal.triggered_signals });
    const repository = new SignalGenerationEngineRepository({ signalResult: { findUnique, upsert } } as any);

    const write = await repository.createSignalResultWithStatus(signal);
    const compatible = await repository.createSignalResult(signal);

    expect(write.status).toBe('UPDATED');
    expect(write.result.score).toBe(75);
    expect(compatible.score).toBe(75);
  });

  it('reports no-op write status when same-day values are unchanged', async () => {
    const existing = {
      id: 'signal-1',
      instrumentId: 'stock-1',
      symbol: 'AAPL',
      companyName: 'Apple',
      sector: 'Technology',
      country: 'US',
      score: 75,
      direction: 'BULLISH',
      confidence: 'HIGH',
      triggeredSignals: signal.triggered_signals,
      negativeSignals: [],
      explanation: signal.explanation,
      generatedAt: new Date(signal.generated_at),
      modelVersion: 'signal-engine-v1',
      source: 'signal-generation-engine',
      dataStatus: 'COMPLETE',
    };
    const repository = new SignalGenerationEngineRepository({ signalResult: { findUnique: jest.fn().mockResolvedValue(existing), upsert: jest.fn().mockResolvedValue(existing) } } as any);

    await expect(repository.createSignalResultWithStatus(signal)).resolves.toMatchObject({ status: 'NO_OP' });
  });

  it('persists per-signal audit snapshots without changing idempotency key', async () => {
    const auditedSignal: SignalResultDto = {
      ...signal,
      rulesetVersion: 'rules-v1',
      sourceDataDate: '2026-04-28T00:00:00.000Z',
      sourcePriceDate: '2026-04-28T00:00:00.000Z',
      generationRunId: 'run-1',
      scoringInputSummary: {
        priceBarsUsed: 260,
        latestCloseDate: '2026-04-28T00:00:00.000Z',
        hasSma50: true,
        hasSma200: true,
        hasVolume: true,
        fundamentalsAvailable: true,
        strategyContextLoaded: false,
      },
      dataQualityEligibility: {
        filterApplied: true,
        eligible: true,
        coverageStatus: 'GOOD',
        signalReadinessStatus: 'READY',
        liquidityStatus: 'LIQUID',
      },
    };
    const upsert = jest.fn().mockResolvedValue({
      id: 'signal-1',
      instrumentId: 'stock-1',
      symbol: 'AAPL',
      companyName: 'Apple',
      sector: 'Technology',
      country: 'US',
      score: 75,
      direction: 'BULLISH',
      confidence: 'HIGH',
      triggeredSignals: signal.triggered_signals,
      negativeSignals: [],
      explanation: signal.explanation,
      generatedAt: new Date(signal.generated_at),
      generatedDate: new Date('2026-04-29T00:00:00.000Z'),
      modelVersion: 'signal-engine-v1',
      rulesetVersion: 'rules-v1',
      sourceDataDate: new Date('2026-04-28T00:00:00.000Z'),
      sourcePriceDate: new Date('2026-04-28T00:00:00.000Z'),
      scoringInputSummary: auditedSignal.scoringInputSummary,
      dataQualityEligibilitySnapshot: auditedSignal.dataQualityEligibility,
      generationRunId: 'run-1',
      source: 'signal-generation-engine',
      dataStatus: 'COMPLETE',
    });
    const repository = new SignalGenerationEngineRepository({ signalResult: { findUnique: jest.fn().mockResolvedValue(null), upsert } } as any);

    const saved = await repository.createSignalResultWithStatus(auditedSignal);

    expect(upsert.mock.calls[0][0].where.instrumentId_modelVersion_generatedDate).toEqual({
      instrumentId: 'stock-1',
      modelVersion: 'signal-engine-v1',
      generatedDate: new Date('2026-04-29T00:00:00.000Z'),
    });
    expect(upsert.mock.calls[0][0].create).toMatchObject({
      rulesetVersion: 'rules-v1',
      generationRunId: 'run-1',
      scoringInputSummary: auditedSignal.scoringInputSummary,
      dataQualityEligibilitySnapshot: auditedSignal.dataQualityEligibility,
    });
    expect(saved.result).toMatchObject({
      rulesetVersion: 'rules-v1',
      sourceDataDate: '2026-04-28T00:00:00.000Z',
      auditStatus: 'CURRENT',
    });
  });

  it('creates, completes, and reads latest run audit records', async () => {
    const runRecord = {
      id: 'run-1',
      region: 'IN',
      assetType: 'STOCK',
      requestedByUserId: 'system',
      status: 'RUNNING',
      modelVersion: 'signal-engine-v1',
      rulesetVersion: 'signal-engine-v1',
      sourceDataDate: null,
      generatedDate: new Date('2026-05-13T00:00:00.000Z'),
      batchSize: 100,
      offset: 0,
      totalCount: 3,
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
      warnings: [],
      startedAt: new Date('2026-05-13T10:00:00.000Z'),
      completedAt: null,
    };
    const create = jest.fn().mockResolvedValue(runRecord);
    const update = jest.fn().mockResolvedValue({ ...runRecord, status: 'COMPLETED', processedCount: 3, generatedCount: 1, updatedCount: 1, noOpCount: 1, duplicateOrIdempotentCount: 2, completedAt: new Date('2026-05-13T10:00:01.000Z'), durationMs: 1000 });
    const findFirst = jest.fn().mockResolvedValue({ ...runRecord, status: 'COMPLETED', completedAt: new Date('2026-05-13T10:00:01.000Z') });
    const repository = new SignalGenerationEngineRepository({ signalGenerationRun: { create, update, findFirst } } as any);

    await expect(repository.createRunAudit({
      region: 'IN',
      assetType: 'STOCK',
      requestedByUserId: 'system',
      modelVersion: 'signal-engine-v1',
      rulesetVersion: 'signal-engine-v1',
      sourceDataDate: null,
      generatedDate: new Date('2026-05-13T00:00:00.000Z'),
      batchSize: 100,
      offset: 0,
      totalCount: 3,
      warnings: [],
    })).resolves.toMatchObject({ id: 'run-1', status: 'RUNNING', scope: { region: 'IN', assetType: 'STOCK' } });

    await expect(repository.completeRunAudit('run-1', {
      status: 'COMPLETED',
      sourceDataDate: new Date('2026-05-12T00:00:00.000Z'),
      processedCount: 3,
      generatedCount: 1,
      updatedCount: 1,
      noOpCount: 1,
      duplicateOrIdempotentCount: 2,
      skippedCount: 0,
      failedCount: 0,
      excludedByDataQuality: 0,
      missingQualityEvaluationCount: 0,
      durationMs: 1000,
      warnings: [],
    })).resolves.toMatchObject({ status: 'COMPLETED', duplicateOrIdempotentCount: 2 });

    await repository.latestRunAudit({ region: 'IN', assetType: 'STOCK', modelVersion: 'signal-engine-v1' });
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { region: 'IN', assetType: 'STOCK', modelVersion: 'signal-engine-v1' },
      orderBy: { startedAt: 'desc' },
    }));
  });

  it('applies searchable, partial, and confidence filters to latest signals', async () => {
    const findMany = jest.fn().mockResolvedValue([{
      id: 'signal-1',
      instrumentId: 'stock-1',
      symbol: 'AAPL',
      companyName: 'Apple',
      sector: 'Technology',
      country: 'US',
      score: 75,
      direction: 'BULLISH',
      confidence: 'HIGH',
      triggeredSignals: [],
      negativeSignals: [],
      explanation: signal.explanation,
      generatedAt: new Date(signal.generated_at),
      modelVersion: 'signal-engine-v1',
      source: 'signal-generation-engine',
      dataStatus: 'COMPLETE',
      ...trustedReadRecord,
    }, {
      id: 'signal-2',
      instrumentId: 'stock-2',
      symbol: 'MSFT',
      companyName: 'Microsoft',
      sector: 'Technology',
      country: 'US',
      score: 55,
      direction: 'NEUTRAL',
      confidence: 'MEDIUM',
      triggeredSignals: [],
      negativeSignals: [],
      explanation: signal.explanation,
      generatedAt: new Date(signal.generated_at),
      modelVersion: 'signal-engine-v1',
      source: 'signal-generation-engine',
      dataStatus: 'COMPLETE',
      ...trustedReadRecord,
    }]);
    const repository = new SignalGenerationEngineRepository({ signalResult: { findMany } } as any);

    const result = await repository.latestSignals({
      direction: 'BULLISH',
      confidence: 'HIGH',
      minScore: 70,
      sector: 'tech',
      country: 'us',
      search: 'app',
      limit: 25,
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        sector: { contains: 'tech', mode: 'insensitive' },
        country: { contains: 'us', mode: 'insensitive' },
        // search and reliability filters are merged into AND to avoid key collision
        AND: expect.arrayContaining([
          expect.objectContaining({
            OR: [
              { symbol: { contains: 'app', mode: 'insensitive' } },
              { companyName: { contains: 'app', mode: 'insensitive' } },
            ],
          }),
        ]),
      }),
    }));
    expect(findMany.mock.calls[0][0].where.direction).toBeUndefined();
    expect(findMany.mock.calls[0][0].where.confidence).toBeUndefined();
    expect(findMany.mock.calls[0][0].where.score).toBeUndefined();
    expect(result.signals.map((item) => item.symbol)).toEqual(['AAPL']);
    expect(result.total).toBe(1);
  });

  it('excludes legacy and untrusted persisted rows from latest trusted read lists', async () => {
    const findMany = jest.fn().mockResolvedValue([{
      id: 'signal-trusted',
      instrumentId: 'trusted',
      symbol: 'TRUST',
      companyName: 'Trusted',
      sector: 'Technology',
      country: 'IN',
      score: 75,
      direction: 'BULLISH',
      confidence: 'HIGH',
      triggeredSignals: [],
      negativeSignals: [],
      explanation: signal.explanation,
      generatedAt: new Date(signal.generated_at),
      modelVersion: 'signal-engine-v1',
      source: 'signal-generation-engine',
      dataStatus: 'COMPLETE',
      ...trustedReadRecord,
    }, {
      id: 'signal-legacy',
      instrumentId: 'legacy',
      symbol: 'LEGACY',
      companyName: 'Legacy',
      sector: 'Technology',
      country: 'IN',
      score: 80,
      direction: 'BULLISH',
      confidence: 'HIGH',
      triggeredSignals: [],
      negativeSignals: [],
      explanation: signal.explanation,
      generatedAt: new Date(signal.generated_at),
      modelVersion: 'signal-engine-v1',
      source: 'signal-generation-engine',
      dataStatus: 'COMPLETE',
    }, {
      id: 'signal-limited',
      instrumentId: 'limited',
      symbol: 'LIMIT',
      companyName: 'Limited',
      sector: 'Technology',
      country: 'IN',
      score: 70,
      direction: 'NEUTRAL',
      confidence: 'MEDIUM',
      triggeredSignals: [],
      negativeSignals: [],
      explanation: signal.explanation,
      generatedAt: new Date(signal.generated_at),
      modelVersion: 'signal-engine-v1',
      source: 'signal-generation-engine',
      dataStatus: 'PARTIAL',
      rulesetVersion: 'signal-engine-v1',
      scoringInputSummary: trustedReadRecord.scoringInputSummary,
      dataQualityEligibilitySnapshot: {
        filterApplied: true,
        eligible: false,
        coverageStatus: 'PARTIAL',
        signalReadinessStatus: 'LIMITED',
        liquidityStatus: 'LIQUID',
      },
    }]);
    const repository = new SignalGenerationEngineRepository({ signalResult: { findMany } } as any);

    const result = await repository.latestSignals({ limit: 25 });

    expect(result.signals.map((item) => item.symbol)).toEqual(['TRUST']);
    expect(result.total).toBe(1);
    expect(result.signals[0]).toMatchObject({
      auditStatus: 'CURRENT',
      dataQualityEligibility: expect.objectContaining({
        filterApplied: true,
        eligible: true,
        signalReadinessStatus: 'READY',
      }),
    });
  });

  it('treats STOCK scope as current stock rows plus legacy null and EQUITY asset types', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new SignalGenerationEngineRepository({ signalResult: { findMany } } as any);

    await repository.latestSignals({ limit: 25, region: 'IN', assetType: 'STOCK' });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        stock: {
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { assetType: { in: ['STOCK', 'EQUITY'], mode: 'insensitive' } },
                { assetType: null },
              ]),
            }),
          ]),
        },
      }),
    }));
  });

  it('counts latest directions for the current scope without applying the selected direction', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { ...signal, id: 's1', instrumentId: 'stock-1', direction: 'BULLISH', generatedAt: new Date(signal.generated_at), triggeredSignals: [], negativeSignals: [], dataStatus: 'COMPLETE', ...trustedReadRecord },
      { ...signal, id: 's2', instrumentId: 'stock-2', direction: 'NEUTRAL', generatedAt: new Date(signal.generated_at), triggeredSignals: [], negativeSignals: [], dataStatus: 'COMPLETE', ...trustedReadRecord },
      { ...signal, id: 's3', instrumentId: 'stock-3', direction: 'BEARISH', generatedAt: new Date(signal.generated_at), triggeredSignals: [], negativeSignals: [], dataStatus: 'COMPLETE', ...trustedReadRecord },
      {
        ...signal,
        id: 's4',
        instrumentId: 'stock-4',
        direction: 'BULLISH',
        generatedAt: new Date(signal.generated_at),
        triggeredSignals: [],
        negativeSignals: [],
        dataStatus: 'COMPLETE',
        rulesetVersion: 'signal-engine-v1',
        scoringInputSummary: trustedReadRecord.scoringInputSummary,
        dataQualityEligibilitySnapshot: { filterApplied: true, eligible: false, signalReadinessStatus: 'NOT_READY' },
      },
    ]);
    const repository = new SignalGenerationEngineRepository({ signalResult: { findMany } } as any);

    const counts = await repository.directionCounts({ direction: 'BULLISH', region: 'IN', assetType: 'STOCK', limit: 25 });

    expect(counts).toEqual({ BULLISH: 1, NEUTRAL: 1, BEARISH: 1 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.not.objectContaining({ direction: 'BULLISH' }),
    }));
  });

  it('uses a safe sort allowlist and falls back for invalid sort fields', async () => {
    const rows = [
      { ...signal, id: 's1', instrumentId: 'stock-1', symbol: 'ZZZ', score: 10, generatedAt: new Date(signal.generated_at), triggeredSignals: [], negativeSignals: [], dataStatus: 'COMPLETE', ...trustedReadRecord },
      { ...signal, id: 's2', instrumentId: 'stock-2', symbol: 'AAA', score: 90, generatedAt: new Date(signal.generated_at), triggeredSignals: [], negativeSignals: [], dataStatus: 'COMPLETE', ...trustedReadRecord },
    ];
    const repository = new SignalGenerationEngineRepository({ signalResult: { findMany: jest.fn().mockResolvedValue(rows) } } as any);

    await expect(repository.latestSignals({ limit: 25, sortBy: 'symbol', sortDirection: 'asc' })).resolves.toMatchObject({
      signals: [{ symbol: 'AAA' }, { symbol: 'ZZZ' }],
      total: 2,
    });
    await expect(repository.latestSignals({ limit: 25, sortBy: 'notAllowed', sortDirection: 'desc' })).resolves.toMatchObject({
      signals: [{ symbol: 'AAA' }, { symbol: 'ZZZ' }],
      total: 2,
    });
  });

  it('applies latest-row semantics to latestSignalUniverse and counts', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { ...signal, id: 'latest-1', instrumentId: 'stock-1', symbol: 'AAPL', direction: 'NEUTRAL', score: 55, generatedAt: new Date('2026-04-30T00:00:00.000Z'), triggeredSignals: [], negativeSignals: [], dataStatus: 'COMPLETE', ...trustedReadRecord },
      { ...signal, id: 'latest-2', instrumentId: 'stock-2', symbol: 'MSFT', direction: 'BULLISH', score: 80, generatedAt: new Date('2026-04-30T00:00:00.000Z'), triggeredSignals: [], negativeSignals: [], dataStatus: 'COMPLETE', ...trustedReadRecord },
    ]);
    const repository = new SignalGenerationEngineRepository({ signalResult: { findMany } } as any);

    await expect(repository.latestSignalUniverse({ limit: 25, direction: 'BULLISH' })).resolves.toMatchObject([{ symbol: 'MSFT' }]);
    await expect(repository.latestSignalUniverseCount({ direction: 'BULLISH', offset: 0 })).resolves.toBe(1);
    expect(findMany.mock.calls[0][0].where.direction).toBeUndefined();
  });
});
