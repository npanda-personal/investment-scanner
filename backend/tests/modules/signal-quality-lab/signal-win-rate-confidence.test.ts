/// <reference types="@types/jest" />
/**
 * Tests for win-rate confidence flag (honest-labeling #48):
 *
 *   - ScorecardRow.winRateConfidence is computed from directionalSampleSize
 *   - Thresholds: HIGH >= 100, MEDIUM >= 30, LOW < 30, null when n = 0
 *   - Constants WIN_RATE_CONFIDENCE_HIGH_THRESHOLD and
 *     WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD are the single source of truth
 *   - The flag is additive READ-side only — no outcome-write path is touched
 *   - scorecard() and scorecardSummary() both carry confidence
 */

import { SignalQualityLabService } from '../../../src/modules/signal-quality-lab/signal-quality-lab.service';
import { SignalQualityLabRepository } from '../../../src/modules/signal-quality-lab/signal-quality-lab.repository';
import {
  WIN_RATE_CONFIDENCE_HIGH_THRESHOLD,
  WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD,
} from '../../../src/modules/signal-quality-lab/signal-quality-lab.types';
import type { ScorecardRow, ScorecardSummary } from '../../../src/modules/signal-quality-lab/signal-quality-lab.types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeRow = (directionalSampleSize: number, winRate: number | null = 0.55): ScorecardRow => ({
  horizon: '5D',
  groupKey: 'BULLISH',
  sampleSize: directionalSampleSize + 10,
  directionalSampleSize,
  winRate: directionalSampleSize > 0 ? winRate : null,
  winRateConfidence: null, // will be overwritten by service
  avgReturnPercent: 0.01,
  medianReturnPercent: 0.008,
  expectancy: 0.005,
  profitFactor: 1.3,
  avgMaxAdverseExcursion: -0.02,
  avgMaxFavorableExcursion: 0.03,
  bestReturnPercent: 0.15,
  worstReturnPercent: -0.10,
});

const makeSummary = (directionalSampleSize: number): ScorecardSummary => ({
  horizon: '5D',
  sampleSize: directionalSampleSize + 10,
  directionalSampleSize,
  winRate: directionalSampleSize > 0 ? 0.52 : null,
  winRateConfidence: null,
  avgReturnPercent: 0.008,
  medianReturnPercent: 0.005,
  expectancy: 0.004,
  profitFactor: 1.2,
  avgMaxAdverseExcursion: -0.022,
  avgMaxFavorableExcursion: 0.033,
  bestReturnPercent: 0.18,
  worstReturnPercent: -0.12,
});

function makeService(scorecardRows: ScorecardRow[] = [], summaryRows: ScorecardSummary[] = []) {
  const repoMock = {
    scorecard: jest.fn().mockResolvedValue(scorecardRows),
    scorecardSummary: jest.fn().mockResolvedValue(summaryRows),
  } as unknown as SignalQualityLabRepository;

  const service = new SignalQualityLabService(
    repoMock,
    { signalHistory: jest.fn().mockResolvedValue([]), signalHistoryCount: jest.fn().mockResolvedValue(0) } as any,
    {} as any,
    {} as any,
    {} as any,
  );

  return { service, repoMock };
}

// ---------------------------------------------------------------------------
// 1. Threshold constants
// ---------------------------------------------------------------------------

describe('Win-rate confidence threshold constants', () => {
  it('HIGH threshold is 100', () => {
    expect(WIN_RATE_CONFIDENCE_HIGH_THRESHOLD).toBe(100);
  });

  it('MEDIUM threshold is 30', () => {
    expect(WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD).toBe(30);
  });

  it('HIGH > MEDIUM (thresholds are correctly ordered)', () => {
    expect(WIN_RATE_CONFIDENCE_HIGH_THRESHOLD).toBeGreaterThan(WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD);
  });
});

// ---------------------------------------------------------------------------
// 2. Confidence classification per directionalSampleSize
// ---------------------------------------------------------------------------

describe('scorecard() winRateConfidence classification', () => {
  it('returns LOW for directionalSampleSize < MEDIUM threshold (e.g. 22)', async () => {
    const { service } = makeService([makeRow(22)], [makeSummary(22)]);
    const result = await service.scorecard({ minSampleSize: 0 });
    expect(result.rows[0].winRateConfidence).toBe('LOW');
  });

  it('returns LOW for directionalSampleSize = 1', async () => {
    const { service } = makeService([makeRow(1)], [makeSummary(1)]);
    const result = await service.scorecard({ minSampleSize: 0 });
    expect(result.rows[0].winRateConfidence).toBe('LOW');
  });

  it('returns LOW for directionalSampleSize = MEDIUM_THRESHOLD - 1 (29)', async () => {
    const { service } = makeService([makeRow(WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD - 1)], [makeSummary(1)]);
    const result = await service.scorecard({ minSampleSize: 0 });
    expect(result.rows[0].winRateConfidence).toBe('LOW');
  });

  it('returns MEDIUM for directionalSampleSize = MEDIUM_THRESHOLD (30)', async () => {
    const { service } = makeService([makeRow(WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD)], [makeSummary(30)]);
    const result = await service.scorecard({ minSampleSize: 0 });
    expect(result.rows[0].winRateConfidence).toBe('MEDIUM');
  });

  it('returns MEDIUM for directionalSampleSize = 55 (between thresholds)', async () => {
    const { service } = makeService([makeRow(55)], [makeSummary(55)]);
    const result = await service.scorecard({ minSampleSize: 0 });
    expect(result.rows[0].winRateConfidence).toBe('MEDIUM');
  });

  it('returns MEDIUM for directionalSampleSize = HIGH_THRESHOLD - 1 (99)', async () => {
    const { service } = makeService([makeRow(WIN_RATE_CONFIDENCE_HIGH_THRESHOLD - 1)], [makeSummary(1)]);
    const result = await service.scorecard({ minSampleSize: 0 });
    expect(result.rows[0].winRateConfidence).toBe('MEDIUM');
  });

  it('returns HIGH for directionalSampleSize = HIGH_THRESHOLD (100)', async () => {
    const { service } = makeService([makeRow(WIN_RATE_CONFIDENCE_HIGH_THRESHOLD)], [makeSummary(100)]);
    const result = await service.scorecard({ minSampleSize: 0 });
    expect(result.rows[0].winRateConfidence).toBe('HIGH');
  });

  it('returns HIGH for directionalSampleSize = 500', async () => {
    const { service } = makeService([makeRow(500)], [makeSummary(500)]);
    const result = await service.scorecard({ minSampleSize: 0 });
    expect(result.rows[0].winRateConfidence).toBe('HIGH');
  });

  it('returns null for directionalSampleSize = 0 (no directional data)', async () => {
    const { service } = makeService([makeRow(0)], [makeSummary(0)]);
    const result = await service.scorecard({ minSampleSize: 0 });
    expect(result.rows[0].winRateConfidence).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Summary rows also carry confidence
// ---------------------------------------------------------------------------

describe('scorecardSummary() winRateConfidence', () => {
  it('summary row carries HIGH confidence for large sample', async () => {
    const { service } = makeService([], [makeSummary(200)]);
    const result = await service.scorecardSummary({});
    expect(result[0].winRateConfidence).toBe('HIGH');
  });

  it('summary row carries LOW confidence for small sample', async () => {
    const { service } = makeService([], [makeSummary(15)]);
    const result = await service.scorecardSummary({});
    expect(result[0].winRateConfidence).toBe('LOW');
  });

  it('summary row carries null when no directional data', async () => {
    const { service } = makeService([], [makeSummary(0)]);
    const result = await service.scorecardSummary({});
    expect(result[0].winRateConfidence).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. scorecard() summary field also annotated
// ---------------------------------------------------------------------------

describe('scorecard() response.summary winRateConfidence', () => {
  it('summary within scorecard response carries confidence annotation', async () => {
    const { service } = makeService([makeRow(22)], [makeSummary(22)]);
    const result = await service.scorecard({ minSampleSize: 0 });
    expect(result.summary[0].winRateConfidence).toBe('LOW');
  });

  it('HIGH for large summary', async () => {
    const { service } = makeService([makeRow(200)], [makeSummary(200)]);
    const result = await service.scorecard({ minSampleSize: 0 });
    expect(result.summary[0].winRateConfidence).toBe('HIGH');
  });
});

// ---------------------------------------------------------------------------
// 5. Multiple rows with different confidence levels
// ---------------------------------------------------------------------------

describe('Multiple rows with mixed confidence levels', () => {
  it('each row gets its own confidence based on its directionalSampleSize', async () => {
    const rows = [
      makeRow(22),   // LOW
      makeRow(50),   // MEDIUM
      makeRow(150),  // HIGH
      makeRow(0),    // null
    ];
    const { service } = makeService(rows, [makeSummary(50)]);
    const result = await service.scorecard({ minSampleSize: 0 });

    const confidences = result.rows.map((r) => r.winRateConfidence);
    expect(confidences[0]).toBe('LOW');
    expect(confidences[1]).toBe('MEDIUM');
    expect(confidences[2]).toBe('HIGH');
    expect(confidences[3]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 6. Confidence is READ-side only — repository upsert is not touched
// ---------------------------------------------------------------------------

describe('winRateConfidence is READ-side only (no write-path change)', () => {
  it('repository.scorecard mock is called but upsertOutcomeBatch is never called', async () => {
    const repoMock = {
      scorecard: jest.fn().mockResolvedValue([makeRow(55)]),
      scorecardSummary: jest.fn().mockResolvedValue([makeSummary(55)]),
      upsertOutcomeBatch: jest.fn(),
    } as unknown as SignalQualityLabRepository;

    const service = new SignalQualityLabService(
      repoMock,
      { signalHistory: jest.fn().mockResolvedValue([]), signalHistoryCount: jest.fn().mockResolvedValue(0) } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.scorecard({ minSampleSize: 0 });

    expect(repoMock.scorecard).toHaveBeenCalledTimes(1);
    expect((repoMock as any).upsertOutcomeBatch).not.toHaveBeenCalled();
  });
});
