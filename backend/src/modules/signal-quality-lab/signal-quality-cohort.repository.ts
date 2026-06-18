/**
 * signal-quality-cohort.repository.ts
 *
 * Focused persisted-read for per-COHORT historical hit-rate, used to annotate served
 * signals with "how signals like this resolved" (direction × score-bucket win-rate over
 * mature outcomes).  Kept as its own small repository (not folded into the >500-line
 * signal-quality-lab.repository.ts, which is shrink-only) and deliberately free of any
 * signalService dependency so signal-generation-engine can lazy-require it without an
 * import cycle.
 *
 * Reads only mature rows (`dataComplete = true`) from signal_outcomes — never recomputes.
 * Score buckets are the CANONICAL boundaries shared with signal-quality-lab.repository.ts
 * (`groupExpressions`) and the calibration engine: 0-39 / 40-69 / 70-84 / 85-100.
 */
import { PrismaClient } from '@prisma/client';
import prisma from '../../db/prisma';
import type { QualityHorizon } from './signal-quality-lab.types';

export interface CohortHitRateRow {
  direction: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  /** Canonical score bucket: '0-39' | '40-69' | '70-84' | '85-100' | 'Unknown'. */
  scoreBucket: string;
  horizon: QualityHorizon;
  /** Directional wins / directional sample; null when there are no directional rows. */
  winRate: number | null;
  /** BULLISH + BEARISH count (NEUTRAL excluded — win-rate is undefined for it). */
  directionalSampleSize: number;
  /** All rows incl. NEUTRAL. */
  sampleSize: number;
  /** Average forward return (%) across all rows in the cohort. */
  avgReturnPercent: number | null;
}

export interface CohortHitRateQuery {
  horizon: QualityHorizon;
  /** Restrict to a single engine model version (e.g. 'signal-engine-v4'). */
  modelVersion?: string;
}

/** CANONICAL score-bucket CASE — must match signal-quality-lab.repository.groupExpressions. */
const SCORE_BUCKET_CASE = `CASE
  WHEN score >= 0  AND score <= 39  THEN '0-39'
  WHEN score >= 40 AND score <= 69  THEN '40-69'
  WHEN score >= 70 AND score <= 84  THEN '70-84'
  WHEN score >= 85 AND score <= 100 THEN '85-100'
  ELSE 'Unknown'
END`;

export class SignalQualityCohortRepository {
  private readonly db: PrismaClient;

  constructor(db?: PrismaClient) {
    this.db = db ?? prisma;
  }

  /**
   * Win-rate / sample / avg-return for EVERY (direction × score-bucket) cohort within a
   * single horizon, over mature persisted outcomes.  One query; the caller indexes the
   * result by `${direction}:${scoreBucket}`.  Pooled across regions for the given model
   * version (region stratification is a follow-up — see module docs).
   *
   * Win = (BULLISH AND forwardReturn > 0) OR (BEARISH AND forwardReturn < 0); NEUTRAL rows
   * count toward sampleSize/avgReturn but never toward winRate/directionalSampleSize.
   */
  async cohortHitRates(query: CohortHitRateQuery): Promise<CohortHitRateRow[]> {
    // Inputs are validated enums/identifiers; reject anything that could break the literal.
    if (!/^[0-9A-Za-z]+$/.test(query.horizon)) throw new Error(`Invalid horizon: ${query.horizon}`);
    const modelFilter = query.modelVersion && /^[0-9A-Za-z._-]+$/.test(query.modelVersion)
      ? `AND "modelVersion" = '${query.modelVersion}'`
      : '';

    const sql = `
      SELECT
        direction,
        ${SCORE_BUCKET_CASE} AS score_bucket,
        COUNT(*)::int AS sample_size,
        COUNT(*) FILTER (WHERE direction IN ('BULLISH','BEARISH'))::int AS directional_sample,
        COUNT(*) FILTER (
          WHERE (direction = 'BULLISH' AND "forwardReturnPercent" > 0)
             OR (direction = 'BEARISH' AND "forwardReturnPercent" < 0)
        )::int AS wins,
        AVG("forwardReturnPercent") AS avg_return
      FROM signal_outcomes
      WHERE "dataComplete" = true
        AND horizon = '${query.horizon}'
        ${modelFilter}
      GROUP BY direction, score_bucket
    `;

    const rows = await this.db.$queryRawUnsafe<any[]>(sql);

    return rows.map((row) => {
      const directional = Number(row.directional_sample) || 0;
      const wins = Number(row.wins) || 0;
      return {
        direction: row.direction,
        scoreBucket: String(row.score_bucket ?? 'Unknown'),
        horizon: query.horizon,
        winRate: directional === 0 ? null : wins / directional,
        directionalSampleSize: directional,
        sampleSize: Number(row.sample_size) || 0,
        avgReturnPercent: row.avg_return !== null && row.avg_return !== undefined ? Number(row.avg_return) : null,
      };
    });
  }
}
