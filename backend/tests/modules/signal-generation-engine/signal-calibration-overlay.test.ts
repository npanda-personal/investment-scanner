/// <reference types="@types/jest" />
/**
 * Unit tests for the calibration overlay added to signal reads (Part A).
 *
 * Covered scenarios:
 *  1. enrichSignals attaches calibratedScore + calibrationStatus='CALIBRATED'
 *     when a persisted calibration row exists for the instrument.
 *  2. enrichSignals sets calibrationStatus='UNAVAILABLE' and calibratedScore=null
 *     when no calibration row exists — raw score is retained unchanged.
 *  3. selectedHorizon / calibrationHorizon are surfaced from
 *     calibrationEvidence.horizon on the persisted row.
 *  4. Raw `score` field is always preserved as-is regardless of calibration.
 *  5. Default sort is unaffected (topSignals still returns raw-score order).
 *  6. calibrationSampleSize is populated from overallEvaluatedSamples when available.
 *
 * All DB / repo calls are mocked — no real database is accessed.
 */
import { SignalGenerationEngineService } from '../../../src/modules/signal-generation-engine/signal-generation-engine.service';
import type { SignalResultDto } from '../../../src/modules/signal-generation-engine/signal-generation-engine.types';
import type { CalibrationPersistedReader } from '../../../src/modules/signal-generation-engine/signal-generation-engine.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseSignal = (id: string, score: number): SignalResultDto => ({
  id,
  instrument_id: id,
  symbol: `SYM_${id}`,
  company_name: `Company ${id}`,
  sector: 'Technology',
  country: 'IN',
  currentPrice: null,
  previousClose: null,
  dailyChange: null,
  dailyChangePercent: null,
  currency: 'INR',
  priceTimestamp: null,
  score,
  direction: 'BULLISH',
  confidence: 'MEDIUM',
  triggered_signals: [{ code: 'PRICE_ABOVE_SMA50', label: 'price is above SMA50', category: 'TECHNICAL' }],
  negative_signals: [],
  explanation: 'Bullish because price is above SMA50',
  generated_at: '2026-06-01T00:00:00.000Z',
  modelVersion: 'signal-engine-v3',
  source: 'signal-generation-engine',
  data_status: 'COMPLETE',
  auditStatus: 'CURRENT',
  dataQualityEligibility: {
    filterApplied: true,
    eligible: true,
    signalReadinessStatus: 'READY',
  },
  reliabilityTier: 'FULL',
});

/** Minimal market-data service mock for enrichSignals */
const marketDataMock = (ids: string[]) => ({
  getInstrumentsByIds: jest.fn().mockResolvedValue(
    ids.map(id => ({ id, symbol: `SYM_${id}`, currency: 'INR' }))
  ),
  getLatestPricesBySymbols: jest.fn().mockResolvedValue(
    ids.map(id => ({ symbol: `SYM_${id}`, adjusted_close: 100, date: '2026-06-01T00:00:00.000Z' }))
  ),
  listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [{ adjusted_close: 100 }, { adjusted_close: 95 }] }),
});

// ---------------------------------------------------------------------------
// 1. calibratedScore + status when calibration row exists
// ---------------------------------------------------------------------------

describe('enrichSignals — calibration overlay when row exists', () => {
  it('attaches calibratedScore, calibrationStatus=CALIBRATED, selectedHorizon from persisted row', async () => {
    const signal = baseSignal('inst-1', 72);

    const calibrationReader: CalibrationPersistedReader = {
      latestForInstruments: jest.fn().mockResolvedValue([
        {
          instrumentId: 'inst-1',
          calibratedScore: 68,
          calibratedDirection: 'BULLISH',
          overallEvaluatedSamples: 145,
          calibrationEvidence: { horizon: '20D' },
        },
      ]),
    };

    const service = new SignalGenerationEngineService(
      {} as any,
      marketDataMock(['inst-1']) as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
      undefined,
      undefined,
      null, // capitalPostureService off
      calibrationReader,
    );

    const [result] = await service.enrichSignals([signal]);

    expect(result.calibratedScore).toBe(68);
    expect(result.calibrationStatus).toBe('CALIBRATED');
    expect(result.calibrationHorizon).toBe('20D');
    expect(result.selectedHorizon).toBe('20D');
    expect(result.calibrationSampleSize).toBe(145);
    // Raw score must be preserved unchanged
    expect(result.score).toBe(72);
  });
});

// ---------------------------------------------------------------------------
// 2. UNAVAILABLE + raw score retained when no calibration row
// ---------------------------------------------------------------------------

describe('enrichSignals — calibration overlay when row absent', () => {
  it('sets calibrationStatus=UNAVAILABLE, calibratedScore=null, does NOT fabricate', async () => {
    const signal = baseSignal('inst-2', 65);

    const calibrationReader: CalibrationPersistedReader = {
      latestForInstruments: jest.fn().mockResolvedValue([
        // No row for inst-2
      ]),
    };

    const service = new SignalGenerationEngineService(
      {} as any,
      marketDataMock(['inst-2']) as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
      undefined,
      undefined,
      null,
      calibrationReader,
    );

    const [result] = await service.enrichSignals([signal]);

    expect(result.calibrationStatus).toBe('UNAVAILABLE');
    expect(result.calibratedScore).toBeNull();
    expect(result.calibrationHorizon).toBeNull();
    expect(result.selectedHorizon).toBeNull();
    expect(result.calibrationSampleSize).toBeNull();
    // Raw score must be preserved unchanged — no fabrication
    expect(result.score).toBe(65);
  });

  it('degrades gracefully when calibrationReader throws', async () => {
    const signal = baseSignal('inst-3', 58);

    const calibrationReader: CalibrationPersistedReader = {
      latestForInstruments: jest.fn().mockRejectedValue(new Error('DB connection failed')),
    };

    const service = new SignalGenerationEngineService(
      {} as any,
      marketDataMock(['inst-3']) as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
      undefined,
      undefined,
      null,
      calibrationReader,
    );

    const [result] = await service.enrichSignals([signal]);

    // Error is caught; calibration overlay shows UNAVAILABLE
    expect(result.calibrationStatus).toBe('UNAVAILABLE');
    expect(result.score).toBe(58);
  });
});

// ---------------------------------------------------------------------------
// 3. selectedHorizon is null when calibrationEvidence.horizon is absent
// ---------------------------------------------------------------------------

describe('enrichSignals — calibration row exists but no horizon evidence', () => {
  it('returns selectedHorizon=null when calibrationEvidence is absent from the row', async () => {
    const signal = baseSignal('inst-4', 80);

    const calibrationReader: CalibrationPersistedReader = {
      latestForInstruments: jest.fn().mockResolvedValue([
        {
          instrumentId: 'inst-4',
          calibratedScore: 77,
          calibratedDirection: 'BULLISH',
          overallEvaluatedSamples: 30,
          calibrationEvidence: null,  // horizon not recorded
        },
      ]),
    };

    const service = new SignalGenerationEngineService(
      {} as any,
      marketDataMock(['inst-4']) as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
      undefined,
      undefined,
      null,
      calibrationReader,
    );

    const [result] = await service.enrichSignals([signal]);

    expect(result.calibratedScore).toBe(77);
    expect(result.calibrationStatus).toBe('CALIBRATED');
    expect(result.selectedHorizon).toBeNull();
    expect(result.calibrationHorizon).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Raw score and default sort preserved (multiple signals)
// ---------------------------------------------------------------------------

describe('enrichSignals — raw score and sort unchanged', () => {
  it('raw score is unchanged and order follows the repository order (not calibratedScore)', async () => {
    // signals with differing raw scores; calibration would swap order if used for sort
    const s1 = baseSignal('inst-a', 80); // high raw, low calibrated
    const s2 = baseSignal('inst-b', 60); // lower raw, higher calibrated

    const calibrationReader: CalibrationPersistedReader = {
      latestForInstruments: jest.fn().mockResolvedValue([
        { instrumentId: 'inst-a', calibratedScore: 55, calibratedDirection: 'BULLISH', overallEvaluatedSamples: 50, calibrationEvidence: { horizon: '20D' } },
        { instrumentId: 'inst-b', calibratedScore: 75, calibratedDirection: 'BULLISH', overallEvaluatedSamples: 50, calibrationEvidence: { horizon: '20D' } },
      ]),
    };

    const service = new SignalGenerationEngineService(
      {} as any,
      marketDataMock(['inst-a', 'inst-b']) as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
      undefined,
      undefined,
      null,
      calibrationReader,
    );

    const results = await service.enrichSignals([s1, s2]);

    // Order is unchanged from input (repository order, not calibrated sort)
    expect(results[0].instrument_id).toBe('inst-a');
    expect(results[0].score).toBe(80);          // raw score preserved
    expect(results[0].calibratedScore).toBe(55); // calibrated shown separately

    expect(results[1].instrument_id).toBe('inst-b');
    expect(results[1].score).toBe(60);
    expect(results[1].calibratedScore).toBe(75);
  });
});

// ---------------------------------------------------------------------------
// 5. calibrationSampleSize from overallEvaluatedSamples
// ---------------------------------------------------------------------------

describe('enrichSignals — calibrationSampleSize', () => {
  it('populates calibrationSampleSize from overallEvaluatedSamples', async () => {
    const signal = baseSignal('inst-5', 70);

    const calibrationReader: CalibrationPersistedReader = {
      latestForInstruments: jest.fn().mockResolvedValue([
        {
          instrumentId: 'inst-5',
          calibratedScore: 67,
          calibratedDirection: 'BULLISH',
          overallEvaluatedSamples: 312,
          calibrationEvidence: { horizon: '5D' },
        },
      ]),
    };

    const service = new SignalGenerationEngineService(
      {} as any,
      marketDataMock(['inst-5']) as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
      undefined,
      undefined,
      null,
      calibrationReader,
    );

    const [result] = await service.enrichSignals([signal]);

    expect(result.calibrationSampleSize).toBe(312);
    expect(result.calibrationHorizon).toBe('5D');
    expect(result.selectedHorizon).toBe('5D');
  });

  it('calibrationSampleSize is null when overallEvaluatedSamples is absent', async () => {
    const signal = baseSignal('inst-6', 70);

    const calibrationReader: CalibrationPersistedReader = {
      latestForInstruments: jest.fn().mockResolvedValue([
        {
          instrumentId: 'inst-6',
          calibratedScore: 68,
          calibratedDirection: 'BULLISH',
          // overallEvaluatedSamples not present
          calibrationEvidence: { horizon: '20D' },
        },
      ]),
    };

    const service = new SignalGenerationEngineService(
      {} as any,
      marketDataMock(['inst-6']) as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
      undefined,
      undefined,
      null,
      calibrationReader,
    );

    const [result] = await service.enrichSignals([signal]);

    expect(result.calibrationSampleSize).toBeNull();
    expect(result.calibratedScore).toBe(68);
  });
});
