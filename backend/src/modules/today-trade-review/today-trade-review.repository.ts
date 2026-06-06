import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type {
  TodayReviewCandidateDto,
  TodayReviewCandidateReason,
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

  async latest(region: string, assetType: string): Promise<TodayReviewRunDto | null> {
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
      if (record) return this.toRunDto(record);
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
    const catalogSectorMap = await this.loadCatalogSectors([record.instrumentId]);
    return this.toCandidateDto(record, catalogSectorMap);
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

  private async toRunDto(record: any): Promise<TodayReviewRunDto> {
    // Batch-load sectors for all candidates in one query (no N+1).
    const candidateRecords: any[] = record.candidates || [];
    const instrumentIds = [...new Set(candidateRecords.map((c: any) => c.instrumentId as string))];
    const catalogSectorMap = await this.loadCatalogSectors(instrumentIds);

    const candidates = candidateRecords.map((candidate: any) => this.toCandidateDto(candidate, catalogSectorMap));
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

  private toCandidateDto(record: any, catalogSectorMap?: Map<string, string | null>): TodayReviewCandidateDto {
    const sourceSignalSnapshot = this.nullableJson(record.sourceSignalSnapshot);
    const boardMetadata = this.boardMetadataFromSnapshot(sourceSignalSnapshot);
    const earningsProximity = this.earningsProximityFromSnapshot(sourceSignalSnapshot);
    // Sector joined at READ time from instrument catalog (Stock.sector).
    // This ensures every candidate — including those from legacy runs whose snapshot
    // did not capture sector — always shows the correct static catalog sector.
    const catalogSector = catalogSectorMap ? (catalogSectorMap.get(record.instrumentId) ?? null) : null;
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
    if (existing) return existing;
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
