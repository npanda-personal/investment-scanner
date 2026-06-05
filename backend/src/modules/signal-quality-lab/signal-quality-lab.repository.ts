import { PrismaClient } from '@prisma/client';
import prisma from '../../db/prisma';
import type { OutcomeBatchResult, PersistedOutcomeMetricsQuery, PersistedSignalTypeRow, QualityHorizon, ScorecardQuery, ScorecardRow, ScorecardSummary, SignalOutcomeUpsert } from './signal-quality-lab.types';

/** Maximum rows per Prisma transaction chunk (keeps individual txn fast). */
const UPSERT_CHUNK_SIZE = 200;

export class SignalQualityLabRepository {
  private readonly db: PrismaClient;

  constructor(db?: PrismaClient) {
    this.db = db ?? prisma;
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  /**
   * Upsert a batch of SignalOutcome rows, keyed on (signalResultId, horizon).
   * Re-running with updated values (e.g. after an adjustedClose recompute) is safe —
   * the previous values are overwritten.
   */
  async upsertOutcomeBatch(rows: SignalOutcomeUpsert[]): Promise<OutcomeBatchResult> {
    if (rows.length === 0) return { upserted: 0 };

    let upserted = 0;

    for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);

      await this.db.$transaction(
        chunk.map((row) =>
          this.db.signalOutcome.upsert({
            where: {
              signalResultId_horizon: {
                signalResultId: row.signalResultId,
                horizon: row.horizon,
              },
            },
            create: {
              signalResultId: row.signalResultId,
              instrumentId: row.instrumentId,
              symbol: row.symbol,
              direction: row.direction,
              score: row.score,
              sector: row.sector ?? null,
              country: row.country ?? null,
              modelVersion: row.modelVersion,
              signalGeneratedDate: row.signalGeneratedDate,
              horizon: row.horizon,
              dataComplete: row.dataComplete,
              priceAtSignal: row.priceAtSignal ?? null,
              futurePrice: row.futurePrice ?? null,
              windowEndDate: row.windowEndDate ?? null,
              forwardReturnPercent: row.forwardReturnPercent ?? null,
              maxFavorableExcursion: row.maxFavorableExcursion ?? null,
              maxAdverseExcursion: row.maxAdverseExcursion ?? null,
              maxDrawdownPercent: row.maxDrawdownPercent ?? null,
              // CB-8: benchmark return and alpha — written via raw SQL after batch to avoid
              // Prisma client type mismatch (client was generated before schema migration).
              evaluatedAt: row.evaluatedAt,
            },
            update: {
              // Overwrite all mutable fields — important for CA re-adjustment
              direction: row.direction,
              score: row.score,
              sector: row.sector ?? null,
              country: row.country ?? null,
              modelVersion: row.modelVersion,
              signalGeneratedDate: row.signalGeneratedDate,
              dataComplete: row.dataComplete,
              priceAtSignal: row.priceAtSignal ?? null,
              futurePrice: row.futurePrice ?? null,
              windowEndDate: row.windowEndDate ?? null,
              forwardReturnPercent: row.forwardReturnPercent ?? null,
              maxFavorableExcursion: row.maxFavorableExcursion ?? null,
              maxAdverseExcursion: row.maxAdverseExcursion ?? null,
              maxDrawdownPercent: row.maxDrawdownPercent ?? null,
              evaluatedAt: row.evaluatedAt,
            },
          })
        )
      );

      upserted += chunk.length;

      // CB-8: write benchmarkReturnPercent and alphaPercent via raw SQL.
      // These columns were added after the Prisma client was last generated,
      // so they are not in the typed schema — raw UPDATE is the safe path.
      const benchmarkRows = chunk.filter(
        (r) => r.benchmarkReturnPercent !== null || r.alphaPercent !== null
      );
      if (benchmarkRows.length > 0) {
        for (const r of benchmarkRows) {
          await this.db.$executeRawUnsafe(
            `UPDATE signal_outcomes
             SET "benchmarkReturnPercent" = $1,
                 "alphaPercent"           = $2
             WHERE "signalResultId" = $3
               AND horizon = $4`,
            r.benchmarkReturnPercent ?? null,
            r.alphaPercent ?? null,
            r.signalResultId,
            r.horizon,
          );
        }
      }
    }

    return { upserted };
  }

  /**
   * Invalidate persisted outcomes for a set of instruments after their
   * adjustedClose prices have been re-derived (e.g. a corporate-action
   * back-adjustment recompute). forwardReturnPercent / futurePrice AND the
   * excursion fields (maxFavorableExcursion / maxAdverseExcursion /
   * maxDrawdownPercent) are all computed from adjustedClose, so previously-
   * mature rows are now stale.
   *
   * Marks every dataComplete=true row for these instruments as stale:
   *   - dataComplete         → false
   *   - forwardReturnPercent  → null
   *   - futurePrice           → null
   *   - maxFavorableExcursion → null
   *   - maxAdverseExcursion   → null
   *   - maxDrawdownPercent    → null
   *
   * `windowEndDate` is intentionally left intact so the maturity sweep
   * (findImmatureMatured) re-detects these rows as matured-and-ready and the
   * next recalculate({ persistOutcomes: true }) overwrites them with fresh
   * values. Returns the number of rows invalidated.
   */
  async markStaleByInstrumentIds(instrumentIds: string[]): Promise<number> {
    const ids = [...new Set(instrumentIds.map((id) => String(id || '').trim()).filter(Boolean))];
    if (ids.length === 0) return 0;

    const result = await this.db.signalOutcome.updateMany({
      where: {
        instrumentId: { in: ids },
        dataComplete: true,
      },
      data: {
        dataComplete: false,
        forwardReturnPercent: null,
        futurePrice: null,
        maxFavorableExcursion: null,
        maxAdverseExcursion: null,
        maxDrawdownPercent: null,
      },
    });

    return result.count;
  }

  /**
   * Window-intersection staleness marking.
   *
   * When a corporate-action recompute touches adjustedClose prices on or after
   * `fromDate`, only SignalOutcome rows whose forward-return window **overlaps**
   * that re-adjusted date range are stale. A row's window is:
   *
   *   [signalGeneratedDate,  signalGeneratedDate + MAX_HORIZON_DAYS (60)]
   *
   * For the window to overlap [fromDate, ∞) we need:
   *
   *   signalGeneratedDate + MAX_HORIZON_DAYS >= fromDate
   *   ⟺  signalGeneratedDate >= fromDate − MAX_HORIZON_DAYS
   *
   * Rows with signalGeneratedDate strictly before (fromDate − 60 days) cannot
   * be affected: their entire price window pre-dates the re-adjustment.
   *
   * Returns the number of rows invalidated.
   */
  async markStaleByInstrumentsFromDate(instrumentIds: string[], fromDate: Date): Promise<number> {
    const ids = [...new Set(instrumentIds.map((id) => String(id || '').trim()).filter(Boolean))];
    if (ids.length === 0) return 0;

    // Fix 4: 60 trading-day horizon ≈ 84 calendar days.  Using 60 calendar days
    // would miss signals whose window overlaps [fromDate-84d, fromDate-60d].
    // Use 90 calendar days as a safe buffer (rounds up the worst-case ~85 cal days).
    const MAX_HORIZON_CALENDAR_DAYS = 90;
    const earliestAffectedDate = new Date(fromDate.getTime() - MAX_HORIZON_CALENDAR_DAYS * 24 * 60 * 60 * 1000);

    const result = await this.db.signalOutcome.updateMany({
      where: {
        instrumentId: { in: ids },
        dataComplete: true,
        signalGeneratedDate: { gte: earliestAffectedDate },
      },
      data: {
        dataComplete: false,
        forwardReturnPercent: null,
        futurePrice: null,
        maxFavorableExcursion: null,
        maxAdverseExcursion: null,
        maxDrawdownPercent: null,
      },
    });

    return result.count;
  }

  /**
   * Return the distinct instrumentIds that currently have at least one stale
   * (dataComplete=false) outcome row with a windowEndDate in the past — i.e.
   * outcomes that should have been evaluated by now but have not been.
   *
   * Used by the ops refresh script to enumerate work that needs doing.
   *
   * @param limit Maximum number of distinct instrumentIds to return (default 500).
   */
  async findStaleOutcomeInstrumentIds(limit = 500): Promise<string[]> {
    const now = new Date();
    const rows = await this.db.signalOutcome.findMany({
      where: {
        dataComplete: false,
        windowEndDate: { not: null, lte: now },
      },
      select: { instrumentId: true },
      distinct: ['instrumentId'],
      take: limit,
      orderBy: { windowEndDate: 'asc' },
    });
    return rows.map((row) => row.instrumentId);
  }

  // ---------------------------------------------------------------------------
  // Read / diagnostic helpers
  // ---------------------------------------------------------------------------

  /** Count mature (dataComplete=true) rows for a given horizon since an optional date, optionally filtered to a modelVersion. */
  async countMatureByHorizon(horizon: QualityHorizon, since?: Date, modelVersion?: string): Promise<number> {
    return this.db.signalOutcome.count({
      where: {
        horizon,
        dataComplete: true,
        ...(since ? { evaluatedAt: { gte: since } } : {}),
        ...(modelVersion ? { modelVersion } : {}),
      },
    });
  }

  /**
   * Find immature rows whose window end date has now passed — i.e. outcomes
   * that can be promoted to dataComplete=true in a maturity sweep.
   */
  async findImmatureMatured(limit = 500): Promise<Array<{ id: string; signalResultId: string; horizon: string }>> {
    const now = new Date();
    return this.db.signalOutcome.findMany({
      where: {
        dataComplete: false,
        windowEndDate: { not: null, lte: now },
      },
      select: { id: true, signalResultId: true, horizon: true },
      take: limit,
      orderBy: { windowEndDate: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Scorecard aggregates (Slice 2)
  // ---------------------------------------------------------------------------

  /**
   * Compute scorecard rows grouped by `horizon × groupBy`.
   *
   * All metrics are computed in SQL over `signal_outcomes` WHERE `dataComplete = true`.
   * Win-rate semantics:
   *   - denominator = BULLISH + BEARISH rows (NEUTRAL excluded)
   *   - a "win" = BULLISH row with forwardReturnPercent > 0 OR BEARISH row with forwardReturnPercent < 0
   * NEUTRAL rows ARE included in sampleSize / avgReturnPercent / excursion averages,
   * but excluded from winRate/directionalSampleSize/expectancy/profitFactor.
   */
  async scorecard(query: ScorecardQuery): Promise<ScorecardRow[]> {
    const { groupExpr, labelExpr } = this.groupExpressions(query.groupBy ?? 'direction');
    const whereClause = this.buildWhereClause(query);
    const havingClause = this.buildHavingClause(query);

    const sql = `
      WITH base AS (
        SELECT
          horizon,
          direction,
          "forwardReturnPercent",
          "maxAdverseExcursion",
          "maxFavorableExcursion",
          "alphaPercent",
          ${groupExpr} AS group_key
        FROM signal_outcomes
        WHERE "dataComplete" = true
          ${whereClause}
      ),
      directional AS (
        SELECT
          horizon,
          group_key,
          COUNT(*) FILTER (WHERE direction IN ('BULLISH', 'BEARISH')) AS directional_sample,
          COUNT(*) FILTER (
            WHERE (direction = 'BULLISH' AND "forwardReturnPercent" > 0)
               OR (direction = 'BEARISH' AND "forwardReturnPercent" < 0)
          ) AS wins,
          SUM("forwardReturnPercent") FILTER (WHERE direction IN ('BULLISH','BEARISH') AND "forwardReturnPercent" > 0) AS sum_positive,
          SUM("forwardReturnPercent") FILTER (WHERE direction IN ('BULLISH','BEARISH') AND "forwardReturnPercent" < 0) AS sum_negative,
          -- Avg win (positive returns over directional rows)
          AVG("forwardReturnPercent") FILTER (WHERE direction IN ('BULLISH','BEARISH') AND "forwardReturnPercent" > 0) AS avg_win,
          -- Avg loss (negative returns over directional rows)
          AVG("forwardReturnPercent") FILTER (WHERE direction IN ('BULLISH','BEARISH') AND "forwardReturnPercent" < 0) AS avg_loss
        FROM base
        GROUP BY horizon, group_key
      ),
      aggregated AS (
        SELECT
          b.horizon,
          b.group_key,
          COUNT(*) AS sample_size,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY b."forwardReturnPercent") AS median_return,
          AVG(b."forwardReturnPercent") AS avg_return,
          AVG(b."maxAdverseExcursion") AS avg_mae,
          AVG(b."maxFavorableExcursion") AS avg_mfe,
          MAX(b."forwardReturnPercent") AS best_return,
          MIN(b."forwardReturnPercent") AS worst_return,
          -- CB-8: avg alpha over rows where alphaPercent is populated
          AVG(b."alphaPercent") AS avg_alpha
        FROM base b
        GROUP BY b.horizon, b.group_key
      )
      SELECT
        a.horizon,
        ${labelExpr} AS group_key,
        a.sample_size::int AS sample_size,
        COALESCE(d.directional_sample, 0)::int AS directional_sample_size,
        -- win_rate: wins / directional_sample; null when denominator = 0
        CASE WHEN COALESCE(d.directional_sample, 0) = 0 THEN NULL
             ELSE ROUND((d.wins::numeric / d.directional_sample::numeric), 6)
        END AS win_rate,
        ROUND(a.avg_return::numeric, 6) AS avg_return_percent,
        ROUND(a.median_return::numeric, 6) AS median_return_percent,
        -- expectancy = winRate * avgWin + (1 - winRate) * avgLoss   (all over directional rows)
        CASE WHEN COALESCE(d.directional_sample, 0) = 0 THEN NULL
             ELSE ROUND(
               (
                 (d.wins::numeric / d.directional_sample::numeric) * COALESCE(d.avg_win, 0)
                 + (1.0 - d.wins::numeric / d.directional_sample::numeric) * COALESCE(d.avg_loss, 0)
               )::numeric, 6)
        END AS expectancy,
        -- profit_factor = sum_positive / |sum_negative|; null when no negatives
        CASE WHEN COALESCE(d.sum_negative, 0) = 0 THEN NULL
             ELSE ROUND((d.sum_positive / ABS(d.sum_negative))::numeric, 4)
        END AS profit_factor,
        ROUND(a.avg_mae::numeric, 6) AS avg_max_adverse_excursion,
        ROUND(a.avg_mfe::numeric, 6) AS avg_max_favorable_excursion,
        ROUND(a.best_return::numeric, 6) AS best_return_percent,
        ROUND(a.worst_return::numeric, 6) AS worst_return_percent,
        -- CB-8: avg alpha (null when no rows have benchmark data yet)
        ROUND(a.avg_alpha::numeric, 6) AS avg_alpha_percent
      FROM aggregated a
      LEFT JOIN directional d ON a.horizon = d.horizon AND a.group_key = d.group_key
      ${havingClause}
      ORDER BY a.horizon, a.group_key
    `;

    const rows = await this.db.$queryRawUnsafe<any[]>(sql);

    return rows.map((row) => ({
      horizon: row.horizon as QualityHorizon,
      groupKey: String(row.group_key ?? ''),
      sampleSize: Number(row.sample_size),
      directionalSampleSize: Number(row.directional_sample_size),
      winRate: row.win_rate !== null && row.win_rate !== undefined ? Number(row.win_rate) : null,
      // winRateConfidence is a READ-side computed label — set to null here;
      // the service layer injects the correct value after this mapping.
      winRateConfidence: null,
      avgReturnPercent: row.avg_return_percent !== null && row.avg_return_percent !== undefined ? Number(row.avg_return_percent) : null,
      medianReturnPercent: row.median_return_percent !== null && row.median_return_percent !== undefined ? Number(row.median_return_percent) : null,
      expectancy: row.expectancy !== null && row.expectancy !== undefined ? Number(row.expectancy) : null,
      profitFactor: row.profit_factor !== null && row.profit_factor !== undefined ? Number(row.profit_factor) : null,
      avgMaxAdverseExcursion: row.avg_max_adverse_excursion !== null && row.avg_max_adverse_excursion !== undefined ? Number(row.avg_max_adverse_excursion) : null,
      avgMaxFavorableExcursion: row.avg_max_favorable_excursion !== null && row.avg_max_favorable_excursion !== undefined ? Number(row.avg_max_favorable_excursion) : null,
      bestReturnPercent: row.best_return_percent !== null && row.best_return_percent !== undefined ? Number(row.best_return_percent) : null,
      worstReturnPercent: row.worst_return_percent !== null && row.worst_return_percent !== undefined ? Number(row.worst_return_percent) : null,
      avgAlphaPercent: row.avg_alpha_percent !== null && row.avg_alpha_percent !== undefined ? Number(row.avg_alpha_percent) : null,
    }));
  }

  /**
   * Overall scorecard stats per horizon (no secondary group-by dimension).
   * Uses the same WHERE filters as `scorecard()` but groups by horizon only.
   */
  async scorecardSummary(query: ScorecardQuery): Promise<ScorecardSummary[]> {
    const whereClause = this.buildWhereClause(query);

    const sql = `
      WITH base AS (
        SELECT
          horizon,
          direction,
          "forwardReturnPercent",
          "maxAdverseExcursion",
          "maxFavorableExcursion"
        FROM signal_outcomes
        WHERE "dataComplete" = true
          ${whereClause}
      ),
      directional AS (
        SELECT
          horizon,
          COUNT(*) FILTER (WHERE direction IN ('BULLISH', 'BEARISH')) AS directional_sample,
          COUNT(*) FILTER (
            WHERE (direction = 'BULLISH' AND "forwardReturnPercent" > 0)
               OR (direction = 'BEARISH' AND "forwardReturnPercent" < 0)
          ) AS wins,
          SUM("forwardReturnPercent") FILTER (WHERE direction IN ('BULLISH','BEARISH') AND "forwardReturnPercent" > 0) AS sum_positive,
          SUM("forwardReturnPercent") FILTER (WHERE direction IN ('BULLISH','BEARISH') AND "forwardReturnPercent" < 0) AS sum_negative,
          AVG("forwardReturnPercent") FILTER (WHERE direction IN ('BULLISH','BEARISH') AND "forwardReturnPercent" > 0) AS avg_win,
          AVG("forwardReturnPercent") FILTER (WHERE direction IN ('BULLISH','BEARISH') AND "forwardReturnPercent" < 0) AS avg_loss
        FROM base
        GROUP BY horizon
      ),
      aggregated AS (
        SELECT
          horizon,
          COUNT(*) AS sample_size,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "forwardReturnPercent") AS median_return,
          AVG("forwardReturnPercent") AS avg_return,
          AVG("maxAdverseExcursion") AS avg_mae,
          AVG("maxFavorableExcursion") AS avg_mfe,
          MAX("forwardReturnPercent") AS best_return,
          MIN("forwardReturnPercent") AS worst_return
        FROM base
        GROUP BY horizon
      )
      SELECT
        a.horizon,
        a.sample_size::int AS sample_size,
        COALESCE(d.directional_sample, 0)::int AS directional_sample_size,
        CASE WHEN COALESCE(d.directional_sample, 0) = 0 THEN NULL
             ELSE ROUND((d.wins::numeric / d.directional_sample::numeric), 6)
        END AS win_rate,
        ROUND(a.avg_return::numeric, 6) AS avg_return_percent,
        ROUND(a.median_return::numeric, 6) AS median_return_percent,
        CASE WHEN COALESCE(d.directional_sample, 0) = 0 THEN NULL
             ELSE ROUND(
               (
                 (d.wins::numeric / d.directional_sample::numeric) * COALESCE(d.avg_win, 0)
                 + (1.0 - d.wins::numeric / d.directional_sample::numeric) * COALESCE(d.avg_loss, 0)
               )::numeric, 6)
        END AS expectancy,
        CASE WHEN COALESCE(d.sum_negative, 0) = 0 THEN NULL
             ELSE ROUND((d.sum_positive / ABS(d.sum_negative))::numeric, 4)
        END AS profit_factor,
        ROUND(a.avg_mae::numeric, 6) AS avg_max_adverse_excursion,
        ROUND(a.avg_mfe::numeric, 6) AS avg_max_favorable_excursion,
        ROUND(a.best_return::numeric, 6) AS best_return_percent,
        ROUND(a.worst_return::numeric, 6) AS worst_return_percent
      FROM aggregated a
      LEFT JOIN directional d ON a.horizon = d.horizon
      ORDER BY a.horizon
    `;

    const rows = await this.db.$queryRawUnsafe<any[]>(sql);

    return rows.map((row) => ({
      horizon: row.horizon as QualityHorizon,
      sampleSize: Number(row.sample_size),
      directionalSampleSize: Number(row.directional_sample_size),
      winRate: row.win_rate !== null && row.win_rate !== undefined ? Number(row.win_rate) : null,
      // winRateConfidence is a READ-side computed label — set to null here;
      // the service layer injects the correct value after this mapping.
      winRateConfidence: null,
      avgReturnPercent: row.avg_return_percent !== null && row.avg_return_percent !== undefined ? Number(row.avg_return_percent) : null,
      medianReturnPercent: row.median_return_percent !== null && row.median_return_percent !== undefined ? Number(row.median_return_percent) : null,
      expectancy: row.expectancy !== null && row.expectancy !== undefined ? Number(row.expectancy) : null,
      profitFactor: row.profit_factor !== null && row.profit_factor !== undefined ? Number(row.profit_factor) : null,
      avgMaxAdverseExcursion: row.avg_max_adverse_excursion !== null && row.avg_max_adverse_excursion !== undefined ? Number(row.avg_max_adverse_excursion) : null,
      avgMaxFavorableExcursion: row.avg_max_favorable_excursion !== null && row.avg_max_favorable_excursion !== undefined ? Number(row.avg_max_favorable_excursion) : null,
      bestReturnPercent: row.best_return_percent !== null && row.best_return_percent !== undefined ? Number(row.best_return_percent) : null,
      worstReturnPercent: row.worst_return_percent !== null && row.worst_return_percent !== undefined ? Number(row.worst_return_percent) : null,
      avgAlphaPercent: null, // scorecardSummary SQL does not SELECT avg_alpha — populated null here; service layer may enrich if needed
    }));
  }

  // ---------------------------------------------------------------------------
  // Private SQL-building helpers
  // ---------------------------------------------------------------------------

  private groupExpressions(groupBy: 'direction' | 'sector' | 'scoreBucket' | 'calibrationScoreBucket'): { groupExpr: string; labelExpr: string } {
    switch (groupBy) {
      case 'direction':
        return { groupExpr: 'direction', labelExpr: 'a.group_key' };
      case 'sector':
        return { groupExpr: "COALESCE(sector, 'Unknown')", labelExpr: 'a.group_key' };
      case 'scoreBucket':
        // Fix 5: CANONICAL score-bucket boundaries (same as calibration engine + service SCORE_BUCKETS).
        // Previously this case used 40-59/60-79/80-100, which differed from the service (40-69/70-84/85-100)
        // and calibrationScoreBucket (already correct below).  Unified to 0-39/40-69/70-84/85-100.
        return {
          groupExpr: `CASE
            WHEN score >= 0  AND score <= 39  THEN '0-39'
            WHEN score >= 40 AND score <= 69  THEN '40-69'
            WHEN score >= 70 AND score <= 84  THEN '70-84'
            WHEN score >= 85 AND score <= 100 THEN '85-100'
            ELSE 'Unknown'
          END`,
          labelExpr: 'a.group_key',
        };
      case 'calibrationScoreBucket':
        // Matches the scoreBucket() logic in SignalCalibrationEngineService:
        //   score < 40  → '0-39'
        //   score < 70  → '40-69'
        //   score < 85  → '70-84'
        //   otherwise   → '85-100'
        return {
          groupExpr: `CASE
            WHEN score >= 0  AND score <= 39  THEN '0-39'
            WHEN score >= 40 AND score <= 69  THEN '40-69'
            WHEN score >= 70 AND score <= 84  THEN '70-84'
            WHEN score >= 85 AND score <= 100 THEN '85-100'
            ELSE 'Unknown'
          END`,
          labelExpr: 'a.group_key',
        };
    }
  }

  private buildWhereClause(query: ScorecardQuery): string {
    const parts: string[] = [];

    if (query.horizon) {
      parts.push(`AND horizon = '${this.escapeString(query.horizon)}'`);
    }
    if (query.direction) {
      parts.push(`AND direction = '${this.escapeString(query.direction)}'`);
    }
    if (query.sector) {
      parts.push(`AND sector = '${this.escapeString(query.sector)}'`);
    }
    if (query.modelVersion) {
      parts.push(`AND "modelVersion" = '${this.escapeString(query.modelVersion)}'`);
    }
    if (query.from) {
      parts.push(`AND "signalGeneratedDate" >= '${this.escapeString(query.from)}'::timestamptz`);
    }
    if (query.to) {
      parts.push(`AND "signalGeneratedDate" <= '${this.escapeString(query.to)}'::timestamptz`);
    }

    return parts.join('\n          ');
  }

  private buildHavingClause(query: ScorecardQuery): string {
    const minSample = Number(query.minSampleSize ?? 1);
    if (!Number.isFinite(minSample) || minSample <= 0) return '';
    // Filter on directional_sample_size in the outer query using a WHERE on d.directional_sample
    // We use a HAVING-style WHERE applied after the join
    return `WHERE COALESCE(d.directional_sample, 0) >= ${Math.trunc(minSample)}`;
  }

  /**
   * Minimal SQL string escaping: reject any value containing a single-quote
   * or suspicious characters. For filter values that come from validated
   * inputs (horizon/direction enum, ISO date, alphanumeric modelVersion)
   * this is sufficient; the real guard is the caller (service/validation).
   */
  private escapeString(value: string): string {
    // Reject anything that would break the literal; throw so callers get a
    // clear error rather than a potentially wrong query.
    if (/['\\;]/.test(value)) {
      throw new Error(`Invalid filter value for SQL literal: "${value}"`);
    }
    return value;
  }

  // ---------------------------------------------------------------------------
  // Persisted signal-type metrics (Slice 3)
  // ---------------------------------------------------------------------------

  /**
   * Aggregate persisted signal_outcomes by signal-type code, joining to
   * signal_results to expand the triggeredSignals JSON array.
   *
   * Win-rate semantics (matches scorecard):
   *   - denominator = BULLISH + BEARISH rows (NEUTRAL excluded)
   *   - win = BULLISH row with forwardReturnPercent > 0 OR BEARISH row < 0
   *
   * Only dataComplete = true rows are included.
   */
  async signalTypeMetricsFromPersistedOutcomes(query: PersistedOutcomeMetricsQuery): Promise<PersistedSignalTypeRow[]> {
    const whereParts: string[] = [`so."dataComplete" = true`];

    if (query.horizon) {
      whereParts.push(`so.horizon = '${this.escapeString(query.horizon)}'`);
    }
    if (query.modelVersion) {
      whereParts.push(`so."modelVersion" = '${this.escapeString(query.modelVersion)}'`);
    }

    const whereClause = whereParts.join(' AND ');

    const sql = `
      WITH expanded AS (
        SELECT
          so.horizon,
          so.direction,
          so."forwardReturnPercent",
          (ts_item->>'code') AS signal_type_code
        FROM signal_outcomes so
        JOIN signal_results sr ON sr.id = so."signalResultId"
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(sr."triggeredSignals") = 'array'
               THEN sr."triggeredSignals"
               ELSE '[]'::jsonb
          END
        ) AS ts_item
        WHERE ${whereClause}
      ),
      directional AS (
        SELECT
          horizon,
          signal_type_code,
          COUNT(*) FILTER (WHERE direction IN ('BULLISH','BEARISH')) AS directional_sample,
          COUNT(*) FILTER (
            WHERE (direction = 'BULLISH' AND "forwardReturnPercent" > 0)
               OR (direction = 'BEARISH' AND "forwardReturnPercent" < 0)
          ) AS wins
        FROM expanded
        GROUP BY horizon, signal_type_code
      ),
      aggregated AS (
        SELECT
          horizon,
          signal_type_code,
          COUNT(*) AS sample_size,
          AVG("forwardReturnPercent") AS avg_return
        FROM expanded
        GROUP BY horizon, signal_type_code
      )
      SELECT
        a.horizon,
        a.signal_type_code,
        a.sample_size::int AS sample_size,
        COALESCE(d.directional_sample, 0)::int AS directional_sample_size,
        CASE WHEN COALESCE(d.directional_sample, 0) = 0 THEN NULL
             ELSE ROUND((d.wins::numeric / d.directional_sample::numeric), 6)
        END AS win_rate,
        ROUND(a.avg_return::numeric, 6) AS avg_return_percent
      FROM aggregated a
      LEFT JOIN directional d ON a.horizon = d.horizon AND a.signal_type_code = d.signal_type_code
      ORDER BY a.horizon, a.signal_type_code
    `;

    const rows = await this.db.$queryRawUnsafe<any[]>(sql);

    return rows.map((row) => ({
      horizon: row.horizon as QualityHorizon,
      signalTypeCode: String(row.signal_type_code ?? ''),
      sampleSize: Number(row.sample_size),
      directionalSampleSize: Number(row.directional_sample_size),
      winRate: row.win_rate !== null && row.win_rate !== undefined ? Number(row.win_rate) : null,
      avgReturnPercent: row.avg_return_percent !== null && row.avg_return_percent !== undefined ? Number(row.avg_return_percent) : null,
    }));
  }

  // ---------------------------------------------------------------------------
  // Per-instrument outcome aggregates (for workbench signalEvidence)
  // ---------------------------------------------------------------------------

  /**
   * Return directional win-rate and avg forward-return for a single instrument
   * at the given horizon, computed over dataComplete=true rows.
   *
   * Returns null when no mature rows exist (graceful absent).
   * Win-rate semantics: denominator = BULLISH + BEARISH (NEUTRAL excluded).
   */
  async instrumentOutcomeAggregate(
    instrumentId: string,
    horizon: QualityHorizon,
  ): Promise<{
    matureCount: number;
    directionalSampleSize: number;
    winRate: number | null;
    avgForwardReturn: number | null;
  } | null> {
    const sql = `
      SELECT
        COUNT(*) AS mature_count,
        COUNT(*) FILTER (WHERE direction IN ('BULLISH','BEARISH')) AS directional_sample,
        CASE WHEN COUNT(*) FILTER (WHERE direction IN ('BULLISH','BEARISH')) = 0 THEN NULL
             ELSE ROUND(
               COUNT(*) FILTER (
                 WHERE (direction = 'BULLISH' AND "forwardReturnPercent" > 0)
                    OR (direction = 'BEARISH' AND "forwardReturnPercent" < 0)
               )::numeric
               / COUNT(*) FILTER (WHERE direction IN ('BULLISH','BEARISH'))::numeric,
               6
             )
        END AS win_rate,
        ROUND(AVG("forwardReturnPercent")::numeric, 6) AS avg_forward_return
      FROM signal_outcomes
      WHERE "instrumentId" = $1
        AND horizon = $2
        AND "dataComplete" = true
    `;
    const rows = await this.db.$queryRawUnsafe<any[]>(sql, instrumentId, horizon);
    const row = rows[0];
    if (!row) return null;
    const matureCount = Number(row.mature_count ?? 0);
    if (matureCount === 0) return null;
    return {
      matureCount,
      directionalSampleSize: Number(row.directional_sample ?? 0),
      winRate: row.win_rate !== null && row.win_rate !== undefined ? Number(row.win_rate) : null,
      avgForwardReturn: row.avg_forward_return !== null && row.avg_forward_return !== undefined ? Number(row.avg_forward_return) : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Legacy stub (kept for backward compat)
  // ---------------------------------------------------------------------------

  /** @deprecated Use the service's recalculate({ persistOutcomes: true }) instead. */
  async recalculate() {
    return {
      persistedOutcomes: false,
      message: 'Signal Quality Lab calculates outcomes on demand; no cached outcomes were refreshed.',
      recalculatedAt: new Date().toISOString(),
    };
  }
}
