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
      skipped: 1,
      nextOffset: 1,
      hasMore: true,
    });
    expect(result.warnings[0]).toContain('on demand');
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
