/**
 * signal-cohort-overlay.ts
 *
 * Attaches historical COHORT hit-rate to served signals — "how signals like this one
 * (same direction × score-bucket) have actually resolved over a horizon".  This turns a
 * bare 0-100 score into something a trader can sanity-check against realized outcomes.
 *
 * Persisted-read only: it reads the already-computed `signal_outcomes` aggregates via the
 * signal-quality-lab cohort repository and NEVER recomputes.  The reader is resolved by a
 * lazy `require` of that repository file (mirroring the CalibrationPersistedReader pattern)
 * so signal-generation-engine has no static import of signal-quality-lab — which itself
 * imports signal-generation-engine — avoiding a module import cycle.
 *
 * Pure helpers (`scoreBucketFor`, `winRateConfidenceFor`) plus one async attach function.
 */
import type { SignalResultDto, SignalWinRateConfidence } from './signal-generation-engine.types';

/** Default outcome horizon — matches the pipeline's persisted `signal_quality` horizon. */
export const DEFAULT_COHORT_HORIZON = '20D';

/** Directional-sample thresholds for the cohort win-rate confidence label. */
export const WIN_RATE_CONFIDENCE_HIGH = 100;
export const WIN_RATE_CONFIDENCE_MEDIUM = 30;

/**
 * CANONICAL score bucket for a composite score — must match the SQL CASE in
 * signal-quality-lab (groupExpressions / signal-quality-cohort.repository) and the
 * calibration engine: 0-39 / 40-69 / 70-84 / 85-100.
 */
export function scoreBucketFor(score: number | null | undefined): string {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'Unknown';
  if (score < 0) return 'Unknown'; // matches the SQL CASE (score >= 0) so cohort joins never diverge
  if (score <= 39) return '0-39';
  if (score <= 69) return '40-69';
  if (score <= 84) return '70-84';
  if (score <= 100) return '85-100';
  return 'Unknown';
}

/** Confidence label for a win-rate, from its directional sample size. */
export function winRateConfidenceFor(directionalSampleSize: number | null | undefined): SignalWinRateConfidence | null {
  const n = Number(directionalSampleSize);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= WIN_RATE_CONFIDENCE_HIGH) return 'HIGH';
  if (n >= WIN_RATE_CONFIDENCE_MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/** One cohort's metric (the shape this overlay needs from the reader). */
export interface CohortMetric {
  direction: string;
  scoreBucket: string;
  winRate: number | null;
  directionalSampleSize: number;
  avgReturnPercent: number | null;
}

/**
 * Persisted-read interface for cohort outcome aggregates.  Declared here (not imported from
 * signal-quality-lab) to avoid a static cross-module import cycle; the production reader is
 * resolved lazily in `resolveQualityCohortReader`.
 */
export interface QualityCohortReader {
  cohortHitRates(query: { horizon: string; modelVersion?: string; countries?: string[] }): Promise<CohortMetric[]>;
}

const REGION_TO_COUNTRIES: Record<string, string[]> = {
  IN: ['India'],
  US: ['United States'],
  EU: ['Austria', 'Belgium', 'Germany', 'Spain', 'Finland', 'France', 'Italy', 'Netherlands', 'Portugal'],
};

/** Return the canonical country list for a region, or undefined if the region has no mapping. */
export function countriesForRegion(region: string | undefined): string[] | undefined {
  return region ? REGION_TO_COUNTRIES[region] : undefined;
}

/** Lazy-resolve the production cohort reader without a static import cycle. */
export function resolveQualityCohortReader(): QualityCohortReader | null {
  try {
    const { SignalQualityCohortRepository } = require('../signal-quality-lab/signal-quality-cohort.repository') as typeof import('../signal-quality-lab/signal-quality-cohort.repository');
    return new SignalQualityCohortRepository();
  } catch {
    return null;
  }
}

const emptyCohort = (horizon: string) => ({
  cohortWinRate: null,
  cohortDirectionalSampleSize: null,
  cohortAvgReturnPercent: null,
  cohortMetricsHorizon: horizon,
  cohortWinRateConfidence: null,
});

/**
 * Return copies of `signals` with their historical cohort hit-rate attached.  Fetches all
 * (direction × score-bucket) cohorts for the horizon in ONE read, then indexes each signal.
 * Graceful by design: if the reader is unavailable, the read fails, or a signal's cohort has
 * no mature outcomes, the cohort fields are null (the UI shows "—" / a low-sample caveat).
 *
 * `modelVersion` defaults to the served signals' own model version so the cohort matches the
 * engine that produced the score (v3 vs v4 outcomes are not pooled).
 */
export async function attachCohortMetrics(
  signals: SignalResultDto[],
  opts: { reader?: QualityCohortReader | null; horizon?: string; modelVersion?: string; region?: string } = {},
): Promise<SignalResultDto[]> {
  if (signals.length === 0) return signals;
  const reader = opts.reader === undefined ? resolveQualityCohortReader() : opts.reader;
  const horizon = opts.horizon || DEFAULT_COHORT_HORIZON;
  if (!reader) return signals.map((s) => ({ ...s, ...emptyCohort(horizon) }));

  const modelVersion = opts.modelVersion ?? (signals[0] as any)?.modelVersion ?? (signals[0] as any)?.model_version ?? undefined;
  const countries = opts.region ? REGION_TO_COUNTRIES[opts.region] : undefined;

  let rows: CohortMetric[];
  try {
    rows = await reader.cohortHitRates({ horizon, modelVersion, countries });
  } catch {
    return signals.map((s) => ({ ...s, ...emptyCohort(horizon) }));
  }

  const byKey = new Map<string, CohortMetric>();
  for (const r of rows) byKey.set(`${r.direction}:${r.scoreBucket}`, r);

  return signals.map((s) => {
    const metric = byKey.get(`${s.direction}:${scoreBucketFor(s.score)}`);
    if (!metric) return { ...s, ...emptyCohort(horizon) };
    return {
      ...s,
      cohortWinRate: metric.winRate,
      cohortDirectionalSampleSize: metric.directionalSampleSize,
      cohortAvgReturnPercent: metric.avgReturnPercent,
      cohortMetricsHorizon: horizon,
      cohortWinRateConfidence: winRateConfidenceFor(metric.directionalSampleSize),
    };
  });
}
