import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type { SignalGenerationRunAudit, SignalHistoryQuery, SignalQuery, SignalResultDto, SignalWriteResult } from './signal-generation-engine.types';
import { resolveMarketRegionFilter } from '../../shared/utils/market-scope';
import { isTrustedReadSignal, dedupeTrustedRows } from './signal-read-policy';
import { normalizeUtcDay } from './signal-math';
import { buildSignalResultData, signalRecordToDto, signalWriteStatus } from './signal-generation-engine.row-mapper';

/** Quality-tiebreak ordinals (higher = ranks first). Unknown/legacy → 0. */
const CONFIDENCE_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const RELIABILITY_RANK: Record<string, number> = { FULL: 2, PARTIAL: 1 };

export interface SignalFunnelDiagnosticsQuery {
  region?: string;
  assetType?: string;
  generatedDate?: string;
  from?: string;
  to?: string;
}

export class SignalGenerationEngineRepository {
  constructor(private readonly db = prisma) {}

  async createSignalResult(result: SignalResultDto): Promise<SignalResultDto> {
    return (await this.createSignalResultWithStatus(result)).result;
  }

  async createSignalResultWithStatus(result: SignalResultDto): Promise<SignalWriteResult> {
    const generatedAt = new Date(result.generated_at);
    const generatedDate = this.normalizeUtcDay(generatedAt);
    const modelVersion = result.modelVersion || 'signal-engine-v1';
    const rulesetVersion = result.rulesetVersion || modelVersion;
    const data = buildSignalResultData(result, { generatedAt, generatedDate, modelVersion, rulesetVersion });
    const where = {
      instrumentId_modelVersion_generatedDate: {
        instrumentId: result.instrument_id,
        modelVersion,
        generatedDate,
      },
    };
    const existing = typeof this.db.signalResult.findUnique === 'function'
      ? await this.db.signalResult.findUnique({ where }).catch(() => null)
      : null;
    const saved = await this.db.signalResult.upsert({
      where,
      create: data,
      update: data,
    });
    return {
      result: this.toDto(saved),
      status: signalWriteStatus(existing, data),
    };
  }

  async createRunAudit(input: {
    region: string;
    assetType: string;
    requestedByUserId: string;
    modelVersion: string;
    rulesetVersion: string;
    sourceDataDate: Date | null;
    generatedDate: Date;
    batchSize: number;
    offset: number;
    totalCount: number;
    warnings: string[];
  }): Promise<SignalGenerationRunAudit> {
    const created = await this.db.signalGenerationRun.create({
      data: {
        region: input.region,
        assetType: input.assetType,
        requestedByUserId: input.requestedByUserId,
        status: 'RUNNING',
        modelVersion: input.modelVersion,
        rulesetVersion: input.rulesetVersion,
        sourceDataDate: input.sourceDataDate,
        generatedDate: input.generatedDate,
        batchSize: input.batchSize,
        offset: input.offset,
        totalCount: input.totalCount,
        warnings: input.warnings as unknown as Prisma.InputJsonValue,
      },
    });
    return this.runToDto(created);
  }

  async completeRunAudit(id: string, input: {
    status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
    sourceDataDate: Date | null;
    processedCount: number;
    generatedCount: number;
    updatedCount: number;
    noOpCount: number;
    duplicateOrIdempotentCount: number;
    skippedCount: number;
    failedCount: number;
    excludedByDataQuality: number;
    missingQualityEvaluationCount: number;
    durationMs: number;
    warnings: string[];
  }): Promise<SignalGenerationRunAudit> {
    const updated = await this.db.signalGenerationRun.update({
      where: { id },
      data: {
        status: input.status,
        sourceDataDate: input.sourceDataDate,
        processedCount: input.processedCount,
        generatedCount: input.generatedCount,
        updatedCount: input.updatedCount,
        noOpCount: input.noOpCount,
        duplicateOrIdempotentCount: input.duplicateOrIdempotentCount,
        skippedCount: input.skippedCount,
        failedCount: input.failedCount,
        excludedByDataQuality: input.excludedByDataQuality,
        missingQualityEvaluationCount: input.missingQualityEvaluationCount,
        durationMs: input.durationMs,
        warnings: input.warnings as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
    return this.runToDto(updated);
  }

  async latestRunAudit(query: { region?: string; assetType?: string; modelVersion?: string }): Promise<SignalGenerationRunAudit | null> {
    const record = await this.db.signalGenerationRun.findFirst({
      where: {
        region: query.region,
        assetType: query.assetType,
        modelVersion: query.modelVersion,
      },
      // Order by the market-data date the run covered (NULLS LAST), then recency.
      // Prevents a tiny manual/test run (null or stale sourceDataDate) from masking
      // the real daily run as the "latest run" in the admin audit.
      orderBy: [{ sourceDataDate: { sort: 'desc', nulls: 'last' } }, { startedAt: 'desc' }],
    });
    return record ? this.runToDto(record) : null;
  }

  async latestForInstrument(instrumentId: string): Promise<SignalResultDto | null> {
    const result = await this.db.signalResult.findFirst({
      where: { instrumentId },
      orderBy: { generatedAt: 'desc' },
    });
    return result ? this.toDto(result) : null;
  }

  async latestSignals(query: SignalQuery): Promise<{ signals: SignalResultDto[], total: number }> {
    const fastPage = await this.latestSignalsFromLatestGeneratedDate(query);
    if (fastPage) return fastPage;

    const finalResults = await this.latestFilteredSignals(query);
    const total = finalResults.length;
    const offset = query.offset || 0;
    const limit = query.limit || 25;

    return {
      signals: finalResults.slice(offset, offset + limit),
      total,
    };
  }

  async directionCounts(query: SignalQuery): Promise<Record<'BULLISH' | 'NEUTRAL' | 'BEARISH', number>> {
    const fastCounts = await this.directionCountsFromLatestGeneratedDate(query);
    if (fastCounts) return fastCounts;

    const signals = await this.latestFilteredSignals({
      ...query,
      direction: undefined,
      offset: 0,
    });
    return signals.reduce<Record<'BULLISH' | 'NEUTRAL' | 'BEARISH', number>>((acc, signal) => {
      acc[signal.direction] += 1;
      return acc;
    }, { BULLISH: 0, NEUTRAL: 0, BEARISH: 0 });
  }

  async latestSignalUniverse(query: SignalQuery): Promise<SignalResultDto[]> {
    const fastPage = await this.latestSignalsFromLatestGeneratedDate(query);
    if (fastPage) return fastPage.signals;

    const results = await this.latestFilteredSignals(query);
    const offset = query.offset || 0;
    return results.slice(offset, offset + query.limit);
  }

  /**
   * Scores-only projection of the same cohort universe `latestSignalUniverse` serves.
   * Selects ONLY the `score` column (vs full-row fetch) so `withRsPercentiles` avoids
   * deserialising ~800 heavy rows + JSON arrays just to extract one number per row.
   *
   * Mirrors the exact trusted + latest-generatedDate filter:
   *  - Fast path: `latestGeneratedDateFor` → `findMany({ select: { score, signalReadinessStatus } })`
   *    then trusted-predicate applied in-memory (same as `trustedRowsForLatestDate`).
   *  - Slow path: falls back to the full latestFilteredSignals DTO fetch (graceful degradation).
   */
  async latestSignalUniverseScores(scope: { region?: string; assetType?: string }): Promise<number[]> {
    const query = { region: scope.region, assetType: scope.assetType, limit: 100000, offset: 0 } as SignalQuery;
    if (!this.canUseLatestGeneratedDateFastPath(query)) {
      // Slow-path fallback: reuse existing full-DTO fetch (no new code path needed).
      const rows = await this.latestFilteredSignals(query);
      return rows.map((r) => (typeof r.score === 'number' ? r.score : 0));
    }
    if (typeof this.db.signalResult.findFirst !== 'function' || typeof this.db.signalResult.findMany !== 'function') {
      const rows = await this.latestFilteredSignals(query);
      return rows.map((r) => (typeof r.score === 'number' ? r.score : 0));
    }

    const generatedDate = await this.latestGeneratedDateFor(query);
    if (!generatedDate) return [];

    const where = {
      ...this.buildWhere(query as SignalQuery & SignalFunnelDiagnosticsQuery),
      generatedDate,
    };

    // Select only the columns the trusted predicate + dedup + score extraction need.
    // `isTrustedReadSignal` evaluates: auditStatus (derived from rulesetVersion +
    // scoringInputSummary + dataQualityEligibilitySnapshot), dataQualityEligibility.filterApplied,
    // dataQualityEligibility.eligible, and dataQualityEligibility.signalReadinessStatus.
    // All come from `dataQualityEligibilitySnapshot` (JSON) and three presence columns.
    // `instrumentId` and `modelVersion` are required by dedupeTrustedRows so same-date v3+v4
    // rows for the same instrument collapse to one entry (the v4 row), matching the full path.
    const rows = await this.db.signalResult.findMany({
      where,
      select: {
        instrumentId: true,
        modelVersion: true,
        score: true,
        rulesetVersion: true,
        scoringInputSummary: true,
        dataQualityEligibilitySnapshot: true,
      },
    });

    // Apply the same trusted predicate used by trustedRowsForLatestDate, but without
    // building full DTOs.  Mirror signalRecordToDto's two fields that isTrustedReadSignal
    // inspects: auditStatus (presence check) and dataQualityEligibility (the JSON blob).
    const TRUSTED_READINESS = new Set(['READY', 'LIMITED']);
    const trusted = rows.filter((r: any) => {
      const auditStatus = r.rulesetVersion && r.scoringInputSummary && r.dataQualityEligibilitySnapshot
        ? 'CURRENT'
        : 'LEGACY_MISSING';
      if (auditStatus !== 'CURRENT') return false;
      const dq = r.dataQualityEligibilitySnapshot as any;
      return dq?.filterApplied === true
        && dq.eligible === true
        && TRUSTED_READINESS.has(dq.signalReadinessStatus ?? '');
    });

    // Deduplicate: one row per instrumentId, preferring the active model version (v4).
    // Mirrors dedupeTrustedRows() exactly — slim rows carry `instrumentId` + `modelVersion`
    // so the same preference logic applies without building full DTOs.
    // Shape adapter: dedupeTrustedRows keys on `instrument_id`; map then restore.
    const slimForDedup = trusted.map((r: any) => ({ ...r, instrument_id: r.instrumentId }));
    const deduped = dedupeTrustedRows(slimForDedup);
    return deduped.map((r: any) => (typeof r.score === 'number' ? r.score : 0));
  }

  async latestSignalUniverseCount(query: Omit<SignalQuery, 'limit'>): Promise<number> {
    const fastCount = await this.latestSignalUniverseCountFromLatestGeneratedDate(query);
    if (fastCount !== null) return fastCount;

    return (await this.latestFilteredSignals({ ...(query as SignalQuery), limit: Number.MAX_SAFE_INTEGER })).length;
  }

  async funnelDiagnostics(query: SignalFunnelDiagnosticsQuery) {
    const results = await this.db.signalResult.findMany({
      where: this.buildWhere({
        limit: 5000,
        region: query.region,
        assetType: query.assetType,
        from: query.from,
        to: query.to,
        generatedDate: query.generatedDate,
      } as SignalQuery & SignalFunnelDiagnosticsQuery),
      orderBy: [{ instrumentId: 'asc' }, { generatedAt: 'desc' }],
      distinct: ['instrumentId'],
    });

    const byDirection = results.reduce<Record<string, number>>((acc, item) => {
      acc[item.direction] = (acc[item.direction] || 0) + 1;
      return acc;
    }, {});

    return {
      total: results.length,
      bullish: byDirection.BULLISH || 0,
      bearish: byDirection.BEARISH || 0,
      neutral: byDirection.NEUTRAL || 0,
      byDirection,
    };
  }

  async signalHistory(query: SignalHistoryQuery): Promise<SignalResultDto[]> {
    const results = await this.db.signalResult.findMany({
      where: {
        ...this.buildWhere(query),
        instrumentId: query.instrumentId,
        generatedAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      orderBy: { generatedAt: 'desc' },
      take: query.limit,
      skip: query.offset ?? 0,
    });
    return results.map((item) => this.toDto(item)).filter((result) => !query.signalType || this.hasSignal(result, query.signalType));
  }

  async signalHistoryCount(query: Omit<SignalHistoryQuery, 'limit'>): Promise<number> {
    return this.db.signalResult.count({
      where: {
        ...this.buildWhere(query as SignalQuery),
        instrumentId: query.instrumentId,
        generatedAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
    });
  }

  /**
   * Returns the most-recent SignalResult for an instrument BEFORE the given
   * generatedDate (exclusive).  Used to look up the prior score/direction for
   * lifecycle classification during a run.
   */
  async priorSignalForInstrument(
    instrumentId: string,
    modelVersion: string,
    beforeDate: Date,
  ): Promise<{ score: number; direction: string } | null> {
    const record = await this.db.signalResult.findFirst({
      where: {
        instrumentId,
        modelVersion,
        generatedDate: { lt: beforeDate },
      },
      orderBy: { generatedDate: 'desc' },
      select: { score: true, direction: true },
    });
    return record ?? null;
  }

  /**
   * Returns the most-recent persisted signals that have lifecycleState = 'EXIT'.
   * This is the persisted read surface for exit-candidate trader pages.
   */
  async exitCandidates(query: Omit<SignalQuery, 'lifecycleState'> & { limit: number }): Promise<{ signals: SignalResultDto[]; total: number }> {
    return this.latestSignals({ ...query, lifecycleState: 'EXIT' });
  }

  private buildWhere(query: SignalQuery & SignalFunnelDiagnosticsQuery): Prisma.SignalResultWhereInput {
    const generatedDate = query.generatedDate ? this.normalizeUtcDay(new Date(query.generatedDate)) : undefined;

    // Read filters for reliability tier / SME exclusion.
    // Both are additive and default to no-filter (backward-compatible).
    let reliabilityFilter: Prisma.SignalResultWhereInput | undefined;
    if (query.reliabilityTier) {
      // Exact tier match
      reliabilityFilter = { reliabilityTier: query.reliabilityTier };
    } else if (query.excludeSme) {
      // Exclude PARTIAL-tier signals; preserve legacy NULL records for backward-compat
      reliabilityFilter = {
        OR: [
          { reliabilityTier: { equals: 'FULL' } },
          { reliabilityTier: null },
        ],
      };
    }

    // Search filter uses OR; reliability filter may also use OR. Merge with AND to avoid overwrite.
    const searchFilter: Prisma.SignalResultWhereInput | undefined = query.search
      ? { OR: [
          { symbol: { contains: query.search, mode: 'insensitive' } },
          { companyName: { contains: query.search, mode: 'insensitive' } },
        ] }
      : undefined;

    const andClauses: Prisma.SignalResultWhereInput[] = [];
    if (searchFilter) andClauses.push(searchFilter);
    if (reliabilityFilter) andClauses.push(reliabilityFilter);

    return {
      ...this.relatedMarketScopeFilter(query.region, query.assetType),
      direction: query.direction,
      confidence: query.confidence,
      score: query.minScore !== undefined ? { gte: query.minScore } : undefined,
      generatedDate,
      generatedAt: query.from || query.to ? {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      } : undefined,
      sector: query.sector ? { contains: query.sector, mode: 'insensitive' } : undefined,
      country: query.country ? { contains: query.country, mode: 'insensitive' } : undefined,
      modelVersion: query.modelVersion,
      lifecycleState: query.lifecycleState ?? undefined,
      AND: andClauses.length > 0 ? andClauses : undefined,
    };
  }

  private async latestFilteredSignals(query: SignalQuery & Partial<SignalFunnelDiagnosticsQuery>): Promise<SignalResultDto[]> {
    const where = this.buildWhere({ ...query, direction: undefined, confidence: undefined, minScore: undefined, signalType: undefined });

    const results = await this.db.signalResult.findMany({
      where,
      orderBy: [
        { instrumentId: 'asc' },
        { generatedAt: 'desc' },
      ],
      distinct: ['instrumentId'],
    });

    const filtered = results.map((item) => this.toDto(item))
      .filter((result) => this.isTrustedReadSignal(result))
      .filter((result) => !query.direction || result.direction === query.direction)
      .filter((result) => !query.confidence || result.confidence === query.confidence)
      .filter((result) => query.minScore === undefined || result.score >= query.minScore)
      .filter((result) => !query.signalType || this.hasSignal(result, query.signalType));
    await this.attachLiquidity(filtered);
    return this.rankSignals(filtered, query);
  }

  /**
   * B1 (trusted-read consistency): load every row for the latest generated date that
   * matches `where`, map to DTOs and keep only TRUSTED rows via the shared predicate.
   *
   * The served page, its `total` and the direction counts are all derived from THIS
   * one trusted set, so the header counts can never disagree with the rendered list.
   * A DB-level filter is intentionally avoided: the trusted predicate inspects the
   * `signalReadinessStatus` field inside the dataQualityEligibilitySnapshot JSON, and
   * applying it as the in-memory source of truth guarantees parity with the read path.
   * One date's universe is far smaller than the slow path's distinct-over-all-history
   * scan, so this stays the fast path.
   */
  private async trustedRowsForLatestDate(where: Prisma.SignalResultWhereInput, orderBy: Prisma.SignalResultOrderByWithRelationInput[]): Promise<SignalResultDto[]> {
    const rows = await this.db.signalResult.findMany({ where, orderBy });
    return dedupeTrustedRows(rows.map((item) => this.toDto(item)).filter((result) => this.isTrustedReadSignal(result)));
  }

  private async latestSignalsFromLatestGeneratedDate(query: SignalQuery): Promise<{ signals: SignalResultDto[]; total: number } | null> {
    if (!this.canUseLatestGeneratedDateFastPath(query)) return null;
    if (typeof this.db.signalResult.findFirst !== 'function' || typeof this.db.signalResult.findMany !== 'function') return null;

    const generatedDate = await this.latestGeneratedDateFor(query);
    if (!generatedDate) return null;

    const limit = query.limit || 25;
    const offset = Math.max(0, query.offset || 0);
    const where = {
      ...this.buildWhere(query as SignalQuery & SignalFunnelDiagnosticsQuery),
      generatedDate,
    };
    const trusted = await this.trustedRowsForLatestDate(where, this.orderByForLatestSignals(query));
    await this.attachLiquidity(trusted);
    const ranked = this.rankSignals(trusted, query);
    return { signals: ranked.slice(offset, offset + limit), total: ranked.length };
  }

  private async latestSignalUniverseCountFromLatestGeneratedDate(query: Omit<SignalQuery, 'limit'>): Promise<number | null> {
    if (!this.canUseLatestGeneratedDateFastPath(query as SignalQuery)) return null;
    if (typeof this.db.signalResult.findFirst !== 'function' || typeof this.db.signalResult.findMany !== 'function') return null;
    const generatedDate = await this.latestGeneratedDateFor(query as SignalQuery);
    if (!generatedDate) return null;
    const where = {
      ...this.buildWhere(query as SignalQuery & SignalFunnelDiagnosticsQuery),
      generatedDate,
    };
    const trusted = await this.trustedRowsForLatestDate(where, this.orderByForLatestSignals(query as SignalQuery));
    return trusted.length;
  }

  private async directionCountsFromLatestGeneratedDate(query: SignalQuery): Promise<Record<'BULLISH' | 'NEUTRAL' | 'BEARISH', number> | null> {
    if (!this.canUseLatestGeneratedDateFastPath({ ...query, direction: undefined })) return null;
    if (typeof this.db.signalResult.findFirst !== 'function' || typeof this.db.signalResult.findMany !== 'function') return null;
    const generatedDate = await this.latestGeneratedDateFor({ ...query, direction: undefined });
    if (!generatedDate) return null;
    // Count over the same TRUSTED set the list is served from (direction/confidence/
    // minScore stripped so all three buckets are represented), grouped by direction.
    const where = {
      ...this.buildWhere({
        ...query,
        direction: undefined,
        confidence: undefined,
        minScore: undefined,
      } as SignalQuery & SignalFunnelDiagnosticsQuery),
      generatedDate,
    };
    const trusted = await this.trustedRowsForLatestDate(where, this.orderByForLatestSignals(query));
    return trusted.reduce<Record<'BULLISH' | 'NEUTRAL' | 'BEARISH', number>>((acc, signal) => {
      if (signal.direction === 'BULLISH' || signal.direction === 'NEUTRAL' || signal.direction === 'BEARISH') {
        acc[signal.direction] += 1;
      }
      return acc;
    }, { BULLISH: 0, NEUTRAL: 0, BEARISH: 0 });
  }

  private async latestGeneratedDateFor(query: SignalQuery): Promise<Date | null> {
    const where = {
      ...this.buildWhere({
        ...query,
        direction: undefined,
        confidence: undefined,
        minScore: undefined,
        signalType: undefined,
      } as SignalQuery & SignalFunnelDiagnosticsQuery),
      generatedDate: { not: null },
    };
    // Group the most recent generated dates by count, then pick the latest date whose
    // signal count is SUBSTANTIAL. This prevents a tiny partial/test run (e.g. a
    // connected-chain seed of ~20 rows generated "today") from shadowing the real
    // full-universe run from the prior date in the served reads.
    const grouped = await this.db.signalResult.groupBy({
      by: ['generatedDate'],
      where,
      _count: { _all: true },
      orderBy: { generatedDate: 'desc' },
      take: 10,
    });
    if (grouped.length === 0) return null;
    const maxCount = Math.max(...grouped.map((g) => g._count._all));
    // Floor: at least 40% of the largest recent run (and ≥ 20 rows). The date holding
    // maxCount always clears this, so a substantial date is always found.
    const floor = Math.max(20, Math.floor(maxCount * 0.4));
    const substantial = grouped.find((g) => g._count._all >= floor && g.generatedDate != null);
    return substantial?.generatedDate ?? grouped[0].generatedDate ?? null;
  }

  private canUseLatestGeneratedDateFastPath(query: SignalQuery): boolean {
    return !query.signalType
      && !query.hasStrategyMatch
      && !query.hasBlockedStrategies
      && !query.frameworkBackedDecisionAvailable
      && !query.includeStrategyMatches
      && !query.onlyStrategyEligible
      && !query.excludeNoiseFiltered
      && !query.strategyCode;
  }

  private orderByForLatestSignals(query: Pick<SignalQuery, 'sortBy' | 'sortDirection'>): Prisma.SignalResultOrderByWithRelationInput[] {
    const direction: Prisma.SortOrder = query.sortDirection === 'asc' ? 'asc' : 'desc';
    switch (this.normalizeSortBy(query.sortBy)) {
      case 'symbol':
        return [{ symbol: direction }, { instrumentId: 'asc' }];
      case 'companyName':
        return [{ companyName: direction }, { instrumentId: 'asc' }];
      case 'generatedAt':
        return [{ generatedAt: direction }, { instrumentId: 'asc' }];
      case 'direction':
        return [{ direction }, { score: 'desc' }, { instrumentId: 'asc' }];
      case 'confidence':
        return [{ confidence: direction }, { score: 'desc' }, { instrumentId: 'asc' }];
      case 'score':
      default:
        return [{ score: direction }, { generatedAt: 'desc' }, { instrumentId: 'asc' }];
    }
  }

  private sortSignals(results: SignalResultDto[], query: Pick<SignalQuery, 'sortBy' | 'sortDirection'>): SignalResultDto[] {
    const sortBy = this.normalizeSortBy(query.sortBy);
    const sortDirection = query.sortDirection === 'asc' ? 1 : -1;
    return [...results].sort((a, b) => {
      const left = this.sortValue(a, sortBy);
      const right = this.sortValue(b, sortBy);

      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;

      if (typeof left === 'number' && typeof right === 'number') return (left - right) * sortDirection;
      return String(left).localeCompare(String(right)) * sortDirection;
    });
  }

  private normalizeSortBy(value?: string): string {
    const normalized = String(value || '').trim();
    const allowed = new Set(['score', 'effectiveDisplacement', 'symbol', 'companyName', 'generatedAt', 'direction', 'confidence', 'dailyChangePercent']);
    return allowed.has(normalized) ? normalized : 'score';
  }

  private sortValue(signal: SignalResultDto, sortBy: string): string | number | null {
    switch (sortBy) {
      case 'symbol': return signal.symbol;
      case 'companyName': return signal.company_name;
      case 'generatedAt': return new Date(signal.generated_at).getTime();
      case 'direction': return signal.direction;
      case 'confidence': return signal.confidence;
      case 'dailyChangePercent': return signal.dailyChangePercent;
      case 'effectiveDisplacement': return this.convictionOf(signal);
      case 'score':
      default:
        return signal.score;
    }
  }

  /**
   * Unrounded conviction on the displacement scale [-0.5, +0.5], used ONLY as the
   * within-equal-score tiebreak (the integer `score` is the primary key — see
   * compareSignalRank).  Prefers the v4 breadth-gated `effectiveDisplacement`, then
   * the raw `displacement`; for legacy/v3 rows with no v4 blob it maps the rounded
   * score back onto the same scale via (score-50)/100.  Because conviction only
   * orders rows that ALREADY share a rounded score, the v3 fallback is near-constant
   * within a bucket and simply falls through to the next tiebreak — so mixing v3/v4
   * rows on one page cannot reorder across score buckets.  Non-finite values (a
   * malformed JSON blob) fall back to the score-derived value to keep a total order.
   */
  private convictionOf(signal: SignalResultDto): number {
    const v4 = signal.scoringInputSummary?.v4;
    if (v4 && Number.isFinite(v4.effectiveDisplacement as number)) return v4.effectiveDisplacement as number;
    if (v4 && Number.isFinite(v4.displacement as number)) return v4.displacement as number;
    const score = typeof signal.score === 'number' && Number.isFinite(signal.score) ? signal.score : 50;
    return (score - 50) / 100;
  }

  /**
   * Deterministic total order for the default/conviction sort.
   *
   * Primary key is the headline integer `score` (which embeds the v4 evidence-breadth
   * weighting), so the Score column stays monotonic with row order — a lower-score row
   * never renders above a higher-score one.  Gap #1's dense integer ties are then broken
   * by the unrounded `convictionOf` (the finer signal the score rounds away).
   *
   * `convictionSign` flips BOTH direction-bearing keys together (1 = strongest-bullish
   * first for desc/Bullish tabs, -1 = strongest-bearish first for asc/Bearish tabs).
   * The quality tiebreakers (confidence, reliability, liquidity) stay best-first
   * regardless of direction, then recency, then instrumentId for stability.
   */
  private compareSignalRank(a: SignalResultDto, b: SignalResultDto, convictionSign: 1 | -1): number {
    const sa = typeof a.score === 'number' && Number.isFinite(a.score) ? a.score : 0;
    const sb = typeof b.score === 'number' && Number.isFinite(b.score) ? b.score : 0;
    if (sa !== sb) return (sb - sa) * convictionSign;

    const ca = this.convictionOf(a);
    const cb = this.convictionOf(b);
    if (ca !== cb) return (cb - ca) * convictionSign;

    const fa = CONFIDENCE_RANK[a.confidence] ?? 0;
    const fb = CONFIDENCE_RANK[b.confidence] ?? 0;
    if (fa !== fb) return fb - fa;

    const ra = RELIABILITY_RANK[a.reliabilityTier ?? ''] ?? 0;
    const rb = RELIABILITY_RANK[b.reliabilityTier ?? ''] ?? 0;
    if (ra !== rb) return rb - ra;

    const la = typeof a.liquidityScore === 'number' ? a.liquidityScore : -1;
    const lb = typeof b.liquidityScore === 'number' ? b.liquidityScore : -1;
    if (la !== lb) return lb - la;

    const ta = new Date(a.generated_at).getTime();
    const tb = new Date(b.generated_at).getTime();
    if (ta !== tb) return tb - ta;

    return String(a.instrument_id).localeCompare(String(b.instrument_id));
  }

  /**
   * Rank a served page.  The default ('score') and explicit 'effectiveDisplacement'
   * sorts use the conviction comparator above; explicit column sorts (symbol,
   * companyName, generatedAt, direction, confidence, dailyChangePercent) keep their
   * single-key behaviour via sortSignals().
   */
  private rankSignals(results: SignalResultDto[], query: Pick<SignalQuery, 'sortBy' | 'sortDirection'>): SignalResultDto[] {
    const sortBy = this.normalizeSortBy(query.sortBy);
    if (sortBy === 'score' || sortBy === 'effectiveDisplacement') {
      const convictionSign: 1 | -1 = query.sortDirection === 'asc' ? -1 : 1;
      return [...results].sort((a, b) => this.compareSignalRank(a, b, convictionSign));
    }
    return this.sortSignals(results, query);
  }

  /**
   * Attach the region-agnostic liquidity proxy (InstrumentCoverage.liquidityScore)
   * to each served DTO, in-memory, via one indexed batch lookup keyed on stockId.
   * Used as a ranking tiebreak and surfaced as a tradability indicator — never a
   * filter.  Degrades gracefully (leaves liquidityScore null) when the coverage
   * delegate is absent (e.g. unit-test mocks) or the lookup fails.
   */
  private async attachLiquidity(signals: SignalResultDto[]): Promise<void> {
    if (signals.length === 0) return;
    const coverage = (this.db as any).instrumentCoverage;
    if (!coverage || typeof coverage.findMany !== 'function') return;
    const ids = [...new Set(signals.map((s) => s.instrument_id).filter(Boolean))];
    if (ids.length === 0) return;
    const rows: Array<{ stockId: string; liquidityScore: unknown }> = await coverage.findMany({
      where: { stockId: { in: ids } },
      select: { stockId: true, liquidityScore: true },
    }).catch(() => []);
    const byId = new Map<string, number | null>();
    for (const row of rows) {
      const value = row.liquidityScore;
      byId.set(row.stockId, value === null || value === undefined ? null : Number(value));
    }
    for (const signal of signals) {
      signal.liquidityScore = byId.has(signal.instrument_id) ? byId.get(signal.instrument_id) ?? null : null;
    }
  }

  private relatedMarketScopeFilter(region?: string, assetType?: string): Prisma.SignalResultWhereInput {
    const stockFilters: Prisma.StockWhereInput[] = [];
    const regionFilter = resolveMarketRegionFilter(region);
    if (Object.keys(regionFilter).length > 0) stockFilters.push(regionFilter);
    const normalizedAssetType = assetType?.trim().toUpperCase();
    if (normalizedAssetType) {
      if (normalizedAssetType === 'STOCK' || normalizedAssetType === 'EQUITY') {
        stockFilters.push({
          OR: [
            { assetType: { in: ['STOCK', 'EQUITY'], mode: 'insensitive' } },
            { assetType: null },
          ],
        });
      } else {
        stockFilters.push({ assetType: { equals: normalizedAssetType, mode: 'insensitive' } });
      }
    }
    return stockFilters.length > 0 ? { stock: { AND: stockFilters } } : {};
  }

  private hasSignal(result: SignalResultDto, signalType: string): boolean {
    const needle = signalType.toLowerCase();
    return [...result.triggered_signals, ...result.negative_signals].some((signal) =>
      signal.code.toLowerCase().includes(needle) || signal.category.toLowerCase() === needle
    );
  }

  private isTrustedReadSignal(result: SignalResultDto): boolean {
    return isTrustedReadSignal(result);
  }

  private normalizeUtcDay(value: Date): Date {
    return normalizeUtcDay(value);
  }

  private toDto(record: any): SignalResultDto {
    return signalRecordToDto(record);
  }

  /**
   * Reads the latest persisted market-context snapshot for the given region
   * directly from the DB — no cross-module service import required.
   *
   * Mirrors what MarketContextIntelligenceService.latestPersistedSummary() returns
   * for the regime/breadth/sector fields that signal generation needs.
   */
  async latestPersistedMarketContext(region?: string): Promise<{
    regime: { regime: string };
    breadth: { percentAboveSma50: number | null };
    topSectors: Array<{ sector: string; leadershipStatus: string; relativeStrengthScore: number }>;
    weakSectors: Array<{ sector: string; leadershipStatus: string; relativeStrengthScore: number }>;
  } | null> {
    if (!region) return null; // SG-1 region isolation: no IN fallback for absent/GLOBAL scope
    const market = await this.db.marketContextSnapshot.findFirst({
      where: { region: region },
      orderBy: [{ snapshotDate: 'desc' }, { updatedAt: 'desc' }],
      select: { regime: true, regimeScore: true, breadthPercentAboveSma50: true, snapshotDate: true },
    }).catch(() => null);
    if (!market) return null;

    const sectorRows = await this.db.sectorContextSnapshot.findMany({
      where: {
        region: region,
        snapshotDate: market.snapshotDate,
      },
      orderBy: { relativeStrengthScore: 'desc' },
      select: { sector: true, relativeStrengthScore: true, leadershipStatus: true },
    }).catch(() => []);

    const allSectors = sectorRows.map((s: any) => ({
      sector: s.sector,
      leadershipStatus: s.leadershipStatus || 'LAGGING',
      relativeStrengthScore: Number(s.relativeStrengthScore),
    }));
    const topSectors = allSectors.slice(0, 5);
    const weakSectors = allSectors.length > 1
      ? allSectors.slice(-Math.min(5, allSectors.length - 1)).reverse()
      : [];

    return {
      regime: { regime: market.regime },
      breadth: { percentAboveSma50: market.breadthPercentAboveSma50 !== null ? Number(market.breadthPercentAboveSma50) : null },
      topSectors,
      weakSectors,
    };
  }

  /**
   * Reads the latest persisted smart-money context snapshots for the given
   * instrumentIds directly from the DB — no cross-module service import required.
   *
   * Mirrors SmartMoneyIntelligenceService.latestPersistedStocks() semantics:
   * for each instrument pick the most-recent row for the given range.
   */
  async latestPersistedSmartMoneyStocks(
    instrumentIds: string[],
    range: string = '3M',
  ): Promise<Map<string, { smartMoneyScore: number; status: string }>> {
    const uniqueIds = [...new Set(instrumentIds.filter(Boolean))];
    if (uniqueIds.length === 0) return new Map();

    const latestByInstrument = await this.db.smartMoneyContextSnapshot.groupBy({
      by: ['instrumentId'],
      where: { instrumentId: { in: uniqueIds }, range },
      _max: { updatedAt: true },
    }).catch(() => []);

    const latestPairs = (latestByInstrument as any[]).flatMap(
      (item: any) => (item._max?.updatedAt ? [{ instrumentId: item.instrumentId, updatedAt: item._max.updatedAt }] : []),
    );
    if (latestPairs.length === 0) return new Map();

    const rows = await this.db.smartMoneyContextSnapshot.findMany({
      where: { range, OR: latestPairs },
      orderBy: [{ updatedAt: 'desc' }],
      select: { instrumentId: true, smartMoneyScore: true, status: true, updatedAt: true },
    }).catch(() => []);

    const result = new Map<string, { smartMoneyScore: number; status: string }>();
    for (const row of rows as any[]) {
      if (!result.has(row.instrumentId)) {
        result.set(row.instrumentId, { smartMoneyScore: Number(row.smartMoneyScore), status: row.status });
      }
    }
    return result;
  }

  private runToDto(record: any): SignalGenerationRunAudit {
    return {
      id: record.id,
      scope: { region: record.region, assetType: record.assetType },
      requestedByUserId: record.requestedByUserId,
      status: record.status,
      modelVersion: record.modelVersion,
      rulesetVersion: record.rulesetVersion,
      sourceDataDate: record.sourceDataDate?.toISOString() ?? null,
      generatedDate: record.generatedDate.toISOString(),
      batchSize: record.batchSize,
      offset: record.offset,
      totalCount: record.totalCount,
      processedCount: record.processedCount,
      generatedCount: record.generatedCount,
      updatedCount: record.updatedCount,
      noOpCount: record.noOpCount,
      duplicateOrIdempotentCount: record.duplicateOrIdempotentCount,
      skippedCount: record.skippedCount,
      failedCount: record.failedCount,
      excludedByDataQuality: record.excludedByDataQuality,
      missingQualityEvaluationCount: record.missingQualityEvaluationCount,
      durationMs: record.durationMs,
      startedAt: record.startedAt.toISOString(),
      completedAt: record.completedAt?.toISOString() ?? null,
      warnings: Array.isArray(record.warnings) ? record.warnings : [],
    };
  }
}
