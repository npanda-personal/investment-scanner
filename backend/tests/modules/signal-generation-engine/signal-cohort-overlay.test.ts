/**
 * Tests for the historical cohort hit-rate overlay (#2).
 * Pure helpers + the attach function exercised with a fake reader (no DB).
 */
import {
  scoreBucketFor,
  winRateConfidenceFor,
  attachCohortMetrics,
  type QualityCohortReader,
  type CohortMetric,
} from '../../../src/modules/signal-generation-engine/signal-cohort-overlay';
import type { SignalResultDto } from '../../../src/modules/signal-generation-engine/signal-generation-engine.types';

const sig = (over: Partial<SignalResultDto> & { direction: any; score: number }): SignalResultDto =>
  ({ instrument_id: 'i', symbol: 'S', ...over } as any);

const readerOf = (rows: CohortMetric[], capture?: (q: any) => void): QualityCohortReader => ({
  async cohortHitRates(query) { capture?.(query); return rows; },
});

describe('scoreBucketFor — canonical boundaries', () => {
  it('maps scores to the shared 0-39 / 40-69 / 70-84 / 85-100 buckets', () => {
    expect(scoreBucketFor(0)).toBe('0-39');
    expect(scoreBucketFor(39)).toBe('0-39');
    expect(scoreBucketFor(40)).toBe('40-69');
    expect(scoreBucketFor(69)).toBe('40-69');
    expect(scoreBucketFor(70)).toBe('70-84');
    expect(scoreBucketFor(84)).toBe('70-84');
    expect(scoreBucketFor(85)).toBe('85-100');
    expect(scoreBucketFor(100)).toBe('85-100');
  });
  it('returns Unknown for non-finite scores', () => {
    expect(scoreBucketFor(null)).toBe('Unknown');
    expect(scoreBucketFor(undefined)).toBe('Unknown');
    expect(scoreBucketFor(NaN)).toBe('Unknown');
  });
});

describe('winRateConfidenceFor — sample-size thresholds', () => {
  it('HIGH >=100, MEDIUM >=30, LOW >0, null at 0/absent', () => {
    expect(winRateConfidenceFor(0)).toBeNull();
    expect(winRateConfidenceFor(null)).toBeNull();
    expect(winRateConfidenceFor(1)).toBe('LOW');
    expect(winRateConfidenceFor(29)).toBe('LOW');
    expect(winRateConfidenceFor(30)).toBe('MEDIUM');
    expect(winRateConfidenceFor(99)).toBe('MEDIUM');
    expect(winRateConfidenceFor(100)).toBe('HIGH');
  });
});

describe('attachCohortMetrics', () => {
  it('attaches the matching cohort metric by direction × score-bucket', async () => {
    const reader = readerOf([
      { direction: 'BULLISH', scoreBucket: '70-84', winRate: 0.58, directionalSampleSize: 210, avgReturnPercent: 3.2 },
    ]);
    const [out] = await attachCohortMetrics([sig({ direction: 'BULLISH', score: 75 })], { reader });
    expect(out.cohortWinRate).toBe(0.58);
    expect(out.cohortDirectionalSampleSize).toBe(210);
    expect(out.cohortAvgReturnPercent).toBe(3.2);
    expect(out.cohortMetricsHorizon).toBe('20D');
    expect(out.cohortWinRateConfidence).toBe('HIGH'); // 210 >= 100
  });

  it('leaves cohort fields null when the signal cohort has no mature outcomes', async () => {
    const reader = readerOf([
      { direction: 'BULLISH', scoreBucket: '70-84', winRate: 0.58, directionalSampleSize: 210, avgReturnPercent: 3.2 },
    ]);
    const [out] = await attachCohortMetrics([sig({ direction: 'BEARISH', score: 30 })], { reader });
    expect(out.cohortWinRate).toBeNull();
    expect(out.cohortDirectionalSampleSize).toBeNull();
    expect(out.cohortWinRateConfidence).toBeNull();
    expect(out.cohortMetricsHorizon).toBe('20D'); // horizon still reported
  });

  it('low-sample cohort reports LOW confidence (never overstates a tiny sample)', async () => {
    const reader = readerOf([
      { direction: 'BULLISH', scoreBucket: '85-100', winRate: 1.0, directionalSampleSize: 4, avgReturnPercent: 9 },
    ]);
    const [out] = await attachCohortMetrics([sig({ direction: 'BULLISH', score: 90 })], { reader });
    expect(out.cohortWinRate).toBe(1.0);
    expect(out.cohortWinRateConfidence).toBe('LOW'); // 4 directional samples
  });

  it('returns null cohort fields (graceful) when no reader is available', async () => {
    const [out] = await attachCohortMetrics([sig({ direction: 'BULLISH', score: 75 })], { reader: null });
    expect(out.cohortWinRate).toBeNull();
    expect(out.cohortMetricsHorizon).toBe('20D');
  });

  it('passes the served signals model version to the reader so v3/v4 outcomes are not pooled', async () => {
    let received: any = null;
    const reader = readerOf([], (q) => { received = q; });
    await attachCohortMetrics([sig({ direction: 'BULLISH', score: 75, modelVersion: 'signal-engine-v4' } as any)], { reader, horizon: '10D' });
    expect(received).toEqual({ horizon: '10D', modelVersion: 'signal-engine-v4', countries: undefined });
  });

  it('passes region-mapped countries to the reader for region stratification', async () => {
    let received: any = null;
    const reader = readerOf([], (q) => { received = q; });
    await attachCohortMetrics([sig({ direction: 'BULLISH', score: 75, modelVersion: 'signal-engine-v4' } as any)], { reader, region: 'IN' });
    expect(received.countries).toEqual(['India']);
  });

  it('passes undefined countries when region is omitted (global pooling)', async () => {
    let received: any = null;
    const reader = readerOf([], (q) => { received = q; });
    await attachCohortMetrics([sig({ direction: 'BULLISH', score: 75, modelVersion: 'signal-engine-v4' } as any)], { reader });
    expect(received.countries).toBeUndefined();
  });

  it('maps US region to United States country name', async () => {
    let received: any = null;
    const reader = readerOf([], (q) => { received = q; });
    await attachCohortMetrics([sig({ direction: 'BULLISH', score: 75 } as any)], { reader, region: 'US' });
    expect(received.countries).toEqual(['United States']);
  });

  it('maps EU region to full country names', async () => {
    let received: any = null;
    const reader = readerOf([], (q) => { received = q; });
    await attachCohortMetrics([sig({ direction: 'BULLISH', score: 75 } as any)], { reader, region: 'EU' });
    expect(received.countries).toEqual(expect.arrayContaining(['Germany', 'France', 'Italy']));
    expect(received.countries).toHaveLength(9);
  });

  it('returns [] for an empty signal list', async () => {
    expect(await attachCohortMetrics([], { reader: readerOf([]) })).toEqual([]);
  });
});
