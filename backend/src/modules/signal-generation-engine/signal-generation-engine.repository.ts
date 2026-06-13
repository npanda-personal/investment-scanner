import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type { ReliabilityTier, SignalGenerationRunAudit, SignalHistoryQuery, SignalLifecycleState, SignalQuery, SignalResultDto, SignalWriteResult, SignalWriteStatus } from './signal-generation-engine.types';
import { resolveMarketRegionFilter } from '../../shared/utils/market-scope';
import { isTrustedReadSignal } from './signal-read-policy';
import { normalizeUtcDay } from './signal-math';

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
    const data = {
      instrumentId: result.instrument_id,
      generationRunId: result.generationRunId ?? null,
      symbol: result.symbol,
      companyName: result.company_name,
      sector: result.sector,
      country: result.country,
      score: result.score,
      direction: result.direction,
      confidence: result.confidence,
      triggeredSignals: result.triggered_signals as unknown as Prisma.InputJsonValue,
      negativeSignals: result.negative_signals as unknown as Prisma.InputJsonValue,
      explanation: result.explanation,
      generatedAt,
      generatedDate,
      modelVersion,
      rulesetVersion,
      sourceDataDate: result.sourceDataDate ? new Date(result.sourceDataDate) : null,
      sourcePriceDate: result.sourcePriceDate ? new Date(result.sourcePriceDate) : null,
      scoringInputSummary: result.scoringInputSummary as unknown as Prisma.InputJsonValue,
      dataQualityEligibilitySnapshot: result.dataQualityEligibility as unknown as Prisma.InputJsonValue,
      source: result.source,
      dataStatus: result.data_status,
      reliabilityTier: result.reliabilityTier ?? null,
      lifecycleState: result.lifecycleState ?? null,
      priorScore: result.priorScore ?? null,
    };
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
      status: this.writeStatus(existing, data),
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

    return this.sortSignals(
      results.map((item) => this.toDto(item))
        .filter((result) => this.isTrustedReadSignal(result))
        .filter((result) => !query.direction || result.direction === query.direction)
        .filter((result) => !query.confidence || result.confidence === query.confidence)
        .filter((result) => query.minScore === undefined || result.score >= query.minScore)
        .filter((result) => !query.signalType || this.hasSignal(result, query.signalType)),
      query
    );
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
    return rows.map((item) => this.toDto(item)).filter((result) => this.isTrustedReadSignal(result));
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
    return { signals: trusted.slice(offset, offset + limit), total: trusted.length };
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
    const allowed = new Set(['score', 'symbol', 'companyName', 'generatedAt', 'direction', 'confidence', 'dailyChangePercent']);
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
      case 'score':
      default:
        return signal.score;
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

  private writeStatus(existing: any, data: Record<string, unknown>): SignalWriteStatus {
    if (!existing) return 'CREATED';
    const same =
      existing.symbol === data.symbol &&
      existing.companyName === data.companyName &&
      existing.sector === data.sector &&
      existing.country === data.country &&
      existing.score === data.score &&
      existing.direction === data.direction &&
      existing.confidence === data.confidence &&
      JSON.stringify(existing.triggeredSignals || []) === JSON.stringify(data.triggeredSignals || []) &&
      JSON.stringify(existing.negativeSignals || []) === JSON.stringify(data.negativeSignals || []) &&
      existing.explanation === data.explanation &&
      (existing.rulesetVersion || existing.modelVersion) === data.rulesetVersion &&
      this.dateValue(existing.sourceDataDate) === this.dateValue(data.sourceDataDate) &&
      this.dateValue(existing.sourcePriceDate) === this.dateValue(data.sourcePriceDate) &&
      JSON.stringify(existing.scoringInputSummary || null) === JSON.stringify(data.scoringInputSummary || null) &&
      JSON.stringify(existing.dataQualityEligibilitySnapshot || null) === JSON.stringify(data.dataQualityEligibilitySnapshot || null) &&
      existing.source === data.source &&
      existing.dataStatus === data.dataStatus &&
      (existing.reliabilityTier ?? null) === (data.reliabilityTier ?? null) &&
      (existing.lifecycleState ?? null) === (data.lifecycleState ?? null) &&
      (existing.priorScore ?? null) === (data.priorScore ?? null);
    return same ? 'NO_OP' : 'UPDATED';
  }

  private dateValue(value: unknown): string | null {
    if (!value) return null;
    return new Date(value as any).toISOString();
  }

  private toDto(record: any): SignalResultDto {
    return {
      id: record.id,
      instrument_id: record.instrumentId,
      symbol: record.symbol,
      company_name: record.companyName,
      sector: record.sector,
      country: record.country,
      currentPrice: null,
      previousClose: null,
      dailyChange: null,
      dailyChangePercent: null,
      currency: null,
      priceTimestamp: null,
      score: record.score,
      direction: record.direction,
      confidence: record.confidence,
      triggered_signals: Array.isArray(record.triggeredSignals) ? record.triggeredSignals : [],
      negative_signals: Array.isArray(record.negativeSignals) ? record.negativeSignals : [],
      explanation: record.explanation,
      generated_at: record.generatedAt.toISOString(),
      generatedDate: record.generatedDate?.toISOString() ?? null,
      modelVersion: record.modelVersion || 'signal-engine-v1',
      rulesetVersion: record.rulesetVersion || record.modelVersion || 'signal-engine-v1',
      sourceDataDate: record.sourceDataDate?.toISOString() ?? null,
      sourcePriceDate: record.sourcePriceDate?.toISOString() ?? null,
      scoringInputSummary: record.scoringInputSummary || null,
      dataQualityEligibility: record.dataQualityEligibilitySnapshot || null,
      auditStatus: record.rulesetVersion && record.scoringInputSummary && record.dataQualityEligibilitySnapshot ? 'CURRENT' : 'LEGACY_MISSING',
      generationRunId: record.generationRunId ?? null,
      source: record.source,
      data_status: record.dataStatus,
      reliabilityTier: (record.reliabilityTier as ReliabilityTier | null) ?? null,
      // isSme is not persisted separately; callers should use reliabilityTier for read-filter decisions.
      // For freshly-generated DTOs it is set by generateForInstrument (instrument field is available there).
      lifecycleState: (record.lifecycleState as SignalLifecycleState | null) ?? null,
      priorScore: typeof record.priorScore === 'number' ? record.priorScore : null,
    };
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
    const effectiveRegion = region || 'IN';
    const market = await this.db.marketContextSnapshot.findFirst({
      where: { region: effectiveRegion },
      orderBy: [{ snapshotDate: 'desc' }, { updatedAt: 'desc' }],
      select: { regime: true, regimeScore: true, breadthPercentAboveSma50: true, snapshotDate: true },
    }).catch(() => null);
    if (!market) return null;

    const sectorRows = await this.db.sectorContextSnapshot.findMany({
      where: {
        region: effectiveRegion,
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
