/// <reference types="@types/jest" />
/**
 * Guard tests: CB-5 (architecture audit R1/R2/R4)
 *
 * Asserts that GET handler paths never call generation (.run()) or write
 * (.save*() / .saveSnapshot()) methods.  Each test mocks the service/repo
 * at the controller or service boundary and confirms the forbidden methods
 * are NOT invoked.
 */
import type { Request, Response } from 'express';
import { SignalGenerationEngineController } from '../../../src/modules/signal-generation-engine/signal-generation-engine.controller';
import { MarketContextIntelligenceController } from '../../../src/modules/market-context-intelligence/market-context-intelligence.controller';
import { SignalQualityLabService } from '../../../src/modules/signal-quality-lab/signal-quality-lab.service';

function responseMock() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response & { status: jest.Mock; json: jest.Mock };
}

// ---------------------------------------------------------------------------
// R1: signal latestForInstrument GET — must never call service.run()
// ---------------------------------------------------------------------------
describe('R1 guard — GET /signals/:instrumentId never calls run()', () => {
  it('calls latestPersistedForInstruments and NOT run() when a persisted signal exists', async () => {
    const persistedSignal = { id: 'sig-1', instrument_id: 'RELIANCE', symbol: 'RELIANCE' };
    const service = {
      latestPersistedForInstruments: jest.fn().mockResolvedValue([persistedSignal]),
      run: jest.fn(),
      latestForInstrument: jest.fn(),
    };
    const controller = new SignalGenerationEngineController(service as any);
    const req = { params: { instrumentId: 'RELIANCE' } } as unknown as Request;
    const res = responseMock();

    await controller.latestForInstrument(req, res);

    expect(service.latestPersistedForInstruments).toHaveBeenCalledWith(['RELIANCE']);
    expect(service.run).not.toHaveBeenCalled();
    expect(service.latestForInstrument).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(persistedSignal);
  });

  it('returns 404 and does NOT call run() when no persisted signal exists', async () => {
    const service = {
      latestPersistedForInstruments: jest.fn().mockResolvedValue([]),
      run: jest.fn(),
      latestForInstrument: jest.fn(),
    };
    const controller = new SignalGenerationEngineController(service as any);
    const req = { params: { instrumentId: 'UNKNOWN_NSE' } } as unknown as Request;
    const res = responseMock();

    await controller.latestForInstrument(req, res);

    expect(service.latestPersistedForInstruments).toHaveBeenCalledWith(['UNKNOWN_NSE']);
    expect(service.run).not.toHaveBeenCalled();
    expect(service.latestForInstrument).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ---------------------------------------------------------------------------
// R2: market-context summary GET — must never call service.run() or saveSnapshot()
// ---------------------------------------------------------------------------
describe('R2 guard — GET /market-context/summary never calls run() or saveSnapshot()', () => {
  it('calls latestPersistedSummary and NOT run() or saveSnapshot() when snapshot exists', async () => {
    const snapshot = {
      updatedAt: '2026-06-05T05:00:00.000Z',
      regime: { updatedAt: '2026-06-05T05:00:00.000Z' },
    };
    const service = {
      latestPersistedSummary: jest.fn().mockResolvedValue(snapshot),
      summary: jest.fn(),
      run: jest.fn(),
      saveSnapshot: jest.fn(),
    };
    const controller = new MarketContextIntelligenceController(service as any);
    const req = { query: { region: 'IN' } } as unknown as Request;
    const res = responseMock();

    await controller.summary(req, res);

    expect(service.latestPersistedSummary).toHaveBeenCalledWith('IN');
    expect(service.run).not.toHaveBeenCalled();
    expect(service.summary).not.toHaveBeenCalled();
    expect(service.saveSnapshot).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'ready',
      scope: { region: 'IN' },
      summary: snapshot,
      materialized: false,
    }));
  });

  it('returns missing envelope and does NOT call run() or saveSnapshot() when no snapshot', async () => {
    const service = {
      latestPersistedSummary: jest.fn().mockResolvedValue(null),
      summary: jest.fn(),
      run: jest.fn(),
      saveSnapshot: jest.fn(),
    };
    const controller = new MarketContextIntelligenceController(service as any);
    const req = { query: { region: 'GLOBAL' } } as unknown as Request;
    const res = responseMock();

    await controller.summary(req, res);

    expect(service.latestPersistedSummary).toHaveBeenCalledWith('GLOBAL');
    expect(service.run).not.toHaveBeenCalled();
    expect(service.summary).not.toHaveBeenCalled();
    expect(service.saveSnapshot).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'missing',
      summary: null,
    }));
  });
});

// ---------------------------------------------------------------------------
// R4: signal-quality-lab GET path — when countMatureByHorizon is present,
// the live price-history recomputation (outcomesForSignals) must NOT be
// triggered even when matureCount=0.  The persisted path returns a pending
// state instead.
//
// Background: tryPersistedSummary / tryPersistedDashboard return null ONLY
// when the repository lacks countMatureByHorizon (minimal test mocks).
// In production, both methods always return non-null (either real data or
// the pending state for matureCount=0), so price fetching is never triggered.
// ---------------------------------------------------------------------------
describe('R4 guard — GET quality summary/dashboard: no live price-fetch when countMatureByHorizon is present', () => {
  function makeProductionLikeService() {
    // Repository mock with countMatureByHorizon returning 0 (no outcomes yet).
    // scorecard and scorecardSummary return empty arrays.
    const repo: Record<string, jest.Mock> = {
      upsertOutcomeBatch: jest.fn(),
      scorecard: jest.fn().mockResolvedValue([]),
      scorecardSummary: jest.fn().mockResolvedValue([]),
      signalTypeMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue([]),
      countMatureByHorizon: jest.fn().mockResolvedValue(0),
    };

    const signalService = {
      // signalHistory is allowed to be called by noisyBounded (part of the
      // persisted path) but outcomesForSignals / price fetching must NOT happen.
      signalHistory: jest.fn().mockResolvedValue([]),
      signalHistoryCount: jest.fn().mockResolvedValue(0),
    };
    const marketDataService = {
      // Price fetching — must NOT be called on the GET path when
      // countMatureByHorizon is present (even with matureCount=0).
      listPricesByInstrumentId: jest.fn(),
    };
    const historicalContextService = { regimeForDate: jest.fn() };
    const dataQualityService = { getEvaluationsForInstruments: jest.fn().mockResolvedValue([]) };

    const service = new SignalQualityLabService(
      repo as any,
      signalService as any,
      marketDataService as any,
      historicalContextService as any,
      dataQualityService as any,
    );

    return { service, signalService, marketDataService };
  }

  it('summary() does NOT call listPricesByInstrumentId when repo has countMatureByHorizon (matureCount=0)', async () => {
    const { service, marketDataService } = makeProductionLikeService();
    const result = await service.summary({ horizon: '5D', minSampleSize: 1 } as any);

    expect(marketDataService.listPricesByInstrumentId).not.toHaveBeenCalled();
    // Returns the pending/missing state — no live data
    expect(result.dataStatus).toBe('MISSING');
    expect(result.evidenceUsability).toBe('UNAVAILABLE');
    expect(result.totalSignals).toBe(0);
  });

  it('dashboard() does NOT call listPricesByInstrumentId when repo has countMatureByHorizon (matureCount=0)', async () => {
    const { service, marketDataService } = makeProductionLikeService();
    const result = await service.dashboard({ horizon: '20D', minSampleSize: 1 } as any);

    expect(marketDataService.listPricesByInstrumentId).not.toHaveBeenCalled();
    expect(result.summary.dataStatus).toBe('MISSING');
    expect(result.byType).toEqual([]);
    expect(result.bySector).toEqual([]);
    expect(result.byRegime).toEqual([]);
    expect(result.byDataQuality).toEqual([]);
    expect(result.noisy).toEqual([]);
  });

  it('summary() does NOT call listPricesByInstrumentId when repo lacks countMatureByHorizon (legacy test context)', async () => {
    // Even in the legacy fallback path, only signalHistory is called (not prices)
    // when the signal list is empty.
    const repo: Record<string, jest.Mock> = {
      upsertOutcomeBatch: jest.fn(),
      scorecard: jest.fn().mockResolvedValue([]),
      scorecardSummary: jest.fn().mockResolvedValue([]),
      signalTypeMetricsFromPersistedOutcomes: jest.fn().mockResolvedValue([]),
      // NOTE: intentionally no countMatureByHorizon
    };
    const signalService = {
      signalHistory: jest.fn().mockResolvedValue([]),
      signalHistoryCount: jest.fn().mockResolvedValue(0),
    };
    const marketDataService = {
      listPricesByInstrumentId: jest.fn(),
    };

    const service = new SignalQualityLabService(
      repo as any,
      signalService as any,
      marketDataService as any,
      { regimeForDate: jest.fn() } as any,
      { getEvaluationsForInstruments: jest.fn().mockResolvedValue([]) } as any,
    );

    await service.summary({ horizon: '5D', minSampleSize: 0 } as any);

    // Price fetching is never triggered when the signal list is empty.
    expect(marketDataService.listPricesByInstrumentId).not.toHaveBeenCalled();
  });
});
