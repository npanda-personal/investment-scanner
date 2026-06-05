/// <reference types="@types/jest" />
/**
 * Tests for trust-critical look-ahead + accuracy defects fixed in #46.
 *
 * Each test is labelled with the issue number it verifies.
 */
import { SignalGenerationEngineService } from '../../../src/modules/signal-generation-engine';

// ── Price helpers ─────────────────────────────────────────────────────────────

const price = (index: number, adjusted_close: number, volume = 1000, high?: number, low?: number) => ({
  date: new Date(Date.UTC(2024, 0, 1 + index)).toISOString(),
  open: adjusted_close,
  high: high ?? adjusted_close + 1,
  low: low ?? adjusted_close - 1,
  close: adjusted_close,
  adjusted_close,
  volume,
});

/**
 * Build a rising price series returned newest-first (as toPricePoints produces).
 * prices[0] has the highest adjusted_close (most recent).
 * This mirrors what the service methods expect as input.
 */
const risingPrices = (count: number, step = 1, base = 100) =>
  // prices[0] = newest = highest price; prices[count-1] = oldest = lowest
  Array.from({ length: count }, (_, i) => price(count - 1 - i, base + (count - 1 - i) * step));

// ── #1: RSI extended window ───────────────────────────────────────────────────

describe('#1 RSI extended window', () => {
  const service = new SignalGenerationEngineService({} as any, {} as any, {} as any);

  it('returns null for thin history (< period+1 bars)', () => {
    // 14 bars total — need >= 15 (period+1) to compute even initial avg
    const prices = risingPrices(14);
    expect(service.rsi(prices, 14)).toBeNull();
  });

  it('returns non-null for 15 bars (minimal window)', () => {
    const prices = risingPrices(15);
    expect(service.rsi(prices, 14)).not.toBeNull();
  });

  it('stabilises with extended history — value differs from the old 29-bar cap on a series with mixed moves', () => {
    // Build a 200-bar series with a bullish trend but occasional dips so RSI stabilises below 100.
    // prices[0]=newest (highest), prices[199]=oldest (lowest) — newest-first ordering.
    // Use sine-wave modulation so there are gains AND losses (RSI won't converge to 100).
    const longPrices = Array.from({ length: 200 }, (_, i) => {
      const ac = 100 + (200 - i) * 0.3 + Math.sin(i * 0.8) * 3; // trend up with oscillation
      return price(200 - i, ac); // price(200-i) gives newest-first (i=0 → index 200 = newest)
    });

    // With the old 29-bar cap the cold-start bias dominates; with 200 bars Wilder EMA converges.
    // The short slice simulates the pre-fix 29-bar cap.
    const shortSlice = longPrices.slice(0, 29); // 29 most-recent bars
    const rsiLong = service.rsi(longPrices, 14);
    const rsiShort = service.rsi(shortSlice, 14);

    expect(rsiLong).not.toBeNull();
    expect(rsiShort).not.toBeNull();
    // With mixed moves, the long-warm-up RSI is meaningfully different from the 29-bar cold start.
    // They should not be identical.
    expect(rsiLong).not.toBe(rsiShort);
    // Both should be valid RSI values in [0, 100]
    expect(rsiLong!).toBeGreaterThanOrEqual(0);
    expect(rsiLong!).toBeLessThanOrEqual(100);
  });

  it('returns 100 for a perfectly-ascending series with enough history', () => {
    // All gains, no losses → avgLoss === 0 → RSI = 100
    const prices = risingPrices(150, 1, 50);
    const result = service.rsi(prices, 14);
    expect(result).toBe(100);
  });
});

// ── #2: Fundamentals filing-date lag (point-in-time) ─────────────────────────

describe('#2 Fundamentals point-in-time lag', () => {
  /**
   * Calls the private getFundamentalsForGeneration via a public facade: we mock
   * the market-data service and call generateForInstrument with an asOfDate so
   * that getFundamentalsForGeneration runs internally.
   * We capture what latestFundamental ends up as by checking whether the signal
   * used any fundamentals signals (POSITIVE_EPS etc.).
   */

  it('excludes a filing whose period ended 30 days before asOf (within 45-day lag) when no officialResultDate', async () => {
    // Q1 FY2024 period end = 30 Jun 2023 (+45 days = 14 Aug 2023).
    // Use asOf = Aug 13, 2023 → lag NOT elapsed → filing should be excluded.
    const asOfExcludes = new Date('2023-08-13T00:00:00.000Z');

    const records = [{ eps: 5, periodEndDate: '2023-06-30T00:00:00.000Z' }];
    const marketDataService = {
      getInstrument: jest.fn().mockResolvedValue({
        id: 'inst-1', symbol: 'TEST', company_name: 'Test Co', sector: 'Tech', country: 'IN',
        catalogSource: 'NSE_EQUITY_SECURITIES',
      }),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: risingPrices(260) }),
      storedFundamentalsByInstrumentId: jest.fn().mockResolvedValue({ records }),
    };
    const repository = {
      createSignalResultWithStatus: jest.fn(async (r: any) => ({ result: { ...r, id: 'sig-1' }, status: 'CREATED' })),
      priorSignalForInstrument: jest.fn().mockResolvedValue(null),
    };

    const svc = new SignalGenerationEngineService(repository as any, marketDataService as any, {} as any);
    const result = await svc.generateForInstrument('inst-1', {
      researchContextMode: 'LIGHTWEIGHT',
      asOfDate: asOfExcludes.toISOString(),
    });

    // The result's triggered/negative signals should NOT include POSITIVE_EPS because the
    // filing was excluded (filed lag not elapsed)
    const allSignals = [...(result?.triggered_signals ?? []), ...(result?.negative_signals ?? [])];
    const epsSignal = allSignals.find(s => s.code === 'POSITIVE_EPS' || s.code === 'NEGATIVE_EPS');
    expect(epsSignal).toBeUndefined();
  });

  it('includes a filing whose period ended 60 days before asOf (past 45-day lag)', async () => {
    // period end = Jun 30 2023, asOf = Sep 01 2023 (+63 days from Jun 30 → past 45d lag)
    const records = [{ eps: 5, periodEndDate: '2023-06-30T00:00:00.000Z' }];
    const marketDataService = {
      getInstrument: jest.fn().mockResolvedValue({
        id: 'inst-2', symbol: 'TEST2', company_name: 'Test Co 2', sector: 'Tech', country: 'IN',
      }),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: risingPrices(260) }),
      storedFundamentalsByInstrumentId: jest.fn().mockResolvedValue({ records }),
    };
    const repository = {
      createSignalResultWithStatus: jest.fn(async (r: any) => ({ result: { ...r, id: 'sig-2' }, status: 'CREATED' })),
      priorSignalForInstrument: jest.fn().mockResolvedValue(null),
    };

    const svc = new SignalGenerationEngineService(repository as any, marketDataService as any, {} as any);
    const result = await svc.generateForInstrument('inst-2', {
      researchContextMode: 'LIGHTWEIGHT',
      asOfDate: '2023-09-01T00:00:00.000Z',
    });

    const allSignals = [...(result?.triggered_signals ?? []), ...(result?.negative_signals ?? [])];
    const epsSignal = allSignals.find(s => s.code === 'POSITIVE_EPS' || s.code === 'NEGATIVE_EPS');
    expect(epsSignal).toBeDefined();
    expect(epsSignal!.code).toBe('POSITIVE_EPS');
  });

  it('uses officialResultDate when available, ignoring the 45-day lag', async () => {
    // officialResultDate = Aug 01 2023, asOf = Aug 02 2023 → included
    // Without officialResultDate, periodEnd+45d = Aug 14 → would be excluded on Aug 02
    const records = [{ eps: 5, periodEndDate: '2023-06-30T00:00:00.000Z', officialResultDate: '2023-08-01T00:00:00.000Z' }];
    const marketDataService = {
      getInstrument: jest.fn().mockResolvedValue({
        id: 'inst-3', symbol: 'TEST3', company_name: 'Test Co 3', sector: 'Tech', country: 'IN',
      }),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: risingPrices(260) }),
      storedFundamentalsByInstrumentId: jest.fn().mockResolvedValue({ records }),
    };
    const repository = {
      createSignalResultWithStatus: jest.fn(async (r: any) => ({ result: { ...r, id: 'sig-3' }, status: 'CREATED' })),
      priorSignalForInstrument: jest.fn().mockResolvedValue(null),
    };

    const svc = new SignalGenerationEngineService(repository as any, marketDataService as any, {} as any);
    const result = await svc.generateForInstrument('inst-3', {
      researchContextMode: 'LIGHTWEIGHT',
      asOfDate: '2023-08-02T00:00:00.000Z',
    });

    const allSignals = [...(result?.triggered_signals ?? []), ...(result?.negative_signals ?? [])];
    const epsSignal = allSignals.find(s => s.code === 'POSITIVE_EPS' || s.code === 'NEGATIVE_EPS');
    expect(epsSignal).toBeDefined();
    expect(epsSignal!.code).toBe('POSITIVE_EPS');
  });
});

// ── #3: enrichSignals does not attach today's price to old signals ────────────

describe('#3 enrichSignals historical price isolation', () => {
  it('does not attach live price context to a signal generated in the past', async () => {
    const oldSignal = {
      id: 'sig-old',
      instrument_id: 'inst-old',
      symbol: 'OLD',
      company_name: 'Old Co',
      sector: null,
      country: 'IN',
      currentPrice: null,
      previousClose: null,
      dailyChange: null,
      dailyChangePercent: null,
      currency: null,
      priceTimestamp: null,
      score: 65,
      direction: 'BULLISH' as const,
      confidence: 'MEDIUM' as const,
      triggered_signals: [],
      negative_signals: [],
      explanation: 'Bullish.',
      // generated 1 year ago → historical
      generated_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'signal-generation-engine',
      data_status: 'COMPLETE' as const,
      auditStatus: 'CURRENT' as const,
      dataQualityEligibility: { filterApplied: true, eligible: true, signalReadinessStatus: 'READY' },
    };

    const getLatestPricesBySymbols = jest.fn().mockResolvedValue([
      { symbol: 'OLD', adjusted_close: 999, date: new Date().toISOString() },
    ]);
    // P2 #124: bulk lookup — should NOT be called for historical (non-live) signals
    const listRecentPriceWindowsByInstrumentIds = jest.fn().mockResolvedValue(new Map());
    const marketDataService = {
      getInstrumentsByIds: jest.fn().mockResolvedValue([{ id: 'inst-old', currency: 'INR' }]),
      getLatestPricesBySymbols,
      listRecentPriceWindowsByInstrumentIds,
    };

    const service = new SignalGenerationEngineService({} as any, marketDataService as any, {} as any);
    const [enriched] = await service.enrichSignals([oldSignal]);

    // currentPrice must NOT be today's live price
    expect(enriched.currentPrice).toBeNull();
    expect(enriched.dailyChange).toBeNull();
    expect(enriched.dailyChangePercent).toBeNull();
    // listRecentPriceWindowsByInstrumentIds must NOT have been called for the historical signal
    // (since we skip previous-close lookup for non-live signals — hasLiveSignals=false)
    expect(listRecentPriceWindowsByInstrumentIds).not.toHaveBeenCalled();
  });

  it('does attach live price context to a signal generated today', async () => {
    const todaySignal = {
      id: 'sig-today',
      instrument_id: 'inst-live',
      symbol: 'LIVE',
      company_name: 'Live Co',
      sector: null,
      country: 'IN',
      currentPrice: null,
      previousClose: null,
      dailyChange: null,
      dailyChangePercent: null,
      currency: null,
      priceTimestamp: null,
      score: 65,
      direction: 'BULLISH' as const,
      confidence: 'MEDIUM' as const,
      triggered_signals: [],
      negative_signals: [],
      explanation: 'Bullish.',
      generated_at: new Date().toISOString(),
      source: 'signal-generation-engine',
      data_status: 'COMPLETE' as const,
      auditStatus: 'CURRENT' as const,
      dataQualityEligibility: { filterApplied: true, eligible: true, signalReadinessStatus: 'READY' },
    };

    const marketDataService = {
      getInstrumentsByIds: jest.fn().mockResolvedValue([{ id: 'inst-live', currency: 'INR' }]),
      getLatestPricesBySymbols: jest.fn().mockResolvedValue([
        { symbol: 'LIVE', adjusted_close: 500, date: new Date().toISOString() },
      ]),
      // P2 #124: bulk previous-close fetch — index [1] is previous close
      listRecentPriceWindowsByInstrumentIds: jest.fn().mockResolvedValue(
        new Map([['inst-live', [{ adjusted_close: 500 }, { adjusted_close: 490 }]]])
      ),
    };

    const service = new SignalGenerationEngineService({} as any, marketDataService as any, {} as any);
    const [enriched] = await service.enrichSignals([todaySignal]);

    expect(enriched.currentPrice).toBe(500);
    expect(enriched.previousClose).toBe(490);
    expect(enriched.dailyChange).toBe(10);
  });
});

// ── #4: ADX divide-by-zero on flat/circuit-locked series ─────────────────────

describe('#4 ADX divide-by-zero guard', () => {
  const service = new SignalGenerationEngineService({} as any, {} as any, {} as any);

  it('returns a finite (non-NaN, non-Infinity) ADX on a perfectly-flat series', () => {
    // All bars have high==low==close → TR=0 for every bar → smoothedTR=0 each step
    const flat = Array.from({ length: 50 }, (_, i) => ({
      date: new Date(Date.UTC(2024, 0, 1 + i)).toISOString(),
      open: 100, high: 100, low: 100, close: 100, adjusted_close: 100, volume: 0,
    }));
    const result = service.adx(flat, 14);
    if (result !== null) {
      expect(Number.isFinite(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
    }
    // null is acceptable for a flat series — but NaN/Infinity is not
    expect(result).not.toBeNaN();
  });

  it('returns a sane ADX on a trending series (no circuit-lock)', () => {
    const trending = risingPrices(60, 1, 100);
    const result = service.adx(trending, 14);
    expect(result).not.toBeNull();
    expect(Number.isFinite(result!)).toBe(true);
  });
});

// ── #5: 52-week range closePosition uses adjusted prices (split stock) ────────

describe('#5 closePosition adjusted-price consistency', () => {
  const service = new SignalGenerationEngineService({} as any, {} as any, {} as any);

  it('returns [0,1] for a normal bar with matching close/adjusted_close', () => {
    const bar = { date: '', open: 100, high: 110, low: 90, close: 100, adjusted_close: 100, volume: 1000 };
    const pos = service.closePosition(bar);
    expect(pos).not.toBeNull();
    expect(pos!).toBeGreaterThanOrEqual(0);
    expect(pos!).toBeLessThanOrEqual(1);
  });

  it('does not return < 0 for a split stock where adjusted_close << raw high/low', () => {
    // Simulate a 2:1 split: raw prices are double the adjusted prices
    // raw close=50, raw high=52, raw low=48; adjusted_close=25 (post-split)
    // Old formula: (25 - 48) / (52 - 48) = -5.75  ← corrupted
    // New formula: scale high/low by adj_factor = 25/50 = 0.5
    //   adjHigh=26, adjLow=24, closePos = (25-24)/(26-24) = 0.5  ← correct
    const bar = { date: '', open: 50, high: 52, low: 48, close: 50, adjusted_close: 25, volume: 1000 };
    const pos = service.closePosition(bar);
    expect(pos).not.toBeNull();
    expect(pos!).toBeGreaterThanOrEqual(0);
    expect(pos!).toBeLessThanOrEqual(1);
    // Should be 0.5 (close in middle of range)
    expect(pos!).toBeCloseTo(0.5, 5);
  });

  it('returns null when high === low (zero range)', () => {
    const bar = { date: '', open: 100, high: 100, low: 100, close: 100, adjusted_close: 100, volume: 0 };
    expect(service.closePosition(bar)).toBeNull();
  });
});

// ── #7: DQ asOf fallback to INCLUDE (not zero-out) ───────────────────────────

describe('#7 DQ asOf no-snapshot falls back to INCLUDE', () => {
  const runAuditRepo = () => ({
    createRunAudit: jest.fn(async (input: any) => ({
      id: 'run-1', status: 'RUNNING', modelVersion: input.modelVersion,
      rulesetVersion: input.rulesetVersion, generatedDate: input.generatedDate.toISOString(),
      batchSize: input.batchSize, offset: input.offset, totalCount: input.totalCount,
      processedCount: 0, generatedCount: 0, updatedCount: 0, noOpCount: 0,
      duplicateOrIdempotentCount: 0, skippedCount: 0, failedCount: 0,
      excludedByDataQuality: 0, missingQualityEvaluationCount: 0, durationMs: 0,
      startedAt: '2024-01-01T00:00:00.000Z', completedAt: null, warnings: input.warnings,
      requestedByUserId: input.requestedByUserId, scope: { region: input.region, assetType: input.assetType },
      sourceDataDate: null,
    })),
    completeRunAudit: jest.fn(async (_id: string, input: any) => ({
      id: 'run-1', status: input.status, durationMs: input.durationMs,
      processedCount: input.processedCount, generatedCount: input.generatedCount,
      updatedCount: input.updatedCount, noOpCount: input.noOpCount,
      duplicateOrIdempotentCount: input.duplicateOrIdempotentCount,
      skippedCount: input.skippedCount, failedCount: input.failedCount,
      excludedByDataQuality: input.excludedByDataQuality,
      missingQualityEvaluationCount: input.missingQualityEvaluationCount,
      warnings: input.warnings,
    })),
  });

  it('falls back to INCLUDE all instruments when DQ filter throws for an asOf run', async () => {
    const repository = { ...runAuditRepo() };
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({
        instruments: [{ id: 'a' }, { id: 'b' }],
        pagination: { total: 2 },
      }),
    };
    const dataQualityService = {
      filterEligibleInstruments: jest.fn().mockRejectedValue(new Error('no snapshot for 2023-01-01')),
    };

    const service = new SignalGenerationEngineService(
      repository as any, marketDataService as any, {} as any, dataQualityService as any
    );
    const generateSpy = jest.spyOn(service, 'generateForInstrument').mockResolvedValue(null);

    const result = await service.run({
      batchSize: 2,
      region: 'IN',
      assetType: 'STOCK',
      asOfDate: '2023-01-01',
    });

    // Must have attempted generation for BOTH instruments (INCLUDE fallback, not zero-out)
    expect(generateSpy).toHaveBeenCalledTimes(2);
    expect(result.warnings.some(w => w.includes('falling back to INCLUDE'))).toBe(true);
  });

  it('still fails closed (excludes all) when DQ filter throws for a NON-asOf (live) run', async () => {
    const repository = { ...runAuditRepo() };
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({
        instruments: [{ id: 'x' }, { id: 'y' }],
        pagination: { total: 2 },
      }),
    };
    const dataQualityService = {
      filterEligibleInstruments: jest.fn().mockRejectedValue(new Error('dq unavailable')),
    };

    const service = new SignalGenerationEngineService(
      repository as any, marketDataService as any, {} as any, dataQualityService as any
    );
    const generateSpy = jest.spyOn(service, 'generateForInstrument').mockResolvedValue(null);

    const result = await service.run({ batchSize: 2, region: 'IN', assetType: 'STOCK' });

    // Live run: fail closed → no generation
    expect(generateSpy).not.toHaveBeenCalled();
    expect(result.warnings.some(w => w.includes('trusted signal generation failed closed'))).toBe(true);
  });
});
