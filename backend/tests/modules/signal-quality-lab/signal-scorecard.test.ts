/// <reference types="@types/jest" />
/**
 * Unit tests for the Signal Track-Record Scorecard (Slice 2).
 *
 * The repository is fully mocked — no real DB is accessed.
 * Tests cover:
 *   - service shaping / delegation
 *   - direction-aware win-rate denominator semantics (NEUTRAL excluded)
 *   - minSampleSize filter applied by service
 *   - empty data → 200 with empty rows array
 *   - parseScorecardQuery validation
 *   - scorecard controller handler (200 shape, error fallback)
 *   - route registration
 */

import { SignalQualityLabService } from '../../../src/modules/signal-quality-lab/signal-quality-lab.service';
import { SignalQualityLabRepository } from '../../../src/modules/signal-quality-lab/signal-quality-lab.repository';
import { SignalQualityLabController } from '../../../src/modules/signal-quality-lab/signal-quality-lab.controller';
import { parseScorecardQuery } from '../../../src/modules/signal-quality-lab/signal-quality-lab.validation';
import { createSignalQualityLabRouter } from '../../../src/modules/signal-quality-lab';
import type { ScorecardRow, ScorecardSummary } from '../../../src/modules/signal-quality-lab/signal-quality-lab.types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeScorecardRow = (overrides: Partial<ScorecardRow> = {}): ScorecardRow => ({
  horizon: '5D',
  groupKey: 'BULLISH',
  sampleSize: 100,
  directionalSampleSize: 90,
  winRate: 0.533,
  winRateConfidence: 'LOW',
  avgReturnPercent: 0.012,
  medianReturnPercent: 0.008,
  expectancy: 0.006,
  profitFactor: 1.4,
  avgMaxAdverseExcursion: -0.02,
  avgMaxFavorableExcursion: 0.04,
  bestReturnPercent: 0.18,
  worstReturnPercent: -0.12,
  ...overrides,
});

const makeSummaryRow = (overrides: Partial<ScorecardSummary> = {}): ScorecardSummary => ({
  horizon: '5D',
  sampleSize: 200,
  directionalSampleSize: 180,
  winRate: 0.498,
  winRateConfidence: 'HIGH',
  avgReturnPercent: 0.005,
  medianReturnPercent: 0.003,
  expectancy: 0.002,
  profitFactor: 1.1,
  avgMaxAdverseExcursion: -0.025,
  avgMaxFavorableExcursion: 0.035,
  bestReturnPercent: 0.20,
  worstReturnPercent: -0.15,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Service tests (mocked repository)
// ---------------------------------------------------------------------------

function makeService(
  scorecardRows: ScorecardRow[] = [],
  summaryRows: ScorecardSummary[] = [],
) {
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

describe('ScorecardService', () => {

  it('defaults groupBy to "direction" when not supplied', async () => {
    const { service, repoMock } = makeService([makeScorecardRow()], [makeSummaryRow()]);

    const result = await service.scorecard({});

    expect(result.groupBy).toBe('direction');
    expect(repoMock.scorecard).toHaveBeenCalledWith(expect.objectContaining({ groupBy: 'direction' }));
  });

  it('passes groupBy=sector through to the repository', async () => {
    const { service, repoMock } = makeService([makeScorecardRow({ groupKey: 'Energy' })], [makeSummaryRow()]);

    const result = await service.scorecard({ groupBy: 'sector' });

    expect(result.groupBy).toBe('sector');
    expect(repoMock.scorecard).toHaveBeenCalledWith(expect.objectContaining({ groupBy: 'sector' }));
  });

  it('passes groupBy=scoreBucket through to the repository', async () => {
    const { service } = makeService([makeScorecardRow({ groupKey: '60-79' })], [makeSummaryRow()]);

    const result = await service.scorecard({ groupBy: 'scoreBucket' });

    expect(result.groupBy).toBe('scoreBucket');
  });

  it('echoes back the horizon filter in the response', async () => {
    const { service } = makeService([makeScorecardRow()], [makeSummaryRow()]);

    const result = await service.scorecard({ horizon: '5D' });

    expect(result.horizon).toBe('5D');
  });

  it('sets horizon=null in the response when no horizon filter is provided', async () => {
    const { service } = makeService([makeScorecardRow()], [makeSummaryRow()]);

    const result = await service.scorecard({});

    expect(result.horizon).toBeNull();
  });

  it('returns rows from the repository', async () => {
    const rows = [
      makeScorecardRow({ groupKey: 'BULLISH', winRate: 0.533 }),
      makeScorecardRow({ groupKey: 'BEARISH', winRate: 0.44 }),
    ];
    const { service } = makeService(rows, [makeSummaryRow()]);

    const result = await service.scorecard({ horizon: '5D' });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].winRate).toBeCloseTo(0.533);
    expect(result.rows[1].winRate).toBeCloseTo(0.44);
  });

  it('returns summary rows from the repository', async () => {
    const { service } = makeService([], [makeSummaryRow({ winRate: 0.498 })]);

    const result = await service.scorecard({ horizon: '5D' });

    expect(result.summary).toHaveLength(1);
    expect(result.summary[0].winRate).toBeCloseTo(0.498);
  });

  it('applies minSampleSize filter: excludes rows where directionalSampleSize < threshold', async () => {
    const rows = [
      makeScorecardRow({ groupKey: 'BULLISH', directionalSampleSize: 50 }),
      makeScorecardRow({ groupKey: 'BEARISH', directionalSampleSize: 5 }),
      makeScorecardRow({ groupKey: 'NEUTRAL', directionalSampleSize: 0 }),
    ];
    const { service } = makeService(rows, [makeSummaryRow()]);

    // The repo mock returns all rows; service post-filters
    const result = await service.scorecard({ minSampleSize: 10 });

    // Only BULLISH (50) passes threshold 10; BEARISH (5) and NEUTRAL (0) excluded
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].groupKey).toBe('BULLISH');
  });

  it('returns empty rows array (not error) when repo returns empty', async () => {
    const { service } = makeService([], []);

    const result = await service.scorecard({ horizon: '5D' });

    expect(result.rows).toEqual([]);
    expect(result.summary).toEqual([]);
  });

  it('win-rate denominator semantics: NEUTRAL rows excluded', async () => {
    // Simulate what the repo would return after SQL aggregation:
    // NEUTRAL row has directionalSampleSize=0, so winRate should be null
    const rows = [
      makeScorecardRow({ groupKey: 'NEUTRAL', directionalSampleSize: 0, winRate: null }),
    ];
    const { service } = makeService(rows, [makeSummaryRow()]);

    const result = await service.scorecard({ minSampleSize: 0 });

    const neutralRow = result.rows.find((r) => r.groupKey === 'NEUTRAL');
    expect(neutralRow).toBeDefined();
    expect(neutralRow!.winRate).toBeNull();
    expect(neutralRow!.directionalSampleSize).toBe(0);
  });

  it('minSampleSize defaults to 1 and filters rows with directionalSampleSize=0', async () => {
    const rows = [
      makeScorecardRow({ groupKey: 'BULLISH', directionalSampleSize: 10 }),
      makeScorecardRow({ groupKey: 'NEUTRAL', directionalSampleSize: 0 }),
    ];
    const { service } = makeService(rows, [makeSummaryRow()]);

    // Default minSampleSize=1 should filter out NEUTRAL
    const result = await service.scorecard({});

    expect(result.rows.map((r) => r.groupKey)).toEqual(['BULLISH']);
  });

  it('passes filter params (direction, sector, modelVersion, from, to) to the repository', async () => {
    const { service, repoMock } = makeService([], []);

    await service.scorecard({
      direction: 'BULLISH',
      sector: 'Technology',
      modelVersion: 'signal-engine-v1',
      from: '2025-01-01',
      to: '2025-12-31',
    });

    expect(repoMock.scorecard).toHaveBeenCalledWith(expect.objectContaining({
      direction: 'BULLISH',
      sector: 'Technology',
      modelVersion: 'signal-engine-v1',
      from: '2025-01-01',
      to: '2025-12-31',
    }));
  });

  it('scorecardSummary delegates directly to repository', async () => {
    const summaries = [makeSummaryRow({ horizon: '1D' }), makeSummaryRow({ horizon: '5D' })];
    const { service, repoMock } = makeService([], summaries);

    const result = await service.scorecardSummary({ horizon: '5D' });

    expect(result).toHaveLength(2);
    expect(repoMock.scorecardSummary).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Controller tests
// ---------------------------------------------------------------------------

function makeController(rows: ScorecardRow[] = [], summaryRows: ScorecardSummary[] = []) {
  const { service } = makeService(rows, summaryRows);
  const controller = new SignalQualityLabController(service as any);
  return controller;
}

function mockRes() {
  const res: any = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
}

describe('ScorecardController', () => {

  it('returns 200 with scorecard response shape on success', async () => {
    const controller = makeController(
      [makeScorecardRow({ groupKey: 'BULLISH', winRate: 0.533 })],
      [makeSummaryRow()],
    );
    const req: any = { query: { horizon: '5D', groupBy: 'direction' } };
    const res = mockRes();

    await controller.scorecard(req, res);

    expect(res.status).not.toHaveBeenCalled(); // No error status set
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      groupBy: 'direction',
      horizon: '5D',
      rows: expect.any(Array),
      summary: expect.any(Array),
    }));
  });

  it('returns 200 with empty rows array when no mature data exists', async () => {
    const controller = makeController([], []);
    const req: any = { query: { horizon: '5D' } };
    const res = mockRes();

    await controller.scorecard(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.rows).toEqual([]);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 500 with error message on service failure', async () => {
    const { service } = makeService();
    jest.spyOn(service, 'scorecard').mockRejectedValue(new Error('DB connection lost'));
    const controller = new SignalQualityLabController(service as any);
    const req: any = { query: {} };
    const res = mockRes();

    await controller.scorecard(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'DB connection lost' });
  });
});

// ---------------------------------------------------------------------------
// Route registration test
// ---------------------------------------------------------------------------

describe('scorecard route registration', () => {
  it('registers GET /signals/quality/scorecard', () => {
    const router = createSignalQualityLabRouter({
      dashboard: jest.fn(),
      summary: jest.fn(),
      byType: jest.fn(),
      bySector: jest.fn(),
      byScoreBucket: jest.fn(),
      byRegime: jest.fn(),
      byDataQuality: jest.fn(),
      noisy: jest.fn(),
      history: jest.fn(),
      outcomes: jest.fn(),
      recalculate: jest.fn(),
      scorecard: jest.fn(),
    } as any);

    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toContain('GET /signals/quality/scorecard');
  });
});

// ---------------------------------------------------------------------------
// parseScorecardQuery validation tests
// ---------------------------------------------------------------------------

describe('parseScorecardQuery', () => {
  it('defaults groupBy to direction and minSampleSize to 1', () => {
    const result = parseScorecardQuery({});
    expect(result.groupBy).toBe('direction');
    expect(result.minSampleSize).toBe(1);
  });

  it('accepts valid horizon values', () => {
    expect(parseScorecardQuery({ horizon: '5D' }).horizon).toBe('5D');
    expect(parseScorecardQuery({ horizon: '1D' }).horizon).toBe('1D');
    expect(parseScorecardQuery({ horizon: '60D' }).horizon).toBe('60D');
  });

  it('ignores invalid horizon and returns undefined', () => {
    expect(parseScorecardQuery({ horizon: 'INVALID' }).horizon).toBeUndefined();
    expect(parseScorecardQuery({ horizon: '3D' }).horizon).toBeUndefined();
  });

  it('accepts valid groupBy values', () => {
    expect(parseScorecardQuery({ groupBy: 'sector' }).groupBy).toBe('sector');
    expect(parseScorecardQuery({ groupBy: 'scoreBucket' }).groupBy).toBe('scoreBucket');
    expect(parseScorecardQuery({ groupBy: 'direction' }).groupBy).toBe('direction');
  });

  it('falls back to direction for invalid groupBy', () => {
    expect(parseScorecardQuery({ groupBy: 'regime' }).groupBy).toBe('direction');
    expect(parseScorecardQuery({ groupBy: '' }).groupBy).toBe('direction');
  });

  it('accepts valid direction filter', () => {
    expect(parseScorecardQuery({ direction: 'BULLISH' }).direction).toBe('BULLISH');
    expect(parseScorecardQuery({ direction: 'BEARISH' }).direction).toBe('BEARISH');
    expect(parseScorecardQuery({ direction: 'NEUTRAL' }).direction).toBe('NEUTRAL');
  });

  it('ignores invalid direction', () => {
    expect(parseScorecardQuery({ direction: 'SIDEWAYS' }).direction).toBeUndefined();
  });

  it('passes through sector and modelVersion', () => {
    const result = parseScorecardQuery({ sector: 'Technology', modelVersion: 'signal-engine-v1' });
    expect(result.sector).toBe('Technology');
    expect(result.modelVersion).toBe('signal-engine-v1');
  });

  it('clamps minSampleSize to non-negative integer', () => {
    expect(parseScorecardQuery({ minSampleSize: '10' }).minSampleSize).toBe(10);
    expect(parseScorecardQuery({ minSampleSize: '-5' }).minSampleSize).toBe(0);
    expect(parseScorecardQuery({ minSampleSize: 'abc' }).minSampleSize).toBe(1);
  });

  it('accepts valid from/to date strings', () => {
    const result = parseScorecardQuery({ from: '2025-01-01', to: '2025-12-31' });
    expect(result.from).toBe('2025-01-01');
    expect(result.to).toBe('2025-12-31');
  });

  it('ignores invalid date strings', () => {
    const result = parseScorecardQuery({ from: 'not-a-date', to: 'also-not' });
    expect(result.from).toBeUndefined();
    expect(result.to).toBeUndefined();
  });
});
