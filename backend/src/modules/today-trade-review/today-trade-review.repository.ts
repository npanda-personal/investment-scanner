import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type {
  TodayReviewCandidateDto,
  TodayReviewCandidateReason,
  TodayReviewExcludedExample,
  TodayReviewExplainability,
  TodayReviewRepository as TodayReviewRepositoryContract,
  TodayReviewRunDto,
  TodayReviewRunStatus,
  TodayReviewSourceSnapshot,
} from './today-trade-review.types';

const LATEST_VISIBLE_RUN_PAGE_SIZE = 25;
const LATEST_VISIBLE_RUN_MAX_SCAN_ROWS = 250;
const FIXTURE_SOURCE_MARKERS = [
  'TEST_CONNECTED_CHAIN',
  'CONNECTED-CHAIN.SEEDED.INTEGRATION',
  'CONNECTED-CHAIN-SEEDED',
];

export class TodayTradeReviewRepository implements TodayReviewRepositoryContract {
  constructor(private readonly db = prisma) {}

  async markRunStarted(input: {
    runDate: Date;
    region: string;
    assetType: string;
    startedAt: Date;
    warnings: string[];
    sourceSnapshot: TodayReviewSourceSnapshot | Record<string, unknown>;
  }): Promise<TodayReviewRunDto> {
    const record = await this.db.todayReviewRun.upsert({
      where: {
        runDate_region_assetType: {
          runDate: input.runDate,
          region: input.region,
          assetType: input.assetType,
        },
      },
      create: {
        runDate: input.runDate,
        region: input.region,
        assetType: input.assetType,
        status: 'RUNNING',
        startedAt: input.startedAt,
        finishedAt: null,
        warnings: input.warnings as any,
        candidateCounts: {} as any,
        sourceSnapshot: input.sourceSnapshot as any,
      },
      update: {
        status: 'RUNNING',
        startedAt: input.startedAt,
        finishedAt: null,
        warnings: input.warnings as any,
        candidateCounts: {} as any,
        sourceSnapshot: input.sourceSnapshot as any,
      },
      include: { candidates: { orderBy: { rank: 'asc' } } },
    });
    return this.toRunDto(record);
  }

  async completeRun(input: {
    runId: string;
    status: TodayReviewRunStatus;
    dataThroughDate: Date | null;
    finishedAt: Date;
    warnings: string[];
    candidateCounts: Record<string, number>;
    sourceSnapshot: TodayReviewSourceSnapshot | Record<string, unknown>;
    candidates: TodayReviewCandidateDto[];
  }): Promise<TodayReviewRunDto> {
    const record = await this.db.$transaction(async (tx) => {
      await tx.todayReviewRun.update({
        where: { id: input.runId },
        data: {
          status: input.status,
          dataThroughDate: input.dataThroughDate,
          finishedAt: input.finishedAt,
          warnings: input.warnings as any,
          candidateCounts: input.candidateCounts as any,
          sourceSnapshot: input.sourceSnapshot as any,
        },
      });
      await tx.todayReviewCandidate.deleteMany({ where: { runId: input.runId } });
      if (input.candidates.length > 0) {
        await tx.todayReviewCandidate.createMany({
          data: input.candidates.map((candidate) => ({
            runId: input.runId,
            instrumentId: candidate.instrumentId,
            symbol: candidate.symbol,
            companyName: candidate.companyName,
            direction: candidate.direction,
            state: candidate.state,
            setupType: candidate.setupType,
            strategyCode: candidate.strategyCode,
            strategyVersion: candidate.strategyVersion,
            rank: candidate.rank,
            grade: candidate.grade,
            confidenceScore: candidate.confidenceScore,
            reasonSummary: candidate.reasonSummary,
            blockers: candidate.blockers as any,
            watchReasons: candidate.watchReasons as any,
            dataQualitySnapshot: this.optionalJson(candidate.dataQualitySnapshot),
            marketContextSnapshot: this.optionalJson(candidate.marketContextSnapshot),
            strategyProofSnapshot: this.optionalJson(candidate.strategyProofSnapshot),
            tradePlanSnapshot: this.optionalJson(candidate.tradePlanSnapshot),
            sourceSignalSnapshot: this.optionalJson(
              candidate.earningsProximity
                ? { ...(candidate.sourceSignalSnapshot as Record<string, unknown> ?? {}), earningsProximity: candidate.earningsProximity }
                : candidate.sourceSignalSnapshot
            ),
          })),
        });
      }
      return tx.todayReviewRun.findUniqueOrThrow({
        where: { id: input.runId },
        include: { candidates: { orderBy: { rank: 'asc' } } },
      });
    });
    return this.toRunDto(record);
  }

  async latest(region: string, assetType: string, options: { enrich?: boolean } = {}): Promise<TodayReviewRunDto | null> {
    let scanned = 0;
    while (scanned < LATEST_VISIBLE_RUN_MAX_SCAN_ROWS) {
      const records = await this.db.todayReviewRun.findMany({
        where: { region, assetType, status: { in: ['COMPLETED', 'PARTIAL'] } },
        orderBy: [{ runDate: 'desc' }, { updatedAt: 'desc' }],
        take: LATEST_VISIBLE_RUN_PAGE_SIZE,
        skip: scanned,
        include: { candidates: { orderBy: { rank: 'asc' } } },
      });
      const record = records.find((item: any) => this.isTraderVisibleRun(item));
      if (record) return this.toRunDto(record, options);
      if (records.length < LATEST_VISIBLE_RUN_PAGE_SIZE) return null;
      scanned += records.length;
    }
    return null;
  }

  async getRun(id: string): Promise<TodayReviewRunDto | null> {
    const record = await this.db.todayReviewRun.findUnique({
      where: { id },
      include: { candidates: { orderBy: { rank: 'asc' } } },
    });
    return record ? this.toRunDto(record) : null;
  }

  async listRuns(query: { region: string; assetType: string; limit: number; offset: number }): Promise<{ items: TodayReviewRunDto[]; total: number }> {
    const where = { region: query.region, assetType: query.assetType };
    const [records, total] = await Promise.all([
      this.db.todayReviewRun.findMany({
        where,
        orderBy: [{ runDate: 'desc' }, { updatedAt: 'desc' }],
        take: query.limit,
        skip: query.offset,
        include: { candidates: { orderBy: { rank: 'asc' } } },
      }),
      this.db.todayReviewRun.count({ where }),
    ]);
    return { items: await Promise.all(records.map((record) => this.toRunDto(record))), total };
  }

  async getCandidate(id: string): Promise<TodayReviewCandidateDto | null> {
    const record = await this.db.todayReviewCandidate.findUnique({ where: { id } });
    if (!record) return null;
    const [catalogSectorMap, range52wMap, fnoBanSet, smartMoneyMap] = await Promise.all([
      this.loadCatalogSectors([record.instrumentId]),
      this.load52wRanges([record.symbol]),
      this.loadFnoBanSet([record.symbol]),
      this.loadSmartMoneyStatuses([record.instrumentId]),
    ]);
    return this.toCandidateDto(record, catalogSectorMap, range52wMap, fnoBanSet, smartMoneyMap);
  }

  private optionalJson(value: unknown) {
    return value === null || value === undefined ? Prisma.DbNull : value as any;
  }

  /**
   * Batch-load catalog sectors for a list of instrumentIds (Stock.id).
   * One query for all IDs; returns a map of instrumentId → sector string.
   */
  private async loadCatalogSectors(instrumentIds: string[]): Promise<Map<string, string | null>> {
    if (instrumentIds.length === 0) return new Map();
    const stocks = await this.db.stock.findMany({
      where: { id: { in: instrumentIds } },
      select: { id: true, sector: true },
    });
    const map = new Map<string, string | null>();
    for (const stock of stocks) {
      map.set(stock.id, stock.sector ?? null);
    }
    return map;
  }

  /**
   * Batch-load 52-week range (high, low, latest close) for a list of symbols from
   * price_ticks (adjusted close preferred, ~252 trading-day look-back window).
   * ONE query for all symbols — no N+1. Pool-safe: single read, no transactions.
   *
   * Returns a map of symbol → { high52w, low52w, currentClose, positionPct }.
   * A symbol is absent from the map only when it has no price history in the DB.
   */
  private async load52wRanges(symbols: string[]): Promise<Map<string, {
    high52w: number; low52w: number; currentClose: number; positionPct: number;
    previousClose: number | null; dayChangePercent: number | null; volumeRatio: number | null;
  }>> {
    if (symbols.length === 0) return new Map();
    // LATERAL pulls latest 252 rows per symbol via (symbol,timestamp) index; ~35ms for ~40 symbols.
    const rows = await this.db.$queryRaw<Array<{
      symbol: string; high52w: number; low52w: number;
      current_close: number; previous_close: number | null;
      latest_volume: number | null; avg_volume_20d: number | null;
    }>>(Prisma.sql`
      SELECT s.symbol,
        MAX(p.adj_close)::float8 AS high52w, MIN(p.adj_close)::float8 AS low52w,
        (array_agg(p.adj_close ORDER BY p.ts DESC))[1]::float8 AS current_close,
        (array_agg(p.adj_close ORDER BY p.ts DESC))[2]::float8 AS previous_close,
        (array_agg(p.vol ORDER BY p.ts DESC))[1]::float8 AS latest_volume,
        (SELECT AVG(v) FROM unnest((array_agg(p.vol ORDER BY p.ts DESC))[2:21]) AS v)::float8 AS avg_volume_20d
      FROM unnest(${symbols}::text[]) AS s(symbol)
      CROSS JOIN LATERAL (
        SELECT COALESCE(pt."adjustedClose", pt.close)::float8 AS adj_close,
          COALESCE(pt.volume, 0)::float8 AS vol, pt.timestamp AS ts
        FROM price_ticks pt
        WHERE pt.symbol = s.symbol
          AND UPPER(COALESCE(pt."dataStatus", 'COMPLETE')) = 'COMPLETE'
          AND UPPER(COALESCE(pt.source, '')) NOT LIKE 'TEST\\_%'
        ORDER BY pt.timestamp DESC LIMIT 252
      ) p
      GROUP BY s.symbol
    `);
    type RangeEntry = { high52w: number; low52w: number; currentClose: number; positionPct: number; previousClose: number | null; dayChangePercent: number | null; volumeRatio: number | null };
    const map = new Map<string, RangeEntry>();
    for (const row of rows) {
      const high = Number(row.high52w), low = Number(row.low52w), current = Number(row.current_close);
      if (!isFinite(high) || !isFinite(low) || !isFinite(current)) continue;
      const range = high - low;
      const positionPct = range > 0 ? Math.max(0, Math.min(100, ((current - low) / range) * 100)) : 0;
      const prev = row.previous_close !== null ? Number(row.previous_close) : null;
      const dayChangePercent = prev && isFinite(prev) && prev > 0 ? ((current - prev) / prev) * 100 : null;
      const latVol = row.latest_volume !== null ? Number(row.latest_volume) : null;
      const avgVol = row.avg_volume_20d !== null ? Number(row.avg_volume_20d) : null;
      const volumeRatio = latVol && avgVol && avgVol > 0 ? latVol / avgVol : null;
      map.set(row.symbol, { high52w: high, low52w: low, currentClose: current, positionPct, previousClose: prev, dayChangePercent, volumeRatio });
    }
    return map;
  }

  /**
   * NR-100: Batch-load the latest F&O ban symbol set.
   * One raw query to determine the most-recent ban_date, then one query to
   * fetch all symbols for that date. Returns a Set of upper-cased symbols
   * that are currently in the F&O ban period. Pool-safe: read-only, no tx.
   */
  private async loadFnoBanSet(symbols: string[]): Promise<Set<string>> {
    if (symbols.length === 0) return new Set();
    try {
      const dateRows = await this.db.$queryRaw<Array<{ ban_date: Date }>>(Prisma.sql`
        SELECT ban_date FROM fno_ban_list ORDER BY ban_date DESC LIMIT 1
      `);
      if (dateRows.length === 0) return new Set();
      const latestDate = dateRows[0].ban_date;
      const upperSymbols = symbols.map((s) => s.toUpperCase());
      const rows = await this.db.$queryRaw<Array<{ symbol: string }>>(Prisma.sql`
        SELECT symbol FROM fno_ban_list
        WHERE ban_date = ${latestDate}
          AND symbol = ANY(${upperSymbols})
      `);
      return new Set(rows.map((r) => r.symbol.toUpperCase()));
    } catch {
      // fno_ban_list table may not exist yet — treat as no bans (honest false).
      return new Set();
    }
  }

  /**
   * NR-101: Batch-load the latest smart-money snapshot status + score
   * for a list of instrumentIds (one query via groupBy + findMany, no N+1).
   * Returns a map of instrumentId → { status, score }.
   * Pool-safe: read-only, no transaction.
   */
  private async loadSmartMoneyStatuses(
    instrumentIds: string[],
  ): Promise<Map<string, { status: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL'; score: number }>> {
    const uniqueIds = [...new Set(instrumentIds.filter(Boolean))];
    if (uniqueIds.length === 0) return new Map();
    try {
      const latestByInstrument = await this.db.smartMoneyContextSnapshot.groupBy({
        by: ['instrumentId'],
        where: {
          instrumentId: { in: uniqueIds },
          range: '3M',
          status: { not: 'INSUFFICIENT_DATA' },
        },
        _max: { updatedAt: true },
      });
      if (latestByInstrument.length === 0) return new Map();
      const latestPairs = latestByInstrument.flatMap((item: any) =>
        item._max?.updatedAt ? [{ instrumentId: item.instrumentId, updatedAt: item._max.updatedAt }] : [],
      );
      const rows = await this.db.smartMoneyContextSnapshot.findMany({
        where: { range: '3M', OR: latestPairs },
        select: { instrumentId: true, status: true, smartMoneyScore: true, updatedAt: true },
        orderBy: [{ updatedAt: 'desc' }],
      });
      const map = new Map<string, { status: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL'; score: number }>();
      for (const row of rows) {
        if (map.has(row.instrumentId)) continue; // keep only latest
        const status = row.status as string;
        if (status === 'ACCUMULATION' || status === 'DISTRIBUTION' || status === 'NEUTRAL') {
          map.set(row.instrumentId, { status, score: Number(row.smartMoneyScore) });
        }
      }
      return map;
    } catch {
      return new Map();
    }
  }

  private async toRunDto(record: any, options: { enrich?: boolean } = {}): Promise<TodayReviewRunDto> {
    // Batch-load sectors, 52w ranges, F&O ban flags, and smart-money status for all candidates
    // — four queries total, no N+1. The 52-week range window query over price_ticks dominates
    // read latency, so callers that don't render these fields (enrich:false) skip all four and
    // get a fast read; toCandidateDto leaves the corresponding fields null/false when maps are absent.
    const candidateRecords: any[] = record.candidates || [];
    let catalogSectorMap: Map<string, string | null> | undefined;
    let range52wMap: Map<string, { high52w: number; low52w: number; currentClose: number; positionPct: number; previousClose: number | null; dayChangePercent: number | null; volumeRatio: number | null }> | undefined;
    let fnoBanSet: Set<string> | undefined;
    let smartMoneyMap: Map<string, { status: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL'; score: number }> | undefined;
    if (options.enrich !== false) {
      const instrumentIds = [...new Set(candidateRecords.map((c: any) => c.instrumentId as string))];
      const symbols = [...new Set(candidateRecords.map((c: any) => c.symbol as string))];
      [catalogSectorMap, range52wMap, fnoBanSet, smartMoneyMap] = await Promise.all([
        this.loadCatalogSectors(instrumentIds),
        this.load52wRanges(symbols),
        this.loadFnoBanSet(symbols),
        this.loadSmartMoneyStatuses(instrumentIds),
      ]);
    }

    const candidates = candidateRecords.map((candidate: any) => this.toCandidateDto(candidate, catalogSectorMap, range52wMap, fnoBanSet, smartMoneyMap));
    const sourceSnapshot = this.jsonObject(record.sourceSnapshot);
    const reviewUniverse = this.jsonObject(sourceSnapshot.reviewUniverse);
    const scanFunnel = this.nullableJson(sourceSnapshot.scanFunnel) as any;
    const warnings = this.jsonArray(record.warnings);
    if (!sourceSnapshot.explainability && !warnings.includes('LEGACY_MISSING_EXPLAINABILITY')) warnings.push('LEGACY_MISSING_EXPLAINABILITY');
    return {
      id: record.id,
      runDate: record.runDate.toISOString(),
      region: record.region,
      assetType: record.assetType,
      status: record.status,
      trustStatus: this.trustStatus(record.status, record.dataThroughDate),
      dataThroughDate: record.dataThroughDate ? record.dataThroughDate.toISOString() : null,
      startedAt: record.startedAt.toISOString(),
      finishedAt: record.finishedAt ? record.finishedAt.toISOString() : null,
      warnings,
      candidateCounts: this.jsonObject(record.candidateCounts),
      sourceSnapshot,
      reviewUniverseMode: reviewUniverse.mode,
      trustedUniverseCount: reviewUniverse.trustedCount,
      catalogCount: reviewUniverse.catalogCount,
      coverageWarnings: Array.isArray(reviewUniverse.warnings) ? reviewUniverse.warnings.map(String) : [],
      scanFunnel,
      explainability: this.runExplainability(record.id, record.region, record.assetType, sourceSnapshot, candidates, warnings),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      candidates,
    };
  }

  private toCandidateDto(
    record: any,
    catalogSectorMap?: Map<string, string | null>,
    range52wMap?: Map<string, { high52w: number; low52w: number; currentClose: number; positionPct: number; previousClose: number | null; dayChangePercent: number | null; volumeRatio: number | null }>,
    fnoBanSet?: Set<string>,
    smartMoneyMap?: Map<string, { status: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL'; score: number }>,
  ): TodayReviewCandidateDto {
    const sourceSignalSnapshot = this.nullableJson(record.sourceSignalSnapshot);
    const boardMetadata = this.boardMetadataFromSnapshot(sourceSignalSnapshot);
    const earningsProximity = this.earningsProximityFromSnapshot(sourceSignalSnapshot);
    // Sector joined at READ time from instrument catalog (Stock.sector).
    // This ensures every candidate — including those from legacy runs whose snapshot
    // did not capture sector — always shows the correct static catalog sector.
    const catalogSector = catalogSectorMap ? (catalogSectorMap.get(record.instrumentId) ?? null) : null;
    // 52w range joined at READ time from price_ticks (batch-loaded, no N+1).
    const range52w = range52wMap ? (range52wMap.get(record.symbol) ?? null) : null;
    // NR-100: F&O ban flag joined at READ time from fno_ban_list (batch-loaded, no N+1).
    const inFnoBan = fnoBanSet ? fnoBanSet.has(record.symbol.toUpperCase()) : false;
    // NR-101: Smart-money status + score joined at READ time from smart_money_context_snapshots.
    const smEntry = smartMoneyMap ? (smartMoneyMap.get(record.instrumentId) ?? null) : null;
    const dto: TodayReviewCandidateDto = {
      id: record.id,
      runId: record.runId,
      instrumentId: record.instrumentId,
      symbol: record.symbol,
      companyName: record.companyName,
      direction: record.direction,
      state: record.state,
      setupType: record.setupType,
      strategyCode: record.strategyCode,
      strategyVersion: record.strategyVersion,
      rank: record.rank,
      grade: record.grade,
      confidenceScore: record.confidenceScore,
      reasonSummary: record.reasonSummary,
      blockers: this.jsonArray(record.blockers),
      watchReasons: this.jsonArray(record.watchReasons),
      dataQualitySnapshot: this.nullableJson(record.dataQualitySnapshot),
      marketContextSnapshot: this.nullableJson(record.marketContextSnapshot),
      strategyProofSnapshot: this.nullableJson(record.strategyProofSnapshot),
      tradePlanSnapshot: this.nullableJson(record.tradePlanSnapshot),
      sourceSignalSnapshot,
      boardSection: boardMetadata?.section || null,
      boardSourceType: boardMetadata?.sourceType || null,
      boardReason: boardMetadata?.reason || null,
      boardContractVersion: boardMetadata?.contractVersion || null,
      earningsProximity,
      catalogSector,
      range52wPositionPct: range52w ? range52w.positionPct : null,
      range52wHigh: range52w ? range52w.high52w : null,
      range52wLow: range52w ? range52w.low52w : null,
      range52wCurrentClose: range52w ? range52w.currentClose : null,
      previousClose: range52w ? range52w.previousClose : null,
      dayChangePercent: range52w ? range52w.dayChangePercent : null,
      volumeRatio: range52w ? range52w.volumeRatio : null,
      inFnoBan,
      smartMoneyStatus: smEntry ? smEntry.status : null,
      smartMoneyScore: smEntry ? smEntry.score : null,
      createdAt: record.createdAt?.toISOString(),
      updatedAt: record.updatedAt?.toISOString(),
    };
    return { ...dto, explainability: this.candidateExplainability(dto) };
  }

  private earningsProximityFromSnapshot(sourceSignalSnapshot: Record<string, any> | null): import('./today-trade-review.types').TodayReviewEarningsProximity | null {
    if (!sourceSignalSnapshot) return null;
    const ep = sourceSignalSnapshot.earningsProximity;
    if (!ep || typeof ep !== 'object' || Array.isArray(ep)) return null;
    // Validate required shape before returning
    if (typeof ep.symbol !== 'string') return null;
    return {
      symbol: ep.symbol,
      daysToResult: typeof ep.daysToResult === 'number' ? ep.daysToResult : null,
      resultDateSource: typeof ep.resultDateSource === 'string' ? ep.resultDateSource : '',
      resultDateLabel: typeof ep.resultDateLabel === 'string' ? ep.resultDateLabel : null,
      resultDate: typeof ep.resultDate === 'string' ? ep.resultDate : null,
    };
  }

  private boardMetadataFromSnapshot(sourceSignalSnapshot: Record<string, any> | null) {
    const board = this.jsonObject(sourceSignalSnapshot?.todayReviewBoard);
    if (!board.section && !board.sourceType && !board.reason && !board.contractVersion) return null;
    return {
      section: typeof board.section === 'string' ? board.section as any : null,
      sourceType: typeof board.sourceType === 'string' ? board.sourceType as any : null,
      reason: typeof board.reason === 'string' ? board.reason : null,
      contractVersion: typeof board.contractVersion === 'string' ? board.contractVersion : null,
    };
  }

  private runExplainability(
    runId: string,
    region: string,
    assetType: string,
    sourceSnapshot: Record<string, any>,
    candidates: TodayReviewCandidateDto[],
    warnings: unknown
  ): TodayReviewExplainability {
    const existing = this.nullableJson(sourceSnapshot.explainability) as TodayReviewExplainability | null;
    if (existing) {
      // NR-82: dedupe inspectableExcludedExamples by symbol+primaryReasonCode on read
      // (covers legacy runs that stored duplicate entries before the run-generation fix).
      const seen = new Set<string>();
      const dedupedExamples = (existing.inspectableExcludedExamples || []).filter((example: TodayReviewExcludedExample) => {
        const key = `${String(example.symbol).toUpperCase()}:${example.primaryReasonCode}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { ...existing, inspectableExcludedExamples: dedupedExamples };
    }
    const scanFunnel = this.nullableJson(sourceSnapshot.scanFunnel) as any;
    const reviewUniverse = this.jsonObject(sourceSnapshot.reviewUniverse);
    const legacyWarnings = this.jsonArray(warnings);
    if (!legacyWarnings.includes('LEGACY_MISSING_EXPLAINABILITY')) legacyWarnings.push('LEGACY_MISSING_EXPLAINABILITY');
    return {
      runId,
      scope: { region, assetType },
      reviewMode: reviewUniverse.mode || 'NO_REVIEW',
      trustedUniverseCount: Number(scanFunnel?.trustedUniverseCount || reviewUniverse.trustedCount || 0),
      scannedCount: Number(scanFunnel?.trustedInstrumentsScanned || 0),
      promotedCount: candidates.filter((candidate) => ['LONG_REVIEW', 'SHORT_REVIEW', 'EXIT_RISK_REVIEW'].includes(candidate.state)).length,
      watchCount: candidates.filter((candidate) => candidate.state === 'WATCH_ONLY').length,
      blockedCount: candidates.filter((candidate) => candidate.state === 'BLOCKED' || candidate.state === 'AVOID').length,
      unprovenCount: candidates.filter((candidate) => candidate.state === 'UNPROVEN').length,
      insufficientDataCount: candidates.filter((candidate) => candidate.state === 'INSUFFICIENT_DATA').length,
      excludedCount: Number(scanFunnel?.outsideTrustedUniverse || 0) + Number(scanFunnel?.noSetup || 0),
      exclusionSummaries: [],
      inspectableExcludedExamples: [],
    };
  }

  private candidateExplainability(candidate: TodayReviewCandidateDto) {
    const reasons = (items: string[], severity: 'WATCH' | 'BLOCKER'): TodayReviewCandidateReason[] => items.map((label) => ({
      category: label.toLowerCase().includes('data') || label.toLowerCase().includes('coverage') ? 'DATA_QUALITY' : label.toLowerCase().includes('trade') || label.toLowerCase().includes('reward') || label.toLowerCase().includes('stop') ? 'TRADE_PLAN_PROOF_CHAIN' : 'STRATEGY_PROOF',
      code: label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 64) || 'TODAY_REVIEW_REASON',
      label,
      severity,
      sourceModule: label.toLowerCase().includes('data') ? 'Market Data Foundation' : label.toLowerCase().includes('trade') ? 'Trade Plan Risk Engine' : 'Strategy Framework',
      evidenceDate: null,
    }));
    return {
      candidateId: candidate.id || `${candidate.runId || 'run'}:${candidate.instrumentId}`,
      state: candidate.state,
      rankingComponents: {
        strategyProof: candidate.strategyProofSnapshot ? 8 : 0,
        tradePlan: candidate.tradePlanSnapshot ? 8 : 0,
        marketRegime: candidate.marketContextSnapshot ? 5 : 0,
        sectorAlignment: (candidate.dataQualitySnapshot as any)?.sector || candidate.catalogSector ? 5 : 0,
        signalCalibration: (candidate.sourceSignalSnapshot as any)?.calibration ? 5 : 0,
        dataQuality: candidate.dataQualitySnapshot ? 8 : 0,
        smartMoney: (candidate.sourceSignalSnapshot as any)?.smartMoney ? 5 : 0,
        hardBlockerOverride: candidate.blockers.length > 0,
      },
      promotionReasons: ['LONG_REVIEW', 'SHORT_REVIEW', 'EXIT_RISK_REVIEW'].includes(candidate.state) ? [{
        category: 'READINESS' as const,
        code: 'TODAY_REVIEW_PROMOTED',
        label: candidate.reasonSummary,
        severity: 'INFO' as const,
        sourceModule: 'Today Review',
        evidenceDate: null,
      }] : [],
      watchReasons: reasons(candidate.watchReasons, 'WATCH'),
      blockers: reasons(candidate.blockers, 'BLOCKER'),
      upstreamEvidence: {
        readiness: candidate.dataQualitySnapshot,
        signalEvidence: (candidate.sourceSignalSnapshot as any)?.rawSignal || (candidate.sourceSignalSnapshot as any)?.setup || null,
        calibrationReadiness: (candidate.sourceSignalSnapshot as any)?.calibration || null,
        strategyProof: candidate.strategyProofSnapshot,
        tradePlanProofChain: candidate.tradePlanSnapshot,
      },
    };
  }

  private trustStatus(status: string, dataThroughDate?: Date | null) {
    if (status === 'FAILED') return 'FAILED';
    if (status === 'PARTIAL') return 'PARTIAL';
    if (!dataThroughDate) return 'PARTIAL';
    const ageMs = Date.now() - dataThroughDate.getTime();
    return ageMs > 4 * 86_400_000 ? 'STALE' : 'OK';
  }

  private jsonArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : [];
  }

  private jsonObject(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
  }

  private nullableJson(value: unknown): Record<string, any> | null {
    if (!value || value === Prisma.DbNull || value === Prisma.JsonNull) return null;
    return value as Record<string, any>;
  }

  private isTraderVisibleRun(record: any): boolean {
    return !this.containsFixtureSourceMarker(record.sourceSnapshot);
  }

  private containsFixtureSourceMarker(value: unknown): boolean {
    if (!value || value === Prisma.DbNull || value === Prisma.JsonNull) return false;
    if (typeof value === 'string') {
      const normalized = value.toUpperCase();
      return FIXTURE_SOURCE_MARKERS.some((marker) => normalized.includes(marker));
    }
    if (Array.isArray(value)) return value.some((item) => this.containsFixtureSourceMarker(item));
    if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some((item) => this.containsFixtureSourceMarker(item));
    return false;
  }
}
