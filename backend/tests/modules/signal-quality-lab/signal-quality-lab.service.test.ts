/// <reference types="@types/jest" />
import { SignalQualityLabService, type PricePoint } from '../../../src/modules/signal-quality-lab';
import type { SignalResultDto } from '../../../src/modules/signal-generation-engine';

const baseSignal = (overrides: Partial<SignalResultDto> = {}): SignalResultDto => ({
  id: 'signal-1',
  instrument_id: 'stock-1',
  symbol: 'AAPL',
  company_name: 'Apple',
  sector: 'Technology',
  country: 'US',
  currentPrice: null,
  previousClose: null,
  dailyChange: null,
  dailyChangePercent: null,
  currency: 'USD',
  priceTimestamp: null,
  score: 80,
  direction: 'BULLISH',
  confidence: 'HIGH',
  triggered_signals: [{ code: 'PRICE_ABOVE_SMA50', label: 'price above SMA50', category: 'TECHNICAL' }],
  negative_signals: [{ code: 'PE_ABOVE_PEERS', label: 'P/E above peers', category: 'FUNDAMENTAL' }],
  explanation: 'Bullish because price above SMA50.',
  generated_at: '2026-01-02T00:00:00.000Z',
  modelVersion: 'signal-engine-v1',
  source: 'signal-generation-engine',
  data_status: 'COMPLETE',
  ...overrides,
});

const prices: PricePoint[] = Array.from({ length: 70 }).map((_, index) => ({
  date: new Date(Date.UTC(2026, 0, 2 + index)).toISOString(),
  adjustedClose: 100 + index,
}));

function serviceWithSignals(signals: SignalResultDto[]) {
  return new SignalQualityLabService(
    { recalculate: jest.fn().mockResolvedValue({ persistedOutcomes: false }) } as any,
    {
      signalHistory: jest.fn().mockImplementation((query) => signals.slice(query.offset ?? 0, (query.offset ?? 0) + query.limit)),
      signalHistoryCount: jest.fn().mockResolvedValue(signals.length),
    } as any,
    {
      listPricesByInstrumentId: jest.fn().mockResolvedValue({
        prices: prices.map((price) => ({ date: price.date, adjusted_close: price.adjustedClose })),
      }),
    } as any,
    { regimeForDate: jest.fn().mockResolvedValue('RISK_ON') } as any
  );
}

describe('signal quality lab service', () => {
  it('calculates forward returns and max favorable/adverse moves', () => {
    const service = serviceWithSignals([]);
    const outcome = service.calculateOutcome(baseSignal(), prices);
    expect(outcome.outcomes.find((item) => item.horizon === '1D')).toMatchObject({ available: true, forwardReturnPercent: 0.01 });
    expect(outcome.outcomes.find((item) => item.horizon === '60D')?.available).toBe(true);
    expect(outcome.maxFavorableMovePercent).toBeCloseTo(0.6);
    expect(outcome.maxAdverseMovePercent).toBe(0);
    expect(outcome.maxDrawdownPercent).toBe(0);
  });

  it('handles missing future data without failing', () => {
    const service = serviceWithSignals([]);
    const outcome = service.calculateOutcome(baseSignal(), prices.slice(0, 3));
    expect(outcome.outcomes.find((item) => item.horizon === '5D')).toMatchObject({ available: false, futurePrice: null });
  });

  it('calculates drawdown after signal', () => {
    const service = serviceWithSignals([]);
    const outcome = service.calculateOutcome(baseSignal(), [
      { date: '2026-01-02T00:00:00.000Z', adjustedClose: 100 },
      { date: '2026-01-03T00:00:00.000Z', adjustedClose: 120 },
      { date: '2026-01-04T00:00:00.000Z', adjustedClose: 90 },
    ]);
    expect(outcome.maxDrawdownPercent).toBeCloseTo(-0.25);
  });

  it('calculates win rates, averages, medians, score bucket adjacent groupings, and sector metrics', async () => {
    const service = serviceWithSignals([
      baseSignal({ id: 's1', direction: 'BULLISH', sector: 'Technology' }),
      baseSignal({ id: 's2', direction: 'BEARISH', sector: 'Utilities' }),
    ]);
    const sector = await service.bySector({ horizon: '5D', limit: 10, minSampleSize: 0 });
    expect(sector[0]).toMatchObject({ sampleSize: 1, positiveCount: 1 });
    const summary = await service.summary({ horizon: '5D', limit: 10, minSampleSize: 0 });
    expect(summary.average5DReturn).toBeCloseTo(0.05);
    expect(summary.overallBullishWinRate).toBe(1);
    expect(summary.overallBearishWinRate).toBe(0);
  });

  it('extracts signal type codes from triggered and negative signals', () => {
    const service = serviceWithSignals([]);
    const parsed = service.parseSignalTypes(baseSignal());
    expect(parsed.map((item) => item.code)).toEqual(['PRICE_ABOVE_SMA50', 'PE_ABOVE_PEERS']);
  });

  it('groups by persisted historical regime when available', async () => {
    const service = serviceWithSignals([baseSignal({ id: 's1' })]);
    const rows = await service.byRegime({ horizon: '5D', limit: 10, minSampleSize: 0 });
    expect(rows[0]).toMatchObject({ group: 'RISK_ON', sampleSize: 1 });
  });

  it('looks up historical regime once per generated date and scope for dashboard loads', async () => {
    const regimeForDate = jest.fn().mockResolvedValue('RISK_ON');
    const signals = [
      baseSignal({ id: 's1', instrument_id: 'stock-1', generated_at: '2026-01-02T09:30:00.000Z' }),
      baseSignal({ id: 's2', instrument_id: 'stock-2', generated_at: '2026-01-02T15:30:00.000Z' }),
      baseSignal({ id: 's3', instrument_id: 'stock-3', generated_at: '2026-01-02T20:00:00.000Z' }),
    ];
    const service = new SignalQualityLabService(
      {} as any,
      {
        signalHistory: jest.fn().mockResolvedValue(signals),
        signalHistoryCount: jest.fn().mockResolvedValue(signals.length),
      } as any,
      {
        listForwardPriceWindowsByInstrumentIds: jest.fn().mockImplementation(async (instrumentIds: string[]) => new Map(
          instrumentIds.map((id) => [id, prices.map((price) => ({ date: price.date, adjusted_close: price.adjustedClose }))])
        )),
      } as any,
      { regimeForDate } as any,
      { getEvaluationsForInstruments: jest.fn().mockResolvedValue([]) } as any
    );

    const dashboard = await service.dashboard({ horizon: '5D', limit: 10, minSampleSize: 0, region: 'IN', assetType: 'STOCK' });

    expect(regimeForDate).toHaveBeenCalledTimes(1);
    expect(regimeForDate).toHaveBeenCalledWith(expect.any(Date), { region: 'IN', assetType: 'STOCK' });
    expect(dashboard.byRegime[0]).toMatchObject({ group: 'RISK_ON', sampleSize: 3 });
  });

  it('returns dashboard diagnostics when historical regime lookup fails', async () => {
    const service = new SignalQualityLabService(
      {} as any,
      {
        signalHistory: jest.fn().mockResolvedValue([baseSignal({ id: 's1' })]),
        signalHistoryCount: jest.fn().mockResolvedValue(1),
      } as any,
      {
        listPricesByInstrumentId: jest.fn().mockResolvedValue({
          prices: prices.map((price) => ({ date: price.date, adjusted_close: price.adjustedClose })),
        }),
      } as any,
      { regimeForDate: jest.fn().mockRejectedValue(new Error('snapshot timeout')) } as any,
      { getEvaluationsForInstruments: jest.fn().mockResolvedValue([]) } as any
    );

    const dashboard = await service.dashboard({ horizon: '5D', limit: 10, minSampleSize: 0, region: 'IN', assetType: 'STOCK' });

    expect(dashboard.byRegime[0]).toMatchObject({ group: 'MISSING_REGIME_CONTEXT', sampleSize: 1 });
    expect(dashboard.summary.warnings).toContain('Historical regime lookup failed for 2026-01-02: snapshot timeout');
  });

  it('filters metrics by data quality readiness and groups by data quality', async () => {
    const signals = [baseSignal({ id: 's1', instrument_id: 'ready' }), baseSignal({ id: 's2', instrument_id: 'limited' })];
    const service = new SignalQualityLabService(
      {} as any,
      {
        signalHistory: jest.fn().mockResolvedValue(signals),
        signalHistoryCount: jest.fn().mockResolvedValue(signals.length),
      } as any,
      {
        listPricesByInstrumentId: jest.fn().mockResolvedValue({
          prices: prices.map((price) => ({ date: price.date, adjusted_close: price.adjustedClose })),
        }),
      } as any,
      { regimeForDate: jest.fn().mockResolvedValue('RISK_ON') } as any,
      {
        getEvaluationsForInstruments: jest.fn().mockResolvedValue([
          { instrumentId: 'ready', signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', signalReadinessScore: 90, eligibleForSignals: true },
          { instrumentId: 'limited', signalReadinessStatus: 'LIMITED', coverageStatus: 'PARTIAL', liquidityStatus: 'THIN', signalReadinessScore: 60, eligibleForSignals: false },
        ]),
      } as any
    );
    const summary = await service.summary({ horizon: '5D', limit: 10, minSampleSize: 0, readinessStatus: 'READY' });
    expect(summary.totalSignals).toBe(1);
    expect(summary.dataQualityFilterSummary).toMatchObject({ totalSignalsBeforeFilter: 2, totalSignalsAfterFilter: 1, excludedByDataQuality: 1 });
    const byDataQuality = await service.byDataQuality({ horizon: '5D', limit: 10, minSampleSize: 0 });
    expect(byDataQuality.map((item) => item.group)).toEqual(expect.arrayContaining(['coverage:GOOD', 'readiness:READY', 'liquidity:LIQUID']));
  });

  it('returns batch-safe recalculation progress metadata', async () => {
    const service = serviceWithSignals([baseSignal({ id: 's1' }), baseSignal({ id: 's2' })]);
    const result = await service.recalculate({ batchSize: 1, offset: 0 });
    expect(result).toMatchObject({
      processedCount: 1,
      totalCount: 2,
      batchSize: 1,
      offset: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      evaluatedInBatch: 1,
      evaluatedCount: 1,
      unevaluatedInBatch: 0,
      unevaluatedCount: 0,
      missingPriceHistoryCount: 0,
      outcomesPersisted: false,
      nextOffset: 1,
      hasMore: true,
      selectedHorizon: '20D',
      evidenceUsability: 'LIMITED',
      matureSignalsInBatch: 1,
      notYetMatureInBatch: 0,
      insufficientFuturePriceCount: 0,
    });
    expect(result.warnings).toEqual([]);
  });

  it('clamps recalculation to a bounded batch and keeps selected horizon diagnostics separate', async () => {
    const signalHistory = jest.fn().mockResolvedValue([baseSignal({ id: 's1' })]);
    const service = new SignalQualityLabService(
      {} as any,
      {
        signalHistory,
        signalHistoryCount: jest.fn().mockResolvedValue(200),
      } as any,
      {
        listPricesByInstrumentId: jest.fn().mockResolvedValue({
          prices: [{ date: '2026-01-02T00:00:00.000Z', adjusted_close: 100 }],
        }),
      } as any,
      { regimeForDate: jest.fn().mockResolvedValue(null) } as any
    );

    const result = await service.recalculate({ batchSize: 999, offset: 0, horizon: '20D', region: 'IN', assetType: 'STOCK' });

    expect(signalHistory).toHaveBeenCalledWith(expect.objectContaining({ limit: 100, offset: 0, region: 'IN', assetType: 'STOCK' }));
    expect(result).toMatchObject({
      batchSize: 100,
      selectedHorizon: '20D',
      evidenceUsability: 'UNAVAILABLE',
      evaluatedCount: 0,
      matureSignalsInBatch: 0,
      notYetMatureInBatch: 1,
      insufficientFuturePriceInBatch: 1,
      insufficientFuturePriceCount: 1,
      missingPriceHistoryCount: 0,
      hasMore: true,
      nextOffset: 1,
    });
  });

  it('passes market scope and model version to recalculation signal paging', async () => {
    const signalHistory = jest.fn().mockResolvedValue([baseSignal({ id: 's1' })]);
    const signalHistoryCount = jest.fn().mockResolvedValue(1);
    const service = new SignalQualityLabService(
      {} as any,
      { signalHistory, signalHistoryCount } as any,
      {
        listPricesByInstrumentId: jest.fn().mockResolvedValue({
          prices: prices.map((price) => ({ date: price.date, adjusted_close: price.adjustedClose })),
        }),
      } as any,
      { regimeForDate: jest.fn().mockResolvedValue(null) } as any
    );
    await service.recalculate({ batchSize: 100, offset: 0, region: 'IN', assetType: 'STOCK', modelVersion: 'signal-engine-v1' });
    expect(signalHistoryCount).toHaveBeenCalledWith(expect.objectContaining({ region: 'IN', assetType: 'STOCK', modelVersion: 'signal-engine-v1' }));
    expect(signalHistory).toHaveBeenCalledWith(expect.objectContaining({ region: 'IN', assetType: 'STOCK', modelVersion: 'signal-engine-v1' }));
  });

  it('passes model version filters through dashboard signal history queries', async () => {
    const signalHistory = jest.fn().mockResolvedValue([baseSignal({ id: 's1', modelVersion: 'signal-engine-v1' })]);
    const service = new SignalQualityLabService(
      {} as any,
      {
        signalHistory,
        signalHistoryCount: jest.fn().mockResolvedValue(1),
      } as any,
      {
        listPricesByInstrumentId: jest.fn().mockResolvedValue({
          prices: prices.map((price) => ({ date: price.date, adjusted_close: price.adjustedClose })),
        }),
      } as any,
      { regimeForDate: jest.fn().mockResolvedValue(null) } as any
    );

    await service.dashboard({ horizon: '20D', limit: 10, minSampleSize: 0, region: 'IN', assetType: 'STOCK', modelVersion: 'signal-engine-v1' });

    expect(signalHistory).toHaveBeenCalledWith(expect.objectContaining({ modelVersion: 'signal-engine-v1' }));
  });

  it('diagnoses raw signals with no future prices instead of returning misleading empties', async () => {
    const service = new SignalQualityLabService(
      {} as any,
      {
        signalHistory: jest.fn().mockResolvedValue([baseSignal({ id: 'fresh', generated_at: '2026-01-10T15:30:00.000Z' })]),
        signalHistoryCount: jest.fn().mockResolvedValue(1),
      } as any,
      {
        listPricesByInstrumentId: jest.fn().mockResolvedValue({
          prices: [{ date: '2026-01-10T00:00:00.000Z', adjusted_close: 100 }],
        }),
      } as any,
      { regimeForDate: jest.fn().mockResolvedValue('RISK_ON') } as any
    );
    const dashboard = await service.dashboard({ horizon: '20D', limit: 10, minSampleSize: 0 });
    expect(dashboard.summary).toMatchObject({
      selectedHorizon: '20D',
      evidenceUsability: 'UNAVAILABLE',
      totalSignals: 1,
      matureSignals: 0,
      evaluatedSignals: 0,
      notYetMatureSignals: 1,
      unevaluatedSignals: 1,
      dataStatus: 'PARTIAL',
      overallBullishWinRate: null,
    });
    expect(dashboard.summary.evaluationDiagnostics).toMatchObject({
      matureSignals: 0,
      notYetMatureSignals: 1,
      insufficientFuturePriceCount: 1,
      minimumRequiredFutureRows: 20,
      selectedHorizon: '20D',
    });
    expect(dashboard.summary.horizonAvailability['1D']).toMatchObject({ eligible: 1, evaluated: 0, insufficientFuturePrice: 1, missingPriceHistory: 0, evidenceUsability: 'UNAVAILABLE' });
    expect(dashboard.summary.horizonAvailability['20D']).toMatchObject({ eligible: 1, evaluated: 0, insufficientFuturePrice: 1, missingPriceHistory: 0, evidenceUsability: 'UNAVAILABLE' });
    expect(dashboard.bySector[0]).toMatchObject({
      rawSignalCount: 1,
      sampleSize: 0,
      status: 'INSUFFICIENT_FUTURE_DATA',
    });
  });

  it('evaluates the same signal at 1D when enough rows exist', async () => {
    const service = serviceWithSignals([baseSignal({ id: 's1', generated_at: '2026-01-02T15:30:00.000Z' })]);
    const summary = await service.summary({ horizon: '1D', limit: 10, minSampleSize: 0 });
    expect(summary.evaluatedSignals).toBe(1);
    expect(summary.matureSignals).toBe(1);
    expect(summary.notYetMatureSignals).toBe(0);
    expect(summary.evidenceUsability).toBe('LIMITED');
    expect(summary.horizonAvailability['1D']).toMatchObject({ eligible: 1, evaluated: 1, insufficientFuturePrice: 0, missingPriceHistory: 0, evidenceUsability: 'LIMITED' });
    expect(summary.horizonAvailability['20D']).toMatchObject({ eligible: 1, evaluated: 1, insufficientFuturePrice: 0, missingPriceHistory: 0, evidenceUsability: 'LIMITED' });
  });

  it('keeps selected long-horizon evidence unavailable when only shorter horizons are mature', async () => {
    const service = new SignalQualityLabService(
      {} as any,
      {
        signalHistory: jest.fn().mockResolvedValue([baseSignal({ id: 'fresh', generated_at: '2026-01-02T00:00:00.000Z' })]),
        signalHistoryCount: jest.fn().mockResolvedValue(1),
      } as any,
      {
        listPricesByInstrumentId: jest.fn().mockResolvedValue({
          prices: prices.slice(0, 6).map((price) => ({ date: price.date, adjusted_close: price.adjustedClose })),
        }),
      } as any,
      { regimeForDate: jest.fn().mockResolvedValue(null) } as any
    );

    const summary = await service.summary({ horizon: '20D', limit: 10, minSampleSize: 0 });

    expect(summary.selectedHorizon).toBe('20D');
    expect(summary.evidenceUsability).toBe('UNAVAILABLE');
    expect(summary.evaluatedSignals).toBe(0);
    expect(summary.horizonAvailability['1D']).toMatchObject({ evaluated: 1, evidenceUsability: 'LIMITED' });
    expect(summary.horizonAvailability['5D']).toMatchObject({ evaluated: 1, evidenceUsability: 'LIMITED' });
    expect(summary.horizonAvailability['20D']).toMatchObject({ evaluated: 0, insufficientFuturePrice: 1, evidenceUsability: 'UNAVAILABLE' });
    expect(summary.evaluationDiagnostics.recommendedAction).toContain('Try a shorter horizon');
  });

  it('marks selected horizon evidence usable when the mature sample has no gaps', async () => {
    const signals = Array.from({ length: 5 }).map((_, index) => baseSignal({ id: `s${index}`, instrument_id: `stock-${index}` }));
    const service = serviceWithSignals(signals);

    const summary = await service.summary({ horizon: '20D', limit: 10, minSampleSize: 0 });

    expect(summary).toMatchObject({
      selectedHorizon: '20D',
      evidenceUsability: 'USABLE',
      totalSignals: 5,
      matureSignals: 5,
      evaluatedSignals: 5,
      notYetMatureSignals: 0,
      unevaluatedSignals: 0,
    });
    expect(summary.horizonAvailability['20D']).toMatchObject({
      eligible: 5,
      evaluated: 5,
      insufficientFuturePrice: 0,
      missingPriceHistory: 0,
      evidenceUsability: 'USABLE',
    });
  });

  it('uses a bounded historical analysis window instead of only the small visible page limit', async () => {
    const signals = Array.from({ length: 200 }).map((_, index) => baseSignal({ id: `s${index}`, instrument_id: `stock-${index}` }));
    const signalHistory = jest.fn().mockImplementation((query) => signals.slice(query.offset ?? 0, (query.offset ?? 0) + query.limit));
    const service = new SignalQualityLabService(
      {} as any,
      {
        signalHistory,
        signalHistoryCount: jest.fn().mockResolvedValue(signals.length),
      } as any,
      {
        listForwardPriceWindowsByInstrumentIds: jest.fn().mockImplementation(async (instrumentIds: string[]) => new Map(
          instrumentIds.map((id) => [id, prices.map((price) => ({ date: price.date, adjusted_close: price.adjustedClose }))])
        )),
      } as any,
      { regimeForDate: jest.fn().mockResolvedValue(null) } as any
    );
    const summary = await service.summary({ horizon: '1D', limit: 10, minSampleSize: 0 });
    expect(signalHistory).toHaveBeenCalledWith(expect.objectContaining({ limit: 10000 }));
    expect(summary.totalSignals).toBe(200);
    expect(summary.evaluatedSignals).toBe(200);
  });

  it('uses bulk forward price windows for multi-instrument batches when available', async () => {
    const bulkLoader = jest.fn().mockResolvedValue(new Map([
      ['stock-1', prices.map((price) => ({ date: price.date, adjusted_close: price.adjustedClose }))],
      ['stock-2', prices.map((price) => ({ date: price.date, adjusted_close: price.adjustedClose }))],
    ]));
    const service = new SignalQualityLabService(
      {} as any,
      {
        signalHistory: jest.fn().mockResolvedValue([]),
        signalHistoryCount: jest.fn().mockResolvedValue(0),
      } as any,
      {
        listForwardPriceWindowsByInstrumentIds: bulkLoader,
        listPricesByInstrumentId: jest.fn(),
      } as any,
      { regimeForDate: jest.fn().mockResolvedValue(null) } as any
    );
    const outcomes = await service.outcomesForSignals([
      baseSignal({ id: 's1', instrument_id: 'stock-1' }),
      baseSignal({ id: 's2', instrument_id: 'stock-2' }),
    ], { horizon: '5D', limit: 10, minSampleSize: 0, region: 'IN', assetType: 'STOCK' });
    expect(outcomes).toHaveLength(2);
    expect(bulkLoader).toHaveBeenCalledTimes(1);
    expect((service as any).marketDataService.listPricesByInstrumentId).not.toHaveBeenCalled();
  });

  it('prioritizes market-data gaps in recommendations even when a small sample is evaluated', async () => {
    const service = new SignalQualityLabService(
      {} as any,
      {
        signalHistory: jest.fn().mockResolvedValue([
          baseSignal({ id: 'evaluated', instrument_id: 'evaluated' }),
          baseSignal({ id: 'insufficient', instrument_id: 'insufficient' }),
          baseSignal({ id: 'missing', instrument_id: 'missing' }),
        ]),
        signalHistoryCount: jest.fn().mockResolvedValue(3),
      } as any,
      {
        listPricesByInstrumentId: jest.fn().mockImplementation((instrumentId: string) => {
          if (instrumentId === 'missing') return Promise.resolve({ prices: [] });
          const rows = instrumentId === 'insufficient' ? prices.slice(0, 1) : prices;
          return Promise.resolve({ prices: rows.map((price) => ({ date: price.date, adjusted_close: price.adjustedClose })) });
        }),
      } as any,
      { regimeForDate: jest.fn().mockResolvedValue(null) } as any
    );

    const summary = await service.summary({ horizon: '5D', limit: 10, minSampleSize: 0 });

    expect(summary.evaluationDiagnostics).toMatchObject({
      evaluatedSignals: 1,
      insufficientFuturePriceCount: 1,
      missingPriceHistoryCount: 1,
    });
    expect(summary.recommendedAction).toContain('Only 1 of 3 signals are evaluated');
    expect(summary.recommendedAction).toContain('Sync missing Market Data Foundation price history');
  });

  it('increments missing price history diagnostics safely', async () => {
    const service = new SignalQualityLabService(
      {} as any,
      {
        signalHistory: jest.fn().mockResolvedValue([baseSignal({ id: 'missing-prices' })]),
        signalHistoryCount: jest.fn().mockResolvedValue(1),
      } as any,
      { listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [] }) } as any,
      { regimeForDate: jest.fn().mockResolvedValue(null) } as any
    );
    const summary = await service.summary({ horizon: '5D', limit: 10, minSampleSize: 0 });
    expect(summary.evaluationDiagnostics.missingPriceHistoryCount).toBe(1);
    expect(summary.evaluationDiagnostics.notYetMatureSignals).toBe(0);
    expect(summary.evidenceUsability).toBe('UNAVAILABLE');
    expect(summary.horizonAvailability['5D']).toMatchObject({ missingPriceHistory: 1, evidenceUsability: 'UNAVAILABLE' });
    expect(summary.unevaluatedSignals).toBe(0);
    expect(summary.evaluationDiagnostics.unevaluatedSignals).toBe(0);
    expect(summary.recommendedAction).toContain('Sync historical market data');
  });

  it('separates missing price history from unevaluated batch progress', async () => {
    const service = new SignalQualityLabService(
      {} as any,
      {
        signalHistory: jest.fn().mockResolvedValue([baseSignal({ id: 'missing-prices' })]),
        signalHistoryCount: jest.fn().mockResolvedValue(1),
      } as any,
      { listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [] }) } as any,
      { regimeForDate: jest.fn().mockResolvedValue(null) } as any
    );
    const result = await service.recalculate({ batchSize: 1, offset: 0, horizon: '5D' });
    expect(result).toMatchObject({
      processedCount: 1,
      evaluatedCount: 0,
      unevaluatedCount: 0,
      unevaluatedInBatch: 0,
      missingPriceHistoryInBatch: 1,
      missingPriceHistoryCount: 1,
      insufficientFuturePriceInBatch: 0,
    });
  });

  it('diagnoses data-quality filters that exclude all signals', async () => {
    const signal = baseSignal({ id: 'limited', instrument_id: 'limited' });
    const service = new SignalQualityLabService(
      {} as any,
      {
        signalHistory: jest.fn().mockResolvedValue([signal]),
        signalHistoryCount: jest.fn().mockResolvedValue(1),
      } as any,
      { listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [] }) } as any,
      { regimeForDate: jest.fn().mockResolvedValue(null) } as any,
      {
        getEvaluationsForInstruments: jest.fn().mockResolvedValue([
          { instrumentId: 'limited', signalReadinessStatus: 'LIMITED', coverageStatus: 'PARTIAL', liquidityStatus: 'THIN', signalReadinessScore: 50, eligibleForSignals: false },
        ]),
      } as any
    );
    const summary = await service.summary({ horizon: '5D', limit: 10, minSampleSize: 0, readinessStatus: 'READY' });
    expect(summary.evaluationDiagnostics).toMatchObject({ signalsAfterFilters: 0, excludedByDataQualityCount: 1 });
    expect(summary.warnings).toContain('0 signals remain after data-quality filters.');
  });

  it('excludes missing data-quality evaluations when strict readiness filters are selected', async () => {
    const signal = baseSignal({ id: 'missing-evaluation', instrument_id: 'missing-evaluation' });
    const service = new SignalQualityLabService(
      {} as any,
      {
        signalHistory: jest.fn().mockResolvedValue([signal]),
        signalHistoryCount: jest.fn().mockResolvedValue(1),
      } as any,
      { listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [] }) } as any,
      { regimeForDate: jest.fn().mockResolvedValue(null) } as any,
      { getEvaluationsForInstruments: jest.fn().mockResolvedValue([]) } as any
    );
    const summary = await service.summary({ horizon: '5D', limit: 10, minSampleSize: 0, onlySignalReady: true });
    expect(summary.totalSignals).toBe(0);
    expect(summary.dataQualityFilterSummary).toMatchObject({
      totalSignalsBeforeFilter: 1,
      totalSignalsAfterFilter: 0,
      excludedByDataQuality: 1,
      missingQualityEvaluationCount: 1,
    });
  });

  it('detects failed bullish, failed bearish, low confidence, stale, and flip noise', () => {
    const service = serviceWithSignals([]);
    const signals = [
      baseSignal({ id: 's1', direction: 'BULLISH', generated_at: new Date().toISOString(), confidence: 'LOW' }),
      baseSignal({ id: 's2', direction: 'BEARISH', generated_at: new Date(Date.now() - 2 * 86400000).toISOString() }),
      baseSignal({ id: 's3', direction: 'BULLISH', generated_at: new Date(Date.now() - 4 * 86400000).toISOString() }),
      baseSignal({ id: 's4', direction: 'BEARISH', generated_at: new Date(Date.now() - 6 * 86400000).toISOString() }),
      baseSignal({ id: 's5', direction: 'BEARISH', generated_at: new Date(Date.now() - 10 * 86400000).toISOString() }),
    ];
    const failedBullish = service.calculateOutcome(signals[0], [
      { date: signals[0].generated_at, adjustedClose: 100 },
      ...Array.from({ length: 10 }).map((_, i) => ({ date: new Date(Date.now() + (i + 1) * 86400000).toISOString(), adjustedClose: 95 })),
    ]);
    const failedBearish = service.calculateOutcome(signals[1], [
      { date: signals[1].generated_at, adjustedClose: 100 },
      ...Array.from({ length: 10 }).map((_, i) => ({ date: new Date(Date.now() + (i + 1) * 86400000).toISOString(), adjustedClose: 105 })),
    ]);
    const noisy = service.detectNoisySignals(signals, [failedBullish, failedBearish]);
    expect(noisy.map((item) => item.issueType)).toEqual(expect.arrayContaining(['DIRECTION_FLIPS', 'FAILED_HIGH_SCORE_BULLISH', 'FAILED_BEARISH', 'LOW_CONFIDENCE_SIGNAL']));
  });
});
