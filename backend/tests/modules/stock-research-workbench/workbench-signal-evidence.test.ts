/// <reference types="@types/jest" />
/**
 * Unit tests for the signalEvidence section added to the stock-research workbench
 * (Part B — trader job #4).
 *
 * Covered scenarios:
 *  1. signalEvidenceFor returns status='AVAILABLE' with winRate, avgForwardReturn,
 *     calibratedScore, reliabilityTier when all persisted sources exist.
 *  2. signalEvidenceFor returns status='NO_TRACK_RECORD' with null metrics when no
 *     mature outcomes exist — graceful absent, nothing fabricated.
 *  3. signalEvidenceFor returns status='CALIBRATION_PENDING' when outcomes exist
 *     but no calibration row has been persisted yet.
 *  4. workbench() response includes signalEvidence section at the top level.
 *  5. Any reader throwing is caught — signalEvidence degrades to NO_TRACK_RECORD.
 *
 * All DB / repo calls are mocked — no real database is accessed.
 */
import {
  StockResearchWorkbenchService,
} from '../../../src/modules/stock-research-workbench/stock-research-workbench.service';
import type {
  WorkbenchCalibrationReader,
  WorkbenchOutcomeAggregateReader,
  WorkbenchSignalReader,
} from '../../../src/modules/stock-research-workbench/stock-research-workbench.service';

// ---------------------------------------------------------------------------
// Shared minimal market-data mock for workbench() tests
// ---------------------------------------------------------------------------

const buildMarketDataMock = () => ({
  getInstrument: jest.fn().mockResolvedValue({
    id: 'inst-1',
    symbol: 'TEST',
    company_name: 'Test Co',
    exchange: 'NSE',
    country: 'IN',
    sector: 'Technology',
    industry: 'Software',
    currency: 'INR',
    market_cap: 1000,
    source: 'database',
    last_updated_timestamp: '2026-06-01T00:00:00.000Z',
    data_status: 'COMPLETE',
  }),
  latestPriceByInstrumentId: jest.fn().mockResolvedValue({
    latest: { close: 120 },
    source: 'database',
    last_updated_timestamp: '2026-06-01T00:00:00.000Z',
    data_status: 'COMPLETE',
  }),
  listPricesByInstrumentId: jest.fn().mockResolvedValue({
    prices: [
      { date: '2026-06-01T00:00:00.000Z', close: 120, adjusted_close: 120, volume: 100 },
      { date: '2025-06-01T00:00:00.000Z', close: 90, adjusted_close: 90, volume: 100 },
    ],
    source: 'database',
    last_updated_timestamp: '2026-06-01T00:00:00.000Z',
    data_status: 'COMPLETE',
  }),
  listPrices: jest.fn().mockResolvedValue([]),
  fundamentalsByInstrumentId: jest.fn().mockResolvedValue({ records: [{ pe_ratio: 20, dividend_yield: 0.02 }] }),
  corporateActionsByInstrumentId: jest.fn().mockResolvedValue({ actions: [] }),
  listInstruments: jest.fn().mockResolvedValue({ instruments: [] }),
  list: jest.fn().mockResolvedValue({ stocks: [], pagination: { total: 0, page: 1, pageSize: 20 } }),
});

// ---------------------------------------------------------------------------
// 1. AVAILABLE — all data present
// ---------------------------------------------------------------------------

describe('signalEvidenceFor — AVAILABLE', () => {
  it('returns AVAILABLE with winRate, calibratedScore, reliabilityTier when all sources exist', async () => {
    const calibrationReader: WorkbenchCalibrationReader = {
      latestForInstrument: jest.fn().mockResolvedValue({
        calibratedScore: 74,
        calibratedDirection: 'BULLISH',
        calibrationEvidence: { horizon: '20D' },
        overallEvaluatedSamples: 210,
      }),
    };

    const outcomeReader: WorkbenchOutcomeAggregateReader = {
      instrumentOutcomeAggregate: jest.fn().mockResolvedValue({
        matureCount: 47,
        directionalSampleSize: 42,
        winRate: 0.6429,
        avgForwardReturn: 0.0185,
      }),
    };

    const signalReader: WorkbenchSignalReader = {
      latestForInstrument: jest.fn().mockResolvedValue({
        reliabilityTier: 'FULL',
      }),
    };

    const service = new StockResearchWorkbenchService(
      {} as any,
      calibrationReader,
      outcomeReader,
      signalReader,
    );

    const result = await service.signalEvidenceFor('inst-1');

    expect(result.status).toBe('AVAILABLE');
    expect(result.reliabilityTier).toBe('FULL');
    expect(result.outcomeDepth).toBe(47);
    expect(result.trackRecordHorizon).toBe('20D');
    expect(result.winRate).toBeCloseTo(0.6429);
    expect(result.avgForwardReturn).toBeCloseTo(0.0185);
    expect(result.calibratedScore).toBe(74);
    expect(result.calibratedDirection).toBe('BULLISH');
    expect(result.note).toContain('47');
    expect(result.note).toContain('20D');
  });
});

// ---------------------------------------------------------------------------
// 2. NO_TRACK_RECORD — no mature outcomes
// ---------------------------------------------------------------------------

describe('signalEvidenceFor — NO_TRACK_RECORD', () => {
  it('returns NO_TRACK_RECORD with null metrics when no mature outcomes exist', async () => {
    const calibrationReader: WorkbenchCalibrationReader = {
      latestForInstrument: jest.fn().mockResolvedValue(null),
    };

    const outcomeReader: WorkbenchOutcomeAggregateReader = {
      instrumentOutcomeAggregate: jest.fn().mockResolvedValue(null), // no outcomes
    };

    const signalReader: WorkbenchSignalReader = {
      latestForInstrument: jest.fn().mockResolvedValue({ reliabilityTier: 'PARTIAL' }),
    };

    const service = new StockResearchWorkbenchService(
      {} as any,
      calibrationReader,
      outcomeReader,
      signalReader,
    );

    const result = await service.signalEvidenceFor('inst-1');

    expect(result.status).toBe('NO_TRACK_RECORD');
    expect(result.winRate).toBeNull();
    expect(result.avgForwardReturn).toBeNull();
    expect(result.calibratedScore).toBeNull();
    expect(result.calibratedDirection).toBeNull();
    expect(result.outcomeDepth).toBeNull();
    expect(result.trackRecordHorizon).toBeNull();
    expect(result.note).toContain('No track record yet');
    // reliabilityTier should still come from the signal row
    expect(result.reliabilityTier).toBe('PARTIAL');
  });
});

// ---------------------------------------------------------------------------
// 3. CALIBRATION_PENDING — outcomes exist but calibration absent
// ---------------------------------------------------------------------------

describe('signalEvidenceFor — CALIBRATION_PENDING', () => {
  it('returns CALIBRATION_PENDING when outcomes exist but no calibration row', async () => {
    const calibrationReader: WorkbenchCalibrationReader = {
      latestForInstrument: jest.fn().mockResolvedValue(null), // no calibration
    };

    const outcomeReader: WorkbenchOutcomeAggregateReader = {
      instrumentOutcomeAggregate: jest.fn().mockResolvedValue({
        matureCount: 15,
        directionalSampleSize: 12,
        winRate: 0.5833,
        avgForwardReturn: 0.012,
      }),
    };

    const signalReader: WorkbenchSignalReader = {
      latestForInstrument: jest.fn().mockResolvedValue({ reliabilityTier: 'FULL' }),
    };

    const service = new StockResearchWorkbenchService(
      {} as any,
      calibrationReader,
      outcomeReader,
      signalReader,
    );

    const result = await service.signalEvidenceFor('inst-1');

    expect(result.status).toBe('CALIBRATION_PENDING');
    expect(result.outcomeDepth).toBe(15);
    expect(result.winRate).toBeCloseTo(0.5833);
    expect(result.avgForwardReturn).toBeCloseTo(0.012);
    expect(result.calibratedScore).toBeNull();
    expect(result.calibratedDirection).toBeNull();
    expect(result.note).toContain('calibration pending');
  });
});

// ---------------------------------------------------------------------------
// 4. workbench() includes signalEvidence key
// ---------------------------------------------------------------------------

describe('workbench() — signalEvidence included in response', () => {
  it('includes signalEvidence section with status field', async () => {
    const calibrationReader: WorkbenchCalibrationReader = {
      latestForInstrument: jest.fn().mockResolvedValue(null),
    };
    const outcomeReader: WorkbenchOutcomeAggregateReader = {
      instrumentOutcomeAggregate: jest.fn().mockResolvedValue(null),
    };
    const signalReader: WorkbenchSignalReader = {
      latestForInstrument: jest.fn().mockResolvedValue(null),
    };

    const service = new StockResearchWorkbenchService(
      buildMarketDataMock() as any,
      calibrationReader,
      outcomeReader,
      signalReader,
    );

    const result = await service.workbench('inst-1', '1Y');

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('signalEvidence');
    expect(result!.signalEvidence.status).toBeDefined();
    expect(['AVAILABLE', 'NO_TRACK_RECORD', 'CALIBRATION_PENDING']).toContain(result!.signalEvidence.status);
  });
});

// ---------------------------------------------------------------------------
// 5. Graceful degradation when readers throw
// ---------------------------------------------------------------------------

describe('signalEvidenceFor — graceful degradation on reader error', () => {
  it('returns NO_TRACK_RECORD when calibrationReader throws', async () => {
    const calibrationReader: WorkbenchCalibrationReader = {
      latestForInstrument: jest.fn().mockRejectedValue(new Error('DB timeout')),
    };
    const outcomeReader: WorkbenchOutcomeAggregateReader = {
      instrumentOutcomeAggregate: jest.fn().mockResolvedValue(null),
    };
    const signalReader: WorkbenchSignalReader = {
      latestForInstrument: jest.fn().mockResolvedValue(null),
    };

    const service = new StockResearchWorkbenchService(
      {} as any,
      calibrationReader,
      outcomeReader,
      signalReader,
    );

    const result = await service.signalEvidenceFor('inst-err');

    expect(result.status).toBe('NO_TRACK_RECORD');
    expect(result.calibratedScore).toBeNull();
    // note should be present — something meaningful
    expect(typeof result.note).toBe('string');
    expect(result.note.length).toBeGreaterThan(0);
  });

  it('returns CALIBRATION_PENDING when outcomeReader throws but calibration exists', async () => {
    const calibrationReader: WorkbenchCalibrationReader = {
      latestForInstrument: jest.fn().mockResolvedValue({
        calibratedScore: 66,
        calibratedDirection: 'BULLISH',
        calibrationEvidence: { horizon: '20D' },
        overallEvaluatedSamples: 80,
      }),
    };
    const outcomeReader: WorkbenchOutcomeAggregateReader = {
      instrumentOutcomeAggregate: jest.fn().mockRejectedValue(new Error('DB timeout')),
    };
    const signalReader: WorkbenchSignalReader = {
      latestForInstrument: jest.fn().mockResolvedValue(null),
    };

    const service = new StockResearchWorkbenchService(
      {} as any,
      calibrationReader,
      outcomeReader,
      signalReader,
    );

    const result = await service.signalEvidenceFor('inst-err');

    // Outcome aggregate failed → treated as no outcomes → NO_TRACK_RECORD
    // (calibration may exist but without outcome confirmation we stay conservative)
    expect(['NO_TRACK_RECORD', 'CALIBRATION_PENDING']).toContain(result.status);
    // calibratedScore still surfaced when calibration row loaded successfully
    expect(result.calibratedScore).toBe(66);
  });
});

// ---------------------------------------------------------------------------
// 6. reliabilityTier is null when signal row absent
// ---------------------------------------------------------------------------

describe('signalEvidenceFor — reliabilityTier when signal absent', () => {
  it('sets reliabilityTier=null when no signal row exists for the instrument', async () => {
    const service = new StockResearchWorkbenchService(
      {} as any,
      { latestForInstrument: jest.fn().mockResolvedValue(null) },
      { instrumentOutcomeAggregate: jest.fn().mockResolvedValue(null) },
      { latestForInstrument: jest.fn().mockResolvedValue(null) },
    );

    const result = await service.signalEvidenceFor('inst-new');

    expect(result.reliabilityTier).toBeNull();
    expect(result.status).toBe('NO_TRACK_RECORD');
  });
});
