/// <reference types="@types/jest" />
// Isolate macro() from the live macro_snapshots table: with a FRED row seeded in the
// shared DB, the unmocked persisted-read would return SUPPORTIVE/COMPLETE and make the
// "no persisted FRED row → UNKNOWN/MISSING fallback" assertion non-deterministic. Mock the
// getter to null so the fallback path is exercised deterministically (pre-FRED behaviour).
jest.mock('../../../src/modules/market-context-intelligence/market-context-intelligence.macro-read.repository', () => ({
  getLatestMacroSnapshot: jest.fn().mockResolvedValue(null),
}));
import { MarketContextIntelligenceService } from '../../../src/modules/market-context-intelligence';

const instrument = (overrides: any = {}) => ({
  instrumentId: overrides.instrumentId || 'stock-1',
  symbol: overrides.symbol || 'AAA',
  sector: overrides.sector === undefined ? 'Technology' : overrides.sector,
  country: overrides.country === undefined ? 'US' : overrides.country,
  latest: overrides.latest ?? 120,
  previous: overrides.previous ?? 118,
  prices: overrides.prices || Array.from({ length: 260 }, (_, index) => 120 - index * 0.2),
  marketCap: overrides.marketCap !== undefined ? overrides.marketCap : null,
  signalDirection: overrides.signalDirection || 'BULLISH',
  signalScore: overrides.signalScore ?? 80,
});

describe('MarketContextIntelligenceService', () => {
  it('calculates regime score and status', () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const result = service.calculateRegime([instrument(), instrument({ symbol: 'BBB', sector: 'Financials' })]);

    expect(result.score).toBeGreaterThan(50);
    expect(result.regime).toBe('RISK_ON');
  });

  it('does NOT classify as RISK_ON when breadth is zero even with positive index trend (CB-42)', () => {
    // CB-42: breadth gates 60% of score; zero breadth cannot reach RISK_ON.
    // Prices: index 0 = 50 (latest/crashed), indices 1-259 = 200 (history high).
    // SMA50  = (50 + 49*200)/50 = 197  -> 50 < 197 -> below SMA50
    // SMA200 = (50 + 199*200)/200 = 199.25 -> 50 < 199.25 -> below SMA200
    // 63-bar return = (50-200)/200 = -75% -> returnScore = max(0, 50-150) = 0
    // nseiPrices = [] -> indexTrendScore = 50 (neutral, no data)
    // leadershipScore ≈ 50 (sector RS)
    // score = 0*0.35 + 0*0.25 + 50*0.25 + 0*0.10 + 50*0.05 = 12.5 + 2.5 = 15 -> RISK_OFF
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const weakBreadthPrices = Array.from({ length: 260 }, (_, i) => i === 0 ? 50 : 200);
    const items = [
      instrument({ symbol: 'X1', latest: 50, previous: 48, prices: weakBreadthPrices }),
      instrument({ symbol: 'X2', latest: 50, previous: 48, prices: weakBreadthPrices }),
    ];
    const result = service.calculateRegime(items, []);

    expect(result.regime).not.toBe('RISK_ON');
    expect(result.score).toBeLessThan(65);
  });

  it('does NOT classify as RISK_ON in a narrow rally — few stocks rising but broad market below SMAs', () => {
    // CB-42: strong individual-stock 63-bar return with zero breadth must stay below RISK_ON.
    // latest=50 is well below SMA50 (avg of 50,200,200,...=197) and SMA200 (≈199).
    // Even supplying a bullish ^NSEI (score=75), total score:
    // 0*0.35 + 0*0.25 + 75*0.25 + 0*0.10 + 50*0.05 = 18.75 + 2.5 = 21.25 -> RISK_OFF
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const narrowRallyPrices = Array.from({ length: 260 }, (_, i) => i === 0 ? 50 : 200);
    const items = [
      instrument({ symbol: 'N1', latest: 50, previous: 48, prices: narrowRallyPrices }),
      instrument({ symbol: 'N2', latest: 50, previous: 48, prices: narrowRallyPrices }),
    ];
    // nseiPrices: 63-bar return = +12.5% -> nseiScore = min(100, 50+25) = 75
    const nseiPrices = Array.from({ length: 260 }, (_, i) => i === 0 ? 22500 : 20000);

    const result = service.calculateRegime(items, nseiPrices);

    expect(result.regime).not.toBe('RISK_ON');
    expect(result.score).toBeLessThan(65);
  });

  it('ranks sectors and classifies leadership', () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const sectors = service.rankSectors([
      instrument({ sector: 'Technology', prices: Array.from({ length: 260 }, (_, index) => 140 - index * 0.5) }),
      instrument({ sector: 'Utilities', prices: Array.from({ length: 260 }, (_, index) => 90 + index * 0.1), signalDirection: 'BEARISH' }),
    ]);

    expect(sectors[0].sector).toBe('Technology');
    expect(['LEADING', 'IMPROVING']).toContain(sectors[0].leadershipStatus);
  });

  it('excludes missing or Unknown sectors from leadership rankings', () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const sectors = service.rankSectors([
      instrument({ sector: 'Unknown', prices: Array.from({ length: 260 }, (_, index) => 160 - index) }),
      instrument({ sector: null, prices: Array.from({ length: 260 }, (_, index) => 150 - index) }),
      instrument({ sector: 'Financial Services', prices: Array.from({ length: 260 }, (_, index) => 120 - index * 0.2) }),
    ]);

    expect(sectors.map((sector) => sector.sector)).toEqual(['Financial Services']);
    expect(sectors[0].leadershipStatus).toBeDefined();
  });

  it('does not classify the only named sector as both top and weak', async () => {
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'stock-1', symbol: 'AAA', sector: 'Financial Services', country: 'India' }] }),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: instrument().prices.map((close: number) => ({ adjusted_close: close })) }),
    };
    const repository = {
      saveSnapshot: jest.fn().mockResolvedValue(undefined),
      loadIndexPrices: jest.fn().mockResolvedValue([]),
      loadCapBandUniverse: jest.fn().mockResolvedValue([]),
      latestSignalDirections: jest.fn().mockResolvedValue([]),
    };
    const service = new MarketContextIntelligenceService(repository as any, marketDataService as any);

    await service.run('IN');

    const savedSummary = repository.saveSnapshot.mock.calls[0][0];
    expect(savedSummary.topSectors.map((sector: any) => sector.sector)).toEqual(['Financial Services']);
    expect(savedSummary.weakSectors).toEqual([]);
  });

  it('stratifies breadth by cap band and counts large-cap stocks correctly (NR-5)', () => {
    // marketCap is stored in absolute rupees in the DB; 1 Crore = 1e7 rupees.
    const CR = 1e7; // 1 Crore in rupees (DB unit)
    const prices = Array.from({ length: 260 }, (_, i) => 200 - i * 0.2);
    // Large-cap: marketCap > 20,000 Cr  → > 2e11 rupees
    const largeItems = Array.from({ length: 8 }, (_, i) =>
      instrument({ symbol: `L${i}`, marketCap: (25_000 + i * 1_000) * CR, prices }),
    );
    // Mid-cap: 5,000–20,000 Cr  → 5e10 – 2e11 rupees
    const midItems = Array.from({ length: 6 }, (_, i) =>
      instrument({ symbol: `M${i}`, marketCap: (8_000 + i * 1_000) * CR, prices }),
    );
    // Small-cap: < 5,000 Cr  → < 5e10 rupees
    const smallItems = Array.from({ length: 5 }, (_, i) =>
      instrument({ symbol: `S${i}`, marketCap: (1_000 + i * 500) * CR, prices }),
    );
    // null marketCap: must not inflate any named band
    const nullCapItems = Array.from({ length: 3 }, (_, i) =>
      instrument({ symbol: `N${i}`, marketCap: null, prices }),
    );

    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const bands = service.calculateBreadthByCapBand([...largeItems, ...midItems, ...smallItems, ...nullCapItems]);

    const large = bands.find((b) => b.band === 'LARGE')!;
    const mid   = bands.find((b) => b.band === 'MID')!;
    const small = bands.find((b) => b.band === 'SMALL')!;

    expect(large.instrumentCount).toBe(8);
    expect(large.percentAboveSma50).not.toBeNull();
    expect(large.percentAboveSma200).not.toBeNull();

    expect(mid.instrumentCount).toBe(6);
    expect(mid.percentAboveSma50).not.toBeNull();

    expect(small.instrumentCount).toBe(5);
    expect(small.percentAboveSma50).not.toBeNull();

    // null-cap must not inflate any band
    expect(large.instrumentCount + mid.instrumentCount + small.instrumentCount).toBe(19);
  });

  it('returns null metrics for bands with fewer than 5 instruments (NR-5)', () => {
    const CR = 1e7; // 1 Crore in rupees (DB unit)
    const prices = Array.from({ length: 260 }, (_, i) => 200 - i * 0.2);
    const fewLarge = Array.from({ length: 3 }, (_, i) =>
      instrument({ symbol: `FL${i}`, marketCap: 30_000 * CR, prices }),
    );
    const enoughMid = Array.from({ length: 10 }, (_, i) =>
      instrument({ symbol: `EM${i}`, marketCap: 10_000 * CR, prices }),
    );

    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const bands = service.calculateBreadthByCapBand([...fewLarge, ...enoughMid]);

    const large = bands.find((b) => b.band === 'LARGE')!;
    const mid   = bands.find((b) => b.band === 'MID')!;

    expect(large.percentAboveSma50).toBeNull();
    expect(large.percentAboveSma200).toBeNull();
    expect(mid.percentAboveSma50).not.toBeNull();
  });

  it('calculates breadth', () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const breadth = service.calculateBreadth([instrument(), instrument({ signalDirection: 'BEARISH' })]);

    expect(breadth.instrumentCount).toBe(2);
    expect(breadth.sma50SampleCount).toBe(2);
    expect(breadth.sma200SampleCount).toBe(2);
    expect(breadth.percentAboveSma50).toBeGreaterThan(0);
    expect(breadth.bullishSignalCount).toBe(1);
    expect(breadth.bearishSignalCount).toBe(1);
  });

  it('uses indicator-specific breadth sample counts', () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const fullHistory = instrument({ symbol: 'FULL', prices: Array.from({ length: 260 }, (_, index) => 120 - index * 0.2) });
    const sma50Only = instrument({ symbol: 'SMA50', prices: Array.from({ length: 60 }, (_, index) => 100 - index * 0.1) });
    const tooShort = instrument({ symbol: 'SHORT', prices: Array.from({ length: 10 }, (_, index) => 90 - index * 0.1) });

    const breadth = service.calculateBreadth([fullHistory, sma50Only, tooShort]);

    expect(breadth.instrumentCount).toBe(3);
    expect(breadth.sma50SampleCount).toBe(2);
    expect(breadth.sma200SampleCount).toBe(1);
    expect(breadth.percentAboveSma50).not.toBeNull();
    expect(breadth.percentAboveSma200).not.toBeNull();
  });

  it('ranks countries', () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    const countries = service.rankCountries([instrument({ country: 'US' }), instrument({ country: 'India' })]);

    expect(countries.map((item) => item.country)).toEqual(expect.arrayContaining(['US', 'India']));
  });

  it('returns missing macro fallback when no persisted FRED row exists', async () => {
    const service = new MarketContextIntelligenceService({} as any, {} as any);
    await expect(service.macro()).resolves.toMatchObject({ macroStatus: 'UNKNOWN', dataStatus: 'MISSING' });
  });

  it('builds summary response shape (persisted-read path)', async () => {
    const persistedSnapshot = {
      regime: { regime: 'RISK_ON', score: 80, explanation: '', dataStatus: 'COMPLETE', updatedAt: '' },
      topSectors: [],
      weakSectors: [],
      breadth: { percentAboveSma50: 0.8, percentAboveSma200: 0.8, advanceDeclineRatio: 1.5, newHigh52WeekCount: 10, newLow52WeekCount: 2, bullishSignalCount: 10, bearishSignalCount: 2, instrumentCount: 100, dataStatus: 'COMPLETE' },
      countryStrength: [],
      macro: { macroStatus: 'UNKNOWN', dataStatus: 'MISSING', explanation: 'Macro providers are not configured yet.', interestRateProxy: null, inflationProxy: null, usdStrengthProxy: null, commodityProxy: null },
      explanation: ['Test'],
      updatedAt: '2026-01-01',
      dataStatus: 'COMPLETE'
    };
    const repository = {
      latestPersistedSnapshot: jest.fn().mockResolvedValue(persistedSnapshot),
      saveSnapshot: jest.fn(),
    };
    const service = new MarketContextIntelligenceService(repository as any, {} as any);

    const summary = await service.summary();

    expect(summary).not.toBeNull();
    expect(summary).toHaveProperty('regime');
    expect(summary).toHaveProperty('topSectors');
    expect(summary).toHaveProperty('breadth');
    expect(summary!.explanation.length).toBeGreaterThan(0);
  });

  it('returns null from summary() when no persisted snapshot exists (no run() fallback)', async () => {
    const repository = {
      latestPersistedSnapshot: jest.fn().mockResolvedValue(null),
    };
    const service = new MarketContextIntelligenceService(repository as any, {} as any);

    const summary = await service.summary();

    expect(summary).toBeNull();
  });

  it('persists generated snapshots using the requested region', async () => {
    const marketDataService = {
      listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'stock-1', symbol: 'AAA', sector: 'Technology', country: 'India' }] }),
      listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: instrument().prices.map((close: number) => ({ adjusted_close: close })) }),
    };
    const repository = {
      saveSnapshot: jest.fn().mockResolvedValue(undefined),
      loadIndexPrices: jest.fn().mockResolvedValue([]),
      loadCapBandUniverse: jest.fn().mockResolvedValue([]),
      latestSignalDirections: jest.fn().mockResolvedValue([{ instrumentId: 'stock-1', direction: 'BULLISH', score: 80 }]),
    };
    const service = new MarketContextIntelligenceService(repository as any, marketDataService as any);

    await service.run('IN');

    // CB-41: IN-region now uses liquid-universe filter (NSE mainboard CASH, sorted by marketCap desc)
    expect(marketDataService.listInstruments).toHaveBeenCalledWith({
      page: 1, pageSize: 500, region: 'IN',
      exchange: 'NSE', instrumentSegment: 'CASH', sortBy: 'marketCap', sortOrder: 'desc',
    });
    expect(repository.latestSignalDirections).toHaveBeenCalledWith('IN', 100);
    expect(repository.saveSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      regime: expect.any(Object),
      breadth: expect.any(Object),
    }), 'IN', undefined);
  });

  it('summary returns persisted snapshot for the requested region without triggering run()', async () => {
    // Persisted-read enforcement: summary() must call latestPersistedSnapshot, never run().
    const summary = {
      regime: { regime: 'RISK_ON', score: 80, explanation: '', dataStatus: 'COMPLETE', updatedAt: '' },
      topSectors: [],
      weakSectors: [],
      breadth: { percentAboveSma50: 0.8, percentAboveSma200: 0.8, advanceDeclineRatio: 1.5, newHigh52WeekCount: 10, newLow52WeekCount: 2, bullishSignalCount: 10, bearishSignalCount: 2, instrumentCount: 100, dataStatus: 'COMPLETE' },
      countryStrength: [],
      macro: { macroStatus: 'UNKNOWN', dataStatus: 'MISSING', explanation: 'Macro providers are not configured yet.', interestRateProxy: null, inflationProxy: null, usdStrengthProxy: null, commodityProxy: null },
      explanation: ['Test'],
      updatedAt: '2026-01-01',
      dataStatus: 'COMPLETE'
    };
    const repository = {
      latestPersistedSnapshot: jest.fn().mockResolvedValue(summary),
      saveSnapshot: jest.fn(),
    };
    const marketDataService = { listInstruments: jest.fn() };
    const service = new MarketContextIntelligenceService(repository as any, marketDataService as any);

    const result = await service.summary({ region: 'IN' });

    expect(repository.latestPersistedSnapshot).toHaveBeenCalledWith('IN');
    expect(repository.saveSnapshot).not.toHaveBeenCalled();
    expect(marketDataService.listInstruments).not.toHaveBeenCalled();
    expect(result).toBe(summary);
  });

  it('returns persisted summary without generating when snapshot exists', async () => {
    const summary = {
      regime: { regime: 'RISK_ON', score: 80, explanation: '', dataStatus: 'COMPLETE', updatedAt: '2026-05-27T05:00:00.000Z' },
      topSectors: [],
      weakSectors: [],
      breadth: { percentAboveSma50: 0.8, percentAboveSma200: 0.8, advanceDeclineRatio: 1.5, newHigh52WeekCount: 10, newLow52WeekCount: 2, bullishSignalCount: 10, bearishSignalCount: 2, instrumentCount: 100, dataStatus: 'COMPLETE' },
      countryStrength: [],
      macro: { macroStatus: 'UNKNOWN', dataStatus: 'MISSING', explanation: 'Macro providers are not configured yet.', interestRateProxy: null, inflationProxy: null, usdStrengthProxy: null, commodityProxy: null },
      explanation: ['Test'],
      updatedAt: '2026-05-27T05:00:00.000Z',
      dataStatus: 'COMPLETE'
    };
    const repository = {
      latestPersistedSnapshot: jest.fn().mockResolvedValue(summary),
      saveSnapshot: jest.fn(),
    };
    const marketDataService = {
      listInstruments: jest.fn(),
      listPricesByInstrumentId: jest.fn(),
    };
    const service = new MarketContextIntelligenceService(repository as any, marketDataService as any);

    const result = await service.latestPersistedSummary('IN');

    expect(result).toBe(summary);
    expect(repository.latestPersistedSnapshot).toHaveBeenCalledWith('IN');
    expect(repository.saveSnapshot).not.toHaveBeenCalled();
    expect(marketDataService.listInstruments).not.toHaveBeenCalled();
  });

  it('returns null for latest persisted summary without generating when no snapshot exists', async () => {
    const repository = {
      latestPersistedSnapshot: jest.fn().mockResolvedValue(null),
      saveSnapshot: jest.fn(),
    };
    const marketDataService = {
      listInstruments: jest.fn(),
      listPricesByInstrumentId: jest.fn(),
    };
    const service = new MarketContextIntelligenceService(repository as any, marketDataService as any);

    const result = await service.latestPersistedSummary('IN');

    expect(result).toBeNull();
    expect(repository.latestPersistedSnapshot).toHaveBeenCalledWith('IN');
    expect(repository.saveSnapshot).not.toHaveBeenCalled();
    expect(marketDataService.listInstruments).not.toHaveBeenCalled();
  });

  it('returns a ready persisted breadth envelope from persisted storage only', async () => {
    const summary = {
      regime: { regime: 'RISK_ON', score: 80, explanation: '', dataStatus: 'COMPLETE', updatedAt: '2026-05-27T05:00:00.000Z' },
      topSectors: [],
      weakSectors: [],
      breadth: {
        percentAboveSma50: 0.62,
        percentAboveSma200: 0.54,
        sma50SampleCount: 220,
        sma200SampleCount: 180,
        advanceDeclineRatio: 1.35,
        newHigh52WeekCount: 18,
        newLow52WeekCount: 4,
        bullishSignalCount: 34,
        bearishSignalCount: 12,
        instrumentCount: 240,
        dataStatus: 'COMPLETE',
      },
      countryStrength: [],
      macro: { macroStatus: 'UNKNOWN', dataStatus: 'MISSING', explanation: 'missing', interestRateProxy: null, inflationProxy: null, usdStrengthProxy: null, commodityProxy: null },
      explanation: ['Test'],
      updatedAt: '2026-05-27T05:00:00.000Z',
      dataStatus: 'COMPLETE',
    };
    const repository = {
      latestPersistedSnapshot: jest.fn().mockResolvedValue(summary),
      latestSnapshot: jest.fn(),
      saveSnapshot: jest.fn(),
    };
    const marketDataService = {
      listInstruments: jest.fn(),
      listPricesByInstrumentId: jest.fn(),
    };
    const service = new MarketContextIntelligenceService(repository as any, marketDataService as any);
    const summarySpy = jest.spyOn(service, 'summary');
    const runSpy = jest.spyOn(service, 'run');

    const result = await (service as any).latestPersistedBreadth('IN');

    expect(result).toEqual({
      status: 'ready',
      scope: { region: 'IN' },
      asOf: '2026-05-27T05:00:00.000Z',
      materialized: false,
      sourceLabels: {
        savedBreadth: 'Persisted Market Context breadth',
        officialAdvancesDeclines: 'NSE official advances/declines not persisted',
      },
      gaps: expect.arrayContaining([
        expect.stringMatching(/official advances/i),
        expect.stringMatching(/official declines/i),
        expect.stringMatching(/official unchanged/i),
      ]),
      breadth: expect.objectContaining({
        percentAboveSma50: 0.62,
        percentAboveSma200: 0.54,
        sma50SampleCount: 220,
        sma200SampleCount: 180,
        instrumentCount: 240,
        officialAdvanceCount: null,
        officialDeclineCount: null,
        officialUnchangedCount: null,
      }),
    });
    expect(repository.latestPersistedSnapshot).toHaveBeenCalledWith('IN');
    expect(repository.latestSnapshot).not.toHaveBeenCalled();
    expect(repository.saveSnapshot).not.toHaveBeenCalled();
    expect(summarySpy).not.toHaveBeenCalled();
    expect(runSpy).not.toHaveBeenCalled();
    expect(marketDataService.listInstruments).not.toHaveBeenCalled();
    expect(marketDataService.listPricesByInstrumentId).not.toHaveBeenCalled();
  });

  it('returns a missing persisted breadth envelope without generating when no persisted summary exists', async () => {
    const repository = {
      latestPersistedSnapshot: jest.fn().mockResolvedValue(null),
      latestSnapshot: jest.fn(),
      saveSnapshot: jest.fn(),
    };
    const marketDataService = {
      listInstruments: jest.fn(),
      listPricesByInstrumentId: jest.fn(),
    };
    const service = new MarketContextIntelligenceService(repository as any, marketDataService as any);
    const summarySpy = jest.spyOn(service, 'summary');
    const runSpy = jest.spyOn(service, 'run');

    const result = await (service as any).latestPersistedBreadth('IN');

    expect(result).toEqual({
      status: 'missing',
      scope: { region: 'IN' },
      asOf: null,
      materialized: false,
      breadth: null,
      sourceLabels: {
        savedBreadth: 'Persisted Market Context breadth',
        officialAdvancesDeclines: 'NSE official advances/declines not persisted',
      },
      gaps: expect.arrayContaining([
        expect.stringMatching(/saved breadth/i),
        expect.stringMatching(/official advances/i),
        expect.stringMatching(/official declines/i),
        expect.stringMatching(/official unchanged/i),
      ]),
    });
    expect(repository.latestPersistedSnapshot).toHaveBeenCalledWith('IN');
    expect(repository.latestSnapshot).not.toHaveBeenCalled();
    expect(repository.saveSnapshot).not.toHaveBeenCalled();
    expect(summarySpy).not.toHaveBeenCalled();
    expect(runSpy).not.toHaveBeenCalled();
    expect(marketDataService.listInstruments).not.toHaveBeenCalled();
  });
});
